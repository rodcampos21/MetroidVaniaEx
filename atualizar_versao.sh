#!/bin/sh
# Marca uma versão nova. O index.html lê o version.json (que nunca fica em cache)
# e carrega todos os arquivos com essa versão — então o navegador sempre pega a atualização.
# Rode antes de cada commit.
V=$(date +%Y%m%d%H%M%S)
echo "{\"v\": \"$V\"}" > version.json
sed -i -E "s#^const ASSET_V = .*#const ASSET_V = '$V';#" js/engine.js
sed -i -E "s#url\(\.\./assets/([a-z_]+)\.(png|jpg)(\?v=[0-9]+)?\)#url(../assets/\1.\2?v=$V)#g" css/style.css
echo "versão $V"
