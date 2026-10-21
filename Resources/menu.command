#!/bin/zsh
exec /usr/bin/osascript -l JavaScript "${0:A:h}/menu.js" "${0:A:h:h}" "${@}"
