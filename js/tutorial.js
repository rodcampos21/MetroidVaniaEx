// =============================================================
//  TUTORIAL INICIAL + TELA DE CONTROLES
//  - O tutorial aparece no começo de um jogo novo, na primeira sala.
//    Cada dica avança quando o jogador faz o comando pedido.
//  - Os textos mudam sozinhos entre teclado e toque (celular),
//    e no celular o botão certo pisca na tela.
// =============================================================

const isTouch = () => matchMedia('(hover: none) and (pointer: coarse)').matches;
// escolhe o texto do teclado ou do toque
const ctrl = (keys, touch) => (isTouch() ? touch : keys);

// [X] vira uma tecla desenhada; {jump} etc. vira o ícone do botão de toque
const TUT_STEPS = [
  {
    title: 'Mover',
    keys: 'Use [@left] [@right] para andar.',
    touch: 'Arraste o {dpad} para os lados para andar.',
    hint: 'dpad',
    done: (p, s) => s.walked > 60,
  },
  {
    title: 'Pular',
    keys: 'Aperte [@jump] para pular. Segure para pular mais alto.',
    touch: 'Toque em {jump} para pular. Segure para pular mais alto.',
    hint: 'jump',
    done: (p, s) => s.jumped,
  },
  {
    title: 'Atacar',
    keys: 'Aperte [@attack1] para golpear com a espada.',
    touch: 'Toque em {attack} para golpear com a espada.',
    hint: 'attack',
    done: (p, s) => s.attacked,
  },
  {
    title: 'Combo',
    keys: 'Aperte [@attack1] duas vezes seguidas: corte para baixo e depois para cima.',
    touch: 'Toque em {attack} duas vezes seguidas: corte para baixo e depois para cima.',
    hint: 'attack',
    done: (p, s) => s.combo,
  },
  {
    title: 'Dash',
    keys: 'Aperte [@sprint] para uma arrancada rápida pelo chão.',
    touch: 'Toque em {sprint} para uma arrancada rápida pelo chão.',
    hint: 'sprint',
    done: (p, s) => s.sprinted,
  },
  {
    title: 'Agachar',
    keys: 'Segure [@down] para agachar. Atacar agachado dá uma estocada.',
    touch: 'Puxe o {dpad} para baixo para agachar. Atacar agachado dá uma estocada.',
    hint: 'dpad',
    done: (p, s) => s.crouched > 0.35,
  },
  {
    title: 'Pronto!',
    keys: 'Toque nos braseiros para salvar e curar. [Esc] pausa e mostra todos os controles.',
    touch: 'Toque nos braseiros para salvar e curar. {pause} pausa e mostra todos os controles.',
    hint: null,
    done: (p, s) => s.t > 6,
  },
];

const Tutorial = {
  step: -1, t: 0, ok: 0, stats: null,

  start() {
    this.step = 0; this.t = 0; this.ok = 0; this.wait = 3.2; this.resetStats();   // espera a mensagem de abertura
  },
  stop(save = true) {
    this.step = -1; this.setHint(null);
    if (save && G.data) { G.data.tutorialDone = true; writeSave(); }
  },
  active() { return this.step >= 0; },
  resetStats() { this.stats = { walked: 0, jumped: false, attacked: false, combo: false, sprinted: false, crouched: 0, t: 0 }; },

  update(dt) {
    if (!this.active() || G.state !== 'play') return;
    if (this.wait > 0) { this.wait -= dt; this.setHint(null); return; }
    const p = G.player, s = this.stats, step = TUT_STEPS[this.step];
    this.t += dt; s.t += dt;
    s.walked += Math.abs(p.vx) * dt * (p.onGround ? 1 : 0);
    if (p.vy < -200 && !p.wall) s.jumped = true;
    if (p.atkKind) s.attacked = true;
    if (p.atkKind === 'up') s.combo = true;
    if (p.sprintT > 0) s.sprinted = true;
    s.crouched = p.crouch ? s.crouched + dt : 0;
    if (this.ok > 0) {                                      // ✓ por um instante e passa para a próxima
      this.ok -= dt;
      if (this.ok <= 0) {
        this.step++; this.t = 0; this.resetStats();
        if (this.step >= TUT_STEPS.length) return this.stop();
      }
      this.setHint(null);
      return;
    }
    this.setHint(step.hint);
    if (this.t > 0.5 && step.done(p, s)) { this.ok = 0.7; if (step.hint) spawnParticles(p.x + p.w / 2, p.y, 8, '#ffd27a', { speed: 50, life: 0.5 }); }
  },

  // faz o botão de toque certo piscar
  setHint(name) {
    if (this.hint === name) return;
    this.hint = name;
    document.querySelectorAll('.tut-hint').forEach(el => el.classList.remove('tut-hint'));
    if (!name) return;
    const el = name === 'dpad' ? document.getElementById('dpad') : document.querySelector(`[data-act="${name}"]`);
    if (el) el.classList.add('tut-hint');
  },

  draw() {
    if (!this.active() || this.wait > 0 || G.paused || G.state !== 'play') return;
    const step = TUT_STEPS[this.step];
    const msg = ctrl(step.keys, step.touch);
    const a = Math.min(1, this.t * 4) * (this.ok > 0 ? Math.min(1, this.ok * 3) : 1);
    const W = 900, H = 90, x = CW / 2 - W / 2, y = isTouch() ? 116 : 108;   // no alto, sem cobrir o herói
    ctx.save();
    ctx.globalAlpha = a;
    frameBox(x, y, W, H, 0.82);
    // título + progresso
    const done = this.ok > 0;
    text(done ? '✓  ' + step.title : step.title.toUpperCase(), x + 24, y + 12, { size: 22, font: FONT_T, weight: 800, color: done ? '#9fe08a' : '#e8c890', spacing: 2 });
    if (this.step < TUT_STEPS.length - 1)
      text(`${this.step + 1} / ${TUT_STEPS.length - 1}`, x + W - 24, y + 14, { size: 20, align: 'right', color: '#7a7466', weight: 700 });
    drawRichLine(msg, x + 24, y + 50, W - 48, done ? 0.6 : 1);
    ctx.restore();
  },
};

// desenha uma frase com teclas [X] e ícones {jump} no meio do texto
// [@jump] vira as teclas atuais da ação ("[Z] ou [Espaço]"); [@jump1] só a principal.
// Em [@left] [@right] juntos, mostra só as principais para não ficar comprido.
function expandKeys(str) {
  return str.replace(/\[@left\] \[@right\]/g, () => Input.keysOf('left', false).concat(Input.keysOf('right', false)).map(k => `[${k}]`).join(' '))
    .replace(/\[@([a-z]+?)(1?)\]/g, (_, a, one) => Input.keysOf(a, !one).map(k => `[${k}]`).join(' ou ') || '[—]');
}
function drawRichLine(str, x, y, maxW, alpha = 1) {
  str = expandKeys(str);
  const parts = str.split(/(\[[^\]]+\]|\{[a-z]+\})/).filter(Boolean);
  ctx.save();
  ctx.font = `500 23px ${FONT_B}`;
  // mede para quebrar em até 2 linhas
  const items = parts.flatMap(p => (p[0] === '[' || p[0] === '{') ? [p] : p.split(/(\s+)/).filter(Boolean));
  const width = it => {
    if (it[0] === '[') { ctx.font = `700 19px ${FONT_B}`; const w = ctx.measureText(it.slice(1, -1)).width + 20; ctx.font = `500 23px ${FONT_B}`; return w + 4; }
    if (it[0] === '{') return 40;
    return ctx.measureText(it).width;
  };
  const lines = [[]]; let lw = 0;
  for (const it of items) {
    const w = width(it);
    if (lw + w > maxW && lines[lines.length - 1].length && !/^\s+$/.test(it)) { lines.push([]); lw = 0; }
    if (!lw && /^\s+$/.test(it)) continue;
    lines[lines.length - 1].push(it); lw += w;
  }
  lines.slice(0, 2).forEach((ln, li) => {
    let cx = x; const cy = y - (lines.length > 1 ? 14 : 0) + li * 30;
    for (const it of ln) {
      const w = width(it);
      if (it[0] === '[') {                                   // tecla
        const label = it.slice(1, -1);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#d8d0b8'; ctx.fillRect(cx, cy - 2, w - 4, 30);
        ctx.fillStyle = '#2a2622'; ctx.fillRect(cx + 2, cy, w - 8, 24);
        ctx.fillStyle = '#4a4438'; ctx.fillRect(cx + 2, cy + 22, w - 8, 4);
        ctx.font = `700 19px ${FONT_B}`; ctx.fillStyle = '#f0e8d0'; ctx.textBaseline = 'top'; ctx.textAlign = 'center';
        ctx.fillText(label, cx + (w - 4) / 2, cy + 3);
        ctx.font = `500 23px ${FONT_B}`;
      } else if (it[0] === '{') {                            // botão de toque
        drawTouchIcon(it.slice(1, -1), cx + 17, cy + 12, alpha);
      } else {
        ctx.globalAlpha = alpha; ctx.fillStyle = '#e4dccb'; ctx.textBaseline = 'top'; ctx.textAlign = 'left';
        ctx.fillText(it, cx, cy);
      }
      cx += w;
    }
  });
  ctx.restore();
}

// mini versão dos botões de toque, para usar dentro dos textos
function drawTouchIcon(name, cx, cy, alpha = 1) {
  const cols = { jump: ['#3fc8e0', '▲'], attack: ['#ff6f8f', '⚔'], sprint: ['#4a5a8a', 'D'], dash: ['#ffb347', 'R'], pause: ['#5a7fd0', 'II'], dpad: ['#8a909a', '✥'] };
  const [col, label] = cols[name] || ['#888', '?'];
  ctx.save(); ctx.globalAlpha = alpha;
  ctx.beginPath(); ctx.arc(cx, cy, 15, 0, Math.PI * 2);
  ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#000'; ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = `800 15px ${FONT_B}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label, cx, cy + 1);
  ctx.restore();
}

// ---------------- tela de controles (menu e pausa) ----------------
const Controls = {
  open: false, from: null,
  show(from) {
    this.open = true; this.from = from;
    const el = document.getElementById('controls');
    el.querySelector('.ctl-keys').classList.toggle('hidden', isTouch());
    el.querySelector('.ctl-touch').classList.toggle('hidden', !isTouch());
    fillControlKeys();
    el.querySelector('#ctlSkip').classList.toggle('hidden', !(from === 'pause' && Tutorial.active()));
    el.querySelector('#ctlBack').textContent = from === 'pause' ? 'Continuar' : 'Voltar';
    el.querySelector('#ctlMenu').classList.toggle('hidden', from !== 'pause');
    // poderes ainda não conquistados aparecem como bloqueados
    const ab = (G.data && G.data.abilities) || {};
    el.querySelectorAll('[data-need]').forEach(r => r.classList.toggle('locked', from === 'pause' && !ab[r.dataset.need]));
    el.classList.remove('hidden');
  },
  hide() {
    this.open = false;
    document.getElementById('controls').classList.add('hidden');
    if (this.from === 'pause') G.paused = false;
    Input.endStep();
  },
  setup() {
    const el = document.getElementById('controls');
    el.querySelector('#ctlBack').addEventListener('click', () => this.hide());
    el.querySelector('#ctlSkip').addEventListener('click', () => { Tutorial.stop(); this.hide(); });
    el.querySelector('#ctlMenu').addEventListener('click', () => {
      this.hide(); G.paused = false; G.state = 'title'; Tutorial.setHint(null);
      document.getElementById('menu').classList.remove('hidden');
      document.body.classList.add('in-menu');
      document.getElementById('btnContinue').classList.toggle('hidden', !readSave());
    });
    addEventListener('keydown', e => {
      if (!this.open) return;
      if (['Escape', 'Enter', 'Space'].includes(e.code) || ['pause', 'jump', 'attack'].some(a => Input.isKey(a, e.code))) { e.preventDefault(); e.stopImmediatePropagation(); this.hide(); }
    }, true);
  },
};
