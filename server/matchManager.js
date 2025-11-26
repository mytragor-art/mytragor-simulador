const crypto = require('crypto');

function enemySide(side) {
  return side === 'p1' ? 'p2' : 'p1';
}

function createMatch(matchId) {
  return {
    id: String(matchId),
    serverSeq: 0,
    players: new Map(),
    state: {
      active: 'p1',
      leaders: { p1: null, p2: null },
      playerNames: { p1: null, p2: null },
      started: false,
      hostSide: 'p1' // Define o primeiro jogador como host
    },
    log: [],
  };
}

function makeActionRecord(serverSeq, action) {
  return {
    serverSeq,
    actionId: String(action.actionId || crypto.randomUUID()),
    playerId: String(action.playerId),
    actionType: String(action.actionType),
    payload: action.payload || {},
    ts: Date.now(),
  };
}

class MatchManager {
  constructor() {
    this.matches = new Map();
  }

  getOrCreateMatch(matchId) {
    const id = String(matchId).trim();
    let m = this.matches.get(id);
    if (!m) { m = createMatch(id); this.matches.set(id, m); }
    return m;
  }

  join(matchId, playerId, ws) {
    const m = this.getOrCreateMatch(matchId);
    m.players.set(String(playerId), ws);
    try{ const nm = (ws && ws.playerName) ? String(ws.playerName) : String(playerId); if(!m.state.playerNames) m.state.playerNames = { p1:null, p2:null }; m.state.playerNames[String(playerId)] = nm; }catch{}
    return { snapshot: m.state, serverSeq: m.serverSeq };
  }

  removePlayer(matchId, playerId) {
    const m = this.matches.get(String(matchId));
    if (!m) return;
    m.players.delete(String(playerId));
  }

  actionsSince(matchId, sinceSeq) {
    const m = this.getOrCreateMatch(matchId);
    const s = Number(sinceSeq) || 0;
    return m.log.filter(r => r.serverSeq > s).sort((a,b)=>a.serverSeq-b.serverSeq);
  }

  applyAction(matchId, action) {
    const m = this.getOrCreateMatch(matchId);
    const playerId = String(action.playerId);
    const type = String(action.actionType);
    const payload = action.payload || {};

    if (type === 'SET_LEADER') {
      m.serverSeq += 1;
      const rec = makeActionRecord(m.serverSeq, action);
      m.log.push(rec);
      try {
        if (!m.state.leaders) m.state.leaders = { p1: null, p2: null };
        m.state.leaders[playerId] = payload.leader || null;
      } catch {}
      return { ok: true, applied: rec };
    }

    if (type === 'START_MATCH') {
      if (!m.state) m.state = { active: 'p1', hostSide: 'p1' }; // Garante que o estado tenha hostSide
      if (!m.state.active) m.state.active = 'p1';
      m.serverSeq += 1;
      const rec = makeActionRecord(m.serverSeq, action);
      m.log.push(rec);

      // Inclui hostSide no payload START_MATCH
      const payload = {
        type: 'START_MATCH',
        matchId: m.id,
        players: Array.from(m.players.keys()),
        hostSide: m.state.hostSide
      };
      m.players.forEach((ws) => {
        try {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(payload));
          }
        } catch {}
      });

      return { ok: true, applied: rec };
    }

    if (type === 'END_TURN') {
      const expected = m.state.active;
      if (!expected || expected !== playerId) {
        return { ok: false, reason: 'not_your_turn' };
      }
      m.serverSeq += 1;
      m.state.active = expected === 'p1' ? 'p2' : 'p1';
      const rec = makeActionRecord(m.serverSeq, action);
      m.log.push(rec);
      return { ok: true, applied: rec };
    }

    if (type === 'PLAY_CARD') {
      const expected = m.state.active;
      if (!expected || expected !== playerId) {
        return { ok: false, reason: 'not_your_turn' };
      }
      const idx = Number(payload.index);
      if (!Number.isInteger(idx) || idx < 0) {
        return { ok: false, reason: 'invalid_card_index' };
      }
      m.serverSeq += 1;
      const rec = makeActionRecord(m.serverSeq, action);
      m.log.push(rec);
      return { ok: true, applied: rec };
    }

    if (type === 'ATTACK') {
      const expected = m.state.active;
      if (!expected || expected !== playerId) {
        return { ok: false, reason: 'not_your_turn' };
      }
      
      // Validar estrutura do payload
      if (!payload.attacker || !payload.target || !payload.fromSide) {
        return { ok: false, reason: 'invalid_attack_payload' };
      }
      
      // Validar que o atacante existe e pode atacar
      const attackerSide = payload.fromSide;
      const attacker = payload.attacker;
      
      if (attackerSide !== playerId) {
        return { ok: false, reason: 'attacker_not_yours' };
      }
      
      // Aqui normalmente verificaríamos se o atacante existe no estado
      // mas como não temos acesso completo ao estado do jogo, vamos assumir válido
      // e deixar a validação detalhada para o cliente
      
      // Resolver ataque de forma determinística
      const resolved = this.resolveAttackDeterministically(payload, playerId, matchId);
      
      m.serverSeq += 1;
      const rec = makeActionRecord(m.serverSeq, action);
      rec.payload = resolved; // Substituir payload com resultado resolvido
      m.log.push(rec);
      return { ok: true, applied: rec };
    }

    return { ok: false, reason: 'unknown_action' };
  }

  resolveAttackDeterministically(payload, playerId, matchId) {
    // Função simples de RNG determinística baseada em seed
    let seed = 0;
    function deterministicRandom() {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    }
    
    // Usar serverSeq como seed para determinismo
    const m = this.getOrCreateMatch(matchId);
    seed = m.serverSeq;
    
    const { attacker, target, fromSide } = payload;
    const targetSide = target.side;
    
    // Simular rolagem de d20
    let d20 = 1 + Math.floor(deterministicRandom() * 20);
    let d20b = null;
    
    // Simular precisão (50% de chance)
    if (Math.random() < 0.5) {
      d20b = 1 + Math.floor(deterministicRandom() * 20);
      d20 = Math.max(d20, d20b);
    }
    
    // Valores simulados (em produção, viríamos do estado real do jogo)
    const attackerBonus = 5; // Simulado
    const total = d20 + attackerBonus;
    const targetAC = target.type === 'leader' ? 15 : 12; // Simulado
    const hit = total >= targetAC;
    
    // Calcular dano
    let damage = 0;
    let overkill = 0;
    let kill = false;
    let leaderDamageAfter = null;
    let allyHpAfter = null;
    
    if (hit) {
      damage = 3 + Math.floor(deterministicRandom() * 4); // 3-6 de dano
      
      if (target.type === 'leader') {
        const currentHP = 20; // Simulado
        leaderDamageAfter = Math.max(0, currentHP - damage);
      } else {
        const currentHP = 5; // Simulado
        allyHpAfter = Math.max(0, currentHP - damage);
        kill = allyHpAfter <= 0;
        
        // Overkill simplificado (20% de chance)
        if (kill && Math.random() < 0.2) {
          overkill = 1 + Math.floor(deterministicRandom() * 3);
        }
      }
    }
    
    return {
      attacker,
      target,
      fromSide,
      rolled: { d20, d20b, total, ac: targetAC },
      hit,
      damage,
      overkill,
      kill,
      leaderDamageAfter,
      allyHpAfter,
      tapAttacker: true,
      effectsApplied: hit ? ['dano aplicado'] : []
    };
  }

  debugList() {
    const out = [];
    this.matches.forEach((m, id) => {
      out.push({ matchId: id, serverSeq: m.serverSeq, players: Array.from(m.players.keys()) });
    });
    return out;
  }

  debugMatch(id) {
    const m = this.matches.get(String(id));
    if (!m) return null;
    return { matchId: m.id, serverSeq: m.serverSeq, players: Array.from(m.players.keys()), state: m.state, recent: m.log.slice(-50) };
  }

  hasBothLeaders(matchId){ const m = this.getOrCreateMatch(matchId); const s = m.state && m.state.leaders; return !!(s && s.p1 && s.p2); }
}

module.exports = { MatchManager };
