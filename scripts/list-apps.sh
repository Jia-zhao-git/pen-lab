#!/bin/sh
# 批量列出词典笔所有预设 miniapp 的 appid → 应用名
for f in /etc/miniapp/resources/presetpkgs/*.amr /oem/secondary/etc/miniapp/resources/presetpkgs/*.amr; do
  id=$(basename "$f" .amr)
  name=$(unzip -p "$f" manifest.json 2>/dev/null | grep -o 'appName[^,}]*' | head -1 | sed 's/appName[^:]*:[[:space:]]*"//; s/"//g')
  echo "$id  $name"
done
