import React, { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { F, T, fmt } from '../theme';
import { Btn, CoinChip, Header, Label, Screen, Switch } from '../ui/kit';
import { UPS, upCost } from '../game';
import { SKINS } from '../store';
import { byId } from '../missions';
import { PRIVACY_URL, VERSION } from '../config';
import { Ads } from '../ads';

const AD_COINS = 50, AD_COOLDOWN = 2 * 60 * 1000;

/* ---------- Shop: upgrades, skins, free coins ---------- */
export function Shop({ save, tab, onTab, onBuy, onBuySkin, onEquip, onFreeCoins, onBack }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  const wait = Math.max(0, (save.adCoinAt || 0) + AD_COOLDOWN - now);

  return (
    <Screen scroll dim={0.93}>
      <View style={{ gap: 16 }}>
        <Header title="Shop" onBack={onBack} right={<CoinChip value={fmt(save.coins)} />} />
        <View style={sh.tabs}>
          {[['up', 'Upgrades'], ['skin', 'Skins']].map(([id, label]) => (
            <Pressable key={id} onPress={() => onTab(id)} style={[sh.tab, tab === id && sh.tabOn]} accessibilityRole="tab" accessibilityState={{ selected: tab === id }}>
              <Text style={[sh.tabText, tab === id && { color: '#1a1200' }]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        {tab === 'up' ? (
          <View>
            <View style={sh.free}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Label color={T.mint}>Free coins</Label>
                <Text style={sh.freeText}>Watch an ad for +{AD_COINS} coins</Text>
              </View>
              <Btn small kind="ad" label={wait > 0 ? Math.ceil(wait / 1000) + 's' : 'Watch'} disabled={wait > 0} onPress={onFreeCoins} />
            </View>
            {UPS.map((u) => {
              const lvl = save.up[u.k], maxed = lvl >= u.max, cost = upCost(lvl), can = !maxed && save.coins >= cost;
              return (
                <View key={u.k} style={sh.row}>
                  <View style={{ flex: 1, gap: 6, minWidth: 0 }}>
                    <Text style={sh.name}>{u.name}</Text>
                    <Text style={sh.desc}>{u.desc}</Text>
                    <View style={{ flexDirection: 'row', gap: 4 }}>
                      {Array.from({ length: u.max }).map((_, i) => <View key={i} style={[sh.pip, i < lvl && { backgroundColor: T.amber }]} />)}
                    </View>
                  </View>
                  <Btn small kind={can ? 'primary' : 'plain'} disabled={!can} label={maxed ? 'Max' : fmt(cost)} onPress={() => onBuy(u.k)} style={{ minWidth: 84 }} />
                </View>
              );
            })}
          </View>
        ) : (
          <View style={sh.grid}>
            {SKINS.map((k) => {
              const owned = save.skins.includes(k.id), on = save.skin === k.id, can = save.coins >= k.price;
              return (
                <View key={k.id} style={[sh.card, on && { borderColor: T.amber }]}>
                  <View style={sh.preview}>
                    <View style={[sh.glow, { backgroundColor: k.b }]} />
                    <View style={[sh.ball, { backgroundColor: k.a }]} />
                  </View>
                  <Text style={sh.skinName}>{k.name}</Text>
                  {on ? <View style={sh.equipped}><Text style={sh.equippedText}>Equipped</Text></View>
                    : owned ? <Btn small label="Equip" onPress={() => onEquip(k.id)} style={{ alignSelf: 'stretch' }} />
                      : <Btn small kind={can ? 'primary' : 'plain'} disabled={!can} label={fmt(k.price)} onPress={() => onBuySkin(k.id)} style={{ alignSelf: 'stretch' }} />}
                </View>
              );
            })}
          </View>
        )}
      </View>
    </Screen>
  );
}

/* ---------- Missions ---------- */
export function Missions({ save, onBack }) {
  return (
    <Screen scroll dim={0.93}>
      <View style={{ gap: 16 }}>
        <Header title="Missions" onBack={onBack} />
        <Text style={sh.desc}>Complete a mission in a single run. It pays out when the run ends and a new one takes its place.</Text>
        {save.missions.map((id) => {
          const mi = byId(id);
          return (
            <View key={id} style={sh.mission}>
              <Text style={sh.missionText}>{mi.text}</Text>
              <CoinChip value={'+' + mi.reward} />
            </View>
          );
        })}
        <View style={[sh.mission, { marginTop: 8 }]}>
          <View>
            <Label>Daily streak</Label>
            <Text style={sh.missionText}>{save.streak > 0 ? save.streak + (save.streak === 1 ? ' day' : ' days') : 'Not started'}</Text>
          </View>
        </View>
        <View style={sh.stats}>
          {[['Runs', save.runs], ['Best score', save.best], ['Best height', Math.floor(save.bestH) + ' m'], ['Orbs', save.orbsTotal]].map(([k, v]) => (
            <View key={k} style={sh.stat}><Text style={sh.statV}>{typeof v === 'number' ? fmt(v) : v}</Text><Label>{k}</Label></View>
          ))}
        </View>
      </View>
    </Screen>
  );
}

/* ---------- Settings ---------- */
export function Settings({ save, onChange, onHow, onReset, onBack }) {
  const [confirm, setConfirm] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  useEffect(() => { Ads.privacyRequired().then(setPrivacy).catch(() => {}); }, []);
  const set = (k) => (v) => onChange({ ...save.settings, [k]: v });
  return (
    <Screen scroll dim={0.93}>
      <View style={{ gap: 6 }}>
        <Header title="Settings" onBack={onBack} />
        <Switch label="Sound" value={save.settings.sound} onChange={set('sound')} />
        <Switch label="Haptics" value={save.settings.haptics} onChange={set('haptics')} sub="Vibration feedback" />
        <Switch label="Effects" value={save.settings.fx} onChange={set('fx')} sub="Screen shake and extra particles. Turn off for a calmer look." />
        <View style={{ gap: 10, marginTop: 18 }}>
          <Btn label="How to play" onPress={onHow} />
          <Btn label="Privacy policy" onPress={() => { Linking.openURL(PRIVACY_URL).catch(() => {}); }} />
          {privacy ? <Btn label="Ad privacy choices" onPress={() => Ads.showPrivacy()} /> : null}
          {!confirm ? <Btn kind="danger" label="Reset progress" onPress={() => setConfirm(true)} />
            : (
              <View style={sh.confirm}>
                <Text style={sh.missionText}>Delete coins, upgrades, skins and scores? This cannot be undone.</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Btn small label="Cancel" onPress={() => setConfirm(false)} style={{ flex: 1 }} />
                  <Btn small kind="danger" label="Delete" onPress={() => { setConfirm(false); onReset(); }} style={{ flex: 1 }} />
                </View>
              </View>
            )}
        </View>
        <Text style={[sh.desc, { textAlign: 'center', marginTop: 18 }]}>Tether Whip {VERSION}</Text>
      </View>
    </Screen>
  );
}

const sh = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 8, backgroundColor: T.ink2, padding: 4, borderRadius: 14, borderWidth: 1, borderColor: T.line },
  tab: { flex: 1, paddingVertical: 11, borderRadius: 10, alignItems: 'center' },
  tabOn: { backgroundColor: T.amber },
  tabText: { color: T.muted, fontFamily: F.display, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8 },
  free: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: T.mint, backgroundColor: 'rgba(88,242,201,0.07)', marginBottom: 4 },
  freeText: { color: T.ice, fontFamily: F.monoM, fontSize: 14, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: T.line },
  name: { color: T.ice, fontFamily: F.displayM, fontSize: 14, textTransform: 'uppercase' },
  desc: { color: T.muted, fontFamily: F.mono, fontSize: 12, lineHeight: 18 },
  pip: { width: 16, height: 6, backgroundColor: T.ink3, borderRadius: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { width: '47.5%', flexGrow: 1, gap: 10, padding: 12, borderRadius: 16, borderWidth: 1.5, borderColor: T.line, backgroundColor: 'rgba(19,26,71,0.85)' },
  preview: { height: 64, alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', width: 48, height: 48, borderRadius: 24, opacity: 0.35 },
  ball: { width: 24, height: 24, borderRadius: 12 },
  equipped: { minHeight: 42, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: T.amber, backgroundColor: 'rgba(255,184,31,0.12)' },
  equippedText: { color: T.amber, fontFamily: F.display, fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase' },
  skinName: { color: T.ice, fontFamily: F.displayM, fontSize: 13, textTransform: 'uppercase', textAlign: 'center' },
  mission: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: T.line, backgroundColor: 'rgba(19,26,71,0.85)' },
  missionText: { color: T.ice, fontFamily: F.monoM, fontSize: 14, lineHeight: 20, flex: 1, minWidth: 0 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { width: '47.5%', flexGrow: 1, gap: 4, padding: 12, borderRadius: 12, backgroundColor: T.ink2 },
  statV: { color: T.ice, fontFamily: F.monoM, fontSize: 20, fontVariant: ['tabular-nums'] },
  confirm: { gap: 12, padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: T.rose },
});
