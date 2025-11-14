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

  // Compact fragment dock into a per-player "X/10" badge for mobile
  function updateMobileFragBadge(){
    try{
      const docks = Array.from(document.querySelectorAll('.fragDock'));
      if(!docks.length) return;
      const max = 10;
      docks.forEach(dock => {
        try{
          // Determine which side this dock belongs to (prefer id: you-frags / ai-frags)
          let side = null;
          if(dock.id && dock.id.indexOf('you')!==-1) side = 'you';
          else if(dock.id && dock.id.indexOf('ai')!==-1) side = 'ai';

          let count = 0;
          // Prefer authoritative in-memory state if available
          if(window.STATE && typeof window.STATE.pool === 'object' && side){
            count = Number(window.STATE.pool[side] || 0);
          } else {
            // Fallback: count only ACTIVE fragment tokens inside this dock ('.fragToken.lit')
            const litEls = dock.querySelectorAll('.fragToken.lit');
            if(litEls && litEls.length) {
              count = litEls.length;
            } else {
              // Older markup fallback: count images or elements that look like active fragments
              count = Array.from(dock.querySelectorAll('.fragToken')).filter(el => el.classList.contains('lit')).length;
              if(count === 0){ count = Array.from(dock.children).filter(c=> c.tagName === 'IMG' || c.classList.contains('fragToken') ).length; }
            }
          }
          if(count > max) count = max;

          // Ensure we have a badge element inside THIS dock
          let badge = dock.querySelector('.mobile-frag-badge');
          if(!badge){ badge = document.createElement('div'); badge.className = 'mobile-frag-badge'; badge.setAttribute('aria-hidden','false'); dock.appendChild(badge); }
          badge.textContent = count + '/' + max;
          badge.style.display = 'inline-flex';
        }catch(e){ console.warn('updateMobileFragBadge per-dock failed', e); }
      });
    }catch(e){ console.warn('updateMobileFragBadge failed', e); }
  }

  // run once on load and periodically to catch dynamic updates
  try{ updateMobileFragBadge(); window.__mobileFragBadgeTO = setInterval(updateMobileFragBadge, 900); }catch(e){}

})();
