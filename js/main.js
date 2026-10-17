// =============================================================
//  JOGO: salas, itens, salvamento, menu e loop principal
// =============================================================

const SAVE_KEY = 'metroidvaniaex_save_v3';

function newData() {
  return {
    abilities: { doubleJump: false, dash: false, climb: false },
    maxHp: 5,
    collected: {},
    visited: {},
    save: { room: 'entrada', x: null, y: null },
    endSeen: false,
  };
}

function writeSave() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(G.data)); } catch (_) {}
}
function readSave() {
  try { const s = localStorage.getItem(SAVE_KEY); return s ? JSON.parse(s) : null; } catch (_) { return null; }
}

function roomSize(def) { return { w: def.map[0].length * TILE, h: def.map.length * TILE }; }

// ---------- salas ----------
function enterRoom(id, px, py) {
  const def = ROOMS[id];
  const h = def.map.length, w = def.map[0].length;
  const room = { id, def, w, h, pw: w * TILE, ph: h * TILE, tiles: [], art: getRoomArt(id) };
  G.room = room; G.roomId = id;
  G.enemies = []; G.items = []; G.particles = [];
  G.gate = null; G.bossBar = null; G.bossTitle = null;

  for (let ty = 0; ty < h; ty++) {
    for (let tx = 0; tx < w; tx++) {
      const c = def.map[ty][tx] || '.';
      room.tiles.push('#=^B'.includes(c) ? c : '.');
      const x = tx * TILE, y = ty * TILE, key = `${id}:${tx},${ty}`;
      switch (c) {
        case '@': if (px == null) { px = x + 3; py = y + TILE - G.player.h; } break;
        case 'W': G.enemies.push(new Werewolf(x - 3, y)); break;
        case 'F': G.enemies.push(new Flyer(x + 2, y + 3)); break;
        case 'K': G.enemies.push(new GuitaristBoss(x, y, !!(G.data.bosses || {}).guitarist)); break;   // vencido: só o corpo
        case 'P': {                       // o braseiro fica apoiado no chão
          let gy = ty; while (gy < h - 1 && !'#='.includes(def.map[gy + 1][tx])) gy++;
          G.items.push({ type: 'save', x, y: gy * TILE, w: 16, h: 16 + (gy - ty) * TILE, top: y });
          break;
        }
        case 'D': case 'H': case 'G': case '+':
          if (!G.data.collected[key]) G.items.push({ type: c, key, x: x + 3, y: y + 3, w: 10, h: 10 });
          break;
        case 'E': G.items.push({ type: 'E', x: x + 3, y: y - 4, w: 10, h: 20 }); break;
      }
    }
  }

  // chefe já vencido mas a recompensa ficou para trás: ela continua ao lado do corpo
  if (def.boss === 'guitarist' && (G.data.bosses || {}).guitarist) {
    const b = G.enemies.find(e => e instanceof GuitaristBoss);
    if (b) dropBossReward(b, 0);
  }
  if (!G.data.visited[id]) { G.data.visited[id] = true; writeSave(); }
  G.roomTitle = { text: def.name, t: 2.5 };
  const p = G.player;
  p.x = px ?? 32; p.y = py ?? 32;
  snapCamera();
}

// Quando o jogador sai pela borda, procura qual sala está naquele ponto do mundo
function checkTransition() {
  const p = G.player, r = G.room, d = r.def;
  const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
  if (cx >= 0 && cx < r.pw && cy >= 0 && cy < r.ph) return;

  const wx = d.wx * VIEW_W + cx, wy = d.wy * VIEW_H + cy;
  for (const id in ROOMS) {
    if (id === G.roomId) continue;
    const o = ROOMS[id], s = roomSize(o);
    const rx = o.wx * VIEW_W, ry = o.wy * VIEW_H;
    if (wx >= rx && wx < rx + s.w && wy >= ry && wy < ry + s.h) {
      enterRoom(id, p.x + d.wx * VIEW_W - rx, p.y + d.wy * VIEW_H - ry);
      return;
    }
  }
  // não tem sala ali: caiu no vazio ou bateu no limite
  if (cy >= r.ph) p.hurt(1, 0, true);
  else {
    p.x = Math.max(0, Math.min(r.pw - p.w, p.x));
    if (p.y < 0) { p.y = 0; p.vy = 0; }
  }
}

function snapCamera() {
  const t = cameraTarget();
  G.cam.x = t.x; G.cam.y = t.y;
}
function cameraTarget() {
  const p = G.player, r = G.room;
  return {
    x: Math.max(0, Math.min(r.pw - VIEW_W, p.x + p.w / 2 - VIEW_W / 2 + p.facing * 20)),
    y: Math.max(0, Math.min(r.ph - VIEW_H, p.y + p.h / 2 - VIEW_H / 2)),
  };
}

function showBanner(title, msg, color) { G.banner = { title, text: msg, color, t: 4 }; }

// ---------- itens ----------
function updateItems(dt) {
  const p = G.player;
  let onSave = false;
  for (const it of G.items) {
    if (it.drop) {                    // recompensa do chefe: espera, salta e cai no chão
      if (it.wait > 0) {
        it.wait -= dt;
        if (it.wait <= 0) { G.shake = Math.max(G.shake, 0.15); spawnParticles(it.x + 5, it.y + 5, 26, '#ffcf70', { speed: 120, life: 0.7 }); }
        continue;
      }
      it.vy = Math.min(it.vy + 600 * dt, 260);
      it.x += it.vx * dt; it.y += it.vy * dt;
      const ty = Math.floor((it.y + it.h) / TILE), tx = Math.floor((it.x + 5) / TILE);
      if (it.vy > 0 && (isSolid(tileAt(tx, ty)) || tileAt(tx, ty) === '=')) {
        it.y = ty * TILE - it.h; it.vx = 0;
        if (it.vy > 80) spawnParticles(it.x + 5, it.y + it.h, 8, '#d8a040', { angle: -Math.PI / 2, spread: 2, speed: 50, life: 0.4 });
        it.vy = 0;
      }
    }
    if (it.type === 'heart') {        // corações que caem dos inimigos
      it.vy = Math.min((it.vy || 0) + 500 * dt, 200);
      it.y += it.vy * dt;
      const ty = Math.floor((it.y + it.h) / TILE), tx = Math.floor((it.x + 4) / TILE);
      const c = tileAt(tx, ty);
      if (isSolid(c) || c === '=') { it.y = ty * TILE - it.h; it.vy = 0; }
      it.life = (it.life ?? 8) - dt;
      if (it.life <= 0) it.gone = true;
    }
    if (!overlaps(p, it)) continue;

    switch (it.type) {
      case 'save':
        onSave = true;
        if (!G.saveLock && !G.bossBar) {          // não dá para descansar no meio da luta
          G.saveLock = true;
          p.hp = G.data.maxHp;
          G.data.save = { room: G.roomId, x: it.x + 2, y: it.y + TILE - Player.H };
          p.standUp();
          writeSave();
          showBanner('Braseiro aceso', 'Você descansa diante das chamas e recupera as forças. Progresso salvo.', '#ff9a3a');
          spawnParticles(it.x + 8, it.y + 4, 24, '#ffb04a', { angle: -Math.PI / 2, spread: 1.6, speed: 70, life: 0.8 });
        }
        break;
      case 'heart':
        if (p.hp < G.data.maxHp) { p.hp = Math.min(G.data.maxHp, p.hp + 1); it.gone = true; spawnParticles(it.x + 4, it.y + 4, 10, '#ff4a5e', { speed: 40 }); }
        break;
      case 'D':
        collect(it, () => { G.data.abilities.doubleJump = true; },
          'Salto Etéreo', ctrl(`Uma força antiga corre em suas pernas. Aperte ${Input.label('jump')} (pular) no ar para saltar outra vez — o Poço das Correntes não é mais intransponível.`, 'Uma força antiga corre em suas pernas. Toque em ▲ no ar para saltar outra vez — o Poço das Correntes não é mais intransponível.'), '#7fe0ff');
        break;
      case 'H':
        collect(it, () => { G.data.abilities.dash = true; },
          'Rolamento desbloqueado', ctrl(`A Palheta do Pecador vibra em sua mão. Aperte ${Input.label('dash')} para rolar para a frente, até no ar. Durante o rolamento, ataques inimigos não te atingem.`, 'A Palheta do Pecador vibra em sua mão. Toque em ROLAR para rolar para a frente, até no ar. Durante o rolamento, ataques inimigos não te atingem.'), '#ffb347');
        break;
      case 'G':
        collect(it, () => { G.data.abilities.climb = true; },
          'Garras do Vigia', ctrl(`Pule numa parede e segure na direção dela para se agarrar. Use ${Input.keysOf('up', false)[0] || '↑'} e ${Input.keysOf('down', false)[0] || '↓'} para escalar e ${Input.keysOf('jump', false)[0] || 'Z'} para saltar de uma parede à outra. Algo brilha no alto da ponte...`, 'Pule numa parede segurando o direcional na direção dela. Direcional para cima e para baixo escala; ▲ salta de uma parede à outra. Algo brilha no alto da ponte...'), '#b48aff');
        break;
      case '+':
        collect(it, () => { G.data.maxHp++; p.hp = G.data.maxHp; },
          'Fragmento de Vida', 'O cristal pulsa como um coração. Sua vida máxima aumentou.', '#ff4a5e');
        break;
      case 'E':
        if (!G.data.endSeen) {
          G.data.endSeen = true; writeSave();
          showBanner('Fim da demo', 'O portal pulsa, mas ainda não se abre. As profundezas guardam mais segredos... em breve.', '#7fd0ff');
          G.banner.t = 7;
        }
        break;
    }
  }
  if (!onSave) G.saveLock = false;
  G.items = G.items.filter(i => !i.gone);
}

function collect(it, apply, title, msg, color) {
  it.gone = true;
  G.data.collected[it.key] = true;
  apply();
  writeSave();
  showBanner(title, msg, color);
  G.shake = 0.2;
  spawnParticles(it.x + 5, it.y + 5, 30, color, { speed: 110, life: 0.8 });
}

// ---------- morte ----------
function playerDied() {
  G.state = 'dead';
  G.deadT = 2.4;
  G.shake = 0.4;
  const p = G.player;
  spawnParticles(p.x + p.w / 2, p.y + p.h / 2, 30, '#7a1414', { speed: 100, grav: 300, size: 3, life: 1 });
}

function respawnAtSave() {
  const p = G.player;
  p.hp = G.data.maxHp; p.vx = 0; p.vy = 0; p.inv = 1; p.dashT = 0; p.stun = 0; p.standUp();
  enterRoom(G.data.save.room, G.data.save.x, G.data.save.y);
  G.state = 'play';
  G.fade = 0.5;
  G.saveLock = true;
}

// ---------- loop ----------
// botão ROLAR do celular fica trancado até derrotar o Jorge
let rollBtn, rollWasLocked = null;
function syncTouchLocks() {
  rollBtn = rollBtn || document.querySelector('[data-act="dash"]');
  if (!rollBtn || !G.data) return;
  const locked = !G.data.abilities.dash;
  if (locked === rollWasLocked) return;
  rollBtn.classList.toggle('locked', locked);
  if (rollWasLocked && !locked) { rollBtn.classList.add('unlocked'); setTimeout(() => rollBtn.classList.remove('unlocked'), 3000); }
  rollWasLocked = locked;
}

function update(dt) {
  G.time += dt;
  if (G.state === 'title') return;
  syncTouchLocks();

  if (Input.pressed.pause && G.state === 'play' && !Controls.open) { G.paused = true; Controls.show('pause'); }
  if (G.paused) return;
  Tutorial.update(dt);

  G.shake = Math.max(0, G.shake - dt);
  G.fade = Math.max(0, G.fade - dt);
  if (G.banner) G.banner.t -= dt;
  if (G.roomTitle) G.roomTitle.t -= dt;
  updateParticles(dt);
  updateAmbient(dt);

  if (G.state === 'dead') {
    G.deadT -= dt;
    if (G.deadT <= 0) respawnAtSave();
    return;
  }

  const p = G.player;
  p.update(dt);
  if (touchingSpikes(p)) p.hurt(1, 0, true);
  if (G.state !== 'play') return;

  updateBossTrigger();
  for (const e of G.enemies.slice()) {
    e.update(dt);
    if (!e.dead && p.dashT <= 0 && (e.touches ? e.touches(p) : overlaps(p, e))) {
      const wasInv = p.inv > 0;
      p.hurt(e.dmgNow || 1, e.x + e.w / 2);
      if (!wasInv && e.onHitPlayer) e.onHitPlayer();
    }
  }
  G.enemies = G.enemies.filter(e => !e.dead);

  updateItems(dt);
  checkTransition();

  const t = cameraTarget();
  G.cam.x += (t.x - G.cam.x) * Math.min(1, dt * 8);
  G.cam.y += (t.y - G.cam.y) * Math.min(1, dt * 8);
}

let last = performance.now(), acc = 0;
const STEP = 1 / 60;
function frame(now) {
  acc += Math.min(0.1, (now - last) / 1000);
  last = now;
  while (acc >= STEP) { update(STEP); Input.endStep(); acc -= STEP; }
  render();
  requestAnimationFrame(frame);
}

// ---------- menu ----------
function startGame(fresh) {
  const saved = fresh ? null : readSave();
  G.data = saved ? Object.assign(newData(), saved) : newData();
  if (fresh) writeSave();
  G.player = new Player();
  G.player.hp = G.data.maxHp;
  enterRoom(G.data.save.room, G.data.save.x, G.data.save.y);
  G.state = 'play';
  G.paused = false;
  G.fade = 0.6;
  G.saveLock = true;
  document.getElementById('menu').classList.add('hidden');
  document.body.classList.remove('in-menu');
  Input.endStep();   // a tecla que confirmou o menu não deve pular/pausar no jogo
  if (fresh) showBanner('As Catacumbas Esquecidas', 'Você desperta entre os mortos, com uma espada e nenhuma lembrança. Siga as tochas.', '#c8c0a8');
  if (!G.data.tutorialDone) Tutorial.start(); else Tutorial.stop(false);
}

function setupMenu() {
  const cont = document.getElementById('btnContinue');
  const fresh = document.getElementById('btnNew');
  if (readSave()) cont.classList.remove('hidden');
  const ctlBtn = document.getElementById('btnControls');
  ctlBtn.addEventListener('click', () => Controls.show('menu'));
  const keysBtn = document.getElementById('btnKeys');
  if (isTouch()) keysBtn.classList.add('hidden');          // remapear teclas: só no computador
  const items = () => [fresh, cont, ctlBtn, keysBtn].filter(b => !b.classList.contains('hidden'));
  let sel = 0;
  const select = i => { const it = items(); sel = (i + it.length) % it.length; it.forEach((b, k) => b.classList.toggle('sel', k === sel)); };
  const chooseNew = () => {
    if (readSave() && !confirm('Começar um jogo novo vai apagar o progresso salvo. Continuar?')) return;
    startGame(true);
  };
  cont.addEventListener('click', () => startGame(false));
  fresh.addEventListener('click', chooseNew);
  [fresh, cont, ctlBtn, keysBtn].forEach(b => b.addEventListener('pointerenter', () => select(items().indexOf(b))));
  // teclado: ↑/↓ escolhe, Enter/Espaço/Z confirma
  addEventListener('keydown', e => {
    if (G.state !== 'title' || Controls.open || KeyBinds.open) return;
    if (['ArrowUp', 'KeyW'].includes(e.code)) { select(sel - 1); e.preventDefault(); }
    else if (['ArrowDown', 'KeyS'].includes(e.code)) { select(sel + 1); e.preventDefault(); }
    else if (['Enter', 'Space', 'KeyZ'].includes(e.code)) { e.preventDefault(); items()[sel].click(); }
  });
  select(0);
}

// ---------- início ----------
Input.bindTouch();
buildSprites();
setupMenu();
Controls.setup();
KeyBinds.setup();
requestAnimationFrame(frame);
// pinta as salas aos poucos enquanto o menu está aberto (deixa as transições suaves)
(function prebuild(ids) {
  if (!ids.length) return;
  setTimeout(() => { getRoomArt(ids[0]); prebuild(ids.slice(1)); }, 30);
})(Object.keys(ROOMS));
