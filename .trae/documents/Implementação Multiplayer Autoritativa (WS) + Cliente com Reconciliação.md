## Visão Geral
- Adicionar um servidor WebSocket autoritativo (Node.js + ws) que mantém `matches` com `serverSeq`, jogadores conectados, snapshot de estado e log de ações.
- No cliente, criar `wsClient`, `syncManager` e um wrapper do `Dispatcher` para envio de ações com `actionId` e UI otimista, reconciliando com `actionAccepted/actionRejected`.
- Focar primeiro em ordenação, idempotência e reconexão por `sinceSeq`.

## Contexto Atual (onde integrar)
- `game/dispatcher.js:1` expõe `window.Dispatcher.apply(action)` → atualmente chama `Game.applyAction(action)` (não existe implementação de `Game.applyAction`).
- HTML já faz um wrap inline do Dispatcher para MP e usa o cliente legado: `mytragor_simulador.html:6139–6163` envia via `Net.sendAction`.
- Motor de jogo aplica ações diretamente por funções:
  - `mytragor_simulador.html:3782` `function playFromHand(side, index)`
  - `mytragor_simulador.html:3623` `function endTurn()`
  - `mytragor_simulador.html:2506` `function render()`
- Cliente legado de rede: `net/net.js` (mensagens `action`, `state-sync`, seq simples). Vamos mantê-lo isolado e migrar front para `client/net/wsClient.js`.

## Servidor
### server/index.js
- Inicia WebSocket na porta `8081` e um HTTP mínimo para debug.
- Tipos de mensagens aceitas:
  - `join` `{matchId, playerId, sinceSeq?}` → adiciona jogador ao match, responde com `{type:'snapshot', matchId, serverSeq, snapshot}` e, se `sinceSeq` válido, `{type:'replay', actions:[...]}.
  - `action` `{matchId, playerId, actionId, actionType, payload}` → valida, incrementa `serverSeq`, emite `actionAccepted` para todos do match com `{serverSeq, actionId, actionType, payload, by:playerId}`; caso inválido, envia ao autor `actionRejected {actionId, reason}`.
  - `ping` → `pong`.
- Endpoints debug (HTTP):
  - `GET /debug/matches` → lista `matchId`, `serverSeq`, jogadores conectados.
  - `GET /debug/match/:id` → snapshot atual e últimas ações.

### server/matchManager.js
- Estruturas:
  - `matches: Map<matchId,{serverSeq:number, players:Map<playerId,ws>, state:Snapshot, log:ActionRecord[]}>`.
- API:
  - `getOrCreateMatch(matchId)`
  - `join(matchId, playerId, ws)` → retorna `{snapshot, serverSeq}`;
  - `applyAction(matchId, action)` → validação mínima: é turno do jogador, carta existe na mão, custo possível, alvo válido; retorna `{ok, reason?, applied:{serverSeq, action}}`.
  - `actionsSince(matchId, sinceSeq)` → array para replay.
- Observação: o servidor é autoritativo em ordem e validação; a aplicação visual ocorre nos clientes determinísticamente usando o motor existente.

## Cliente
### client/net/wsClient.js
- Conecta a `ws://<host>:8081` (configurável por query/localStorage).
- `join(matchId, playerId, sinceSeq?)` ao abrir; mantém `lastServerSeq` e `seenActionIds`.
- `sendAction(msg)` com `{type:'action', matchId, playerId, actionId, actionType, payload}`.
- Eventos:
  - `snapshot` → passa ao `syncManager` para carregar estado.
  - `replay` → aplica ações confirmadas em ordem.
  - `actionAccepted` → encaminha ao `syncManager`.
  - `actionRejected` → idem.
  - `pong` e auto-reconexão com `sinceSeq=lastServerSeq`.

### client/multiplayer/syncManager.js
- Mantém `pendingById: Map<actionId, {actionType, payload}>` e `lastServerSeq`.
- UI otimista: intercepta a ação local, aplica via `Dispatcher.apply(action, {remote:false})` e registra `pending`.
- Ao receber `actionAccepted`:
  - Se `actionId` é pendente local, marca como confirmada (sem reaplicar).
  - Se é de outro jogador, aplica via `Dispatcher.apply(..., {remote:true})`.
  - Atualiza `lastServerSeq` e ignora se `serverSeq` ≤ atual (idempotência).
- Ao receber `actionRejected`:
  - Se pendente local, reverte usando `rollbackFor(actionType,payload)` (definimos reversores simples: ex.: devolver carta à mão, restaurar custo) e notifica UI.
- Reconexão: ao `snapshot` e `replay`, zera pendências e reaplica em ordem.

### client/wrapDispatcherForMP.js
- Substitui o wrap inline atual por um módulo dedicado.
- Intercepta `Dispatcher.apply(action)` de origem local, cria envelope `{actionId:UUID, actionType, payload}`, chama `syncManager.enqueueAndSend(...)`.
- Define mapeamentos canônicos de `actionType` → motor:
  - `PLAY_CARD` → `playFromHand(side,index)` com `payload={side,index}`.
  - `END_TURN` → `endTurn()`.
  - `ATTACK`/`SELECT_TARGET` conforme fluxos de ataque existentes (aplicar onde for sincrônico).
- Quando `opts.remote` está presente, apenas aplica, sem enviar.

### mytragor_simulador.html
- Incluir scripts: `client/net/wsClient.js`, `client/multiplayer/syncManager.js`, `client/wrapDispatcherForMP.js`.
- Inicialização:
  - Ler `matchId`/`playerId` de query (`?match=TESTE123&player=p1`).
  - `wsClient.connect()`, `wsClient.join(matchId,playerId)`.
  - Ativar MP (`IS_MP=true`) para reutilizar componentes existentes.

## Protocolo de Mensagens
- `action` (cliente→servidor): `{type:'action', matchId, playerId, actionId, actionType, payload}`.
- `actionAccepted` (servidor→clientes): `{type:'actionAccepted', matchId, serverSeq, actionId, actionType, payload, by}`.
- `actionRejected` (servidor→autor): `{type:'actionRejected', matchId, actionId, reason}`.
- `join` (cliente→servidor): `{type:'join', matchId, playerId, sinceSeq?}`.
- `snapshot` (servidor→cliente): `{type:'snapshot', matchId, serverSeq, snapshot}`.
- `replay` (servidor→cliente): `{type:'replay', matchId, fromSeq, toSeq, actions:[...]}`.
- `ping/pong` para keep-alive.

## Validação de Ação (servidor)
- Turno: `playerId` deve estar ativo.
- Existência: `PLAY_CARD` exige carta na mão em `payload.index` do jogador.
- Custo: verificar `fragments`, `costHp`, agiota quando aplicável (com base no snapshot). Se insuficiente → rejeitar.
- Alvos: para `equip`/spells com alvo, conferir presença de alvo válido conforme snapshot.
- Regras são mínimas, suficientes para evitar jogadas flagrantemente inválidas; ordenação e idempotência são garantidas pelo `serverSeq`.

## Debug/Observabilidade
- Logs com `serverSeq`, `actionId`, `playerId`, `matchId` no servidor e cliente.
- Endpoints HTTP de diagnóstico.

## Testes e Scripts
- `npm run start-server`: inicia `node server/index.js`.
- `npm run test-multiplayer`: script Node com dois clientes headless que:
  - Conectam ao mesmo `matchId`, verificam `snapshot` igual.
  - P1 envia `PLAY_CARD`; P1 aplica otimista; recebe `actionAccepted`; P2 recebe e aplica em ordem.
  - Envia ação inválida (carta inexistente) e espera `actionRejected` com rollback.
  - Simula desconexão/reconexão de P2 com `sinceSeq`, verifica replay e estado consistente.
  - Injeta `setTimeout` para simular latência 200–300ms, verifica ausência de divergência.

## Entregáveis
- Novos arquivos: `server/index.js`, `server/matchManager.js`, `client/net/wsClient.js`, `client/multiplayer/syncManager.js`, `client/wrapDispatcherForMP.js`.
- Patch no `mytragor_simulador.html` para incluir e inicializar.
- README curto com: como rodar, protocolo, endpoints, checklist de testes, outputs esperados.

## Decisões de Design
- `serverSeq` centraliza ordenação e idempotência entre clientes.
- UI otimista melhora responsividade; reconciliação garante consistência ao confirmar/rejeitar.
- Reconexão por `sinceSeq` mantém estado convergente sem recomeçar partida.

Confirma para eu aplicar os patches e configurar os scripts.