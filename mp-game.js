(function(){
  function getParam(k){
    const u=new URL(location.href);return u.searchParams.get(k)
  }
  const matchId=(getParam('match')||getParam('room')||'TESTE')+''
  const sideParam=(getParam('player')||getParam('side')||'p1')+''
  const playerId=sideParam.toLowerCase()==='p2'?'p2':'p1'
  const playerName=(getParam('name')||('Jogador '+playerId)).toString()
  window.IS_MULTIPLAYER=true
  window.__IS_MP=true
  window.localSide=playerId
  window.remoteSide=playerId==='p1'?'p2':'p1'
  window.PLAYER_NAME=playerName
  ;(function readUserNames(){
    try{
      var usersRaw = localStorage.getItem('mt_users');
      var curRaw = localStorage.getItem('mt_current_user');
      var users = []; try{ users = usersRaw ? (JSON.parse(usersRaw)||[]) : []; }catch(e){ users = []; }
      var curEmail = null; var curName = null;
      if(curRaw){
        try{ var obj = JSON.parse(curRaw); if(obj){ curEmail = obj.email||null; curName = obj.username||obj.name||obj.email||null; } }
        catch(e){ curEmail = curRaw; curName = curRaw; }
      }
      if(!curName){ curName = params.get('name') || ('Jogador '+playerId); }
      var found = null; if(curEmail && Array.isArray(users)){ found = users.find(u=> String(u.email||'')===String(curEmail)); }
      if(found){ window.PLAYER_NAME = String(found.username||found.name||found.email||window.PLAYER_NAME); }
      else { window.PLAYER_NAME = String(curName||window.PLAYER_NAME); }
      if(!window.OPPONENT_NAME){ window.OPPONENT_NAME = (playerId==='p1'?'P2':'P1'); }
    }catch(e){}
  })()

  // Ensure the simulator reads mode=mp so bootstrap.js does NOT attach AI
  ;(function ensureMpModeInUrl(){
    try{
      const u=new URL(location.href);
      u.searchParams.set('mode','mp');
      u.searchParams.set('side',playerId);
      u.searchParams.set('room',matchId);
      history.replaceState(null,'',u.toString());
    }catch(e){}
  })()

  ;(function updateTitles(){
    try{
      const top = document.querySelector('.sideTitle'); if(top && window.OPPONENT_NAME) top.textContent = `Oponente — ${window.OPPONENT_NAME}`;
      const bottom = document.querySelector('.sideTitle.bottom'); if(bottom) bottom.textContent = `Você — ${window.PLAYER_NAME}`;
    }catch(e){}
  })()

  function loadEngine(cb){
    fetch('mytragor_simulador.html').then(r=>r.text()).then(html=>{
      var parser = new DOMParser();
      var doc = parser.parseFromString(html, 'text/html');
      var styleTag = doc.querySelector('style');
      if(styleTag){ try{ var st = document.createElement('style'); st.textContent = styleTag.textContent || ''; document.head.appendChild(st); }catch(e){} }
      var tags = Array.from(doc.querySelectorAll('script'));
      (function run(i){
        if(i>=tags.length) return typeof cb==='function' ? cb() : null;
        var t = tags[i];
        var hasSrc = t.hasAttribute('src');
        if(hasSrc){ return run(i+1); }
        var code = t.textContent || '';
        var s = document.createElement('script');
        s.text = code;
        s.onload = function(){ run(i+1); };
        document.body.appendChild(s);
        // onload may not fire for inline; proceed next tick
        setTimeout(function(){ run(i+1); }, 0);
      })(0);
    }).catch(function(){ if(typeof cb==='function') cb(); })
  }

  function initNet(){
    if(!window.wsClient||!window.syncManager) return setTimeout(initNet,100)
    window.syncManager.setContext({matchId,playerId})
    // Clear old localStorage for this match to ensure fresh start (no ghost choices)
    try{
      var oldKeys = Object.keys(localStorage).filter(k=> k.indexOf('mp_choice_' + matchId)===0);
      oldKeys.forEach(k=> localStorage.removeItem(k));
      console.log('[mp-game] cleared old localStorage entries for room', matchId, oldKeys);
    }catch(e){}
    try{ window.wsClient.connect() }catch(e){}
    try{ window.wsClient.join(matchId,playerId,0) }catch(e){}
  }
  function onReady(){
    loadEngine(function(){
      initNet()
      if(typeof render==='function') try{ render() }catch(e){}
    })
  }
  document.addEventListener('DOMContentLoaded',onReady)
  const btnRestart=document.getElementById('btnRestart')
  let _reloadPending=false
  if(btnRestart) btnRestart.onclick=function(){ if(_reloadPending) return; _reloadPending=true; setTimeout(()=>{ location.reload() },120) }

  function renderHUD() {
    const whoEl = document.getElementById('whoActive');
    if (whoEl) {
      whoEl.textContent = `Ativo — ${STATE.active === 'you' ? 'Você' : 'Oponente'}`;
    }

    const phaseName = STATE.phase === 'main' ? 'Principal' : STATE.phase === 'battle' ? 'Combate' : 'Final';
    const phaseEl = document.getElementById('phasePill');
    if (phaseEl) {
      phaseEl.textContent = `Fase: ${phaseName}`;
    }

    const rest = STATE.pool[STATE.active];
    const max = STATE.maxPool[STATE.active];
    const spent = Math.max(0, max - rest);
    const fragEl = document.getElementById('fragPill');
    if (fragEl) {
      fragEl.textContent = `Frags: ${rest}/${max} (turno)`;
      fragEl.title = `Restantes: ${rest} | Gastos: ${spent} | Max: ${max}`;
    }

    try {
      const bar = document.getElementById('phaseBar');
      if (bar) {
        const items = bar.querySelectorAll('.phaseItem');
        const map = { start: 0, main: 1, battle: 2, end: 3 };
        const idx = map[STATE.phase] ?? 0;
        items.forEach((it, i) => {
          if (i === idx) {
            it.classList.add('active');
          } else {
            it.classList.remove('active');
          }
        });
      }

      const btn = document.getElementById('phaseActionBtn');
      if (btn) {
        if (!window.__MATCH_STARTED) {
          btn.textContent = 'Iniciar';
          btn.className = 'btn btn-start';
          btn.onclick = safeStartMatch;
          btn.disabled = false;
        } else if (STATE.phase === 'main') {
          btn.textContent = 'Próxima Fase';
          btn.className = 'btn btn-next';
          btn.onclick = nextPhase;
          btn.disabled = false;
        } else {
          btn.textContent = 'Encerrar Turno';
          btn.className = 'btn btn-end';
          btn.onclick = endTurn;
          btn.disabled = false;
        }
      }
    } catch (e) {
      console.warn('Error rendering HUD:', e);
    }
  }
})();
