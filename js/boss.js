// =============================================================
//  CHEFE: JORGE O PECADOR — o Guitarrista Hardcore (Galeria Submersa)
//  - Guitarrada: anda até o herói, ergue a guitarra e esmaga o chão (KERRANG!)
//  - Riff: toca um riff e dispara notas musicais que perseguem o herói
//  - Fase 2 (metade da vida): mais rápido e mais notas
//  As notas podem ser destruídas com a espada.
// =============================================================

const BOSS = {
  W: 30, H: 44, HP: 30,
  WALK: 32, WALK2: 44,
  SMASH_RANGE: 52,                    // distância para tentar a guitarrada
  SMASH_REACH: 64, SMASH_DMG: 2,      // alcance e dano do impacto
  NOTE_SPEED: 100, NOTE_SPEED2: 122, NOTE_TURN: 1.3, NOTE_LIFE: 3.6,
  TOUCH_DMG: 1,
};

// sequências: [quadro, duração] — a guitarrada e o riff
// morte: cambaleia → desaba → ajoelha → cai → de bruços → final (o corpo fica no chão)
const DEATH_SEQ = [['death4', 0.4], ['death0', 0.4], ['death5', 0.5], ['death1', 0.3], ['death6', 0.25], ['death2', 0.45], ['death3', 99]];
const SMASH_SEQ = [['smash0', 0.5], ['smash1', 0.13], ['smash2', 0.38], ['smash3', 0.22], ['smash4', 0.34], ['smash5', 0.26]];

class GuitaristBoss extends Enemy {
  constructor(x, y, corpse) {
    super(x, y - (BOSS.H - TILE), BOSS.W, BOSS.H, BOSS.HP);
    this.maxHp = BOSS.HP;
    this.dir = -1; this.color = '#3a2a2e';
    this.state = 'idle'; this.st = 0;
    this.walk = 0; this.walkT = 0; this.smashCd = 0;
    this.seq = null; this.si = 0;            // sequência de quadros em andamento
    this.frame = 'walk0';
    this.phase2 = false; this.lag = 1;        // barra de vida (rastro do dano)
    this.volley = 0; this.fired = false; this.boom = 0;
    this.isBoss = true;
    if (corpse) { this.state = 'dead'; this.frame = 'death3'; this.hp = 0; }
  }
  set(state) { this.state = state; this.st = 0; this.fired = false; }

  start() {                                   // o herói entrou na arena
    this.set('intro');
    G.bossBar = this;
    G.bossTitle = { t: 3.2 }; G.banner = null;
    closeBossGate(true);
  }

  // corpo machuca ao encostar (menos durante a apresentação)
  touches(p) {
    if (['idle', 'intro', 'dying', 'dead'].includes(this.state)) return false;
    if (this.state === 'smash' && this.frame === 'smash2' && this.st < 0.16 && overlaps(p, this.smashBox())) { this.dmgNow = BOSS.SMASH_DMG; return true; }
    this.dmgNow = BOSS.TOUCH_DMG;
    return overlaps(p, { x: this.x + 5, y: this.y + 10, w: this.w - 10, h: this.h - 10 });
  }
  smashBox() {
    const r = BOSS.SMASH_REACH;
    return { x: this.dir > 0 ? this.x + this.w / 2 : this.x + this.w / 2 - r, y: this.y + this.h - 30, w: r, h: 30 };
  }

  hurt(dmg) {
    if (['idle', 'intro', 'dying', 'dead'].includes(this.state)) return;
    this.hp -= dmg; this.flash = 0.1;
    G.shake = Math.max(G.shake, 0.06);
    spawnParticles(this.x + this.w / 2, this.y + this.h * 0.45, 8, '#ffb070', { speed: 90, life: 0.3 });
    if (!this.phase2 && this.hp <= this.maxHp / 2) {           // fúria!
      this.phase2 = true; this.seq = null; this.set('rage');
    }
    if (this.hp <= 0) {
      this.hp = 0; this.set('dying'); this.play(DEATH_SEQ); G.shake = 0.6;
      for (const e of G.enemies) if (e instanceof SonicNote || e instanceof Shockwave) e.pop ? e.pop() : (e.dead = true);
    }
  }

  play(seq) { this.seq = seq; this.si = 0; this.st = 0; this.frame = seq[0][0]; }
  stepSeq(dt) {                               // avança a sequência; devolve true quando acaba
    const [, d] = this.seq[this.si];
    const k = this.phase2 && this.state === 'smash' && this.si === 0 ? 0.75 : 1;   // na fase 2 prepara mais rápido
    if (this.st >= d * k) {
      this.si++; this.st = 0;
      if (this.si >= this.seq.length) return true;
      this.frame = this.seq[this.si][0];
      this.onFrame(this.frame);
    }
    return false;
  }
  onFrame(f) {
    if (f === 'smash1') this.vx = this.dir * 70;
    if (f === 'smash2') {                                       // impacto no chão
      G.shake = 0.45; this.boom = 0.5;
      const bx = this.dir > 0 ? this.x + this.w / 2 + 44 : this.x + this.w / 2 - 44;
      spawnParticles(bx, this.y + this.h - 2, 36, '#ff7a30', { angle: -Math.PI / 2, spread: 2.4, speed: 160, grav: 500, size: 3, life: 0.8 });
      spawnParticles(bx, this.y + this.h - 2, 20, '#3a3436', { angle: -Math.PI / 2, spread: 2, speed: 120, grav: 500, size: 3, life: 0.9 });
      // ondas de choque correndo pelo chão
      for (const d of [-1, 1]) G.enemies.push(new Shockwave(bx, this.y + this.h, d, this.phase2));
    }
  }

  update(dt) {
    const p = G.player;
    this.t += dt; this.st += dt; this.flash -= dt; this.boom = Math.max(0, this.boom - dt);
    this.smashCd = Math.max(0, this.smashCd - dt);
    this.lag = Math.max(this.hp / this.maxHp, this.lag - 0.35 * dt);
    const cx = this.x + this.w / 2, px = p.x + p.w / 2, dx = px - cx, adx = Math.abs(dx);
    let speed = 0;

    switch (this.state) {
      case 'idle':
        this.frame = 'riff5';
        break;
      case 'intro': {                                         // apresentação: riff de abertura
        const t = this.st;
        this.frame = t < 0.6 ? 'riff0' : t < 1.4 ? (Math.floor(t * 9) % 2 ? 'riff1' : 'riff2') : t < 2.0 ? 'riff3' : 'riff7';
        if (t > 1.4 && t - dt <= 1.4) { G.shake = 0.5; spawnParticles(cx + this.dir * 16, this.y + 8, 30, '#ff4040', { speed: 140, life: 0.7 }); }
        if (t > 2.4) this.choose(adx);
        break;
      }
      case 'rage': {                                          // entra na fase 2
        this.frame = Math.floor(this.st * 12) % 2 ? 'riff3' : 'riff4';
        if (Math.floor(this.st * 10) !== Math.floor((this.st - dt) * 10)) { G.shake = 0.3; spawnParticles(cx, this.y + 14, 10, '#ff3030', { speed: 160, life: 0.6 }); }
        if (this.st > 1.2) this.choose(adx);
        break;
      }
      case 'walk':
        if (adx > 4) this.dir = Math.sign(dx);
        speed = this.phase2 ? BOSS.WALK2 : BOSS.WALK;
        this.walkT += dt;
        this.frame = 'walk' + (Math.floor(this.walk / 2.4) % 12);
        if (adx < BOSS.SMASH_RANGE && this.smashCd <= 0) { this.set('smash'); this.play(SMASH_SEQ); this.vx = 0; break; }
        if (this.walkT > (this.phase2 ? 2.4 : 3.2) || (adx > 150 && this.walkT > 0.8)) { this.walkT = 0; this.startRiff(); }
        break;
      case 'smash':
        if (this.stepSeq(dt)) { this.smashCd = this.phase2 ? 0.6 : 1.1; this.choose(adx, true); }
        break;
      case 'riff': this.updateRiff(dt, adx); break;
      case 'dying': {
        const before = this.frame;
        this.stepSeq(dt);
        this.dt = (this.dt || 0) + dt;
        if (this.dt < 1.3 && Math.random() < 0.5) spawnParticles(this.x + Math.random() * this.w, this.y + Math.random() * this.h, 3, Math.random() < 0.5 ? '#ff6a30' : '#7a1010', { speed: 70, life: 0.6 });
        if (this.frame !== before) {
          if (this.frame === 'death5' || this.frame === 'death6') G.shake = 0.35;                 // joelhos / corpo batendo no chão
          if (this.frame === 'death6') spawnParticles(this.x + this.w / 2 + this.dir * 10, this.y + this.h - 2, 30, '#4a3a3a', { angle: -Math.PI / 2, spread: 2.6, speed: 110, grav: 400, size: 3, life: 0.8 });
          if (this.frame === 'death1') spawnParticles(this.x + this.w / 2 + this.dir * 14, this.y + this.h - 4, 18, '#8a0a0a', { speed: 60, grav: 300, size: 2.5, life: 0.7 });
        }
        if (this.frame === 'death3' && !this.won) { this.won = true; this.defeat(); }
        break;
      }
      case 'dead':
        this.frame = 'death3';
        break;
    }

    if (this.state === 'smash') this.vx = approach(this.vx, 0, 300 * dt);
    else this.vx = this.dir * speed;
    if (this.state === 'walk' && this.onGround && !this.groundAhead()) this.vx = 0;
    this.vy = Math.min(this.vy + PHYS.GRAVITY * dt, PHYS.MAX_FALL);
    moveBody(this, dt);
    this.walk += Math.abs(this.vx) * dt;
  }
  groundAhead() {
    const ahead = this.dir > 0 ? this.x + this.w + 2 : this.x - 2;
    return isSolid(tileAt(Math.floor(ahead / TILE), Math.floor((this.y + this.h + 1) / TILE)));
  }
  choose(adx, afterSmash) {
    if (adx < BOSS.SMASH_RANGE && !afterSmash) { this.set('smash'); this.play(SMASH_SEQ); return; }
    if (adx > 120 || (afterSmash && Math.random() < (this.phase2 ? 0.55 : 0.35))) return this.startRiff();
    this.set('walk'); this.walkT = 0;
  }

  // ---------- riff: antecipação → riff → disparos → finalização ----------
  startRiff() { this.set('riff'); this.riffStep = 'antic'; this.volley = 0; this.dir = Math.sign(G.player.x - this.x) || this.dir; }
  updateRiff(dt, adx) {
    const volleys = this.phase2 ? 3 : 2;
    switch (this.riffStep) {
      case 'antic': this.frame = 'riff0'; if (this.st > (this.phase2 ? 0.35 : 0.5)) { this.riffStep = 'shred'; this.st = 0; } break;
      case 'shred':
        this.frame = Math.floor(this.st * 10) % 2 ? 'riff1' : 'riff2';
        if (this.st > 0.6) { this.riffStep = 'peak'; this.st = 0; this.fired = false; }
        break;
      case 'peak':                                            // "Peak Riff": dispara um leque de notas
        this.frame = 'riff3';
        if (!this.fired) { this.fired = true; this.fireVolley(this.phase2 ? 3 : 2, this.volley); G.shake = Math.max(G.shake, 0.15); }
        if (this.st > 0.3) { this.riffStep = 'sustain'; this.st = 0; this.fired = false; }
        break;
      case 'sustain':                                         // "Sustaining the Note": mais uma nota
        this.frame = 'riff4';
        if (!this.fired && this.st > 0.15) { this.fired = true; this.fireVolley(1, 0); }
        if (this.st > 0.45) {
          this.volley++;
          if (this.volley < volleys) { this.riffStep = 'shred'; this.st = 0.3; }
          else { this.riffStep = 'final'; this.st = 0; }
        }
        break;
      case 'final': this.frame = 'riff6'; if (this.st > 0.35) { this.riffStep = 'trans'; this.st = 0; } break;
      case 'trans': this.frame = 'riff7'; if (this.st > 0.3) { this.riffStep = 'recover'; this.st = 0; } break;
      case 'recover': this.frame = 'riff5'; if (this.st > (this.phase2 ? 0.35 : 0.6)) { this.set('walk'); this.walkT = 0; } break;
    }
  }
  fireVolley(n, k) {
    const p = G.player;
    const hx = this.x + this.w / 2 + this.dir * 22, hy = this.y + 6;       // ponta da guitarra
    const tx = p.x + p.w / 2, ty = p.y + p.h / 2;
    const base = Math.atan2(ty - hy, tx - hx);
    const spread = 0.32;
    for (let i = 0; i < n; i++) {
      const a = base + (i - (n - 1) / 2) * spread + (k % 2 ? 0.08 : -0.08);
      G.enemies.push(new SonicNote(hx, hy, a, this.phase2));
    }
    spawnParticles(hx, hy, 14, '#ff4a4a', { speed: 120, life: 0.4 });
  }

  defeat() {
    this.state = 'dead';
    G.data.bosses = G.data.bosses || {};
    G.data.bosses.guitarist = true;
    writeSave();
    G.bossBar = null;
    closeBossGate(false);
    for (const e of G.enemies) if (e instanceof SonicNote || e instanceof Shockwave) e.dead = true;
    G.shake = 0.3;
    showBanner('Chefe derrotado', 'Jorge, o Pecador, tocou seu último acorde. O portão se abre... e algo brilha no alto da galeria.', '#ff6a3a');
    G.banner.t = 6;
  }
}

// ---------- nota musical (projétil) ----------
class SonicNote extends Enemy {
  constructor(x, y, ang, fast) {
    super(x - 5, y - 5, 10, 10, 1);
    this.ang = ang; this.speed = fast ? BOSS.NOTE_SPEED2 : BOSS.NOTE_SPEED;
    this.life = BOSS.NOTE_LIFE; this.spawn = 0.18; this.fade = 0;
    this.color = '#ff4040'; this.isNote = true;
    this.t = 0;
  }
  touches(p) { return this.fade <= 0 && this.spawn <= 0 && overlaps(p, this); }
  onHitPlayer() { this.pop(); }
  hurt() { if (this.fade <= 0) { this.pop(); spawnParticles(this.x + 5, this.y + 5, 10, '#ff8080', { speed: 90, life: 0.3 }); } }
  pop() { this.fade = 0.25; }
  update(dt) {
    this.t += dt;
    if (this.fade > 0) { this.fade -= dt; if (this.fade <= 0) this.dead = true; this.x += Math.cos(this.ang) * this.speed * 0.3 * dt; this.y += Math.sin(this.ang) * this.speed * 0.3 * dt; return; }
    if (this.spawn > 0) { this.spawn -= dt; return; }
    // persegue o herói, mas vira devagar (dá para desviar)
    const p = G.player;
    const want = Math.atan2(p.y + p.h / 2 - (this.y + 5), p.x + p.w / 2 - (this.x + 5));
    let d = want - this.ang; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
    if (this.t < 1.6) this.ang += Math.max(-BOSS.NOTE_TURN * dt, Math.min(BOSS.NOTE_TURN * dt, d));
    this.x += Math.cos(this.ang) * this.speed * dt;
    this.y += Math.sin(this.ang) * this.speed * dt;
    this.life -= dt;
    if (this.life <= 0 || collidesSolid({ x: this.x + 3, y: this.y + 3, w: 4, h: 4 })) this.pop();
    if (Math.random() < 0.35) G.particles.push({ x: this.x + 5 - Math.cos(this.ang) * 6, y: this.y + 5, vx: 0, vy: -8, life: 0.4, max: 0.4, color: Math.random() < 0.5 ? '#ff5050' : '#8a1020', size: 1.5, grav: 0 });
  }
}

// ---------- onda de choque da guitarrada (corre pelo chão) ----------
class Shockwave extends Enemy {
  constructor(x, floorY, dir, big) {
    super(x - 6, floorY - 12, 12, 12, 99);
    this.dir = dir; this.speed = big ? 150 : 120; this.life = big ? 0.9 : 0.6; this.color = '#ff7a30';
  }
  touches(p) { return overlaps(p, this); }
  onHitPlayer() {}
  hurt() {}
  update(dt) {
    this.t += dt; this.life -= dt;
    this.x += this.dir * this.speed * dt;
    const ahead = this.dir > 0 ? this.x + this.w : this.x;
    if (this.life <= 0 || isSolid(tileAt(Math.floor(ahead / TILE), Math.floor((this.y + 6) / TILE))) ||
        !isSolid(tileAt(Math.floor((this.x + 6) / TILE), Math.floor((this.y + this.h + 2) / TILE)))) this.dead = true;
    if (Math.random() < 0.8) G.particles.push({ x: this.x + 6, y: this.y + this.h - 1, vx: -this.dir * 20, vy: -40 - Math.random() * 60, life: 0.35, max: 0.35, color: Math.random() < 0.5 ? '#ff8a3a' : '#5a4a44', size: 2.5, grav: 300 });
  }
}

// ---------- portão da arena ----------
function closeBossGate(closed) {
  const r = G.room;
  for (let ty = 0; ty < r.h; ty++) for (let tx = 0; tx < r.w; tx++)
    if ((r.def.map[ty][tx] || '.') === '|') setTile(tx, ty, closed ? 'X' : '.');
  G.gate = G.gate || {};
  G.gate.closed = closed; G.gate.anim = closed ? 0 : 1;
  if (closed) G.shake = Math.max(G.shake, 0.3);
}

// começa a luta quando o herói passa do portão
function updateBossTrigger() {
  const b = G.enemies.find(e => e.isBoss);
  if (!b || b.state !== 'idle') return;
  const r = G.room;
  let gx = null;
  for (let tx = 0; tx < r.w && gx === null; tx++) if ((r.def.map[8] || '')[tx] === '|') gx = tx;
  if (gx !== null && G.player.x + G.player.w < gx * TILE - 6) b.start();
}

// ================= desenho =================
let bossWhite = null;
function bossImgFor(white) {
  if (!white) return bossImg;
  if (!bossWhite && bossImg.complete) {
    bossWhite = document.createElement('canvas'); bossWhite.width = bossImg.width; bossWhite.height = bossImg.height;
    const g = bossWhite.getContext('2d'); g.drawImage(bossImg, 0, 0);
    g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(255,240,230,0.85)'; g.fillRect(0, 0, bossWhite.width, bossWhite.height);
  }
  return bossWhite || bossImg;
}
function drawBoss(e) {
  if (!bossImg.complete) return;
  const [x, y, w, h, ax, ay] = BOSS_FRAMES[e.frame];
  const cx = Math.round((e.x + e.w / 2) * AP), fy = Math.round((e.y + e.h) * AP);
  shadowAt(cx, fy, 60);
  ctx.save();
  let ox = 0;
  if (e.state === 'dying' && e.frame === 'death4') ox = (Math.random() - 0.5) * 6;
  if (e.state === 'smash' && e.frame === 'smash0') ox = (Math.random() - 0.5) * 2;      // treme antes do golpe
  ctx.translate(cx + ox, 0);
  if (e.dir < 0) ctx.scale(-1, 1);
  ctx.drawImage(bossImgFor(e.flash > 0 || (e.state === 'dying' && (e.dt || 0) < 1.0 && Math.floor((e.dt || 0) * 12) % 2)), x, y, w, h, -Math.round(ax), fy - Math.round(ay), w, h);
  ctx.restore();
  // balão "KERRANG!" (desenhado à parte para nunca ficar espelhado)
  if (e.boom > 0 && kerrangImg.complete) {
    const [, , , , ax2, ay2] = BOSS_FRAMES.smash2;
    const kx = e.dir > 0 ? cx - ax2 + KERRANG_POS[0] : cx + ax2 - KERRANG_POS[0];
    const ky = fy - ay2 + KERRANG_POS[1];
    const t = 0.5 - e.boom, s = t < 0.08 ? 0.5 + t / 0.08 * 0.7 : 1.2 - Math.min(0.2, (t - 0.08) * 1.5);
    ctx.save(); ctx.globalAlpha = Math.min(1, e.boom * 4);
    ctx.translate(Math.round(kx), Math.round(ky)); ctx.rotate(-0.08 * e.dir); ctx.scale(s, s);
    ctx.drawImage(kerrangImg, -Math.round(kerrangImg.width / 2), -Math.round(kerrangImg.height / 2));
    ctx.restore();
  }
}
function drawSonicNote(e) {
  if (!noteImg.complete) return;
  let f;
  if (e.fade > 0) f = e.fade > 0.12 ? 'note5' : 'note6';
  else if (e.spawn > 0) f = 'note0';
  else f = 'note' + (1 + Math.floor(e.t * 12) % 4);
  const [x, y, w, h] = NOTE_FRAMES[f];
  const cx = (e.x + 5) * AP, cy = (e.y + 5) * AP;
  ctx.save();
  ctx.translate(Math.round(cx), Math.round(cy));
  if (e.spawn <= 0) ctx.rotate(e.ang);
  if (Math.cos(e.ang) < 0 && e.spawn <= 0) ctx.scale(1, -1);       // não fica de cabeça para baixo
  // a cabeça da nota fica à direita do quadro; centraliza nela
  const hx = f === 'note0' ? w / 2 : w * 0.62;
  ctx.globalAlpha = e.fade > 0 ? Math.max(0, e.fade / 0.25) : 1;
  ctx.drawImage(noteImg, x, y, w, h, -Math.round(hx), -Math.round(h * 0.62), w, h);
  ctx.restore();
}
function drawShockwave(e) {
  const x = (e.x + e.w / 2) * AP, fy = (e.y + e.h) * AP, k = Math.min(1, e.life * 3);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, fy, 2, x, fy, 46);
  g.addColorStop(0, `rgba(255,200,120,${0.8 * k})`); g.addColorStop(0.4, `rgba(255,90,30,${0.5 * k})`); g.addColorStop(1, 'rgba(255,40,0,0)');
  ctx.fillStyle = g; ctx.fillRect(x - 46, fy - 46, 92, 46);
  ctx.restore();
  ctx.fillStyle = `rgba(40,30,30,${k})`;
  for (let i = 0; i < 4; i++) ctx.fillRect(Math.round(x - 14 + i * 8), Math.round(fy - 10 - ((i * 7 + Math.floor(e.t * 30)) % 12)), 6, 6);
}
function drawGate() {
  if (!G.gate) return;
  const r = G.room;
  const target = G.gate.closed ? 1 : 0;
  G.gate.anim += (target - G.gate.anim) * 0.18;
  if (G.gate.anim < 0.01) return;
  let gx = null, gy0 = null, gy1 = null;
  for (let ty = 0; ty < r.h; ty++) for (let tx = 0; tx < r.w; tx++)
    if ((r.def.map[ty][tx] || '.') === '|') { gx = tx; if (gy0 === null) gy0 = ty; gy1 = ty; }
  if (gx === null) return;
  const X = gx * TILE * AP, Y0 = gy0 * TILE * AP, H = (gy1 - gy0 + 1) * TILE * AP;
  const drop = Math.round(H * G.gate.anim);
  ctx.save();
  ctx.beginPath(); ctx.rect(X - 4, Y0, TILE * AP + 8, H); ctx.clip();
  const top = Y0 + drop - H;
  for (let i = 0; i < 5; i++) {
    const bx = X + 4 + i * 13;
    ctx.fillStyle = '#1a1c20'; ctx.fillRect(bx - 1, top, 8, H);
    ctx.fillStyle = '#4a5058'; ctx.fillRect(bx, top, 6, H);
    ctx.fillStyle = '#7a828c'; ctx.fillRect(bx, top, 2, H);
    ctx.fillStyle = '#4a5058';
    ctx.beginPath(); ctx.moveTo(bx - 2, top + H - 2); ctx.lineTo(bx + 3, top + H + 8); ctx.lineTo(bx + 8, top + H - 2); ctx.fill();
  }
  for (let k = 0; k < 4; k++) {
    const yy = top + 18 + k * (H / 4);
    ctx.fillStyle = '#1a1c20'; ctx.fillRect(X, yy - 1, TILE * AP, 8);
    ctx.fillStyle = '#3d424a'; ctx.fillRect(X, yy, TILE * AP, 6);
    ctx.fillStyle = '#6a727c'; ctx.fillRect(X, yy, TILE * AP, 2);
  }
  ctx.restore();
}

// ================= interface do chefe =================
const bossPortrait = new Image(); bossPortrait.src = 'assets/boss_portrait.png?v=' + ASSET_V;
const bossIcon = new Image(); bossIcon.src = 'assets/boss_icon.png?v=' + ASSET_V;
const BOSS_NAME = 'JORGE O PECADOR';
function drawBossUI() {
  const b = G.bossBar;
  if (G.bossTitle && G.bossTitle.t > 0) {                 // apresentação com o retrato
    G.bossTitle.t -= 1 / 60;
    const T = 3.2, t = T - G.bossTitle.t, a = Math.min(1, t * 2.5, G.bossTitle.t * 1.6);
    ctx.save();
    ctx.globalAlpha = a * 0.7; ctx.fillStyle = '#0a0004'; ctx.fillRect(0, 0, CW, CH);
    ctx.globalAlpha = a;
    if (bossPortrait.complete) {
      const s = 0.82 + 0.06 * Math.min(1, t / 0.5) + t * 0.01;
      const w = bossPortrait.width * s, h = bossPortrait.height * s;
      // brilho vermelho atrás
      const g = ctx.createRadialGradient(CW / 2, CH / 2 - 20, 40, CW / 2, CH / 2 - 20, w * 0.75);
      g.addColorStop(0, 'rgba(180,20,30,0.45)'); g.addColorStop(1, 'rgba(180,20,30,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, CW, CH);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(bossPortrait, Math.round(CW / 2 - w / 2), Math.round(CH / 2 - h / 2 - 34), Math.round(w), Math.round(h));
      ctx.imageSmoothingEnabled = false;
      text('O Guitarrista Hardcore', CW / 2, CH / 2 + h / 2 - 22, { size: 30, font: FONT_T, weight: 800, align: 'center', alpha: a, color: '#c03a2a', spacing: 3 });
    }
    ctx.restore();
  }
  if (!b) return;
  const W = 600, x = CW / 2 - W / 2 + 26, y = 30;
  frameBox(x, y, W, 26, 0.9);
  // ícone do chefe
  frameBox(x - 62, y - 14, 54, 54, 0.95);
  if (bossIcon.complete) { ctx.imageSmoothingEnabled = true; ctx.drawImage(bossIcon, x - 59, y - 11, 48, 48); ctx.imageSmoothingEnabled = false; }
  const len = W - 12;
  ctx.fillStyle = '#2a0808'; ctx.fillRect(x + 6, y + 6, len, 14);
  ctx.fillStyle = 'rgba(255,220,190,0.8)'; ctx.fillRect(x + 6, y + 6, Math.round(len * b.lag), 14);
  const f = Math.max(0, b.hp) / b.maxHp;
  ctx.fillStyle = '#8a1010'; ctx.fillRect(x + 6, y + 6, Math.round(len * f), 14);
  ctx.fillStyle = '#d02a20'; ctx.fillRect(x + 6, y + 6, Math.round(len * f), 7);
  ctx.fillStyle = '#ff7a50'; ctx.fillRect(x + 6, y + 6, Math.round(len * f), 2);
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x + 6 + len / 2, y + 6, 2, 14);   // marca da fase 2
  text(BOSS_NAME, x + W / 2, y + 32, { size: 20, font: FONT_T, weight: 800, align: 'center', color: '#e0c8b0', spacing: 3 });
}
