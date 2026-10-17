// =============================================================
//  O GUITARRISTA HARDCORE (chefe) — sprites recortados das folhas do autor
//  assets/guitarist.png: walk0..11 (caminhada), riff0..7 (riff), smash0..5 (guitarrada)
//  assets/note.png:      note0 (surgindo), note1..4 (voando), note5..6 (sumindo)
//  Cada quadro: [x, y, largura, altura, âncoraX, âncoraY]
//  Guitarrista: âncora = entre os pés. Nota: âncora = centro.
// =============================================================
const BOSS_FRAMES = {"walk0": [0, 0, 167, 191, 69.5, 190.0], "walk1": [169, 0, 162, 190, 63.3, 189.6], "walk2": [333, 0, 161, 191, 68.4, 190.0], "walk3": [496, 0, 160, 190, 65.8, 189.2], "walk4": [658, 0, 161, 190, 63.5, 189.6], "walk5": [821, 0, 161, 190, 71.9, 189.6], "walk6": [984, 0, 157, 190, 63.1, 188.4], "walk7": [1143, 0, 156, 189, 60.9, 188.4], "walk8": [1301, 0, 156, 189, 60.9, 188.4], "walk9": [1459, 0, 157, 190, 60.5, 188.4], "walk10": [1618, 0, 156, 190, 61.9, 188.4], "walk11": [1776, 0, 157, 189, 62.3, 188.4], "riff0": [1935, 0, 160, 191, 69.1, 190.4], "riff1": [2097, 0, 139, 188, 69.5, 186.9], "riff2": [2238, 0, 215, 176, 136.5, 175.1], "riff3": [2455, 0, 295, 193, 129.7, 192.7], "riff4": [2752, 0, 183, 199, 65.2, 198.6], "riff5": [2937, 0, 156, 189, 60.1, 188.4], "riff6": [3095, 0, 185, 189, 72.3, 188.4], "riff7": [3282, 0, 263, 160, 154.0, 159.8], "smash0": [3547, 0, 150, 182, 86.4, 181.4], "smash1": [3699, 0, 203, 190, 110.9, 189.2], "smash2": [3904, 0, 334, 178, 132.3, 176.7], "smash3": [4240, 0, 304, 196, 118.1, 195.5], "smash4": [4546, 0, 255, 190, 131.6, 188.8], "smash5": [4803, 0, 185, 190, 72.7, 188.8]};
const NOTE_FRAMES = {"note0": [0, 0, 46, 50, 23.0, 25.0], "note1": [48, 0, 73, 43, 36.5, 21.5], "note2": [123, 0, 83, 45, 41.5, 22.5], "note3": [208, 0, 82, 52, 41.0, 26.0], "note4": [292, 0, 101, 53, 50.5, 26.5], "note5": [395, 0, 98, 34, 49.0, 17.0], "note6": [495, 0, 71, 32, 35.5, 16.0]};
const KERRANG_POS = [267.6, 41.7];   // centro do balão, relativo ao canto do quadro smash2
const kerrangImg = new Image(); kerrangImg.src = 'assets/kerrang.png?v=' + ASSET_V;
const bossImg = new Image(); bossImg.src = 'assets/guitarist.png?v=' + ASSET_V;
const noteImg = new Image(); noteImg.src = 'assets/note.png?v=' + ASSET_V;
