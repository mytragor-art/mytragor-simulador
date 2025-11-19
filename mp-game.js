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
})();
