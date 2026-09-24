"""Generate CC0 game audio (synthesized) into frontend/assets/audio as WAV.
Richer, punchier cartoon SFX + synthwave loop. Royalty-free by construction.
"""
import os
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
    if kind == "tri":
        return 2 * np.abs(2 * (t * freq - np.floor(t * freq + 0.5))) - 1
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


def note_freq(midi):
    return 440.0 * 2 ** ((midi - 69) / 12.0)


# ---- click (soft bubbly UI tap) ----
d = 0.09
n = int(SR * d)
s = (tone(520, d, "tri") * 0.6 + tone(1040, d, "sine") * 0.3)
s *= env(n, 0.002, 0.08) * 0.45
write_wav("click.wav", s)

# ---- merge (bright rising 3-note arpeggio - very satisfying) ----
notes = [note_freq(72), note_freq(76), note_freq(79)]  # C E G
segs = []
for i, f in enumerate(notes):
    dd = 0.12
    nn = int(SR * dd)
    seg = (tone(f, dd, "tri") * 0.6 + tone(f * 2, dd, "sine") * 0.25)
    seg *= env(nn, 0.004, 0.1)
    segs.append(seg)
s = np.concatenate(segs)
# add a sparkle tail
tail = tone(note_freq(84), 0.18, "sine") * env(int(SR * 0.18), 0.01, 0.16) * 0.3
s = np.concatenate([s, tail]) * 0.5
write_wav("merge.wav", s)

# ---- coin (classic 2-note ding, cartoony) ----
d1, d2 = 0.05, 0.16
c1 = tone(988, d1, "tri") * env(int(SR * d1), 0.002, 0.03)
c2 = (tone(1319, d2, "tri") * 0.7 + tone(2637, d2, "sine") * 0.2) * env(int(SR * d2), 0.002, 0.14)
s = np.concatenate([c1, c2]) * 0.42
write_wav("coin.wav", s)

# ---- whoosh (near miss - filtered noise swish) ----
d = 0.32
n = int(SR * d)
noise = np.random.randn(n)
k = 40
kernel = np.ones(k) / k
filt = np.convolve(noise, kernel, mode="same")
e = np.sin(np.linspace(0, np.pi, n)) ** 1.8
doppler = sweep(500, 180, d, "sine") * 0.15
s = (filt * e + doppler * e) * 0.55
write_wav("whoosh.wav", s)

# ---- crash (impact: noise burst + low thud + metal clang) ----
d = 0.6
n = int(SR * d)
noise = np.random.randn(n) * np.exp(-np.linspace(0, 7, n))
thud = sweep(180, 35, d, "sine") * np.exp(-np.linspace(0, 5, n))
clang = (tone(430, d, "square") * 0.3 + tone(610, d, "square") * 0.2) * np.exp(-np.linspace(0, 9, n))
s = (noise * 0.6 + thud * 0.8 + clang * 0.4) * 0.62
write_wav("crash.wav", s)

# ---- boost (energetic riser + shimmer chord) ----
d = 0.7
n = int(SR * d)
up = sweep(180, 1400, d, "saw") * env(n, 0.02, 0.3)
shimmer = (tone(note_freq(84), d, "sine") + tone(note_freq(88), d, "sine")) * env(n, 0.25, 0.3) * 0.2
whoos = np.convolve(np.random.randn(n), np.ones(30) / 30, mode="same") * np.sin(np.linspace(0, np.pi, n)) * 0.2
s = (up * 0.5 + shimmer + whoos) * 0.48
write_wav("boost.wav", s)

# ---- engine loop (layered sawtooth + vibrato + rumble) ----
d = 1.0
n = int(SR * d)
t = np.linspace(0, d, n, False)
vib = 5 * np.sin(2 * np.pi * 8 * t)
base = 88 + vib
phase = 2 * np.pi * np.cumsum(base) / SR
saw = 2 * (phase / (2 * np.pi) - np.floor(0.5 + phase / (2 * np.pi)))
saw2 = 2 * ((phase * 2) / (2 * np.pi) - np.floor(0.5 + (phase * 2) / (2 * np.pi)))
rumble = np.convolve(np.random.randn(n), np.ones(8) / 8, mode="same") * 0.08
s = (saw * 0.34 + saw2 * 0.12 + rumble) * 0.5
xf = int(SR * 0.02)
s[:xf] *= np.linspace(0, 1, xf)
s[-xf:] *= np.linspace(1, 0, xf)
write_wav("engine.wav", s)

# ---- synthwave music loop (~16s) ----
bpm = 120
beat = 60.0 / bpm
bar = beat * 4
total = bar * 8
n = int(SR * total)
t = np.linspace(0, total, n, False)
music = np.zeros(n)

prog = [57, 53, 48, 55]  # Am F C G
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
    music[start:start + length] += seg * e * 0.055

# lead pluck melody (quarter notes)
lead = [72, 76, 79, 76, 72, 74, 77, 74]
for i in range(8):
    for j in range(4):
        m = lead[(i + j) % len(lead)] + (0 if i < 4 else 0)
        st = int((i * bar + j * beat) * SR)
        ln = int(beat * 0.7 * SR)
        if st + ln > n:
            break
        ft = np.linspace(0, beat * 0.7, ln, False)
        f = note_freq(m)
        pluck = (np.sin(2 * np.pi * f * ft) * 0.6 + (2 * ((ft * f) % 1) - 1) * 0.3)
        music[st:st + ln] += pluck * env(ln, 0.005, 0.12) * 0.07

# bass arpeggio (eighth notes)
eighth = beat / 2
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
        music[st:st + ln] += wave_b * env(ln, 0.005, 0.06) * 0.11

# punchy kick on each beat
for b in range(int(total / beat)):
    st = int(b * beat * SR)
    ln = int(0.13 * SR)
    if st + ln > n:
        break
    kt = np.linspace(0, 0.13, ln, False)
    k = np.sin(2 * np.pi * (120 * np.exp(-kt * 32)) * kt) * np.exp(-kt * 16)
    music[st:st + ln] += k * 0.42

# hats on off-beats
for b in range(int(total / eighth)):
    if b % 2 == 0:
        continue
    st = int(b * eighth * SR)
    ln = int(0.04 * SR)
    if st + ln > n:
        break
    music[st:st + ln] += np.random.randn(ln) * np.exp(-np.linspace(0, 20, ln)) * 0.08

xf = int(SR * 0.05)
music[:xf] *= np.linspace(0, 1, xf)
music[-xf:] *= np.linspace(1, 0, xf)
music *= 0.92
write_wav("music.wav", music)

print("done")
