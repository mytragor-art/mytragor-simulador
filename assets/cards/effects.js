// ============================================================
// MYTRAGOR - Sistema de Efeitos Centralizado
// ============================================================
// Este arquivo centraliza TODOS os handlers de efeitos de cartas,
// separados do código principal do simulador para melhor organização.
//
// Estrutura:
// - EFFECT_HANDLERS: handlers principais que executam ao jogar/entrar
// - ON_ENTER_HANDLERS: efeitos disparados quando aliado entra em campo
// - ON_DESTROY_HANDLERS: efeitos disparados quando carta é destruída
// - HELPER_FUNCTIONS: funções auxiliares reutilizáveis
//
// Como adicionar novo efeito:
// 1. Adicione o handler apropriado em EFFECT_HANDLERS ou ON_ENTER_HANDLERS
// 2. Use as funções helper para ações comuns (mostrar escolha, buscar, etc)
// 3. Teste no simulador
// ============================================================

const MYTRAGOR_EFFECTS = (function() {
  'use strict';

  // ============================================================
  // FUNÇÕES HELPER (compartilhadas)
  // ============================================================

  const helpers = {
    // Log centralizado
    log: (msg) => {
      if (typeof log === 'function') log(msg);
      else console.log(msg);
    },

    // Comprar carta
    draw: (side, count = 1) => {
      if (typeof draw === 'function') {
        for (let i = 0; i < count; i++) draw(side);
      }
    },

    // Renderizar
    render: () => {
      if (typeof render === 'function') render();
    },

    // Cleanup de equipamentos
    cleanupEquips: (side, card) => {
      if (typeof cleanupEquipsOf === 'function') cleanupEquipsOf(side, card);
    },

    // Mostrar modal de escolha
    showChoice: (options, callback, title) => {
      if (typeof showCardChoice === 'function') {
        showCardChoice(options, callback, title);
      }
    },

    // Buscar no deck
    searchDeck: (side, query, maxResults, title, callback) => {
      if (typeof performSearchDeck === 'function') {
        performSearchDeck(side, query, maxResults, title, callback);
      }
    },

    // Habilitar olhar topo
    enableLookTop: (count, side) => {
      if (typeof habilitarOlharTopo === 'function') {
        habilitarOlharTopo(count, side);
      }
    },

    // Enviar equipamento ao cemitério
    sendEquipToGrave: (side, equip) => {
      if (typeof sendEquipToGrave === 'function') {
        sendEquipToGrave(side, equip);
      }
    },

    // Leafae passive trigger
    checkLeafaeHealed: (side, target) => {
      if (typeof checkLeafaeOnAllyHealed === 'function') {
        checkLeafaeOnAllyHealed(side, target);
      }
    }
  };

  // ============================================================
  // EFEITOS DE ENTRADA (ON ENTER)
  // ============================================================

  const onEnterHandlers = {
    // Olhar topo do deck
    olhar_topo: (card, side, pos) => {
      setTimeout(() => helpers.enableLookTop(1, side), 10);
    },

    // Curar aliado Animal
    curar_animal: (card, side, pos) => {
      setTimeout(() => {
        const aliados = STATE[side].allies;
        const animais = aliados.filter((a, i) => 
          a && a.tipo === 'Animal' && a.hp < a.maxHp && i !== pos
        );
        
        if (animais.length) {
          const alvo = animais[0];
          const valor = card.effectValue || 1;
          const hpAntes = alvo.hp;
          alvo.hp = Math.min(alvo.maxHp, alvo.hp + valor);
          const hpCurado = alvo.hp - hpAntes;
          helpers.log(`${card.name} curou ${hpCurado} de vida de ${alvo.name}.`);
          helpers.checkLeafaeHealed(side, alvo);
          helpers.render();
        } else {
          helpers.log(`${card.name}: nenhum Animal para curar.`);
        }
      }, 10);
    },

    // Banir carta do campo
    ban_on_enter: (card, side, pos) => {
      setTimeout(() => {
        const candidates = [];
        ['you', 'ai'].forEach(s => {
          (STATE[s].spells || []).forEach((c, i) => {
            if (c) candidates.push({ side: s, pile: 'spells', idx: i, card: c });
          });
          (STATE[s].allies || []).forEach((c, i) => {
            if (c) candidates.push({ side: s, pile: 'allies', idx: i, card: c });
          });
          if (STATE[s].env) {
            candidates.push({ side: s, pile: 'env', idx: null, card: STATE[s].env });
          }
        });

        if (!candidates.length) {
          helpers.log(`${card.name}: nenhuma carta disponível para banir.`);
          return;
        }

        // IA: prefere banir carta do oponente
        if ((typeof window!=='undefined' && window.__IS_MP)? false : (side === 'ai')) {
          let choice = candidates.find(e => e.side !== side) || candidates[0];
          removeBannedCard(choice);
          STATE[choice.side].ban.push(choice.card);
          helpers.log(`IA: ${card.name} baniu ${choice.card.name}.`);
          helpers.render();
          return;
        }

        // Jogador: modal de escolha
        const opts = candidates.map(o => ({
          card: o.card,
          label: o.side === 'you' ? 'Seu' : 'Oponente'
        }));

        helpers.showChoice(opts, (chosen, idx) => {
          if (chosen == null) {
            helpers.log(`${card.name}: banimento cancelado.`);
            return;
          }
          const chosenItem = candidates[idx];
          if (!chosenItem) {
            alert('Carta não encontrada.');
            return;
          }
          removeBannedCard(chosenItem);
          STATE[chosenItem.side].ban.push(chosenItem.card);
          helpers.log(`Você baniu ${chosenItem.card.name} com ${card.name}.`);
          helpers.render();
        }, 'Escolha uma carta para banir');
      }, 10);

      // Helper para remover carta banida
      function removeBannedCard(choice) {
        if (choice.pile === 'spells') {
          if (typeof choice.idx === 'number') {
            STATE[choice.side].spells[choice.idx] = null;
          }
        } else if (choice.pile === 'allies') {
          if (typeof choice.idx === 'number') {
            STATE[choice.side].allies[choice.idx] = null;
          }
        } else if (choice.pile === 'env') {
          STATE[choice.side].env = null;
        }
      }
    },

    // Destruir equipamento
    destroy_equip_on_enter: (card, side, pos) => {
      setTimeout(() => {
        const equips = [];
        ['you', 'ai'].forEach(s => {
          (STATE[s].spells || []).forEach((c, i) => {
            if (c && c.kind === 'equip') {
              equips.push({ side: s, idx: i, card: c });
            }
          });
        });

        if (!equips.length) {
          helpers.log(`${card.name}: nenhum equipamento em campo para destruir.`);
          return;
        }

        // IA: prefere destruir equipamento do oponente
        if ((typeof window!=='undefined' && window.__IS_MP)? false : (side === 'ai')) {
          let choice = equips.find(e => e.side !== side) || equips[0];
          helpers.sendEquipToGrave(choice.side, choice.card);
          helpers.log(`IA: ${card.name} destruiu ${choice.card.name}.`);
          helpers.render();
          return;
        }

        // Jogador: modal de escolha
        helpers.showChoice(
          equips.map(e => ({
            card: e.card,
            label: e.side === 'you' ? 'Seu' : 'Oponente'
          })),
          (chosen, idx) => {
            if (chosen == null) {
              helpers.log(`${card.name}: cancelado.`);
              return;
            }
            const chosenEquip = equips[idx];
            if (!chosenEquip) {
              alert('Equipamento não encontrado.');
              return;
            }
            helpers.sendEquipToGrave(chosenEquip.side, chosenEquip.card);
            helpers.log(`Você destruiu ${chosenEquip.card.name} com ${card.name}.`);
            helpers.render();
          },
          'Escolha um equipamento para destruir'
        );
      }, 10);
    },

    // Buscar no deck
    search_deck: (card, side, pos) => {
      setTimeout(() => {
        const q = Object.assign({}, card.query || card.effectValue || {});
        // prevent the source card from being selected
        if (card && card.name) q.excludeName = card.name;

        if ((typeof window!=='undefined' && window.__IS_MP)? false : (side === 'ai')) {
          helpers.searchDeck(side, q, card.max || 10, card.title || 'Buscar no deck', () => {});
        } else {
          helpers.searchDeck(side, q, card.max || 10, card.title || 'Buscar no deck', (chosenCard) => {
            if (!chosenCard) {
              helpers.log(`${card.name}: busca cancelada ou sem resultados.`);
              return;
            }
            helpers.log(`${card.name}: você buscou ${chosenCard.name} e a colocou na mão.`);
            helpers.render();
          });
        }
      }, 10);
    },

    // Causar dano a outro aliado ao entrar
    damage_ally_on_enter: (card, side, pos) => {
      setTimeout(() => {
        const allies = STATE[side].allies || [];
        const candidates = allies
          .map((a, i) => (a && i !== pos && (a.hp || 0) > 0) ? { obj: a, slot: i } : null)
          .filter(x => x);

        if (!candidates.length) {
          helpers.log(`${card.name}: nenhum outro aliado disponível para causar dano.`);
          return;
        }

        const dmg = card.effectValue || 1;

        // IA: heurística - prefere não matar aliados
        if ((typeof window!=='undefined' && window.__IS_MP)? false : (side === 'ai')) {
          let choice = candidates.find(x => (x.obj.hp || 0) > dmg) || candidates[0];
          const target = choice.obj;
          const slot = choice.slot;
          const hpAntes = target.hp || 0;
          target.hp = Math.max(0, (target.hp || 0) - dmg);
          helpers.log(`IA: ${card.name} causou ${hpAntes - target.hp} de dano em ${target.name}.`);
          
          if (target.hp === 0) {
            helpers.log(`${target.name} morreu.`);
            helpers.cleanupEquips(side, target);
            STATE[side].grave.push(target);
            STATE[side].allies[slot] = null;
          }
          if (hpAntes - target.hp > 0) helpers.draw(side);
          helpers.render();
          return;
        }

        // Jogador: escolher aliado
        helpers.showChoice(
          candidates.map(p => ({ card: p.obj })),
          (chosen, idx) => {
            if (chosen == null) {
              helpers.log(`${card.name}: efeito cancelado.`);
              return;
            }
            const pick = candidates[idx];
            if (!pick) return;
            
            const target = pick.obj;
            const slot = pick.slot;
            const hpAntes = target.hp || 0;
            target.hp = Math.max(0, (target.hp || 0) - dmg);
            helpers.log(`Você causou ${hpAntes - target.hp} de dano a ${target.name} com ${card.name}.`);
            
            if (target.hp === 0) {
              helpers.log(`${target.name} morreu.`);
              helpers.cleanupEquips(side, target);
              STATE[side].grave.push(target);
              STATE[side].allies[slot] = null;
            }
            if (hpAntes - target.hp > 0) helpers.draw(side);
            helpers.render();
          },
          `Escolha outro aliado para receber ${dmg} de dano (ou cancele)`
        );
      }, 10);
    },

    // Olhar mão do oponente e forçar descarte (ex: Gamboa, Arqueira da Selva)
    discard_enemy_hand: (card, side, pos) => {
      setTimeout(() => {
        const foe = side === 'you' ? 'ai' : 'you';
        const hand = STATE[foe].hand || [];
        
        if (!hand.length) {
          helpers.log(`${card.name}: oponente não tem cartas na mão.`);
          return;
        }

        // IA: descarta aleatoriamente
        if ((typeof window!=='undefined' && window.__IS_MP)? false : (side === 'ai')) {
          const removed = discardRandomFromHand(foe, 1, {
            sourceSide: side,
            sourceCard: card,
            reason: 'discard_enemy_hand',
            actorName: 'IA'
          });
          helpers.log(`IA: ${card.name} forçou o oponente a descartar ${removed} carta(s).`);
          helpers.render();
          return;
        }

        // Jogador: mostrar modal com a mão do oponente
        const opts = hand.map((c, i) => ({ card: c, idx: i }));
        helpers.showChoice(opts, (chosen, idx) => {
          if (chosen == null) {
            helpers.log(`${card.name}: cancelado.`);
            return;
          }
          const picked = opts[idx];
          if (!picked) return;
          
          const ok = discardCardFromHand(foe, picked.idx, {
            sourceSide: side,
            sourceCard: card,
            reason: 'discard_enemy_hand',
            actorName: 'Você'
          });
          if (!ok) helpers.log(`${card.name}: falha ao descartar a carta selecionada.`);
          helpers.render();
        }, 'Escolha uma carta do oponente para descartar');
      }, 10);
    },

    // Aranhas Negras, Informante: dano ao seu próprio escolhido + descarte do oponente
    aranhas_informante: (card, side, pos) => {
      setTimeout(() => {
        const foe = side === 'you' ? 'ai' : 'you';
        const dmg = (card.effectValue && card.effectValue.damage) || 4;

        // Aplicar dano ao líder DO PRÓPRIO lado (side)
        if (STATE[side].leader) {
          const beforeHp = STATE[side].leader.hp || 0;
          STATE[side].leader.hp = Math.max(0, (STATE[side].leader.hp || 0) - dmg);
          const dealt = Math.max(0, beforeHp - STATE[side].leader.hp);
          helpers.log(`${card.name}: ao entrar causou ${dealt} de dano ao seu escolhido ${STATE[side].leader.name}.`);

          if (STATE[side].leader.hp === 0) {
            // aviso de derrota do lado que teve o escolhido zerado
            alert((side === 'you' ? 'Você' : 'IA') + ' teve seu escolhido derrotado!');
          }
        } else {
          helpers.log(`${card.name}: nenhum escolhido seu encontrado para causar dano.`);
        }

        // Forçar descarte aleatório do oponente
        const discardCount = (card.effectValue && card.effectValue.discard) || 1;
        const removed = discardRandomFromHand(foe, discardCount, {
          sourceSide: side,
          sourceCard: card,
          reason: 'aranhas_informante',
          actorName: side === 'you' ? 'Você' : 'IA'
        });
        if (removed > 0) {
          helpers.log(`${card.name}: forçou ${foe === 'ai' ? 'a IA' : 'o jogador'} a descartar ${removed} carta(s).`);
        }
        helpers.render();
      }, 10);
    },
    // Aranhas Negras, Mascote: ao entrar, crie tokens de Aranhas Negras em todos os slots vazios
    aranhas_mascote: (card, side, pos) => {
      setTimeout(() => {
        try {
          const allies = STATE[side].allies || [];
          // count free slots (after this card occupied its slot)
          const freeSlots = allies.reduce((acc, a, i) => acc + ((a == null) ? 1 : 0), 0);
          if (freeSlots <= 0) {
            helpers.log(`${card.name}: nenhum slot vazio para gerar Aranhas Negras.`);
            return;
          }
          const tokenTemplate = {
            name: 'Aranhas Negras', kind: 'ally', classe: 'Criatura', tipo: 'Animal', filiacao: 'Sombras',
            ac: 5, hp: 1, maxHp: 1, damage: 1, atkBonus: 1, img: 'assets/tokens/token_aranhas.png'
          };
          let created = 0;
          for (let i = 0; i < freeSlots; i++) {
            try {
              const t = MYTRAGOR_EFFECTS.createToken(tokenTemplate, side);
              if (t) created++;
            } catch (e) { console.warn('aranhas_mascote createToken error', e); }
          }
          helpers.log(`${card.name}: criou ${created} ficha(s) de Aranhas Negras.`);
          helpers.render();
        } catch (e) { console.error('aranhas_mascote onEnter error', e); }
      }, 10);
    }
  };

  // ============================================================
  // HANDLERS DE EFEITOS PRINCIPAIS
  // ============================================================

  const effectHandlers = {
    // Handler para reação: Aranhas Negras — Emboscada
    // args: (card, attackerSide, attackerCard, defenderSide)
    aranhas_emboscada_reaction: (card, attackerSide, attackerCard, defenderSide) => {
      try {
        // Decide uso automático para IA
        const isAI = defenderSide === 'ai';
        const cost = card.cost || 0;

        // Heurística simples para IA: use se atacante for perigoso (alto dano ou bônus) ou por probabilidade
        const shouldUseForAI = () => {
          if (!attackerCard) return false;
          if ((attackerCard.damage || 0) >= 3) return true;
          if ((attackerCard.atkBonus || 0) >= 2) return true;
          if ((attackerCard.atkBonusTemp || 0) > 0) return true;
          // fallback probabilístico
          return Math.random() < 0.45;
        };

        if (isAI) {
          if ((STATE.pool[defenderSide] || 0) < cost) return { used: false };
          if (!shouldUseForAI()) return { used: false };
        }

        // Find the card index in defender hand; if not present, abort
        const idx = (STATE[defenderSide].hand || []).findIndex(c => c === card);
        if (idx === -1) {
          // Could be a card tracked by identity; try by name as fallback (best-effort)
          const idxByName = (STATE[defenderSide].hand || []).findIndex(c => c && c.name === card.name);
          if (idxByName === -1) return { used: false };
          // reuse idx
          // prefer exact object equality but accept name match
          STATE[defenderSide].grave.push(STATE[defenderSide].hand[idxByName]);
          STATE[defenderSide].hand.splice(idxByName, 1);
        } else {
          // move to grave
          STATE[defenderSide].grave.push(card);
          STATE[defenderSide].hand.splice(idx, 1);
        }

        // pay cost
        if ((STATE.pool[defenderSide] || 0) >= cost) STATE.pool[defenderSide] -= cost;

        // apply debuff to attacker: -3 to atkBonusTemp (temporary)
        try {
          attackerCard.atkBonusTemp = (attackerCard.atkBonusTemp || 0) - 3;
        } catch (e) { console.warn('aranhas_emboscada apply error', e); }

        helpers.log(`${card.name}: aplicou −3 de bônus de ataque ao atacante ${attackerCard?.name || 'inimigo'}.`);

        // If defender controls an ally with 'Aranhas Negras' in the name, draw 1
        const hasAra = (STATE[defenderSide].allies || []).some(a => a && a.name && a.name.includes('Aranhas Negras'));
        if (hasAra) {
          helpers.draw(defenderSide, 1);
          helpers.log(`${card.name}: ${defenderSide === 'you' ? 'Você' : 'IA'} comprou 1 carta por controlar Aranhas Negras.`);
        }

        helpers.render();
        return { used: true, cancelAttack: false };
      } catch (e) {
        console.error('Erro em aranhas_emboscada_reaction:', e);
        return { used: false };
      }
    },
    // Handler: Bem Treinado — chama um aliado Marcial do cemitério quando ativado
    // args: (card, side, deadCard)
    bem_treinado_reaction: (card, side, deadCard) => {
      try {
        if (!card || !side) return { used: false };
        const cost = card.cost || 0;
        // find card index in hand
        const idx = (STATE[side].hand || []).findIndex(c => c === card);
        let removedCard = null;
        if (idx !== -1) {
          removedCard = STATE[side].hand[idx];
          STATE[side].grave.push(removedCard);
          STATE[side].hand.splice(idx, 1);
        } else {
          // fallback: find by name
          const idxByName = (STATE[side].hand || []).findIndex(c => c && c.name === card.name);
          if (idxByName !== -1) {
            removedCard = STATE[side].hand[idxByName];
            STATE[side].grave.push(removedCard);
            STATE[side].hand.splice(idxByName, 1);
          } else {
            return { used: false };
          }
        }

        // pay cost if possible
        if ((STATE.pool[side] || 0) >= cost) STATE.pool[side] -= cost;

        // Now allow the player/AI to choose a Martial ally from grave to special summon
        const q = { filiacao: 'Marcial', kind: 'ally' };
        // If AI: use first available
        if ((typeof window!=='undefined' && window.__IS_MP)? false : (side === 'ai')) {
          setTimeout(() => { specialSummonByConfig(side, { origem: ['grave'], filiacao: 'Marcial', kind: 'ally' }, 'Bem Treinado'); }, 10);
          helpers.log(`${card.name}: IA ativou e procura aliado Marcial no cemitério.`);
          helpers.render();
          return { used: true };
        }

        // Player: open chooser via existing specialSummonByConfig
        setTimeout(() => { specialSummonByConfig(side, { origem: ['grave'], filiacao: 'Marcial', kind: 'ally' }, 'Bem Treinado'); }, 10);
        helpers.log(`${card.name}: ativado. Escolha um aliado Marcial no seu cemitério.`);
        helpers.render();
        return { used: true };
      } catch (e) {
        console.error('bem_treinado_reaction error', e);
        return { used: false };
      }
    },
    // Ajuda do Povo — cria até 2 tokens "Cidadãos Unidos" no campo do side
    ajuda_do_povo: (card, side) => {
      try {
        const allies = STATE[side].allies || [];
        const freeSlots = allies.reduce((acc, a) => acc + (a ? 0 : 1), 0);
        const toCreate = Math.min(2, freeSlots);
        if (toCreate <= 0) {
          helpers.log(`${card.name}: sem espaço no campo para criar fichas.`);
          return { created: 0 };
        }

        const tokenTemplate = {
          name: 'Cidadãos Unidos', kind: 'ally', classe: 'Cidadão', tipo: 'Humano', filiacao: 'Arcana',
          ac: 5, hp: 2, maxHp: 2, damage: 2, atkBonus: 2, img: 'assets/tokens/token_povo.png'
        };

        let created = 0;
        for (let i = 0; i < toCreate; i++) {
          try {
            const t = (typeof window !== 'undefined' && window.MYTRAGOR_EFFECTS && window.MYTRAGOR_EFFECTS.createToken)
              ? window.MYTRAGOR_EFFECTS.createToken(tokenTemplate, side)
              : null;
            if (t) created++;
          } catch (e) { console.warn('ajuda_do_povo createToken error', e); }
        }
        helpers.log(`${card.name}: criou ${created} ficha(s) de Cidadãos Unidos.`);
        helpers.render();
        return { created };
      } catch (e) { console.error('ajuda_do_povo error', e); return { created: 0 }; }
    }
    ,
    // Raio de Gelo — deita um personagem inimigo (taps)
    // args: (card, side)
    raio_gelo: (card, side) => {
      try {
        const foe = side === 'you' ? 'ai' : 'you';
        const options = [];
        // leader
        if (STATE[foe].leader && STATE[foe].leader.hp > 0 && !STATE[foe].leader.tapped) options.push({ card: STATE[foe].leader, type: 'leader' });
        // allies
        (STATE[foe].allies || []).forEach((a, i) => { if (a && a.hp > 0 && !a.tapped) options.push({ card: a, type: 'ally', idx: i }); });

        if (!options.length) {
          helpers.log(`${card.name}: nenhum inimigo válido para deitar.`);
          return { tapped: 0 };
        }

        // AI: choose heuristic
        if ((typeof window!=='undefined' && window.__IS_MP)? false : (side === 'ai')) {
          // prefer highest damage ally, else leader
          let pick = options.find(o => o.type === 'ally');
          // choose by damage if multiple allies
          const allyOpts = options.filter(o => o.type === 'ally');
          if (allyOpts.length) {
            allyOpts.sort((x, y) => ((y.card.damage || 0) - (x.card.damage || 0)));
            pick = allyOpts[0];
          } else {
            pick = options[0];
          }
          // apply tap
          if (pick.type === 'leader') {
            STATE[foe].leader.tapped = true;
            helpers.log(`${card.name}: IA deitou o líder inimigo ${STATE[foe].leader.name}.`);
          } else if (pick.type === 'ally') {
            STATE[foe].allies[pick.idx].tapped = true;
            helpers.log(`${card.name}: IA deitou ${pick.card.name}.`);
          }
          helpers.render();
          return { tapped: 1 };
        }

        // Player: show modal to pick an enemy
        const opts = options.map(o => ({ card: o.card }));
        helpers.showChoice(opts, (chosen, idx) => {
          if (chosen == null) { helpers.log(`${card.name}: cancelado.`); return; }
          const picked = options[idx];
          if (!picked) { alert('Alvo inválido.'); return; }
          if (picked.type === 'leader') {
            STATE[foe].leader.tapped = true;
            helpers.log(`${card.name}: líder ${STATE[foe].leader.name} foi deitado.`);
          } else {
            const tgt = STATE[foe].allies[picked.idx];
            if (!tgt) { alert('Alvo indisponível.'); return; }
            tgt.tapped = true;
            helpers.log(`${card.name}: ${tgt.name} foi deitado.`);
          }
          helpers.render();
        }, 'Raio de Gelo — escolha um inimigo para deitar');

        return { pending: true };
      } catch (e) { console.error('raio_gelo error', e); return { tapped: 0 }; }
    }
    ,
    // Espionagem Sorrateira: olha a mão do oponente e descarta uma carta de filiação Religiosa/Marcial/Arcana
    espionagem_sorrateira: (card, side) => {
      try {
        const foe = side === 'you' ? 'ai' : 'you';
        const hand = STATE[foe].hand || [];
        const eligibleIdx = hand
          .map((c, i) => ({ c, i }))
          .filter(x => x.c && ['Religioso', 'Marcial', 'Arcana'].includes(x.c.filiacao));

        // If opponent has no cards and it's AI playing, nothing to do
        if (!hand.length && ((typeof window!=='undefined' && window.__IS_MP)? false : (side === 'ai'))) {
          helpers.log(`${card.name}: oponente não tem cartas na mão.`);
          return { discarded: 0 };
        }

        // For AI: choose among eligible cards only
        if ((typeof window!=='undefined' && window.__IS_MP)? false : (side === 'ai')) {
          if (!eligibleIdx.length) {
            helpers.log(`${card.name}: o oponente não possui cartas Religiosas, Marciais ou Arcana na mão (IA).`);
            return { discarded: 0 };
          }
          const pick = eligibleIdx[Math.floor(Math.random() * eligibleIdx.length)];
          const ok = discardCardFromHand(foe, pick.i, {
            sourceSide: side,
            sourceCard: card,
            reason: 'espionagem_sorrateira',
            actorName: 'IA'
          });
          if (ok) {
            helpers.log(`${card.name}: IA descartou ${pick.c.name} da mão do oponente.`);
            helpers.render();
            return { discarded: 1 };
          }
          helpers.log(`${card.name}: falha ao descartar carta elegível (IA).`);
          helpers.render();
          return { discarded: 0 };
        }

        // Player: always open the opponent hand modal (inspection is the primary benefit)
        // Show full hand but mark non-eligible cards as disabled so player can inspect and optionally choose an eligible one.
        const opts = hand.map((c, i) => ({ card: c, idx: i, disabled: !(['Religioso', 'Marcial', 'Arcana'].includes((c && c.filiacao) || '')) , disabledReason: (!(['Religioso', 'Marcial', 'Arcana'].includes((c && c.filiacao) || '')) ? 'Não elegível' : null) }));
        helpers.showChoice(opts, (chosen, idx) => {
          if (chosen == null) {
            helpers.log(`${card.name}: inspeção da mão cancelada.`);
            return { discarded: 0 };
          }
          const picked = opts[idx];
          if (!picked) { helpers.log(`${card.name}: escolha inválida.`); return { discarded: 0 }; }
          const chosenCard = picked.card;
          if (!chosenCard || picked.disabled) {
            // Not eligible — inform player and do not discard
            try { alert('Carta selecionada não é elegível para descarte por Espionagem Sorrateira.'); } catch(e) {}
            helpers.log(`${card.name}: carta selecionada não é elegível para descarte.`);
            helpers.render();
            return { discarded: 0 };
          }
          const ok = discardCardFromHand(foe, picked.idx, {
            sourceSide: side,
            sourceCard: card,
            reason: 'espionagem_sorrateira',
            actorName: 'Você'
          });
          if (!ok) helpers.log(`${card.name}: falha ao descartar a carta selecionada.`);
          helpers.render();
          return { discarded: ok ? 1 : 0 };
        }, 'Espionagem Sorrateira — mão do oponente (escolha carta elegível para descartar ou feche)');

        return { pending: true };
      } catch (e) {
        console.error('espionagem_sorrateira error', e);
        return { discarded: 0 };
      }
    }
    // ... outros handlers podem ser adicionados aqui
  };

  // ============================================================
  // INTERFACE PÚBLICA
  // ============================================================

  return {
    // Executar efeito de entrada
    triggerOnEnter: (card, side, pos) => {
      if (!card || !card.effect) return;
      
      const handler = onEnterHandlers[card.effect];
      if (handler) {
        try {
          handler(card, side, pos);
        } catch (e) {
          console.error(`Erro ao executar efeito de entrada ${card.effect}:`, e);
          helpers.log(`⚠️ Erro ao executar efeito de ${card.name}.`);
        }
      }
    },

    // Executar efeito genérico
    triggerEffect: (effectName, ...args) => {
      const handler = effectHandlers[effectName];
      if (handler) {
        try {
          return handler(...args);
        } catch (e) {
          console.error(`Erro ao executar efeito ${effectName}:`, e);
          return null;
        }
      }
    },

    // Expor helpers para uso externo se necessário
    helpers: helpers,

    // Criar um token (ficha) a partir de um template ou definição de carta.
    // - template: objeto de carta (ou nome da definição em CARD_DEFS)
    // - side: 'you' | 'ai'
    // - slot: posição desejada (opcional). Se omitido, preenche o primeiro slot livre.
    // - opts: atributos adicionais que sobrepõem o template (atk, hp, img, name, etc)
    createToken: (template, side, slot = null, opts = {}) => {
      try {
        let def = null;
        if (!template) return null;
        if (typeof template === 'string') {
          def = (typeof CARD_DEFS !== 'undefined') ? CARD_DEFS.find(c => (c.name||'').toLowerCase() === template.toLowerCase()) : null;
          if (!def) return null;
        } else if (typeof template === 'object') {
          def = template;
        }

        const token = JSON.parse(JSON.stringify(def || {}));
        // Apply overrides
        Object.assign(token, opts || {});

        // Mark as token and minimal normalization
        token.token = true;
        token.kind = token.kind || 'ally';
        token.ownerSide = side;
        token.tapped = false;
        token.faceDown = false;
        // Ensure HP present and valid
        token.maxHp = typeof token.maxHp === 'number' ? token.maxHp : (typeof token.hp === 'number' ? token.hp : (token.effectValue && token.effectValue.hp) || 1);
        token.hp = Math.max(1, (typeof token.hp === 'number' ? token.hp : token.maxHp));

        // Ensure image path available (caller will provide real paths if needed)
        if (!token.img && opts.img) token.img = opts.img;

        // Place on board in requested slot or first free
        const allies = STATE[side].allies;
        let placed = false;
        if (typeof slot === 'number' && slot >= 0 && slot < allies.length && !allies[slot]) {
          STATE[side].allies[slot] = token;
          placed = true;
        } else {
          for (let i = 0; i < allies.length; i++) {
            if (!allies[i]) { STATE[side].allies[i] = token; slot = i; placed = true; break; }
          }
        }

        if (!placed) {
          helpers.log(`createToken: sem espaço para colocar token ${token.name || opts.name || 'Token'}.`);
          return null;
        }

        // Register token in dedicated tokens pile for easier cleanup/counting
        try {
          if (!STATE[side].tokens) STATE[side].tokens = [];
          STATE[side].tokens.push(token);
        } catch (e) { /* ignore */ }

        // Mark as just created so render can animate the spawn
        token._justCreated = true;

        // Trigger on-enter handlers for the token if any (deferred to avoid reentrancy)
        setTimeout(() => {
          try { if (typeof verificarValbrakEngine === 'function') verificarValbrakEngine(side, token); } catch(e) {}
          try { if (typeof MYTRAGOR_EFFECTS !== 'undefined' && MYTRAGOR_EFFECTS.triggerOnEnter) MYTRAGOR_EFFECTS.triggerOnEnter(token, side, slot); } catch(e) {}
          helpers.render();
        }, 10);

        helpers.log(`${token.name || opts.name || 'Token'} foi criado no campo (${side})${typeof slot === 'number' ? ' na posição ' + slot : ''}.`);
        helpers.render();
        return token;
      } catch (e) { console.error('createToken error', e); return null; }
    },

    // Notificar que um aliado foi enviado ao cemitério (deve ser chamado pelo código que move cartas para o cemitério)
    notifyAllySentToGrave: (deadCard, side) => {
      try {
        if (!deadCard || !side) return;
        // Procura cartas 'Bem Treinado' na mão do mesmo side
        const hand = (STATE[side].hand || []);
        const candidates = hand.map((c, i) => ({ card: c, idx: i })).filter(x => x.card && x.card.effect === 'bem_treinado');
        if (!candidates.length) return;

        // IA: usa automaticamente se heurística simples aprovar
        if ((typeof window!=='undefined' && window.__IS_MP)? false : (side === 'ai')) {
          const pick = candidates[0];
          try {
            // delegate to reaction handler to remove card, pay cost and summon
            const res = MYTRAGOR_EFFECTS.triggerEffect('bem_treinado_reaction', pick.card, side, deadCard);
            return res;
          } catch (e) { console.warn('bem_treinado auto error', e); return null; }
        }

        // Jogador: perguntar via modal/confirm. Se houver múltiplos Bem Treinado, pedir qual usar.
        if (candidates.length === 1) {
          const c = candidates[0].card;
          const confirmUse = confirm(`${deadCard.name} foi enviado ao cemitério. Deseja ativar ${c.name} (custo ${c.cost || 0}) para chamar um aliado Marcial do seu cemitério?`);
          if (!confirmUse) return null;
          return MYTRAGOR_EFFECTS.triggerEffect('bem_treinado_reaction', c, side, deadCard);
        }

        // Se vários, mostrar escolha visual
        const opts = candidates.map(p => ({ card: p.card }));
        helpers.showChoice(opts, (chosen, idx) => {
          if (chosen == null) return;
          const picked = candidates[idx];
          if (!picked) return;
          MYTRAGOR_EFFECTS.triggerEffect('bem_treinado_reaction', picked.card, side, deadCard);
        }, 'Escolha qual Bem Treinado ativar');
      } catch (e) { console.error('notifyAllySentToGrave error', e); }
    }
  };
})();

// Compatibilidade global
if (typeof window !== 'undefined') {
  window.MYTRAGOR_EFFECTS = MYTRAGOR_EFFECTS;
}
