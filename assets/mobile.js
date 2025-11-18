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

  // Funcionalidade de clique e arraste para o preview flutuante
  function setupFloatingPreview() {
    try {
      const preview = document.getElementById('previewCol');
      if (!preview) return;

      let isDragging = false;
      let startX, startY, initialX, initialY;
      let currentX = 0, currentY = 0;

      // Carregar posição salva
      function loadSavedPosition() {
        try {
          const saved = localStorage.getItem('previewPosition');
          if (saved) {
            const pos = JSON.parse(saved);
            currentX = pos.x || 0;
            currentY = pos.y || 0;
            preview.style.transform = `translate(${currentX}px, ${currentY}px)`;
          }
        } catch (e) {
          console.warn('Erro ao carregar posição salva:', e);
        }
      }

      // Salvar posição
      function savePosition() {
        try {
          localStorage.setItem('previewPosition', JSON.stringify({ x: currentX, y: currentY }));
        } catch (e) {
          console.warn('Erro ao salvar posição:', e);
        }
      }

      // Limitar posição dentro da tela
      function constrainPosition(x, y) {
        const rect = preview.getBoundingClientRect();
        const maxX = window.innerWidth - rect.width - 10;
        const maxY = window.innerHeight - rect.height - 10;
        
        return {
          x: Math.max(10, Math.min(x, maxX)),
          y: Math.max(10, Math.min(y, maxY))
        };
      }

      // Iniciar arraste
      function startDrag(e) {
        if (preview.classList.contains('expanded')) return;
        
        isDragging = true;
        preview.classList.add('dragging');
        
        const touch = e.touches ? e.touches[0] : e;
        startX = touch.clientX;
        startY = touch.clientY;
        
        const rect = preview.getBoundingClientRect();
        initialX = rect.left;
        initialY = rect.top;
        
        e.preventDefault();
      }

      // Arrastar
      function drag(e) {
        if (!isDragging) return;
        
        const touch = e.touches ? e.touches[0] : e;
        const deltaX = touch.clientX - startX;
        const deltaY = touch.clientY - startY;
        
        let newX = initialX + deltaX;
        let newY = initialY + deltaY;
        
        // Manter no lado direito
        if (newX < window.innerWidth / 2) {
          newX = window.innerWidth / 2;
        }
        
        const constrained = constrainPosition(newX - preview.offsetLeft, newY - preview.offsetTop);
        currentX = constrained.x;
        currentY = constrained.y;
        
        preview.style.transform = `translate(${currentX}px, ${currentY}px)`;
        preview.style.right = 'auto';
        preview.style.top = 'auto';
        
        e.preventDefault();
      }

      // Finalizar arraste
      function endDrag() {
        if (!isDragging) return;
        
        isDragging = false;
        preview.classList.remove('dragging');
        savePosition();
      }

      // Toggle expand/collapse
      function toggleExpand(e) {
        if (isDragging) return;
        
        // Não expandir se clicou no botão de fechar
        if (e.target.textContent === '✕' || e.target.style.content === '"✕"') {
          return;
        }
        
        // Não expandir se clicou em links ou botões
        if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON') return;
        
        const isExpanded = preview.classList.contains('expanded');
        
        if (isExpanded) {
          preview.classList.remove('expanded');
          // Restaurar posição original
          preview.style.transform = `translate(${currentX}px, ${currentY}px)`;
          preview.style.right = '10px';
          preview.style.top = '90px';
          preview.style.left = 'auto';
          preview.style.bottom = 'auto';
        } else {
          preview.classList.add('expanded');
          // Manter no canto direito quando expandido (não centralizar)
          preview.style.transform = 'none';
          preview.style.right = '10px';
          preview.style.top = '90px';
          preview.style.left = 'auto';
          preview.style.bottom = 'auto';
        }
        
        if (window.adjustArenaHeightForMobile) {
          window.adjustArenaHeightForMobile();
        }
      }

      // Eventos de mouse
      preview.addEventListener('mousedown', startDrag);
      document.addEventListener('mousemove', drag);
      document.addEventListener('mouseup', endDrag);
      
      // Eventos de toque
      preview.addEventListener('touchstart', startDrag, { passive: false });
      document.addEventListener('touchmove', drag, { passive: false });
      document.addEventListener('touchend', endDrag);
      
      // Click para expandir/colapsar
      preview.addEventListener('click', toggleExpand);
      
      // Botão de fechar
      preview.addEventListener('click', function(e) {
        if (e.target.textContent === '✕' || e.target.style.content === '"✕"') {
          e.stopPropagation();
          preview.classList.remove('expanded');
          // Restaurar posição
          preview.style.transform = `translate(${currentX}px, ${currentY}px)`;
          preview.style.right = '10px';
          preview.style.top = '90px';
          preview.style.left = 'auto';
          preview.style.bottom = 'auto';
          
          if (window.adjustArenaHeightForMobile) {
            window.adjustArenaHeightForMobile();
          }
        }
      });
      
      // Prevenir que cliques dentro do conteúdo fechem o preview
      const inspector = preview.querySelector('.inspector');
      const meta = preview.querySelector('.meta');
      if (inspector) {
        inspector.addEventListener('click', function(e) { e.stopPropagation(); });
      }
      if (meta) {
        meta.addEventListener('click', function(e) { e.stopPropagation(); });
      }
      
      // Detectar mudanças de orientação
      function handleOrientationChange() {
        setTimeout(function() {
          // Recalcular posição para nova orientação
          const constrained = constrainPosition(currentX, currentY);
          currentX = constrained.x;
          currentY = constrained.y;
          
          if (!preview.classList.contains('expanded')) {
            preview.style.transform = `translate(${currentX}px, ${currentY}px)`;
          }
          
          if (window.adjustArenaHeightForMobile) {
            window.adjustArenaHeightForMobile();
          }
        }, 300);
      }
      
      window.addEventListener('orientationchange', handleOrientationChange);
      window.addEventListener('resize', handleOrientationChange);
      
      // Carregar posição salva ao iniciar
      loadSavedPosition();
      
      // Garantir posição inicial correta se não houver posição salva
      if (!preview.style.transform || preview.style.transform === 'none') {
        preview.style.right = '10px';
        preview.style.top = '90px';
        preview.style.left = 'auto';
        preview.style.bottom = 'auto';
      }
      
      console.log('Floating preview configurado com sucesso!');
      
    } catch (e) {
      console.warn('setupFloatingPreview failed', e);
    }
  }

  // Inicializar após um pequeno delay para garantir que o DOM esteja pronto
  setTimeout(setupFloatingPreview, 800);

})();
