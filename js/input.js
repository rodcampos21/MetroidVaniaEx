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
    KeyC: 'dash', KeyL: 'dash', ShiftLeft: 'dash', ShiftRight: 'dash',
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
    const setDirs = (l, r, u, d) => {
      l ? press('left') : release('left');
      r ? press('right') : release('right');
      u ? press('up') : release('up');
      d ? press('down') : release('down');
    };
    const update = e => {
      const rect = pad.getBoundingClientRect();
      const dx = e.clientX - (rect.left + rect.width / 2);
      const dy = e.clientY - (rect.top + rect.height / 2);
      const dz = rect.width * 0.14;
      setDirs(dx < -dz, dx > dz, dy < -rect.height * 0.28, dy > rect.height * 0.28);
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
