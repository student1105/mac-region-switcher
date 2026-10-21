#!/bin/zsh
set -euo pipefail
project="${0:A:h:h}"
source_dir="${1:-${project}/build/区域模式一键切换}"
destination="${2:-${HOME}/Applications/区域模式一键切换}"
[[ -x "${source_dir}/Resources/set-default-browser" && -d "${source_dir}/区域模式一键切换.app" ]] || { print -u2 '请先构建。'; exit 1; }
/usr/bin/osascript -l JavaScript "${source_dir}/Resources/profiles.js" validate "${source_dir}/profiles.json"
saved=''
if [[ -f "${destination}/profiles.json" ]]; then
  /usr/bin/osascript -l JavaScript "${source_dir}/Resources/profiles.js" validate "${destination}/profiles.json"
  saved=$(/usr/bin/mktemp /private/tmp/mac-region-existing-config.XXXXXX)
  /bin/cp -X "${destination}/profiles.json" "$saved"
fi
/bin/mkdir -p "$destination"
/bin/cp -R -X "${source_dir}/." "$destination/"
if [[ -n "$saved" ]]; then /bin/cp -X "$saved" "${destination}/profiles.json"; fi
/usr/bin/osascript -l JavaScript "${destination}/Resources/profiles.js" validate "${destination}/profiles.json"
/usr/bin/osascript -l JavaScript "${destination}/Resources/profiles.js" browser "${destination}/profiles.json" "${destination}/Resources/verify-profiles.js"
print -r -- "已安装：$destination"
print '安装不会自动切换地区、修改 Touch ID 设置或关闭浏览器。'
