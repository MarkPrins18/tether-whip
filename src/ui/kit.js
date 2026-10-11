// Shared UI pieces: buttons, panels, chips, switches, screen frame.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { F, T } from '../theme';
import { play } from '../audio';
import { haptic } from '../haptics';

export function Btn({ label, onPress, kind = 'plain', disabled, small, sub, badge, style, sound = true }) {
  const press = () => { if (sound) { play('click'); haptic.select(); } onPress && onPress(); };
  const k = kind;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={press}
      style={({ pressed }) => [
        s.btn, small && s.btnSm,
        k === 'primary' && s.btnPrimary, k === 'ad' && s.btnAd, k === 'ghost' && s.btnGhost, k === 'danger' && s.btnDanger,
        disabled && { opacity: 0.38 },
        pressed && !disabled && { transform: [{ translateY: k === 'primary' ? 3 : 1 }], borderBottomWidth: k === 'primary' ? 1 : undefined },
        style,
      ]}
    >
      <Text style={[s.btnText, small && { fontSize: 12 }, k === 'primary' && { color: '#1a1200' }, k === 'ad' && { color: T.mint }, k === 'ghost' && { color: T.muted }, k === 'danger' && { color: T.rose }]} numberOfLines={1}>{label}</Text>
      {sub ? <Text style={[s.btnSub, k === 'primary' && { color: '#5b4000' }, k === 'ad' && { color: T.mint, opacity: 0.8 }]} numberOfLines={1}>{sub}</Text> : null}
      {badge ? <View style={s.badge} /> : null}
    </Pressable>
  );
}

export function Screen({ children, scroll, style, dim = 0.88 }) {
  const insets = useSafeAreaInsets();
  const pad = { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 };
  const bg = { backgroundColor: `rgba(8,11,36,${dim})` };
  if (scroll) {
    return (
      <View style={[StyleSheet.absoluteFill, bg]}>
        <ScrollView contentContainerStyle={[s.screenIn, pad, style]} showsVerticalScrollIndicator={false}>{children}</ScrollView>
      </View>
    );
  }
  return <View style={[StyleSheet.absoluteFill, s.screenIn, bg, pad, style]}>{children}</View>;
}

export function Header({ title, onBack, right }) {
  return (
    <View style={s.header}>
      <View style={{ width: 84 }}>{onBack ? <Btn small kind="ghost" label="Back" onPress={onBack} style={{ alignSelf: 'flex-start' }} /> : null}</View>
      <Text style={s.headerTitle} numberOfLines={1}>{title}</Text>
      <View style={{ width: 84, alignItems: 'flex-end' }}>{right}</View>
    </View>
  );
}

export function CoinChip({ value, big }) {
  return (
    <View style={[s.chip, big && { paddingVertical: 8, paddingHorizontal: 14 }]}>
      <View style={[s.coin, big && { width: 12, height: 12, borderRadius: 6 }]} />
      <Text style={[s.chipText, big && { fontSize: 16 }]}>{value}</Text>
    </View>
  );
}

export function Label({ children, color }) { return <Text style={[s.label, color && { color }]}>{children}</Text>; }

export function Switch({ value, onChange, label, sub }) {
  return (
    <Pressable accessibilityRole="switch" accessibilityState={{ checked: value }} onPress={() => { play('click'); onChange(!value); }} style={s.switchRow}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.switchLabel}>{label}</Text>
        {sub ? <Text style={s.sub}>{sub}</Text> : null}
      </View>
      <View style={[s.track, value && { backgroundColor: T.amber }]}>
        <View style={[s.knob, value && { transform: [{ translateX: 20 }], backgroundColor: '#1a1200' }]} />
      </View>
    </Pressable>
  );
}

// Counts up from 0 to `value` over `ms`.
export function useCountUp(value, ms = 900, start = true) {
  const [v, setV] = useState(0);
  const raf = useRef(0);
  useEffect(() => {
    if (!start) { setV(value); return undefined; }
    let t0 = 0;
    const step = (ts) => {
      if (!t0) t0 = ts;
      const k = Math.min(1, (ts - t0) / ms);
      setV(Math.round(value * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [value, ms, start]);
  return v;
}

// Fades and slides its children in once.
export function FadeIn({ children, delay = 0, style }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(v, { toValue: 1, duration: 320, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(); }, [v, delay]);
  return <Animated.View style={[{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }, style]}>{children}</Animated.View>;
}

export function Toast({ text }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!text) return;
    v.setValue(0);
    Animated.sequence([Animated.timing(v, { toValue: 1, duration: 180, useNativeDriver: true }), Animated.delay(1700), Animated.timing(v, { toValue: 0, duration: 260, useNativeDriver: true })]).start();
  }, [text, v]);
  const insets = useSafeAreaInsets();
  if (!text) return null;
  return (
    <Animated.View pointerEvents="none" style={[s.toast, { top: insets.top + 14, opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }] }]}>
      <Text style={s.toastText}>{text}</Text>
    </Animated.View>
  );
}

export const s = StyleSheet.create({
  screenIn: { flexGrow: 1, justifyContent: 'space-between', gap: 18, paddingHorizontal: 18 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  headerTitle: { color: T.ice, fontFamily: F.display, fontSize: 18, letterSpacing: 1, textTransform: 'uppercase', flexShrink: 1, textAlign: 'center' },
  label: { color: T.muted, fontFamily: F.monoM, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' },
  sub: { color: T.muted, fontFamily: F.mono, fontSize: 12, lineHeight: 17 },
  btn: { backgroundColor: T.ink3, borderRadius: 14, paddingVertical: 16, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', minHeight: 54, borderWidth: 1, borderColor: T.line },
  btnSm: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 11, minHeight: 42 },
  btnPrimary: { backgroundColor: T.amber, borderColor: T.amber, borderBottomWidth: 4, borderBottomColor: T.amberDeep },
  btnAd: { backgroundColor: 'transparent', borderColor: T.mint, borderWidth: 1.5 },
  btnGhost: { backgroundColor: 'transparent', borderColor: 'transparent' },
  btnDanger: { backgroundColor: 'transparent', borderColor: T.rose, borderWidth: 1.5 },
  btnText: { color: T.ice, fontFamily: F.display, fontSize: 14, letterSpacing: 0.8, textTransform: 'uppercase' },
  btnSub: { color: T.muted, fontFamily: F.mono, fontSize: 11, marginTop: 3 },
  badge: { position: 'absolute', top: 8, right: 8, width: 9, height: 9, borderRadius: 5, backgroundColor: T.rose },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1, borderColor: T.line, borderRadius: 999, backgroundColor: 'rgba(19,26,71,0.78)' },
  chipText: { color: T.ice, fontFamily: F.monoM, fontSize: 14 },
  coin: { width: 9, height: 9, borderRadius: 5, backgroundColor: T.mint },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: T.line },
  switchLabel: { color: T.ice, fontFamily: F.displayM, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 },
  track: { width: 48, height: 28, borderRadius: 14, backgroundColor: T.ink3, padding: 4, borderWidth: 1, borderColor: T.line },
  knob: { width: 18, height: 18, borderRadius: 9, backgroundColor: T.muted },
  toast: { position: 'absolute', alignSelf: 'center', backgroundColor: T.ink2, borderColor: T.amber, borderWidth: 1, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16, maxWidth: '88%' },
  toastText: { color: T.ice, fontFamily: F.monoM, fontSize: 13, textAlign: 'center' },
});
