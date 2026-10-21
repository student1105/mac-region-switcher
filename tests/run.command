#!/bin/zsh
set -euo pipefail
root="${0:A:h:h}"
for file in "${root}"/*.command "${root}"/Resources/*.sh "${root}"/Resources/*.command "${root}"/scripts/*.command "${root}"/templates/launcher; do /bin/zsh -n "$file"; done
/usr/bin/osascript -l JavaScript "${root}/tests/unit.js" "$root"
/usr/bin/osascript -l JavaScript "${root}/Resources/profiles.js" validate "${root}/profiles.json"
if [[ "${1:-}" == '--inspect-local' ]]; then
  /usr/bin/osascript -l JavaScript "${root}/Resources/ipv6.js" "$root" status
  /usr/bin/osascript -l JavaScript "${root}/Resources/configuration.js" "$root" summary
fi
for id in chinese taipei; do
  /usr/bin/osascript -l JavaScript "${root}/Resources/set-timezone.js" "$root" "${root}/profiles.json" "$id" --print-command | /bin/sh -n
  /usr/bin/osascript -l JavaScript "${root}/Resources/set-timezone.js" "$root" "${root}/profiles.json" "$id" --network-only --print-command | /bin/sh -n
done
/usr/bin/osascript -l JavaScript "${root}/Resources/authorization.js" print-enable-command | /bin/sh -n
/usr/bin/osascript -l JavaScript "${root}/Resources/authorization.js" print-test-command | /bin/sh -n
/bin/zsh -c 'source "$1"; load_profile taipei; [[ "$target_timezone" == Asia/Taipei && "$target_locale" == zh-Hant_TW && "$target_language" == zh-Hant-TW && "$target_web_languages" == zh-TW,zh,en ]] || exit 1; [[ ${#target_languages} == 3 ]] || exit 1; print "配置到 shell 参数映射通过"' test "${root}/Resources/profile-utils.sh"
print '全部静态与无系统写入检查通过。'
