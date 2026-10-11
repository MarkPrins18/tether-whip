// Skia renderer. drawScene() paints one frame of the game state onto a Skia canvas.
import { Platform } from 'react-native';
import { Skia, PaintStyle, StrokeCap, matchFont } from '@shopify/react-native-skia';
import { W, PR } from './game';

const col = (h) => Skia.Color(h);
export const COLORS = {
  ink: col('#0b0f2e'), glow: col('#1c2566'), ice: col('#eaf2ff'), muted: col('#9aa5e6'),
  amber: col('#ffb81f'), rose: col('#ff4d7e'), mint: col('#58f2c9'), voidDark: col('#2a0a3a'), voidDeep: col('#14041f'),
};

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
function namedColor(n) { return COLORS[n] || COLORS.ice; }

function wavePath(g, yOff, bot) {
  const path = Skia.Path.Make();
  path.moveTo(-10, bot);
  for (let x = -10; x <= W + 10; x += 10) {
    path.lineTo(x, g.voidY + yOff + Math.sin(x * 0.035 + g.t * 2.4) * 6 + Math.sin(x * 0.09 - g.t * 3.1) * 3);
  }
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

function drawStarOrb(c, o, pulse) {
  circle(c, o.x, o.y, 18 * pulse, COLORS.amber, 0.18);
  const path = Skia.Path.Make();
  for (let i = 0; i < 8; i++) {
    const r = i % 2 ? 4 : 11 * pulse, a = (i * Math.PI) / 4 - Math.PI / 2;
    const px = o.x + Math.cos(a) * r, py = o.y + Math.sin(a) * r;
    if (i === 0) path.moveTo(px, py); else path.lineTo(px, py);
  }
  path.close();
  fp.setColor(COLORS.amber); fp.setAlphaf(1); c.drawPath(path, fp);
}

export function drawScene(c, g, pxW, pxH, reduceMotion) {
  const S = pxW / W, VH = pxH / S;
  c.drawColor(COLORS.ink);
  c.save();
  c.scale(S, S);
  if (g.shake > 0.3 && !reduceMotion) c.translate((Math.random() - 0.5) * g.shake, (Math.random() - 0.5) * g.shake);

  // soft sky: stacked bands, lighter at the top
  for (let i = 0; i < 8; i++) rect(c, 0, (i * VH) / 8, W, VH / 8 + 1, COLORS.glow, 0.5 - i * 0.065);

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
  }

  // personal best line
  if (g.opts.bestH > 2) {
    const y = g.baseY - g.opts.bestH * 40;
    if (y > g.camY - 20 && y < g.camY + VH + 20) {
      dashed(c, 0, y, W, y, 1.5, COLORS.amber, 0.55);
      text(c, 'BEST ' + Math.floor(g.opts.bestH) + ' m', W - 8, y - 6, COLORS.amber, 0.8, 'right');
    }
  }

  // anchors
  for (const a of g.anchors) {
    if (a.y < g.camY - 60 || a.y > g.camY + VH + 60) continue;
    const tgt = g.target === a;
    circle(c, a.x, a.y, 17, COLORS.amber, 0.1);
    circle(c, a.x, a.y, 6, COLORS.amber, 1);
    ring(c, a.x, a.y, tgt ? 14 : 11, 1.5, COLORS.amber, tgt ? 1 : 0.45);
  }

  // grab preview
  if (g.target && !g.rope) dashed(c, g.p.x, g.p.y, g.target.x, g.target.y, 1.5, COLORS.mint, 0.45);

  // orbs
  for (const o of g.orbs) {
    if (o.dead || o.y < g.camY - 30 || o.y > g.camY + VH + 30) continue;
    const pulse = 1 + Math.sin(g.t * 5 + o.x) * 0.12;
    if (o.kind) drawStarOrb(c, o, pulse);
    else { circle(c, o.x, o.y, 12 * pulse, COLORS.mint, 0.16); circle(c, o.x, o.y, 5.5, COLORS.mint, 1); }
  }

  for (const m of g.mines) { if (m.y > g.camY - 40 && m.y < g.camY + VH + 40) drawMine(c, m); }

  // void
  const bot = g.camY + VH + 60;
  if (g.voidY < bot) {
    fp.setColor(COLORS.voidDark); fp.setAlphaf(0.93); c.drawPath(wavePath(g, 0, bot), fp);
    fp.setColor(COLORS.voidDeep); fp.setAlphaf(0.7); c.drawPath(wavePath(g, 60, bot), fp);
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
    line(c, g.trail[i - 1].x, g.trail[i - 1].y, g.trail[i].x, g.trail[i].y, 1 + k * 5, g.rope ? COLORS.amber : COLORS.ice, k * 0.5);
  }

  const hidden = g.dead || (g.invuln > 0 && Math.floor(g.t * 14) % 2 === 1);
  if (!hidden) {
    circle(c, p.x, p.y, 17, g.rope ? COLORS.amber : COLORS.ice, g.rope ? 0.2 : 0.16);
    circle(c, p.x, p.y, PR, COLORS.ice, 1);
  }

  for (const q of g.parts) circle(c, q.x, q.y, q.r, namedColor(q.c), Math.max(0, q.l / q.m));
  for (const f of g.fl) text(c, f.t, f.x, f.y, namedColor(f.c), Math.max(0, f.l / f.m), 'center');

  c.restore();
  c.restore();
}
