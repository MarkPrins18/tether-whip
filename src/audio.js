// Sound effects. Everything is wrapped in try/catch: a missing or failing audio system must never stop the game.
let api = null;
let on = true;
const players = {};
const pools = { orb: 3 };
const idx = {};

const FILES = {
  orb: require('../assets/sfx/orb.wav'),
  star: require('../assets/sfx/star.wav'),
  attach: require('../assets/sfx/attach.wav'),
  release: require('../assets/sfx/release.wav'),
  perfect: require('../assets/sfx/perfect.wav'),
  near: require('../assets/sfx/near.wav'),
  die: require('../assets/sfx/die.wav'),
  shield: require('../assets/sfx/shield.wav'),
  mile: require('../assets/sfx/mile.wav'),
  click: require('../assets/sfx/click.wav'),
  coin: require('../assets/sfx/coin.wav'),
  revive: require('../assets/sfx/revive.wav'),
};

const VOL = { orb: 0.7, star: 0.8, attach: 0.5, release: 0.4, perfect: 0.8, near: 0.6, die: 0.9, shield: 0.8, mile: 0.7, click: 0.5, coin: 0.7, revive: 0.8 };

export function setSoundEnabled(v) { on = !!v; }

export function initAudio() {
  try {
    api = require('expo-audio');
    if (api.setAudioModeAsync) {
      api.setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers', shouldPlayInBackground: false, allowsRecording: false }).catch(() => {});
    }
    for (const k of Object.keys(FILES)) {
      const n = pools[k] || 1;
      players[k] = [];
      for (let i = 0; i < n; i++) {
        const p = api.createAudioPlayer(FILES[k]);
        try { p.volume = VOL[k] != null ? VOL[k] : 0.7; p.shouldCorrectPitch = false; } catch (e) {}
        players[k].push(p);
      }
      idx[k] = 0;
    }
  } catch (e) { api = null; }
}

export function play(name, rate) {
  if (!on || !api) return;
  const list = players[name];
  if (!list || !list.length) return;
  try {
    const p = list[idx[name]++ % list.length];
    if (rate) p.playbackRate = rate;
    p.seekTo(0);
    p.play();
  } catch (e) {}
}

const SCALE = [0, 2, 4, 7, 9];
export function playOrb(combo) {
  const i = Math.max(0, Math.min(combo - 1, 14));
  const semi = SCALE[i % 5] + 12 * Math.floor(i / 5);
  play('orb', Math.pow(2, semi / 12));
}
