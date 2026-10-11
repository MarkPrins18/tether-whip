import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'tetherwhip.v1';
export const DEFAULT_SAVE = {
  best: 0, bestH: 0, coins: 0, runs: 0, streak: 0, lastDay: '', claimed: '',
  up: { reach: 0, magnet: 0, slow: 0, value: 0 },
};

export async function loadSave() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const o = raw ? JSON.parse(raw) : {};
    return { ...DEFAULT_SAVE, ...o, up: { ...DEFAULT_SAVE.up, ...(o.up || {}) } };
  } catch (e) {
    return { ...DEFAULT_SAVE, up: { ...DEFAULT_SAVE.up } };
  }
}

export function persistSave(s) {
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
