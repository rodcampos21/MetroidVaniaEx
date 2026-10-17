// =============================================================
//  SPRITE DO HERÓI (assets/hero.png)
//  Recortado da folha de sprites do autor. Cada pose: [x, y, largura, altura, âncoraX, âncoraY]
//  A âncora é o ponto entre os pés (centro do corpo, no chão).
// =============================================================
const HERO_FRAMES = {"idle": [0, 0, 103, 136, 39.0, 136.0], "run": [105, 0, 89, 114, 45.0, 114.0], "jump": [196, 0, 71, 147, 28.0, 147.0], "attack": [269, 0, 126, 103, 43.0, 103.0], "crouch": [397, 0, 83, 105, 45.0, 105.0], "lunge": [482, 0, 98, 91, 56.0, 91.0], "hurt": [582, 0, 77, 108, 36.0, 108.0], "roll": [661, 0, 92, 91, 61.0, 91.0]};
const heroImg = new Image();
heroImg.src = 'assets/hero.png';
