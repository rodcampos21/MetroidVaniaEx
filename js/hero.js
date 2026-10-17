// =============================================================
//  SPRITE DO HERÓI (assets/hero.png)
//  Recortado da folha de sprites do autor (sem a borda branca) e
//  completado com quadros montados a partir das poses originais.
//  Cada pose: [x, y, largura, altura, âncoraX, âncoraY] — âncora = entre os pés.
//  Escalada (wall0/wall1): âncoraX = lado que encosta na parede, âncoraY = meio.
// =============================================================
const HERO_FRAMES = {"idle": [0, 0, 103, 136, 38.0, 135.0], "run0": [105, 0, 87, 116, 44.0, 116.0], "run1": [194, 0, 87, 120, 44.0, 120.0], "run2": [283, 0, 87, 121, 44.0, 121.0], "run3": [372, 0, 87, 117, 45.0, 117.0], "run4": [461, 0, 87, 122, 44.0, 122.0], "run5": [550, 0, 87, 120, 44.0, 120.0], "jump": [639, 0, 71, 147, 29.0, 146.0], "atk_raise": [712, 0, 69, 142, 28.0, 142.0], "attack": [783, 0, 126, 103, 43.0, 102.0], "crouch": [911, 0, 83, 105, 44.0, 104.0], "lunge": [996, 0, 98, 91, 55.0, 90.0], "hurt": [1096, 0, 77, 108, 35.0, 108.0], "roll": [1175, 0, 92, 91, 61.0, 90.0], "dash": [1269, 0, 98, 111, 57.0, 111.0], "wall0": [1369, 0, 59, 104, 0.0, 52.0], "wall1": [1430, 0, 59, 107, 0.0, 53.5]};
const RUN_FRAMES = 6;  // ciclo de corrida: run0..run5
const heroImg = new Image();
heroImg.src = 'assets/hero.png';
