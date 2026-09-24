"""Generate CC0 game audio (synthesized) into frontend/assets/audio as WAV.
All sounds are created procedurally here, so they are royalty-free by construction.
"""
import os
import struct
import wave
import numpy as np

OUT = "/app/frontend/assets/audio"
os.makedirs(OUT, exist_ok=True)
SR = 44100


def write_wav(name, samples, sr=SR):
    samples = np.clip(samples, -1.0, 1.0)
    data = (samples * 32767).astype(np.int16)
    path = os.path.join(OUT, name)
    with wave.open(path, "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(data.tobytes())
    print("wrote", name, f"{len(data)/sr:.2f}s")


def env(n, attack=0.01, release=0.2):
    a = int(SR * attack)
    r = int(SR * release)
    e = np.ones(n)
    if a > 0:
        e[:a] = np.linspace(0, 1, a)
    if r > 0 and r < n:
        e[-r:] = np.linspace(1, 0, r)
    return e


def tone(freq, dur, kind="sine"):
    t = np.linspace(0, dur, int(SR * dur), False)
    if kind == "sine":
        return np.sin(2 * np.pi * freq * t)
    if kind == "square":
        return np.sign(np.sin(2 * np.pi * freq * t))
    if kind == "saw":
        return 2 * (t * freq - np.floor(0.5 + t * freq))
    return np.sin(2 * np.pi * freq * t)


def sweep(f0, f1, dur, kind="sine"):
    t = np.linspace(0, dur, int(SR * dur), False)
    freq = np.linspace(f0, f1, t.size)
    phase = 2 * np.pi * np.cumsum(freq) / SR
    if kind == "saw":
        ph = phase / (2 * np.pi)
        return 2 * (ph - np.floor(0.5 + ph))
    return np.sin(phase)


# ---- click ----
s = tone(900, 0.08, "square") * env(int(SR * 0.08), 0.002, 0.06) * 0.4
write_wav("click.wav", s)

# ---- merge (satisfying two-step pluck) ----
d = 0.28
a = tone(660, d, "saw") * env(int(SR * d), 0.005, 0.22)
b = tone(990, d, "saw") * env(int(SR * d), 0.08, 0.2)
s = (a * 0.5 + b * 0.5) * 0.45
write_wav("merge.wav", s)

# ---- coin ----
d1, d2 = 0.06, 0.14
c1 = tone(1319, d1, "square") * env(int(SR * d1), 0.002, 0.04)
c2 = tone(1760, d2, "square") * env(int(SR * d2), 0.002, 0.12)
s = np.concatenate([c1, c2]) * 0.35
write_wav("coin.wav", s)

# ---- whoosh (near miss) ----
d = 0.34
n = int(SR * d)
noise = np.random.randn(n)
# simple moving-average lowpass that opens up then closes
k = 30
kernel = np.ones(k) / k
filt = np.convolve(noise, kernel, mode="same")
e = np.sin(np.linspace(0, np.pi, n)) ** 1.5
s = filt * e * 0.5
write_wav("whoosh.wav", s)

# ---- crash ----
d = 0.55
n = int(SR * d)
noise = np.random.randn(n) * np.exp(-np.linspace(0, 6, n))
thump = sweep(160, 40, d, "sine") * np.exp(-np.linspace(0, 5, n))
s = (noise * 0.6 + thump * 0.7) * 0.6
write_wav("crash.wav", s)

# ---- boost ----
d = 0.6
n = int(SR * d)
up = sweep(220, 1200, d, "saw") * env(n, 0.02, 0.25)
shimmer = tone(1568, d, "sine") * env(n, 0.2, 0.3) * 0.3
s = (up * 0.5 + shimmer) * 0.45
write_wav("boost.wav", s)

# ---- engine loop (low sawtooth + vibrato + noise) ----
d = 1.0
n = int(SR * d)
t = np.linspace(0, d, n, False)
vib = 4 * np.sin(2 * np.pi * 7 * t)
base = 92 + vib
phase = 2 * np.pi * np.cumsum(base) / SR
saw = 2 * (phase / (2 * np.pi) - np.floor(0.5 + phase / (2 * np.pi)))
rumble = np.random.randn(n) * 0.06
s = (saw * 0.35 + rumble) * 0.5
# make loop seamless with tiny crossfade
xf = int(SR * 0.02)
s[:xf] *= np.linspace(0, 1, xf)
s[-xf:] *= np.linspace(1, 0, xf)
write_wav("engine.wav", s)

# ---- synthwave music loop (~16s) ----
bpm = 118
beat = 60.0 / bpm
bar = beat * 4
total = bar * 8  # 8 bars
n = int(SR * total)
t = np.linspace(0, total, n, False)
music = np.zeros(n)

def note_freq(midi):
    return 440.0 * 2 ** ((midi - 69) / 12.0)

# chord progression Am - F - C - G (two bars each -> repeat)
prog = [57, 53, 48, 55]  # root midi (A3, F3, C3, G3)
prog = prog * 2

# pad chords (detuned saw)
for i, root in enumerate(prog):
    start = int(i * bar * SR)
    length = int(bar * SR)
    seg_t = np.linspace(0, bar, length, False)
    chord = [root, root + 4 if (root % 12) != 9 else root + 3, root + 7]
    seg = np.zeros(length)
    for m in chord:
        f = note_freq(m)
        seg += 0.5 * (2 * ((seg_t * f) % 1) - 1)
        seg += 0.5 * (2 * ((seg_t * f * 1.005) % 1) - 1)
    e = env(length, 0.15, 0.4)
    music[start:start + length] += seg * e * 0.06

# bass arpeggio (eighth notes)
eighth = beat / 2
step = 0
for i, root in enumerate(prog):
    pattern = [root - 12, root, root + 7, root + 12] * 2
    for j, m in enumerate(pattern):
        st = int((i * bar + j * eighth) * SR)
        ln = int(eighth * 0.9 * SR)
        if st + ln > n:
            break
        ft = np.linspace(0, eighth, ln, False)
        f = note_freq(m)
        wave_b = 2 * ((ft * f) % 1) - 1
        music[st:st + ln] += wave_b * env(ln, 0.005, 0.06) * 0.12

# soft kick on each beat
for b in range(int(total / beat)):
    st = int(b * beat * SR)
    ln = int(0.12 * SR)
    if st + ln > n:
        break
    kt = np.linspace(0, 0.12, ln, False)
    k = np.sin(2 * np.pi * (110 * np.exp(-kt * 30)) * kt) * np.exp(-kt * 18)
    music[st:st + ln] += k * 0.4

# seamless loop crossfade
xf = int(SR * 0.05)
music[:xf] *= np.linspace(0, 1, xf)
music[-xf:] *= np.linspace(1, 0, xf)
music *= 0.9
write_wav("music.wav", music)

print("done")
