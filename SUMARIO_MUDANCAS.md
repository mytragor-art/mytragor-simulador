# SUMÁRIO DE MUDANÇAS DE CÓDIGO

## Arquivos Modificados

### 1. `client/wrapDispatcherForMP.js`

**Mudança 1: PLAY_CARD Otimista**
```javascript
// ANTES (Linha 20)
window.playFromHand = function(side, index){ 
  console.log('[wrapDispatcherForMP] playFromHand called:', side, index); 
  if(window.__APPLY_REMOTE){ return origPFH(side,index); } 
  syncManager.enqueueAndSend('PLAY_CARD', { side: String(side), index: Number(index) }); 
};

// DEPOIS
window.playFromHand = function(side, index){ 
  console.log('[wrapDispatcherForMP] playFromHand called:', side, index); 
  if(window.__APPLY_REMOTE){ return origPFH(side,index); } 
  // Aplicar OTIMISTICAMENTE — enviar e executar simultaneamente
  try { origPFH(side, index); } catch(e) { console.warn('[wrapDispatcherForMP] playFromHand apply failed', e); }
  // Enfileirar para confirmação do servidor
  syncManager.enqueueAndSend('PLAY_CARD', { side: String(side), index: Number(index) }); 
};
```

**Impacto**: 
- ✅ Carta aparece IMEDIATAMENTE na UI (sem delay)
- ✅ Sincroniza com servidor
- ✅ Melhor experiência de usuário

---

### 2. `client/multiplayer/syncManager.js`

**Mudança 1: Corrigir playerChosen (Linha 9)**
```javascript
// ANTES
this.playerChosen = { p1: false, p2: false }; // Incorreto em IIFE

// DEPOIS
let playerChosen = { p1: false, p2: false }; // Corrigir escopo
```

**Mudança 2: Adicionar lastSnapshotSent (Linha 10)**
```javascript
let lastSnapshotSent = 0; // Rastrear última vez que enviou snapshot
```

**Mudança 3: Corrigir syncPlayerChosen (Linhas 15-22)**
```javascript
// ANTES
window.STATE.playerChosen = this.playerChosen;

// DEPOIS
window.STATE.playerChosen = playerChosen; // Usar variável local
```

**Mudança 4: Adicionar Handler para PLAY_CARD Próprio (Após END_TURN handler)**
```javascript
// Adicionar novo if:
if(pendingAction.actionType === 'PLAY_CARD' && rec.actionType === 'PLAY_CARD') {
  try{ if(typeof window.appendLogLine==='function') 
    window.appendLogLine(`Carta jogada confirmada pelo servidor`,'effect'); }catch(e){}
  console.log('[syncManager] PLAY_CARD ação própria aceita pelo servidor');
  return;
}
```

**Mudança 5: Adicionar Handler para PLAY_CARD Remota (No else final)**
```javascript
// ANTES
} else {
  applyRemote(rec.actionType, rec.payload||{}); 
  try{ if(typeof renderSide==='function'){ renderSide('you'); renderSide('ai'); } }catch(e){}
  try{ if(typeof window.render==='function') render(); }catch(e){}
  try{ if(typeof window.appendLogLine==='function') window.appendLogLine(`Ação remota aplicada: ${rec.actionType}`,'effect'); }catch(e){}
}

// DEPOIS
} else if(rec.actionType === 'PLAY_CARD') {
  // Ação PLAY_CARD do oponente
  captureOriginals();
  try{ 
    window.__APPLY_REMOTE = true; 
    if(typeof orig.playFromHand === 'function') {
      orig.playFromHand(rec.payload.side, rec.payload.index); 
    }
  } finally { 
    window.__APPLY_REMOTE = false; 
  }
  try{ if(typeof renderSide==='function'){ renderSide('you'); renderSide('ai'); } }catch(e){}
  try{ if(typeof window.render==='function') render(); }catch(e){}
  try{ if(typeof window.appendLogLine==='function') 
    window.appendLogLine(`Oponente jogou carta de seu baralho`,'effect'); }catch(e){}
} else {
  applyRemote(rec.actionType, rec.payload||{}); 
  try{ if(typeof renderSide==='function'){ renderSide('you'); renderSide('ai'); } }catch(e){}
  try{ if(typeof window.render==='function') render(); }catch(e){}
  try{ if(typeof window.appendLogLine==='function') 
    window.appendLogLine(`Ação remota aplicada: ${rec.actionType}`,'effect'); }catch(e){}
}
```

**Mudança 6: Adicionar função publishSnapshot (Antes de window.syncManager)**
```javascript
function publishSnapshot(){
  // Apenas host publica snapshots
  if(!window.STATE || !window.STATE.isHost) return;
  // Throttle: publicar no máximo a cada 200ms
  const now = Date.now();
  if(now - lastSnapshotSent < 200) return;
  lastSnapshotSent = now;
  try{
    if(window.Game && typeof Game.buildSnapshot === 'function' && 
       window.wsClient && typeof wsClient.sendClientSnapshot === 'function'){
      const snap = Game.buildSnapshot();
      wsClient.sendClientSnapshot(snap);
      console.log('[syncManager] Host published snapshot, seq =', lastServerSeq);
    }
  }catch(e){
    console.warn('[syncManager] Error publishing snapshot:', e);
  }
}
```

**Mudança 7: Atualizar exportação window.syncManager (Última linha)**
```javascript
// ANTES
window.syncManager = { setContext, enqueueAndSend, onActionAccepted, onActionRejected, onSnapshot, getStatus: ... };

// DEPOIS
window.syncManager = { setContext, enqueueAndSend, onActionAccepted, onActionRejected, onSnapshot, publishSnapshot, getStatus: ..., persistChoice, persistAll, restoreChoices, syncPlayerChosen, playerChosen };
```

**Impacto**:
- ✅ playerChosen sincronizado corretamente
- ✅ PLAY_CARD aplicado remotamente
- ✅ Host pode publicar snapshots quando necessário

---

### 3. `mp-game.html`

**Mudança: Remover duplicação de playerChosen (Linhas 399-410)**
```javascript
// ANTES
try{
  if(rec.payload && rec.payload.side){
    if(!window.STATE.playerChosen) window.STATE.playerChosen = { p1: false, p2: false };
    if(rec.payload.side === 'p1') window.STATE.playerChosen.p1 = true;
    if(rec.payload.side === 'p2') window.STATE.playerChosen.p2 = true;
    if(window.syncManager && typeof syncManager.syncPlayerChosen === 'function'){
      syncManager.syncPlayerChosen();
    }
    console.log('[MP] SET_LEADER accepted, playerChosen =', window.STATE.playerChosen);
  }
}catch(e){ console.warn('[MP] Failed to update playerChosen', e); }

// DEPOIS
// NOTA: playerChosen já é atualizado no syncManager.applyRemote()
// Não precisamos duplicar essa lógica aqui
try{
  console.log('[MP] SET_LEADER accepted, syncManager.playerChosen =', window.syncManager && window.syncManager.playerChosen);
}catch(e){};
```

**Impacto**:
- ✅ Sem duplicação de lógica
- ✅ Source of truth é syncManager.playerChosen

---

## Linhas de Código Alteradas

| Arquivo | Linhas | Tipo | Descrição |
|---------|--------|------|-----------|
| wrapDispatcherForMP.js | 20-26 | Modificação | Otimistic PLAY_CARD |
| syncManager.js | 9 | Modificação | playerChosen como let |
| syncManager.js | 10 | Adição | lastSnapshotSent |
| syncManager.js | 19,22 | Modificação | syncPlayerChosen usa let |
| syncManager.js | 115-120 | Adição | Handler PLAY_CARD próprio |
| syncManager.js | 180-197 | Adição | Handler PLAY_CARD remoto |
| syncManager.js | 430-444 | Adição | Função publishSnapshot |
| syncManager.js | 446 | Modificação | Exportação com publishSnapshot |
| mp-game.html | 399-410 | Deleção | Remover duplicação playerChosen |

---

## Estatísticas

- **Arquivos modificados**: 3
- **Linhas adicionadas**: ~90
- **Linhas removidas**: ~15
- **Linhas modificadas**: ~10
- **Mudanças totais**: ~115 linhas

---

## Compatibilidade Backward

✅ Todas as mudanças são backward-compatible:
- Nenhuma mudança de API pública
- Nenhuma remoção de funcionalidade
- Apenas otimizações e correções
- Modo solo contra IA não afetado

---

## Como Aplicar Manualmente

Se não conseguir com git diff, pode copiar:

1. Abra `client/wrapDispatcherForMP.js`
   - Linhas 20-26: Adicione `try { origPFH(side, index); }`

2. Abra `client/multiplayer/syncManager.js`
   - Linha 9: Mude `this.playerChosen` para `let playerChosen`
   - Linha 10: Adicione `let lastSnapshotSent = 0;`
   - Linhas 19,22: Mude `this.playerChosen` para `playerChosen`
   - Adicione handlers para PLAY_CARD
   - Adicione função `publishSnapshot()`

3. Abra `mp-game.html`
   - Linhas 399-410: Remova duplicação de playerChosen

4. Teste em dois navegadores!

