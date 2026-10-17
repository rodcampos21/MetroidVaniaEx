# MetroidVania EX — A Jornada de Mia

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
| Dash (depois de pegar) | C / Shift | DASH |
| Descer da plataforma de madeira | ↓ + pular | direcional pra baixo + ▲ |
| Pausar | Esc / P | II |

O jogo salva sozinho ao tocar nas **lanternas** (que também recuperam a vida) e ao pegar itens.

## O que já existe

- Visual pintado e fofo (estilo RPG online antigo + anime), todo desenhado por código
- Mia, a heroína garota-gato, e os inimigos Cogumelinho e Plumito
- 5 salas conectadas: Campina do Vilarejo, Poço dos Desejos, Bosque Sussurrante, Moinho dos Ventos e Ponte do Pôr do Sol
- Poderes que abrem caminhos: **Pulo Duplo** (para subir o Poço) e **Impulso/Dash** (para atravessar a ponte)
- Espinhos · caixotes quebráveis · coração extra
- Minimapa das salas visitadas, vida em corações, salvamento automático

## Estrutura

```
index.html        página do jogo e controles de toque
css/style.css     visual da página e dos botões
js/rooms.js       MAPA: as salas desenhadas com letras (fácil de editar!)
js/themes.js      cores e clima de cada sala
js/art.js         desenho da Mia, inimigos, itens e objetos de cenário
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
