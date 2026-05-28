// Cards Lab — iFood Benefícios
// Cards + texts + images on a grid; drag, resize, outline; export SVG/PNG; shareable URL.

const SVG_NS = 'http://www.w3.org/2000/svg';
const XLINK  = 'http://www.w3.org/1999/xlink';

const ASPECTS = {
  '16:9': { w: 1280, h: 720  },
  '9:16': { w: 720,  h: 1280 },
  '4:5':  { w: 800,  h: 1000 },
  '1:1':  { w: 1000, h: 1000 },
};

// Disposição: cada COLUNA é uma família (Wine | Rosa | Mint | Teal),
// cada LINHA vai do tom mais claro pro mais escuro. Última linha é neutros.
const PALETTE = [
  // L1 — lights
  { name: 'Wine',           hex: '#a21449' },
  { name: 'Rosa Pálido',    hex: '#f4bfd8' },
  { name: 'Mint Pálido',    hex: '#cff0dd' },
  { name: 'Teal',           hex: '#4a8b76' },
  // L2
  { name: 'Marsala',        hex: '#6e0530' },
  { name: 'Rosa',           hex: '#efa1c5' },
  { name: 'Mint Claro',     hex: '#b5ebc8' },
  { name: 'Teal Médio',     hex: '#2d6655' },
  // L3
  { name: 'Wine Deep',      hex: '#3d0218' },
  { name: 'Rosa Vivo',      hex: '#ea5fa1' },
  { name: 'Menta',          hex: '#88e0b8' },
  { name: 'Teal Deep',      hex: '#1b413d' },
  // L4 — darkest
  { name: 'Vinho',          hex: '#1f000b' },
  { name: 'Magenta',        hex: '#d81e7b' },
  { name: 'Mint Médio',     hex: '#5dbe96' },
  { name: 'Teal Escuro',    hex: '#0e2a28' },
  // L5 — neutros
  { name: 'Off-white',      hex: '#f7f0e6' },
  { name: 'Branco',         hex: '#ffffff' },
  { name: 'Carbono',        hex: '#3f3e3e' },
  { name: 'Vermelho iFood', hex: '#ea1d2c' },
];

const SIZES = {
  S: { w: 4,  h: 3 },
  M: { w: 7,  h: 4 },
  L: { w: 10, h: 6 },
};

const DEFAULTS = {
  aspect: '16:9',
  cell: 40,
  radius: 18,
  showGrid: true,
  gridOpacity: 18,
  bgColor: '#f7f0e6',
  outline: { on: false, color: '#1f000b', width: 2 },
  A: { size: 'M', w: 7, h: 4, col: 4,  row: 4,  color: '#6e0530' },
  B: { size: 'S', w: 4, h: 3, col: 10, row: 10, color: '#88e0b8' },
  shadow: { mode: 'auto', color: '#1f000b', darken: 35 },
  texts: [],
  images: [], // session-only; not serialized to URL
};

const state = JSON.parse(JSON.stringify(DEFAULTS));

function getView() { return ASPECTS[state.aspect] || ASPECTS['16:9']; }

// ────────────────────────────── color helpers

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const v = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
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
  return rgbToHex({ r: Math.round(r * f), g: Math.round(g * f), b: Math.round(b * f) });
}

function luminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function gridStroke(bgHex, opacityPct) {
  const lum = luminance(bgHex);
  const base = lum > 0.55 ? '63, 62, 62' : '255, 255, 255';
  return `rgba(${base}, ${opacityPct / 100})`;
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

function sampleRoundedRect(rect, radius) {
  const { x, y, w, h } = rect;
  const r = Math.max(0, Math.min(radius, Math.min(w, h) / 2));
  if (r <= 0) {
    return [
      { x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h },
    ];
  }
  const SEG = 6;
  const arcs = [
    { cx: x + w - r, cy: y + r,     a0: -Math.PI / 2 },
    { cx: x + w - r, cy: y + h - r, a0:  0 },
    { cx: x + r,     cy: y + h - r, a0:  Math.PI / 2 },
    { cx: x + r,     cy: y + r,     a0:  Math.PI },
  ];
  const pts = [];
  for (const arc of arcs) {
    for (let i = 0; i <= SEG; i++) {
      const a = arc.a0 + (i / SEG) * (Math.PI / 2);
      pts.push({ x: arc.cx + r * Math.cos(a), y: arc.cy + r * Math.sin(a) });
    }
  }
  return pts;
}

function convexHull(points) {
  const pts = points.slice().sort((a, b) => a.x - b.x || a.y - b.y);
  if (pts.length <= 1) return pts;
  const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  lower.pop(); upper.pop();
  return lower.concat(upper);
}

// ────────────────────────────── DOM refs

const stage     = document.getElementById('stage');
const frame     = document.getElementById('frame');
const canvasBg  = document.getElementById('canvas-bg');
const gridBg    = document.getElementById('grid-bg');
const layerS    = document.getElementById('layer-shadow');
const layerEB   = document.getElementById('layer-extra-back');
const layerA    = document.getElementById('layer-back');
const layerEM   = document.getElementById('layer-extra-mid');
const layerB    = document.getElementById('layer-front');
const layerEF   = document.getElementById('layer-extra-front');
const layerH    = document.getElementById('layer-handles');
const extraLayer = z => z === 'back' ? layerEB : (z === 'mid' ? layerEM : layerEF);
const gridPat   = document.getElementById('grid-pattern');
const metaGrid  = document.getElementById('meta-grid');
const metaCards = document.getElementById('meta-cards');

// ────────────────────────────── render

function el(tag, attrs) {
  const n = document.createElementNS(SVG_NS, tag);
  for (const k in attrs) {
    if (attrs[k] != null) n.setAttribute(k, attrs[k]);
  }
  return n;
}
function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

function applyAspect() {
  const v = getView();
  stage.setAttribute('viewBox', `0 0 ${v.w} ${v.h}`);
  canvasBg.setAttribute('width',  v.w);
  canvasBg.setAttribute('height', v.h);
  gridBg.setAttribute('width',  v.w);
  gridBg.setAttribute('height', v.h);
  fitFrame();
}

function fitFrame() {
  const area = document.querySelector('.canvas-area');
  if (!area || !frame) return;
  const v = getView();
  const aspect = v.w / v.h;
  const aw = area.clientWidth;
  const ah = area.clientHeight;
  if (aw <= 0 || ah <= 0) return;
  let w, h;
  if (aw / ah > aspect) {
    h = ah;
    w = h * aspect;
  } else {
    w = aw;
    h = w / aspect;
  }
  frame.style.width  = Math.floor(w) + 'px';
  frame.style.height = Math.floor(h) + 'px';
}

window.addEventListener('resize', fitFrame);
window.addEventListener('load', fitFrame);
if (typeof ResizeObserver !== 'undefined') {
  const ro = new ResizeObserver(fitFrame);
  ro.observe(document.querySelector('.canvas-area'));
}
// extra safety: re-fit after the first paint cycles
requestAnimationFrame(() => requestAnimationFrame(fitFrame));
setTimeout(fitFrame, 100);
setTimeout(fitFrame, 400);

function render() {
  const v = getView();

  // background
  canvasBg.setAttribute('fill', state.bgColor);

  // grid: cell radius proportional to card radius
  const cell = state.cell;
  const pad = Math.max(2, Math.round(cell * 0.08));
  const inner = cell - pad * 2;
  const cellR = Math.max(0, Math.min(Math.round(state.radius * 0.28), inner / 2));
  gridPat.setAttribute('width',  cell);
  gridPat.setAttribute('height', cell);
  const gridRect = gridPat.firstElementChild;
  gridRect.setAttribute('x', pad);
  gridRect.setAttribute('y', pad);
  gridRect.setAttribute('width',  inner);
  gridRect.setAttribute('height', inner);
  gridRect.setAttribute('rx', cellR);
  gridRect.setAttribute('ry', cellR);
  gridRect.setAttribute('stroke', gridStroke(state.bgColor, state.gridOpacity));
  gridBg.setAttribute('fill', state.showGrid ? 'url(#grid-pattern)' : 'transparent');

  // cards
  const rA = cardRect(state.A);
  const rB = cardRect(state.B);

  // extrusion: include images marked inHull
  let hullPts = sampleRoundedRect(rA, state.radius)
    .concat(sampleRoundedRect(rB, state.radius));
  for (const im of state.images) {
    if (!im.inHull) continue;
    hullPts = hullPts.concat(sampleRoundedRect({
      x: im.col * cell, y: im.row * cell, w: im.w * cell, h: im.h * cell,
    }, state.radius));
  }
  const hull = convexHull(hullPts);
  const hullStr = hull.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');

  const shadowColor = state.shadow.mode === 'auto'
    ? darken(state.B.color, state.shadow.darken)
    : state.shadow.color;

  clear(layerS); clear(layerEB); clear(layerA); clear(layerEM); clear(layerB); clear(layerEF); clear(layerH);

  // outline attrs
  const outlineOn = !!state.outline.on;
  const outlineColor = state.outline.color;
  const outlineWidth = state.outline.width;

  layerS.appendChild(el('polygon', {
    points: hullStr,
    fill: shadowColor,
    stroke: outlineOn ? outlineColor : null,
    'stroke-width': outlineOn ? outlineWidth : null,
    'stroke-linejoin': outlineOn ? 'round' : null,
  }));

  // card A
  const aAttrs = {
    x: rA.x, y: rA.y, width: rA.w, height: rA.h,
    rx: state.radius, ry: state.radius,
    fill: state.A.color,
    'data-card': 'A',
    stroke: outlineOn ? outlineColor : null,
    'stroke-width': outlineOn ? outlineWidth : null,
  };
  if (drag && drag.kind === 'card' && drag.id === 'A' && drag.moved) aAttrs['class'] = 'is-active';
  layerA.appendChild(el('rect', aAttrs));

  // card B
  const bAttrs = {
    x: rB.x, y: rB.y, width: rB.w, height: rB.h,
    rx: state.radius, ry: state.radius,
    fill: state.B.color,
    'data-card': 'B',
    stroke: outlineOn ? outlineColor : null,
    'stroke-width': outlineOn ? outlineWidth : null,
  };
  if (drag && drag.kind === 'card' && drag.id === 'B' && drag.moved) bAttrs['class'] = 'is-active';
  layerB.appendChild(el('rect', bAttrs));

  // images — by layer
  for (const im of state.images) {
    const ix = im.col * cell;
    const iy = im.row * cell;
    const iw = im.w * cell;
    const ih = im.h * cell;
    const g = el('g', { 'data-image-id': im.id });
    const img = el('image', {
      x: ix, y: iy, width: iw, height: ih,
      href: im.dataUrl,
      preserveAspectRatio: 'xMidYMid meet',
      'data-image-id': im.id,
    });
    img.setAttributeNS(XLINK, 'href', im.dataUrl);
    if (drag && drag.kind === 'image' && drag.id === im.id && drag.moved) {
      img.setAttribute('class', 'is-active');
    }
    g.appendChild(img);
    if (outlineOn) {
      g.appendChild(el('rect', {
        x: ix, y: iy, width: iw, height: ih,
        rx: state.radius, ry: state.radius,
        fill: 'none',
        stroke: outlineColor,
        'stroke-width': outlineWidth,
        'pointer-events': 'none',
      }));
    }
    extraLayer(im.layer || 'front').appendChild(g);
  }

  // texts — by layer, multi-line via tspans, family + weight
  for (const t of state.texts) {
    const tx = t.col * cell;
    const ty = t.row * cell;
    const fam = TEXT_FAMILIES[t.family] ? TEXT_FAMILIES[t.family].family : TEXT_FAMILIES.titulos.family;
    const tEl = el('text', {
      x: tx, y: ty,
      'dominant-baseline': 'hanging',
      'font-family': fam,
      'font-weight': t.weight || 700,
      'font-size': t.fontSize,
      fill: t.color,
      'data-text-id': t.id,
    });
    if (drag && drag.kind === 'text' && drag.id === t.id && drag.moved) {
      tEl.setAttribute('class', 'is-active');
    }
    const lines = (t.content || '').split('\n');
    lines.forEach((ln, i) => {
      const ts = el('tspan', { x: tx, dy: i === 0 ? '0' : '1.15em' });
      ts.textContent = ln || ' ';
      tEl.appendChild(ts);
    });
    extraLayer(t.layer || 'front').appendChild(tEl);
  }

  // resize handles (cards + images)
  for (const [id, r] of [['A', rA], ['B', rB]]) {
    layerH.appendChild(el('circle', {
      cx: r.x + r.w, cy: r.y + r.h, r: 9,
      fill: '#fff', stroke: '#3f3e3e', 'stroke-width': 2,
      'data-card': id, 'data-handle': 'resize',
    }));
  }
  for (const im of state.images) {
    const ix = im.col * cell;
    const iy = im.row * cell;
    const iw = im.w * cell;
    const ih = im.h * cell;
    layerH.appendChild(el('circle', {
      cx: ix + iw, cy: iy + ih, r: 9,
      fill: '#fff', stroke: '#3f3e3e', 'stroke-width': 2,
      'data-image-id': im.id, 'data-handle': 'resize',
    }));
  }

  // meta
  const cols = Math.floor(v.w / cell);
  const rows = Math.floor(v.h / cell);
  metaGrid.textContent  = `Grid ${cols}×${rows} · célula ${cell}px`;
  metaCards.textContent = `A ${state.A.w}×${state.A.h} · B ${state.B.w}×${state.B.h}`
    + (state.texts.length ? ` · ${state.texts.length} texto${state.texts.length>1?'s':''}` : '')
    + (state.images.length ? ` · ${state.images.length} img` : '');

  pushHash();
}

// ────────────────────────────── controls (static)

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
  if (target === 'shadow')  return state.shadow[prop];
  if (target === 'bg')      return state.bgColor;
  if (target === 'outline') return state.outline[prop];
  if (target === 'aspect')  return state.aspect;
  return state[target] ? state[target][prop] : undefined;
}

function setProp(target, prop, value) {
  if (target === 'shadow') {
    if (prop === 'mode')  state.shadow.mode = value;
    if (prop === 'color') state.shadow.color = value;
  } else if (target === 'bg') {
    if (prop === 'color') state.bgColor = value;
  } else if (target === 'outline') {
    if (prop === 'color') state.outline.color = value;
  } else if (target === 'aspect') {
    state.aspect = value;
    applyAspect();
  } else if (target === 'A' || target === 'B') {
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
      state[target][prop] = clampInt(value, 1, 60);
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

function setVal(inputId, valueId, value, suffix) {
  const inp = document.getElementById(inputId);
  if (inp) inp.value = value;
  const v = document.getElementById(valueId);
  if (v) v.textContent = value + suffix;
}

function syncUI() {
  document.querySelectorAll('.segmented').forEach(seg => {
    syncSegmented(seg, readStateProp(seg.dataset.target, seg.dataset.prop));
  });

  document.querySelectorAll('.panel-scroll .swatches[data-target]').forEach(sw => {
    syncSwatches(sw, readStateProp(sw.dataset.target, sw.dataset.prop));
  });

  ['A-col','A-row','A-w','A-h','B-col','B-row','B-w','B-h'].forEach(id => {
    const inp = document.getElementById(id);
    if (inp) inp.value = readStateProp(inp.dataset.target, inp.dataset.prop);
  });

  setVal('inp-darken',     'val-darken',     state.shadow.darken,    '%');
  setVal('inp-radius',     'val-radius',     state.radius,           'px');
  setVal('inp-cell',       'val-cell',       state.cell,             'px');
  setVal('inp-grid-op',    'val-grid-op',    state.gridOpacity,      '%');
  setVal('inp-outline-w',  'val-outline-w',  state.outline.width,    'px');

  document.getElementById('inp-grid').checked    = state.showGrid;
  document.getElementById('inp-outline').checked = state.outline.on;

  // shadow swatches visible only in custom mode
  const shadowGroup = document.querySelector('.segmented[data-target="shadow"]').closest('.field');
  const shadowSwatches = shadowGroup.querySelector('.swatches');
  shadowSwatches.style.display = state.shadow.mode === 'custom' ? '' : 'none';
}

function bindControls() {
  document.querySelectorAll('.panel-scroll .swatches[data-target]').forEach(c => {
    buildSwatches(c, c.dataset.target, c.dataset.prop);
  });

  document.querySelectorAll('.segmented').forEach(seg => {
    seg.addEventListener('click', e => {
      const btn = e.target.closest('button');
      if (!btn) return;
      setProp(seg.dataset.target, seg.dataset.prop, btn.dataset.value);
    });
  });

  ['A-col','A-row','A-w','A-h','B-col','B-row','B-w','B-h'].forEach(id => {
    const inp = document.getElementById(id);
    if (!inp) return;
    inp.addEventListener('input', () => setProp(inp.dataset.target, inp.dataset.prop, inp.value));
  });

  const slide = (id, fn) => document.getElementById(id).addEventListener('input', e => {
    fn(parseInt(e.target.value, 10)); syncUI(); render();
  });
  slide('inp-darken',    v => state.shadow.darken    = v);
  slide('inp-radius',    v => state.radius           = v);
  slide('inp-cell',      v => state.cell             = v);
  slide('inp-grid-op',   v => state.gridOpacity      = v);
  slide('inp-outline-w', v => state.outline.width    = v);

  document.getElementById('inp-grid').addEventListener('change', e => {
    state.showGrid = e.target.checked; render();
  });
  document.getElementById('inp-outline').addEventListener('change', e => {
    state.outline.on = e.target.checked; render();
  });

  document.getElementById('btn-reset').addEventListener('click', () => {
    Object.assign(state, JSON.parse(JSON.stringify(DEFAULTS)));
    applyAspect();
    syncUI(); rebuildTextList(); rebuildImageList(); render();
  });

  document.getElementById('btn-export-svg').addEventListener('click', exportSvg);
  document.getElementById('btn-export-png').addEventListener('click', exportPng);
  document.getElementById('btn-share').addEventListener('click', copyShareLink);

  document.getElementById('btn-add-text').addEventListener('click', addText);
  document.getElementById('btn-add-image').addEventListener('click', () => {
    document.getElementById('inp-image').click();
  });
  document.getElementById('inp-image').addEventListener('change', e => {
    const file = e.target.files && e.target.files[0];
    if (file) loadImageFile(file);
    e.target.value = '';
  });
}

// ────────────────────────────── texts

const TEXT_FAMILIES = {
  titulos: { label: 'Títulos', family: 'iFood Titulos, sans-serif', weights: [
    { v: 400, label: 'Regular' },
    { v: 700, label: 'Bold' },
    { v: 800, label: 'Extra' },
  ]},
  textos:  { label: 'Textos',  family: 'iFood Textos, sans-serif',  weights: [
    { v: 400, label: 'Regular' },
    { v: 500, label: 'Medium' },
    { v: 700, label: 'Bold' },
  ]},
};

function defaultWeightFor(family) {
  return family === 'textos' ? 500 : 700;
}

function addText() {
  const v = getView();
  const id = 't' + Date.now().toString(36);
  state.texts.push({
    id,
    content: 'iFood\nBenefícios',
    col: Math.max(0, Math.floor(v.w / state.cell / 2) - 4),
    row: Math.max(0, Math.floor(v.h / state.cell / 2) - 2),
    fontSize: 56,
    color: '#1f000b',
    family: 'titulos',
    weight: 800,
  });
  rebuildTextList();
  render();
}

function deleteText(id) {
  state.texts = state.texts.filter(t => t.id !== id);
  rebuildTextList();
  render();
}

// shared helpers for dynamic UI items
function makeSeg(values, current, onPick) {
  const seg = document.createElement('div');
  seg.className = 'segmented';
  if (values.length === 4) seg.classList.add('seg-4');
  if (values.length === 2) seg.style.gridTemplateColumns = 'repeat(2, 1fr)';
  values.forEach(opt => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.value = String(opt.value);
    b.textContent = opt.label;
    if (String(opt.value) === String(current)) b.classList.add('active');
    b.addEventListener('click', () => {
      seg.querySelectorAll('button').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      onPick(opt.value);
    });
    seg.appendChild(b);
  });
  return seg;
}

function makeSwatchRow(currentHex, onPick) {
  const row = document.createElement('div');
  row.className = 'swatches';
  PALETTE.forEach(c => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'swatch';
    b.style.background = c.hex; b.dataset.value = c.hex; b.title = c.name;
    if (c.hex.toLowerCase() === String(currentHex).toLowerCase()) b.classList.add('active');
    b.addEventListener('click', () => {
      row.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
      b.classList.add('active');
      onPick(c.hex);
    });
    row.appendChild(b);
  });
  return row;
}

function makeRange(label, value, min, max, suffix, onInput) {
  const field = document.createElement('div');
  field.className = 'field';
  const lab = document.createElement('label');
  lab.className = 'field-label';
  lab.innerHTML = `<span>${label}</span><span class="value">${value}${suffix}</span>`;
  const r = document.createElement('input');
  r.type = 'range'; r.min = min; r.max = max; r.step = 1; r.value = value;
  r.addEventListener('input', () => {
    const v = parseInt(r.value, 10);
    lab.querySelector('.value').textContent = v + suffix;
    onInput(v);
  });
  field.appendChild(lab); field.appendChild(r);
  return field;
}

function makeField(label, control) {
  const f = document.createElement('div');
  f.className = 'field';
  const lab = document.createElement('label');
  lab.className = 'field-label';
  lab.textContent = label;
  f.appendChild(lab); f.appendChild(control);
  return f;
}

function makeSubHeader(title, onDelete) {
  const head = document.createElement('div');
  head.className = 'sub-header';
  const t = document.createElement('span');
  t.className = 'sub-title'; t.textContent = title;
  const del = document.createElement('button');
  del.className = 'btn-icon'; del.type = 'button';
  del.textContent = '×';
  del.addEventListener('click', onDelete);
  head.appendChild(t); head.appendChild(del);
  return head;
}

function rebuildTextList() {
  const list = document.getElementById('list-texts');
  list.innerHTML = '';
  state.texts.forEach((t, i) => {
    if (!t.family) t.family = 'titulos';
    if (!t.weight) t.weight = defaultWeightFor(t.family);
    if (!t.layer)  t.layer  = 'front';

    const item = document.createElement('div');
    item.className = 'sub-item';
    item.dataset.id = t.id;

    item.appendChild(makeSubHeader(`Texto ${i + 1}`, () => deleteText(t.id)));

    // textarea (multi-line)
    const ta = document.createElement('textarea');
    ta.className = 'text-input text-area';
    ta.rows = 2;
    ta.placeholder = 'Texto · Enter pra quebrar linha';
    ta.value = t.content;
    ta.addEventListener('input', () => {
      t.content = ta.value;
      autoGrow(ta);
      render();
    });
    requestAnimationFrame(() => autoGrow(ta));
    item.appendChild(ta);

    // family
    item.appendChild(makeField('Família', makeSeg(
      [
        { value: 'titulos', label: 'Títulos' },
        { value: 'textos',  label: 'Textos'  },
      ],
      t.family,
      v => {
        t.family = v;
        const allowed = TEXT_FAMILIES[v].weights.map(w => w.v);
        if (!allowed.includes(t.weight)) t.weight = defaultWeightFor(v);
        rebuildTextList();
        render();
      }
    )));

    // weight (depends on family)
    const weightOpts = TEXT_FAMILIES[t.family].weights.map(w => ({ value: w.v, label: w.label }));
    item.appendChild(makeField('Peso', makeSeg(
      weightOpts,
      t.weight,
      v => { t.weight = v; render(); }
    )));

    // size
    item.appendChild(makeRange('Tamanho', t.fontSize, 12, 200, 'px', v => {
      t.fontSize = v; render();
    }));

    // color
    item.appendChild(makeField('Cor', makeSwatchRow(t.color, hex => {
      t.color = hex; render();
    })));

    // layer
    item.appendChild(makeField('Camada', makeSeg(
      [
        { value: 'back',  label: 'Trás'   },
        { value: 'mid',   label: 'Meio'   },
        { value: 'front', label: 'Frente' },
      ],
      t.layer,
      v => { t.layer = v; render(); }
    )));

    list.appendChild(item);
  });
}

function autoGrow(ta) {
  ta.style.height = 'auto';
  ta.style.height = Math.min(220, ta.scrollHeight + 2) + 'px';
}

// ────────────────────────────── images

function loadImageFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = reader.result;
    const probe = new Image();
    probe.onload = () => {
      const aspect = probe.naturalHeight / probe.naturalWidth;
      const v = getView();
      const targetCells = Math.min(8, Math.floor(v.w / state.cell / 2));
      const wCells = targetCells;
      const hCells = Math.max(1, Math.round(targetCells * aspect));
      const id = 'i' + Date.now().toString(36);
      state.images.push({
        id, dataUrl,
        col: Math.max(0, Math.floor(v.w / state.cell / 2 - wCells / 2)),
        row: Math.max(0, Math.floor(v.h / state.cell / 2 - hCells / 2)),
        w: wCells,
        h: hCells,
        layer: 'front',     // 'back' | 'mid' | 'front'
        inHull: false,      // connect to extrusion
      });
      rebuildImageList();
      render();
    };
    probe.src = dataUrl;
  };
  reader.readAsDataURL(file);
}

function deleteImage(id) {
  state.images = state.images.filter(i => i.id !== id);
  rebuildImageList();
  render();
}

function rebuildImageList() {
  const list = document.getElementById('list-images');
  list.innerHTML = '';
  state.images.forEach((im, i) => {
    if (!im.layer) im.layer = 'front';
    if (typeof im.inHull !== 'boolean') im.inHull = false;

    const item = document.createElement('div');
    item.className = 'sub-item';

    item.appendChild(makeSubHeader(`Imagem ${i + 1}`, () => deleteImage(im.id)));

    const thumb = document.createElement('img');
    thumb.src = im.dataUrl;
    thumb.className = 'img-thumb';
    thumb.alt = '';
    item.appendChild(thumb);

    item.appendChild(makeField('Camada', makeSeg(
      [
        { value: 'back',  label: 'Trás'   },
        { value: 'mid',   label: 'Meio'   },
        { value: 'front', label: 'Frente' },
      ],
      im.layer,
      v => { im.layer = v; render(); }
    )));

    // hull toggle
    const hullLabel = document.createElement('label');
    hullLabel.className = 'check';
    const hullCb = document.createElement('input');
    hullCb.type = 'checkbox';
    hullCb.checked = im.inHull;
    hullCb.addEventListener('change', () => { im.inHull = hullCb.checked; render(); });
    hullLabel.appendChild(hullCb);
    hullLabel.appendChild(document.createTextNode(' Conectar à extrusão'));
    item.appendChild(hullLabel);

    const hint = document.createElement('div');
    hint.className = 'field-label';
    hint.innerHTML = `<span>Arrasta no canvas • alça pra redimensionar</span>`;
    item.appendChild(hint);

    list.appendChild(item);
  });
}

// ────────────────────────────── export

function buildExportSvg() {
  const clone = stage.cloneNode(true);
  clone.querySelector('#grid-bg').setAttribute('fill', 'transparent');
  const handles = clone.querySelector('#layer-handles');
  if (handles) handles.remove();
  const v = getView();
  clone.setAttribute('width',  v.w);
  clone.setAttribute('height', v.h);
  return new XMLSerializer().serializeToString(clone);
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportSvg() {
  const xml = buildExportSvg();
  const blob = new Blob(['<?xml version="1.0" encoding="UTF-8"?>\n', xml], { type: 'image/svg+xml' });
  downloadBlob(blob, `cards-lab-${Date.now()}.svg`);
}

function exportPng() {
  const xml = buildExportSvg();
  const svgBlob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);
  const img = new Image();
  img.onload = () => {
    const v = getView();
    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width  = v.w * scale;
    canvas.height = v.h * scale;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(svgUrl);
    canvas.toBlob(blob => {
      if (blob) downloadBlob(blob, `cards-lab-${Date.now()}.png`);
    }, 'image/png');
  };
  img.onerror = () => { URL.revokeObjectURL(svgUrl); console.error('PNG export failed'); };
  img.src = svgUrl;
}

// ────────────────────────────── URL hash

function _h(hex) { return (hex || '').replace('#', ''); }
function _u(v)   { return v ? '#' + v : '#000000'; }

function serializeState() {
  const s = state;
  const parts = [
    `as=${encodeURIComponent(s.aspect)}`,
    `c=${s.cell}`,
    `r=${s.radius}`,
    `g=${s.showGrid ? 1 : 0}`,
    `o=${s.gridOpacity}`,
    `bg=${_h(s.bgColor)}`,
    `ol=${s.outline.on ? 1 : 0},${_h(s.outline.color)},${s.outline.width}`,
    `a=${s.A.w},${s.A.h},${s.A.col},${s.A.row},${_h(s.A.color)}`,
    `b=${s.B.w},${s.B.h},${s.B.col},${s.B.row},${_h(s.B.color)}`,
    `sh=${s.shadow.mode},${_h(s.shadow.color)},${s.shadow.darken}`,
  ];
  if (s.texts.length) {
    parts.push('tx=' + s.texts.map(t => [
      t.col, t.row, t.fontSize, _h(t.color),
      t.family || 'titulos', t.weight || 700, t.layer || 'front',
      encodeURIComponent(t.content || ''),
    ].join(',')).join('|'));
  }
  return parts.join('&');
}

function parseCard(str, target) {
  const parts = str.split(',');
  if (parts.length < 5) return;
  const [w, h, col, row, color] = parts;
  target.w     = clampInt(w,   1, 60);
  target.h     = clampInt(h,   1, 60);
  target.col   = clampInt(col, 0, 200);
  target.row   = clampInt(row, 0, 200);
  target.color = _u(color);
  target.size  = 'custom';
}

function deserializeState(hash) {
  const clean = hash.replace(/^#/, '');
  if (!clean) return false;
  const map = {};
  clean.split('&').forEach(p => {
    const i = p.indexOf('=');
    if (i < 0) return;
    map[p.slice(0, i)] = p.slice(i + 1);
  });
  try {
    if (map.as) {
      const a = decodeURIComponent(map.as);
      if (ASPECTS[a]) state.aspect = a;
    }
    if (map.c)  state.cell        = clampInt(map.c, 8, 200);
    if (map.r)  state.radius      = clampInt(map.r, 0, 200);
    if (map.g !== undefined) state.showGrid = map.g === '1';
    if (map.o)  state.gridOpacity = clampInt(map.o, 0, 100);
    if (map.bg) state.bgColor     = _u(map.bg);
    if (map.ol) {
      const [on, color, w] = map.ol.split(',');
      state.outline.on    = on === '1';
      state.outline.color = _u(color);
      state.outline.width = clampInt(w, 1, 8);
    }
    if (map.a)  parseCard(map.a, state.A);
    if (map.b)  parseCard(map.b, state.B);
    if (map.sh) {
      const [mode, color, dk] = map.sh.split(',');
      if (mode) state.shadow.mode = mode;
      if (color) state.shadow.color = _u(color);
      if (dk !== undefined) state.shadow.darken = clampInt(dk, 0, 100);
    }
    if (map.tx) {
      state.texts = map.tx.split('|').map((s, i) => {
        const parts = s.split(',');
        // legacy (5 cols) vs new (8 cols)
        if (parts.length <= 5) {
          const [col, row, fs, color, content] = parts;
          return {
            id: 't' + i + '_' + Date.now().toString(36),
            col: clampInt(col, 0, 200), row: clampInt(row, 0, 200),
            fontSize: clampInt(fs, 8, 200), color: _u(color),
            family: 'titulos', weight: 800, layer: 'front',
            content: decodeURIComponent(content || ''),
          };
        }
        const [col, row, fs, color, family, weight, layer, content] = parts;
        return {
          id: 't' + i + '_' + Date.now().toString(36),
          col: clampInt(col, 0, 200), row: clampInt(row, 0, 200),
          fontSize: clampInt(fs, 8, 200), color: _u(color),
          family: TEXT_FAMILIES[family] ? family : 'titulos',
          weight: clampInt(weight, 100, 900),
          layer: ['back','mid','front'].includes(layer) ? layer : 'front',
          content: decodeURIComponent(content || ''),
        };
      });
    }
    return true;
  } catch (e) {
    console.warn('failed to parse hash', e);
    return false;
  }
}

let _hashTimer = null;
function pushHash() {
  if (_hashTimer) clearTimeout(_hashTimer);
  _hashTimer = setTimeout(() => {
    const next = '#' + serializeState();
    if (location.hash !== next) history.replaceState(null, '', next);
  }, 200);
}

async function copyShareLink() {
  const url = location.origin + location.pathname + '#' + serializeState();
  try {
    await navigator.clipboard.writeText(url);
    flashBtn('btn-share', 'Copiado!');
  } catch (e) {
    window.prompt('Copia o link:', url);
  }
}

function flashBtn(id, label) {
  const btn = document.getElementById(id);
  if (!btn) return;
  const original = btn.textContent;
  btn.textContent = label;
  btn.classList.add('is-flashed');
  setTimeout(() => { btn.textContent = original; btn.classList.remove('is-flashed'); }, 1200);
}

// ────────────────────────────── drag (cards + texts + images)

let drag = null;
const TAP_THRESHOLD_PX = 6;

function pointerToSvg(evt) {
  const pt = stage.createSVGPoint();
  pt.x = evt.clientX; pt.y = evt.clientY;
  const ctm = stage.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  return pt.matrixTransform(ctm.inverse());
}
function pointerToCell(evt) {
  const p = pointerToSvg(evt);
  return { col: p.x / state.cell, row: p.y / state.cell };
}

function identifyDragTarget(evt) {
  let n = evt.target;
  while (n && n !== stage) {
    const ds = n.dataset;
    if (ds) {
      if (ds.card)     return { kind: 'card',  id: ds.card,     handle: ds.handle };
      if (ds.imageId)  return { kind: 'image', id: ds.imageId,  handle: ds.handle };
      if (ds.textId)   return { kind: 'text',  id: ds.textId,   handle: ds.handle };
    }
    n = n.parentNode;
  }
  return null;
}

function getDragTarget(d) {
  if (d.kind === 'card')  return state[d.id];
  if (d.kind === 'image') return state.images.find(i => i.id === d.id);
  if (d.kind === 'text')  return state.texts.find(t => t.id === d.id);
  return null;
}

stage.addEventListener('pointerdown', evt => {
  const tgt = identifyDragTarget(evt);
  if (!tgt) return;
  evt.preventDefault();
  stage.setPointerCapture(evt.pointerId);
  stage.classList.add('is-dragging');
  const obj = getDragTarget(tgt);
  if (!obj) return;
  const start = pointerToCell(evt);
  drag = {
    kind: tgt.kind,
    id: tgt.id,
    handle: tgt.handle || 'move',
    pointerId: evt.pointerId,
    startX: evt.clientX, startY: evt.clientY,
    moved: false,
    offsetCol: start.col - obj.col,
    offsetRow: start.row - obj.row,
  };
});

stage.addEventListener('pointermove', evt => {
  if (!drag || evt.pointerId !== drag.pointerId) return;
  const dx = evt.clientX - drag.startX;
  const dy = evt.clientY - drag.startY;
  if (!drag.moved && Math.hypot(dx, dy) > TAP_THRESHOLD_PX) drag.moved = true;
  if (!drag.moved) return;

  const obj = getDragTarget(drag);
  if (!obj) return;
  const { col, row } = pointerToCell(evt);

  if (drag.handle === 'resize') {
    const newW = Math.max(1, Math.min(60, Math.round(col - obj.col)));
    const newH = Math.max(1, Math.min(60, Math.round(row - obj.row)));
    if (newW !== obj.w || newH !== obj.h) {
      obj.w = newW;
      obj.h = newH;
      if (drag.kind === 'card') obj.size = 'custom';
      syncUI();
      render();
    }
  } else {
    const newCol = clampInt(Math.round(col - drag.offsetCol), 0, 200);
    const newRow = clampInt(Math.round(row - drag.offsetRow), 0, 200);
    if (newCol !== obj.col || newRow !== obj.row) {
      obj.col = newCol;
      obj.row = newRow;
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
  const tapped = { kind: drag.kind, id: drag.id };
  drag = null;
  stage.classList.remove('is-dragging');
  if (wasTap) selectOnTap(tapped);
  render();
}

stage.addEventListener('pointerup',     endDrag);
stage.addEventListener('pointercancel', endDrag);

function selectOnTap({ kind, id }) {
  let selector = null;
  if (kind === 'card') selector = `.group[data-card-group="${id}"]`;
  if (kind === 'text') selector = '#group-texts';
  if (kind === 'image') selector = '#group-images';
  const group = selector ? document.querySelector(selector) : null;
  if (!group) return;
  group.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  group.classList.add('is-flashed');
  setTimeout(() => group.classList.remove('is-flashed'), 900);
}

// ────────────────────────────── title + boot

function splitTitle() {
  const titleEl = document.querySelector('.brand-title');
  if (!titleEl) return;
  const text = titleEl.dataset.text || titleEl.textContent;
  titleEl.textContent = '';
  [...text].forEach((c, i) => {
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
  setTimeout(() => document.body.classList.remove('is-booting'), 1600);
}

// ────────────────────────────── go

if (location.hash && location.hash.length > 1) {
  deserializeState(location.hash);
}

applyAspect();
bindControls();
splitTitle();
syncUI();
rebuildTextList();
rebuildImageList();
render();
boot();
