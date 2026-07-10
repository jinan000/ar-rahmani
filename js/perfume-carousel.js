/* ============================================================
   AR-RAHMANI — Perfume Carousel Logic
   Full-viewport carousel matching TOONHUB reference layout
   ============================================================ */
(function () {
  'use strict';

  const PERFUMES = [
    { src: 'assets/images/hamood.png',   name: 'HAMOOD' },
    { src: 'assets/images/sabr.png',     name: 'SABR' },
    { src: 'assets/images/paradise.png', name: 'PARADISE' },
  ];

  const TOTAL = PERFUMES.length;

  let activeIndex = 0;
  let isAnimating = false;
  let isMobile = window.innerWidth < 640;

  const hero          = document.getElementById('pc-hero');
  const carouselItems = document.querySelectorAll('.pc-carousel__item');
  const activeName    = document.getElementById('pc-active-name');
  const ghostText     = document.querySelector('.pc-ghost-text span');
  const btnPrev       = document.getElementById('pc-btn-prev');
  const btnNext       = document.getElementById('pc-btn-next');

  if (!hero || !carouselItems.length) return;

  // Preload
  PERFUMES.forEach((p) => { const img = new Image(); img.src = p.src; });

  // Resize
  window.addEventListener('resize', () => {
    isMobile = window.innerWidth < 640;
    applyRoles();
  });

  // Navigate
  function navigate(direction) {
    if (isAnimating) return;
    isAnimating = true;
    activeIndex = direction === 'next'
      ? (activeIndex + 1) % TOTAL
      : (activeIndex + TOTAL - 1) % TOTAL;
    applyRoles();
    setTimeout(() => { isAnimating = false; }, 650);
  }

  // All items use bottom + left + translateX(-50%) — consistent, no conflicts
  function applyRoles() {
    const center = activeIndex;
    const left   = (activeIndex + TOTAL - 1) % TOTAL;
    const right  = (activeIndex + 1) % TOTAL;

    if (activeName) activeName.textContent = PERFUMES[activeIndex].name;
    if (ghostText)  ghostText.textContent  = PERFUMES[activeIndex].name;

    carouselItems.forEach((item, i) => {
      let role;
      if (i === center) role = 'center';
      else if (i === left) role = 'left';
      else if (i === right) role = 'right';
      else role = 'back';

      item.setAttribute('data-role', role);
      const s = item.style;

      // Always reset top — we only use bottom
      s.top = 'auto';

      switch (role) {
        case 'center':
          s.width     = isMobile ? '80vw' : '55vw';
          s.height    = isMobile ? '75vh' : '95vh';
          s.left      = '50%';
          s.bottom    = '0';
          s.transform = 'translateX(-50%)';
          s.filter    = 'blur(0px) brightness(1)';
          s.opacity   = '1';
          s.zIndex    = '20';
          break;

        case 'left':
          s.width     = isMobile ? '18vw' : '12vw';
          s.height    = isMobile ? '22vh' : '30vh';
          s.left      = isMobile ? '8%' : '13%';
          s.bottom    = '0';
          s.transform = 'translateX(-50%)';
          s.filter    = 'blur(1.5px) brightness(0.6)';
          s.opacity   = '0.7';
          s.zIndex    = '10';
          break;

        case 'right':
          s.width     = isMobile ? '18vw' : '12vw';
          s.height    = isMobile ? '22vh' : '30vh';
          s.left      = isMobile ? '92%' : '87%';
          s.bottom    = '0';
          s.transform = 'translateX(-50%)';
          s.filter    = 'blur(1.5px) brightness(0.6)';
          s.opacity   = '0.7';
          s.zIndex    = '10';
          break;

        default:
          s.width     = isMobile ? '12vw' : '8vw';
          s.height    = isMobile ? '16vh' : '22vh';
          s.left      = '50%';
          s.bottom    = '0';
          s.transform = 'translateX(-50%)';
          s.filter    = 'blur(4px) brightness(0.4)';
          s.opacity   = '0';
          s.zIndex    = '5';
          break;
      }
    });
  }

  // Buttons
  if (btnPrev) btnPrev.addEventListener('click', () => navigate('prev'));
  if (btnNext) btnNext.addEventListener('click', () => navigate('next'));

  // Keyboard
  document.addEventListener('keydown', (e) => {
    const rect = hero.getBoundingClientRect();
    if (rect.top >= window.innerHeight || rect.bottom <= 0) return;
    if (e.key === 'ArrowLeft')  navigate('prev');
    if (e.key === 'ArrowRight') navigate('next');
  });

  // Touch swipe
  let touchStartX = 0;
  hero.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });
  hero.addEventListener('touchend', (e) => {
    const diff = touchStartX - e.changedTouches[0].screenX;
    if (Math.abs(diff) > 50) navigate(diff > 0 ? 'next' : 'prev');
  }, { passive: true });

  // Init
  applyRoles();
})();
