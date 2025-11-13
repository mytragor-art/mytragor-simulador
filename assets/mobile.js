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

  // Compact fragment dock into a single "X/10" badge for mobile
  function updateMobileFragBadge(){
    try{
      const dock = document.querySelector('.fragDock');
      if(!dock) return;
      // Count visible fragment token nodes (fallbacks for different markup)
      const tokenSelectors = ['.fragToken', '.fragStack', '.fragBack', '.frag'];
      let count = 0;
      for(const sel of tokenSelectors){ const els = dock.querySelectorAll(sel); if(els && els.length) { count = els.length; break; } }
      // If still zero, try counting img children
      if(count === 0){ count = Array.from(dock.children).filter(c=> c.tagName === 'IMG' || c.classList.contains('fragToken') ).length; }
      // Cap at 10 for display (user requested X/10)
      const max = 10;
      if(count > max) count = max;

      let badge = dock.querySelector('.mobile-frag-badge');
      if(!badge){ badge = document.createElement('div'); badge.className = 'mobile-frag-badge'; badge.setAttribute('aria-hidden','false'); dock.appendChild(badge); }
      badge.textContent = count + '/' + max;
      // ensure badge stays visible
      badge.style.display = 'inline-flex';
    }catch(e){ console.warn('updateMobileFragBadge failed', e); }
  }

  // run once on load and also on small intervals to catch dynamic updates
  try{ updateMobileFragBadge(); window.__mobileFragBadgeTO = setInterval(updateMobileFragBadge, 900); }catch(e){}

})();
