# Contos do Abismo

Metroidvania em HTML/JavaScript puro (sem bibliotecas), feito com a ajuda do Claude.
Funciona no navegador do computador e do celular (com controles de toque).

## Personagens

Ao começar um **Novo Jogo**, escolha:

- **O Espadachim** — espada, combo de corte para baixo e para cima, estocada agachado; conquista os poderes pelo caminho
- **Rod** (arte do autor) — socos e chutes que se alternam a cada golpe (o chute empurra), esquiva liberada desde o início; ao vencer Jorge, a Palheta do Pecador aumenta a vida máxima dele

## Como jogar

Abra o `index.html` no navegador — ou, se o GitHub Pages estiver ativado, acesse
**https://rodcampos21.github.io/MetroidVaniaEx/**. No celular, jogue com a tela deitada.

| Ação | Teclado | Celular |
|---|---|---|
| Mover | Setas / WASD | Direcional (esquerda) |
| Pular | Z / Espaço | ▲ |
| Atacar (aperte 2× para o combo: corte para baixo + corte para cima) | X | ⚔ |
| Dash (arrancada no chão) | Shift / V | DASH |
| Rolar (depois de vencer Jorge O Pecador) | C / Shift | ROLAR |
| Agachar (atacar agachado = estocada) | ↓ | direcional pra baixo |
| Escalar (depois de pegar as Garras) | pule na parede e segure a direção · ↑/↓ sobe/desce · pular = salto de parede | igual, com o direcional |
| Descer da plataforma de madeira | ↓ + pular | direcional pra baixo + ▲ |
| Pausar | Esc / P | II |

No computador, as teclas podem ser trocadas em **Teclas** (menu principal) ou em **Remapear teclas** (pausa). Elas ficam salvas no navegador; Esc sempre pausa.

O jogo salva sozinho ao tocar nos **braseiros** (que também recuperam a vida) e ao pegar itens.

No começo de um jogo novo, um **tutorial** ensina os comandos (teclado ou toque, conforme o aparelho). A tela de **Controles** fica no menu principal e na pausa.

## O que já existe

- Pixel art sombria: masmorras de pedra com musgo, tochas, correntes, estandartes, névoa e luz dinâmica
- Herói com o sprite do autor, sem a borda branca: parado, corrida em 6 quadros, pulo, combo de espada (ergue → corta para baixo → corta para cima), agachado, estocada, ferido, rolamento, dash e escalada
- Inimigos: **Lobisomem** (arte do autor) — patrulha, uiva ao ver o herói, avança num dash e ataca com combo de garradas — e Morcego
- 6 salas: Catacumbas Esquecidas, Poço das Correntes, Galeria Submersa, Torre Arruinada, Ponte sobre o Abismo e Torre do Vigia (só com escalada)
- Poderes que abrem caminhos: **Salto Etéreo** (pulo duplo), **Rolamento** (rola sem levar dano — recompensa por derrotar Jorge: a Palheta do Pecador) e **Garras do Vigia** (escalar e saltar de paredes)
- **Chefe: Jorge O Pecador, o Guitarrista Hardcore** (Galeria Submersa), com retrato na apresentação e animação de morte — — guitarrada que esmaga o chão com ondas de choque e riff que dispara notas musicais teleguiadas; fase 2 com metade da vida; ao morrer deixa cair a **Palheta do Pecador**, que libera o Rolamento
- Estacas de ferro · blocos rachados · Fragmento de Vida
- Retrato do herói com barra de vida (arte do autor), minimapa das salas visitadas, salvamento automático

## Trilha sonora

Música original, composta e sintetizada por código (sem samples) em `ferramentas/trilha/compor.py`:

- **Menu** — prelúdio com chuva, piano e violão
- **Exploração — "Contos do Abismo"** — piano em arpejos → tema no violão (cadência andaluza Ré m–Dó–Si♭–Lá) → órgão gótico com baixo galopando → rasgueado com coral
- **Chefe — "Riff do Pecador"** — guitarra distorcida em drop D, órgão, coral e sino de igreja para a luta contra o Jorge

Inspirada no *estilo* de cinco trilhas de metroidvania (nenhuma melodia copiada): Castlevania: Symphony of the Night ("Dracula's Castle"), Hollow Knight ("City of Tears"), Super Metroid ("Brinstar"/"Maridia"), Blasphemous e Dead Cells ("Prisoners' Awakening").
As faixas repetem sem emenda, trocam sozinhas (menu → exploração → chefe) e ficam abafadas na pausa. Volume na tela de Controles; **M** liga/desliga no computador.
Para regerar: `python3 ferramentas/trilha/compor.py` (precisa de Python com numpy/scipy e do ffmpeg).

## Estrutura

```
index.html        página do jogo e controles de toque
css/style.css     visual da página e dos botões
js/rooms.js       MAPA: as salas desenhadas com letras (fácil de editar!)
assets/hero.png   sprite do herói (recortado da folha de sprites)
assets/rod.png    sprites do Rod (js/rod_sprite.js) · assets/hud_panel_rod.png retrato dele
assets/hud_*.png  retrato com moldura e barra de vida
assets/menu_*     arte do menu principal (fundo e faixa de seleção)
assets/werewolf.png  lobisomem (js/werewolf_sprite.js)
assets/guitarist.png, note.png, kerrang.png, boss_*.png  chefe Jorge O Pecador (js/guitarist_sprite.js, js/boss.js)
js/hero.js        posições de cada pose dentro do hero.png
js/themes.js      paleta e clima de cada sala
js/pixel.js       ferramentas de pixel art por código
js/sprites.js     inimigos, itens e objetos de cenário
js/world.js       pintura das salas e do fundo em camadas
js/input.js       teclado e toque
js/engine.js      física, colisão e partículas
js/entities.js    jogador e inimigos
js/tutorial.js    tutorial inicial e tela de controles
js/keybinds.js    tela de remapear teclas (computador)
js/audio.js       música (troca de faixa, loop sem emenda, volume)
assets/musica/    faixas em mp3
ferramentas/trilha/  compositor e sintetizador da trilha (Python)
js/render.js      desenho de tudo na tela
js/main.js        salas, itens, salvamento e loop do jogo
```

### Criando uma sala nova

Em `js/rooms.js`, cada sala é uma lista de linhas de texto. Uma tela tem 20 x 12 blocos,
e a sala é posicionada no mundo com `wx`/`wy` (em telas). Para ligar duas salas, deixe uma
abertura (`.`) nas paredes que se encostam. A legenda das letras está no topo do arquivo.


### Publicando uma atualização

Antes de cada commit, rode `./atualizar_versao.sh`. Ele grava a versão nova em `version.json`; o `index.html` lê esse arquivo (que nunca fica em cache) e carrega todos os scripts com essa versão, então o navegador sempre pega a atualização.
