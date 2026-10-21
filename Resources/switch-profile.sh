#!/bin/zsh
set -uo pipefail
source "${0:A:h}/profile-utils.sh"
source "${resources}/chrome-preferences.sh"
load_profile "${1:-}" || exit 2
typeset -a failures
failures=()
apply_config() {
  local label="$1"; shift
  if "$@"; then print -r -- "$label：已保存"; else failures+=("$label"); print -u2 -r -- "$label：失败"; fi
}
wait_for_browser_to_close() {
  local name="$1" attempt result
  for attempt in {1..30}; do
    /usr/bin/pgrep -x "$name" >/dev/null 2>&1; result=$?
    (( result == 1 )) && return 0
    (( result > 1 )) && return 1
    /bin/sleep 0.2
  done
  return 1
}
apply_config '系统地区' /usr/bin/defaults write NSGlobalDomain AppleLocale -string "$target_locale"
apply_config '系统首选语言' /usr/bin/defaults write NSGlobalDomain AppleLanguages -array "${target_languages[@]}"
if manages terminal; then apply_config 'Terminal 保存语言' /usr/bin/defaults write com.apple.Terminal AppleLanguages -array "${target_languages[@]}"; fi
if manages chrome; then
  if wait_for_browser_to_close 'Google Chrome'; then
    apply_config 'Chrome 应用语言' /usr/bin/defaults write com.google.Chrome AppleLanguages -array "${target_languages[@]}"
    apply_config 'Chrome 网页语言' set_chrome_web_languages "${HOME}/Library/Application Support/Google/Chrome/${chrome_profile}/Preferences" "$target_web_languages"
  else
    failures+=('Chrome 尚未安全退出，未修改其配置')
  fi
fi
if manages safari; then
  if wait_for_browser_to_close Safari; then
    apply_config 'Safari 保存语言' /usr/bin/defaults write com.apple.Safari AppleLanguages -array "${target_languages[@]}"
    print 'Safari 将使用目标语言启动。'
  else
    failures+=('Safari 尚未安全退出')
  fi
fi
if [[ "$default_browser_policy" == chrome ]]; then
  apply_config '默认浏览器 Chrome' "${resources}/set-default-browser" --set
fi
if (( ${#failures} )); then print -u2 -r -- "未完成：${(j:；:)failures}"; exit 1; fi
