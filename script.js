const $ = s => document.querySelector(s);
// celular (tela estreita): versão adaptada, sem 3D, com botões de toque
const MQ = matchMedia('(max-width: 760px)'), MOBILE = MQ.matches;
document.body.classList.toggle('mobile', MOBILE);
(MQ.addEventListener ? MQ.addEventListener.bind(MQ, 'change') : MQ.addListener.bind(MQ))(() => location.reload());
const boot = $('#boot'), home = $('#home'), vs = $('#vscreen'), gl = $('#gl');
const items = [...document.querySelectorAll('.menu-item')];
const panels = [...document.querySelectorAll('.panel')];
const bgm = $('#bgm'), musicBtn = $('#musicBtn'), vol = $('#vol'), musicState = $('#musicState');
const isLoading = () => document.body.classList.contains('loading');

/* ---------- aviso rapidinho ---------- */
const toastEl = $('#toast'); let toastT;
function toast(msg) { toastEl.textContent = msg; toastEl.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('show'), 1700); }

/* ---------- loading: barra → só o wallpaper → PSP aparece ---------- */
const WALL_HOLD = 1500; // ms mostrando só o wallpaper antes do PSP
let revealPSP = () => { document.body.classList.remove('loading'); document.body.classList.add('pop'); }; // vira o 3D quando carrega
const Loader = (() => {
  const el = $('#loader'), fill = $('#ldFill'), pct = $('#ldPct'), msg = $('#ldMsg'), bar = el.querySelector('.ld-bar');
  const it = new Map(); let shown = 0, end = false; const t0 = performance.now();
  const api = {
    add(name, label, w = 1) { it.set(name, {label, w, p: 0}); },
    set(name, p) { const x = it.get(name); if (x) x.p = Math.max(x.p, Math.min(1, p)); },
    done(name) { api.set(name, 1); }
  };
  function finish() {
    if (end) return; end = true; fill.style.width = '100%'; pct.textContent = '100%'; msg.textContent = 'ready';
    setTimeout(() => { el.classList.add('done'); setTimeout(revealPSP, WALL_HOLD); }, 350);
  }
  (function loop() {
    let sum = 0, tot = 0, label = 'ready';
    it.forEach(x => { sum += x.p * x.w; tot += x.w; if (x.p < 1 && label === 'ready') label = x.label; });
    const target = tot ? sum / tot : 1, elapsed = performance.now() - t0;
    const cap = Math.min(1, elapsed / 1400); // nunca passa de 100% antes de ~1.4s (não pisca)
    shown += (Math.min(target, cap) - shown) * .12 + (target >= 1 && cap >= 1 ? .01 : 0);
    shown = Math.min(1, shown);
    const v = Math.round(shown * 100); fill.style.width = v + '%'; pct.textContent = v + '%'; bar.setAttribute('aria-valuenow', v);
    if (!end) msg.textContent = label;
    if (!end && (shown >= .995 || elapsed > 25000)) return finish();
    if (!end) requestAnimationFrame(loop);
  })();
  return api;
})();
(function preload() {
  const img = (name, label, src, then) => { Loader.add(name, label); const i = new Image();
    i.onload = () => { then && then(); Loader.done(name); }; i.onerror = () => Loader.done(name); i.src = src; };
  img('bg', 'loading wallpaper', 'assets/bg.jpg', () => document.querySelector('.bg').classList.add('ready'));
  img('panda', 'loading avatar', 'assets/panda.jpg');
  img('cover', 'loading cover', 'assets/cover.jpg');
  Loader.add('fonts', 'loading fonts', .5);
  Promise.race([document.fonts ? document.fonts.ready : 0, new Promise(r => setTimeout(r, 3500))]).then(() => Loader.done('fonts'));
  Loader.add('music', 'loading music', .8);
  const ok = () => Loader.done('music');
  if (bgm.readyState >= 3) ok(); else { bgm.addEventListener('canplay', ok, {once: true}); bgm.addEventListener('error', ok, {once: true}); setTimeout(ok, 4500); }
  bgm.addEventListener('progress', () => { try { if (bgm.duration && bgm.buffered.length) Loader.set('music', bgm.buffered.end(bgm.buffered.length - 1) / bgm.duration * .9); } catch (_) {} });
  if (!MOBILE) { Loader.add('model', 'loading psp model', 3); Loader.add('tex', 'loading textures', 1.5); }
})();

/* ---------- navegação ---------- */
const inHome = () => !home.classList.contains('hidden');
const activeMenu = () => document.querySelector('.menu-item.active');
let lastFocus = null;
home.addEventListener('focusin', e => { lastFocus = e.target; });
function enterSite() { boot.classList.add('hidden'); home.classList.remove('hidden'); items[0].focus({preventScroll: true}); playMusic(); }
function backToBoot() { home.classList.add('hidden'); boot.classList.remove('hidden'); }
function go(step) {
  const next = items[(items.indexOf(activeMenu()) + step + items.length) % items.length];
  next.click(); next.focus({preventScroll: true});
}
function vertical(dir) { // ▲▼ andam dentro da aba atual
  const list = [...document.querySelector('.panel.active-panel').querySelectorAll('a[href],button,input')];
  if (!list.length) return home.scrollBy({top: dir * 60, behavior: 'smooth'});
  const cur = home.contains(document.activeElement) ? document.activeElement : lastFocus, i = list.indexOf(cur);
  if (dir > 0) list[Math.min(list.length - 1, i + 1)].focus();
  else if (i <= 0) activeMenu().focus({preventScroll: true});
  else list[i - 1].focus();
}
function setVol(d) { vol.value = Math.max(0, Math.min(100, +vol.value + d)); vol.dispatchEvent(new Event('input')); }
$('#startBtn').addEventListener('click', enterSite);
items.forEach(item => item.addEventListener('click', () => {
  items.forEach(x => x.classList.remove('active')); panels.forEach(x => x.classList.remove('active-panel'));
  item.classList.add('active'); document.getElementById(item.dataset.panel).classList.add('active-panel');
}));

/* discord: copia o usuário (link direto de perfil precisa do ID numérico) */
const discordBtn = $('#discordBtn'), discordHint = $('#discordHint');
discordBtn.addEventListener('click', async () => {
  const u = discordBtn.dataset.user;
  try { await navigator.clipboard.writeText(u); }
  catch (e) { const t = document.createElement('textarea'); t.value = u; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); } catch (_) {} t.remove(); }
  discordHint.textContent = 'copiado! ✓';
  clearTimeout(discordBtn._t); discordBtn._t = setTimeout(() => { discordHint.textContent = u + ' ⧉'; }, 1600);
});

let glowKey = () => {}, resetView = () => {}; // viram reais quando o 3D carrega
const vstatus = $('#vstatus');
function fitFlat() { document.documentElement.style.setProperty('--fs', Math.min(1, (innerWidth - 24) / 720, (innerHeight - 24) / 405)); }
addEventListener('resize', () => document.body.classList.contains('flat') && fitFlat());
function fail(err) { // se o 3D não funcionar, o site continua utilizável (tela plana) e mostra o motivo
  console.error(err); document.body.classList.add('flat'); fitFlat(); Loader.done('model'); Loader.done('tex');
  vstatus.textContent = '3D indisponível: ' + ((err && err.message) || err); vstatus.hidden = false;
}
function legendFlash(k) { // acende a linha do guia de botões
  document.querySelectorAll('#guide li').forEach(li => {
    if (li.dataset.lk.split(' ').includes(k)) { li.classList.add('hot'); clearTimeout(li._t); li._t = setTimeout(() => li.classList.remove('hot'), 450); }
  });
}
const actions = {
  left: () => inHome() && go(-1), right: () => inHome() && go(1),
  up: () => inHome() && vertical(-1), down: () => inHome() && vertical(1),
  l: () => inHome() && go(-1), r: () => inHome() && go(1),
  x: () => (inHome() ? (home.contains(lastFocus) ? lastFocus : activeMenu()).click() : enterSite()),
  cir: () => inHome() && backToBoot(), tri: () => toggleMusic(), sq: () => resetView(),
  start: () => { if (!inHome()) return enterSite(); items[0].click(); items[0].focus({preventScroll: true}); toast('✦ START · PROFILE'); },
  select: () => { const off = $('#guide').classList.toggle('off'); toast(off ? 'SELECT · GUIDE OFF' : 'SELECT · GUIDE ON'); },
  ps: () => inHome() && backToBoot(),
  volup: () => { setVol(10); toast('VOL ' + vol.value + '%'); }, voldown: () => { setVol(-10); toast('VOL ' + vol.value + '%'); },
  sound: () => toggleMusic(), display: () => { const d = document.body.classList.toggle('dim'); toast(d ? 'DISPLAY · DIM' : 'DISPLAY · BRIGHT'); }
};
const keymap = {ArrowLeft:'left', ArrowRight:'right', ArrowUp:'up', ArrowDown:'down', Enter:'x', ' ':'x', Escape:'cir', m:'tri', M:'tri', h:'select', H:'select'};
document.addEventListener('keydown', e => {
  const k = keymap[e.key]; if (!k || isLoading()) return;
  if (e.target.matches?.('input[type=range]') && (k === 'left' || k === 'right')) return;
  glowKey(k); legendFlash(k);
  if (k === 'x' && e.target.closest?.('button,a')) return;
  if (e.key === ' ' || e.key.startsWith('Arrow')) e.preventDefault();
  actions[k]?.();
});

/* ---------- música de fundo ----------
   Usa assets/music.mp3 se existir. Se não existir, toca um ambiente suave gerado no navegador. */
const TRACK = {title: 'A Miserable Life', artist: 'Decalius', note: 'Dehumanizing Loneliness · 2023'};
let fileOk = true, playing = false, synth = null;
function showTrack(file) {
  $('#trackArtist').textContent = file ? TRACK.artist.toUpperCase() : 'AMBIENTE';
  $('#trackTitle').textContent = file ? TRACK.title : 'ambient loop';
  $('#trackNote').textContent = file ? TRACK.note : 'som gerado no navegador';
}
bgm.addEventListener('loadedmetadata', () => { fileOk = true; showTrack(true); });
bgm.addEventListener('error', () => { fileOk = false; showTrack(false); });
bgm.volume = vol.value / 100;

function makeSynth() {
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
  const ctx = new AC(), master = ctx.createGain(), lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 900; master.gain.value = 0;
  lp.connect(master); master.connect(ctx.destination);
  const lfo = ctx.createOscillator(), lg = ctx.createGain();
  lfo.frequency.value = .08; lg.gain.value = 350; lfo.connect(lg); lg.connect(lp.frequency); lfo.start();
  const chords = [[220, 261.6, 329.6, 392], [174.6, 220, 261.6, 329.6], [196, 246.9, 293.7, 392], [164.8, 207.7, 246.9, 311.1]];
  let i = 0, oscs = [];
  function chord() {
    oscs.forEach(o => { o.g.gain.setTargetAtTime(0, ctx.currentTime, 1.5); o.o.stop(ctx.currentTime + 6); });
    oscs = chords[i++ % chords.length].flatMap(f => [-4, 4].map(d => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'triangle'; o.frequency.value = f; o.detune.value = d; g.gain.value = 0;
      o.connect(g); g.connect(lp); o.start(); g.gain.setTargetAtTime(.07, ctx.currentTime, 1.5);
      return {o, g};
    }));
  }
  chord(); const timer = setInterval(chord, 7000);
  return {ctx, master, timer};
}
function setState(on) {
  playing = on;
  musicBtn.textContent = on ? '❚❚ PAUSE' : '▶ PLAY';
  musicState.textContent = on ? (fileOk ? 'tocando' : 'tocando (ambiente)') : 'pausado';
}
async function playMusic() {
  if (fileOk) {
    try { await bgm.play(); setState(true); return; }
    catch (err) { if (err.name === 'NotAllowedError') return setState(false); fileOk = false; showTrack(false); }
  }
  if (!synth) synth = makeSynth();
  if (!synth) return setState(false);
  await synth.ctx.resume();
  synth.master.gain.setTargetAtTime(vol.value / 100, synth.ctx.currentTime, .3);
  setState(true);
}
function pauseMusic() {
  bgm.pause();
  if (synth) synth.master.gain.setTargetAtTime(0, synth.ctx.currentTime, .2);
  setState(false);
}
function toggleMusic() { playing ? pauseMusic() : playMusic(); }
musicBtn.addEventListener('click', toggleMusic);
vol.addEventListener('input', () => {
  bgm.volume = vol.value / 100;
  if (synth && playing) synth.master.gain.value = vol.value / 100;
});
setState(false);

/* ---------- fundo: brilhos y2k (estrelinhas de 4 pontas) caindo devagar ---------- */
(function () {
  const cv = $('#sky'), cx = cv.getContext('2d'), still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const COLORS = ['#ffffff', '#b8ff2e', '#ff3df0', '#35f2ff'];
  let w, h, d, P = [];
  const mk = init => ({x: Math.random() * w, y: init ? Math.random() * h : -20 * d, r: (Math.random() * 6 + 3) * d, a: Math.random() * 6.3,
    va: (Math.random() - .5) * .03, vy: (Math.random() * .45 + .25) * d, sw: Math.random() * 6.3, o: Math.random() * .5 + .35,
    c: COLORS[Math.random() < .55 ? 0 : 1 + Math.floor(Math.random() * 3)]});
  function size() {
    d = Math.min(devicePixelRatio || 1, 1.5); w = cv.width = innerWidth * d; h = cv.height = innerHeight * d;
    P = Array.from({length: Math.round(w * h / 60000)}, () => mk(true));
  }
  function star(r) { // losango fino de 4 pontas
    cx.beginPath(); cx.moveTo(0, -r); cx.quadraticCurveTo(0, 0, r * .55, 0); cx.quadraticCurveTo(0, 0, 0, r);
    cx.quadraticCurveTo(0, 0, -r * .55, 0); cx.quadraticCurveTo(0, 0, 0, -r); cx.fill();
  }
  function frame(t) {
    if (document.body.classList.contains('moving')) return requestAnimationFrame(frame); // pausa enquanto gira
    cx.clearRect(0, 0, w, h);
    P.forEach((p, i) => {
      p.y += p.vy; p.a += p.va; p.x += Math.sin(t / 1500 + p.sw) * .4 * d;
      if (p.y > h + 20) P[i] = mk(false);
      cx.save(); cx.translate(p.x, p.y); cx.rotate(p.a * .25);
      cx.globalAlpha = p.o * (.55 + .45 * Math.abs(Math.sin(t / 700 + p.sw))); cx.fillStyle = p.c; cx.shadowColor = p.c; cx.shadowBlur = 8 * d;
      star(p.r); cx.restore();
    });
    if (!still) requestAnimationFrame(frame);
  }
  addEventListener('resize', () => { size(); if (still) frame(0); });
  size(); requestAnimationFrame(frame);
})();


if (!MOBILE) try {
/* ---------- PSP 3D (three.js) ---------- */
const T = THREE;
const renderer = new T.WebGLRenderer({canvas: gl, antialias: true, alpha: true});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputEncoding = T.sRGBEncoding; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
const scene = new T.Scene(), cam = new T.PerspectiveCamera(28, 1, .01, 20);
const pivot = new T.Group(); pivot.rotation.order = 'YXZ'; scene.add(pivot);
let obj = null, dirty = true, ry = 0, rx = 0, intro = 0; // intro: 0 (escondido, embaixo) → 1 (no lugar)
gl.style.opacity = 0; gl.style.transition = 'opacity 1.1s ease';
pivot.position.y = -.32; pivot.scale.setScalar(.82);

// iluminação: ambiente com softboxes (reflexos reais) + luz principal + luz de contorno colorida
(function () {
  const s = new T.Scene();
  s.add(new T.Mesh(new T.SphereGeometry(5, 32, 16), new T.MeshBasicMaterial({color: 0x15161b, side: T.BackSide})));
  const box = (c, i, x, y, z, w, h) => {
    const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({color: new T.Color(c).multiplyScalar(i), side: T.DoubleSide}));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); s.add(m);
  };
  box(0xffffff, 7, -3, 3, 3, 3, 2); box(0xd8ffa0, 3, 3.5, 1, 2, 2, 3); box(0xffffff, 4, 0, 4, -2, 5, 1.5); box(0xff9bf0, 2.5, 0, -3, 3, 4, 1);
  const pm = new T.PMREMGenerator(renderer); scene.environment = pm.fromScene(s, .02).texture; pm.dispose();
})();
const key = new T.DirectionalLight(0xffffff, 1.6); key.position.set(-.4, .6, 1); scene.add(key);
const rim = new T.DirectionalLight(0xb8ff2e, 1.1); rim.position.set(.8, .1, -.6); scene.add(rim);
const rim2 = new T.DirectionalLight(0xff3df0, .8); rim2.position.set(-.8, -.2, -.5); scene.add(rim2);
scene.add(new T.AmbientLight(0xffffff, .18));

const tl = new T.TextureLoader();
let texN = 0; const texDone = () => { texN++; Loader.set('tex', texN / 6); if (texN >= 6) Loader.done('tex'); };
const tx = (f, srgb) => { const t = tl.load('assets/psp/' + f, () => { dirty = true; texDone(); }, undefined, texDone); t.anisotropy = 8; if (srgb) t.encoding = T.sRGBEncoding; return t; };
const MATS = {
  psp: new T.MeshStandardMaterial({map: tx('albedo.jpg', 1), normalMap: tx('normal.jpg'), roughnessMap: tx('rough.jpg'), metalnessMap: tx('metal.jpg'),
    aoMap: tx('ao.jpg'), emissiveMap: tx('emissive.jpg', 1), emissive: 0xffffff, emissiveIntensity: .5, roughness: 1, metalness: 1}),
  screen: new T.MeshPhysicalMaterial({color: 0x030304, roughness: .1, metalness: 0, clearcoat: 1, clearcoatRoughness: .05})
};
function parseOBJ(txt) {
  const V = [], N = [], U = [], groups = new Map(); let g = 'g', m = '';
  for (const line of txt.split('\n')) {
    const p = line.trim().split(/\s+/), c = p[0];
    if (c === 'v') V.push(+p[1], +p[2], +p[3]);
    else if (c === 'vn') N.push(+p[1], +p[2], +p[3]);
    else if (c === 'vt') U.push(+p[1], +p[2]);
    else if (c === 'o' || c === 'g') g = p.slice(1).join(' ');
    else if (c === 'usemtl') m = p[1];
    else if (c === 'f') {
      const key = g + '|' + m; let G = groups.get(key);
      if (!G) groups.set(key, G = {name: g, mat: m, pos: [], nor: [], uv: []});
      const ids = p.slice(1).map(t => t.split('/').map(x => x ? parseInt(x) : 0));
      for (let i = 1; i < ids.length - 1; i++) for (const f of [ids[0], ids[i], ids[i + 1]]) {
        const vi = (f[0] < 0 ? V.length / 3 + f[0] : f[0] - 1) * 3; G.pos.push(V[vi], V[vi + 1], V[vi + 2]);
        if (f[1]) { const ti = (f[1] < 0 ? U.length / 2 + f[1] : f[1] - 1) * 2; G.uv.push(U[ti], U[ti + 1]); } else G.uv.push(0, 0);
        if (f[2]) { const ni = (f[2] < 0 ? N.length / 3 + f[2] : f[2] - 1) * 3; G.nor.push(N[ni], N[ni + 1], N[ni + 2]); }
      }
    }
  }
  const out = new T.Group();
  groups.forEach(G => {
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(G.pos, 3));
    geo.setAttribute('uv', new T.Float32BufferAttribute(G.uv, 2));
    geo.setAttribute('uv2', new T.Float32BufferAttribute(G.uv, 2)); // aoMap usa uv2
    if (G.nor.length === G.pos.length) geo.setAttribute('normal', new T.Float32BufferAttribute(G.nor, 3)); else geo.computeVertexNormals();
    const mesh = new T.Mesh(geo, MATS[G.mat] || new T.MeshStandardMaterial()); mesh.name = G.name; out.add(mesh);
  });
  return out;
}
// o modelo já vem centrado, de frente e com largura = 1 (x de -0.5 a 0.5)
fetch('assets/psp/psp.obj').then(async r => { // baixa em pedaços pra barra de loading andar de verdade
  if (!r.ok) throw new Error('HTTP ' + r.status);
  if (!r.body || !r.body.getReader) return r.text();
  const rd = r.body.getReader(), parts = []; let got = 0;
  for (;;) { const {done, value} = await rd.read(); if (done) break; parts.push(value); got += value.length; Loader.set('model', Math.min(.9, got / 5478421 * .9)); }
  const all = new Uint8Array(got); let o = 0; for (const p of parts) { all.set(p, o); o += p.length; }
  return new TextDecoder().decode(all);
}).then(txt => {
  Loader.set('model', .95); return new Promise(r => setTimeout(() => r(txt), 30)); // deixa a barra desenhar antes do parse
}).then(txt => {
  obj = parseOBJ(txt); pivot.add(obj); dirty = true; Loader.done('model');
}).catch(e => fail(new Error('não consegui carregar assets/psp/psp.obj (' + e.message + '). Suba a pasta assets inteira; abrindo o arquivo direto do computador o navegador bloqueia — use o GitHub Pages.')));

function fit() {
  const w = innerWidth, h = innerHeight, a = w / h;
  renderer.setSize(w, h, false); cam.aspect = a;
  // altura visível: o PSP (1 x 0.44) ocupa ~66% da altura ou ~86% da largura, o que for menor
  const vis = Math.max(.442 / .66, 1 / (.86 * a)), d = vis / (2 * Math.tan(cam.fov * Math.PI / 360));
  cam.position.set(0, 0, d); cam.lookAt(0, 0, 0); cam.updateProjectionMatrix(); dirty = true;
}
addEventListener('resize', fit); fit();

/* tela do site colada na tela do PSP (deformação em perspectiva) */
const SZ = .0562, SX = .28115, SY0 = .1728, SY1 = -.1434;
const SC = [[-SX, SY0], [SX, SY0], [SX, SY1], [-SX, SY1]].map(([x, y]) => new T.Vector3(x, y, SZ)); // TL, TR, BR, BL
function homography(p) {
  const [x0, y0] = p[0], [x1, y1] = p[1], [x2, y2] = p[2], [x3, y3] = p[3];
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3, dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
  const den = dx1 * dy2 - dx2 * dy1, g = (dx3 * dy2 - dx2 * dy3) / den, h = (dx1 * dy3 - dx3 * dy1) / den;
  const a = x1 - x0 + g * x1, b = x3 - x0 + h * x3, d = y1 - y0 + g * y1, e = y3 - y0 + h * y3, W = 720, H = 405;
  return `matrix3d(${a / W},${d / W},0,${g / W},${b / H},${e / H},0,${h / H},0,0,1,0,${x0},${y0},0,1)`;
}
function overlay() {
  if (!obj) return;
  pivot.updateMatrixWorld(true); cam.updateMatrixWorld();
  const pts = SC.map(c => { const v = c.clone(); obj.localToWorld(v); v.project(cam); return [(v.x * .5 + .5) * innerWidth, (-v.y * .5 + .5) * innerHeight]; });
  const n = new T.Vector3(0, 0, 1).transformDirection(obj.matrixWorld), c0 = new T.Vector3(0, 0, SZ); obj.localToWorld(c0);
  const dot = n.dot(cam.position.clone().sub(c0).normalize());
  const gate = Math.max(0, (intro - .55) / .45); // tela do PSP acende no fim da entrada
  vs.style.opacity = (dot > .1 ? Math.min(1, (dot - .1) * 4) : 0) * gate;
  vs.classList.toggle('on', dot > .3 && intro > .95);
  vs.style.transform = homography(pts);
}

/* brilho dos botões (halos aditivos nas posições reais dos botões do modelo) */
const BTN = { // peça do modelo -> [ação, cor do brilho, x, y]
  button1_low: ['up', '#b8ff2e', -.3858, .0673], button2_low: ['right', '#b8ff2e', -.3392, .0207], button3_low: ['down', '#b8ff2e', -.3858, -.026], button4_low: ['left', '#b8ff2e', -.4325, .0207],
  button5_low: ['tri', '#46dc82', .3898, .0845], button6_low: ['cir', '#f0505a', .4551, .0222], button7_low: ['x', '#5078f0', .3928, -.0432], button8_low: ['sq', '#eb6eb9', .3275, .0192],
  button9_low: ['ps', '#35f2ff', -.2786, -.1882], button10_low: ['voldown', '#ffffff', -.2048, -.1887], button11_low: ['volup', '#ffffff', -.1389, -.1887],
  button12_low: ['select', '#ffffff', .1124, -.1887], button13_low: ['start', '#ffffff', .1554, -.1887],
  button14_low: ['sound', '#35f2ff', .2183, -.1882], button15_low: ['display', '#ffffff', .284, -.1882]
};
const SPOT = {l: [-.4, .2, '#ffffff'], r: [.4, .2, '#ffffff']};
for (const [, [k, c, x, y]] of Object.entries(BTN)) if (!SPOT[k]) SPOT[k] = [x, y, c];
const gtex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.35, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new T.CanvasTexture(c); })();
const glows = [];
function glowAt(x, y, color, size) {
  if (!obj) return;
  const m = new T.SpriteMaterial({map: gtex, color, blending: T.AdditiveBlending, transparent: true, depthWrite: false}), sp = new T.Sprite(m);
  sp.userData.b = size; sp.scale.setScalar(size); sp.position.set(x, y, .078); sp.userData.t0 = performance.now();
  obj.add(sp); glows.push(sp); dirty = true;
}
function glowKeyImpl(k) { const s = SPOT[k]; if (s) glowAt(s[0], s[1], s[2], /^(start|select|volup|voldown)$/.test(k) ? .06 : /^(ps|sound|display)$/.test(k) ? .08 : .1); }
function updateGlows() {
  const n = performance.now();
  for (let i = glows.length - 1; i >= 0; i--) {
    const s = glows[i], p = (n - s.userData.t0) / 450;
    if (p >= 1) { obj.remove(s); s.material.dispose(); glows.splice(i, 1); } else { s.material.opacity = 1 - p; s.scale.setScalar(s.userData.b * (1 + .5 * p)); }
  }
}
function pick(part, p) { // qual botão do modelo foi clicado
  if (BTN[part]) return BTN[part][0];
  if (p.y > .165 && Math.abs(p.x) > .33) return p.x < 0 ? 'l' : 'r'; // gatilhos L / R nas pontas de cima
  if (p.z > .03 && p.y < -.165 && p.y > -.215) { // faixa de baixo: os botõezinhos são miúdos, então pega o mais próximo do clique
    let best = null, bd = .034;
    for (const k of ['ps', 'voldown', 'volup', 'select', 'start', 'sound', 'display']) { const s = SPOT[k], d = Math.hypot(p.x - s[0], (p.y - s[1]) * .8); if (d < bd) { bd = d; best = k; } }
    return best;
  }
  return null;
}
const ray = new T.Raycaster();
function clickModel(e) {
  if (!obj || isLoading()) return;
  ray.setFromCamera(new T.Vector2(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), cam);
  const hit = ray.intersectObject(obj, true)[0]; if (!hit) return;
  const k = pick(hit.object.name, obj.worldToLocal(hit.point.clone()));
  if (k) { glowKey(k); legendFlash(k); actions[k]?.(); }
}

/* ---------- girar só quando você arrasta ---------- */
const apply = () => { pivot.rotation.set(rx * Math.PI / 180, (ry - (1 - intro) * 70) * Math.PI / 180, 0); dirty = true; };
let drag = null, anim = null, pend = false;
const queue = () => { if (pend) return; pend = true; requestAnimationFrame(() => { pend = false; apply(); }); };
function resetViewImpl() {
  cancelAnimationFrame(anim);
  const sy = ry, sx = rx, t0 = performance.now(), target = Math.round(sy / 360) * 360;
  (function step(t) {
    const p = Math.min(1, (t - t0) / 600), e = 1 - Math.pow(1 - p, 3);
    ry = sy + (target - sy) * e; rx = sx * (1 - e); apply();
    if (p < 1) anim = requestAnimationFrame(step);
  })(t0);
}
document.addEventListener('pointerdown', e => {
  if (!e.target.closest('#gl,#vscreen') || e.target.closest('a,button,input,.menu,.panel')) return;
  cancelAnimationFrame(anim); drag = {x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, onGl: e.target === gl};
  gl.classList.add('dragging'); document.body.classList.add('moving'); $('#dragHint').classList.add('gone');
});
document.addEventListener('pointermove', e => {
  if (!drag) return;
  ry += (e.clientX - drag.x) * .45; rx = Math.max(-35, Math.min(35, rx - (e.clientY - drag.y) * .3));
  drag.x = e.clientX; drag.y = e.clientY; queue();
});
const stop = e => {
  if (drag && drag.onGl && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 5) clickModel(e);
  drag = null; gl.classList.remove('dragging'); document.body.classList.remove('moving');
};
document.addEventListener('pointerup', stop); document.addEventListener('pointercancel', stop);
document.addEventListener('dblclick', e => { if (!e.target.closest('a,button,input')) resetView(); });

(function tick() {
  if (dirty || glows.length) { updateGlows(); renderer.render(scene, cam); overlay(); dirty = false; }
  requestAnimationFrame(tick);
})();


glowKey = glowKeyImpl; resetView = resetViewImpl;
revealPSP = () => { // PSP sobe, gira até a frente e acende a tela
  if (document.body.classList.contains('flat')) { document.body.classList.remove('loading'); document.body.classList.add('pop'); return; }
  document.body.classList.remove('loading'); gl.style.opacity = 1;
  const t0 = performance.now(), D = 1900;
  (function step(t) {
    const p = Math.min(1, (t - t0) / D); intro = 1 - Math.pow(1 - p, 4);
    pivot.position.y = -.32 * (1 - intro); pivot.scale.setScalar(.82 + .18 * intro); apply();
    if (p < 1) requestAnimationFrame(step); else { intro = 1; apply(); }
  })(t0);
};
} catch (err) { fail(err); }

/* ---------- botões de toque (celular) ---------- */
document.querySelectorAll('#pad [data-p]').forEach(b => {
  b.addEventListener('mousedown', e => e.preventDefault()); // não rouba o foco da tela
  b.addEventListener('click', () => {
    const k = b.dataset.p; legendFlash(k); b.classList.add('hot'); setTimeout(() => b.classList.remove('hot'), 380);
    if (navigator.vibrate) navigator.vibrate(8);
    actions[k]?.();
  });
});
if (MOBILE) $('#guide').classList.add('off');
