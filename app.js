// iFood Benefícios — Cards Lab
// 2 cartões em grid, com extrusão 3D sólida (convex hull) entre eles.

const SVG_NS = 'http://www.w3.org/2000/svg';
const VIEW_W = 1000;
const VIEW_H = 700;

const PALETTE = [
  { name: 'Vermelho', hex: '#ea1d2c' },
  { name: 'Laranja',  hex: '#ff8e0d' },
  { name: 'Amarelo',  hex: '#ffc247' },
  { name: 'Verde',    hex: '#50a773' },
  { name: 'Teal',     hex: '#0da192' },
  { name: 'Carbono',  hex: '#3f3e3e' },
  { name: 'Cream',    hex: '#fff4ea' },
  { name: 'Branco',   hex: '#ffffff' },
];

// tamanho em células (w × h). Proporção tipo cartão.
const SIZES = {
  S: { w: 4,  h: 3 },
  M: { w: 7,  h: 4 },
  L: { w: 10, h: 6 },
};

const state = {
  cell: 40,
  radius: 18,
  showGrid: true,
  A: { size: 'M', col: 9,  row: 3, color: '#ffc247' },
  B: { size: 'S', col: 3,  row: 9, color: '#ea1d2c' },
  shadow: { mode: 'auto', color: '#b21220', darken: 35 },
};

// ────────────────────────────── color helpers

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const v = h.length === 3
    ? h.split('').map(c => c + c).join('')
    : h;
  const n = parseInt(v, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex({ r, g, b }) {
  const to = v => v.toString(16).padStart(2, '0');
  return '#' + to(r) + to(g) + to(b);
}

function darken(hex, percent) {
  const { r, g, b } = hexToRgb(hex);
  const f = 1 - percent / 100;
  return rgbToHex({
    r: Math.round(r * f),
    g: Math.round(g * f),
    b: Math.round(b * f),
  });
}

// ────────────────────────────── geometry

function cardRect(card) {
  const s = SIZES[card.size];
  return {
    x: card.col * state.cell,
    y: card.row * state.cell,
    w: s.w * state.cell,
    h: s.h * state.cell,
  };
}

function rectCorners(r) {
  return [
    { x: r.x,         y: r.y },
    { x: r.x + r.w,   y: r.y },
    { x: r.x + r.w,   y: r.y + r.h },
    { x: r.x,         y: r.y + r.h },
  ];
}

// Andrew's monotone chain convex hull.
function convexHull(points) {
  const pts = points.slice().sort((a, b) => a.x - b.x || a.y - b.y);
  if (pts.length <= 1) return pts;

  const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

  const lower = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }
  const upper = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

// ────────────────────────────── DOM refs

const stage   = document.getElementById('stage');
const gridBg  = document.getElementById('grid-bg');
const layerS  = document.getElementById('layer-shadow');
const layerA  = document.getElementById('layer-back');
const layerB  = document.getElementById('layer-front');
const gridPat = document.getElementById('grid-pattern');
const metaGrid  = document.getElementById('meta-grid');
const metaCards = document.getElementById('meta-cards');

// ────────────────────────────── render

function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

function el(tag, attrs) {
  const n = document.createElementNS(SVG_NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  return n;
}

function render() {
  // grid
  gridPat.setAttribute('width',  state.cell);
  gridPat.setAttribute('height', state.cell);
  gridPat.firstElementChild.setAttribute(
    'd',
    `M ${state.cell} 0 L 0 0 0 ${state.cell}`
  );
  gridBg.setAttribute('fill', state.showGrid ? 'url(#grid-pattern)' : 'transparent');

  // rects
  const rA = cardRect(state.A);
  const rB = cardRect(state.B);

  // extrusion = convex hull of all 8 corners
  const hull = convexHull(rectCorners(rA).concat(rectCorners(rB)));
  const hullPts = hull.map(p => `${p.x},${p.y}`).join(' ');

  const shadowColor = state.shadow.mode === 'auto'
    ? darken(state.B.color, state.shadow.darken)
    : state.shadow.color;

  clear(layerS); clear(layerA); clear(layerB);

  layerS.appendChild(el('polygon', {
    points: hullPts,
    fill: shadowColor,
  }));

  layerA.appendChild(el('rect', {
    x: rA.x, y: rA.y, width: rA.w, height: rA.h,
    rx: state.radius, ry: state.radius,
    fill: state.A.color,
  }));

  layerB.appendChild(el('rect', {
    x: rB.x, y: rB.y, width: rB.w, height: rB.h,
    rx: state.radius, ry: state.radius,
    fill: state.B.color,
  }));

  // meta
  const cols = Math.floor(VIEW_W / state.cell);
  const rows = Math.floor(VIEW_H / state.cell);
  metaGrid.textContent  = `Grid ${cols}×${rows} · célula ${state.cell}px`;
  metaCards.textContent = `A ${SIZES[state.A.size].w}×${SIZES[state.A.size].h} · B ${SIZES[state.B.size].w}×${SIZES[state.B.size].h}`;
}

// ────────────────────────────── controls

function buildSwatches(container, target, prop) {
  for (const c of PALETTE) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'swatch';
    btn.style.background = c.hex;
    btn.title = c.name;
    btn.dataset.value = c.hex;
    btn.addEventListener('click', () => setProp(target, prop, c.hex));
    container.appendChild(btn);
  }
}

function syncSwatches(container, value) {
  for (const s of container.querySelectorAll('.swatch')) {
    s.classList.toggle('active', s.dataset.value.toLowerCase() === value.toLowerCase());
  }
}

function syncSegmented(container, value) {
  for (const b of container.querySelectorAll('button')) {
    b.classList.toggle('active', b.dataset.value === value);
  }
}

function setProp(target, prop, value) {
  if (target === 'shadow') {
    if (prop === 'mode')  state.shadow.mode  = value;
    if (prop === 'color') state.shadow.color = value;
  } else {
    if (prop === 'col' || prop === 'row') value = clampInt(value, 0, 200);
    state[target][prop] = value;
  }
  syncUI();
  render();
}

function clampInt(v, lo, hi) {
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}

function syncUI() {
  // segmented (size & shadow mode)
  document.querySelectorAll('.segmented').forEach(seg => {
    const t = seg.dataset.target;
    const p = seg.dataset.prop;
    const v = t === 'shadow' ? state.shadow[p] : state[t][p];
    syncSegmented(seg, v);
  });

  // swatches
  document.querySelectorAll('.swatches').forEach(sw => {
    const t = sw.dataset.target;
    const p = sw.dataset.prop;
    const v = t === 'shadow' ? state.shadow[p] : state[t][p];
    syncSwatches(sw, v);
  });

  // color custom inputs
  document.querySelectorAll('.color-custom').forEach(inp => {
    const t = inp.dataset.target;
    const p = inp.dataset.prop;
    const v = t === 'shadow' ? state.shadow[p] : state[t][p];
    inp.value = v;
  });

  // number inputs
  document.getElementById('A-col').value = state.A.col;
  document.getElementById('A-row').value = state.A.row;
  document.getElementById('B-col').value = state.B.col;
  document.getElementById('B-row').value = state.B.row;

  // ranges
  document.getElementById('inp-darken').value = state.shadow.darken;
  document.getElementById('val-darken').textContent = state.shadow.darken + '%';
  document.getElementById('inp-radius').value = state.radius;
  document.getElementById('val-radius').textContent = state.radius + 'px';
  document.getElementById('inp-cell').value = state.cell;
  document.getElementById('val-cell').textContent = state.cell + 'px';

  // checkbox
  document.getElementById('inp-grid').checked = state.showGrid;

  // hide custom shadow swatches when in auto mode
  const shadowGroup = document.querySelector('.segmented[data-target="shadow"]').closest('.field');
  const shadowSwatches = shadowGroup.querySelector('.swatches');
  const shadowCustom = shadowGroup.querySelector('.color-custom');
  const showCustom = state.shadow.mode === 'custom';
  shadowSwatches.style.display = showCustom ? '' : 'none';
  shadowCustom.style.display = showCustom ? '' : 'none';
}

function bindControls() {
  // build palette swatches
  document.querySelectorAll('.swatches').forEach(c => {
    buildSwatches(c, c.dataset.target, c.dataset.prop);
  });

  // segmented buttons
  document.querySelectorAll('.segmented').forEach(seg => {
    seg.addEventListener('click', e => {
      const btn = e.target.closest('button');
      if (!btn) return;
      setProp(seg.dataset.target, seg.dataset.prop, btn.dataset.value);
    });
  });

  // color custom
  document.querySelectorAll('.color-custom').forEach(inp => {
    inp.addEventListener('input', () => setProp(inp.dataset.target, inp.dataset.prop, inp.value));
  });

  // number inputs (col/row)
  ['A-col', 'A-row', 'B-col', 'B-row'].forEach(id => {
    const inp = document.getElementById(id);
    inp.addEventListener('input', () => setProp(inp.dataset.target, inp.dataset.prop, inp.value));
  });

  // ranges
  document.getElementById('inp-darken').addEventListener('input', e => {
    state.shadow.darken = parseInt(e.target.value, 10);
    syncUI(); render();
  });
  document.getElementById('inp-radius').addEventListener('input', e => {
    state.radius = parseInt(e.target.value, 10);
    syncUI(); render();
  });
  document.getElementById('inp-cell').addEventListener('input', e => {
    state.cell = parseInt(e.target.value, 10);
    syncUI(); render();
  });

  // checkbox
  document.getElementById('inp-grid').addEventListener('change', e => {
    state.showGrid = e.target.checked;
    render();
  });

  // reset
  document.getElementById('btn-reset').addEventListener('click', () => {
    Object.assign(state, {
      cell: 40, radius: 18, showGrid: true,
      A: { size: 'M', col: 9,  row: 3, color: '#ffc247' },
      B: { size: 'S', col: 3,  row: 9, color: '#ea1d2c' },
      shadow: { mode: 'auto', color: '#b21220', darken: 35 },
    });
    syncUI();
    render();
  });

  // export svg
  document.getElementById('btn-export').addEventListener('click', exportSvg);
}

function exportSvg() {
  // serialize without grid pattern noise — clone, hide grid
  const clone = stage.cloneNode(true);
  clone.querySelector('#grid-bg').setAttribute('fill', 'transparent');
  const xml = new XMLSerializer().serializeToString(clone);
  const blob = new Blob(
    ['<?xml version="1.0" encoding="UTF-8"?>\n', xml],
    { type: 'image/svg+xml' }
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ifood-beneficios-cards-${Date.now()}.svg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ────────────────────────────── boot

bindControls();
syncUI();
render();
