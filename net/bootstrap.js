// net/bootstrap.js
(function(){
  const p=new URLSearchParams(location.search);
  const mode=p.get('mode')||'vsia'; // local | vsia | mp
  const side=p.get('side')||'p1';
  const room=p.get('room')||'SALA_TESTE';
  const server=(localStorage.getItem('mpServer')||'ws://localhost:8080');

  // Track whether an AIController was created by bootstrap (used to avoid
  // running the inline aiMain() when a controller-based AI is present).
  try{ window.__HAS_AI_CONTROLLER = false; }catch(e){}

  let me, opp;
  if(mode==='local'){ me=new HumanController('p1'); opp=new HumanController('p2'); }
  else if(mode==='vsia'){ me=new HumanController('p1'); opp=new AIController('p2'); try{ window.__HAS_AI_CONTROLLER = true; }catch(e){} }
  else if(mode==='mp'){ me=new HumanController(side); opp=null; }

  // Attach controllers to Game events. Game may be defined after this script
  // runs (script ordering differs across pages), so retry a few times if needed.
  function attachControllersToGame(){
    try{
      if(typeof Game!=='undefined' && Game.on){
        Game.on('*',(evt)=>{ me&&me.onEvent&&me.onEvent(evt); opp&&opp.onEvent&&opp.onEvent(evt);});
        if(me && me.onAttach) try{ me.onAttach(); }catch(e){}
        if(opp && opp.onAttach) try{ opp.onAttach(); }catch(e){}
        return true;
      }
    }catch(e){}
    return false;
  }

  if(!attachControllersToGame()){
    // retry for up to ~5s
    let attempts=0; const maxAttempts=25;
    const t = setInterval(()=>{
      attempts++;
      if(attachControllersToGame() || attempts>=maxAttempts){ clearInterval(t); }
    },200);
  }
  window.addEventListener('beforeunload',()=>{ try{ window.__HAS_AI_CONTROLLER = false; }catch(e){}; me&&me.dispose&&me.dispose(); opp&&opp.dispose&&opp.dispose(); });
})();