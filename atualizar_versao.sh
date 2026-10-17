#!/bin/sh
# Marca todos os arquivos com uma versão nova, para o navegador baixar a atualização
# em vez de usar a cópia antiga guardada (cache). Rode antes de cada commit.
V=$(date +%Y%m%d%H%M)
sed -i -E "s#(src=\"js/[a-z]+\.js)(\?v=[0-9]+)?\"#\1?v=$V\"#g; s#(href=\"css/style\.css)(\?v=[0-9]+)?\"#\1?v=$V\"#" index.html
sed -i -E "s#^const ASSET_V = .*#const ASSET_V = '$V';#" js/engine.js
sed -i -E "s#url\(\.\./assets/hero\.png(\?v=[0-9]+)?\)#url(../assets/hero.png?v=$V)#" css/style.css
echo "versão $V"
