## Diagnóstico inicial
- Dispatcher: `game/dispatcher.js:1` expõe `window.Dispatcher.apply(action)` chamando `Game.applyAction(action)` (o motor hoje usa funções diretas em vez de um apply unificado).
- Engine/UI principal: `mytragor_simulador.html` contém estado `STATE`, renderização e quase todas as ações do jogo:
  - Comprar/jogar carta: `playFromHand(side,index)` em `mytragor_simulador.html:3786`.
  - Fases/turno: `endTurn()` em `mytragor_simulador.html:3627`, `nextPhase()` em `mytragor_simulador.html:3605`, `beginTurn()` em `mytragor_simulador.html:3520`.
  - Ataque: seleção e resolução em `selectAttacker()` `mytragor_simulador.html:5620`, `selectLeaderAttacker()` `mytragor_simulador.html:5629`, destaque de alvos `highlightTargetsFor()` `mytragor_simulador.html:5643` e resolução `resolveAttackOn(target)` `mytragor_simulador.html:5814`.
  - RNG (d20, precisão) usado dentro de `resolveAttackOn()` `mytragor_simulador.html:5901`.
- IA: já há bloqueios em MP
  - Chamada de IA: `beginTurn()` só chama `aiMain` quando `!__IS_MP` em `mytragor_simulador.html:3603`.
  - Stub de IA e heurísticas: `mytragor_simulador.html:6170+`.
  - Controlador legado: `controllers/AIController.js` usa `AIBrain.next(...)` e `Dispatcher.apply(...)` — vamos cercar com flag MP.
  - Efeitos com decisões automáticas verificam `window.__IS_MP` em `assets/cards/effects.js` (várias linhas, ex.: `effects.js:141,207,247,...`).
- Cliente MP atual (autoritativo simples):
  - WebSocket client: `client/net/wsClient.js` implementa `connect()`, `join(matchId,playerId,sinceSeq)`, `sendAction(...)` e trata `snapshot`, `replay`, `actionAccepted`, `actionRejected`.
  - Gerência de otimista: `client/multiplayer/syncManager.js` já faz optimistic para `PLAY_CARD` e `END_TURN`, pendências e reconciliação.
  - Wrapper: `client/wrapDispatcherForMP.js` intercepta `playFromHand`/`endTurn` e envia `action` via `syncManager`.
  - Página real de jogo MP: `mp-game.html` + `mp-game.js` — inicializa `IS_MULTIPLAYER`, conecta, faz join, importa engine, e renderiza.
- Servidor (Node.js + ws):
  - `server/index.js` aceita `join`, `action`, `ping`, devolve `snapshot`, `replay`, `actionAccepted`/`Rejected`, e expõe `/debug/matches` e `/debug/match/:id`.
  - `server/matchManager.js` mantém `{ serverSeq, players, state, log }`, valida turno e índice para `END_TURN` e `PLAY_CARD`, incrementa `serverSeq` e loga.
- Lobby: `multiplayer.html` cria/entra em sala e redireciona para `mp-game.html?match=...&player=p1|p2`.

## ActionTypes mapeados e necessários
- Já existentes (cliente/servidor): `PLAY_CARD`, `END_TURN`.
- Necessários para paridade de jogo humano: `ATTACK` (com payload estruturado), opcionalmente `SET_LEADER` (escolha do líder), `SELECT_TARGET` (separado, se mantermos dois passos) e `DRAW` (se houver ações de compra fora de turnos). Focaremos em `ATTACK` para combate e manteremos `PLAY_CARD`/`END_TURN`.

## Onde ações são disparadas
- Jogar carta: cliques da mão chamam `playFromHand('you', i)` em `mytragor_simulador.html:2248`.
- Terminar turno: UI chama `endTurn()` `mytragor_simulador.html:3627`.
- Ataque: UI cria contexto via `selectAttacker`/`selectLeaderAttacker` e, ao clicar no alvo, chama `resolveAttackOn(target)` `mytragor_simulador.html:5814`.

## Assets/JSON carregados
- Cartas e efeitos: `assets/cards/cartas.js`, `assets/cards/effects.js`.
- Imagens/recursos usados nas cartas e UI estão sob `assets/`.

## Lacunas e riscos
- Combate usa RNG local (`Math.random()`), o que quebra determinismo em MP.
- `wsClient` não memoriza automaticamente `matchId/playerId` para rejoin com `sinceSeq` ao reconectar.
- `syncManager` não implementa rollback concreto; apenas descarta pendência.
- Wrapper MP cobre `playFromHand` e `endTurn`, mas não combate.

## Plano de implementação
### 1) Flag global MP e bloqueio de IA
- Consolidar `window.IS_MULTIPLAYER = (getQuery('mode')==='mp') || !!getQuery('match')`. Já há `IS_MP`/`__IS_MP` em `mytragor_simulador.html:1095–1101` e `mp-game.js:7–10`. Vamos padronizar e garantir que todos caminhos de IA chequem `window.IS_MULTIPLAYER || window.__IS_MP`.
- Cercar `controllers/AIController.js` com `if(window.IS_MULTIPLAYER) return;` dentro de `onEvent` e `_loop` para redundância.

### 2) Cliente — wsClient: reconexão e idempotência
- Memorizar `lastJoin = { matchId, playerId }` ao usar `join(...)` e, em `onopen`, reenviar `join` com `sinceSeq = lastServerSeq`.
- Manter `seenActionIds = Set` para ignorar duplicatas.
- Expor `getStatus()` com `lastServerSeq` e `connected` (já existe).

### 3) Cliente — syncManager: otimista + rollback
- Antes de `applyLocal`, capturar `before = Game.buildSnapshot()` e salvar em `pendingById[actionId].before`.
- Em `onActionRejected`, chamar `Game.applySnapshot(before)` para desfazer `PLAY_CARD`/`END_TURN` com segurança e notificar UI.
- `ATTACK`: não aplicar otimista; aguardar `actionAccepted` com payload resolvida do servidor, aplicando via caminho remoto.

### 4) Cliente — wrapDispatcherForMP: interceptar combate
- Interceptar `resolveAttackOn(target)` apenas quando `!window.__APPLY_REMOTE`:
  - Extrair contexto do atacante (`ATTACK_CTX`) e montar ação `ATTACK` canônica: `{ attacker: { leader?:true, index?:number }, fromSide: localSide, target: { type:'leader'|'ally', side:'foe', index?:number } }`.
  - Enfileirar via `syncManager.enqueueAndSend('ATTACK', payload)` e NÃO executar `resolveAttackOn` local; apenas feedback visual.
- Para ações remotas: adicionar uma função `applyResolvedAttack(resolved)` no engine para aplicar dano, tap, bloqueio, overkill, morte/equip cleanup e logs conforme payload concreto (sem RNG).

### 5) Servidor — validação e resolução determinística
- `matchManager.applyAction`:
  - `ATTACK`: validar é o turno do autor, índice do atacante, elegibilidade (tapped/summonedThisTurn), alvos conforme regras (provocar/bloquear). Gerar rolagem determinística no servidor (`d20`, `d20b se precisão`, `total`, `hit`, `damage`, `overkill`), além de flags de efeitos (ex.: `atropelar`).
  - Incluir em `applied.payload` o pacote resolvido: `{ attacker, target, rolled:{d20,d20b,total,ac}, hit, damage, overkill, kill:bool, leaderDamageAfter, allyHpAfter, tapAttacker:true, effectsApplied:[...] }`.
  - Persistir no `log` e incrementar `serverSeq`. Broadcast `actionAccepted` com esse payload.
- Manter `/debug/matches` e `/debug/match/:id` como estão; o snapshot do servidor pode continuar mínimo, mas considerar incluir contadores básicos (ex.: ativo `p1|p2`).

### 6) mp-game.html/js: UX e mapeamento de lados
- Continuar mapeando `localSide = playerId` e usar `you` como o lado local (já feito em `mp-game.js:9–10`). O wrapper usa `'you'` para aplicar local e `'ai'` para remoto (simétrico em cada cliente).
- Mostrar indicadores: pendências (`syncManager.getStatus().pending.length`) e `lastServerSeq` em um canto leve.

### 7) Testes automatizados
- Adicionar `server/test/test-multiplayer.js` com dois clientes headless:
  - Fluxo: `join` ambos, P1 `PLAY_CARD` válido → verificar 2x `actionAccepted` e seq++.
  - P1 `PLAY_CARD` inválido → `actionRejected`.
  - P1 `ATTACK` contra alvo válido → servidor envia `actionAccepted` com payload resolvida; P2 aplica em ordem.
  - Simular desconexão/reconexão com `sinceSeq` (replay).
- Scripts npm:
  - `start-server`: `node server/index.js` (já presente).
  - `test-multiplayer`: `node server/test/test-multiplayer.js`.

### 8) README e instruções
- Passos: instalar deps, iniciar servidor, abrir `multiplayer.html`, criar sala `TESTE123` como `p1` e outra aba `p2`, abrir `mp-game.html?match=TESTE123&player=p1|p2`, jogar cartas/turnos, realizar ataques, validar rejeições e reconexão com `sinceSeq`.
- Listar `actionTypes` suportados e o que tem rollback.

## Protocolos JSON (exatos)
- Cliente→Servidor `join`: `{ "type":"join","matchId":"TESTE123","playerId":"p1","sinceSeq":null }`.
- Cliente→Servidor `action`: `{ "type":"action","matchId":"TESTE123","playerId":"p1","actionId":"uuid","actionType":"PLAY_CARD","payload":{...} }`.
- Servidor→Clientes `actionAccepted`: `{ "type":"actionAccepted","matchId":"TESTE123","serverSeq":101,"actionId":"uuid","actionType":"PLAY_CARD","payload":{...},"by":"p1" }`.
- Servidor→Autor `actionRejected`: `{ "type":"actionRejected","matchId":"TESTE123","actionId":"uuid","reason":"invalid-cost" }`.
- Snapshot/replay conforme reconexão.

## Compatibilidade com Singleplayer
- Toda interceptação roda apenas quando `IS_MULTIPLAYER===true`/`__IS_MP`. Singleplayer segue usando `playFromHand`/`endTurn`/`resolveAttackOn` locais (incluindo RNG) sem alterações.

## Entregáveis
- Patches nos arquivos:
  - `client/net/wsClient.js`: memorizar join e rejoin com `sinceSeq`, `seenActionIds`.
  - `client/multiplayer/syncManager.js`: capturar snapshots para rollback e suportar `ATTACK` remoto.
  - `client/wrapDispatcherForMP.js`: interceptar `resolveAttackOn` → enviar `ATTACK`; aplicar remoto via nova função.
  - `mytragor_simulador.html`: expor `Game.applyResolvedAttack(payload)` sem afetar SP; reforço de flags MP para IA.
  - `server/matchManager.js`: validar/aplicar `ATTACK` com resolução determinística; logs.
  - `server/test/test-multiplayer.js`: harness de testes.
  - `README` com instruções e exemplos.

## Observabilidade e segurança
- Logs de cliente: `console.debug('sendAction', actionId, actionType)` e `console.debug('recv actionAccepted', serverSeq, actionId, by)`.
- Servidor: `console.info({matchId,serverSeq,actionId,playerId,actionType})` e endpoints debug.
- Checar que `playerId` pertence ao match; limitar taxa básica por socket (simples, por tick).