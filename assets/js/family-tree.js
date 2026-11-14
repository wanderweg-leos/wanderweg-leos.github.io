/* ─────────────────────────────────────────────────────────────
   Family tree on the Our Leos pages (_layouts/leo.html).
   Reads assets/data/family-tree.md (format explained at the top of
   that file), builds one row of cards per generation and draws a
   line from each mother to her daughters. Not clickable.
   The container passes its settings as attributes:
     data-src     address of family-tree.md
     data-photos  folder the photo file names live in
   Plain ES5, no dependencies.
   ───────────────────────────────────────────────────────────── */
(function () {
  var box = document.getElementById('family-tree');
  if (!box || !window.fetch) return;
  var photos = box.getAttribute('data-photos') || '';
  var svgNS = 'http://www.w3.org/2000/svg';
  var byName = {};

  function parse(md) {
    md = md.replace(/<!--[\s\S]*?-->/g, '');
    var gens = [], gen = null, dog = null;
    md.split('\n').forEach(function (line) {
      var m;
      if ((m = line.match(/^##\s+(?!#)(.*)$/))) { gen = []; gens.push(gen); dog = null; }
      else if ((m = line.match(/^###\s+(.*)$/)) && gen) { dog = { name: m[1].trim() }; gen.push(dog); }
      else if ((m = line.match(/^\s*-\s*([^:]+):\s*(.*)$/)) && dog) { dog[m[1].trim().toLowerCase()] = m[2].trim(); }
    });
    return gens;
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  function build(gens) {
    var svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('aria-hidden', 'true');
    box.appendChild(svg);
    gens.forEach(function (gen) { gen.forEach(function (d) { byName[d.name] = d; }); });
    gens.forEach(function (gen) {
      var row = el('ul', 'ft-row');
      gen.forEach(function (d) {
        var li = el('li', 'ft-dog');
        li.setAttribute('data-name', d.name);
        var frame = el('span', 'frame');
        if (d.photo) {
          var img = el('img');
          img.src = photos + d.photo;
          img.alt = d.name;
          img.loading = 'lazy';
          if (d['photo focus']) img.style.objectPosition = d['photo focus'];
          img.addEventListener('load', draw);
          frame.appendChild(img);
        }
        li.appendChild(frame);
        li.appendChild(el('span', 'ft-name', d.name));
        if (d.registered) li.appendChild(el('span', 'ft-reg', d.registered));
        row.appendChild(li);
      });
      box.appendChild(row);
    });
    draw();
  }

  function find(name) {
    var cards = box.querySelectorAll('.ft-dog');
    for (var i = 0; i < cards.length; i++) if (cards[i].getAttribute('data-name') === name) return cards[i];
    return null;
  }

  function draw() {
    var svg = box.querySelector('svg');
    if (!svg) return;
    var r = box.getBoundingClientRect(), d = '';
    Object.keys(byName).forEach(function (name) {
      var mother = byName[byName[name].dam];
      if (!mother) return;
      var a = find(mother.name).getBoundingClientRect(), b = find(name).getBoundingClientRect();
      var x1 = a.left - r.left + a.width / 2, y1 = a.bottom - r.top;
      var x2 = b.left - r.left + b.width / 2, y2 = b.top - r.top, my = (y1 + y2) / 2;
      d += 'M' + x1 + ' ' + y1 + 'C' + x1 + ' ' + my + ' ' + x2 + ' ' + my + ' ' + x2 + ' ' + y2;
    });
    svg.innerHTML = '<path d="' + d + '"/>';
  }

  window.addEventListener('resize', draw);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);

  fetch(box.getAttribute('data-src'))
    .then(function (res) { if (!res.ok) throw new Error(res.status); return res.text(); })
    .then(function (md) { build(parse(md)); })
    .catch(function () { box.parentNode.removeChild(box); });
})();
