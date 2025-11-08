// net/bootstrap.js
(function(){
  const p=new URLSearchParams(location.search);
  const mode=p.get('mode')||'vsia'; // local | vsia | mp
  const side=p.get('side')||'p1';
  const room=p.get('room')||'SALA_TESTE';
  const server=(localStorage.getItem('mpServer')||'ws://localhost:8080');

  let me, opp;
  if(mode==='local'){ me=new HumanController('p1'); opp=new HumanController('p2'); }
  else if(mode==='vsia'){ me=new HumanController('p1'); opp=new AIController('p2'); }
  else if(mode==='mp'){ me=new HumanController(side); opp=new NetController(side==='p1'?'p2':'p1',{serverURL:server,room}); }

  if(typeof Game!=='undefined'&&Game.on){
    Game.on('*',(evt)=>{ me&&me.onEvent&&me.onEvent(evt); opp&&opp.onEvent&&opp.onEvent(evt);});
  }
  me&&me.onAttach&&me.onAttach(); opp&&opp.onAttach&&opp.onAttach();
  window.addEventListener('beforeunload',()=>{me&&me.dispose&&me.dispose(); opp&&opp.dispose&&opp.dispose();});
})();