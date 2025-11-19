# MyTragor Simulador — Multiplayer Autoritativo

## Como rodar
- Instalar dependências: `npm install`
- Iniciar servidor WS: `npm run start-server` (porta `8081`)
- Servir o front (já há `npx serve -s . -p 3001` rodando): abra `http://localhost:3001/mytragor_simulador.html?mode=mp&match=TESTE123&side=p1` e em outra janela `...&side=p2`.

## Protocolo
- `join {matchId, playerId, sinceSeq?}` → servidor responde `snapshot {matchId, serverSeq, snapshot}` e, se aplicável, `replay {actions}`.
- `action {matchId, playerId, actionId, actionType, payload}` → servidor valida e emite `actionAccepted {serverSeq, actionId, actionType, payload, by}` ou `actionRejected {actionId, reason}`.
- `ping/pong` para keep-alive.

## Validação (servidor)
- Ordem: `serverSeq` monotônico por partida.
- `END_TURN`: apenas jogador ativo pode encerrar.
- `PLAY_CARD`: requer turno do jogador e `payload.index` válido.
- `ATTACK`: valida turno do jogador e estrutura do payload, resolve combate de forma determinística com RNG baseado em `serverSeq`.

## Ações Suportadas
- `PLAY_CARD`: Jogar carta da mão (otimista com rollback).
- `END_TURN`: Terminar turno (otimista com rollback).
- `ATTACK`: Declarar ataque (não otimista - aguarda confirmação do servidor com resultado determinístico).

## Sistema de Combate (ATTACK)
- O servidor resolve o combate de forma determinística usando `serverSeq` como seed.
- Resultado inclui: rolagens de d20, acerto/erro, dano, overkill, destruição de alvos.
- O cliente aplica o resultado completo vindo do servidor sem usar RNG local.
- Efeitos especiais e interações são processados no servidor.

## Endpoints de debug
- `GET /debug/matches` → lista partidas, jogadores e `serverSeq`.
- `GET /debug/match/:id` → estado atual e últimas ações.

## Cliente
- `client/net/wsClient.js`: conexão com reconexão automática, join memorizado para rejoin com `sinceSeq`, controle de duplicatas por `actionId`.
- `client/multiplayer/syncManager.js`: fila `pending` com snapshots para rollback, aplicação otimista para `PLAY_CARD`/`END_TURN`, suporte a `ATTACK` remoto sem otimismo.
- `client/wrapDispatcherForMP.js`: intercepta `playFromHand`/`endTurn`/`resolveAttackOn` quando `mode=mp`, envia ações ao servidor; aplica remoto com guarda `__APPLY_REMOTE`.
- `Game.applyResolvedAttack(payload)`: aplica resultado de combate vindo do servidor com todos os efeitos (dano, overkill, morte, etc).

## Testes
- `npm run test-multiplayer`: conecta dois clientes headless (`p1`, `p2`) no mesmo `matchId`, executa:
  - `PLAY_CARD` válido: `actionAccepted` para ambos e sequência ordenada.
  - Ação inválida (turno errado): `actionRejected` com rollback.
  - `ATTACK`: envia ação, servidor resolve determinísticamente, cliente aplica resultado.
  - Desconexão/reconexão com `sinceSeq`: recebe `snapshot` e `replay`.
  - Validação de idempotência e ordenação por `serverSeq`.

## Decisões
- `serverSeq` garante ordenação/idempotência e seed determinística para combate.
- UI otimista no cliente melhora responsividade; o servidor confirma/recusa com rollback.
- Reconexão por `sinceSeq` replays mantém estado consistente.
- Combate usa RNG determinístico no servidor para garantir consistência entre clientes.
- Ações de ataque não são otimistas para evitar inconsistências de RNG.

## Exemplos de Uso

### Iniciar uma partida multiplayer:
```bash
# Terminal 1 - Iniciar servidor
npm run start-server

# Terminal 2 - Servidor de arquivos estáticos
npx serve -s . -p 3001
```

### Abrir duas abas no navegador:
- Jogador 1: `http://localhost:3001/mytragor_simulador.html?mode=mp&match=TESTE123&side=p1`
- Jogador 2: `http://localhost:3001/mytragor_simulador.html?mode=mp&match=TESTE123&side=p2`

### Executar testes automatizados:
```bash
npm run test-multiplayer
```

### Usar o lobby multiplayer:
- Abrir `http://localhost:3001/multiplayer.html`
- Criar sala ou entrar em uma existente
- Compartilhar o link com outro jogador
