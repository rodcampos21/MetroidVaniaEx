# MetroidVania EX — As Catacumbas Esquecidas

Metroidvania em HTML/JavaScript puro (sem bibliotecas), feito com a ajuda do Claude.
Funciona no navegador do computador e do celular (com controles de toque).

## Como jogar

Abra o `index.html` no navegador — ou, se o GitHub Pages estiver ativado, acesse
**https://rodcampos21.github.io/MetroidVaniaEx/**. No celular, jogue com a tela deitada.

| Ação | Teclado | Celular |
|---|---|---|
| Mover | Setas / WASD | Direcional (esquerda) |
| Pular | Z / Espaço | ▲ |
| Atacar | X | ⚔ |
| Rolar (depois de pegar) | C / Shift | ROLAR |
| Agachar | ↓ | direcional pra baixo |
| Descer da plataforma de madeira | ↓ + pular | direcional pra baixo + ▲ |
| Pausar | Esc / P | II |

O jogo salva sozinho ao tocar nos **braseiros** (que também recuperam a vida) e ao pegar itens.

## O que já existe

- Pixel art sombria: masmorras de pedra com musgo, tochas, correntes, estandartes, névoa e luz dinâmica
- Herói com o sprite do autor (parado, correndo, pulando, atacando, agachado, golpe agachado, ferido e rolando)
- Inimigos: Esqueleto com espada e escudo, Morcego
- 5 salas: Catacumbas Esquecidas, Poço das Correntes, Galeria Submersa, Torre Arruinada e Ponte sobre o Abismo
- Poderes que abrem caminhos: **Salto Etéreo** (pulo duplo) e **Rolamento** (rola sem levar dano)
- Estacas de ferro · blocos rachados · Fragmento de Vida
- Minimapa das salas visitadas, vida em corações, salvamento automático

## Estrutura

```
index.html        página do jogo e controles de toque
css/style.css     visual da página e dos botões
js/rooms.js       MAPA: as salas desenhadas com letras (fácil de editar!)
assets/hero.png   sprite do herói (recortado da folha de sprites)
js/hero.js        posições de cada pose dentro do hero.png
js/themes.js      paleta e clima de cada sala
js/pixel.js       ferramentas de pixel art por código
js/sprites.js     inimigos, itens e objetos de cenário
js/world.js       pintura das salas e do fundo em camadas
js/input.js       teclado e toque
js/engine.js      física, colisão e partículas
js/entities.js    jogador e inimigos
js/render.js      desenho de tudo na tela
js/main.js        salas, itens, salvamento e loop do jogo
```

### Criando uma sala nova

Em `js/rooms.js`, cada sala é uma lista de linhas de texto. Uma tela tem 20 x 12 blocos,
e a sala é posicionada no mundo com `wx`/`wy` (em telas). Para ligar duas salas, deixe uma
abertura (`.`) nas paredes que se encostam. A legenda das letras está no topo do arquivo.
