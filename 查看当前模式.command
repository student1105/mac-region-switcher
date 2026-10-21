#!/bin/zsh
set -uo pipefail
root="${0:A:h}"
details=$("${root}/Resources/current-mode.sh") || exit 1
print -r -- "$details"
/usr/bin/osascript -l JavaScript -e 'function run(a){var x=Application.currentApplication();x.includeStandardAdditions=true;x.displayDialog(a[0],{withTitle:"区域模式一键切换",buttons:["好"],defaultButton:"好"});}' "$details"
