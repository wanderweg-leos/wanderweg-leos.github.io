/*
  Small helpers used on every page. Plain JavaScript, no libraries.
    1. Phone menu: the Menu button in the header opens and closes the menu.
    2. Photo viewer: on the About page, tapping a gallery photo opens it
       large, with Previous / Next (arrow keys and swiping also work).
*/
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };

  // ── 1. Phone menu ──
  var menuBtn = $('.menu-btn'), nav = $('#site-nav');
  if (menuBtn && nav) {
    var openLabel = menuBtn.textContent, closeLabel = menuBtn.getAttribute('data-close-label') || 'Close';
    var setOpen = function (open) {
      nav.classList.toggle('open', open);
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      menuBtn.textContent = open ? closeLabel : openLabel;
    };
    menuBtn.addEventListener('click', function () { setOpen(!nav.classList.contains('open')); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && nav.classList.contains('open')) { setOpen(false); menuBtn.focus(); } });
  }

  // ── 2. Photo viewer ──
  var viewer = $('#viewer');
  if (viewer) {
    var items = Array.prototype.slice.call(document.querySelectorAll('.gallery [data-full]'));
    var img = $('#v-img'), idx = 0, last = null, tx = null;
    var show = function () { var b = items[idx]; img.src = b.getAttribute('data-full'); img.alt = b.querySelector('img').alt; };
    var open = function (i) { last = document.activeElement; idx = i; show(); viewer.hidden = false; $('.v-close', viewer).focus(); };
    var close = function () { viewer.hidden = true; if (last) last.focus(); };
    var step = function (n) { idx = (idx + n + items.length) % items.length; show(); };
    items.forEach(function (b, i) { b.addEventListener('click', function () { open(i); }); });
    $('.v-close', viewer).addEventListener('click', close);
    $('.v-prev', viewer).addEventListener('click', function () { step(-1); });
    $('.v-next', viewer).addEventListener('click', function () { step(1); });
    viewer.addEventListener('click', function (e) { if (e.target === viewer) close(); });
    viewer.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
    });
    viewer.addEventListener('touchstart', function (e) { tx = e.touches[0].clientX; }, { passive: true });
    viewer.addEventListener('touchend', function (e) {
      if (tx === null) return;
      var dx = e.changedTouches[0].clientX - tx; tx = null;
      if (Math.abs(dx) > 45) step(dx < 0 ? 1 : -1);
    });
  }
})();
