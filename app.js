// Cards Lab — iFood Benefícios
// 2 cartões em grid, extrusão 3D sólida (convex hull), drag + resize.

const SVG_NS = 'http://www.w3.org/2000/svg';
const VIEW_W = 1000;
const VIEW_H = 700;

const PALETTE = [
  // claros
  { name: 'Off-white',      hex: '#f7f0e6' },
  { name: 'Cream',          hex: '#fff4ea' },
  { name: 'Rosa Pálido',    hex: '#f8c6dc' },
  { name: 'Verde Pálido',   hex: '#d8f2e5' },
  // médios
  { name: 'Rosa',           hex: '#f291bc' },
  { name: 'Menta',          hex: '#88e0b8' },
  { name: 'Magenta',        hex: '#c00755' },
  { name: 'Verde Mar',      hex: '#4d9f7d' },
  // escuros
  { name: 'Marsala',        hex: '#6e0530' },
  { name: 'Vinho',          hex: '#2d0010' },
  { name: 'Verde Profundo', hex: '#1f4d40' },
  { name: 'Vermelho iFood', hex: '#ea1d2c' },
];

const SIZES = {
  S: { w: 4,  h: 3 },
  M: { w: 7,  h: 4 },
  L: { w: 10, h: 6 },
};

const DEFAULTS = {
  cell: 40,
  radius: 18,
  showGrid: true,
  gridOpacity: 18,
  bgColor: '#f7f0e6',
  A: { size: 'M', w: 7, h: 4, col: 9, row: 3, color: '#6e0530' },
  B: { size: 'S', w: 4, h: 3, col: 3, row: 9, color: '#88e0b8' },
  shadow: { mode: 'auto', color: '#2d0010', darken: 35 },
};

const state = JSON.parse(JSON.stringify(DEFAULTS));

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
  return {
    x: card.col * state.cell,
    y: card.row * state.cell,
    w: card.w   * state.cell,
    h: card.h   * state.cell,
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

const stage       = document.getElementById('stage');
const canvasBg    = document.getElementById('canvas-bg');
const gridBg      = document.getElementById('grid-bg');
const layerS      = document.getElementById('layer-shadow');
const layerA      = document.getElementById('layer-back');
const layerB      = document.getElementById('layer-front');
const layerH      = document.getElementById('layer-handles');
const gridPat     = document.getElementById('grid-pattern');
const metaGrid    = document.getElementById('meta-grid');
const metaCards   = document.getElementById('meta-cards');

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
  // background
  canvasBg.setAttribute('fill', state.bgColor);

  // grid pattern
  gridPat.setAttribute('width',  state.cell);
  gridPat.setAttribute('height', state.cell);
  const gridPath = gridPat.firstElementChild;
  gridPath.setAttribute('d', `M ${state.cell} 0 L 0 0 0 ${state.cell}`);
  gridPath.setAttribute('stroke', `rgba(63, 62, 62, ${state.gridOpacity / 100})`);
  gridBg.setAttribute('fill', state.showGrid ? 'url(#grid-pattern)' : 'transparent');

  // rects
  const rA = cardRect(state.A);
  const rB = cardRect(state.B);

  // extrusion hull
  const hull = convexHull(rectCorners(rA).concat(rectCorners(rB)));
  const hullPts = hull.map(p => `${p.x},${p.y}`).join(' ');

  const shadowColor = state.shadow.mode === 'auto'
    ? darken(state.B.color, state.shadow.darken)
    : state.shadow.color;

  clear(layerS); clear(layerA); clear(layerB); clear(layerH);

  layerS.appendChild(el('polygon', {
    points: hullPts,
    fill: shadowColor,
  }));

  const aAttrs = {
    x: rA.x, y: rA.y, width: rA.w, height: rA.h,
    rx: state.radius, ry: state.radius,
    fill: state.A.color,
    'data-card': 'A',
  };
  if (drag && drag.card === 'A' && drag.moved) aAttrs['class'] = 'is-active-card';
  layerA.appendChild(el('rect', aAttrs));

  const bAttrs = {
    x: rB.x, y: rB.y, width: rB.w, height: rB.h,
    rx: state.radius, ry: state.radius,
    fill: state.B.color,
    'data-card': 'B',
  };
  if (drag && drag.card === 'B' && drag.moved) bAttrs['class'] = 'is-active-card';
  layerB.appendChild(el('rect', bAttrs));

  // resize handles
  for (const [card, r] of [['A', rA], ['B', rB]]) {
    layerH.appendChild(el('circle', {
      cx: r.x + r.w,
      cy: r.y + r.h,
      r: 9,
      fill: '#fff',
      stroke: '#3f3e3e',
      'stroke-width': 2,
      'data-card': card,
      'data-handle': 'resize',
    }));
  }

  // meta
  const cols = Math.floor(VIEW_W / state.cell);
  const rows = Math.floor(VIEW_H / state.cell);
  metaGrid.textContent  = `Grid ${cols}×${rows} · célula ${state.cell}px`;
  metaCards.textContent = `A ${state.A.w}×${state.A.h} · B ${state.B.w}×${state.B.h}`;
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
    s.classList.toggle('active', s.dataset.value.toLowerCase() === String(value).toLowerCase());
  }
}

function syncSegmented(container, value) {
  for (const b of container.querySelectorAll('button')) {
    b.classList.toggle('active', b.dataset.value === value);
  }
}

function readStateProp(target, prop) {
  if (target === 'shadow') return state.shadow[prop];
  if (target === 'bg')     return state.bgColor;
  return state[target][prop];
}

function setProp(target, prop, value) {
  if (target === 'shadow') {
    if (prop === 'mode')  state.shadow.mode  = value;
    if (prop === 'color') state.shadow.color = value;
  } else if (target === 'bg') {
    if (prop === 'color') state.bgColor = value;
  } else {
    if (prop === 'size') {
      const s = SIZES[value];
      if (s) {
        state[target].size = value;
        state[target].w = s.w;
        state[target].h = s.h;
      }
    } else if (prop === 'col' || prop === 'row') {
      state[target][prop] = clampInt(value, 0, 200);
    } else if (prop === 'w' || prop === 'h') {
      state[target][prop] = clampInt(value, 1, 40);
      state[target].size = 'custom';
    } else {
      state[target][prop] = value;
    }
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
  document.querySelectorAll('.segmented').forEach(seg => {
    const t = seg.dataset.target;
    const p = seg.dataset.prop;
    syncSegmented(seg, readStateProp(t, p));
  });

  document.querySelectorAll('.swatches').forEach(sw => {
    const t = sw.dataset.target;
    const p = sw.dataset.prop;
    syncSwatches(sw, readStateProp(t, p));
  });

  document.querySelectorAll('.color-custom').forEach(inp => {
    inp.value = readStateProp(inp.dataset.target, inp.dataset.prop);
  });

  // number inputs (col/row/w/h)
  ['A-col', 'A-row', 'A-w', 'A-h', 'B-col', 'B-row', 'B-w', 'B-h'].forEach(id => {
    const inp = document.getElementById(id);
    if (inp) inp.value = readStateProp(inp.dataset.target, inp.dataset.prop);
  });

  // ranges
  setVal('inp-darken',  'val-darken',  state.shadow.darken,  '%');
  setVal('inp-radius',  'val-radius',  state.radius,         'px');
  setVal('inp-cell',    'val-cell',    state.cell,           'px');
  setVal('inp-grid-op', 'val-grid-op', state.gridOpacity,    '%');

  document.getElementById('inp-grid').checked = state.showGrid;

  // shadow swatches visible only in custom mode
  const shadowGroup    = document.querySelector('.segmented[data-target="shadow"]').closest('.field');
  const shadowSwatches = shadowGroup.querySelector('.swatches');
  const shadowCustom   = shadowGroup.querySelector('.color-custom');
  const showCustom = state.shadow.mode === 'custom';
  shadowSwatches.style.display = showCustom ? '' : 'none';
  shadowCustom.style.display   = showCustom ? '' : 'none';
}

function setVal(inputId, valueId, value, suffix) {
  const inp = document.getElementById(inputId);
  if (inp) inp.value = value;
  const v = document.getElementById(valueId);
  if (v) v.textContent = value + suffix;
}

function bindControls() {
  document.querySelectorAll('.swatches').forEach(c => {
    buildSwatches(c, c.dataset.target, c.dataset.prop);
  });

  document.querySelectorAll('.segmented').forEach(seg => {
    seg.addEventListener('click', e => {
      const btn = e.target.closest('button');
      if (!btn) return;
      setProp(seg.dataset.target, seg.dataset.prop, btn.dataset.value);
    });
  });

  document.querySelectorAll('.color-custom').forEach(inp => {
    inp.addEventListener('input', () => setProp(inp.dataset.target, inp.dataset.prop, inp.value));
  });

  ['A-col', 'A-row', 'A-w', 'A-h', 'B-col', 'B-row', 'B-w', 'B-h'].forEach(id => {
    const inp = document.getElementById(id);
    if (!inp) return;
    inp.addEventListener('input', () => setProp(inp.dataset.target, inp.dataset.prop, inp.value));
  });

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
  document.getElementById('inp-grid-op').addEventListener('input', e => {
    state.gridOpacity = parseInt(e.target.value, 10);
    syncUI(); render();
  });
  document.getElementById('inp-grid').addEventListener('change', e => {
    state.showGrid = e.target.checked;
    render();
  });

  document.getElementById('btn-reset').addEventListener('click', () => {
    Object.assign(state, JSON.parse(JSON.stringify(DEFAULTS)));
    syncUI();
    render();
  });

  document.getElementById('btn-export').addEventListener('click', exportSvg);
}

function exportSvg() {
  const clone = stage.cloneNode(true);
  clone.querySelector('#grid-bg').setAttribute('fill', 'transparent');
  const handles = clone.querySelector('#layer-handles');
  if (handles) handles.remove();
  const xml = new XMLSerializer().serializeToString(clone);
  const blob = new Blob(
    ['<?xml version="1.0" encoding="UTF-8"?>\n', xml],
    { type: 'image/svg+xml' }
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cards-lab-${Date.now()}.svg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ────────────────────────────── drag (move + resize) + tap

let drag = null;
const TAP_THRESHOLD_PX = 6;

function pointerToCell(evt) {
  const pt = stage.createSVGPoint();
  pt.x = evt.clientX;
  pt.y = evt.clientY;
  const ctm = stage.getScreenCTM();
  if (!ctm) return { col: 0, row: 0 };
  const sp = pt.matrixTransform(ctm.inverse());
  return { col: sp.x / state.cell, row: sp.y / state.cell };
}

stage.addEventListener('pointerdown', evt => {
  const ds = evt.target && evt.target.dataset;
  if (!ds || !ds.card) return;
  evt.preventDefault();
  stage.setPointerCapture(evt.pointerId);
  stage.classList.add('is-dragging');
  const start = pointerToCell(evt);
  drag = {
    card: ds.card,
    handle: ds.handle || 'move',
    pointerId: evt.pointerId,
    startX: evt.clientX,
    startY: evt.clientY,
    moved: false,
    offsetCol: start.col - state[ds.card].col,
    offsetRow: start.row - state[ds.card].row,
  };
});

stage.addEventListener('pointermove', evt => {
  if (!drag || evt.pointerId !== drag.pointerId) return;
  const dx = evt.clientX - drag.startX;
  const dy = evt.clientY - drag.startY;
  if (!drag.moved && Math.hypot(dx, dy) > TAP_THRESHOLD_PX) drag.moved = true;
  if (!drag.moved) return;

  const { col, row } = pointerToCell(evt);
  const c = state[drag.card];

  if (drag.handle === 'resize') {
    const newW = Math.max(1, Math.min(40, Math.round(col - c.col)));
    const newH = Math.max(1, Math.min(40, Math.round(row - c.row)));
    if (newW !== c.w || newH !== c.h) {
      c.w = newW;
      c.h = newH;
      c.size = 'custom';
      syncUI();
      render();
    }
  } else {
    const newCol = clampInt(Math.round(col - drag.offsetCol), 0, 200);
    const newRow = clampInt(Math.round(row - drag.offsetRow), 0, 200);
    if (newCol !== c.col || newRow !== c.row) {
      c.col = newCol;
      c.row = newRow;
      syncUI();
      render();
    }
  }
});

function endDrag(evt) {
  if (!drag) return;
  if (evt && evt.pointerId !== drag.pointerId) return;
  try { stage.releasePointerCapture(drag.pointerId); } catch (e) {}
  const wasTap = !drag.moved && drag.handle === 'move';
  const tappedCard = drag.card;
  drag = null;
  stage.classList.remove('is-dragging');
  if (wasTap) selectCard(tappedCard);
  render();
}

stage.addEventListener('pointerup',     endDrag);
stage.addEventListener('pointercancel', endDrag);

function selectCard(card) {
  const group = document.querySelector(`.group[data-card-group="${card}"]`);
  if (!group) return;
  group.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  group.classList.add('is-flashed');
  setTimeout(() => group.classList.remove('is-flashed'), 900);
}

// ────────────────────────────── brand title letter split + boot anim

function splitTitle() {
  const titleEl = document.querySelector('.brand-title');
  if (!titleEl) return;
  const text = titleEl.dataset.text || titleEl.textContent;
  titleEl.textContent = '';
  const chars = [...text];
  chars.forEach((c, i) => {
    const s = document.createElement('span');
    s.className = 'ch' + (c === ' ' ? ' space' : '');
    s.style.setProperty('--i', i);
    s.textContent = c === ' ' ? '' : c;
    s.setAttribute('aria-hidden', 'true');
    titleEl.appendChild(s);
  });
  titleEl.setAttribute('aria-label', text);
}

function boot() {
  document.body.classList.add('is-booting');
  setTimeout(() => document.body.classList.remove('is-booting'), 1500);
}

// ────────────────────────────── go

bindControls();
splitTitle();
syncUI();
render();
boot();
