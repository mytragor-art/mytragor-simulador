## Objetivo
- Adicionar `mp-game.html` e `mp-game.js` para a partida multiplayer real, reutilizando o motor do simulador singleplayer, sem IA, com comunicação via WebSocket usando módulos existentes.

## Arquitetura
- Reutilizar o motor de `mytragor_simulador.html` (estado, ações, turnos, efeitos, renderização, decks, mesa, cartas).
- Manter o mesmo layout/mesa/UI, sem o lobby e sem módulos de IA.
- Ativar modo multiplayer com flags globais: `window.IS_MULTIPLAYER = true` e `window.__IS_MP = true`.
- Lados globais: `window.localSide` e `window.remoteSide` derivados de `playerId`.
- Comunicação: `wsClient.js` + `syncManager.js` + `wrapDispatcherForMP.js` para envio, confirmação e aplicação otimista/confirmada.

## Fluxo das Páginas
- Atualizar `multiplayer.html` para redirecionar ao iniciar:
  - `mp-game.html?match=ROOM&player=p1` quando host cria sala.
  - `mp-game.html?match=ROOM&player=p2` quando convidado entra.

## mp-game.html
- Conteúdo: copiar a estrutura da mesa/UI de `mytragor_simulador.html` (IDs: `#youHand`, `#aiHand`, `#you-allies`, `#ai-allies`, `#you-deck`, `#ai-deck`, HUDs, botões de fase e turno, etc.) para manter renderização idêntica.
- Imports (na ordem):
  - `assets/cards/cartas.js`
  - `assets/cards/effects.js`
  - `game/dispatcher.js`
  - `controllers/HumanController.js`
  - `assets/mobile.js`
  - `client/net/wsClient.js`
  - `client/multiplayer/syncManager.js`
  - `client/wrapDispatcherForMP.js`
  - `mp-game.js`
- Não importar módulos de IA (`ai/brain.js`, `controllers/AIController.js`) nem `net/net.js`/`net/bootstrap.js` (o fluxo MP usará `wsClient`/`syncManager`).

## mp-game.js
- Responsabilidades:
  - Ler `matchId` e `playerId` da querystring (`match`, `player`).
  - Definir flags globais e lados:
    - `window.IS_MULTIPLAYER = true`
    - `window.__IS_MP = true`
    - `window.localSide = playerId`
    - `window.remoteSide = playerId === 'p1' ? 'p2' : 'p1'`
  - Inicializar rede e sincronização:
    - `wsClient.connect()`
    - `syncManager.setContext({ matchId, playerId })`
    - `wsClient.join(matchId, playerId, 0)`
  - Garantir instalação do wrapper após flags (ele intercepta `playFromHand` e `endTurn` para envio otimista via `syncManager`).
  - Aplicar render inicial quando snapshot ou ação confirmada chegar.
- Esqueleto proposto:
```
(function(){
  function getParam(k){
    const u=new URL(location.href);return u.searchParams.get(k)
  }
  const matchId=getParam('match')||getParam('room')||'TEST'
  const playerId=getParam('player')||getParam('side')||'p1'
  window.IS_MULTIPLAYER=true
  window.__IS_MP=true
  window.localSide=playerId
  window.remoteSide=playerId==='p1'?'p2':'p1'
  if(window.wsClient&&window.syncManager){
    window.syncManager.setContext({matchId,playerId})
    window.wsClient.connect()
    window.wsClient.join(matchId,playerId,0)
  }
  function onReady(){
    if(typeof render==='function') render()
  }
  document.addEventListener('DOMContentLoaded',onReady)
})()
```

## Regras Multiplayer
- Nunca executar IA:
  - As rotinas já possuem guarda de MP: em `beginTurn()` a chamada à IA ocorre apenas se `side==='ai' && !__IS_MP` em `mytragor_simulador.html`.
  - Definindo `__IS_MP=true` no `mp-game.js` bloqueia qualquer autoplay.
- Apenas jogador local executa diretamente:
  - Cliques em cartas/habilidades/ataque/“End Turn” disparam `syncManager.enqueueAndSend` via `wrapDispatcherForMP.js` em vez de aplicar local imediato.
  - Aplicação otimista no cliente local ocorre antes da confirmação.
- Jogadas do oponente via WS:
  - `wsClient` despacha `onActionAccepted` ao `syncManager`, que aplica com flag remota (`__APPLY_REMOTE`) e chama `render()`.

## Interface
- Botões e HUD iguais ao simulador:
  - `End Turn`, `Abilities`, `Sacar carta` (se existir), recursos/energia/fragmentos e HUD de líder/vida.
- Restrições por lado:
  - O wrapper e os binds de `renderSide('you')` já condicionam cliques ao lado local.
  - O lado remoto é visualização.

## Sincronização
- Servidor autoritativo:
  - Recebe ações, valida, atribui `serverSeq` e reenvia.
- Cliente:
  - `syncManager` mantém fila de pendentes e só considera `actionAccepted`.
  - Em rejeição, reverte otimista e re-renderiza.

## Patches (se necessário)
- `wrapDispatcherForMP.js`: manter uso das flags `IS_MULTIPLAYER`/`__IS_MP` para instalar interceptadores.
- `wsClient.js`: confirmar métodos `connect`, `join`, `sendAction` e callbacks `onActionAccepted`/`onActionRejected`/`onSnapshot`.
- `syncManager.js`: confirmar mapeamento `PLAY_CARD`/`END_TURN` e uso de `__APPLY_REMOTE`.
- Caso `Dispatcher.apply(action, {remote:true})` ainda seja chamado por alguma via, manter a compatibilidade via `__APPLY_REMOTE`.

## Testes Manuais
- Abrir duas abas:
  - Aba 1: `mp-game.html?match=AAAA&player=p1`
  - Aba 2: `mp-game.html?match=AAAA&player=p2`
- Verificar:
  - Ações de P1 aparecem em P2 e vice-versa.
  - Sem jogadas automáticas.
  - Turnos alternam corretamente ao usar `End Turn`.

## Entregáveis
- `mp-game.html` completo com layout da mesa e imports.
- `mp-game.js` com inicialização, flags, integração WS/Sync.
- Ajuste em `multiplayer.html` para redirecionar ao `mp-game.html`.
- Pequenos patches em módulos MP caso a API difira em algum ponto durante integração.
