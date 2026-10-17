// =============================================================
//  CONTROLES — teclado e toque (celular)
// =============================================================

const Input = (() => {
  const down = {};     // botão está segurado
  const pressed = {};  // botão foi apertado agora (dura 1 passo do jogo)

  // ---------- teclas (remapeáveis no menu "Teclas") ----------
  // cada ação tem 2 teclas: principal e alternativa. 'dash' = rolar, 'sprint' = dash no chão.
  const ACTIONS = [
    ['left', 'Esquerda'], ['right', 'Direita'], ['up', 'Cima / escalar'], ['down', 'Baixo / agachar'],
    ['jump', 'Pular'], ['attack', 'Atacar'], ['sprint', 'Dash'], ['dash', 'Rolar'], ['pause', 'Pausar'],
  ];
  const DEFAULT_BINDS = {
    left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'], up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'],
    jump: ['KeyZ', 'Space'], attack: ['KeyX', 'KeyJ'], sprint: ['ShiftLeft', 'KeyV'], dash: ['KeyC', 'KeyL'],
    pause: ['KeyP', 'Enter'],
  };
  const BIND_KEY = 'contos_abismo_teclas_v1';
  let binds = JSON.parse(JSON.stringify(DEFAULT_BINDS));
  try {
    const saved = JSON.parse(localStorage.getItem(BIND_KEY) || 'null');
    if (saved) for (const [a] of ACTIONS) if (Array.isArray(saved[a])) binds[a] = [saved[a][0] || null, saved[a][1] || null];
  } catch (_) {}
  let keyMap = {};
  function rebuild() {
    keyMap = { Escape: 'pause' };                 // Esc sempre pausa (e nunca pode ser remapeado)
    for (const [a] of ACTIONS) for (const c of binds[a]) if (c) keyMap[c] = a;
  }
  rebuild();
  function saveBinds() { try { localStorage.setItem(BIND_KEY, JSON.stringify(binds)); } catch (_) {} }
  // põe a tecla na ação; se ela já era de outra ação, as duas trocam de lugar
  function setBind(action, slot, code) {
    const old = binds[action][slot];
    for (const [a] of ACTIONS) for (let s = 0; s < 2; s++)
      if (binds[a][s] === code && !(a === action && s === slot)) binds[a][s] = old;
    binds[action][slot] = code;
    rebuild(); saveBinds();
  }
  function clearBind(action, slot) { binds[action][slot] = null; rebuild(); saveBinds(); }
  function resetBinds() { binds = JSON.parse(JSON.stringify(DEFAULT_BINDS)); rebuild(); saveBinds(); }

  const NAMES = {
    ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', Space: 'Espaço', Enter: 'Enter',
    ShiftLeft: 'Shift', ShiftRight: 'Shift Dir.', ControlLeft: 'Ctrl', ControlRight: 'Ctrl Dir.',
    AltLeft: 'Alt', AltRight: 'Alt Gr', Tab: 'Tab', Backspace: '⌫', CapsLock: 'Caps', Escape: 'Esc',
    MetaLeft: 'Win', MetaRight: 'Win', ContextMenu: 'Menu', Insert: 'Ins', Delete: 'Del', Home: 'Home',
    End: 'End', PageUp: 'PgUp', PageDown: 'PgDn', Comma: ',', Period: '.', Slash: ';', Semicolon: 'Ç',
    Quote: '~', BracketLeft: '´', BracketRight: '[', Backslash: ']', Minus: '-', Equal: '=', Backquote: "'",
    IntlBackslash: '\\', IntlRo: '/', NumpadEnter: 'Num Enter', NumpadAdd: 'Num +', NumpadSubtract: 'Num -',
    NumpadMultiply: 'Num *', NumpadDivide: 'Num /', NumpadDecimal: 'Num ,',
  };
  // no Chrome/Edge dá para saber a letra real impressa na tecla (layout ABNT, AZERTY...)
  let layout = null;
  try { navigator.keyboard && navigator.keyboard.getLayoutMap().then(m => { layout = m; }).catch(() => {}); } catch (_) {}
  function keyName(code) {
    if (!code) return '—';
    if (layout && /^(Key|Digit|Comma|Period|Slash|Semicolon|Quote|Bracket|Backslash|Minus|Equal|Backquote|Intl)/.test(code) && layout.get(code))
      return layout.get(code).toUpperCase();
    if (NAMES[code]) return NAMES[code];
    if (code.startsWith('Key')) return code.slice(3);
    if (code.startsWith('Digit')) return code.slice(5);
    if (code.startsWith('Numpad')) return 'Num ' + code.slice(6);
    return code;
  }
  // nomes das teclas de uma ação (all = principal e alternativa)
  function keysOf(action, all = true) { return binds[action].slice(0, all ? 2 : 1).filter(Boolean).map(keyName); }
  function label(action) { return keysOf(action).join(' ou ') || '—'; }

  function press(a) { if (!down[a]) pressed[a] = true; down[a] = true; }
  function release(a) { down[a] = false; }

  addEventListener('keydown', e => {
    if (Input.capturing) return;                    // tela de remapear esperando uma tecla
    const a = keyMap[e.code];
    if (a) { press(a); e.preventDefault(); }
  });
  addEventListener('keyup', e => {
    const a = keyMap[e.code];
    if (a) { release(a); e.preventDefault(); }
  });
  addEventListener('blur', () => { for (const k in down) down[k] = false; });

  // ---------- toque ----------
  function bindTouch() {
    // Botões de ação
    document.querySelectorAll('[data-act]').forEach(btn => {
      const a = btn.dataset.act;
      const on = e => {
        e.preventDefault();
        try { btn.setPointerCapture(e.pointerId); } catch (_) {}
        press(a); btn.classList.add('on');
      };
      const off = e => { e.preventDefault(); release(a); btn.classList.remove('on'); };
      btn.addEventListener('pointerdown', on);
      btn.addEventListener('pointerup', off);
      btn.addEventListener('pointercancel', off);
      btn.addEventListener('lostpointercapture', off);
    });

    // Direcional: deslize o dedo para mudar de direção
    const pad = document.getElementById('dpad');
    if (!pad) return;
    const knob = pad.querySelector('.knob');
    let active = null;
    const arrows = {};
    pad.querySelectorAll('.arr').forEach(a => { arrows[a.dataset.dir] = a; });
    const setDirs = (l, r, u, d) => {
      const st = { left: l, right: r, up: u, down: d };
      for (const k in arrows) arrows[k].classList.toggle('on', !!st[k]);
      l ? press('left') : release('left');
      r ? press('right') : release('right');
      u ? press('up') : release('up');
      d ? press('down') : release('down');
    };
    const update = e => {
      const rect = pad.getBoundingClientRect();
      const dx = e.clientX - (rect.left + rect.width / 2);
      const dy = e.clientY - (rect.top + rect.height / 2);
      const dead = rect.width * 0.12, len0 = Math.hypot(dx, dy);
      if (len0 < dead) setDirs(false, false, false, false);
      else {
        // 8 setores: horizontal tem prioridade (fica mais fácil andar sem agachar sem querer)
        const a = Math.atan2(dy, dx) * 180 / Math.PI;      // 0 = direita, 90 = baixo
        const ax = Math.abs(a);
        const right = ax < 60, left = ax > 120;
        const down = a > 50 && a < 130 && len0 > rect.width * 0.2;
        const up = a < -30 && a > -150 && len0 > rect.width * 0.2;
        setDirs(left, right, up, down);
      }
      const max = rect.width * 0.3, len = Math.hypot(dx, dy) || 1, k = Math.min(1, max / len);
      if (knob) knob.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
    };
    const end = e => {
      if (e.pointerId !== active) return;
      active = null; setDirs(false, false, false, false);
      if (knob) knob.style.transform = '';
    };
    pad.addEventListener('pointerdown', e => {
      e.preventDefault(); active = e.pointerId;
      try { pad.setPointerCapture(e.pointerId); } catch (_) {}
      update(e);
    });
    pad.addEventListener('pointermove', e => { if (e.pointerId === active) { e.preventDefault(); update(e); } });
    pad.addEventListener('pointerup', end);
    pad.addEventListener('pointercancel', end);
  }

  function endStep() { for (const k in pressed) delete pressed[k]; }

  return {
    down, pressed, bindTouch, endStep, capturing: false,
    ACTIONS, binds: () => binds, setBind, clearBind, resetBinds, keyName, keysOf, label,
    isKey: (action, code) => binds[action].includes(code),
  };
})();
