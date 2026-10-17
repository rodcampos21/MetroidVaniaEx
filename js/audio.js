// =============================================================
//  MÚSICA — trilha original (assets/musica, gerada por ferramentas/trilha/compor.py)
//   menu       → "Contos do Abismo (prelúdio)": piano, violão e chuva
//   exploracao → "Contos do Abismo": piano → violão flamenco → órgão gótico → rasgueado
//   chefe      → "Riff do Pecador": guitarra drop D, órgão e coral (luta contra o Jorge)
//  Cada faixa tem um trecho que repete sem emenda (loopStart → loopEnd).
// =============================================================

const MUSIC_TRACKS = {
  menu: { file: 'menu.mp3', loopStart: 3.0, loopEnd: 41.4 },
  exploracao: { file: 'exploracao.mp3', loopStart: 3.0, loopEnd: 89.4 },
  chefe: { file: 'chefe.mp3', loopStart: 8.7143, loopEnd: 48.7143 },
};
const MUSIC_KEY = 'contos_abismo_musica_v1';

const Music = {
  ctx: null, master: null, filter: null, duck: null,
  volume: 0.7, current: null, want: null,
  buffers: {}, loading: {}, voices: {}, html: false,

  init() {
    try { const v = parseFloat(localStorage.getItem(MUSIC_KEY)); if (!isNaN(v)) this.volume = Math.min(1, Math.max(0, v)); } catch (_) {}
    // o navegador só deixa tocar som depois de um toque/tecla do jogador
    const unlock = () => this.unlock();
    ['pointerdown', 'keydown', 'touchstart'].forEach(ev => addEventListener(ev, unlock, { capture: true, passive: true }));
    addEventListener('keydown', e => {          // M liga/desliga a música
      if (e.code === 'KeyM' && !e.repeat && !(typeof KeyBinds !== 'undefined' && KeyBinds.open) &&
          !Input.ACTIONS.some(([a]) => Input.isKey(a, 'KeyM'))) {   // a não ser que M tenha virado comando
        this.setVolume(this.volume > 0 ? 0 : (this.lastVol || 0.7));
        this.toast(this.volume > 0 ? `♪ Música: ${Math.round(this.volume * 100)}%` : '♪ Música desligada');
      }
    });
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) this.ctx.suspend(); else this.ctx.resume();
    });
  },

  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.gain.value = this.volume;
    this.filter = this.ctx.createBiquadFilter(); this.filter.type = 'lowpass'; this.filter.frequency.value = 20000; this.filter.Q.value = 0.5;
    this.duck = this.ctx.createGain();
    this.duck.connect(this.filter); this.filter.connect(this.master); this.master.connect(this.ctx.destination);
    // carrega a faixa que vai tocar agora e depois as outras
    const order = [this.want || 'menu', 'exploracao', 'chefe', 'menu'];
    order.reduce((p, n) => p.then(() => this.load(n)), Promise.resolve());
  },

  load(name) {
    if (this.buffers[name] || this.loading[name]) return this.loading[name] || Promise.resolve();
    const url = `assets/musica/${MUSIC_TRACKS[name].file}?v=${ASSET_V}`;
    this.loading[name] = fetch(url)
      .then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then(b => new Promise((ok, bad) => this.ctx.decodeAudioData(b, ok, bad)))
      .then(buf => { this.buffers[name] = buf; if (this.want === name && this.current !== name) this.switchTo(name); })
      .catch(() => { this.html = true; if (this.want === name) this.switchTo(name); });   // aberto direto do arquivo: usa <audio>
    return this.loading[name];
  },

  // ---- troca de faixa com fade ----
  play(name, fade = 1.2) {
    if (this.want === name) return;
    this.want = name; this.fadeT = fade;
    if (!this.ctx) return;
    this.switchTo(name, fade);
  },
  switchTo(name, fade = this.fadeT || 1.2) {
    const now = this.ctx.currentTime;
    for (const [n, v] of Object.entries(this.voices)) {      // apaga a faixa antiga
      if (n === name) continue;
      this.ramp(v, 0, fade);
      v.stopAt = performance.now() + fade * 1000 + 100;
    }
    this.current = name;
    if (!name || this.voices[name]) {
      if (name) { this.ramp(this.voices[name], 1, fade); this.voices[name].stopAt = 0; }
      return;
    }
    const T = MUSIC_TRACKS[name];
    if (this.buffers[name]) {
      const gain = this.ctx.createGain(); gain.gain.value = 0; gain.connect(this.duck);
      const src = this.ctx.createBufferSource(); src.buffer = this.buffers[name];
      src.loop = true; src.loopStart = T.loopStart; src.loopEnd = T.loopEnd;
      src.connect(gain); src.start();
      this.voices[name] = { src, gain, stopAt: 0 };
    } else if (this.html) {
      // jogo aberto direto do arquivo (file://): o navegador não deixa ler o mp3 pelo WebAudio,
      // então toca num <audio> comum e o volume/fade/loop são feitos à mão no tick()
      const el = new Audio(`assets/musica/${T.file}?v=${ASSET_V}`);
      el.volume = 0; el.play().catch(() => {});
      this.voices[name] = { el, level: 0, target: 0, speed: 1, stopAt: 0 };
    } else {
      this.load(name);                                       // ainda baixando: toca quando chegar
      this.current = null;
      return;
    }
    this.ramp(this.voices[name], 1, fade);
  },
  ramp(v, to, fade) {
    if (v.gain) {
      const now = this.ctx.currentTime, g = v.gain.gain;
      g.cancelScheduledValues(now); g.setValueAtTime(g.value, now); g.linearRampToValueAtTime(to, now + fade);
    } else { v.target = to; v.speed = 1 / Math.max(0.05, fade); }
  },

  toast(msg) {
    let el = document.getElementById('toast');
    if (!el) { el = document.createElement('div'); el.id = 'toast'; document.body.appendChild(el); }
    el.textContent = msg; el.classList.add('show');
    clearTimeout(this.toastT); this.toastT = setTimeout(() => el.classList.remove('show'), 1400);
  },
  setVolume(v) {
    if (v > 0) this.lastVol = v;
    this.volume = v;
    try { localStorage.setItem(MUSIC_KEY, String(v)); } catch (_) {}
    if (this.master) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
    const s = document.getElementById('musicVol'); if (s && +s.value !== Math.round(v * 100)) s.value = Math.round(v * 100);
    const l = document.getElementById('musicVolLabel'); if (l) l.textContent = v > 0 ? Math.round(v * 100) + '%' : 'desligada';
  },

  // ---- chamado todo quadro: escolhe a faixa conforme o que acontece no jogo ----
  tick() {
    let want = 'exploracao';
    if (G.state === 'title') want = 'menu';
    else {
      const boss = G.enemies.find(e => e.isBoss);
      if (boss && boss.state === 'dying') want = null;               // silêncio dramático na morte do chefe
      else if (boss && boss.state !== 'idle' && boss.state !== 'dead') want = 'chefe';
      else if (this.want === null && G.time - (this.silentT || 0) < 3) want = null;   // respira antes de voltar
    }
    if (want === null && this.want !== null) this.silentT = G.time;
    this.play(want, want === 'chefe' ? 0.6 : want === null ? 1.5 : 2.0);
    if (!this.ctx) return;
    // pausa e morte: música abafada e mais baixa
    const muffled = G.paused || G.state === 'dead' || (typeof Controls !== 'undefined' && Controls.open) || (typeof KeyBinds !== 'undefined' && KeyBinds.open);
    const now = this.ctx.currentTime;
    if (muffled !== this.wasMuffled) {
      this.wasMuffled = muffled;
      this.filter.frequency.setTargetAtTime(muffled ? 900 : 20000, now, 0.15);
      this.duck.gain.setTargetAtTime(muffled ? 0.45 : 1, now, 0.15);
    }
    // limpa faixas que terminaram o fade; <audio> (sem WebAudio) faz o loop na mão
    for (const [n, v] of Object.entries(this.voices)) {
      if (v.stopAt && performance.now() > v.stopAt) {
        try { v.src && v.src.stop(); } catch (_) {}
        if (v.el) v.el.pause();
        if (v.gain) v.gain.disconnect();
        delete this.voices[n];
        continue;
      }
      if (v.el) {
        const T = MUSIC_TRACKS[n], dt = 1 / 60;
        v.level = approach(v.level, v.target, v.speed * dt);
        v.el.volume = Math.max(0, Math.min(1, v.level * this.volume * (muffled ? 0.45 : 1)));
        if (v.el.currentTime >= T.loopEnd) v.el.currentTime -= T.loopEnd - T.loopStart;
      }
    }
  },
};
