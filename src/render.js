// Skia renderer. drawScene() paints one frame of the game state onto a Skia canvas.
import { Platform } from 'react-native';
import { Skia, PaintStyle, StrokeCap, matchFont } from '@shopify/react-native-skia';
import { W, PR, SECTOR_M, heightM, sectorName } from './game';
import { SKINS } from './store';

const col = (h) => Skia.Color(h);
export const COLORS = {
  ink: col('#0b0f2e'), ice: col('#eaf2ff'), muted: col('#9aa5e6'), amber: col('#ffb81f'), rose: col('#ff4d7e'),
  mint: col('#58f2c9'), cyan: col('#6fd8ff'), voidDark: col('#2a0a3a'), voidDeep: col('#14041f'),
};

// Sky palette per sector (every 100 m). The colours blend over the first metres of a new sector.
const SECTORS = [
  { name: 'Basin', top: [23, 31, 92], bot: [11, 15, 46] },
  { name: 'Drift', top: [16, 64, 104], bot: [7, 24, 46] },
  { name: 'Storm', top: [66, 34, 124], bot: [20, 10, 46] },
  { name: 'Ember', top: [112, 34, 62], bot: [34, 10, 22] },
  { name: 'Zenith', top: [14, 98, 90], bot: [5, 30, 28] },
];

const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const rgb = (c) => Skia.Color('rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')');

const skinCache = {};
function skinColors(id) {
  if (!skinCache[id]) {
    const s = SKINS.find((k) => k.id === id) || SKINS[0];
    skinCache[id] = { a: col(s.a), b: col(s.b) };
  }
  return skinCache[id];
}

const fp = Skia.Paint(); fp.setAntiAlias(true);
const sp = Skia.Paint(); sp.setAntiAlias(true); sp.setStyle(PaintStyle.Stroke); sp.setStrokeCap(StrokeCap.Round);

let dash = null, font = null, fontTried = false;
function getDash() { if (!dash) { try { dash = Skia.PathEffect.MakeDash([6, 6], 0); } catch (e) { dash = null; } } return dash; }
function getFont() {
  if (!fontTried) {
    fontTried = true;
    try { font = matchFont({ fontFamily: Platform.select({ ios: 'Helvetica', default: 'sans-serif' }), fontSize: 13, fontWeight: '500' }); } catch (e) { font = null; }
  }
  return font;
}

const stars = [];
for (let i = 0; i < 70; i++) stars.push({ x: Math.random() * W, y: Math.random(), z: 0.08 + Math.random() * 0.32, r: 0.8 + Math.random() * 1.2, a: 0.2 + Math.random() * 0.5 });

function circle(c, x, y, r, color, a) { fp.setColor(color); fp.setAlphaf(a == null ? 1 : a); c.drawCircle(x, y, r, fp); }
function ring(c, x, y, r, w, color, a) { sp.setColor(color); sp.setAlphaf(a == null ? 1 : a); sp.setStrokeWidth(w); sp.setPathEffect(null); c.drawCircle(x, y, r, sp); }
function line(c, x1, y1, x2, y2, w, color, a) { sp.setColor(color); sp.setAlphaf(a == null ? 1 : a); sp.setStrokeWidth(w); sp.setPathEffect(null); c.drawLine(x1, y1, x2, y2, sp); }
function dashed(c, x1, y1, x2, y2, w, color, a) { sp.setColor(color); sp.setAlphaf(a); sp.setStrokeWidth(w); sp.setPathEffect(getDash()); c.drawLine(x1, y1, x2, y2, sp); sp.setPathEffect(null); }
function rect(c, x, y, w, h, color, a) { fp.setColor(color); fp.setAlphaf(a == null ? 1 : a); c.drawRect(Skia.XYWHRect(x, y, w, h), fp); }
function text(c, str, x, y, color, a, align) {
  const f = getFont(); if (!f) return;
  let w = 0; try { w = f.getTextWidth ? f.getTextWidth(str) : str.length * 7; } catch (e) { w = str.length * 7; }
  fp.setColor(color); fp.setAlphaf(a == null ? 1 : a);
  c.drawText(str, align === 'center' ? x - w / 2 : align === 'right' ? x - w : x, y, fp, f);
}
function named(n) { return COLORS[n] || COLORS.ice; }

function wavePath(g, yOff, bot) {
  const path = Skia.Path.Make();
  path.moveTo(-10, bot);
  for (let x = -10; x <= W + 10; x += 10) path.lineTo(x, g.voidY + yOff + Math.sin(x * 0.035 + g.t * 2.4) * 6 + Math.sin(x * 0.09 - g.t * 3.1) * 3);
  path.lineTo(W + 10, bot);
  path.close();
  return path;
}

function drawMine(c, m) {
  circle(c, m.x, m.y, m.r * 2, COLORS.rose, 0.14);
  const path = Skia.Path.Make();
  for (let i = 0; i < 16; i++) {
    const r = i % 2 ? m.r * 0.62 : m.r * 1.25, a = (i * Math.PI) / 8 + m.rot;
    const px = m.x + Math.cos(a) * r, py = m.y + Math.sin(a) * r;
    if (i === 0) path.moveTo(px, py); else path.lineTo(px, py);
  }
  path.close();
  fp.setColor(COLORS.rose); fp.setAlphaf(1); c.drawPath(path, fp);
  circle(c, m.x, m.y, m.r * 0.38, COLORS.ink, 1);
}

function polygon(c, x, y, n, rOuter, rInner, rot, color) {
  const path = Skia.Path.Make();
  for (let i = 0; i < n; i++) {
    const r = rInner && i % 2 ? rInner : rOuter, a = (i * Math.PI * 2) / n + rot;
    const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
    if (i === 0) path.moveTo(px, py); else path.lineTo(px, py);
  }
  path.close();
  fp.setColor(color); fp.setAlphaf(1); c.drawPath(path, fp);
}

export function drawScene(c, g, pxW, pxH, skinId) {
  const S = pxW / W, VH = pxH / S;
  const skin = skinColors(skinId || 'classic');
  c.drawColor(COLORS.ink);
  c.save();
  c.scale(S, S);
  if (g.shake > 0.3 && g.opts.fx) c.translate((Math.random() - 0.5) * g.shake, (Math.random() - 0.5) * g.shake);

  // sky, blended between sectors
  const hm = heightM(g);
  const sec = Math.floor(hm / SECTOR_M), t = Math.min(1, (hm - sec * SECTOR_M) / 12);
  const cur = SECTORS[sec % SECTORS.length], prev = SECTORS[(sec + SECTORS.length - 1) % SECTORS.length];
  const top = sec === 0 ? cur.top : mix(prev.top, cur.top, t), bot = sec === 0 ? cur.bot : mix(prev.bot, cur.bot, t);
  const BANDS = 14;
  for (let i = 0; i < BANDS; i++) {
    const k = i / (BANDS - 1);
    fp.setColor(rgb(mix(top, bot, k))); fp.setAlphaf(1);
    c.drawRect(Skia.XYWHRect(0, (i * VH) / BANDS, W, VH / BANDS + 1), fp);
  }

  for (const s of stars) {
    const y = (((s.y * VH - g.camY * s.z) % VH) + VH) % VH;
    rect(c, s.x, y, s.r, s.r, COLORS.ice, s.a);
  }

  c.save();
  c.translate(0, -g.camY);

  // altitude ticks every 10 m, labelled every 50 m
  const mTop = (g.baseY - (g.camY + VH)) / 40, mBot = (g.baseY - g.camY) / 40;
  for (let m = Math.max(0, Math.ceil(mTop / 10) * 10); m <= mBot; m += 10) {
    const y = g.baseY - m * 40, big = m % 50 === 0;
    rect(c, 0, y, big ? 16 : 7, 1, COLORS.muted, big ? 0.5 : 0.22);
    if (big && m > 0) text(c, m + ' m', 20, y + 4, COLORS.muted, 0.6, 'left');
    if (m % SECTOR_M === 0 && m > 0) {
      dashed(c, 0, y, W, y, 1, COLORS.ice, 0.18);
      text(c, 'SECTOR ' + (m / SECTOR_M + 1) + ' · ' + sectorName(m / SECTOR_M).toUpperCase(), W - 8, y - 6, COLORS.ice, 0.35, 'right');
    }
  }

  // personal best line
  if (!g.demo && g.opts.bestH > 2) {
    const y = g.baseY - g.opts.bestH * 40;
    if (y > g.camY - 20 && y < g.camY + VH + 20) {
      dashed(c, 0, y, W, y, 1.5, COLORS.amber, 0.55);
      text(c, 'BEST ' + Math.floor(g.opts.bestH) + ' m', W - 8, y - 6, COLORS.amber, 0.8, 'right');
    }
  }

  // anchors
  for (const a of g.anchors) {
    if (a.y < g.camY - 60 || a.y > g.camY + VH + 60) continue;
    const tgt = g.target === a || (g.aligned && g.next === a);
    circle(c, a.x, a.y, 17, COLORS.amber, 0.1);
    circle(c, a.x, a.y, 6, COLORS.amber, 1);
    ring(c, a.x, a.y, tgt ? 14 : 11, 1.5, tgt && g.aligned ? COLORS.mint : COLORS.amber, tgt ? 1 : 0.45);
  }

  // grab preview (free) or release guide (on the rope)
  if (!g.demo) {
    if (g.target && !g.rope) dashed(c, g.p.x, g.p.y, g.target.x, g.target.y, 1.5, COLORS.mint, 0.45);
    if (g.next && g.rope) {
      if (g.aligned) {
        line(c, g.p.x, g.p.y, g.next.x, g.next.y, 3, COLORS.mint, 0.85);
        ring(c, g.next.x, g.next.y, 22 + Math.sin(g.t * 14) * 2, 2, COLORS.mint, 0.9);
      } else dashed(c, g.p.x, g.p.y, g.next.x, g.next.y, 1.5, COLORS.amber, 0.28);
    }
  }

  // orbs
  for (const o of g.orbs) {
    if (o.dead || o.y < g.camY - 30 || o.y > g.camY + VH + 30) continue;
    const pulse = 1 + Math.sin(g.t * 5 + o.x) * 0.12;
    if (o.kind === 1) {
      circle(c, o.x, o.y, 18 * pulse, COLORS.amber, 0.18);
      polygon(c, o.x, o.y, 8, 11 * pulse, 4, -Math.PI / 2, COLORS.amber);
    } else if (o.kind === 2) {
      circle(c, o.x, o.y, 20 * pulse, COLORS.cyan, 0.18);
      polygon(c, o.x, o.y, 6, 11 * pulse, 0, g.t, COLORS.cyan);
      circle(c, o.x, o.y, 4, COLORS.ink, 1);
    } else {
      circle(c, o.x, o.y, 12 * pulse, COLORS.mint, 0.16);
      circle(c, o.x, o.y, 5.5, COLORS.mint, 1);
    }
  }

  for (const m of g.mines) { if (!m.gone && m.y > g.camY - 40 && m.y < g.camY + VH + 40) drawMine(c, m); }

  // void
  const bot2 = g.camY + VH + 60;
  if (g.voidY < bot2) {
    fp.setColor(COLORS.voidDark); fp.setAlphaf(0.93); c.drawPath(wavePath(g, 0, bot2), fp);
    fp.setColor(COLORS.voidDeep); fp.setAlphaf(0.7); c.drawPath(wavePath(g, 60, bot2), fp);
    const edge = Skia.Path.Make();
    for (let x = -10; x <= W + 10; x += 10) {
      const y = g.voidY + Math.sin(x * 0.035 + g.t * 2.4) * 6 + Math.sin(x * 0.09 - g.t * 3.1) * 3;
      if (x === -10) edge.moveTo(x, y); else edge.lineTo(x, y);
    }
    sp.setPathEffect(null); sp.setColor(COLORS.rose); sp.setAlphaf(0.28); sp.setStrokeWidth(8); c.drawPath(edge, sp);
    sp.setAlphaf(1); sp.setStrokeWidth(2); c.drawPath(edge, sp);
  }

  const p = g.p;
  if (g.rope) {
    line(c, g.rope.x, g.rope.y, p.x, p.y, 7, COLORS.amber, 0.3);
    line(c, g.rope.x, g.rope.y, p.x, p.y, 2.5, COLORS.amber, 1);
  }

  for (let i = 1; i < g.trail.length; i++) {
    const k = i / g.trail.length;
    line(c, g.trail[i - 1].x, g.trail[i - 1].y, g.trail[i].x, g.trail[i].y, 1 + k * 5, g.rope ? COLORS.amber : skin.b, k * 0.55);
  }

  const hidden = g.dead || (g.invuln > 0 && Math.floor(g.t * 14) % 2 === 1);
  if (!hidden) {
    circle(c, p.x, p.y, 17, g.rope ? COLORS.amber : skin.b, 0.22);
    circle(c, p.x, p.y, PR, skin.a, 1);
    if (g.shield) ring(c, p.x, p.y, 17 + Math.sin(g.t * 8) * 1.5, 2.5, COLORS.cyan, 0.9);
  }

  for (const q of g.parts) circle(c, q.x, q.y, q.r, named(q.c), Math.max(0, q.l / q.m));
  for (const f of g.fl) text(c, f.t, f.x, f.y, named(f.c), Math.max(0, f.l / f.m), 'center');

  c.restore();
  c.restore();
}
