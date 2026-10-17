// =============================================================
//  REMAPEAR TECLAS (só no computador)
//  Abre pelo menu principal ("Teclas") ou pela pausa ("Remapear teclas").
//  As teclas ficam salvas no navegador, separadas do progresso do jogo.
// =============================================================

const KeyBinds = {
  open: false, from: null, waiting: null, focus: [0, 0],

  show(from) {
    if (isTouch()) return;
    this.open = true; this.from = from; this.waiting = null; this.focus = [0, 0];
    if (from !== 'menu') {                        // veio da tela de controles: troca por esta (sem despausar)
      Controls.open = false;
      document.getElementById('controls').classList.add('hidden');
    }
    this.build();
    document.getElementById('keybinds').classList.remove('hidden');
    this.slot(0, 0).focus();
  },
  hide() {
    this.open = false; this.waiting = null; Input.capturing = false;
    document.getElementById('keybinds').classList.add('hidden');
    Input.endStep();
    for (const k in Input.down) Input.down[k] = false;
    if (this.from === 'pause') Controls.show('pause');
    else if (this.from === 'menuControls') Controls.show('menu');
    else document.getElementById('btnKeys').focus({ preventScroll: true });
  },

  // monta a lista: ação | tecla principal | tecla alternativa
  build() {
    const list = document.querySelector('#keybinds .kb-list');
    list.innerHTML = '';
    Input.ACTIONS.forEach(([a, name], row) => {
      const r = document.createElement('div'); r.className = 'kb-row';
      const b = document.createElement('b'); b.textContent = name; r.appendChild(b);
      for (let s = 0; s < 2; s++) {
        const btn = document.createElement('button');
        btn.className = 'kb-slot'; btn.dataset.a = a; btn.dataset.s = s; btn.dataset.row = row;
        btn.addEventListener('click', () => this.capture(row, s));
        btn.addEventListener('focus', () => { this.focus = [row, s]; });
        r.appendChild(btn);
      }
      list.appendChild(r);
    });
    this.refresh();
  },
  refresh() {
    const B = Input.binds();
    document.querySelectorAll('#keybinds .kb-slot').forEach(btn => {
      const a = btn.dataset.a, s = +btn.dataset.s;
      const waiting = this.waiting && this.waiting[0] === a && this.waiting[1] === s;
      btn.classList.toggle('waiting', !!waiting);
      btn.classList.toggle('empty', !B[a][s]);
      btn.textContent = waiting ? 'aperte uma tecla…' : Input.keyName(B[a][s]);
    });
  },
  slot(row, s) { return document.querySelector(`#keybinds .kb-slot[data-row="${row}"][data-s="${s}"]`); },
  capture(row, s) {
    const a = Input.ACTIONS[row][0];
    this.waiting = [a, s]; Input.capturing = true;
    this.refresh();
  },
  flash(a, s) {
    const btn = document.querySelector(`#keybinds .kb-slot[data-a="${a}"][data-s="${s}"]`);
    if (!btn) return;
    btn.classList.remove('done'); void btn.offsetWidth; btn.classList.add('done');
  },

  setup() {
    document.getElementById('kbBack').addEventListener('click', () => this.hide());
    document.getElementById('kbReset').addEventListener('click', () => { Input.resetBinds(); this.waiting = null; Input.capturing = false; this.refresh(); });
    document.getElementById('btnKeys').addEventListener('click', () => this.show('menu'));
    document.getElementById('ctlKeys').addEventListener('click', () => this.show(Controls.from === 'pause' ? 'pause' : 'menuControls'));

    // fase de captura: chega antes do jogo, do menu e da tela de controles
    addEventListener('keydown', e => {
      if (!this.open) return;
      e.preventDefault(); e.stopImmediatePropagation();
      if (this.waiting) {                         // esperando a tecla nova
        const [a, s] = this.waiting;
        if (e.code === 'Escape') { /* cancela */ }
        else if (e.code === 'Delete') Input.clearBind(a, s);
        else Input.setBind(a, s, e.code);
        this.waiting = null;
        setTimeout(() => { Input.capturing = false; }, 0);
        this.refresh();
        if (e.code !== 'Escape') this.flash(a, s);
        return;
      }
      // navegação com as setas
      let [row, s] = this.focus;
      const n = Input.ACTIONS.length;
      if (e.code === 'Escape') return this.hide();
      if (e.code === 'ArrowUp') row = (row - 1 + n) % n;
      else if (e.code === 'ArrowDown') row = (row + 1) % n;
      else if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') s = 1 - s;
      else if (e.code === 'Enter' || e.code === 'Space') {
        const el = document.activeElement;
        if (el && el.closest('#keybinds .ctl-btns')) el.click();
        else this.capture(row, s);
        return;
      }
      else if (e.code === 'Delete') { Input.clearBind(Input.ACTIONS[row][0], s); this.refresh(); return; }
      else if (e.code === 'Tab') {                // Tab passa pelos botões de baixo também
        const all = [...document.querySelectorAll('#keybinds .kb-slot, #keybinds .ctl-btns button')];
        const i = all.indexOf(document.activeElement);
        all[(i + (e.shiftKey ? -1 : 1) + all.length) % all.length].focus();
        return;
      }
      else return;
      this.slot(row, s).focus();
    }, true);
    addEventListener('keyup', e => { if (this.open) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
  },
};

// preenche as teclas atuais na tela de controles do teclado
function fillControlKeys() {
  const B = Input.binds();
  document.querySelectorAll('#controls .keys[data-keys]').forEach(el => {
    const acts = el.dataset.keys.split(',');
    el.innerHTML = '';
    for (let s = 0; s < 2; s++) {
      if (!acts.every(a => B[a][s])) continue;
      const k = document.createElement('span'); k.className = 'k';
      k.textContent = acts.map(a => Input.keyName(B[a][s])).join(' ');
      el.appendChild(k);
    }
    if (acts[0] === 'pause') { const k = document.createElement('span'); k.className = 'k'; k.textContent = 'Esc'; el.prepend(k); }
  });
}
