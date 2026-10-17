// =============================================================
//  PERSONAGENS: jogador e inimigos
// =============================================================

// Tempos dos golpes (segundos)
const ATK = {
  down: { total: 0.30, hitFrom: 0.22, hitTo: 0.10 },   // ergue a espada e corta para baixo
  up:   { total: 0.32, hitFrom: 0.26, hitTo: 0.12 },   // golpe de baixo para cima (com pulinho)
  low:  { total: 0.22, hitFrom: 0.18, hitTo: 0.06 },   // estocada agachado
};

class Player {
  constructor() {
    this.x = 0; this.y = 0; this.w = 12; this.h = Player.H;
    this.vx = 0; this.vy = 0;
    this.onGround = false;
    this.facing = 1;
    this.crouch = false;
    this.coyote = 0;       // tempinho para pular logo depois de sair da borda
    this.jumpBuf = 0;      // guarda o "pular" apertado um pouco antes de tocar o chão
    this.jumpCut = false;
    this.airJumps = 0;
    this.dashT = 0; this.dashCd = 0; this.airDash = true;   // rolamento
    this.sprintT = 0; this.sprintCd = 0;                    // dash (arrancada no chão)
    this.wall = 0; this.climbCd = 0; this.lockT = 0; this.climbAnim = 0;   // escalada
    this.atkT = 0; this.atkKind = null; this.atkCd = 0; this.comboT = 0; this.hitSet = new Set();
    this.inv = 0; this.stun = 0; this.dropT = 0;
    this.hp = 5;
    this.safe = { x: 0, y: 0 };
    this.anim = 0;
    this.trail = [];       // imagens fantasma do rolamento / dash
  }

  static get H() { return 28; }
  static get CH() { return 19; }   // altura agachado

  standUp() {
    if (!this.crouch) return true;
    const test = { x: this.x, y: this.y - (Player.H - Player.CH), w: this.w, h: Player.H };
    if (collidesSolid(test)) return false;
    this.crouch = false; this.y = test.y; this.h = Player.H;
    return true;
  }

  // Tem parede encostada deste lado? (part: 'all' | 'top' | 'low')
  wallAt(side, part = 'all') {
    const y0 = part === 'top' ? this.y : this.y + (part === 'low' ? 12 : 4);
    const h = part === 'top' ? 8 : this.h - (part === 'low' ? 14 : 8);
    return collidesSolid({ x: side > 0 ? this.x + this.w + 0.5 : this.x - 1.5, y: y0, w: 1, h });
  }

  // Ataque está na parte que acerta?
  atkActive() {
    if (!this.atkKind) return false;
    const a = ATK[this.atkKind];
    return this.atkT <= a.hitFrom && this.atkT > a.hitTo;
  }
  atkPhase() {      // 0 = preparando, 1 = golpe, 2 = recuperando
    const a = ATK[this.atkKind];
    return this.atkT > a.hitFrom ? 0 : this.atkT > a.hitTo ? 1 : 2;
  }
  attackBox() {
    const f = this.facing, cx = this.x + this.w / 2;
    let w = 26, h = this.h + 8, y = this.y - 4;
    if (this.atkKind === 'up') { w = 24; h = this.h + 18; y = this.y - 20; }
    if (this.atkKind === 'low') { w = 28; h = 16; y = this.y + this.h - 16; }
    return { x: f > 0 ? cx - 2 : cx + 2 - w, y, w, h };
  }

  startAttack() {
    let kind = 'down';
    if (this.crouch) kind = 'low';
    else if (this.comboT > 0) kind = 'up';
    this.atkKind = kind; this.atkT = ATK[kind].total; this.hitSet.clear();
    this.comboT = 0; this.sprintT = 0;
  }

  update(dt) {
    const I = Input, ab = G.data.abilities;
    for (const k of ['inv', 'stun', 'dashCd', 'sprintCd', 'atkCd', 'dropT', 'climbCd', 'lockT', 'comboT'])
      this[k] = Math.max(0, this[k] - dt);
    this.coyote = this.onGround ? 0.1 : Math.max(0, this.coyote - dt);
    this.jumpBuf = I.pressed.jump ? 0.12 : Math.max(0, this.jumpBuf - dt);

    let dir = (I.down.right ? 1 : 0) - (I.down.left ? 1 : 0);
    if (this.stun > 0) dir = 0;
    if (this.lockT > 0) dir = this.facing;          // logo depois do pulo de parede

    // ---------------- agarrado na parede ----------------
    if (this.wall) {
      const side = this.wall;
      this.facing = side;
      this.vx = 0;
      if (I.down.up) this.vy = -55; else if (I.down.down) this.vy = 95; else this.vy = 0;
      this.climbAnim += Math.abs(this.vy) * dt;
      if (this.jumpBuf > 0) {                                   // pulo de parede
        this.wall = 0; this.jumpBuf = 0;
        this.vx = -side * 190; this.vy = -PHYS.JUMP * 0.92; this.jumpCut = true;
        this.facing = -side; this.lockT = 0.16; this.climbCd = 0.2; this.airJumps = 1;
        spawnParticles(side > 0 ? this.x + this.w : this.x, this.y + this.h / 2, 8, '#6a6a5e', { angle: side > 0 ? Math.PI : 0, spread: 1.6, speed: 50, life: 0.35 });
      } else if (I.down.up && !this.wallAt(side, 'top') && this.wallAt(side, 'low')) {   // subir na borda
        this.wall = 0; this.vy = -230; this.vx = side * 80; this.climbCd = 0.3; this.lockT = 0.22;
      } else if (dir === -side || !this.wallAt(side) || this.stun > 0) {
        this.wall = 0; this.climbCd = 0.2;
      }
      moveBody(this, dt);
      if (this.onGround) this.wall = 0;
      this.anim += 0;
      this.afterMove();
      return;
    }

    if (this.dashT > 0) {
      // ---- rolamento (atravessa inimigos sem se ferir) ----
      this.dashT -= dt;
      this.vx = this.facing * PHYS.DASH_SPEED;
      this.vy = 0;
      if (Math.floor(this.dashT * 60) % 4 === 0)
        this.trail.push({ pose: 'roll', x: this.x + this.w / 2, y: this.y + this.h, f: this.facing, life: 0.18, rot: this.rollAngle() });
      if (this.onGround && Math.random() < 0.5)
        G.particles.push({ x: this.x + this.w / 2, y: this.y + this.h - 1, vx: -this.facing * 30, vy: -10, life: 0.35, max: 0.35, color: '#5a5a50', size: 2, grav: 0 });
      if (this.dashT <= 0) this.vx = this.facing * PHYS.RUN;
    } else {
      if (dir && this.atkT <= 0) this.facing = dir;
      // ---- agachar ----
      if (I.down.down && this.onGround && this.stun <= 0 && !this.crouch && this.sprintT <= 0) {
        this.crouch = true; this.y += Player.H - Player.CH; this.h = Player.CH;
      } else if (this.crouch && (!I.down.down || !this.onGround)) this.standUp();
      if (this.crouch) dir = 0;

      // ---- dash (arrancada rápida no chão) ----
      if (I.pressed.sprint && this.onGround && this.sprintCd <= 0 && this.stun <= 0 && this.standUp()) {
        if (dir) this.facing = dir;
        this.sprintT = PHYS.SPRINT_TIME; this.sprintCd = 0.45; this.atkT = 0; this.atkKind = null;
        spawnParticles(this.x + this.w / 2, this.y + this.h, 8, '#6a6a5e', { angle: this.facing > 0 ? Math.PI : 0, spread: 1, speed: 60, life: 0.35 });
      }
      if (this.sprintT > 0) {
        this.sprintT -= dt;
        this.vx = this.facing * PHYS.SPRINT_SPEED;
        if (Math.floor(this.sprintT * 60) % 3 === 0)
          this.trail.push({ pose: 'dash', x: this.x + this.w / 2, y: this.y + this.h, f: this.facing, life: 0.16, tint: true });
        if (!this.onGround) this.sprintT = 0;
      } else if (this.stun > 0) this.vx = approach(this.vx, 0, 300 * dt);
      else if (this.atkT > 0 && this.onGround) this.vx = approach(this.vx, 0, 900 * dt);   // firma os pés ao golpear
      else this.vx = approach(this.vx, dir * PHYS.RUN, (this.onGround ? 1400 : 900) * dt);
      this.vy = Math.min(this.vy + PHYS.GRAVITY * dt, PHYS.MAX_FALL);

      // ---- pular / descer da plataforma ----
      if (this.jumpBuf > 0 && I.down.down && this.onGround && this.groundTile === '=') {
        this.dropT = 0.25; this.jumpBuf = 0; this.y += 1;
      } else if (this.jumpBuf > 0 && this.stun <= 0 && this.standUp()) {
        if (this.onGround || this.coyote > 0) {
          this.vy = -PHYS.JUMP; this.jumpBuf = 0; this.coyote = 0; this.jumpCut = true; this.sprintT = 0;
          spawnParticles(this.x + this.w / 2, this.y + this.h, 6, '#6a6a5e', { angle: -Math.PI / 2, spread: 2.6, speed: 40, life: 0.35 });
        } else if (ab.doubleJump && this.airJumps > 0) {
          this.airJumps--; this.vy = -PHYS.DOUBLE_JUMP; this.jumpBuf = 0; this.jumpCut = true;
          spawnParticles(this.x + this.w / 2, this.y + this.h, 14, '#9ff0ff', { angle: Math.PI / 2, spread: 2.6, speed: 70, life: 0.4 });
        }
      }
      if (this.jumpCut && !I.down.jump && this.vy < 0) { this.vy *= 0.45; this.jumpCut = false; }
      if (this.vy >= 0) this.jumpCut = false;

      // ---- iniciar rolamento ----
      if (I.pressed.dash && ab.dash && this.dashCd <= 0 && this.stun <= 0 && (this.onGround || this.airDash) && this.standUp()) {
        if (dir) this.facing = dir;
        this.dashT = PHYS.DASH_TIME; this.dashCd = 0.45; this.atkT = 0; this.atkKind = null; this.sprintT = 0;
        if (!this.onGround) this.airDash = false;
      }

      // ---- agarrar na parede ----
      if (ab.climb && !this.onGround && dir !== 0 && this.climbCd <= 0 && this.atkT <= 0 && this.wallAt(dir) && this.vy > -150) {
        this.wall = dir; this.vx = 0; this.vy = 0; this.airJumps = 1; this.airDash = true; this.sprintT = 0;
      }
    }

    // ---- ataque ----
    if (I.pressed.attack && this.atkT <= 0 && this.atkCd <= 0 && this.stun <= 0 && this.dashT <= 0 && !this.wall) this.startAttack();
    if (this.atkT > 0) {
      const before = this.atkPhase();
      this.atkT -= dt;
      if (this.atkT <= 0) {
        if (this.atkKind === 'down') this.comboT = 0.35;     // janela para o golpe de baixo para cima
        this.atkKind = null; this.atkCd = 0.05;
      } else {
        if (before === 0 && this.atkPhase() === 1) {          // começou o corte
          if (this.atkKind === 'up') { if (this.onGround) this.vy = -170; else this.vy = Math.min(this.vy, -110); }
          else if (this.onGround) this.vx = this.facing * 70;
          G.shake = Math.max(G.shake, 0.05);
        }
        if (this.atkActive()) this.doAttack();
      }
    }

    moveBody(this, dt);
    if (this.hitWallX && this.dashT > 0) this.dashT = 0;
    if (this.hitWallX && this.sprintT > 0) this.sprintT = 0;
    this.afterMove();
    this.anim += Math.abs(this.vx) * dt;
  }

  afterMove() {
    for (const gh of this.trail) gh.life -= 1 / 60;
    this.trail = this.trail.filter(gh => gh.life > 0);
    if (this.onGround) {
      this.airJumps = 1; this.airDash = true;
      if (!touchingSpikes(this)) this.safe = { x: this.x, y: this.y };
    }
  }

  doAttack() {
    const box = this.attackBox();
    for (const e of G.enemies) {
      if (e.dead || e.state === 'dead' || this.hitSet.has(e) || e instanceof Shockwave || !overlaps(box, e)) continue;
      this.hitSet.add(e);
      e.hurt(1, this.facing);
      if (this.atkKind === 'up' && !e.isBoss && !e.isNote) e.vy = -160;
      spawnParticles(e.x + e.w / 2, e.y + e.h / 2, 8, '#e8f4ff', { angle: this.atkKind === 'up' ? -Math.PI / 2 : this.facing > 0 ? 0 : Math.PI, spread: 1.4, speed: 120, life: 0.25 });
    }
    // quebrar blocos rachados
    const x0 = Math.floor(box.x / TILE), x1 = Math.floor((box.x + box.w) / TILE);
    const y0 = Math.floor(box.y / TILE), y1 = Math.floor((box.y + box.h) / TILE);
    for (let ty = y0; ty <= y1; ty++)
      for (let tx = x0; tx <= x1; tx++)
        if (tileAt(tx, ty) === 'B') {
          setTile(tx, ty, '.');
          spawnParticles(tx * TILE + 8, ty * TILE + 8, 18, THEMES[G.room.def.theme].stone[3], { speed: 90, grav: 400, size: 3, life: 0.7 });
          G.shake = Math.max(G.shake, 0.1);
        }
  }

  hurt(dmg, srcX, hazard) {
    if (G.state !== 'play') return;
    if (this.inv > 0) {
      if (hazard) this.toSafe();
      return;
    }
    this.hp -= dmg;
    G.shake = 0.25;
    spawnParticles(this.x + this.w / 2, this.y + this.h / 2, 12, '#8a1a1a', { speed: 80, grav: 300, life: 0.5 });
    if (this.hp <= 0) { playerDied(); return; }
    this.inv = 1.0;
    this.dashT = 0; this.sprintT = 0; this.wall = 0; this.atkT = 0; this.atkKind = null;
    this.standUp();
    if (hazard) {
      this.toSafe();
    } else {
      this.stun = 0.25;
      this.vx = (this.x + this.w / 2 < srcX ? -1 : 1) * 160;
      this.vy = -180;
    }
  }

  rollAngle() { return (1 - this.dashT / PHYS.DASH_TIME) * Math.PI * 2 * this.facing; }

  toSafe() {
    this.x = this.safe.x; this.y = this.safe.y;
    this.vx = 0; this.vy = 0; this.stun = 0.2; this.wall = 0;
    G.fade = 0.4;
  }
}

// ---------------- inimigos ----------------
class Enemy {
  constructor(x, y, w, h, hp) {
    this.x = x; this.y = y; this.w = w; this.h = h;
    this.vx = 0; this.vy = 0; this.hp = hp;
    this.flash = 0; this.kb = 0; this.dead = false; this.t = Math.random() * 10;
  }
  hurt(dmg, dir) {
    this.hp -= dmg;
    this.flash = 0.12;
    this.kb = 0.2;
    this.vx = dir * 120;
    this.vy = -60;
    G.shake = Math.max(G.shake, 0.08);
    spawnParticles(this.x + this.w / 2, this.y + this.h / 2, 6, '#ffffff', { speed: 70, life: 0.25 });
    if (this.hp <= 0) {
      this.dead = true;
      spawnParticles(this.x + this.w / 2, this.y + this.h / 2, 18, this.color, { speed: 90, grav: 200, size: 3, life: 0.6 });
      if (Math.random() < 0.35)
        G.items.push({ type: 'heart', x: this.x + this.w / 2 - 4, y: this.y, w: 8, h: 8, vy: -80 });
    }
  }
}

// LOBISOMEM: patrulha; ao ver o herói, uiva, avança num dash e ataca com garradas
const WOLF = {
  W: 22, H: 34, HP: 6,
  PATROL: 24, CHASE: 62,
  SIGHT_X: 150, SIGHT_Y: 34,          // alcance da visão
  ALERT: 0.5,                         // uivo antes de agir
  DASH_PREP: 0.28, DASH_SPEED: 290, DASH_TIME: 0.5, DASH_CD: 2.4,
  CLAW_RANGE: 30,
  WIND: 0.34, WIND2: 0.16, STRIKE: 0.14, RECOVER: 0.6,
};
class Werewolf extends Enemy {
  constructor(x, y) {
    super(x, y - (WOLF.H - TILE), WOLF.W, WOLF.H, WOLF.HP);
    this.dir = -1; this.color = '#5a4a44';
    this.state = 'patrol'; this.st = 0;          // estado atual e tempo nele
    this.seen = 0; this.dashCd = 0; this.combo = 0; this.walk = 0;
    this.pause = 0; this.hitDone = false; this.trail = [];
  }
  set(state) { this.state = state; this.st = 0; this.hitDone = false; }

  canSee(p) {
    const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
    const px = p.x + p.w / 2, py = p.y + p.h / 2;
    const dx = px - cx, dy = py - cy;
    if (Math.abs(dx) > WOLF.SIGHT_X || Math.abs(dy) > WOLF.SIGHT_Y) return false;
    if (Math.sign(dx) !== this.dir && Math.abs(dx) > 40 && this.state === 'patrol') return false;
    // nenhuma parede no caminho
    const n = Math.ceil(Math.abs(dx) / 6);
    for (let k = 1; k < n; k++) {
      const x = cx + dx * k / n, y = cy + dy * k / n - 6;
      if (isSolid(tileAt(Math.floor(x / TILE), Math.floor(y / TILE)))) return false;
    }
    return true;
  }
  groundAhead(d = this.dir) {
    const ahead = d > 0 ? this.x + this.w + 2 : this.x - 2;
    const below = tileAt(Math.floor(ahead / TILE), Math.floor((this.y + this.h + 1) / TILE));
    return isSolid(below) || below === '=';
  }
  // caixa das garras (na frente dele)
  clawBox() {
    const w = 30, h = 26;
    return { x: this.dir > 0 ? this.x + this.w - 4 : this.x + 4 - w, y: this.y + 4, w, h };
  }
  // encostar no corpo machuca; garras e dash machucam mais longe
  touches(p) {
    if (this.state === 'dying') return false;
    if (this.state === 'claw' && this.st < WOLF.STRIKE && overlaps(p, this.clawBox())) return true;
    return overlaps(p, { x: this.x + 3, y: this.y + 6, w: this.w - 6, h: this.h - 6 });
  }

  hurt(dmg, dir) {
    if (this.state === 'dying') return;
    this.hp -= dmg;
    this.flash = 0.12;
    G.shake = Math.max(G.shake, 0.08);
    spawnParticles(this.x + this.w / 2, this.y + this.h / 2, 10, '#7a1010', { speed: 90, grav: 300, size: 2.5, life: 0.5 });
    if (this.hp <= 0) {
      this.set('dying'); this.vx = dir * 60; this.vy = -90;
      spawnParticles(this.x + this.w / 2, this.y + this.h / 2, 26, '#5a0a0a', { speed: 120, grav: 350, size: 3, life: 0.8 });
      return;
    }
    // é pesado: só cambaleia se não estiver no meio de um ataque
    if (['patrol', 'chase', 'recover', 'alert'].includes(this.state)) {
      this.kb = 0.18; this.vx = dir * 70;
    }
    if (this.state === 'patrol') { this.dir = -dir; this.set('alert'); }   // vira e encara quem bateu
    this.seen = 3;
  }

  update(dt) {
    const p = G.player;
    this.t += dt; this.st += dt; this.flash -= dt;
    this.dashCd = Math.max(0, this.dashCd - dt);
    for (const gh of this.trail) gh.life -= dt;
    this.trail = this.trail.filter(g => g.life > 0);
    const cx = this.x + this.w / 2, px = p.x + p.w / 2;
    const dx = px - cx, adx = Math.abs(dx);
    const playerOk = G.state === 'play';
    const sees = playerOk && this.canSee(p);
    if (sees) this.seen = 2.5; else this.seen = Math.max(0, this.seen - dt);
    const faceP = () => { if (adx > 2) this.dir = Math.sign(dx); };
    let speed = 0;

    switch (this.state) {
      case 'patrol':
        if (this.pause > 0) { this.pause -= dt; speed = 0; }
        else {
          speed = WOLF.PATROL;
          if (this.hitWallX || (this.onGround && !this.groundAhead())) { this.dir = -this.dir; this.pause = 0.8 + Math.random() * 0.6; }
        }
        if (sees) { faceP(); this.set('alert'); G.shake = Math.max(G.shake, 0.15); }
        break;
      case 'alert':                                           // uivo
        if (this.st >= WOLF.ALERT) this.decide(adx);
        break;
      case 'chase':
        faceP();
        speed = WOLF.CHASE;
        if (!this.groundAhead()) speed = 0;
        if (this.seen <= 0) { this.set('patrol'); break; }
        this.decide(adx);
        break;
      case 'dashPrep':                                        // agacha antes de saltar
        faceP();
        if (this.st >= WOLF.DASH_PREP) {
          this.set('dash'); this.dashCd = WOLF.DASH_CD;
          spawnParticles(cx, this.y + this.h, 10, '#5a5a50', { angle: this.dir > 0 ? Math.PI : 0, spread: 1.2, speed: 80, life: 0.4 });
        }
        break;
      case 'dash':
        speed = WOLF.DASH_SPEED;
        if (Math.floor(this.st * 60) % 3 === 0) this.trail.push({ x: this.x, y: this.y, dir: this.dir, life: 0.2 });
        if (this.st > WOLF.DASH_TIME || this.hitWallX || !this.groundAhead() ||
            (Math.sign(dx) === this.dir && adx < WOLF.CLAW_RANGE)) {
          this.vx = 0; this.combo = 0;
          this.set(adx < WOLF.CLAW_RANGE + 12 ? 'windup' : 'recover');
        }
        break;
      case 'windup':                                          // ergue as garras
        if (this.combo === 0) faceP();
        if (this.st >= (this.combo === 0 ? WOLF.WIND : WOLF.WIND2)) { this.set('claw'); this.vx = this.dir * 90; G.shake = Math.max(G.shake, 0.06); }
        break;
      case 'claw':                                            // golpe
        if (this.st >= WOLF.STRIKE + 0.08) {
          this.combo++;
          if (this.combo < 2) this.set('windup'); else this.set('recover');
        }
        break;
      case 'recover':
        if (this.st >= WOLF.RECOVER) this.seen > 0 ? this.set('chase') : this.set('patrol');
        break;
      case 'dying':
        if (this.st > 1.1) {
          this.dead = true;
          if (Math.random() < 0.6) G.items.push({ type: 'heart', x: cx - 4, y: this.y + 10, w: 8, h: 8, vy: -80 });
        }
        break;
    }

    if (this.kb > 0) { this.kb -= dt; this.vx = approach(this.vx, 0, 500 * dt); }
    else if (this.state === 'claw' || this.state === 'dying') this.vx = approach(this.vx, 0, 400 * dt);
    else this.vx = this.dir * speed;
    this.vy = Math.min(this.vy + PHYS.GRAVITY * dt, PHYS.MAX_FALL);
    moveBody(this, dt);
    this.walk += Math.abs(this.vx) * dt;
  }

  // escolhe o próximo ataque
  decide(adx) {
    if (this.seen <= 0) return this.set('patrol');
    if (adx < WOLF.CLAW_RANGE) { this.combo = 0; return this.set('windup'); }
    if (this.dashCd <= 0 && adx > 45 && this.groundAhead()) return this.set('dashPrep');
    if (this.state !== 'chase') this.set('chase');
  }
}

// MORCEGO: flutua e persegue o jogador quando ele chega perto (atravessa paredes)
class Flyer extends Enemy {
  constructor(x, y) { super(x, y, 12, 10, 2); this.color = '#3b2830'; }
  update(dt) {
    this.t += dt; this.flash -= dt;
    const p = G.player;
    if (this.kb > 0) {
      this.kb -= dt;
      this.x += this.vx * dt; this.y += this.vy * dt;
      this.vx *= 0.9; this.vy *= 0.9;
      return;
    }
    const dx = p.x + p.w / 2 - (this.x + this.w / 2);
    const dy = p.y + p.h / 2 - (this.y + this.h / 2);
    const dist = Math.hypot(dx, dy) || 1;
    if (dist < 130) {
      this.x += dx / dist * 42 * dt;
      this.y += dy / dist * 42 * dt + Math.sin(this.t * 6) * 0.4;
    } else {
      this.y += Math.sin(this.t * 2) * 0.25;
    }
  }
}
