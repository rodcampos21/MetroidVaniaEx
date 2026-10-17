// =============================================================
//  JOGO: salas, itens, salvamento, menu e loop principal
// =============================================================

const SAVE_KEY = 'metroidvaniaex_save_v1';

function newData() {
  return {
    abilities: { doubleJump: false, dash: false },
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
  const room = { id, def, w, h, pw: w * TILE, ph: h * TILE, tiles: [] };
  G.room = room; G.roomId = id;
  G.enemies = []; G.items = []; G.particles = [];

  for (let ty = 0; ty < h; ty++) {
    for (let tx = 0; tx < w; tx++) {
      const c = def.map[ty][tx] || '.';
      room.tiles.push('#=^B'.includes(c) ? c : '.');
      const x = tx * TILE, y = ty * TILE, key = `${id}:${tx},${ty}`;
      switch (c) {
        case '@': if (px == null) { px = x + 3; py = y + 2; } break;
        case 'W': G.enemies.push(new Walker(x + 2, y + 4)); break;
        case 'F': G.enemies.push(new Flyer(x + 2, y + 3)); break;
        case 'P': G.items.push({ type: 'save', x, y, w: 16, h: 16 }); break;
        case 'D': case 'H': case '+':
          if (!G.data.collected[key]) G.items.push({ type: c, key, x: x + 3, y: y + 3, w: 10, h: 10 });
          break;
        case 'E': G.items.push({ type: 'E', x: x + 3, y: y - 4, w: 10, h: 20 }); break;
      }
    }
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
        if (!G.saveLock) {
          G.saveLock = true;
          p.hp = G.data.maxHp;
          G.data.save = { room: G.roomId, x: it.x + 3, y: it.y + 2 };
          writeSave();
          showBanner('JOGO SALVO', 'Vida restaurada.', '#7dffb0');
          spawnParticles(it.x + 8, it.y + 6, 20, '#b8ffd6', { speed: 60, life: 0.6 });
        }
        break;
      case 'heart':
        if (p.hp < G.data.maxHp) { p.hp++; it.gone = true; spawnParticles(it.x + 4, it.y + 4, 8, '#ff4d6d', { speed: 40 }); }
        break;
      case 'D':
        collect(it, () => { G.data.abilities.doubleJump = true; },
          'PULO DUPLO', 'Aperte PULAR de novo no ar para dar um segundo pulo. Agora dá pra subir o Poço!', '#7df9ff');
        break;
      case 'H':
        collect(it, () => { G.data.abilities.dash = true; },
          'IMPULSO', 'Aperte DASH (tecla C) para avançar rápido, até no ar. Use para atravessar buracos grandes.', '#ffb347');
        break;
      case '+':
        collect(it, () => { G.data.maxHp++; p.hp = G.data.maxHp; },
          'CORAÇÃO EXTRA', 'Sua vida máxima aumentou!', '#ff5a7a');
        break;
      case 'E':
        if (!G.data.endSeen) {
          G.data.endSeen = true; writeSave();
          showBanner('FIM DA DEMO', 'Você chegou ao fim... por enquanto! Novas áreas, chefes e poderes vêm aí.', '#fff6a0');
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
  G.deadT = 1.6;
  G.shake = 0.4;
  const p = G.player;
  spawnParticles(p.x + p.w / 2, p.y + p.h / 2, 30, '#3fa9f5', { speed: 100, grav: 150, size: 3, life: 0.9 });
}

function respawnAtSave() {
  const p = G.player;
  p.hp = G.data.maxHp; p.vx = 0; p.vy = 0; p.inv = 1; p.dashT = 0; p.stun = 0;
  enterRoom(G.data.save.room, G.data.save.x, G.data.save.y);
  G.state = 'play';
  G.fade = 0.5;
  G.saveLock = true;
}

// ---------- loop ----------
function update(dt) {
  G.time += dt;
  if (G.state === 'title') return;

  if (Input.pressed.pause && G.state === 'play') G.paused = !G.paused;
  if (G.paused) return;

  G.shake = Math.max(0, G.shake - dt);
  G.fade = Math.max(0, G.fade - dt);
  if (G.banner) G.banner.t -= dt;
  if (G.roomTitle) G.roomTitle.t -= dt;
  updateParticles(dt);

  if (G.state === 'dead') {
    G.deadT -= dt;
    if (G.deadT <= 0) respawnAtSave();
    return;
  }

  const p = G.player;
  p.update(dt);
  if (touchingSpikes(p)) p.hurt(1, 0, true);
  if (G.state !== 'play') return;

  for (const e of G.enemies) {
    e.update(dt);
    if (!e.dead && overlaps(p, e)) p.hurt(1, e.x + e.w / 2);
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
  if (fresh) showBanner('BEM-VINDO', 'Explore a caverna, encontre novos poderes e volte a lugares que antes eram impossíveis.', '#8fa0ff');
}

function setupMenu() {
  const cont = document.getElementById('btnContinue');
  const fresh = document.getElementById('btnNew');
  if (readSave()) cont.classList.remove('hidden');
  cont.addEventListener('click', () => startGame(false));
  fresh.addEventListener('click', () => {
    if (readSave() && !confirm('Começar um jogo novo vai apagar o progresso salvo. Continuar?')) return;
    startGame(true);
  });
}

Input.bindTouch();
setupMenu();
requestAnimationFrame(frame);
