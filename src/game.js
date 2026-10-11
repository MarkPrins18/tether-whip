// Pure game logic for Tether Whip. No React, no Skia: easy to test and tune.
export const W = 400;
const STEP = 1 / 120;
export const COMBO_T = 2.2;
const MINL = 70, REEL = 90, MINV = 330, VROPE = 640, VFREE = 720, GR_ROPE = 120, GR_FREE = 380;
export const PR = 9;
export const SECTOR_M = 100;

export const UPS = [
  { k: 'reach', name: 'Longer reach', desc: 'Grab anchors from farther away', max: 6 },
  { k: 'magnet', name: 'Orb magnet', desc: 'Orbs drift toward you', max: 6 },
  { k: 'slow', name: 'Slow void', desc: 'The void rises more slowly', max: 6 },
  { k: 'value', name: 'Rich orbs', desc: 'More coins from every orb', max: 6 },
];
export const upCost = (lvl) => Math.round(30 * Math.pow(1.75, lvl));

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rnd = (a, b) => a + Math.random() * (b - a);

const reachOf = (g) => 230 + 24 * g.opts.up.reach;
const magOf = (g) => (g.opts.up.magnet ? 30 + g.opts.up.magnet * 24 : 0);
const slowOf = (g) => 1 - 0.07 * g.opts.up.slow;
export const coinValue = (g) => 1 + g.opts.up.value;

export const heightM = (g) => Math.max(0, (g.baseY - g.minY) / 40);
export const multOf = (g) => 1 + Math.min(g.combo, 25) * 0.2;
export const scoreOf = (g) => Math.floor(heightM(g) * 10) + g.bonus;
export const sectorOf = (g) => Math.floor(heightM(g) / SECTOR_M);
export const SECTOR_NAMES = ['Basin', 'Drift', 'Storm', 'Ember', 'Zenith'];
export const sectorName = (n) => SECTOR_NAMES[n % SECTOR_NAMES.length];

// opts: { up: {reach, magnet, slow, value}, bestH: number, fx: boolean }
export function createGame(opts, VH) {
  const a0 = { x: 200, y: -100 };
  const g = {
    opts: { fx: true, ...opts }, VH, t: 0, acc: 0, live: false, demo: false,
    p: { x: a0.x + 70, y: a0.y, vx: 0, vy: -320 },
    rope: a0, L: 70, anchors: [a0], orbs: [], mines: [], parts: [], fl: [], trail: [], events: [],
    camY: 0, voidY: a0.y + 430, baseY: a0.y, minY: a0.y, bonus: 0,
    orbsTaken: 0, coinsRun: 0, combo: 0, comboT: 0, maxCombo: 0, shake: 0, invuln: 0,
    dead: false, deadT: 0, revived: false, vhold: true, flights: 0, mile: 0, sector: 0, passedBest: false,
    autoT: 0, tick: 0, target: null, next: null, aligned: false, cull: 0, down: false, ang: 0, hint: 0,
    shield: false, shieldT: 0,
    stats: { orbs: 0, stars: 0, near: 0, perfects: 0, shields: 0, maxMult: 1 },
    botT: 0,
  };
  g.camY = a0.y - VH * 0.38;
  addRing(g, a0, 5, 112, 1.2, 0.7);
  for (let i = 0; i < 7; i++) spawnAnchor(g);
  return g;
}

function addRing(g, a, n, rad, a0, w) {
  const dir = Math.random() < 0.5 ? -1 : 1;
  const sp = w || dir * rnd(0.5, 1.0);
  for (let i = 0; i < n; i++) {
    const ang = a0 + i * ((Math.PI * 2) / n);
    g.orbs.push({ anc: a, ang, rad, w: sp, x: a.x + Math.cos(ang) * rad, y: a.y + Math.sin(ang) * rad, r: 7, kind: 0, dead: false });
  }
  return sp;
}

function spawnAnchor(g) {
  const last = g.anchors[g.anchors.length - 1];
  const m = (g.baseY - last.y) / 40;
  const d = clamp((m - 15) / 120, 0, 1);

  // Every new anchor stays inside a comfortable reach of the previous one.
  const gapY = 115 + Math.random() * (30 + Math.min(35, m * 0.15));
  const D = 195;
  const maxDx = Math.sqrt(Math.max(0, D * D - gapY * gapY));
  let dx = (Math.random() < 0.5 ? -1 : 1) * rnd(40, Math.max(45, maxDx));
  let x = last.x + dx;
  if (x < 60 || x > 340) x = last.x - dx;
  x = clamp(x, 60, 340);
  const a = { x, y: last.y - gapY };
  g.anchors.push(a);

  // Ring of orbs, sometimes guarded by an orbiting mine.
  let n = 3 + ((Math.random() * 3) | 0);
  const rad = rnd(82, 110), a0 = Math.random() * 6.28;
  const guarded = m > 35 && Math.random() < 0.12 + 0.2 * d;
  if (guarded) n = Math.max(3, n);
  const sp = addRing(g, a, n, rad, a0);
  if (guarded) {
    const off = a0 + Math.PI / n; // sits between two orbs
    g.mines.push({ anc: a, ang: off, rad, w: sp, x: a.x + Math.cos(off) * rad, y: a.y + Math.sin(off) * rad, x0: 0, r: 11, amp: 0, sp: 0, ph: 0, rot: 0, nm: false, gone: false });
  }

  const midY = (last.y + a.y) / 2;
  const midX = (last.x + a.x) / 2;

  // Star orb (big reward) and shield pickup.
  if (Math.random() < 0.28) {
    g.orbs.push({ anc: null, ang: 0, rad: 0, w: 0, x: clamp(midX + rnd(-55, 55), 40, 360), y: midY + rnd(-20, 20), r: 10, kind: 1, dead: false });
  } else if (m > 25 && Math.random() < 0.07) {
    g.orbs.push({ anc: null, ang: 0, rad: 0, w: 0, x: clamp(midX + rnd(-45, 45), 40, 360), y: midY + rnd(-15, 15), r: 11, kind: 2, dead: false });
  }

  // Free-floating mines between anchors.
  if (m > 15 && Math.random() < 0.18 + 0.45 * d) {
    const mx = clamp(midX + rnd(-90, 90), 70, 330), my = midY + rnd(-25, 25);
    if (Math.hypot(mx - last.x, my - last.y) > 75 && Math.hypot(mx - a.x, my - a.y) > 75) {
      const moving = m > 45 && Math.random() < 0.2 + 0.5 * d;
      g.mines.push({ anc: null, x0: mx, x: mx, y: my, r: 13, amp: moving ? rnd(25, 60) : 0, sp: rnd(0.8, 1.6), ph: rnd(0, 6.28), rot: 0, nm: false, gone: false });
    }
  }
  if (m > 90 && Math.random() < 0.25 * d) {
    const mx = rnd(80, 320), my = midY + rnd(-40, 40);
    if (Math.hypot(mx - last.x, my - last.y) > 80 && Math.hypot(mx - a.x, my - a.y) > 80) {
      g.mines.push({ anc: null, x0: mx, x: mx, y: my, r: 12, amp: rnd(25, 70), sp: rnd(1, 2), ph: rnd(0, 6.28), rot: 0, nm: false, gone: false });
    }
  }
}

export function findTarget(g) {
  const p = g.p, reach = reachOf(g);
  let best = null, bc = 1e9;
  for (const a of g.anchors) {
    const d = Math.hypot(a.x - p.x, a.y - p.y);
    if (d > reach || d < 24) continue;
    const c = d + (a.y > p.y + 30 ? 70 : 0);
    if (c < bc) { bc = c; best = a; }
  }
  return best;
}

// The anchor ahead (above) that a release would aim for.
function pickNext(g) {
  const p = g.p, reach = reachOf(g);
  let best = null, bd = 1e9;
  for (const a of g.anchors) {
    if (a === g.rope) continue;
    if (a.y > p.y - 30) continue;
    const d = Math.hypot(a.x - p.x, a.y - p.y);
    if (d > reach || d < 30) continue;
    if (d < bd) { bd = d; best = a; }
  }
  return best;
}

function alignedWith(g, n) {
  if (!n) return false;
  const p = g.p, dx = n.x - p.x, dy = n.y - p.y, d = Math.hypot(dx, dy) || 1, sp = Math.hypot(p.vx, p.vy);
  if (sp < 200) return false;
  return (p.vx * dx + p.vy * dy) / (sp * d) > 0.965;
}

function burst(g, x, y, col, n, spd) {
  if (!g.opts.fx) n = Math.ceil(n / 3);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 6.283, s = rnd(0.3, 1) * (spd || 160), l = rnd(0.35, 0.8);
    g.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, l, m: l, c: col, r: rnd(1.5, 3.2) });
  }
  if (g.parts.length > 220) g.parts.splice(0, g.parts.length - 220);
}
function floaty(g, txt, x, y, col) { g.fl.push({ t: txt, x, y, l: 0.9, m: 0.9, c: col }); }

// ---- input ----
// side: -1 = left half of the screen (swing clockwise, fly left), 1 = right half (counterclockwise, fly right).
export function press(g, side) {
  if (g.dead) return;
  g.down = true; g.side = side || 0;
  if (!g.vhold) tryAttach(g);
}
export function release(g) {
  if (g.dead) return;
  if (!g.down && !g.vhold) return;
  g.down = false; g.vhold = false;
  releaseRope(g);
}

function tryAttach(g) {
  if (!g.live || g.rope || g.dead) return false;
  const a = findTarget(g);
  if (!a) return false;
  const p = g.p;
  const dx = p.x - a.x, dy = p.y - a.y, d = Math.hypot(dx, dy) || 1;
  const nx = dx / d, ny = dy / d;
  const vn = p.vx * nx + p.vy * ny;
  let tx = p.vx - nx * vn, ty = p.vy - ny * vn;
  let sp = Math.hypot(tx, ty);
  if (g.side) {
    // Player picks the spin: left = clockwise, right = counterclockwise (screen coordinates, y down).
    const sx = g.side < 0 ? -ny : ny, sy = g.side < 0 ? nx : -nx;
    sp = Math.max(sp, Math.hypot(p.vx, p.vy) * 0.6);
    tx = sx * sp; ty = sy * sp;
  } else if (sp < 1) { tx = -ny; ty = nx; if (ty > 0) { tx = -tx; ty = -ty; } sp = 1; }
  const s = clamp(Math.max(sp, MINV), MINV, VROPE);
  p.vx = (tx / sp) * s; p.vy = (ty / sp) * s;
  g.rope = a; g.L = Math.max(MINL, d);
  if (g.hint === 1) g.hint = 2;
  burst(g, a.x, a.y, 'amber', 8, 120);
  g.events.push({ t: 'attach' });
  return true;
}

function releaseRope(g) {
  if (!g.rope) return;
  const next = pickNext(g);
  const perfect = !g.demo && alignedWith(g, next);
  g.lastRope = g.rope; g.rope = null; g.flights++;
  if (g.hint === 0) g.hint = 1;
  if (perfect) {
    const p = g.p, sp = Math.hypot(p.vx, p.vy), boost = Math.min(VFREE, sp * 1.08) / (sp || 1);
    p.vx *= boost; p.vy *= boost;
    g.combo++; g.comboT = COMBO_T; g.maxCombo = Math.max(g.maxCombo, g.combo);
    const pts = Math.round(30 * multOf(g));
    g.bonus += pts; g.stats.perfects++;
    g.stats.maxMult = Math.max(g.stats.maxMult, multOf(g));
    floaty(g, 'PERFECT +' + pts, p.x, p.y - 26, 'mint');
    burst(g, p.x, p.y, 'mint', 10, 150);
    g.events.push({ t: 'perfect', combo: g.combo });
  } else {
    g.events.push({ t: 'release' });
  }
}

function collect(g, o) {
  o.dead = true;
  if (o.kind === 2) {
    g.shield = true; g.stats.shields++;
    floaty(g, 'SHIELD', o.x, o.y - 12, 'cyan');
    burst(g, o.x, o.y, 'cyan', 16, 150);
    g.events.push({ t: 'shield' });
    return;
  }
  g.combo++; g.comboT = COMBO_T; g.maxCombo = Math.max(g.maxCombo, g.combo);
  const pts = Math.round((o.kind ? 50 : 10) * multOf(g));
  g.bonus += pts; g.orbsTaken++; g.stats.orbs++;
  if (o.kind) g.stats.stars++;
  g.stats.maxMult = Math.max(g.stats.maxMult, multOf(g));
  g.coinsRun += (o.kind ? 5 : 1) * coinValue(g);
  floaty(g, '+' + pts, o.x, o.y - 10, o.kind ? 'amber' : 'mint');
  burst(g, o.x, o.y, o.kind ? 'amber' : 'mint', o.kind ? 14 : 8, 140);
  g.events.push({ t: o.kind ? 'star' : 'orb', combo: g.combo });
}

function nearMiss(g) {
  const pts = Math.round(25 * multOf(g));
  g.bonus += pts; g.combo++; g.comboT = COMBO_T; g.maxCombo = Math.max(g.maxCombo, g.combo);
  g.stats.near++;
  g.stats.maxMult = Math.max(g.stats.maxMult, multOf(g));
  floaty(g, 'CLOSE +' + pts, g.p.x, g.p.y - 22, 'rose');
  if (g.opts.fx) g.shake = Math.max(g.shake, 4);
  g.events.push({ t: 'near' });
}

function die(g, why) {
  if (g.dead) return;
  g.dead = true; g.deadT = 0; g.rope = null; g.down = false;
  burst(g, g.p.x, g.p.y, 'ice', 26, 220);
  burst(g, g.p.x, g.p.y, 'amber', 14, 180);
  g.shake = g.opts.fx ? 16 : 0;
  g.events.push({ t: 'die', why });
}

// A hit either costs the shield or ends the run.
function hit(g, why, mine) {
  if (g.dead || g.invuln > 0) return;
  if (g.shield) {
    g.shield = false; g.invuln = 1.5;
    if (g.opts.fx) g.shake = Math.max(g.shake, 10);
    burst(g, g.p.x, g.p.y, 'cyan', 22, 220);
    floaty(g, 'SHIELD BROKEN', g.p.x, g.p.y - 26, 'cyan');
    if (why === 'mine' && mine) { mine.gone = true; burst(g, mine.x, mine.y, 'rose', 14, 200); }
    if (why === 'void') { g.voidY += 320; if (!g.rope) g.p.vy = Math.min(g.p.vy, -420); }
    g.events.push({ t: 'shield-break' });
    return;
  }
  die(g, why);
}

// Simple autopilot used for the menu background and for balance tests.
// skill (0..1) adds human-like hesitation when releasing.
export function bot(g, dt, skill) {
  g.botT -= dt;
  if (g.botT > 0) return;
  g.botT = 0.03;
  const sk = skill == null ? 1 : skill;
  if (g.rope) {
    if (g.aligned) {
      g.alignT = (g.alignT || 0) + 0.03;
      if (g.alignT > (1 - sk) * 0.25) { g.alignT = 0; g.down = false; g.vhold = false; releaseRope(g); }
    } else g.alignT = 0;
  } else if (!g.down) {
    const t = g.target;
    if (t && t !== g.lastRope && (t.y < g.p.y - 20 || g.p.vy > 150)) g.down = true;
  }
}

function stepSim(g, dt) {
  const p = g.p, live = g.live;
  g.t += dt;
  if (g.invuln > 0) g.invuln -= dt;
  if (g.shake > 0) g.shake = Math.max(0, g.shake - 40 * dt);
  if (g.comboT > 0) {
    g.comboT -= dt;
    if (g.comboT <= 0) { if (g.combo >= 6 && live && !g.demo) floaty(g, 'chain lost', p.x, p.y - 26, 'muted'); g.combo = 0; }
  }

  if (!live) {
    if (g.rope) { g.ang += dt * 3.2; p.x = g.rope.x + Math.cos(g.ang) * g.L; p.y = g.rope.y + Math.sin(g.ang) * g.L; }
  } else {
    if (g.demo) bot(g, dt, 1);
    p.vy += (g.rope ? GR_ROPE : GR_FREE) * dt;
    if (g.rope && g.L > MINL) {
      const nl = Math.max(MINL, g.L - REEL * dt), k = g.L / nl;
      p.vx *= k; p.vy *= k; g.L = nl;
    }
    const sp = Math.hypot(p.vx, p.vy), cap = g.rope ? VROPE : VFREE;
    if (sp > cap) { p.vx *= cap / sp; p.vy *= cap / sp; }
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (g.rope) {
      const a = g.rope, dx = p.x - a.x, dy = p.y - a.y, d = Math.hypot(dx, dy) || 0.001, nx = dx / d, ny = dy / d;
      if (d > g.L) { p.x = a.x + nx * g.L; p.y = a.y + ny * g.L; }
      const vn = p.vx * nx + p.vy * ny;
      if (d >= g.L - 0.5 && vn > 0) { p.vx -= nx * vn; p.vy -= ny * vn; }
    }
    if (p.x < 10) { p.x = 10; if (p.vx < 0) p.vx *= -0.8; }
    else if (p.x > W - 10) { p.x = W - 10; if (p.vx > 0) p.vx *= -0.8; }

    if (g.down && !g.rope) { g.autoT -= dt; if (g.autoT <= 0) { g.autoT = 0.04; tryAttach(g); } }

    if (p.y < g.minY) g.minY = p.y;
    const hm = heightM(g);

    if (g.demo) {
      // The background demo never dies: keep the void away and rescue falling players.
      g.voidY = p.y + 900;
      if (p.y > g.camY + g.VH + 30) {
        let best = null, bd = 1e9;
        for (const a of g.anchors) { const dd = Math.abs(a.y - g.camY - g.VH * 0.4); if (dd < bd) { bd = dd; best = a; } }
        if (best) { p.x = best.x + 70; p.y = best.y; p.vx = 0; p.vy = -300; g.rope = best; g.L = 70; g.down = false; }
      }
    } else {
      let vs = (38 + Math.min(175, hm * 0.5)) * slowOf(g);
      const ahead = g.voidY - p.y;
      if (ahead > 620) vs += (ahead - 620) * 0.35;
      if (g.t < 3) vs *= 0.3;
      g.voidY -= vs * dt;
      if (p.y > g.voidY - 2) hit(g, 'void');

      const mile = Math.floor(hm / 50);
      if (mile > g.mile) { g.mile = mile; g.events.push({ t: 'mile', m: mile * 50 }); }
      const sec = Math.floor(hm / SECTOR_M);
      if (sec > g.sector) { g.sector = sec; g.events.push({ t: 'sector', n: sec }); }
      if (!g.passedBest && g.opts.bestH > 5 && hm > g.opts.bestH) { g.passedBest = true; g.events.push({ t: 'best' }); }
    }
  }

  const mag = magOf(g);
  for (const o of g.orbs) {
    if (o.dead) continue;
    if (o.anc) { o.ang += o.w * dt; o.x = o.anc.x + Math.cos(o.ang) * o.rad; o.y = o.anc.y + Math.sin(o.ang) * o.rad; }
    if (!live || g.dead) continue;
    const dx = p.x - o.x, dy = p.y - o.y, d2 = dx * dx + dy * dy;
    if (mag > 0 && d2 < mag * mag && d2 > 1 && !g.demo) {
      const d = Math.sqrt(d2), pull = (1 - d / mag) * 420 * dt;
      o.anc = null; o.x += (dx / d) * pull; o.y += (dy / d) * pull;
    }
    const rr = PR + o.r + 3;
    if (d2 < rr * rr) collect(g, o);
  }

  for (const m of g.mines) {
    if (m.gone) continue;
    if (m.anc) { m.ang += m.w * dt; m.x = m.anc.x + Math.cos(m.ang) * m.rad; m.y = m.anc.y + Math.sin(m.ang) * m.rad; }
    else m.x = m.x0 + Math.sin(g.t * m.sp + m.ph) * m.amp;
    m.rot += dt * 1.2;
    if (!live || g.dead || g.demo) continue;
    const d = Math.hypot(p.x - m.x, p.y - m.y);
    if (d < m.r + PR - 1 && g.invuln <= 0) { hit(g, 'mine', m); if (g.dead) break; }
    else if (!m.nm && d < m.r + PR + 16) { m.nm = true; if (g.invuln <= 0) nearMiss(g); }
  }

  while (g.anchors[g.anchors.length - 1].y > g.camY - 900) spawnAnchor(g);
  if ((g.cull += dt) > 1) {
    g.cull = 0;
    const lim = Math.max(g.voidY, g.p.y) + 350;
    g.anchors = g.anchors.filter((a) => a.y < lim || a === g.rope);
    g.orbs = g.orbs.filter((o) => !o.dead && o.y < lim);
    g.mines = g.mines.filter((m) => !m.gone && m.y < lim);
  }

  if (g.tick++ % 3 === 0) { g.trail.push({ x: p.x, y: p.y }); if (g.trail.length > 22) g.trail.shift(); }
}

// state: 'play' | 'menu' | 'dying' | 'idle'
export function tick(g, rawDt, state) {
  const dt = Math.min(rawDt, 0.05);
  g.demo = state === 'menu';
  g.live = state === 'play' || state === 'menu';
  if (g.live) {
    g.acc += dt; let n = 0;
    while (g.acc >= STEP && n < 8) { stepSim(g, STEP); g.acc -= STEP; n++; }
    if (n >= 8) g.acc = 0;
  } else if (state === 'idle') {
    // paused: freeze the simulation
  } else {
    // dying: let the fx play out, nothing else moves
    g.t += dt;
    if (g.shake > 0) g.shake = Math.max(0, g.shake - 40 * dt);
  }
  if (state !== 'idle') {
    const fxDt = state === 'dying' ? dt * 0.4 : dt;
    for (const q of g.parts) { q.x += q.vx * fxDt; q.y += q.vy * fxDt; q.vy += 200 * fxDt; q.l -= fxDt; }
    g.parts = g.parts.filter((q) => q.l > 0);
    for (const f of g.fl) { f.y -= 40 * fxDt; f.l -= fxDt; }
    g.fl = g.fl.filter((f) => f.l > 0);
    if (state === 'dying') g.deadT += dt;
  }

  const target = g.p.y - g.VH * (state === 'menu' ? 0.45 : 0.62);
  if (target < g.camY) g.camY += (target - g.camY) * Math.min(1, dt * 7);

  if (g.live && !g.dead) {
    g.target = !g.rope ? findTarget(g) : null;
    g.next = g.rope ? pickNext(g) : null;
    g.aligned = g.rope ? alignedWith(g, g.next) : false;
  } else {
    g.target = null; g.next = null; g.aligned = false;
  }
}

export function revive(g) {
  g.revived = true; g.dead = false; g.deadT = 0;
  const p = g.p;
  let best = null, bd = 1e9;
  for (const a of g.anchors) {
    const d = Math.hypot(a.x - p.x, a.y - p.y) + (a.y > p.y + 60 ? 200 : 0);
    if (d < bd) { bd = d; best = a; }
  }
  best = best || g.anchors[g.anchors.length - 1];
  const side = best.x < W - 100 ? 1 : -1;
  p.x = best.x + 70 * side; p.y = best.y; p.vx = 0; p.vy = -320;
  g.rope = best; g.L = 70; g.voidY = p.y + 560; g.invuln = 2.2;
  g.combo = 0; g.comboT = 0; g.vhold = true; g.trail = []; g.hint = 2; g.down = false;
}

// Summary of a finished run, used for coins, score and missions.
export function summarize(g) {
  const hm = heightM(g);
  return {
    score: scoreOf(g), hm, orbs: g.stats.orbs, stars: g.stats.stars, near: g.stats.near,
    perfects: g.stats.perfects, shields: g.stats.shields, chain: g.maxCombo, maxMult: g.stats.maxMult,
    coins: Math.floor(g.coinsRun) + Math.floor(hm / 4),
  };
}
