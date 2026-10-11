"""Generates the small sound effects in assets/sfx (synthesised, no external samples)."""
import wave, numpy as np, os
SR = 22050
out = os.path.join(os.path.dirname(__file__), '..', 'assets', 'sfx')
os.makedirs(out, exist_ok=True)

def t(d): return np.linspace(0, d, int(SR * d), endpoint=False)
def env(n, a=0.004, d=3.0):
    x = np.linspace(0, 1, n); e = np.exp(-d * x * 3)
    k = max(1, int(a * SR)); e[:k] *= np.linspace(0, 1, k); return e
def sine(f, d): return np.sin(2 * np.pi * f * t(d))
def sweep(f0, f1, d, wave_='sine'):
    tt = t(d); f = f0 * (f1 / f0) ** (tt / d); ph = 2 * np.pi * np.cumsum(f) / SR
    if wave_ == 'saw': return 2 * ((ph / (2 * np.pi)) % 1) - 1
    if wave_ == 'square': return np.sign(np.sin(ph)) * 0.6
    if wave_ == 'tri': return 2 / np.pi * np.arcsin(np.sin(ph))
    return np.sin(ph)
def noise(d, seed=1): return np.random.RandomState(seed).uniform(-1, 1, int(SR * d))
def lp(x, k):
    c = np.cumsum(np.insert(x, 0, 0)); return (c[k:] - c[:-k]) / k
def pad(x, n): return np.pad(x, (0, max(0, n - len(x))))[:n]
def save(name, x):
    x = x / (np.max(np.abs(x)) + 1e-9) * 0.8
    with wave.open(os.path.join(out, name + '.wav'), 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767).astype('<i2').tobytes())

d = 0.28; n = int(SR * d)
save('orb', (sine(523.25, d) + 0.35 * sweep(1046.5, 1046.5, d, 'tri') + 0.12 * sine(1569.75, d)) * env(n, 0.003, 3.2))
d = 0.34; n = int(SR * d)
star = np.zeros(n)
for i, f in enumerate([1046.5, 1318.5, 1568.0, 2093.0]):
    s = int(i * 0.05 * SR); seg = sine(f, 0.22) * env(int(SR * 0.22), 0.002, 3.2); star[s:s + len(seg)] += seg[:n - s]
save('star', star)
d = 0.1; n = int(SR * d)
save('attach', sweep(190, 80, d) * env(n, 0.001, 2.2) + 0.25 * noise(d) * env(n, 0.001, 8))
d = 0.16; n = int(SR * d)
ns = lp(noise(d + 0.01, 3), 6)[:n]; save('release', ns * np.sin(np.pi * np.linspace(0, 1, n)) * (0.4 + np.linspace(0, 1, n)) * 1.5 + 0.2 * sweep(300, 900, d, 'tri') * env(n, 0.005, 2))
d = 0.55; n = int(SR * d)
perf = np.zeros(n)
for i, f in enumerate([1318.5, 1975.5]):
    s = int(i * 0.09 * SR); seg = (sine(f, 0.4) + 0.4 * sine(f * 2.01, 0.4) + 0.15 * sine(f * 3.02, 0.4)) * env(int(SR * 0.4), 0.002, 2.6); perf[s:s + len(seg)] += seg[:n - s]
save('perfect', perf)
d = 0.1; n = int(SR * d)
save('near', sweep(880, 1500, d, 'square') * env(n, 0.001, 2.5))
d = 0.55; n = int(SR * d)
save('die', sweep(320, 45, d, 'saw') * env(n, 0.002, 1.6) * 0.8 + 0.5 * lp(noise(d + 0.01, 5), 10)[:n] * env(n, 0.001, 4))
d = 0.42; n = int(SR * d)
vib = 1 + 0.02 * np.sin(2 * np.pi * 18 * t(d))
save('shield', sweep(380, 1500, d) * vib * np.sin(np.pi * np.linspace(0, 1, n)) ** 0.7 + 0.2 * sweep(760, 3000, d, 'tri') * env(n, 0.01, 2))
d = 0.4; n = int(SR * d)
ml = np.zeros(n)
for i, f in enumerate([523.25, 783.99]):
    s = int(i * 0.12 * SR); seg = sweep(f, f, 0.26, 'tri') * env(int(SR * 0.26), 0.003, 2.2); ml[s:s + len(seg)] += seg[:n - s]
save('mile', ml)
d = 0.04; n = int(SR * d)
save('click', sine(1200, d) * env(n, 0.0005, 6))
d = 0.32; n = int(SR * d)
coin = np.zeros(n)
for i, f in enumerate([1975.5, 2637.0]):
    s = int(i * 0.07 * SR); seg = (sine(f, 0.25) + 0.3 * sine(f * 2, 0.25)) * env(int(SR * 0.25), 0.001, 3.5); coin[s:s + len(seg)] += seg[:n - s]
save('coin', coin)
d = 0.55; n = int(SR * d)
save('revive', sweep(220, 880, d, 'tri') * np.sin(np.pi * np.linspace(0, 1, n)) ** 0.5 * 0.8 + 0.3 * sweep(440, 1760, d) * env(n, 0.05, 1.2))
print('ok', sorted(os.listdir(out)))
