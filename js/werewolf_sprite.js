// =============================================================
//  SPRITE DO LOBISOMEM (assets/werewolf.png)
//  12 quadros de caminhada recortados da folha do autor (fundo verde removido).
//  Cada quadro: [x, y, largura, altura, âncoraX, âncoraY, olhoX, olhoY]
//  âncora = centro do corpo no chão; olho = brilho dos olhos (usado no alerta).
//  As outras ações (alerta, preparo, garrada, dash, dano, morte) usam estes
//  quadros com inclinação, tremor e efeitos desenhados pelo jogo.
// =============================================================
const WOLF_FRAMES = [[0, 0, 120, 136, 66.0, 136.0, 96.0, 27.2], [122, 0, 120, 136, 66.0, 136.0, 96.0, 27.2], [244, 0, 125, 137, 66.0, 137.0, 100.0, 27.4], [371, 0, 116, 137, 64.5, 137.0, 92.8, 27.4], [489, 0, 117, 136, 65.0, 136.0, 101.0, 24.0], [608, 0, 120, 137, 66.0, 137.0, 96.0, 27.4], [730, 0, 113, 139, 61.0, 139.0, 90.4, 27.8], [845, 0, 117, 138, 66.0, 138.0, 93.6, 27.6], [964, 0, 115, 138, 64.0, 138.0, 92.0, 27.6], [1081, 0, 111, 140, 58.0, 140.0, 95.0, 24.0], [1194, 0, 96, 140, 44.0, 140.0, 76.8, 28.0], [1292, 0, 110, 139, 56.0, 139.0, 92.5, 23.0]];
const wolfImg = new Image();
wolfImg.src = 'assets/werewolf.png?v=' + ASSET_V;
