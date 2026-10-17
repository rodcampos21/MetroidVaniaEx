// =============================================================
//  CONTROLES — teclado e toque (celular)
// =============================================================

const Input = (() => {
  const down = {};     // botão está segurado
  const pressed = {};  // botão foi apertado agora (dura 1 passo do jogo)

  const keyMap = {
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    KeyZ: 'jump', Space: 'jump', KeyK: 'jump',
    KeyX: 'attack', KeyJ: 'attack',
    KeyC: 'dash', KeyL: 'dash',                       // rolar
    ShiftLeft: 'sprint', ShiftRight: 'sprint', KeyV: 'sprint', KeyI: 'sprint',  // dash
    Escape: 'pause', KeyP: 'pause', Enter: 'pause',
  };

  function press(a) { if (!down[a]) pressed[a] = true; down[a] = true; }
  function release(a) { down[a] = false; }

  addEventListener('keydown', e => {
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

  return { down, pressed, bindTouch, endStep };
})();
