// In-run screens: HUD, pause, revive, game over, demo ad.
import React, { forwardRef, memo, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { F, T, fmt } from '../theme';
import { Btn, CoinChip, FadeIn, Label, Screen, Switch, useCountUp } from '../ui/kit';
import { byId } from '../missions';

/* ---------- HUD ---------- */
const EMPTY = { score: 0, alt: 0, coins: 0, combo: 0, mult: 1, cbar: 0, hint: '', shield: false, sector: '', count: 0 };

export const Hud = memo(forwardRef(function Hud({ onPause }, ref) {
  const insets = useSafeAreaInsets();
  const [d, setD] = useState(EMPTY);
  const [banner, setBanner] = useState('');
  const op = useRef(new Animated.Value(0)).current;
  const sc = useRef(new Animated.Value(0.85)).current;
  useImperativeHandle(ref, () => ({
    set: setD,
    banner: (t) => {
      setBanner(t); op.stopAnimation(); op.setValue(0); sc.setValue(0.85);
      Animated.parallel([
        Animated.sequence([Animated.timing(op, { toValue: 1, duration: 160, useNativeDriver: true }), Animated.delay(900), Animated.timing(op, { toValue: 0, duration: 380, useNativeDriver: true })]),
        Animated.timing(sc, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    },
  }), [op, sc]);

  return (
    <View style={[StyleSheet.absoluteFill, { paddingTop: insets.top + 12, paddingHorizontal: 18 }]} pointerEvents="box-none">
      <View style={r.top} pointerEvents="box-none">
        <View pointerEvents="none" style={{ flexShrink: 1 }}>
          <Label>Score</Label>
          <Text style={r.big}>{fmt(d.score)}</Text>
          <Text style={r.sub}>{d.alt} m{d.sector ? ' · ' + d.sector : ''}</Text>
          {d.combo >= 2 ? (
            <View style={r.combo}>
              <Text style={r.mult}>x{d.mult.toFixed(1)}</Text>
              <Text style={r.sub}>{d.combo} chain</Text>
              <View style={r.cbarBg}><View style={[r.cbarFg, { width: `${Math.max(0, Math.min(1, d.cbar)) * 100}%` }]} /></View>
            </View>
          ) : null}
        </View>
        <View style={r.right} pointerEvents="box-none">
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <CoinChip value={fmt(d.coins)} />
            <Pressable onPress={onPause} accessibilityRole="button" accessibilityLabel="Pause" style={r.pause} hitSlop={8}>
              <View style={r.bar} /><View style={r.bar} />
            </Pressable>
          </View>
          {d.shield ? <View style={r.shield}><Text style={r.shieldText}>SHIELD</Text></View> : null}
        </View>
      </View>
      <Animated.Text style={[r.banner, { opacity: op, transform: [{ scale: sc }] }]} pointerEvents="none">{banner}</Animated.Text>
      {d.count > 0 ? <View style={r.countWrap} pointerEvents="none"><Text style={r.count}>{d.count}</Text></View> : null}
      {d.hint ? <Text style={[r.hint, { bottom: insets.bottom + 34 }]} pointerEvents="none">{d.hint}</Text> : null}
    </View>
  );
}));

/* ---------- Pause ---------- */
export function Pause({ save, onResume, onRestart, onQuit, onSettings }) {
  return (
    <Screen dim={0.88}>
      <View><Label>Paused</Label><Text style={r.h2}>Take a breath</Text></View>
      <View style={{ gap: 4 }}>
        <Switch label="Sound" value={save.settings.sound} onChange={(v) => onSettings({ ...save.settings, sound: v })} />
        <Switch label="Haptics" value={save.settings.haptics} onChange={(v) => onSettings({ ...save.settings, haptics: v })} />
      </View>
      <View style={{ gap: 12 }}>
        <Btn kind="primary" label="Resume" onPress={onResume} />
        <Btn label="Restart" onPress={onRestart} />
        <Btn kind="ghost" label="End run" onPress={onQuit} />
      </View>
    </Screen>
  );
}

/* ---------- Revive ---------- */
export function Revive({ hm, adReady, onYes, onNo }) {
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
    <Screen dim={0.9}>
      <View>
        <Label color={T.rose}>Swallowed at {Math.floor(hm)} m</Label>
        <Text style={r.h2}>Second wind?</Text>
        <Text style={r.body}>Watch one short ad to restart from the nearest anchor. Your height and score stay.</Text>
      </View>
      <View style={{ gap: 12 }}>
        <View style={r.barBg}><View style={[r.barFg, { width: `${(t / 5) * 100}%` }]} /></View>
        <Btn kind="primary" label="Revive" sub="watch an ad" onPress={onYes} disabled={!adReady} />
        <Btn kind="ghost" label={`No thanks (${Math.ceil(t)})`} onPress={onNo} />
      </View>
    </Screen>
  );
}

/* ---------- Game over ---------- */
export function GameOver({ over, save, goal, adReady, onAgain, onDouble, onShop, onMenu }) {
  const score = useCountUp(over.score, 1000);
  const coins = useCountUp(over.doubled ? over.coins * 2 : over.coins, 700);
  const close = !over.newBest && over.prevBest > 0 && over.score >= over.prevBest * 0.8;
  const nudge = close ? 'Only ' + fmt(over.prevBest - over.score) + ' short of your best.' : goal;
  return (
    <Screen scroll dim={0.92}>
      <View style={{ gap: 18 }}>
        <FadeIn>
          <Label color={over.newBest ? T.amber : T.muted}>{over.newBest ? 'New best' : 'Run over'}</Label>
          <Text style={[r.huge, over.newBest && { color: T.amber }]}>{fmt(score)}</Text>
        </FadeIn>
        <FadeIn delay={150}>
          <View style={r.grid}>
            {[['Height', Math.floor(over.hm) + ' m'], ['Orbs', fmt(over.orbs)], ['Best chain', over.chain], ['Perfects', over.perfects]].map(([k, v]) => (
              <View key={k} style={r.stat}><Text style={r.statV}>{v}</Text><Label>{k}</Label></View>
            ))}
          </View>
        </FadeIn>
        <FadeIn delay={300}>
          <View style={r.earn}><Label color={T.mint}>Coins earned</Label><Text style={r.earnV}>+{fmt(coins)}</Text></View>
        </FadeIn>
        {over.done.length ? (
          <FadeIn delay={420} style={{ gap: 8 }}>
            {over.done.map((mi) => (
              <View key={mi.id} style={r.mission}>
                <View style={{ flex: 1, minWidth: 0 }}><Label color={T.amber}>Mission complete</Label><Text style={r.missionText}>{mi.text}</Text></View>
                <CoinChip value={'+' + mi.reward} />
              </View>
            ))}
          </FadeIn>
        ) : null}
        <Text style={r.body}>{nudge}</Text>
      </View>
      <View style={{ gap: 12, marginTop: 20 }}>
        <Btn kind="primary" label="Play again" onPress={onAgain} />
        {!over.doubled && over.coins >= 5 && adReady ? <Btn kind="ad" label={`Double coins +${fmt(over.coins)}`} sub="watch an ad" onPress={onDouble} /> : null}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Btn label="Shop" onPress={onShop} style={{ flex: 1 }} />
          <Btn label="Menu" onPress={onMenu} style={{ flex: 1 }} />
        </View>
      </View>
    </Screen>
  );
}

/* ---------- Demo ad (shown only when no real ad SDK is available) ---------- */
export function DemoAd({ req }) {
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
      <Screen dim={0}>
        <View style={r.adbox}>
          <Label>Demo ad slot</Label>
          <Text style={r.h2}>{req.kind === 'reward' ? 'Rewarded ad' : 'Ad break'}</Text>
          <Text style={r.body}>{req.kind === 'reward' ? 'Watch to the end to earn your reward.' : 'Back to the game in a moment.'}</Text>
          <View style={r.barBg}><View style={[r.barFg, { width: `${Math.min(1, t / dur) * 100}%` }]} /></View>
        </View>
        <View style={{ gap: 12 }}>
          {done ? <Btn kind="primary" label={req.kind === 'reward' ? 'Claim reward' : 'Continue'} onPress={req.onDone} /> : null}
          {!done && req.kind === 'reward' ? <Btn label="Close, no reward" onPress={req.onCancel} /> : null}
        </View>
      </Screen>
    </View>
  );
}

const r = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  big: { color: T.ice, fontFamily: F.display, fontSize: 34, lineHeight: 40, fontVariant: ['tabular-nums'] },
  sub: { color: T.muted, fontFamily: F.mono, fontSize: 13, fontVariant: ['tabular-nums'] },
  combo: { marginTop: 12 },
  mult: { color: T.amber, fontFamily: F.display, fontSize: 24 },
  cbarBg: { height: 3, backgroundColor: T.ink3, marginTop: 6, width: 120 },
  cbarFg: { height: 3, backgroundColor: T.amber },
  right: { alignItems: 'flex-end', gap: 8 },
  pause: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: T.line, backgroundColor: 'rgba(19,26,71,0.78)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  bar: { width: 4, height: 14, borderRadius: 2, backgroundColor: T.ice },
  shield: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1.5, borderColor: T.cyan, backgroundColor: 'rgba(111,216,255,0.14)' },
  shieldText: { color: T.cyan, fontFamily: F.displayM, fontSize: 10, letterSpacing: 1.5 },
  banner: { position: 'absolute', left: 18, right: 18, top: '26%', textAlign: 'center', color: T.amber, fontFamily: F.display, fontSize: 38 },
  countWrap: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  count: { color: T.ice, fontFamily: F.display, fontSize: 96 },
  hint: { position: 'absolute', left: 18, right: 18, textAlign: 'center', color: T.ice, fontFamily: F.displayM, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase' },
  h2: { color: T.ice, fontFamily: F.display, fontSize: 30, lineHeight: 36, textTransform: 'uppercase', marginTop: 6 },
  body: { color: T.muted, fontFamily: F.mono, fontSize: 14, lineHeight: 21, marginTop: 10, maxWidth: 320 },
  barBg: { height: 6, backgroundColor: T.ink3, borderRadius: 3, overflow: 'hidden' },
  barFg: { height: 6, backgroundColor: T.mint },
  huge: { color: T.ice, fontFamily: F.display, fontSize: 64, lineHeight: 74, fontVariant: ['tabular-nums'], marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { width: '47.5%', flexGrow: 1, gap: 4, padding: 12, borderRadius: 12, backgroundColor: T.ink2 },
  statV: { color: T.ice, fontFamily: F.monoM, fontSize: 20, fontVariant: ['tabular-nums'] },
  earn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: T.mint, backgroundColor: 'rgba(88,242,201,0.07)' },
  earnV: { color: T.mint, fontFamily: F.display, fontSize: 22, fontVariant: ['tabular-nums'] },
  mission: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: T.amber, backgroundColor: 'rgba(255,184,31,0.08)' },
  missionText: { color: T.ice, fontFamily: F.monoM, fontSize: 13, marginTop: 2 },
  adbox: { borderWidth: 1, borderColor: T.line, borderStyle: 'dashed', padding: 20, borderRadius: 16, backgroundColor: 'rgba(19,26,71,0.7)', gap: 6 },
});
