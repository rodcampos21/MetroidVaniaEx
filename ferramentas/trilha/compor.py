# =============================================================
#  Trilha sonora de Contos do Abismo — composição original
#
#  Mescla de cinco referências (só o estilo, nenhuma melodia copiada):
#   1. Castlevania: Symphony of the Night — "Dracula's Castle" (Michiru Yamane)
#      → rock gótico: órgão em primeiro plano, baixo "galopando", escala menor harmônica
#   2. Hollow Knight — "City of Tears" (Christopher Larkin)
#      → piano melancólico em arpejos, chuva ao fundo, muito espaço/reverb
#   3. Super Metroid — "Brinstar" / "Maridia" (Kenji Yamamoto, Minako Hamano)
#      → clima de isolamento: drone grave, sinos esparsos, segunda menor "ameaçadora"
#   4. Blasphemous — trilha de Carlos Viola
#      → violão flamenco, cadência andaluza (Dm–C–Bb–A), coral sacro, rasgueado
#   5. Dead Cells — "Prisoners' Awakening" (Yoann Laulan)
#      → seção de ação: percussão tocando para a frente, contracanto de cordas
#
#  Uso:  python3 compor.py   (gera assets/musica/*.mp3 e assets/musica/loops.json)
# =============================================================
import json
import os
import subprocess
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
from sintese import (SR, Mix, bass, bell, choir, crash, dist_guitar, hat, kick, lead_saw, master, organ,
                     piano, pluck, rain, snare, strings, taiko, tom)

OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'assets', 'musica')

# notas (MIDI)
N = {}
for o in range(1, 8):
    for i, name in enumerate(['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B']):
        N[f'{name}{o}'] = 12 * (o + 1) + i


def notes(s):
    """'D5:1.5 F5:.5 -:1' -> [(midi|None, dur)]"""
    out = []
    for tok in s.split():
        p, d = tok.split(':')
        out.append((None if p == '-' else N[p], float(d)))
    return out


def line(mix, t0, beat, seq, inst, pan=0, gain=1, rev=0.3, **kw):
    """toca uma sequência de notas a partir de t0; devolve o tempo final"""
    t = t0
    for p, d in seq:
        if p is not None:
            mix.add(inst(p, d * beat * 0.98, **kw), t, pan, gain, rev)
        t += d * beat
    return t


# escala para harmonizar em terças (menor harmônica de Ré; Dó natural sobre C e F)
def third_below(m, chord):
    pcs = [2, 4, 5, 7, 9, 10, 0 if chord in ('C', 'F') else 1]
    pcs = sorted(pcs)
    for k in range(1, 6):
        if (m - k) % 12 in pcs:
            # segundo grau da escala abaixo
            cand = [x for x in range(m - 5, m) if x % 12 in pcs]
            return cand[-2] if len(cand) >= 2 else m - 3
    return m - 3


CH = {  # acordes: baixo + vozes
    'Dm': (N['D2'], [N['D3'], N['A3'], N['D4'], N['F4']]),
    'C': (N['C2'], [N['C3'], N['G3'], N['C4'], N['E4']]),
    'Bb': (N['Bb1'], [N['Bb2'], N['F3'], N['Bb3'], N['D4']]),
    'A': (N['A1'], [N['A2'], N['E3'], N['A3'], N['C#4']]),
    'Gm': (N['G1'], [N['G2'], N['D3'], N['G3'], N['Bb3']]),
    'F': (N['F1'], [N['F2'], N['C3'], N['F3'], N['A3']]),
}

# ---------------- melodias originais ----------------
MEL_B = [  # tema principal (violão) sobre Dm C Bb A ×2
    'D5:1.5 F5:.5 E5:1 D5:1', 'E5:1 C5:1 G4:1.5 C5:.5', 'D5:1.5 Bb4:.5 A4:.5 Bb4:.5 D5:1', 'C#5:2 E5:1 A4:1',
    'F5:1.5 E5:.5 D5:1 A5:1', 'G5:.5 F5:.5 E5:1 C5:1 E5:1', 'F5:1 D5:.5 Bb4:.5 D5:.5 F5:.5 E5:1', 'C#5:1 E5:1 A5:2',
]
CH_B = ['Dm', 'C', 'Bb', 'A', 'Dm', 'C', 'Bb', 'A']

MEL_C = [  # órgão (ação, à la Castlevania) sobre Dm Bb Gm A Dm F Gm/A Dm
    'D5:.75 D5:.25 F5:.5 A5:.5 G5:.5 F5:.5 E5:.5 F5:.5', 'D5:1.5 Bb4:.5 C5:.5 D5:.5 F5:1',
    'G5:.75 F5:.25 E5:.5 D5:.5 Bb4:1 D5:.5 G5:.5', 'A5:1.5 G5:.25 F5:.25 E5:.5 C#5:.5 A4:1',
    'A5:.5 D6:.5 C#6:.5 D6:.5 A5:1 F5:1', 'C6:.75 A5:.25 F5:.5 A5:.5 C6:1 A5:1',
    'Bb5:1 A5:.5 G5:.5 C#6:.5 Bb5:.25 A5:.25 G5:.5 E5:.5', 'D5:3 C#5:.25 D5:.25 E5:.25 F5:.25',
]
CH_C = ['Dm', 'Bb', 'Gm', 'A', 'Dm', 'F', ('Gm', 'A'), 'Dm']


def chord_of(c, beat_in_bar):
    if isinstance(c, tuple):
        return c[0] if beat_in_bar < 2 else c[1]
    return c


# ---------------- partes ----------------
def piano_arps(mix, t0, beat, bars, gain=1.0):
    pats = {
        'Dm': ['D3', 'A3', 'E4', 'F4', 'A4', 'F4', 'E4', 'A3'],
        'Bb': ['Bb2', 'F3', 'A3', 'D4', 'F4', 'D4', 'A3', 'F3'],
        'Gm': ['G2', 'D3', 'A3', 'Bb3', 'D4', 'Bb3', 'A3', 'D3'],
        'A': ['A2', 'E3', 'A3', 'D4', 'E4', 'C#4', 'A3', 'E3'],
    }
    for b, c in enumerate(bars):
        for i, nm in enumerate(pats[c]):
            v = 0.62 if i % 4 == 0 else 0.45
            mix.add(piano(N[nm], beat * (1.6 if i % 4 == 0 else 0.9), v), t0 + (b * 4 + i * 0.5) * beat,
                    pan=-0.15 + 0.05 * (i % 3), gain=gain, rev=0.42)


def drone(mix, t0, dur, m, gain=1.0):
    mix.add(strings(m, dur, 0.5, attack=2.0, cutoff=700, vib=0.03), t0, 0, gain, 0.5)
    mix.add(strings(m + 12, dur, 0.25, attack=2.5, cutoff=900, vib=0.05), t0, 0.1, gain, 0.5)


def pad(mix, t0, beat, chords, inst='strings', gain=1.0, vowel='o'):
    for b, c in enumerate(chords):
        segs = [(c[0], 0, 2), (c[1], 2, 2)] if isinstance(c, tuple) else [(c, 0, 4)]
        for cc, st, ln in segs:
            for k, m in enumerate(CH[cc][1][1:]):
                t = t0 + (b * 4 + st) * beat
                if inst == 'strings':
                    mix.add(strings(m + 12, ln * beat, 0.45, attack=0.25), t, -0.4 + 0.4 * k, gain, 0.4)
                else:
                    mix.add(choir(m + 12, ln * beat, 0.5, vowel), t, 0.4 - 0.35 * k, gain, 0.5)


def gallop_bass(mix, t0, beat, chords, gain=1.0):
    for b, c in enumerate(chords):
        for q in range(4):
            cc = chord_of(c, q)
            r = CH[cc][0] + 12
            t = t0 + (b * 4 + q) * beat
            mix.add(bass(r, beat * 0.45, 0.85), t, 0, gain, 0.08)
            mix.add(bass(r, beat * 0.22, 0.6), t + beat * 0.5, 0, gain, 0.08)
            mix.add(bass(r, beat * 0.22, 0.7), t + beat * 0.75, 0, gain, 0.08)


def drums_rock(mix, t0, beat, bars, fill_last=True, gain=1.0, crash_every=4):
    for b in range(bars):
        tb = t0 + b * 4 * beat
        if b % crash_every == 0:
            mix.add(crash(0.8), tb, 0.3, gain, 0.3)
        for k in (0, 1.5, 2.5) if b % 2 else (0, 2, 2.75):
            mix.add(kick(0.95), tb + k * beat, 0, gain, 0.05)
        for k in (1, 3):
            mix.add(snare(0.9), tb + k * beat, 0.05, gain, 0.2)
        for k in range(8):
            mix.add(hat(0.8 if k % 2 == 0 else 0.5), tb + k * 0.5 * beat, -0.3, gain, 0.1)
        if fill_last and b == bars - 1:
            for i, m in enumerate([N['A3'], N['F3'], N['D3'], N['A2']]):
                mix.add(tom(m, 0.9), tb + (3 + i * 0.25) * beat, -0.4 + i * 0.25, gain, 0.2)


def rasgueado(mix, t, chord, beat, vel=0.7, up=False):
    vs = CH[chord][1] + [CH[chord][1][1] + 12, CH[chord][1][2] + 12]
    if up:
        vs = vs[::-1]
    for i, m in enumerate(vs):
        mix.add(pluck(m, beat * 0.9, vel * (0.8 + 0.2 * (i == 0)), bright=0.75), t + i * 0.012, -0.35 + i * 0.1, 1, 0.3)


# =============================================================
#  FAIXA 1 — "Contos do Abismo" (exploração)  100 bpm, Ré menor
# =============================================================
def exploration(mix, t0, with_drums=True, sections='ABCDE'):
    beat = 60 / 100
    bar = 4 * beat
    t = t0
    if 'A' in sections:   # --- A: chuva, piano em arpejos, drone, sinos (Hollow Knight + Super Metroid)
        piano_arps(mix, t, beat, ['Dm', 'Bb', 'Gm', 'A', 'Dm', 'Bb', 'Gm', 'A'], gain=1.0)
        drone(mix, t, 8 * bar, N["D2"], gain=0.35)
        mix.add(bell(N['A5'], 2, 0.5), t + 1 * bar + 2 * beat, 0.5, 1, 0.6)
        mix.add(bell(N['Bb5'], 2, 0.45), t + 1 * bar + 3 * beat, 0.5, 1, 0.6)        # segunda menor
        mix.add(bell(N['D6'], 2, 0.35), t + 5 * bar + 2 * beat, -0.5, 1, 0.6)
        mix.add(bell(N['C#6'], 2, 0.4), t + 5 * bar + 3 * beat, -0.5, 1, 0.6)
        pad(mix, t + 4 * bar, beat, ['Dm', 'Bb', 'Gm', 'A'], inst='choir', gain=0.55)
        t += 8 * bar
    if 'B' in sections:   # --- B: tema no violão, cadência andaluza, coral (Blasphemous)
        for b, (m, c) in enumerate(zip(MEL_B, CH_B)):
            tb = t + b * bar
            line(mix, tb, beat, notes(m), pluck, pan=0.15, gain=1.25, rev=0.32, bright=0.55)
            r, vs = CH[c]
            mix.add(bass(r + 12, bar * 0.95, 0.6, cutoff=500), tb, 0, 0.9, 0.2)
            for k, v in enumerate(vs[1:]):
                mix.add(piano(v, beat * 1.8, 0.38), tb + k * 0.04, -0.3, 1, 0.4)
                mix.add(piano(v, beat * 1.8, 0.3), tb + 2 * beat + k * 0.04, -0.3, 1, 0.4)
            if with_drums:
                mix.add(taiko(0.55), tb, 0, 1, 0.35)
                mix.add(taiko(0.35), tb + 2.5 * beat, 0, 1, 0.35)
        pad(mix, t, beat, CH_B, inst='choir', gain=0.6, vowel='a')
        t += 8 * bar
    if 'C' in sections:   # --- C: órgão + baixo galopando + bateria (Castlevania)
        for b, (m, c) in enumerate(zip(MEL_C, CH_C)):
            line(mix, t + b * bar, beat, notes(m), organ, pan=0.0, gain=0.95, rev=0.3, vel=0.8)
        pad(mix, t, beat, CH_C, inst='strings', gain=0.85)
        gallop_bass(mix, t, beat, CH_C, gain=0.8)
        drums_rock(mix, t, beat, 8, gain=0.65)
        t += 8 * bar
    if 'D' in sections:   # --- D: rasgueado + contracanto em terças + coral (Blasphemous + Dead Cells)
        for b, (m, c) in enumerate(zip(MEL_B, CH_B)):
            tb = t + b * bar
            seq = [(p + 12 if p else None, d) for p, d in notes(m)]
            line(mix, tb, beat, seq, lead_saw, pan=0.25, gain=1.0, rev=0.35, vel=0.7)
            harm = [(third_below(p, c) if p else None, d) for p, d in seq]
            line(mix, tb, beat, harm, lead_saw, pan=-0.25, gain=0.6, rev=0.35, vel=0.55)
            for k, up in ((0, False), (1.5, True), (2.5, False), (3, False), (3.5, True)):
                rasgueado(mix, tb + k * beat, c, beat * 0.5, vel=0.55 if k else 0.75, up=up)
        pad(mix, t, beat, CH_B, inst='choir', gain=0.7, vowel='a')
        gallop_bass(mix, t, beat, CH_B, gain=0.8)
        drums_rock(mix, t, beat, 8, gain=0.65)
        for b in (0, 4):
            mix.add(taiko(0.8), t + b * bar, 0, 1, 0.3)
        t += 8 * bar
    if 'E' in sections:   # --- E: respiro no piano, volta ao começo
        for b, c in enumerate(['Dm', 'Bb', 'Gm', 'A']):
            tb = t + b * bar
            for k, v in enumerate(CH[c][1]):
                mix.add(piano(v, bar * 0.95, 0.4), tb + k * 0.05, -0.2, 1, 0.45)
        line(mix, t, beat, notes('A4:2 F4:2 F4:1 D4:3 D4:2 Bb3:2 C#4:1 E4:1 A4:2'), piano, pan=0.1, gain=1.1,
             rev=0.45, vel=0.65)
        mix.add(bell(N['D6'], 3, 0.35), t + 3 * bar, 0.4, 1, 0.6)
        drone(mix, t, 4 * bar, N["D2"], gain=0.3)
        t += 4 * bar
    return t


# =============================================================
#  FAIXA 2 — "Riff do Pecador" (chefe: Jorge)  168 bpm, Ré (afinação drop D)
# =============================================================
D2 = N['D2']
RIFF1 = [(0, 0, 2, False), (2, 0, 1, True), (3, 0, 1, True), (4, 0, 1, True), (5, 0, 1, True), (6, 1, 2, False),
         (8, 0, 1, True), (9, 0, 1, True), (10, 3, 2, False), (12, 0, 1, True), (13, 0, 1, True), (14, 1, 1, False),
         (15, 0, 1, True)]
RIFF2 = [(0, 0, 2, False), (2, 0, 1, True), (3, 0, 1, True), (4, 0, 1, True), (5, 0, 1, True), (6, 10, 2, False),
         (8, 8, 2, False), (10, 7, 2, False), (12, 0, 1, True), (13, 0, 1, True), (14, 6, 1, False), (15, 7, 1, False)]
BREAK = [(0, 0, 3, False), (3, 0, 1, True), (6, 0, 1, True), (8, 1, 4, False), (12, 0, 1, True), (13, 0, 1, True),
         (14, 0, 1, True), (15, 0, 1, True)]

ORG_BOSS = ['A5:1 Bb5:.5 A5:.5 G5:.5 F5:.5 E5:1', 'F5:.5 E5:.5 D5:1 C#5:1 A4:1',
            'D5:1 F5:.5 A5:.5 D6:1 C#6:1', 'Bb5:.5 A5:.5 G5:.5 F5:.5 E5:1 C#5:1']
ORG_BOSS2 = ['D6:.5 C#6:.5 D6:.5 A5:.5 F5:.5 A5:.5 D5:1', 'Eb6:.5 D6:.5 C6:.5 Bb5:.5 A5:1 G5:1',
             'F5:.5 G5:.5 A5:.5 Bb5:.5 C#6:1 E6:1', 'D6:2 A5:1 C#5:1']
CHORUS = [('Bb', 'C'), 'D', ('Bb', 'C'), 'A', ('Bb', 'C'), 'D', ('Bb', 'C'), 'A']
CHORUS_MEL = ['F5:1.5 E5:.5 D5:1 E5:1', 'F5:2 A5:2', 'G5:1.5 F5:.5 E5:1 F5:1', 'E5:2 C#5:2',
              'D5:1.5 E5:.5 F5:1 G5:1', 'A5:2 D6:2', 'C6:1 Bb5:1 A5:1 G5:1', 'A5:4']
PC = {'D': 0, 'Bb': -4, 'C': -2, 'A': -5, 'Eb': 1}


def riff_bar(mix, t, beat, pat, kick_follow=True, gain=1.0):
    st = beat / 4
    for step, iv, ln, mute in pat:
        r = D2 + iv
        chord = (0, 7, 12) if not mute else (0, 7)
        g = dist_guitar(r, ln * st * 0.95, 0.85 if not mute else 0.7, mute=mute, chord=chord)
        mix.add(g, t + step * st, -0.55, gain, 0.12)
        mix.add(dist_guitar(r, ln * st * 0.95, 0.8 if not mute else 0.65, mute=mute, chord=chord), t + step * st + 0.008, 0.55, gain, 0.12)
        mix.add(bass(r + 12 if r < 40 else r, ln * st * 0.9, 0.8, cutoff=600), t + step * st, 0, 0.9, 0.05)
        if kick_follow and (mute or step % 4 == 0):
            mix.add(kick(0.8 if mute else 1.0), t + step * st, 0, 1, 0.03)


def metal_drums(mix, t, beat, bars, gain=1.0, half=False):
    for b in range(bars):
        tb = t + b * 4 * beat
        if b % 2 == 0:
            mix.add(crash(0.9), tb, -0.3 if b % 4 else 0.3, gain, 0.3)
        snares = (2,) if half else (1, 3)
        for k in snares:
            mix.add(snare(1.0), tb + k * beat, 0.05, gain, 0.22)
        for k in range(8):
            mix.add(hat(0.7 if k % 2 == 0 else 0.45, open_=(k == 7)), tb + k * 0.5 * beat, -0.3, gain, 0.1)


def boss_track(mix, t0, part='all'):
    beat = 60 / 168
    bar = 4 * beat
    t = t0
    if part in ('all', 'intro'):
        # órgão sozinho, ameaçador (Castlevania) + taikos; depois a guitarra entra
        arp = 'D4:.5 F4:.5 A4:.5 C#5:.5 D5:.5 C#5:.5 A4:.5 F4:.5'
        for b in range(2):
            line(mix, t + b * bar, beat, notes(arp), organ, gain=1.1, rev=0.35, vel=0.75)
            mix.add(taiko(0.9), t + b * bar, 0, 1, 0.3)
            mix.add(taiko(0.7), t + b * bar + 2.5 * beat, 0, 1, 0.3)
        mix.add(choir(N['D4'], 2 * bar, 0.6, 'o'), t, 0, 0.8, 0.5)
        mix.add(choir(N['A3'], 2 * bar, 0.5, 'o'), t, 0, 0.7, 0.5)
        for b in range(2, 4):
            riff_bar(mix, t + b * bar, beat, RIFF1 if b == 2 else RIFF2)
            line(mix, t + b * bar, beat, notes(arp), organ, gain=0.9, rev=0.35, vel=0.75)
        for i in range(8):        # virada de caixa
            mix.add(snare(0.5 + 0.06 * i), t + 3 * bar + (2 + i * 0.25) * beat, 0, 1, 0.2)
        t += 4 * bar
    if part in ('all', 'body'):
        # --- riff A com órgão
        for b in range(8):
            riff_bar(mix, t + b * bar, beat, RIFF1 if b % 2 == 0 else RIFF2)
        line(mix, t + 4 * bar, beat, sum([notes(m) for m in ORG_BOSS], []), organ, gain=1.15, rev=0.3, vel=0.85)
        metal_drums(mix, t, beat, 8)
        t += 8 * bar
        # --- refrão: acordes abertos, coral e solo
        for b, c in enumerate(CHORUS):
            segs = [(c[0], 0, 2), (c[1], 2, 2)] if isinstance(c, tuple) else [(c, 0, 4)]
            for cc, st, ln in segs:
                r = D2 + PC[cc] + (12 if PC[cc] < 0 else 0)
                for side, d in ((-0.6, 0), (0.6, 0.01)):
                    mix.add(dist_guitar(r, ln * beat * 0.97, 0.8, chord=(0, 7, 12)), t + (b * 4 + st) * beat + d, side, 0.9, 0.18)
                for k in range(ln * 2):
                    mix.add(kick(0.85), t + (b * 4 + st + k * 0.5) * beat, 0, 1, 0.03)
                mix.add(bass(r, ln * beat * 0.95, 0.8, cutoff=500), t + (b * 4 + st) * beat, 0, 0.9, 0.05)
                tri = {'D': ['D4', 'F4', 'A4'], 'Bb': ['D4', 'F4', 'Bb4'], 'C': ['E4', 'G4', 'C5'], 'A': ['C#4', 'E4', 'A4']}[cc]
                for k, nm in enumerate(tri):
                    mix.add(choir(N[nm], ln * beat, 0.55, 'a'), t + (b * 4 + st) * beat, -0.3 + 0.3 * k, 0.85, 0.5)
            line(mix, t + b * bar, beat, notes(CHORUS_MEL[b]), lead_saw, pan=0.1, gain=1.25, rev=0.35, vel=0.8, cutoff=4500)
            line(mix, t + b * bar, beat, [(p - 12, d) for p, d in notes(CHORUS_MEL[b])], organ, pan=-0.1, gain=0.6, rev=0.3, vel=0.6)
        metal_drums(mix, t, beat, 8)
        t += 8 * bar
        # --- quebra: meio-tempo pesado, sino de igreja (o "pecador")
        for b in range(4):
            riff_bar(mix, t + b * bar, beat, BREAK)
            mix.add(bell(N['D4'], 3, 0.7), t + b * bar, 0.3, 1, 0.5)
        mix.add(choir(N['D3'], 4 * bar, 0.6, 'o'), t, 0, 0.9, 0.5)
        mix.add(choir(N['Eb4'], 2 * bar, 0.45, 'o'), t + 2 * bar, 0.2, 0.7, 0.5)
        metal_drums(mix, t, beat, 4, half=True)
        t += 4 * bar
        # --- riff B: riff + segundo tema do órgão + bumbo duplo
        for b in range(8):
            riff_bar(mix, t + b * bar, beat, RIFF1 if b % 2 == 0 else RIFF2)
        line(mix, t, beat, sum([notes(m) for m in ORG_BOSS2 + ORG_BOSS], []), organ, gain=1.15, rev=0.3, vel=0.85)
        metal_drums(mix, t, beat, 8)
        for k in range(8 * 16):
            if (k // 16) % 2 == 1:
                mix.add(kick(0.6), t + k * beat / 4, 0, 1, 0.02)
        for i in range(8):
            mix.add(tom(N['A2'] - i, 0.8), t + 7 * bar + (2 + i * 0.25) * beat, -0.4 + i * 0.1, 1, 0.2)
        t += 8 * bar
    return t


# =============================================================
#  render: prefixo + corpo repetido, com pontos de loop sem emenda
# =============================================================
TAIL = 3.0   # segundos: o reverb do começo já sumiu aqui → emenda perfeita


def render_loop(name, prefix_fn, body_fn, body_len, prefix_len, with_rain=False, room=2.6, loud=-18.0):
    total = prefix_len + body_len * 2 + 4
    mix = Mix(total)
    if prefix_fn:
        prefix_fn(mix, 0)
    body_fn(mix, prefix_len)
    body_fn(mix, prefix_len + body_len)
    out = mix.render(room=room)
    if with_rain:   # chuva periódica com o tamanho do corpo → também emenda no loop
        from sintese import rain
        L = int(round(body_len * SR))
        rn = np.stack([rain(L), rain(L)])
        reps = int(np.ceil(mix.n / L)) + 1
        rn = np.tile(rn, reps)
        off = int(round(prefix_len * SR)) % L
        rn = np.roll(rn, off, axis=1)[:, :mix.n]
        out += rn * 0.012
    out = master(out, loud)
    loop_start = prefix_len + TAIL
    loop_end = loop_start + body_len
    end = loop_end + 0.6
    clip = out[:, :int(end * SR)]
    # entrada suave (só o comecinho, fora do loop)
    fi = int(0.05 * SR)
    clip[:, :fi] *= np.linspace(0, 1, fi)
    os.makedirs(OUT, exist_ok=True)
    wav = os.path.join(OUT, name + '.wav')
    import scipy.io.wavfile as wf
    wf.write(wav, SR, (clip.T * 32767).astype(np.int16))
    mp3 = os.path.join(OUT, name + '.mp3')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-codec:a', 'libmp3lame', '-b:a', '128k', mp3], check=True)
    os.remove(wav)
    print(f'{name}: {end:.1f}s, loop {loop_start:.2f}–{loop_end:.2f}s, {os.path.getsize(mp3) / 1e6:.2f} MB')
    return {'file': name + '.mp3', 'loopStart': round(loop_start, 4), 'loopEnd': round(loop_end, 4)}


if __name__ == '__main__':
    which = sys.argv[1:] or ['menu', 'exploracao', 'chefe']
    info_path = os.path.join(OUT, 'loops.json')
    info = json.load(open(info_path)) if os.path.exists(info_path) else {}
    bar100 = 4 * 60 / 100
    bar168 = 4 * 60 / 168
    if 'menu' in which:
        info['menu'] = render_loop('menu', None, lambda m, t: exploration(m, t, with_drums=False, sections='AB'),
                                   16 * bar100, 0, with_rain=True, loud=-21)
    if 'exploracao' in which:
        info['exploracao'] = render_loop('exploracao', None, lambda m, t: exploration(m, t), 36 * bar100, 0, loud=-19)
    if 'chefe' in which:
        info['chefe'] = render_loop('chefe', lambda m, t: boss_track(m, t, 'intro'), lambda m, t: boss_track(m, t, 'body'),
                                    28 * bar168, 4 * bar168, room=1.8, loud=-16)
    json.dump(info, open(info_path, 'w'), indent=1)
