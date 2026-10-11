import AsyncStorage from '@react-native-async-storage/async-storage';
import { pickMissions } from './missions';

const KEY = 'tetherwhip.save';
const OLD_KEY = 'tetherwhip.v1';

export const SKINS = [
  { id: 'classic', name: 'Classic', price: 0, a: '#eaf2ff', b: '#9aa5e6' },
  { id: 'ember', name: 'Ember', price: 150, a: '#ffb81f', b: '#ff4d7e' },
  { id: 'mint', name: 'Mint', price: 300, a: '#58f2c9', b: '#1f9d86' },
  { id: 'violet', name: 'Violet', price: 500, a: '#c4a3ff', b: '#6f4bd8' },
  { id: 'solar', name: 'Solar', price: 900, a: '#fff2a8', b: '#ffb81f' },
  { id: 'nova', name: 'Nova', price: 1500, a: '#ff7aa6', b: '#8a2bd6' },
];

export function defaultSave() {
  return {
    v: 2, best: 0, bestH: 0, coins: 0, runs: 0, orbsTotal: 0,
    streak: 0, lastDay: '', claimed: '',
    up: { reach: 0, magnet: 0, slow: 0, value: 0 },
    skin: 'classic', skins: ['classic'],
    missions: pickMissions([]),
    settings: { sound: true, haptics: true, fx: true },
    seenHow: false, adCoinAt: 0,
  };
}

const num = (v, d) => (typeof v === 'number' && isFinite(v) && v >= 0 ? v : d);

function sanitize(o) {
  const d = defaultSave();
  const s = { ...d, ...(o || {}) };
  s.v = 2;
  s.best = num(s.best, 0); s.bestH = num(s.bestH, 0); s.coins = Math.floor(num(s.coins, 0));
  s.runs = Math.floor(num(s.runs, 0)); s.orbsTotal = Math.floor(num(s.orbsTotal, 0)); s.streak = Math.floor(num(s.streak, 0));
  s.up = { ...d.up, ...(s.up || {}) };
  for (const k of Object.keys(d.up)) s.up[k] = Math.max(0, Math.min(6, Math.floor(num(s.up[k], 0))));
  s.settings = { ...d.settings, ...(s.settings || {}) };
  s.skins = Array.isArray(s.skins) && s.skins.length ? s.skins.filter((id) => SKINS.some((k) => k.id === id)) : ['classic'];
  if (!s.skins.includes('classic')) s.skins.unshift('classic');
  if (!s.skins.includes(s.skin)) s.skin = 'classic';
  if (!Array.isArray(s.missions) || s.missions.length !== 3) s.missions = pickMissions([]);
  return s;
}

export async function loadSave() {
  try {
    let raw = await AsyncStorage.getItem(KEY);
    if (!raw) raw = await AsyncStorage.getItem(OLD_KEY);
    return sanitize(raw ? JSON.parse(raw) : null);
  } catch (e) {
    return sanitize(null);
  }
}

let timer = null, pending = null;
export function persistSave(s) {
  pending = s;
  if (timer) return;
  timer = setTimeout(flushSave, 400);
}
export function flushSave() {
  if (timer) { clearTimeout(timer); timer = null; }
  if (!pending) return;
  const s = pending; pending = null;
  AsyncStorage.setItem(KEY, JSON.stringify(s)).catch(() => {});
}

export function dayKey(offset) {
  const d = new Date(Date.now() + (offset || 0) * 864e5);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

export function dailyInfo(save) {
  const today = dayKey(0);
  if (save.claimed === today) return null;
  const streak = save.lastDay === dayKey(-1) ? save.streak + 1 : 1;
  return { today, streak, coins: 25 + Math.min(streak - 1, 6) * 10 };
}
