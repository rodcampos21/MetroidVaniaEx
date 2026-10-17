// =============================================================
//  TEMAS DAS SALAS — paleta de cada área (pixel art sombria)
//  stone: [rejunte, escuro, base, claro, brilho]
//  moss:  [escuro, base, claro]
//  sky:   cores do fundo (alto, baixo) — far/mid: silhuetas da caverna
//  light: escuridão do ambiente (0 = claro, 1 = breu)
// =============================================================

const THEMES = {
  catacumbas: {
    stone: ['#0f1716', '#1d2a28', '#2a3a37', '#3b4f4a', '#55706a'],
    moss: ['#2c4220', '#45642c', '#6a8f3c'],
    sky: ['#0d1a1e', '#1d3236'], far: '#152529', mid: '#1b2e31', rim: '#3f6a6a', fog: '#2c4a4b',
    light: 0.42, torches: 0.5, banners: '#5a1a1a', map: '#3f6a6a',
  },
  correntes: {
    stone: ['#0c1218', '#1a2430', '#26333f', '#364756', '#4d6274'],
    moss: ['#22382a', '#38563c', '#557a50'],
    sky: ['#0a1219', '#152634'], far: '#101d28', mid: '#16273a', rim: '#3e5f7a', fog: '#24384a',
    light: 0.48, torches: 0.3, chains: true, map: '#4d7aa0',
  },
  submersa: {
    stone: ['#0c1510', '#18261c', '#233628', '#324a36', '#4a6a4a'],
    moss: ['#2f4a1c', '#4c7026', '#76a03a'],
    sky: ['#0a1612', '#163028'], far: '#11231c', mid: '#182f25', rim: '#4a8a6a', fog: '#2a4a3a',
    light: 0.46, torches: 0.25, roots: true, map: '#4a8a5a',
  },
  torre: {
    stone: ['#16100e', '#2a1f1a', '#3a2c24', '#4f3d31', '#6d5544'],
    moss: ['#3a4020', '#566030', '#7a8440'],
    sky: ['#120c10', '#2a1c22'], far: '#1c1418', mid: '#251a1e', rim: '#8a5a4a', fog: '#3a2a2a',
    light: 0.4, torches: 0.6, banners: '#3a1a40', windows: true, map: '#a06a4a',
  },
  abismo: {
    stone: ['#120e10', '#241c1e', '#33282a', '#463839', '#5e4c4a'],
    moss: ['#33381e', '#4c522a', '#6c7438'],
    sky: ['#160a0c', '#3a1814'], far: '#200f10', mid: '#2a1414', rim: '#c0502a', fog: '#4a2018',
    light: 0.36, torches: 0.35, embers: true, map: '#c0502a',
  },
};
