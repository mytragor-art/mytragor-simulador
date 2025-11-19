;(function(){
  window.LOCAL_MP = true
  window.__IS_MP = true
  function $$(s){ return document.querySelector(s) }
  function onReady(){
    try{ if(typeof render==='function') render() }catch(e){}
    const btnRestart = document.getElementById('btnRestart')
    if(btnRestart) btnRestart.onclick = function(){ location.reload() }
    document.addEventListener('keydown', function(ev){
      const side = (window.STATE && window.STATE.active) || 'you'
      if(!window.LOCAL_MP) return
      if(side === 'you'){
        if(ev.key>='1' && ev.key<='5'){ try{ const idx = Number(ev.key)-1; playFromHand('you', idx) }catch(e){} }
        if(ev.key.toLowerCase()==='e'){ try{ endTurn() }catch(e){} }
      } else {
        const map = { q:0, w:1, e:2, r:3, t:4 }
        const k = ev.key.toLowerCase()
        if(map.hasOwnProperty(k)){ try{ playFromHand('ai', map[k]) }catch(e){} }
        if(ev.key.toLowerCase()==='p'){ try{ endTurn() }catch(e){} }
      }
    })
  }
  document.addEventListener('DOMContentLoaded', onReady)
})();