// =============================================================
//  PERSONAGENS: jogador e inimigos
// =============================================================

class Player {
  constructor() {
    this.x = 0; this.y = 0; this.w = 12; this.h = Player.H;
    this.crouch = false;
    this.vx = 0; this.vy = 0;
    this.onGround = false;
    this.facing = 1;
    this.coyote = 0;       // tempinho para pular logo depois de sair da borda
    this.jumpBuf = 0;      // guarda o "pular" apertado um pouco antes de tocar o chão
    this.jumpCut = false;
    this.airJumps = 0;
    this.dashT = 0; this.dashCd = 0; this.airDash = true;
    this.atkT = 0; this.atkCd = 0; this.hitSet = new Set();
    this.inv = 0; this.stun = 0; this.dropT = 0;
    this.hp = 5;
    this.safe = { x: 0, y: 0 };
    this.anim = 0;
    this.trail = [];       // imagens fantasma do rolamento
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

  attackBox() {
    return this.facing > 0
      ? { x: this.x + this.w - 2, y: this.y - 2, w: 24, h: this.h + 4 }
      : { x: this.x - 22, y: this.y - 2, w: 24, h: this.h + 4 };
  }

  update(dt) {
    const I = Input, ab = G.data.abilities;
    this.inv = Math.max(0, this.inv - dt);
    this.stun = Math.max(0, this.stun - dt);
    this.dashCd = Math.max(0, this.dashCd - dt);
    this.atkCd = Math.max(0, this.atkCd - dt);
    this.dropT = Math.max(0, this.dropT - dt);
    this.coyote = this.onGround ? 0.1 : Math.max(0, this.coyote - dt);
    this.jumpBuf = I.pressed.jump ? 0.12 : Math.max(0, this.jumpBuf - dt);

    let dir = (I.down.right ? 1 : 0) - (I.down.left ? 1 : 0);
    if (this.stun > 0) dir = 0;

    if (this.dashT > 0) {
      // ---- rolamento (atravessa inimigos sem se ferir) ----
      this.dashT -= dt;
      this.vx = this.facing * PHYS.DASH_SPEED;
      this.vy = 0;
      if (Math.floor(this.dashT * 60) % 4 === 0)
        this.trail.push({ x: this.x + this.w / 2, y: this.y + this.h, f: this.facing, life: 0.18, rot: this.rollAngle() });
      if (this.onGround && Math.random() < 0.5)
        G.particles.push({ x: this.x + this.w / 2, y: this.y + this.h - 1, vx: -this.facing * 30, vy: -10,
          life: 0.35, max: 0.35, color: '#5a5a50', size: 2, grav: 0 });
      if (this.dashT <= 0) this.vx = this.facing * PHYS.RUN;
    } else {
      // ---- andar ----
      if (dir && this.atkT <= 0) this.facing = dir;
      // ---- agachar ----
      if (I.down.down && this.onGround && this.stun <= 0 && !this.crouch) {
        this.crouch = true; this.y += Player.H - Player.CH; this.h = Player.CH;
      } else if (this.crouch && (!I.down.down || !this.onGround)) this.standUp();
      if (this.crouch) dir = 0;
      if (this.stun > 0) this.vx = approach(this.vx, 0, 300 * dt);
      else this.vx = approach(this.vx, dir * PHYS.RUN, (this.onGround ? 1400 : 900) * dt);
      this.vy = Math.min(this.vy + PHYS.GRAVITY * dt, PHYS.MAX_FALL);

      // ---- pular / descer da plataforma ----
      if (this.jumpBuf > 0 && I.down.down && this.onGround && this.groundTile === '=') {
        this.dropT = 0.25; this.jumpBuf = 0; this.y += 1;
      } else if (this.jumpBuf > 0 && this.stun <= 0 && this.standUp()) {
        if (this.onGround || this.coyote > 0) {
          this.vy = -PHYS.JUMP; this.jumpBuf = 0; this.coyote = 0; this.jumpCut = true;
          spawnParticles(this.x + this.w / 2, this.y + this.h, 6, '#6a6a5e', { angle: -Math.PI / 2, spread: 2.6, speed: 40, life: 0.35 });
        } else if (ab.doubleJump && this.airJumps > 0) {
          this.airJumps--; this.vy = -PHYS.DOUBLE_JUMP; this.jumpBuf = 0; this.jumpCut = true;
          spawnParticles(this.x + this.w / 2, this.y + this.h, 14, '#9ff0ff', { angle: Math.PI / 2, spread: 2.6, speed: 70, life: 0.4 });
        }
      }
      // soltar o botão no meio do pulo = pulo mais baixo
      if (this.jumpCut && !I.down.jump && this.vy < 0) { this.vy *= 0.45; this.jumpCut = false; }
      if (this.vy >= 0) this.jumpCut = false;

      // ---- iniciar dash ----
      if (I.pressed.dash && ab.dash && this.dashCd <= 0 && this.stun <= 0 && (this.onGround || this.airDash) && this.standUp()) {
        if (dir) this.facing = dir;
        this.dashT = PHYS.DASH_TIME; this.dashCd = 0.45; this.atkT = 0;
        if (!this.onGround) this.airDash = false;
      }
    }

    // ---- ataque ----
    if (I.pressed.attack && this.atkCd <= 0 && this.stun <= 0 && this.dashT <= 0) {
      this.atkT = 0.22; this.atkCd = 0.34; this.hitSet.clear();
    }
    if (this.atkT > 0) { this.atkT -= dt; this.doAttack(); }

    for (const gh of this.trail) gh.life -= dt;
    this.trail = this.trail.filter(gh => gh.life > 0);

    moveBody(this, dt);
    if (this.hitWallX && this.dashT > 0) this.dashT = 0;

    if (this.onGround) {
      this.airJumps = 1; this.airDash = true;
      if (!touchingSpikes(this)) this.safe = { x: this.x, y: this.y };
    }
    this.anim += Math.abs(this.vx) * dt;
  }

  doAttack() {
    const box = this.attackBox();
    for (const e of G.enemies) {
      if (e.dead || this.hitSet.has(e) || !overlaps(box, e)) continue;
      this.hitSet.add(e);
      e.hurt(1, this.facing);
    }
    // quebrar caixotes
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
    this.dashT = 0;
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
    this.vx = 0; this.vy = 0; this.stun = 0.2;
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

// ESQUELETO: anda de um lado pro outro e vira nas paredes e bordas
class Walker extends Enemy {
  constructor(x, y) { super(x, y, 14, 24, 3); this.dir = -1; this.color = '#cfc8b0'; }
  update(dt) {
    this.t += dt; this.flash -= dt;
    if (this.kb > 0) { this.kb -= dt; this.vx = approach(this.vx, 0, 400 * dt); }
    else this.vx = this.dir * 26;
    this.vy = Math.min(this.vy + PHYS.GRAVITY * dt, PHYS.MAX_FALL);
    moveBody(this, dt);
    if (this.kb > 0) return;
    if (this.hitWallX) this.dir = -this.dir;
    else if (this.onGround) {
      const ahead = this.dir > 0 ? this.x + this.w + 1 : this.x - 1;
      const below = tileAt(Math.floor(ahead / TILE), Math.floor((this.y + this.h + 1) / TILE));
      if (!isSolid(below) && below !== '=') this.dir = -this.dir;
    }
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
