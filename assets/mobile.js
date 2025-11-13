(function(){
  if(!(window.matchMedia && window.matchMedia('(max-width:880px)').matches)) return;
  try{
    document.documentElement.classList.add('mobile-css-loaded');
    // Ensure preview/log are collapsed by default unless explicitly expanded
    const preview = document.getElementById('previewCol');
    const log = document.getElementById('logCol');
    if(preview && !preview.classList.contains('expanded')) preview.classList.remove('expanded');
    if(log && !log.classList.contains('expanded')) log.classList.remove('expanded');
    if(typeof window.adjustArenaHeightForMobile === 'function') setTimeout(window.adjustArenaHeightForMobile, 80);
  }catch(e){ console.warn('mobile init failed', e); }

  // Wire mobile toggle buttons safely (idempotent)
  function safeWire(btnId, colId){
    try{
      const btn = document.getElementById(btnId);
      const col = document.getElementById(colId);
      if(!btn || !col) return;
      btn.style.display = 'inline-block';
      if(btn.__mobileWired) return;
      btn.addEventListener('click', function(){ col.classList.toggle('expanded'); if(window.adjustArenaHeightForMobile) window.adjustArenaHeightForMobile(); });
      btn.__mobileWired = true;
    }catch(e){ /* ignore */ }
  }
  safeWire('btnTogglePreview','previewCol');
  safeWire('btnToggleLogMobile','logCol');

})();
