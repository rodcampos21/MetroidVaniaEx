// =============================================================
//  TEMAS VISUAIS DAS SALAS
//  Estilo: cenário pintado, cores quentes e suaves (inspirado em
//  RPGs online antigos) misturado com anime.
//
//  style: 'grass' (terra com grama), 'stone' (tijolos), 'wood' (madeira)
//  bg:    'campo' (céu, morros, árvores), 'poco' (parede de pedra),
//         'moinho' (campo dourado com moinho)
//  ambient: partículas no ar — 'petal', 'leaf', 'firefly', 'dust'
// =============================================================

const THEMES = {
  campina: {
    style: 'grass', bg: 'campo', ambient: 'petal', fence: true,
    sky: ['#7cc8ff', '#dff4ff'], sun: '#fff6c8',
    hills: ['#a9dca0', '#79c06f', '#5aa957'],
    soil: '#ecbd62', soilDark: '#c98f3c', soilLight: '#f8d98f', outline: '#8a5a2a',
    grass: '#72c44c', grassDark: '#3f8f34', grassLight: '#b2e67e',
    flowers: ['#ffffff', '#ff9ac0', '#ffe066'],
    map: '#72c44c',
  },
  poco: {
    style: 'stone', bg: 'poco', ambient: 'dust',
    sky: ['#2c4257', '#16222f'], sun: '#bfe8ff',
    hills: ['#3a5268', '#2f4458', '#22323f'],
    soil: '#9aa3b3', soilDark: '#646d7e', soilLight: '#c4cad8', outline: '#3c4352',
    grass: '#6fae6a', grassDark: '#3f7444', grassLight: '#9fd69a',
    flowers: ['#bfe8ff', '#d9c2ff', '#ffffff'],
    map: '#7fb6d6',
  },
  bosque: {
    style: 'grass', bg: 'campo', ambient: 'firefly', mushrooms: true,
    sky: ['#3e3b72', '#a77aa8'], sun: '#ffd0f0',
    hills: ['#5b5a8c', '#3d5a68', '#2c4a4a'],
    soil: '#94704f', soilDark: '#664a36', soilLight: '#b38f6c', outline: '#3e2a1e',
    grass: '#4fa86c', grassDark: '#2c6e48', grassLight: '#86d6a0',
    flowers: ['#d6b8ff', '#9fe8ff', '#ffffff'],
    map: '#a786d6',
  },
  moinho: {
    style: 'wood', bg: 'moinho', ambient: 'leaf',
    sky: ['#ffbe7a', '#fff0d2'], sun: '#fffbe0',
    hills: ['#efcb8a', '#d6a865', '#b9874e'],
    soil: '#c08552', soilDark: '#87562f', soilLight: '#dfa775', outline: '#5a3518',
    grass: '#94c94e', grassDark: '#5a8f2e', grassLight: '#c4ea84',
    flowers: ['#ffe066', '#ffffff', '#ff8a5c'],
    map: '#e6a35c',
  },
  ponte: {
    style: 'grass', bg: 'campo', ambient: 'petal', fence: true,
    sky: ['#ff8f8f', '#ffd9a8'], sun: '#fff2c0',
    hills: ['#e09aa8', '#b8708c', '#8c5272'],
    soil: '#dca06c', soilDark: '#a96c44', soilLight: '#f2c592', outline: '#6a3a22',
    grass: '#7fc46a', grassDark: '#4a8a44', grassLight: '#b8e69a',
    flowers: ['#ffffff', '#ffb0d0', '#ffe066'],
    map: '#ff9a9a',
  },
};
