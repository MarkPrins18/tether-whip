import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, BackHandler, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Unbounded_800ExtraBold } from '@expo-google-fonts/unbounded/800ExtraBold';
import { Unbounded_600SemiBold } from '@expo-google-fonts/unbounded/600SemiBold';
import { DMMono_400Regular } from '@expo-google-fonts/dm-mono/400Regular';
import { DMMono_500Medium } from '@expo-google-fonts/dm-mono/500Medium';

import { UPS, COMBO_T, createGame, heightM, multOf, press, release, revive, scoreOf, sectorName, sectorOf, summarize, tick, upCost } from './src/game';
import { SKINS, dailyInfo, defaultSave, flushSave, loadSave, persistSave } from './src/store';
import { evaluate, pickMissions } from './src/missions';
import { Ads, initAds, setDemoAdUI } from './src/ads';
import { initAudio, play, playOrb, setSoundEnabled } from './src/audio';
import { haptic, setHapticsEnabled } from './src/haptics';
import { Toast } from './src/ui/kit';
import { fmt, T } from './src/theme';
import { HowTo, Menu } from './src/screens/Menu';
import { Missions, Settings, Shop } from './src/screens/Shop';
import { DemoAd, GameOver, Hud, Pause, Revive } from './src/screens/Run';

const BOOT_KEY = 'tetherwhip.boot';
const AD_COINS = 50, AD_COOLDOWN = 2 * 60 * 1000;

function goalText(save) {
  let best = null, bc = 1e9;
  for (const u of UPS) { const l = save.up[u.k]; if (l >= u.max) continue; const c = upCost(l); if (c < bc) { bc = c; best = u; } }
  if (!best) return 'Everything is maxed out.';
  if (save.coins >= bc) return 'You can afford ' + best.name + ' now.';
  return fmt(bc - save.coins) + ' more coins until ' + best.name + '.';
}

function Game() {
  const [fontsLoaded, fontError] = useFonts({ Unbounded_800ExtraBold, Unbounded_600SemiBold, DMMono_400Regular, DMMono_500Medium });
  const [dims, setDims] = useState(null);
  const [save, setSave] = useState(null);
  const [screen, setScreen] = useState('menu');   // menu | shop | missions | settings | how | pause | revive | over | null (playing)
  const [over, setOver] = useState(null);
  const [adReq, setAdReq] = useState(null);
  const [toast, setToast] = useState('');
  const [shopTab, setShopTab] = useState('up');
  const [reviveHm, setReviveHm] = useState(0);
  const [SceneComp, setSceneComp] = useState(null);
  const [adReady, setAdReady] = useState(false);
  const [splashDone, setSplashDone] = useState(false);

  const gRef = useRef(null), modeRef = useRef('ui'), saveRef = useRef(null), overRef = useRef(null);
  const sceneRef = useRef(null), hudRef = useRef(null), dimsRef = useRef(null), sceneMod = useRef(null);
  const runsSinceAd = useRef(0), lastAdAt = useRef(Date.now()), lastSel = useRef(0);
  const dirty = useRef(true), downRef = useRef(false), countRef = useRef(0), safeBoot = useRef(false);
  const navFrom = useRef({ shop: 'menu', settings: 'menu', how: 'menu' });
  const screenRef = useRef('menu');
  screenRef.current = screen;

  /* ---------- helpers ---------- */
  const say = useCallback((text) => { setToast(''); setTimeout(() => setToast(text), 30); }, []);
  const updateSave = useCallback((fn) => {
    const next = fn(saveRef.current);
    saveRef.current = next; setSave(next); persistSave(next);
  }, []);
  const go = (mode, scr) => { modeRef.current = mode; dirty.current = true; setScreen(scr); };
  const optsNow = () => ({ up: saveRef.current.up, bestH: saveRef.current.bestH || 0, fx: saveRef.current.settings.fx });
  const newGame = () => {
    const d = dimsRef.current || { w: 400, h: 800 };
    gRef.current = createGame(optsNow(), d.h * (400 / d.w));
  };
  const applySettings = (st) => { setSoundEnabled(st.sound); setHapticsEnabled(st.haptics); };

  /* ---------- startup ---------- */
  useEffect(() => {
    loadSave().then((sv) => { saveRef.current = sv; applySettings(sv.settings); setSave(sv); });
    initAudio();
    initAds();
    const id = setInterval(() => setAdReady(Ads.rewardReady()), 1500);
    return () => clearInterval(id);
  }, []);

  const ready = !!(dims && save && (fontsLoaded || fontError));
  useEffect(() => {
    if (ready && !gRef.current) { dimsRef.current = dims; newGame(); go('menu', 'menu'); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);
  useEffect(() => {
    if (ready && !splashDone) { setSplashDone(true); SplashScreen.hideAsync().catch(() => {}); }
  }, [ready, splashDone]);
  useEffect(() => { const t = setTimeout(() => SplashScreen.hideAsync().catch(() => {}), 4000); return () => clearTimeout(t); }, []);

  // Load the Skia scene once. A marker detects a native crash during that step so the next launch can start without it.
  const mountScene = useCallback(async () => {
    if (sceneMod.current) return;
    try { await AsyncStorage.setItem(BOOT_KEY, '1'); } catch (e) {}
    sceneMod.current = require('./src/Scene').default;
    setSceneComp(() => sceneMod.current);
    setTimeout(() => { AsyncStorage.removeItem(BOOT_KEY).catch(() => {}); }, 2500);
  }, []);
  useEffect(() => {
    if (!ready) return;
    (async () => {
      let crashed = false;
      try { crashed = (await AsyncStorage.getItem(BOOT_KEY)) === '1'; } catch (e) {}
      safeBoot.current = crashed;
      if (!crashed) mountScene();
      else AsyncStorage.removeItem(BOOT_KEY).catch(() => {});
    })();
  }, [ready, mountScene]);

  /* ---------- ads ---------- */
  const showDemoAd = (kind, onDone, onCancel) => {
    const prev = modeRef.current;
    modeRef.current = 'ad';
    setAdReq({
      kind,
      onDone: () => { setAdReq(null); lastAdAt.current = Date.now(); runsSinceAd.current = 0; modeRef.current = prev; onDone(); },
      onCancel: () => { setAdReq(null); modeRef.current = prev; if (onCancel) onCancel(); },
    });
  };
  useEffect(() => { setDemoAdUI(showDemoAd); return () => setDemoAdUI(null); });

  // Wrap rewarded ads: the loop ignores input while a real ad covers the screen.
  const rewarded = (label, ok, no) => {
    const prev = modeRef.current;
    const restore = () => { if (modeRef.current === 'ad') modeRef.current = prev; };
    if (Ads.real()) modeRef.current = 'ad';
    Ads.rewarded(
      label,
      () => { restore(); lastAdAt.current = Date.now(); if (ok) ok(); },
      () => { restore(); if (no) no(); },
      () => { restore(); say('No ad available right now. Try again soon.'); if (no) no(); },
    );
  };
  const adDue = () => saveRef.current.runs >= 3 && runsSinceAd.current >= 3 && Date.now() - lastAdAt.current > 90000;

  /* ---------- run flow ---------- */
  const ensureScene = () => { if (!sceneMod.current) mountScene(); };
  const startRun = () => {
    ensureScene();
    newGame();
    const g = gRef.current;
    g.hint = saveRef.current.runs >= 3 ? 2 : 0;
    countRef.current = 0; downRef.current = false;
    go('play', null);
    play('click');
  };
  const toMenu = () => { newGame(); go('menu', 'menu'); };
  const onPlay = () => {
    if (!saveRef.current.seenHow) { navFrom.current.how = 'play'; go('ui', 'how'); return; }
    startRun();
  };
  const nextRun = () => { if (adDue()) { Ads.interstitial(() => { lastAdAt.current = Date.now(); runsSinceAd.current = 0; startRun(); }); } else startRun(); };

  const finish = () => {
    const g = gRef.current, sv = saveRef.current;
    const sm = summarize(g);
    const ev = evaluate(sv.missions, sm);
    const bonus = ev.done.reduce((a, m) => a + m.reward, 0);
    const newBest = sm.score > sv.best, prevBest = sv.best;
    updateSave((o) => ({
      ...o, best: newBest ? sm.score : o.best, bestH: Math.max(o.bestH || 0, sm.hm), coins: o.coins + sm.coins + bonus,
      runs: o.runs + 1, orbsTotal: o.orbsTotal + sm.orbs, missions: ev.ids,
    }));
    runsSinceAd.current++;
    const res = { ...sm, newBest, prevBest, doubled: false, done: ev.done };
    overRef.current = res; setOver(res);
    flushSave();
    go('ui', 'over');
    if (ev.done.length) play('coin'); else if (newBest) play('perfect');
  };
  const afterDeath = () => {
    const g = gRef.current;
    if (!g.revived && heightM(g) >= 15 && Ads.rewardReady()) { setReviveHm(heightM(g)); go('ui', 'revive'); } else finish();
  };
  const startCountdown = () => { countRef.current = 3; go('countdown', null); };
  const doRevive = () => { revive(gRef.current); haptic.success(); play('revive'); startCountdown(); };

  const pauseGame = () => { if (modeRef.current !== 'play') return; downRef.current = false; if (gRef.current) gRef.current.down = false; go('paused', 'pause'); };
  const resume = () => startCountdown();
  const restartFromPause = () => startRun();

  /* ---------- progress, shop ---------- */
  const claim = (mult) => {
    const d = dailyInfo(saveRef.current); if (!d) return;
    const apply = (m) => { updateSave((o) => ({ ...o, coins: o.coins + d.coins * m, streak: d.streak, lastDay: d.today, claimed: d.today })); play('coin'); haptic.success(); say('+' + d.coins * m + ' coins'); };
    if (mult === 1) apply(1); else rewarded('daily', () => apply(2));
  };
  const buy = (k) => {
    const o = saveRef.current, lvl = o.up[k], u = UPS.find((x) => x.k === k);
    if (lvl >= u.max || o.coins < upCost(lvl)) return;
    updateSave((s) => ({ ...s, coins: s.coins - upCost(lvl), up: { ...s.up, [k]: lvl + 1 } }));
    play('coin'); haptic.medium();
  };
  const buySkin = (id) => {
    const k = SKINS.find((x) => x.id === id), o = saveRef.current;
    if (!k || o.skins.includes(id) || o.coins < k.price) return;
    updateSave((s) => ({ ...s, coins: s.coins - k.price, skins: [...s.skins, id], skin: id }));
    play('coin'); haptic.medium(); say(k.name + ' equipped');
  };
  const equip = (id) => { updateSave((s) => (s.skins.includes(id) ? { ...s, skin: id } : s)); haptic.select(); };
  const freeCoins = () => {
    if (Date.now() - (saveRef.current.adCoinAt || 0) < AD_COOLDOWN) return;
    rewarded('free-coins', () => { updateSave((s) => ({ ...s, coins: s.coins + AD_COINS, adCoinAt: Date.now() })); play('coin'); haptic.success(); say('+' + AD_COINS + ' coins'); });
  };
  const doubleCoins = () => {
    const o = overRef.current; if (!o || o.doubled) return;
    rewarded('double-coins', () => {
      updateSave((s) => ({ ...s, coins: s.coins + o.coins }));
      const n = { ...o, doubled: true }; overRef.current = n; setOver(n); play('coin'); haptic.success();
    });
  };
  const changeSettings = (st) => { applySettings(st); updateSave((s) => ({ ...s, settings: st })); };
  const resetAll = () => {
    const d = defaultSave(); const sv = saveRef.current;
    const n = { ...d, settings: sv.settings, seenHow: true };
    saveRef.current = n; setSave(n); persistSave(n); flushSave(); newGame(); go('menu', 'menu'); say('Progress reset');
  };

  const openShop = (tab, from) => { navFrom.current.shop = from; setShopTab(tab); go('ui', 'shop'); };
  const back = (key, fallback) => { const to = navFrom.current[key] || fallback; if (to === 'over') go('ui', 'over'); else if (to === 'pause') go('paused', 'pause'); else go('menu', 'menu'); };

  /* ---------- system events: background and back button ---------- */
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      if (st !== 'active') { flushSave(); if (modeRef.current === 'play') pauseGame(); }
    });
    return () => sub.remove();
  });
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const sc = screenRef.current, mode = modeRef.current;
      if (mode === 'ad' || sc === 'revive') return true;
      if (sc === null && (mode === 'play' || mode === 'countdown')) { if (mode === 'play') pauseGame(); return true; }
      if (sc === 'pause') { resume(); return true; }
      if (sc === 'shop') { back('shop', 'menu'); return true; }
      if (sc === 'settings') { back('settings', 'menu'); return true; }
      if (sc === 'how') { back('how', 'menu'); return true; }
      if (sc === 'missions') { go('menu', 'menu'); return true; }
      if (sc === 'over') { toMenu(); return true; }
      return false;
    });
    return () => sub.remove();
  });

  /* ---------- main loop ---------- */
  useEffect(() => {
    if (!ready) return undefined;
    let raf, last = 0, frame = 0;
    const loop = (ts) => {
      raf = requestAnimationFrame(loop);
      try {
        const now = ts / 1000;
        if (!last) { last = now; return; }
        const dt = now - last; last = now;
        const g = gRef.current;
        if (!g) return;
        let mode = modeRef.current;

        if (mode === 'countdown') {
          countRef.current -= dt;
          if (countRef.current <= 0) { countRef.current = 0; modeRef.current = 'play'; mode = 'play'; if (hudRef.current) hudRef.current.set({ ...hudState(g), count: 0 }); }
        }
        const state = mode === 'play' ? 'play' : mode === 'menu' ? 'menu' : mode === 'dying' ? 'dying' : 'idle';
        tick(g, dt, state);

        if (state === 'play' || state === 'dying') {
          for (const ev of g.events.splice(0)) {
            if (ev.t === 'attach') { play('attach'); haptic.light(); }
            else if (ev.t === 'release') play('release');
            else if (ev.t === 'orb') { playOrb(ev.combo); const n = Date.now(); if (n - lastSel.current > 70) { lastSel.current = n; haptic.select(); } }
            else if (ev.t === 'star') { play('star'); haptic.medium(); }
            else if (ev.t === 'perfect') { play('perfect'); haptic.medium(); }
            else if (ev.t === 'near') { play('near'); haptic.medium(); }
            else if (ev.t === 'shield') { play('shield'); haptic.success(); }
            else if (ev.t === 'shield-break') { play('die'); haptic.heavy(); }
            else if (ev.t === 'die') { play('die'); haptic.error(); }
            else if (ev.t === 'mile' && hudRef.current) { play('mile'); hudRef.current.banner(ev.m + ' m'); }
            else if (ev.t === 'sector' && hudRef.current) { play('mile'); hudRef.current.banner('Sector ' + (ev.n + 1) + ' · ' + sectorName(ev.n)); }
            else if (ev.t === 'best' && hudRef.current) { play('perfect'); hudRef.current.banner('New best'); }
          }
        } else g.events.length = 0;

        if (mode === 'play' && g.dead) { modeRef.current = 'dying'; mode = 'dying'; downRef.current = false; }
        if (mode === 'dying' && g.deadT > 0.9) { modeRef.current = 'wait'; afterDeath(); }

        const sceneOn = state !== 'idle' || dirty.current;
        if (sceneRef.current && sceneOn) {
          const d = dimsRef.current;
          sceneRef.current.draw(g, d.w, d.h, saveRef.current.skin);
          if (state === 'idle') dirty.current = false;
        }
        if (hudRef.current && (mode === 'play' || mode === 'dying' || mode === 'countdown') && frame++ % 2 === 0) {
          hudRef.current.set({ ...hudState(g), count: mode === 'countdown' ? Math.ceil(countRef.current) : 0 });
        }
      } catch (e) { cancelAnimationFrame(raf); throw e; }
    };
    const hudState = (g) => {
      const sv = saveRef.current;
      let hint = '';
      if (g.hint === 0) hint = 'Release to fly';
      else if (g.hint === 1) hint = 'Hold to grab the next anchor';
      else if (sv.runs < 3 && g.rope && g.next && g.stats.perfects === 0 && g.flights >= 1) hint = 'Release when the line turns green';
      return {
        score: scoreOf(g), alt: Math.floor(heightM(g)), coins: Math.floor(g.coinsRun), combo: g.combo, mult: multOf(g), cbar: g.comboT / COMBO_T,
        hint, shield: g.shield, sector: sectorName(sectorOf(g)),
      };
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  /* ---------- touch ---------- */
  const onDown = () => { if (modeRef.current === 'play' && gRef.current) { downRef.current = true; press(gRef.current); } };
  const onUp = (e) => {
    if (modeRef.current !== 'play' || !gRef.current || !downRef.current) return;
    const left = e && e.nativeEvent && e.nativeEvent.touches ? e.nativeEvent.touches.length : 0;
    if (left === 0) { downRef.current = false; release(gRef.current); }
  };

  /* ---------- derived UI flags ---------- */
  const upgradeAffordable = !!save && UPS.some((u) => save.up[u.k] < u.max && save.coins >= upCost(save.up[u.k]));
  const skinAffordable = !!save && SKINS.some((k) => !save.skins.includes(k.id) && save.coins >= k.price);

  return (
    <View
      style={s.root}
      onLayout={(e) => { const { width, height } = e.nativeEvent.layout; if (width > 0 && height > 0) { const d = { w: width, h: height }; dimsRef.current = d; setDims(d); } }}
    >
      <StatusBar style="light" />
      {SceneComp ? <SceneComp ref={sceneRef} /> : null}
      <View style={StyleSheet.absoluteFill} onTouchStart={onDown} onTouchEnd={onUp} onTouchCancel={onUp} />
      {ready && screen === null ? <Hud ref={hudRef} onPause={pauseGame} /> : null}

      {ready && screen === 'menu' ? (
        <Menu
          save={save} adReady={adReady}
          onPlay={onPlay} onClaim={claim}
          onShop={() => openShop('up', 'menu')} onSkins={() => openShop('skin', 'menu')}
          onMissions={() => go('ui', 'missions')} onSettings={() => { navFrom.current.settings = 'menu'; go('ui', 'settings'); }}
          upgradeAffordable={upgradeAffordable} skinAffordable={skinAffordable} missionsReady={false}
        />
      ) : null}
      {ready && screen === 'shop' ? (
        <Shop save={save} tab={shopTab} onTab={setShopTab} onBuy={buy} onBuySkin={buySkin} onEquip={equip} onFreeCoins={freeCoins} onBack={() => back('shop', 'menu')} adReady={adReady} />
      ) : null}
      {ready && screen === 'missions' ? <Missions save={save} onBack={() => go('menu', 'menu')} /> : null}
      {ready && screen === 'settings' ? (
        <Settings save={save} onChange={changeSettings} onHow={() => { navFrom.current.how = 'settings'; go('ui', 'how'); }} onReset={resetAll} onBack={() => back('settings', 'menu')} />
      ) : null}
      {ready && screen === 'how' ? (
        <HowTo onDone={() => {
          updateSave((o) => ({ ...o, seenHow: true }));
          if (navFrom.current.how === 'play') startRun(); else go('ui', 'settings');
        }} />
      ) : null}
      {ready && screen === 'pause' ? (
        <Pause save={save} onResume={resume} onRestart={restartFromPause} onQuit={finish} onSettings={changeSettings} />
      ) : null}
      {ready && screen === 'revive' && !adReq ? (
        <Revive hm={reviveHm} adReady={adReady || Ads.rewardReady()} onYes={() => rewarded('revive', doRevive, finish)} onNo={finish} />
      ) : null}
      {ready && over && screen === 'over' ? (
        <GameOver
          over={over} save={save} goal={goalText(save)} adReady={adReady}
          onAgain={nextRun} onDouble={doubleCoins} onShop={() => openShop('up', 'over')} onMenu={toMenu}
        />
      ) : null}
      {adReq ? <DemoAd req={adReq} /> : null}
      <Toast text={toast} />
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

const s = StyleSheet.create({ root: { flex: 1, backgroundColor: T.ink } });
