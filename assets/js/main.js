// Page loader: waits until 60% of images are loaded before revealing the page
(function () {
  var loader = document.getElementById('page-loader');
  if (!loader) return;

  var bar    = loader.querySelector('.loader-bar');
  var hidden = false;

  function hideLoader() {
    if (hidden) return;
    hidden = true;
    loader.classList.add('loader-hidden');
    loader.addEventListener('transitionend', function () { loader.remove(); }, { once: true });
  }

  var fallback = setTimeout(hideLoader, 8000);

  function init() {
    var imgs  = Array.from(document.images);
    var total = imgs.length;

    if (total === 0) { clearTimeout(fallback); hideLoader(); return; }

    var settled = 0;

    function onSettled() {
      settled++;
      var pct = settled / total;
      if (bar) bar.style.width = Math.min(pct * 100, 100) + '%';
      if (pct >= 0.6) { clearTimeout(fallback); hideLoader(); }
    }

    imgs.forEach(function (img) {
      if (img.complete) {
        onSettled();
      } else {
        img.addEventListener('load',  onSettled, { once: true });
        img.addEventListener('error', onSettled, { once: true });
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

document.addEventListener('DOMContentLoaded', () => {
  const menuToggle    = document.querySelector('.mobile-menu-toggle');
  const nav           = document.querySelector('#site-navigation');
  const header        = document.querySelector('.site-header');
  const body          = document.body;
  const desktopMQ     = window.matchMedia('(min-width: 960px)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const navLinks      = nav ? Array.from(nav.querySelectorAll('.nav-link')) : [];

  const setActiveNavLink = (link, value = 'page') => {
    if (!link) return;
    navLinks.forEach(l => l.removeAttribute('aria-current'));
    link.setAttribute('aria-current', value);
  };

  const currentPath     = window.location.pathname.split('/').pop() || 'index.html';
  const sectionNavLinks = navLinks.filter(l => (l.getAttribute('href') || '').startsWith('#'));
  const currentPageLink = navLinks.find(l => (l.getAttribute('href') || '') === currentPath) ?? null;

  {
    const hash       = window.location.hash;
    const hashedLink = hash && navLinks.find(l => l.getAttribute('href') === hash);
    if (hashedLink) {
      setActiveNavLink(hashedLink, 'location');
    } else if (currentPageLink) {
      setActiveNavLink(currentPageLink);
    } else if (currentPath === 'index.html' && sectionNavLinks[0]) {
      setActiveNavLink(sectionNavLinks[0], 'location');
    }
  }

  const overlay         = document.getElementById('nav-overlay');
  const drawerClose     = document.querySelector('.nav-drawer-close');
  const heroSection     = document.querySelector('.hero-section');
  const dropdownTriggers = Array.from(document.querySelectorAll('.nav-dropdown-trigger'));
  let lastScrollY = window.scrollY;

  const setDropdownState = (trigger, open) => {
    const parent   = trigger?.closest('.nav-item-dropdown');
    const dropdown = parent?.querySelector('.nav-dropdown');
    if (!trigger || !parent || !dropdown) return;
    parent.classList.toggle('open', open);
    trigger.setAttribute('aria-expanded', String(open));
    if (!desktopMQ.matches) {
      dropdown.style.height = open ? `${dropdown.scrollHeight}px` : '0px';
    } else {
      dropdown.style.removeProperty('height');
    }
  };

  const syncDropdownHeights = () => {
    dropdownTriggers.forEach(trigger => {
      const parent   = trigger.closest('.nav-item-dropdown');
      const dropdown = parent?.querySelector('.nav-dropdown');
      if (!dropdown) return;
      if (!desktopMQ.matches) {
        dropdown.style.height = parent?.classList.contains('open') ? `${dropdown.scrollHeight}px` : '0px';
      } else {
        dropdown.style.removeProperty('height');
      }
    });
  };

  const syncHeaderOffset = () => {
    if (header) document.documentElement.style.setProperty('--header-offset', `${header.offsetHeight}px`);
  };

  const updateHeaderStyle = () => {
    if (!header) return;
    const scrollY = window.scrollY;
    if (!desktopMQ.matches) {
      const navOpen    = body.classList.contains('nav-open');
      const heroBottom = heroSection?.getBoundingClientRect().bottom ?? -Infinity;
      header.classList.remove('solid');
      header.classList.toggle('mobile-solid', heroBottom <= header.offsetHeight || navOpen);
      if (navOpen || scrollY <= 16) {
        header.classList.remove('mobile-hidden');
      } else if (scrollY > lastScrollY + 6) {
        header.classList.add('mobile-hidden');
      } else if (scrollY < lastScrollY - 6) {
        header.classList.remove('mobile-hidden');
      }
    } else {
      header.classList.remove('mobile-hidden', 'mobile-solid');
      header.classList.toggle('solid', scrollY > 40);
    }
    lastScrollY = scrollY;
  };

  const closeMenu = () => {
    if (!menuToggle || !nav) return;
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Open navigation menu');
    nav.classList.remove('open');
    overlay?.classList.remove('active');
    body.classList.remove('nav-open');
    syncHeaderOffset();
    updateHeaderStyle();
  };

  const openMenu = () => {
    if (!menuToggle || !nav || desktopMQ.matches) return;
    menuToggle.setAttribute('aria-expanded', 'true');
    menuToggle.setAttribute('aria-label', 'Close navigation menu');
    nav.classList.add('open');
    overlay?.classList.add('active');
    body.classList.add('nav-open');
    syncHeaderOffset();
    syncDropdownHeights();
    header?.classList.remove('mobile-hidden');
    header?.classList.add('mobile-solid');
  };

  // Hamburger toggle
  menuToggle?.addEventListener('click', () => {
    menuToggle.getAttribute('aria-expanded') === 'true' ? closeMenu() : openMenu();
  });

  drawerClose?.addEventListener('click', closeMenu);
  overlay?.addEventListener('click', closeMenu);

  // ─── Swipe gesture ───────────────────────────────────────────
  if (typeof Hammer !== 'undefined') {
    const swipeZone = document.getElementById('swipe-open-zone');
    if (swipeZone) {
      const hm = new Hammer(swipeZone, { touchAction: 'pan-y' });
      hm.get('swipe').set({ direction: Hammer.DIRECTION_RIGHT, threshold: 10, velocity: 0.3 });
      hm.on('swiperight', () => { if (!desktopMQ.matches) openMenu(); });
    }
  }

  // Vanilla passive touch swipe-left to close
  if (nav) {
    let navTouchX = 0;
    nav.addEventListener('touchstart', e => { navTouchX = e.touches[0].clientX; }, { passive: true });
    nav.addEventListener('touchend', e => {
      if (!desktopMQ.matches && navTouchX - e.changedTouches[0].clientX > 55) closeMenu();
    }, { passive: true });
  }

  navLinks.forEach(link => {
    if (link.tagName !== 'A') return;
    link.addEventListener('click', () => {
      if (!(link.getAttribute('href') || '').startsWith('#')) setActiveNavLink(link);
      closeMenu();
    });
  });

  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

  const handleBreakpointChange = () => {
    if (desktopMQ.matches) closeMenu();
    syncHeaderOffset();
    syncDropdownHeights();
    updateHeaderStyle();
  };

  window.addEventListener('scroll', updateHeaderStyle, { passive: true });
  window.addEventListener('resize', () => { syncHeaderOffset(); syncDropdownHeights(); }, { passive: true });
  desktopMQ.addEventListener('change', handleBreakpointChange);
  syncHeaderOffset();
  updateHeaderStyle();

  // ─── Dropdown navigation ─────────────────────────────────────
  const closeAllDropdowns = (except) => {
    dropdownTriggers.forEach(t => { if (t !== except) setDropdownState(t, false); });
  };

  dropdownTriggers.forEach(trigger => {
    const parent   = trigger.closest('.nav-item-dropdown');
    const dropdown = parent?.querySelector('.nav-dropdown');

    trigger.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      if (desktopMQ.matches) return; // desktop: CSS hover controls visibility
      const open = trigger.getAttribute('aria-expanded') === 'true';
      closeAllDropdowns(open ? null : trigger);
      setDropdownState(trigger, !open);
    });

    trigger.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setDropdownState(trigger, true);
        dropdown?.querySelector('.nav-dropdown-link')?.focus();
      }
    });

    dropdown?.addEventListener('keydown', e => {
      const links = Array.from(dropdown.querySelectorAll('.nav-dropdown-link'));
      const idx   = links.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        links[(idx + 1) % links.length]?.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        idx === 0 ? trigger.focus() : links[idx - 1]?.focus();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeAllDropdowns();
        trigger.focus();
      }
    });

    parent?.addEventListener('mouseleave', () => { if (desktopMQ.matches) setDropdownState(trigger, false); });
    parent?.addEventListener('focusout', e => {
      if (desktopMQ.matches && !parent.contains(e.relatedTarget)) setDropdownState(trigger, false);
    });

    dropdown?.querySelectorAll('.nav-dropdown-link').forEach(link => {
      link.addEventListener('click', () => { closeAllDropdowns(); closeMenu(); });
    });
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('.nav-item-dropdown')) closeAllDropdowns();
  });

  syncDropdownHeights();

  if (typeof Swiper !== 'undefined') {
    new Swiper('.hero-swiper', {
      loop: true,
      speed: 900,
      autoplay: { delay: 6000, disableOnInteraction: false },
      pagination: { el: '.swiper-pagination', clickable: true },
      navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
    });

    const testimonialEl = document.querySelector('.testimonials-swiper');
    if (testimonialEl) {
      const testimonialsSwiper = new Swiper(testimonialEl, {
        speed: 650,
        spaceBetween: 20,
        grabCursor: true,
        watchOverflow: true,
        autoHeight: false,
        autoplay: reducedMotion ? false : { delay: 5000, disableOnInteraction: false, pauseOnMouseEnter: true },
        pagination: { el: '.testimonials-pagination', clickable: true },
        navigation: { nextEl: '.testimonials-arrow-next', prevEl: '.testimonials-arrow-prev' },
        breakpoints: {
          0:    { slidesPerView: 1 },
          768:  { slidesPerView: 2, spaceBetween: 24 },
          1100: { slidesPerView: 3, spaceBetween: 28 },
        },
      });

      if (!reducedMotion) {
        testimonialEl.addEventListener('mouseenter', () => testimonialsSwiper.autoplay?.stop());
        testimonialEl.addEventListener('mouseleave', () => testimonialsSwiper.autoplay?.start());
      }
    }
  }

  const revealTargets  = document.querySelectorAll('.section-reveal, [data-reveal]');
  const sectionTargets = sectionNavLinks
    .map(link => {
      const href    = link.getAttribute('href');
      const section = href && document.querySelector(href);
      return section ? { link, section } : null;
    })
    .filter(Boolean);

  if ('IntersectionObserver' in window && sectionTargets.length) {
    const obs = new IntersectionObserver(entries => {
      const top = entries
        .filter(e => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!top) return;
      const item = sectionTargets.find(i => i.section.id === top.target.id);
      if (item) setActiveNavLink(item.link, 'location');
    }, { rootMargin: '-22% 0px -55% 0px', threshold: [0.2, 0.45, 0.7] });

    sectionTargets.forEach(item => obs.observe(item.section));
  }

  if ('IntersectionObserver' in window && revealTargets.length && !reducedMotion) {
    const revealObs = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('reveal-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });

    revealTargets.forEach(t => revealObs.observe(t));
  } else {
    revealTargets.forEach(t => t.classList.add('reveal-visible'));
  }

  const parallaxCards = document.querySelectorAll('.parallax-card');
  const workImages    = document.querySelectorAll('.work-image img');

  if ((parallaxCards.length || workImages.length) && !reducedMotion) {
    let ticking = false;

    const updateParallax = () => {
      const mid = window.innerHeight * 0.5; // hoist: constant across all elements this frame
      parallaxCards.forEach(card => {
        const rect     = card.getBoundingClientRect();
        const speed    = parseFloat(card.dataset.speed) || 0.1;
        const distance = rect.top + rect.height * 0.3 - mid;
        card.style.setProperty('--card-parallax-y',
          `${Math.round(Math.max(-12, Math.min(distance * speed * 0.11, 12)))}px`);
      });
      workImages.forEach(img => {
        const frame = img.closest('.work-image');
        if (!frame) return;
        const rect     = frame.getBoundingClientRect();
        const distance = rect.top + rect.height * 0.45 - mid;
        img.style.setProperty('--image-parallax-y',
          `${Math.max(-9, Math.min(distance * 0.04, 9))}px`);
      });
      ticking = false;
    };

    const requestParallaxUpdate = () => {
      if (!ticking) { requestAnimationFrame(updateParallax); ticking = true; }
    };

    window.addEventListener('scroll', requestParallaxUpdate, { passive: true });
    window.addEventListener('resize', requestParallaxUpdate, { passive: true });
    updateParallax();
  }

  if (!reducedMotion) {
    document.querySelectorAll('.button, .feature-link, .testimonials-arrow, .social-link')
      .forEach(btn => {
        btn.addEventListener('mouseenter', () => btn.classList.add('btn-hover'));
        btn.addEventListener('mouseleave', () => btn.classList.remove('btn-hover'));
      });
  }
});
