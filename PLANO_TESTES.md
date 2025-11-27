# PLANO DE TESTES - MULTIPLAYER MYTRAGOR

## 🧪 TESTES AUTOMATIZADOS

### Teste 1: Script de Fluxo Completo
```bash
cd /caminho/para/mytragor-simulador
node test-mp-flow.js
```

**Esperado**: 
- ✅ 8 steps completados
- ✅ Nenhum erro
- ✅ "TESTE PASSOU! ✓" no final

**Tempo**: 10 segundos

---

## 🎮 TESTES MANUAIS (Dois Navegadores)

### Setup Inicial
```bash
# Terminal 1: WebSocket Server
node server/index.js

# Terminal 2: HTTP Server
http-server -p 3000
```

**Verificar**:
- [ ] `[ws-server] listening 8081`
- [ ] `HTTP server running at http://localhost:3000`

---

### Teste 2: Conexão Inicial

**P1 (Host)**:
```
1. Abrir: localhost:3000/mp-game.html?match=TEST1&player=p1
2. Aguardar 3s
3. Console (F12) deve mostrar:
   - [wsClient] open
   - [wsClient] connected
   - [syncManager] setContext called
```

✅ **Esperado**: Sem erros, conectado

**P2 (Client)**:
```
1. Abrir: localhost:3000/mp-game.html?match=TEST1&player=p2
2. Aguardar 3s
3. Console deve mostrar mesmos logs
```

✅ **Esperado**: Ambas conectadas ao mesmo match

---

### Teste 3: Sincronização Inicial de Estado

**Em P1 Console**:
```javascript
mpMonitor.checkState()
```

✅ **Esperado**:
```
✓ STATE exists
✓ playerChosen: p1=✗ p2=✗
isHost: YES (HOST)
side: p1
```

**Em P2 Console**:
```javascript
mpMonitor.checkState()
```

✅ **Esperado**:
```
✓ STATE exists
✓ playerChosen: p1=✗ p2=✗
isHost: NO (CLIENT)
side: p2
```

---

### Teste 4: P1 Escolhe Deck

**Passo 1: UI**
```
1. P1 clica "Escolher Baralho"
2. Modal de seleção abre
3. P1 clica em um líder (ex: Katsu)
```

**Passo 2: Validar P1**
```javascript
// Console P1
window.STATE.you.leader.name  // "Katsu, o Vingador"
window.STATE.playerChosen.p1  // true
window.STATE.playerChosen.p2  // false
```

✅ **Esperado**: p1=true, p2=false

**Passo 3: Validar P2**
```javascript
// Console P2
window.STATE.playerChosen.p1  // true (recebeu)
window.STATE.playerChosen.p2  // false
window.STATE.ai.leader.name   // "Katsu, o Vingador"
```

✅ **Esperado**: P2 vê o líder de P1 em tempo real

**Passo 4: UI Check**
- [ ] P1 vê: "Oponente — P2" (muda de "—")
- [ ] P2 vê: "Você escolheu. Aguardando o oponente..."
- [ ] Ambos veem status: "Você escolheu..."

---

### Teste 5: P2 Escolhe Deck

**Passo 1: UI**
```
1. P2 clica "Escolher Baralho"
2. Seleciona OUTRO líder (ex: Valbrak)
```

**Passo 2: Validar Ambos**
```javascript
// Console P1 e P2
window.STATE.playerChosen   // {p1: true, p2: true}
window.STATE.you.leader     // Seu líder
window.STATE.ai.leader      // Líder do oponente
```

✅ **Esperado**: Ambos veem {p1: true, p2: true}

**Passo 3: UI Check**
- [ ] Botão "Iniciar" agora visível
- [ ] Status: "Ambos escolheram. Iniciando…"

---

### Teste 6: START_MATCH e Snapshot Inicial

**Passo 1: Iniciar Partida**
```
1. Qualquer um clica "Iniciar"
2. Ambos recebem START_MATCH
3. Partida inicia
```

**Passo 2: Validar Estado**
```javascript
// Console em ambos
window.STATE.active      // "p1" (sempre começa aqui)
window.STATE.phase       // "start"
window.STATE.you.leader  // Líder definido
window.STATE.ai.leader   // Líder definido
```

✅ **Esperado**: Ambos veem mesmo state

**Passo 3: UI Check**
- [ ] Dois líderes aparecem no field
- [ ] Botão muda para "Próxima Fase"
- [ ] Fragmentos mostram: "Frags: X/X"

---

### Teste 7: PLAY_CARD - Otimismo (P1)

**Passo 1: Clicar em Carta**
```
1. P1 clica em uma carta da mão
2. VERIFICAR TEMPO: Deve aparecer IMEDIATAMENTE
3. Console P1: [wrapDispatcherForMP] playFromHand called: you, 0
```

✅ **Esperado**: Carta aparece com 0ms de delay (não espera servidor)

**Passo 2: Aguardar Confirmação do Servidor**
```
1. Esperar 100-200ms
2. Console P1: [syncManager] PLAY_CARD aceito
3. Console P2: Recebeu PLAY_CARD de p1
```

✅ **Esperado**: P2 vê a carta em tempo real (~100ms)

**Passo 3: Validar Estados**
```javascript
// Console P1
window.STATE.you.hand.length     // diminuiu
window.STATE.you.allies[0]       // carta está lá

// Console P2
window.STATE.ai.hand.length      // diminuiu
window.STATE.ai.allies[0]        // MESMA carta
```

✅ **Esperado**: Ambos em perfeita sincronização

---

### Teste 8: PLAY_CARD - Otimismo (P2)

**Passo 1: P2 Clica em Carta**
```
1. P2 clica em uma carta
2. VERIFICAR: Aparece imediatamente em P2
3. Esperar 100-200ms
```

✅ **Esperado**: P1 vê a carta de P2

**Passo 2: Ambos Têm Cartas**
```javascript
// Em ambos
window.STATE.you.allies.length   // 1 (sua carta)
window.STATE.ai.allies.length    // 1 (carta do opponent)
```

✅ **Esperado**: Campo tem 2 cartas (uma de cada)

---

### Teste 9: END_TURN e Transição

**Passo 1: P1 Encerra Turno**
```
1. P1 clica "Encerrar Turno"
2. Console: [wrapDispatcherForMP] endTurn called
3. Aguardar 200ms
```

**Passo 2: Verificar Sincronização**
```javascript
// Console P1
window.STATE.active      // "p2" (mudou)

// Console P2
window.STATE.active      // "p2" (ainda é "you")
window.STATE.pool.p2     // reseta para maxPool
window.STATE.phase       // "start"
```

✅ **Esperado**: P2 agora é ativo, P1 não pode jogar

**Passo 3: UI Check**
- [ ] P1: "Ativo — Oponente" e não pode jogar
- [ ] P2: "Ativo — Você" e pode jogar
- [ ] Botão P1: desativado
- [ ] Botão P2: ativado

---

### Teste 10: P2 Joga e Encerra

**Passo 1: P2 Joga Carta**
```
1. P2 clica em carta
2. Aparece imediatamente em P2
3. P1 vê em ~100ms
```

**Passo 2: P2 Encerra Turno**
```
1. P2 clica "Encerrar Turno"
2. Active volta para "p1"
3. Próximo ciclo começa
```

✅ **Esperado**: Ciclo completo funcionando

---

## 🔄 TESTES DE ROBUSTEZ

### Teste 11: 10 Ciclos Completos

**Procedimento**:
```
1. Iniciar partida (Teste 6)
2. Repetir 10x:
   - P1 joga
   - P2 joga
   - END_TURN
3. Verificar final
```

**Esperado**:
- ✓ Sem erros no console
- ✓ Sem desincronização
- ✓ Estado consistente

**Tempo**: 2-3 minutos

---

### Teste 12: Lag Simulado

**Setup**:
```
1. DevTools → Network tab
2. Throttle: "Slow 4G" (100-500ms latência)
3. Repetir Teste 7-9
```

**Esperado**:
- ✓ Ainda funciona (mais lento)
- ✓ Eventos chegarão atrasados
- ✓ Sem erros de timeout

---

### Teste 13: Desconexão/Reconexão

**P1 Desconecta**:
```
1. P1: DevTools → Network → Offline
2. P1 tenta jogar
3. Ver erro em console
```

**P1 Reconecta**:
```
1. DevTools → Network → Online
2. Deve reconectar automaticamente (TBD)
3. Ou click "Reconectar"
```

**Esperado**:
- ✓ Ambos veem que P1 desconectou
- ✓ Opção de reconectar
- ✓ Sincronização restaurada

---

## 📊 MATRIZ DE TESTES

| Teste | Descrição | P1 | P2 | Esperado | Status |
|-------|-----------|----|----|----------|--------|
| 1 | Script flow | - | - | PASSOU | [ ] |
| 2 | Conexão inicial | ✓ | ✓ | Conectado | [ ] |
| 3 | Estado inicial | ✓ | ✓ | isHost correto | [ ] |
| 4 | P1 escolhe | ✓ | ✓ | playerChosen.p1=true | [ ] |
| 5 | P2 escolhe | ✓ | ✓ | playerChosen={true,true} | [ ] |
| 6 | START_MATCH | ✓ | ✓ | Líderes no field | [ ] |
| 7 | P1 PLAY_CARD | ✓ | ✓ | 0ms delay | [ ] |
| 8 | P2 PLAY_CARD | ✓ | ✓ | 100ms sync | [ ] |
| 9 | END_TURN | ✓ | ✓ | Active muda | [ ] |
| 10 | P2 joga+END | ✓ | ✓ | Ciclo ok | [ ] |
| 11 | 10 ciclos | ✓ | ✓ | Sem erros | [ ] |
| 12 | Lag 100ms | ✓ | ✓ | Funciona | [ ] |
| 13 | Desconect | ✓ | ✓ | Tratado | [ ] |

---

## 🎯 Critérios de Sucesso

✅ **Tudo passou**: 
```
node test-mp-flow.js ✓
Todos os 13 testes manuais ✓
Sem erros no console ✓
playerChosen sincronizado ✓
Leaders sincronizados ✓
Board state sincronizado ✓
Pronto para DEPLOY ✓
```

❌ **Falhou**:
```
Revisar GUIA_TESTE_MP.md → Troubleshooting
Coletar logs do console (F12)
Comparar com ANALISE_MP_COMPLETA.md
Abrir issue com stack trace
```

---

## 📝 Executar Testes

### Checklist Completo

```javascript
// Console - Teste cada um
✓ mpMonitor.checkState()
✓ window.STATE.playerChosen
✓ window.STATE.isHost
✓ window.syncManager.playerChosen
✓ window.STATE.active
✓ window.STATE.pool
✓ window.STATE.you.leader
✓ window.STATE.ai.leader
```

### Logs Esperados

```
[wsClient] open
[wsClient] connected
[syncManager] setContext called
[wsClient] actionAccepted: SET_LEADER
[wsClient] snapshot recebido
[wrapDispatcherForMP] playFromHand called
[syncManager] PLAY_CARD enqueued
[syncManager] Host published snapshot
```

---

## 🚦 Status Final

Após completar todos os testes:
- [ ] Marcar "PRONTO PARA PRODUÇÃO" se todos ✓
- [ ] Fazer commit das mudanças
- [ ] Deploy em staging
- [ ] Deploy em produção
- [ ] Monitorar primeiros usuários

