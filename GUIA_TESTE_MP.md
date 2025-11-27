# GUIA DE TESTE - MULTIPLAYER MYTRAGOR

## Pré-requisitos

1. Node.js instalado
2. Duas abas do navegador (OU dois navegadores)
3. Servidor rodando na porta 8081 (WebSocket)
4. Servidor HTTP rodando na porta 3000 (ou usar `localhost`)

## Iniciar Servidores

### Terminal 1: WebSocket Server (porta 8081)
```bash
cd "caminho/para/mytragor-simulador"
node server/index.js
```
Esperado: `[ws-server] listening 8081`

### Terminal 2: HTTP Server (porta 3000)
```bash
cd "caminho/para/mytragor-simulador"
# Usando http-server (requer npm install -g http-server)
http-server -p 3000 -c-1 --cors

# OU usando Node puro
node -e "const http=require('http');const fs=require('fs');http.createServer((req,res)=>{try{const file=req.url.includes('test')?'test-mp-e2e.html':'index.html';res.writeHead(200,{'Content-Type':'text/html'});res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end('Not found');}}).listen(3000,()=>console.log('HTTP server on 3000'));"
```

## TESTE #1: Duas Abas (Recomendado)

### Passo 1: Abrir Player P1 (Host)
```
1. Abrir navegador → localhost:3000
2. Clicar "Modo Multiplayer"
3. Na URL que abre: `mp-game.html?match=TESTE1&player=p1`
```

### Passo 2: Abrir Player P2 (Client)
```
1. Abrir nova aba → localhost:3000
2. Digitar URL: `mp-game.html?match=TESTE1&player=p2`
3. Ambas devem conectar ao WebSocket
```

### Passo 3: Verificar Conexão
- [ ] P1 vê "Oponente — P2" no topo direito
- [ ] P2 vê "Oponente — P1" no topo direito
- [ ] Ambos veem "Escolha seu baralho..."

### Passo 4: P1 Escolhe Deck
```
1. P1 clica "Escolher Baralho"
2. Seleciona um líder
3. Verifica console (F12): [MP] SET_LEADER accepted
4. P2 deve receber: "Oponente definiu líder"
5. Ambos veem: "playerChosen = {p1: true, p2: false}"
```

### Passo 5: P2 Escolhe Deck
```
1. P2 clica "Escolher Baralho"
2. Seleciona OUTRO líder (para diferenciar)
3. Verifica console: [MP] SET_LEADER accepted
4. P1 deve receber: "Oponente definiu líder"
5. Ambos veem: "playerChosen = {p1: true, p2: true}"
```

### Passo 6: Iniciar Partida
```
1. Ambas abas tentam iniciar
2. Primeira a clicar em "Iniciar" envia START_MATCH
3. Ambas recebem: "Partida iniciada"
4. Botão muda para "Próxima Fase"
5. Aparecem dois líderes no campo (um de cada lado)
```

### Passo 7: Verificar Sincronização de Ações

#### P1 joga carta:
```
1. P1 clica em carta na mão
2. VERIFICAR: Carta aparece imediatamente em P1 (SEM delay)
3. Console P1: [wrapDispatcherForMP] playFromHand called
4. Console P1: Enviando PLAY_CARD
5. Esperar 200ms...
6. Console P2: Recebeu PLAY_CARD de p1
7. Console P2: playFromHand aplicado remotamente
8. VERIFICAR: P2 vê a mesma carta em campo
```

#### P2 joga carta:
```
1. P2 clica em carta na mão
2. VERIFICAR: Carta aparece imediatamente em P2 (SEM delay)
3. Esperar 200ms...
4. VERIFICAR: P1 vê a carta de P2 em campo
```

### Passo 8: Testar END_TURN

#### P1 encerra turno:
```
1. P1 clica "Encerrar Turno"
2. Console: [wrapDispatcherForMP] endTurn called
3. P1 vê "Ativo — Oponente"
4. P1 NÃO pode jogar (botão desativado)
5. P2 vê "Ativo — Você"
6. P2 recebe novos fragmentos (pool)
7. P2 pode jogar normalmente
```

#### P2 encerra turno:
```
1. P2 clica "Encerrar Turno"
2. Volta para P1
3. Ciclo continua
```

## TESTE #2: Verificações Importantes

### Console (F12)

Colar no console de qualquer aba:

```javascript
// Verificar STATE
window.STATE

// Verificar playerChosen
window.syncManager.playerChosen

// Verificar isHost
window.STATE.isHost  // true para P1, false para P2

// Verificar leaders
console.log(window.STATE.you.leader, window.STATE.ai.leader)

// Ver todos os logs de ações
console.log(window.syncManager.getHistory())
```

### Monitoramento em Tempo Real

```javascript
// Carregar monitor (já incluído em mp-monitor.js)
// Ou colar manualmente:

mpMonitor.checkState()   // Ver estado atual
mpMonitor.testPlayCard(0) // Testar carta
mpMonitor.testEndTurn()   // Testar turno
```

## TESTE #3: Cenários de Erro

### Cenário 1: P1 Desconecta
```
1. P1 abre DevTools
2. Aba Network → desabilita
3. Tenta jogar carta
4. Console deve mostrar erro de conexão
5. P2 deve receber: "Oponente saiu"
```

### Cenário 2: Lag Simulado
```
1. DevTools → Aba Network
2. Throttle: "Slow 4G" (100+ ms latência)
3. Jogar carta
4. Verificar que ainda sincroniza (mas mais lento)
```

### Cenário 3: Rejeição de Ação
```
1. Modificar console: window.STATE.active = 'ai'
2. P1 tenta jogar (não é seu turno)
3. Servidor deve rejeitar
4. Console mostra: "Ação rejeitada"
```

## TROUBLESHOOTING

### "Conexão recusada na porta 8081"
```
✓ Verificar: node server/index.js está rodando
✓ Verificar: netstat -an | grep 8081 (Windows)
```

### "playerChosen não sincroniza"
```
✓ Console: window.syncManager.playerChosen
✓ Deve ter: {p1: true, p2: false} ou similar
✓ Se não sincroniza, reiniciar browser
```

### "Cartas não aparecem no outro lado"
```
✓ Console: window.syncManager.getStatus()
✓ Ver quantas ações pendentes
✓ Se muitas pendentes, servidor pode estar rejeitando
✓ Verificar erros no console do servidor
```

### "Turno não muda"
```
✓ Console: window.STATE.active
✓ Deve ser 'you' ou 'ai'
✓ Se não muda após END_TURN, check logs do servidor
```

## LOGS ESPERADOS

### Console do Navegador (P1)
```
[wsClient] connected
[syncManager] enqueueAndSend: SET_LEADER
[wrapDispatcherForMP] playFromHand called: you, 0
[syncManager] PLAY_CARD enqueued locally
[syncManager] Host published snapshot
```

### Console do Servidor
```
[ws-server] listening 8081
[ws-server] apply TESTE1 p1 SET_LEADER
[ws-server] accepted TESTE1 seq= 1 type= SET_LEADER
[ws-server] apply TESTE1 p1 PLAY_CARD
[ws-server] accepted TESTE1 seq= 4 type= PLAY_CARD
```

## CHECKLIST DE SUCESSO

- [ ] Dois navegadores conectados ao mesmo `matchId`
- [ ] P1 e P2 veem nomes um do outro
- [ ] P1 escolhe deck → P2 vê alteração em tempo real
- [ ] P2 escolhe deck → P1 vê alteração em tempo real
- [ ] Ambos veem "Iniciar" após escolhas
- [ ] Partida inicia e mostra ambos os líderes
- [ ] P1 joga carta → P2 vê IMEDIATAMENTE (sem delay)
- [ ] P2 joga carta → P1 vê IMEDIATAMENTE (sem delay)
- [ ] END_TURN muda quem pode jogar
- [ ] Fragmentos aumentam no novo turno
- [ ] Nenhuma mensagem de erro no console
- [ ] Pode jogar 10+ turnos sem desincronizar

## Próximas Ações

Se tudo passou:
1. ✅ Multiplayer está funcionando
2. 🔧 Testar mais cenários complexos (ATACKs, magias, etc)
3. 🎮 Rodar partida completa até alguém vencer
4. 🌐 Testar em computadores diferentes (não mesma rede local)
5. 📊 Monitorar performance (latência, CPU, memória)

Se algo falhou:
1. 🐛 Revisar console (F12) para erros específicos
2. 📋 Comparar com logs esperados
3. 🔌 Verificar se servidor está rodando
4. 🔄 Reiniciar servidor e cliente
5. 📞 Coletar stack traces e investigar

