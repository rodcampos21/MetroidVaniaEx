// =============================================================
//  PIXEL ART POR CÓDIGO
//  Um "PixBuf" é uma imagem onde desenhamos pixel por pixel.
//  1 pixel de arte = 1/4 de unidade do jogo (mesma densidade do herói).
// =============================================================

const AP = 4; // pixels de arte por unidade do jogo

// cor '#rrggbb' -> inteiro (formato RGBA na memória)
const colCache = {};
function C(hex, a = 255) {
  const k = hex + a;
  if (colCache[k] !== undefined) return colCache[k];
  const n = parseInt(hex.slice(1, 7), 16);
  return (colCache[k] = ((a << 24) | ((n & 255) << 16) | (n & 0xff00) | (n >> 16)) >>> 0);
}
function mix(h1, h2, t) {
  const a = parseInt(h1.slice(1), 16), b = parseInt(h2.slice(1), 16);
  const f = s => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t);
  return '#' + [16, 8, 0].map(s => f(s).toString(16).padStart(2, '0')).join('');
}

// números pseudo-aleatórios fixos (o mesmo lugar sempre gera o mesmo desenho)
function hash(x, y, s = 0) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function noise(x, y, s = 0) {          // ruído suave
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
// padrão de pontilhado (dithering) clássico 4x4
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
const dither = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];

class PixBuf {
  constructor(w, h) { this.w = w | 0; this.h = h | 0; this.d = new Uint32Array(this.w * this.h); }
  set(x, y, c) { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y * this.w + x] = c; }
  get(x, y) { x |= 0; y |= 0; return (x >= 0 && y >= 0 && x < this.w && y < this.h) ? this.d[y * this.w + x] : 0; }
  rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c); }
  ellipse(cx, cy, rx, ry, c) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.set(x, y, c);
      }
  }
  line(x0, y0, x1, y1, c, t = 1) {   // linha com espessura t
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1) * 2;
    for (let i = 0; i <= n; i++) {
      const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n;
      if (t <= 1) this.set(Math.round(x), Math.round(y), c);
      else this.ellipse(x, y, t / 2, t / 2, c);
    }
  }
  poly(pts, c) {                      // polígono preenchido
    let y0 = Infinity, y1 = -Infinity;
    for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
      const xs = [], yy = y + 0.5;
      for (let i = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
        if ((ay <= yy && by > yy) || (by <= yy && ay > yy)) xs.push(ax + (yy - ay) / (by - ay) * (bx - ax));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2)
        for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) this.set(x, y, c);
    }
  }
  blit(src, ox, oy, flip = false) {
    for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
      const c = src.d[y * src.w + (flip ? src.w - 1 - x : x)];
      if (c >>> 24) this.set(ox + x, oy + y, c);
    }
  }
  // contorno: escuro colado no desenho e (opcional) claro por fora — igual ao herói
  outline(dark, light) {
    const add = (col) => {
      const src = this.d.slice(), w = this.w, h = this.h;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (src[y * w + x] >>> 24) continue;
        if ((x > 0 && src[y * w + x - 1] >>> 24) || (x < w - 1 && src[y * w + x + 1] >>> 24) ||
            (y > 0 && src[(y - 1) * w + x] >>> 24) || (y < h - 1 && src[(y + 1) * w + x] >>> 24))
          this.d[y * w + x] = col;
      }
    };
    if (dark) add(dark);
    if (light) add(light);
    return this;
  }
  // sombreamento: escurece pixels de baixo/direita, clareia em cima/esquerda
  shade(amount = 0.25) {
    const src = this.d.slice(), w = this.w;
    for (let y = 1; y < this.h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const c = src[y * w + x]; if (!(c >>> 24)) continue;
      const up = src[(y - 2 < 0 ? 0 : y - 2) * w + x] >>> 24, dn = src[(y + 2) * w + x] >>> 24;
      let k = 1;
      if (!up) k = 1 + amount; else if (!dn || !(src[y * w + x + 2] >>> 24)) k = 1 - amount;
      if (k !== 1) this.d[y * w + x] = scaleCol(c, k);
    }
    return this;
  }
  canvas() {
    const cv = document.createElement('canvas'); cv.width = this.w; cv.height = this.h;
    cv.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(this.d.buffer), this.w, this.h), 0, 0);
    return cv;
  }
}
function scaleCol(c, k) {
  const r = Math.min(255, (c & 255) * k), g = Math.min(255, ((c >>> 8) & 255) * k), b = Math.min(255, ((c >>> 16) & 255) * k);
  return ((c & 0xff000000) | (b << 16) | (g << 8) | r) >>> 0;
}
function makeSprite(w, h, draw, { dark = '#0e0b0b', light = '#bdbab2', shade = 0 } = {}) {
  const b = new PixBuf(w, h);
  draw(b);
  if (shade) b.shade(shade);
  b.outline(dark && C(dark), light && C(light, 230));
  return b;
}
