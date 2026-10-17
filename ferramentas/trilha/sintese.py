# =============================================================
#  Motor de síntese da trilha sonora de Contos do Abismo
#  Todos os instrumentos são gerados por código (nada de samples).
#  Usado por compor.py.
# =============================================================
import numpy as np
from scipy import signal

SR = 44100
rng = np.random.default_rng(7)


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def env_adsr(n, a, d, s, r, sustain_len):
    """envelope ADSR em amostras: a,d,r em segundos; sustain_len = duração da nota (s)"""
    A, D, R = int(a * SR) + 1, int(d * SR) + 1, int(r * SR) + 1
    S = max(0, int(sustain_len * SR) - A - D)
    e = np.concatenate([np.linspace(0, 1, A), np.linspace(1, s, D), np.full(S, s), np.linspace(s, 0, R)])
    if len(e) < n:
        e = np.pad(e, (0, n - len(e)))
    return e[:n]


def lowpass(x, fc, order=2):
    fc = min(fc, SR * 0.45)
    b, a = signal.butter(order, fc / (SR / 2), 'low')
    return signal.lfilter(b, a, x)


def highpass(x, fc, order=2):
    b, a = signal.butter(order, fc / (SR / 2), 'high')
    return signal.lfilter(b, a, x)


def bandpass(x, lo, hi, order=2):
    b, a = signal.butter(order, [lo / (SR / 2), min(hi, SR * 0.45) / (SR / 2)], 'band')
    return signal.lfilter(b, a, x)


def additive(freq, n, amps, ratios=None, decays=None, vib=(0, 0), phase_rand=True):
    """soma de senóides (parciais). vib = (Hz, profundidade em semitons)"""
    t = np.arange(n) / SR
    ph_mod = 0
    if vib[1]:
        # vibrato que entra devagar
        depth = vib[1] * np.minimum(1, t / 0.4)
        ph_mod = np.cumsum(2 ** (depth / 12 * np.sin(2 * np.pi * vib[0] * t)) - 1) / SR
    out = np.zeros(n)
    for k, amp in enumerate(amps):
        r = ratios[k] if ratios is not None else k + 1
        f = freq * r
        if f > SR * 0.45 or amp == 0:
            continue
        ph = rng.uniform(0, 2 * np.pi) if phase_rand else 0
        w = np.sin(2 * np.pi * f * (t + ph_mod) + ph)
        if decays is not None:
            w *= np.exp(-t * decays[k])
        out += amp * w
    return out


# ---------------- instrumentos ----------------
# Cada nota é gerada sempre igual (semente fixa pelos parâmetros): assim o mesmo
# trecho tocado de novo no loop tem a mesma forma de onda e a emenda não estala.
import functools
import zlib


def deterministic(fn):
    @functools.wraps(fn)
    def wrapper(*args, **kw):
        key = repr((fn.__name__, [round(a, 5) if isinstance(a, float) else a for a in args], sorted(kw.items())))
        rng.bit_generator.state = np.random.default_rng(zlib.crc32(key.encode())).bit_generator.state
        return fn(*args, **kw)
    return wrapper

@deterministic
def piano(m, dur, vel=0.8):
    f = mtof(m)
    n = int((dur + 2.5) * SR)
    t = np.arange(n) / SR
    B = 0.0004
    out = np.zeros(n)
    for k in range(1, 12):
        fk = f * k * np.sqrt(1 + B * k * k)
        if fk > 12000:
            break
        amp = (1 / k ** 1.3) * (0.6 + 0.4 * vel) * (1 if k < 3 else vel)
        dec = 1.1 + 0.45 * k + f / 600
        out += amp * np.sin(2 * np.pi * fk * t + rng.uniform(0, 6.28)) * np.exp(-t * dec)
    # leve batida do martelo
    ham = highpass(rng.standard_normal(int(0.012 * SR)), 1500) * np.linspace(1, 0, int(0.012 * SR)) * 0.08 * vel
    out[:len(ham)] += ham
    # abafa quando solta a tecla
    rel = np.ones(n)
    i = int(dur * SR)
    if i < n:
        rel[i:] = np.exp(-np.arange(n - i) / SR * 9)
    att = np.minimum(1, t / 0.003)
    return out * rel * att * vel * 0.32


@deterministic
def pluck(m, dur, vel=0.8, bright=0.5, decay=0.996, nylon=True):
    """violão (Karplus-Strong vetorizado por período)"""
    f = mtof(m)
    N = int(SR / f)
    n = int((dur + 1.2) * SR)
    periods = n // N + 2
    y = np.zeros(periods * N)
    burst = rng.uniform(-1, 1, N)
    burst = lowpass(burst, 1500 + 6000 * bright, 1)
    y[:N] = burst
    for p in range(1, periods):
        prev = y[(p - 1) * N:p * N]
        sh = np.concatenate([[y[(p - 1) * N - 1] if p > 1 else 0], prev[:-1]])
        y[p * N:(p + 1) * N] = decay * 0.5 * (prev + sh)
    y = y[:n]
    if nylon:
        y = lowpass(y, 3500, 1)
    rel = np.ones(n)
    i = int(dur * SR)
    if i < n:
        rel[i:] = np.exp(-np.arange(n - i) / SR * 6)
    return y * rel * vel * 0.5


@deterministic
def organ(m, dur, vel=0.7):
    f = mtof(m)
    n = int((dur + 0.25) * SR)
    # registros (como drawbars): sub, fundamental, oitava, 12ª, 15ª, 17ª, 19ª
    amps = [0.55, 1.0, 0.7, 0.45, 0.35, 0.12, 0.2, 0.1]
    ratios = [0.5, 1, 2, 3, 4, 5, 6, 8]
    out = additive(f, n, amps, ratios, vib=(6.2, 0.08))
    out += 0.6 * additive(f * 1.003, n, amps, ratios, vib=(5.7, 0.08))      # coro/rotativo
    e = env_adsr(n, 0.012, 0.05, 0.85, 0.12, dur)
    click = np.zeros(n)
    c = int(0.004 * SR)
    click[:c] = rng.standard_normal(c) * 0.15
    return (out * e + click) * vel * 0.12


def saw_amps(f, cutoff, nmax=40):
    k = np.arange(1, nmax + 1)
    a = 1 / k
    a *= 1 / np.sqrt(1 + (f * k / cutoff) ** 4)       # filtro passa-baixa suave
    return a


@deterministic
def strings(m, dur, vel=0.6, attack=0.35, cutoff=2600, vib=0.12):
    f = mtof(m)
    n = int((dur + 0.6) * SR)
    out = np.zeros(n)
    for det in (-0.09, -0.03, 0.04, 0.1):
        ff = f * 2 ** (det / 12)
        out += additive(ff, n, saw_amps(ff, cutoff), vib=(5.2 + det * 4, vib))
    e = env_adsr(n, attack, 0.2, 0.9, 0.5, dur)
    return out * e * vel * 0.06


@deterministic
def choir(m, dur, vel=0.5, vowel='a'):
    f = mtof(m)
    n = int((dur + 0.8) * SR)
    F = {'a': [(730, 1.0, 90), (1090, 0.45, 110), (2440, 0.07, 160)],
         'o': [(570, 1.0, 80), (840, 0.4, 100), (2410, 0.04, 160)]}[vowel]
    out = np.zeros(n)
    for det in (-0.12, 0.0, 0.11):
        ff = f * 2 ** (det / 12)
        k = np.arange(1, 50)
        fk = ff * k
        amps = sum(a * np.exp(-((fk - fc) / bw) ** 2 / 2) for fc, a, bw in F) + 0.05 / k
        amps[fk > SR * 0.45] = 0
        out += additive(ff, n, amps, vib=(4.8 + det * 3, 0.18))
    breath = bandpass(rng.standard_normal(n), 900, 3000) * 0.02
    e = env_adsr(n, 0.45, 0.2, 0.9, 0.7, dur)
    return (out + breath) * e * vel * 0.09


@deterministic
def bass(m, dur, vel=0.8, cutoff=900):
    f = mtof(m)
    n = int((dur + 0.15) * SR)
    t = np.arange(n) / SR
    out = additive(f, n, saw_amps(f, cutoff, 30))
    out += 0.6 * np.sin(2 * np.pi * f * t)
    e = env_adsr(n, 0.004, 0.12, 0.65, 0.06, dur)
    return np.tanh(out * 1.5) * e * vel * 0.22


@deterministic
def bell(m, dur, vel=0.5):
    f = mtof(m)
    n = int((dur + 3.5) * SR)
    ratios = [0.5, 1, 1.19, 2.0, 2.76, 4.07, 5.4]
    amps = [0.3, 1, 0.35, 0.5, 0.3, 0.18, 0.1]
    decs = [0.6, 0.9, 1.4, 1.3, 2.0, 2.8, 3.5]
    out = additive(f, n, amps, ratios, decs)
    out *= np.minimum(1, np.arange(n) / SR / 0.002)
    return out * vel * 0.13


@deterministic
def lead_saw(m, dur, vel=0.7, cutoff=3200):
    """violino 'sintético' para contracanto"""
    f = mtof(m)
    n = int((dur + 0.3) * SR)
    out = additive(f, n, saw_amps(f, cutoff), vib=(5.6, 0.22))
    out += additive(f * 1.004, n, saw_amps(f, cutoff), vib=(5.1, 0.22))
    e = env_adsr(n, 0.06, 0.1, 0.85, 0.25, dur)
    return out * e * vel * 0.07


# ---------------- guitarra distorcida (chefe) ----------------
@deterministic
def dist_guitar(root, dur, vel=0.8, mute=False, chord=(0, 7, 12)):
    n = int((dur + (0.05 if mute else 0.35)) * SR)
    out = np.zeros(n)
    for iv in chord:
        f = mtof(root + iv)
        for det in (-0.06, 0.06):
            ff = f * 2 ** (det / 12)
            out += additive(ff, n, saw_amps(ff, 5000, 60))
    t = np.arange(n) / SR
    if mute:
        e = np.exp(-t * 18) * np.minimum(1, t / 0.002)
    else:
        e = env_adsr(n, 0.003, 0.15, 0.75, 0.2, dur)
    x = out * e * (2.5 + 2 * vel)
    x = highpass(x, 90)
    x = np.tanh(x * 3.0)                       # saturação
    x = np.tanh(x * 1.5)
    x = lowpass(x, 1100 if mute else 4200, 2)   # caixa do amplificador
    x = x + 0.4 * bandpass(x, 1500, 3200)
    return x * vel * 0.16


# ---------------- bateria ----------------
@deterministic
def kick(vel=1.0):
    n = int(0.45 * SR)
    t = np.arange(n) / SR
    f = 45 + 95 * np.exp(-t * 28)
    out = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7)
    out[:120] += rng.standard_normal(120) * 0.3
    return np.tanh(out * 1.6) * vel * 0.55


@deterministic
def snare(vel=1.0):
    n = int(0.3 * SR)
    t = np.arange(n) / SR
    tone = np.sin(2 * np.pi * 185 * t) * np.exp(-t * 25)
    nz = bandpass(rng.standard_normal(n), 1200, 8000) * np.exp(-t * 16)
    return (tone * 0.6 + nz * 0.9) * vel * 0.3


@deterministic
def hat(vel=1.0, open_=False):
    n = int((0.3 if open_ else 0.07) * SR)
    t = np.arange(n) / SR
    nz = highpass(rng.standard_normal(n), 7000) * np.exp(-t * (9 if open_ else 55))
    return nz * vel * 0.12


@deterministic
def tom(m, vel=1.0):
    n = int(0.5 * SR)
    t = np.arange(n) / SR
    f0 = mtof(m)
    f = f0 * (1 + 0.5 * np.exp(-t * 20))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 6) * vel * 0.4


@deterministic
def crash(vel=1.0):
    n = int(2.2 * SR)
    t = np.arange(n) / SR
    nz = highpass(rng.standard_normal(n), 4500) * np.exp(-t * 2.2)
    return nz * vel * 0.12


@deterministic
def taiko(vel=1.0):
    n = int(0.9 * SR)
    t = np.arange(n) / SR
    f = 60 + 40 * np.exp(-t * 15)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 4.5)
    skin = lowpass(rng.standard_normal(n), 900) * np.exp(-t * 18)
    return (body + 0.5 * skin) * vel * 0.5


def rain(n, vel=1.0):
    """chuva periódica (o fim emenda no começo): ruído rosado moldado na frequência + gotas"""
    spec = np.fft.rfft(rng.standard_normal(n))
    f = np.fft.rfftfreq(n, 1 / SR)
    shape = 1 / np.sqrt(np.maximum(f, 20)) * (f > 250) * np.exp(-(f / 6000) ** 2)
    pink = np.fft.irfft(spec * shape, n)
    pink /= np.std(pink)
    drops = np.zeros(n)
    L = 1200
    tt = np.arange(L) / SR
    for _ in range(int(n / SR * 7)):
        i = rng.integers(0, n)
        fr = rng.uniform(1800, 4200)
        d = np.sin(2 * np.pi * fr * tt * (1 - tt * 8)) * np.exp(-tt * 90) * rng.uniform(0.5, 2.0)
        idx = (i + np.arange(L)) % n
        drops[idx] += d
    return (pink * 0.5 + drops * 0.6) * vel


# ---------------- mesa de mixagem ----------------
class Mix:
    """buffer estéreo + envio para reverb"""

    def __init__(self, seconds):
        self.n = int(seconds * SR)
        self.dry = np.zeros((2, self.n))
        self.wet = np.zeros((2, self.n))

    def add(self, x, t, pan=0.0, gain=1.0, rev=0.25):
        i = int(round(t * SR))
        if i >= self.n:
            return
        x = x[:self.n - i] * gain
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        self.dry[0, i:i + len(x)] += x * l * (1 - rev * 0.5)
        self.dry[1, i:i + len(x)] += x * r * (1 - rev * 0.5)
        self.wet[0, i:i + len(x)] += x * l * rev
        self.wet[1, i:i + len(x)] += x * r * rev

    def render(self, room=2.6, predelay=0.02, damp=4500):
        # sala de pedra: resposta ao impulso de ruído decaindo, diferente em cada canal
        L = int(room * SR)
        t = np.arange(L) / SR
        out = self.dry.copy()
        for ch in range(2):
            ir = rng.standard_normal(L) * np.exp(-t * 6.9 / room)
            ir = lowpass(ir, damp, 1)
            ir = np.concatenate([np.zeros(int(predelay * SR)), ir])
            ir /= np.sqrt(np.sum(ir ** 2))
            out[ch] += signal.fftconvolve(self.wet[ch], ir)[:self.n] * 0.9
        return out


def master(x, rms_db=-18.0, ceiling=0.92):
    """nivela pelo volume médio (RMS) e limita os picos com saturação suave"""
    x = x - np.mean(x, axis=1, keepdims=True)
    x = highpass(x, 30)
    rms = np.sqrt(np.mean(x ** 2))
    x = x * (10 ** (rms_db / 20) / rms)
    knee = 0.7
    over = np.abs(x) > knee
    x[over] = np.sign(x[over]) * (knee + (ceiling - knee) * np.tanh((np.abs(x[over]) - knee) / (ceiling - knee)))
    return x
