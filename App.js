import React, { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Canvas, Picture, Skia, createPicture } from '@shopify/react-native-skia';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { UPS, W, createGame, heightM, multOf, press, release, revive, scoreOf, tick, upCost, COMBO_T } from './src/game';
import { drawScene } from './src/render';
import { dailyInfo, loadSave, persistSave } from './src/storage';
import { Ads, setDemoAdUI } from './src/ads';

const T = {
  ink: '#0b0f2e', ink2: '#131a47', ink3: '#1c2566', line: '#2e3a8c', ice: '#eaf2ff', muted: '#9aa5e6',
  amber: '#ffb81f', amberDeep: '#a8730a', rose: '#ff4d7e', mint: '#58f2c9',
};
const fmt = (n) => Math.round(n).toLocaleString('en-US');

let hapticsOn = true;
const buzz = (kind) => {
  if (!hapticsOn) return;
  try {
    if (kind === 'sel') Haptics.selectionAsync().catch(() => {});
    else if (kind === 'die') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    else Haptics.impactAsync(kind === 'med' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  } catch (e) {}
};

/* ---------- small UI pieces ---------- */
function Btn({ label, onPress, kind, disabled, small }) {
  const k = kind || 'plain';
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.btn, small && s.btnSm,
        k === 'primary' && s.btnPrimary, k === 'ad' && s.btnAd,
        disabled && { opacity: 0.4 }, pressed && { transform: [{ translateY: 2 }] },
      ]}
    >
      <Text style={[s.btnText, small && { fontSize: 12 }, k === 'primary' && { color: '#1a1200' }, k === 'ad' && { color: T.mint, fontSize: small ? 12 : 13 }]}>{label}</Text>
    </Pressable>
  );
}

function Screen({ children, scroll }) {
  const insets = useSafeAreaInsets();
  const pad = { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 24 };
  if (scroll) return <ScrollView style={s.screen} contentContainerStyle={[s.screenIn, pad]}>{children}</ScrollView>;
  return <View style={[s.screen, s.screenIn, pad]}>{children}</View>;
}

/* ---------- Scene (canvas) and HUD, updated by the game loop through refs ---------- */
const Scene = memo(forwardRef(function Scene(_, ref) {
  const [pic, setPic] = useState(null);
  useImperativeHandle(ref, () => ({ setPic }), []);
  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      {pic ? <Picture picture={pic} /> : null}
    </Canvas>
  );
}));

const Hud = memo(forwardRef(function Hud(_, ref) {
  const insets = useSafeAreaInsets();
  const [d, setD] = useState({ score: 0, alt: 0, coins: 0, combo: 0, mult: 1, cbar: 0, hint: '' });
  const [banner, setBanner] = useState('');
  const [muted, setMuted] = useState(false);
  const op = useRef(new Animated.Value(0)).current;
  useImperativeHandle(ref, () => ({
    set: setD,
    banner: (t) => {
      setBanner(t); op.stopAnimation(); op.setValue(0);
      Animated.sequence([Animated.timing(op, { toValue: 1, duration: 160, useNativeDriver: true }), Animated.delay(700), Animated.timing(op, { toValue: 0, duration: 350, useNativeDriver: true })]).start();
    },
  }), [op]);
  return (
    <View style={[StyleSheet.absoluteFill, { paddingTop: insets.top + 12, paddingHorizontal: 16 }]} pointerEvents="box-none">
      <View style={s.hudTop} pointerEvents="box-none">
        <View pointerEvents="none">
          <Text style={s.lbl}>SCORE</Text>
          <Text style={s.big}>{fmt(d.score)}</Text>
          <Text style={s.sub}>{d.alt} m</Text>
          {d.combo >= 2 ? (
            <View style={s.combo}>
              <Text style={s.cmult}>x{d.mult.toFixed(1)}</Text>
              <Text style={s.sub}>{d.combo} chain</Text>
              <View style={s.cbarBg}><View style={[s.cbarFg, { width: `${Math.max(0, Math.min(1, d.cbar)) * 100}%` }]} /></View>
            </View>
          ) : null}
        </View>
        <View style={s.hudRight}>
          <View style={s.pill}><View style={s.dot} /><Text style={s.pillText}>{fmt(d.coins)}</Text></View>
          <Pressable onPress={() => setMuted((m) => { hapticsOn = m; return !m; })} style={s.pill} accessibilityRole="button">
            <Text style={[s.pillText, { color: T.muted, fontSize: 11 }]}>{muted ? 'HAPTICS OFF' : 'HAPTICS ON'}</Text>
          </Pressable>
        </View>
      </View>
      <Animated.Text style={[s.banner, { opacity: op }]} pointerEvents="none">{banner}</Animated.Text>
      {d.hint ? <Text style={[s.hint, { bottom: insets.bottom + 32 }]} pointerEvents="none">{d.hint}</Text> : null}
    </View>
  );
}));

/* ---------- Screens ---------- */
function goalText(save) {
  let best = null, bc = 1e9;
  for (const u of UPS) { const l = save.up[u.k]; if (l >= u.max) continue; const c = upCost(l); if (c < bc) { bc = c; best = u; } }
  if (!best) return 'Everything is maxed out.';
  if (save.coins >= bc) return 'You can afford ' + best.name + ' now.';
  return fmt(bc - save.coins) + ' more coins until ' + best.name + '.';
}

function Menu({ save, onPlay, onShop, onClaim }) {
  const d = dailyInfo(save);
  return (
    <Screen>
      <View>
        <Text style={s.title}>TETHER</Text>
        <Text style={[s.title, { color: T.amber }]}>WHIP</Text>
        <Text style={s.tag}>Hold to swing on an anchor. Let go to fly. Dodge the mines and outrun the void.</Text>
      </View>
      <View style={s.stack}>
        {d ? (
          <View style={s.daily}>
            <View><Text style={s.lbl}>DAILY BONUS</Text><Text style={s.body}>Day {d.streak} streak · +{d.coins} coins</Text></View>
            <View style={s.row2}>
              <View style={{ flex: 1 }}><Btn small kind="primary" label="Claim" onPress={() => onClaim(1)} /></View>
              <View style={{ flex: 1 }}><Btn small kind="ad" label={`x2 with ad (+${d.coins * 2})`} onPress={() => onClaim(2)} /></View>
            </View>
          </View>
        ) : null}
        <View style={s.stats}>
          <Text style={s.sub}>Best <Text style={s.statV}>{fmt(save.best)}</Text></Text>
          <Text style={s.sub}>Coins <Text style={s.statV}>{fmt(save.coins)}</Text></Text>
          {save.streak > 1 ? <Text style={s.sub}>{save.streak} day streak</Text> : null}
        </View>
        <Btn kind="primary" label="Play" onPress={onPlay} />
        <Btn label="Upgrades" onPress={onShop} />
      </View>
    </Screen>
  );
}

function Shop({ save, onBuy, onBack }) {
  return (
    <Screen scroll>
      <View>
        <Text style={s.lbl}>UPGRADES</Text>
        <Text style={s.h2}>Coins {fmt(save.coins)}</Text>
        {UPS.map((u) => {
          const lvl = save.up[u.k], maxed = lvl >= u.max, cost = upCost(lvl), can = !maxed && save.coins >= cost;
          return (
            <View key={u.k} style={s.shopRow}>
              <View style={{ flex: 1, gap: 5 }}>
                <Text style={s.shopName}>{u.name}</Text>
                <Text style={s.sub}>{u.desc}</Text>
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  {Array.from({ length: u.max }).map((_, i) => <View key={i} style={[s.pip, i < lvl && { backgroundColor: T.amber }]} />)}
                </View>
              </View>
              <Btn small kind={can ? 'primary' : 'plain'} disabled={!can} label={maxed ? 'Max' : fmt(cost) + ' coins'} onPress={() => onBuy(u.k)} />
            </View>
          );
        })}
      </View>
      <View style={{ marginTop: 24 }}><Btn kind="primary" label="Back" onPress={onBack} /></View>
    </Screen>
  );
}

function Revive({ hm, onYes, onNo }) {
  const [t, setT] = useState(5);
  const noRef = useRef(onNo); noRef.current = onNo;
  useEffect(() => {
    const t0 = Date.now();
    const id = setInterval(() => {
      const left = 5 - (Date.now() - t0) / 1000;
      if (left <= 0) { clearInterval(id); noRef.current(); } else setT(left);
    }, 100);
    return () => clearInterval(id);
  }, []);
  return (
    <Screen>
      <View>
        <Text style={s.lbl}>SWALLOWED AT {Math.floor(hm)} M</Text>
        <Text style={s.h2}>Second wind?</Text>
        <Text style={s.nudge}>Watch one short ad and restart from the nearest anchor. Your height and score stay.</Text>
      </View>
      <View style={s.stack}>
        <View style={s.barBg}><View style={[s.barFg, { width: `${(t / 5) * 100}%` }]} /></View>
        <Btn kind="primary" label="Revive with ad" onPress={onYes} />
        <Btn label={`No thanks (${Math.ceil(t)})`} onPress={onNo} />
      </View>
    </Screen>
  );
}

function Over({ over, save, onAgain, onShop, onDouble }) {
  const close = !over.newBest && over.prevBest > 0 && over.score >= over.prevBest * 0.8;
  const nudge = close ? 'Only ' + fmt(over.prevBest - over.score) + ' short of your best.' : goalText(save);
  return (
    <Screen>
      <View>
        <Text style={s.lbl}>RUN OVER</Text>
        <Text style={s.huge}>{fmt(over.score)}</Text>
        {over.newBest ? <View style={s.badge}><Text style={s.badgeText}>NEW BEST</Text></View> : null}
        <Text style={[s.sub, { marginTop: 8 }]}>{Math.floor(over.hm)} m · {over.orbs} orbs · best chain {over.chain}</Text>
        <Text style={s.nudge}>{nudge}</Text>
      </View>
      <View style={s.stack}>
        <Text style={s.earn}>+{fmt(over.doubled ? over.coins * 2 : over.coins)} coins</Text>
        {!over.doubled && over.coins >= 5 ? <Btn kind="ad" label={`Double coins +${fmt(over.coins)} with ad`} onPress={onDouble} /> : null}
        <Btn kind="primary" label="Again" onPress={onAgain} />
        <Btn label="Upgrades" onPress={onShop} />
      </View>
    </Screen>
  );
}

function DemoAd({ req }) {
  const dur = req.kind === 'reward' ? 3 : 2.5;
  const [t, setT] = useState(0);
  useEffect(() => {
    const t0 = Date.now();
    const id = setInterval(() => { const e = (Date.now() - t0) / 1000; setT(e); if (e >= dur) clearInterval(id); }, 100);
    return () => clearInterval(id);
  }, [dur]);
  const done = t >= dur;
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: T.ink }]}>
      <Screen>
        <View style={s.adbox}>
          <Text style={s.lbl}>DEMO AD SLOT</Text>
          <Text style={s.h2}>{req.kind === 'reward' ? 'Rewarded ad' : 'Ad break'}</Text>
          <Text style={s.nudge}>{req.kind === 'reward' ? 'Watch to the end to earn your reward.' : 'Back to the game in a moment.'}</Text>
          <View style={s.barBg}><View style={[s.barFg, { width: `${Math.min(1, t / dur) * 100}%` }]} /></View>
        </View>
        <View style={s.stack}>
          {done ? <Btn kind="primary" label={req.kind === 'reward' ? 'Claim reward' : 'Continue'} onPress={req.onDone} /> : null}
          {!done && req.kind === 'reward' ? <Btn label="Close, no reward" onPress={req.onCancel} /> : null}
        </View>
      </Screen>
    </View>
  );
}

/* ---------- Game controller ---------- */
function Game() {
  const [dims, setDims] = useState(null);
  const [save, setSave] = useState(null);
  const [screen, setScreen] = useState('menu');
  const [over, setOver] = useState(null);
  const [adReq, setAdReq] = useState(null);
  const [shopFrom, setShopFrom] = useState('menu');
  const [reviveHm, setReviveHm] = useState(0);
  const overRef = useRef(null);

  const gRef = useRef(null), modeRef = useRef('menu'), saveRef = useRef(null);
  const sceneRef = useRef(null), hudRef = useRef(null), dimsRef = useRef(null);
  const runsSinceAd = useRef(0), lastAdAt = useRef(Date.now()), lastSel = useRef(0);

  useEffect(() => { loadSave().then((sv) => { saveRef.current = sv; setSave(sv); }); }, []);

  const updateSave = useCallback((fn) => {
    const next = fn(saveRef.current);
    saveRef.current = next; setSave(next); persistSave(next);
  }, []);

  const optsNow = () => ({ up: saveRef.current.up, bestH: saveRef.current.bestH || 0 });
  const go = (mode, scr) => { modeRef.current = mode; setScreen(scr); };

  const newGame = () => { const d = dimsRef.current; gRef.current = createGame(optsNow(), d.h * (400 / d.w)); };

  useEffect(() => {
    if (dims && save && !gRef.current) { dimsRef.current = dims; newGame(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dims, save]);

  /* ads */
  const showAd = (kind, onDone, onCancel) => {
    const prev = modeRef.current;
    modeRef.current = 'ad';
    setAdReq({
      kind,
      onDone: () => { setAdReq(null); lastAdAt.current = Date.now(); runsSinceAd.current = 0; onDone(); },
      onCancel: () => { setAdReq(null); if (onCancel) onCancel(); else modeRef.current = prev; },
    });
  };
  useEffect(() => { setDemoAdUI(showAd); return () => setDemoAdUI(null); });
  const adDue = () => runsSinceAd.current >= 3 && Date.now() - lastAdAt.current > 75000;

  /* flow */
  const startRun = () => {
    newGame();
    const g = gRef.current;
    g.hint = saveRef.current.runs >= 2 ? 2 : 0;
    go('play', null);
    buzz('light');
  };
  const nextRun = () => { if (adDue()) Ads.interstitial(startRun); else startRun(); };

  const finish = () => {
    const g = gRef.current, sv = saveRef.current;
    const hm = heightM(g), sc = scoreOf(g);
    const coins = Math.floor(g.coinsRun) + Math.floor(hm / 4);
    const newBest = sc > sv.best, prevBest = sv.best;
    updateSave((o) => ({ ...o, best: newBest ? sc : o.best, bestH: Math.max(o.bestH || 0, hm), coins: o.coins + coins, runs: o.runs + 1 }));
    runsSinceAd.current++;
    const res = { score: sc, hm, orbs: g.orbsTaken, chain: g.maxCombo, coins, newBest, prevBest, doubled: false };
    overRef.current = res; setOver(res);
    go('over', 'over');
  };
  const afterDeath = () => {
    const g = gRef.current;
    if (!g.revived && heightM(g) >= 15) { setReviveHm(heightM(g)); go('revive', 'revive'); } else finish();
  };
  const doRevive = () => { revive(gRef.current); go('play', null); };

  const claim = (mult) => {
    const d = dailyInfo(saveRef.current); if (!d) return;
    const apply = (m) => updateSave((o) => ({ ...o, coins: o.coins + d.coins * m, streak: d.streak, lastDay: d.today, claimed: d.today }));
    if (mult === 1) apply(1); else Ads.rewarded('daily', () => { apply(2); go('menu', 'menu'); }, () => go('menu', 'menu'));
  };
  const buy = (k) => {
    updateSave((o) => {
      const lvl = o.up[k], u = UPS.find((x) => x.k === k);
      if (lvl >= u.max || o.coins < upCost(lvl)) return o;
      return { ...o, coins: o.coins - upCost(lvl), up: { ...o.up, [k]: lvl + 1 } };
    });
    buzz('med');
  };
  const doubleCoins = () => Ads.rewarded('double-coins', () => {
    const o = overRef.current;
    if (o && !o.doubled) {
      updateSave((sv) => ({ ...sv, coins: sv.coins + o.coins }));
      const n = { ...o, doubled: true }; overRef.current = n; setOver(n);
    }
    go('over', 'over');
  }, () => go('over', 'over'));

  /* main loop */
  useEffect(() => {
    if (!dims || !save) return undefined;
    let raf, last = 0, frame = 0;
    const loop = (ts) => {
      raf = requestAnimationFrame(loop);
      const now = ts / 1000;
      if (!last) { last = now; return; }
      const dt = now - last; last = now;
      const g = gRef.current;
      if (!g) return;
      let mode = modeRef.current;
      tick(g, dt, mode === 'play' || mode === 'menu' || mode === 'dying' ? mode : 'idle');

      for (const ev of g.events.splice(0)) {
        if (ev.t === 'attach') buzz('light');
        else if (ev.t === 'orb') { const n = Date.now(); if (n - lastSel.current > 60) { lastSel.current = n; buzz('sel'); } }
        else if (ev.t === 'near') buzz('med');
        else if (ev.t === 'die') buzz('die');
        else if (ev.t === 'mile' && hudRef.current) hudRef.current.banner(ev.m + ' m');
        else if (ev.t === 'best' && hudRef.current) hudRef.current.banner('New best');
      }
      if (mode === 'play' && g.dead) { modeRef.current = 'dying'; mode = 'dying'; }
      if (mode === 'dying' && g.deadT > 0.9) { modeRef.current = 'wait'; afterDeath(); }

      if (sceneRef.current) {
        const pic = createPicture((c) => drawScene(c, g, dims.w, dims.h, false), Skia.XYWHRect(0, 0, dims.w, dims.h));
        sceneRef.current.setPic(pic);
      }
      if (hudRef.current && (modeRef.current === 'play' || modeRef.current === 'dying') && frame++ % 2 === 0) {
        const sv = saveRef.current;
        hudRef.current.set({
          score: scoreOf(g), alt: Math.floor(heightM(g)), coins: Math.floor(g.coinsRun), combo: g.combo,
          mult: multOf(g), cbar: g.comboT / COMBO_T,
          hint: sv.runs >= 2 || g.hint >= 2 ? '' : g.hint === 0 ? 'TAP TO LET GO' : 'HOLD TO GRAB THE NEXT ANCHOR',
        });
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dims, save !== null]);

  /* touch */
  const onDown = () => { if (modeRef.current === 'play' && gRef.current) press(gRef.current); };
  const onUp = (e) => {
    if (modeRef.current !== 'play' || !gRef.current) return;
    const left = e && e.nativeEvent && e.nativeEvent.touches ? e.nativeEvent.touches.length : 0;
    if (left === 0) release(gRef.current);
  };

  return (
    <View
      style={s.root}
      onLayout={(e) => { const { width, height } = e.nativeEvent.layout; if (width > 0 && height > 0) { const d = { w: width, h: height }; dimsRef.current = d; setDims(d); } }}
    >
      <StatusBar style="light" />
      <Scene ref={sceneRef} />
      <View style={StyleSheet.absoluteFill} onTouchStart={onDown} onTouchEnd={onUp} onTouchCancel={onUp} />
      {screen === null ? <Hud ref={hudRef} /> : null}
      {save && screen === 'menu' ? <Menu save={save} onPlay={startRun} onShop={() => { setShopFrom('menu'); setScreen('shop'); }} onClaim={claim} /> : null}
      {save && screen === 'shop' ? <Shop save={save} onBuy={buy} onBack={() => setScreen(shopFrom === 'over' ? 'over' : 'menu')} /> : null}
      {screen === 'revive' && !adReq ? <Revive hm={reviveHm} onYes={() => Ads.rewarded('revive', doRevive, finish)} onNo={finish} /> : null}
      {save && over && screen === 'over' ? <Over over={over} save={save} onAgain={nextRun} onShop={() => { setShopFrom('over'); setScreen('shop'); }} onDouble={doubleCoins} /> : null}
      {adReq ? <DemoAd req={adReq} /> : null}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Game />
    </SafeAreaProvider>
  );
}

/* ---------- Styles ---------- */
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.ink },
  lbl: { color: T.muted, fontSize: 10, letterSpacing: 1.6, fontWeight: '500' },
  sub: { color: T.muted, fontSize: 13 },
  body: { color: T.ice, fontSize: 14 },
  big: { color: T.ice, fontSize: 34, fontWeight: '800', fontVariant: ['tabular-nums'] },
  hudTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  hudRight: { alignItems: 'flex-end', gap: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1, borderColor: T.line, borderRadius: 999, backgroundColor: 'rgba(19,26,71,0.75)' },
  pillText: { color: T.ice, fontSize: 14, fontVariant: ['tabular-nums'] },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: T.mint },
  combo: { marginTop: 12, maxWidth: 200 },
  cmult: { color: T.amber, fontSize: 24, fontWeight: '800' },
  cbarBg: { height: 3, backgroundColor: T.ink3, marginTop: 6, width: 120 },
  cbarFg: { height: 3, backgroundColor: T.amber },
  banner: { position: 'absolute', left: 16, right: 16, top: '26%', textAlign: 'center', color: T.amber, fontSize: 40, fontWeight: '800' },
  hint: { position: 'absolute', left: 16, right: 16, textAlign: 'center', color: T.ice, fontSize: 13, fontWeight: '700', letterSpacing: 1 },
  screen: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(11,15,46,0.88)' },
  screenIn: { flexGrow: 1, justifyContent: 'space-between', gap: 20, paddingHorizontal: 16 },
  title: { color: T.ice, fontSize: 64, lineHeight: 60, fontWeight: '900', letterSpacing: -1.5 },
  tag: { color: T.muted, fontSize: 14, marginTop: 16, maxWidth: 280, lineHeight: 20 },
  stack: { gap: 12 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, columnGap: 22 },
  statV: { color: T.ice },
  daily: { borderWidth: 1, borderColor: T.line, borderRadius: 6, padding: 12, backgroundColor: 'rgba(19,26,71,0.72)', gap: 10 },
  row2: { flexDirection: 'row', gap: 8 },
  btn: { backgroundColor: T.ink3, borderRadius: 14, paddingVertical: 17, paddingHorizontal: 18, alignItems: 'center' },
  btnSm: { paddingVertical: 11, paddingHorizontal: 12, borderRadius: 10 },
  btnPrimary: { backgroundColor: T.amber, borderBottomWidth: 4, borderBottomColor: T.amberDeep },
  btnAd: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: T.mint },
  btnText: { color: T.ice, fontSize: 15, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  h2: { color: T.ice, fontSize: 30, fontWeight: '800', textTransform: 'uppercase', marginTop: 6, marginBottom: 10 },
  huge: { color: T.ice, fontSize: 72, fontWeight: '900', marginVertical: 6, fontVariant: ['tabular-nums'] },
  nudge: { color: T.muted, fontSize: 14, marginTop: 10, maxWidth: 300, lineHeight: 20 },
  badge: { alignSelf: 'flex-start', backgroundColor: T.amber, paddingVertical: 4, paddingHorizontal: 10 },
  badgeText: { color: '#1a1200', fontWeight: '800', fontSize: 11, letterSpacing: 1.2 },
  earn: { color: T.mint, fontSize: 18, fontWeight: '700' },
  shopRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: T.line },
  shopName: { color: T.ice, fontSize: 14, fontWeight: '700', textTransform: 'uppercase' },
  pip: { width: 16, height: 6, backgroundColor: T.ink3 },
  barBg: { height: 6, backgroundColor: T.ink3 },
  barFg: { height: 6, backgroundColor: T.mint },
  adbox: { borderWidth: 1, borderColor: T.line, borderStyle: 'dashed', padding: 20, backgroundColor: 'rgba(19,26,71,0.7)', gap: 6 },
});
