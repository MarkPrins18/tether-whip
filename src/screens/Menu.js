import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { F, T, fmt } from '../theme';
import { Btn, CoinChip, FadeIn, Label, Screen, s as ks } from '../ui/kit';
import { dailyInfo } from '../store';

// Dark fade from transparent (top) to dark (bottom) so the live background stays visible behind the menu.
function Scrim() {
  const bands = 10;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: bands }).map((_, i) => (
        <View key={i} style={{ flex: 1, backgroundColor: `rgba(8,11,36,${(0.2 + 0.7 * Math.pow(i / (bands - 1), 1.3)).toFixed(3)})` }} />
      ))}
    </View>
  );
}

export function Menu({ save, onPlay, onShop, onSkins, onMissions, onSettings, onClaim, missionsReady, skinAffordable, upgradeAffordable, adReady }) {
  const d = dailyInfo(save);
  return (
    <View style={StyleSheet.absoluteFill}>
      <Scrim />
      <Screen dim={0} scroll>
        <View style={{ gap: 26 }}>
          <View style={m.topRow}>
            <CoinChip value={fmt(save.coins)} />
            <View style={{ alignItems: 'flex-end' }}>
              <Label>Best</Label>
              <Text style={m.best}>{fmt(save.best)}</Text>
            </View>
          </View>
          <FadeIn>
            <Text style={m.t1}>TETHER</Text>
            <Text style={m.t2}>WHIP</Text>
            <View style={m.rope}>
              <View style={m.anchor} /><View style={m.line} /><View style={m.ball} />
            </View>
          </FadeIn>
        </View>

        <View style={{ gap: 12, marginTop: 28 }}>
          {d ? (
            <FadeIn delay={120}>
              <View style={m.daily}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Label color={T.amber}>Daily bonus</Label>
                  <Text style={m.dailyText}>Day {d.streak} · +{d.coins} coins</Text>
                </View>
                <Btn small kind="primary" label="Claim" onPress={() => onClaim(1)} />
                {adReady ? <Btn small kind="ad" label="x2" sub="ad" onPress={() => onClaim(2)} /> : null}
              </View>
            </FadeIn>
          ) : null}
          <Btn kind="primary" label="Play" onPress={onPlay} style={m.play} />
          <View style={m.row}>
            <Btn label="Upgrades" onPress={onShop} badge={upgradeAffordable} style={m.half} />
            <Btn label="Skins" onPress={onSkins} badge={skinAffordable} style={m.half} />
          </View>
          <View style={m.row}>
            <Btn label="Missions" onPress={onMissions} badge={missionsReady} style={m.half} />
            <Btn label="Settings" onPress={onSettings} style={m.half} />
          </View>
        </View>
      </Screen>
    </View>
  );
}

const m = StyleSheet.create({
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  best: { color: T.ice, fontFamily: F.monoM, fontSize: 20, fontVariant: ['tabular-nums'] },
  t1: { color: T.ice, fontFamily: F.display, fontSize: 60, lineHeight: 58, letterSpacing: -2 },
  t2: { color: T.amber, fontFamily: F.display, fontSize: 60, lineHeight: 62, letterSpacing: -2 },
  rope: { flexDirection: 'row', alignItems: 'center', marginTop: 14, width: 150 },
  anchor: { width: 12, height: 12, borderRadius: 6, backgroundColor: T.amber },
  line: { flex: 1, height: 3, backgroundColor: T.amber, opacity: 0.85 },
  ball: { width: 16, height: 16, borderRadius: 8, backgroundColor: T.ice },
  daily: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: T.line, backgroundColor: 'rgba(19,26,71,0.9)' },
  dailyText: { color: T.ice, fontFamily: F.monoM, fontSize: 14, marginTop: 2 },
  play: { minHeight: 66 },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
});

/* ---------- How to play ---------- */
const STEPS = [
  { title: 'Hold to swing', text: 'Press and hold to grab the nearest anchor. The rope pulls you in and you spin faster.' },
  { title: 'Release to fly', text: 'Let go to launch. When the guide line turns green, release for a PERFECT boost.' },
  { title: 'Collect, dodge, climb', text: 'Chain orbs for a bigger multiplier. Avoid mines. Never let the void catch you.' },
];

function Dot({ x, y, size, color, style }) {
  return <View style={[{ position: 'absolute', left: x - size / 2, top: y - size / 2, width: size, height: size, borderRadius: size / 2, backgroundColor: color }, style]} />;
}
function Seg({ x1, y1, x2, y2, w, color, dashed, opacity }) {
  const len = Math.hypot(x2 - x1, y2 - y1), ang = Math.atan2(y2 - y1, x2 - x1);
  return (
    <View style={{ position: 'absolute', left: (x1 + x2) / 2 - len / 2, top: (y1 + y2) / 2 - w / 2, width: len, height: dashed ? 0 : w, borderTopWidth: dashed ? w : 0, borderStyle: dashed ? 'dashed' : 'solid', borderColor: color, backgroundColor: dashed ? 'transparent' : color, opacity: opacity == null ? 1 : opacity, transform: [{ rotate: ang + 'rad' }] }} />
  );
}

function Illustration({ step }) {
  return (
    <View style={h.illus}>
      {step === 0 ? (
        <>
          <Seg x1={60} y1={34} x2={118} y2={86} w={3} color={T.amber} />
          <Dot x={60} y={34} size={16} color={T.amber} />
          <Dot x={118} y={86} size={18} color={T.ice} />
          <Dot x={40} y={90} size={9} color={T.mint} /><Dot x={78} y={104} size={9} color={T.mint} />
        </>
      ) : null}
      {step === 1 ? (
        <>
          <Dot x={34} y={92} size={18} color={T.ice} />
          <Seg x1={34} y1={92} x2={126} y2={30} w={2} color={T.mint} />
          <Dot x={126} y={30} size={16} color={T.amber} />
          <Dot x={126} y={30} size={34} color="transparent" style={{ borderWidth: 2, borderColor: T.mint }} />
        </>
      ) : null}
      {step === 2 ? (
        <>
          <Dot x={44} y={36} size={11} color={T.mint} /><Dot x={74} y={26} size={11} color={T.mint} /><Dot x={104} y={36} size={11} color={T.mint} />
          <View style={{ position: 'absolute', left: 112, top: 62, width: 22, height: 22, backgroundColor: T.rose, transform: [{ rotate: '45deg' }] }} />
          <Dot x={70} y={70} size={16} color={T.ice} />
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 22, backgroundColor: 'rgba(255,77,126,0.28)', borderTopWidth: 2, borderColor: T.rose }} />
        </>
      ) : null}
    </View>
  );
}

export function HowTo({ onDone }) {
  const [i, setI] = useState(0);
  const st = STEPS[i], last = i === STEPS.length - 1;
  return (
    <Screen dim={0.94}>
      <View style={{ gap: 4 }}>
        <Label>How to play · {i + 1}/{STEPS.length}</Label>
      </View>
      <View style={{ gap: 18, alignItems: 'center' }}>
        <Illustration step={i} />
        <Text style={h.title}>{st.title}</Text>
        <Text style={h.text}>{st.text}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {STEPS.map((_, k) => <View key={k} style={[h.pip, k === i && { backgroundColor: T.amber, width: 26 }]} />)}
        </View>
      </View>
      <View style={{ gap: 10 }}>
        <Btn kind="primary" label={last ? 'Got it' : 'Next'} onPress={() => (last ? onDone() : setI(i + 1))} />
        <Btn kind="ghost" label="Skip" onPress={onDone} disabled={last} style={last ? { opacity: 0 } : null} />
      </View>
    </Screen>
  );
}

const h = StyleSheet.create({
  illus: { width: 160, height: 120, borderRadius: 16, borderWidth: 1, borderColor: T.line, backgroundColor: 'rgba(19,26,71,0.9)', overflow: 'hidden' },
  title: { color: T.ice, fontFamily: F.display, fontSize: 24, textTransform: 'uppercase', textAlign: 'center', letterSpacing: 0.5 },
  text: { color: T.muted, fontFamily: F.mono, fontSize: 14, lineHeight: 21, textAlign: 'center', maxWidth: 300 },
  pip: { width: 8, height: 8, borderRadius: 4, backgroundColor: T.ink3 },
});
