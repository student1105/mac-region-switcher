#!/bin/zsh
set -uo pipefail
source "${0:A:h}/profile-utils.sh"
first_language() {
  /usr/bin/defaults read "$1" AppleLanguages 2>/dev/null | /usr/bin/sed -n '2p' | /usr/bin/tr -d ' ",'
}
region_locale=$(/usr/bin/defaults read NSGlobalDomain AppleLocale 2>/dev/null) || region_locale='未知'
global_first=$(first_language NSGlobalDomain) || global_first=''
chrome_first=$(first_language com.google.Chrome) || chrome_first=''
terminal_first=$(first_language com.apple.Terminal) || terminal_first=''
safari_first=$(first_language com.apple.Safari) || safari_first=''
[[ -n "$safari_first" ]] || safari_first="$global_first"
read_timezone
read_timezone_auto
default_browser=$("${resources}/set-default-browser" --check 2>/dev/null) || default_browser="${default_browser:-未知或无权读取}"
ids=$(list_profiles) || exit 1
matched_mode=''
matched_name=''
for candidate in ${(f)ids}; do
  load_profile "$candidate" || exit 1
  chrome_file="${HOME}/Library/Application Support/Google/Chrome/${chrome_profile}/Preferences"
  web_languages=$(/usr/bin/plutil -extract intl.accept_languages raw "$chrome_file" 2>/dev/null) || web_languages='未知'
  selected_languages=$(/usr/bin/plutil -extract intl.selected_languages raw "$chrome_file" 2>/dev/null) || selected_languages='未知'
  timezone_matches "$actual_timezone" "$actual_offset" || continue
  [[ "$region_locale" == "$target_locale" && "$global_first" == "$target_language" && "$actual_timezone_auto" == false ]] || continue
  if manages chrome; then
    [[ "$chrome_first" == "$target_language" && "$web_languages" == "$target_web_languages" && "$selected_languages" == "$target_web_languages" ]] || continue
  fi
  if manages safari; then [[ "$safari_first" == "$target_language" ]] || continue; fi
  if manages terminal; then [[ "$terminal_first" == "$target_language" ]] || continue; fi
  [[ "$default_browser_policy" == keep || "$default_browser" == Chrome ]] || continue
  /usr/bin/osascript -l JavaScript "${resources}/ipv6.js" "$tool_dir" check "$candidate" >/dev/null 2>&1 || continue
  matched_mode="$candidate"
  matched_name="$mode_name"
  break
done
printf '当前配置：%s\n系统地区：%s\n系统时区：%s（%s）\n系统首选语言：%s\n自动时区：%s\n' "${matched_name:-混合／未完成}" "$region_locale" "$actual_timezone" "$actual_offset" "${global_first:-未知}" "$actual_timezone_auto"
printf 'Chrome 应用语言：%s\nSafari 保存语言：%s\nTerminal 保存语言：%s\nChrome 网页语言：%s\n默认浏览器：%s\n' "${chrome_first:-未设置}" "${safari_first:-未设置}" "${terminal_first:-未设置}" "$web_languages" "$default_browser"
/usr/bin/osascript -l JavaScript "${resources}/authorization.js" status
/usr/bin/osascript -l JavaScript "${resources}/ipv6.js" "$tool_dir" status || print 'IPv6：无法读取，请检查网络服务名称'
print '已运行的应用可能仍缓存旧语言；实际 Intl 和网页时区请看浏览器离线验证页。'
if [[ "${1:-}" == '--check' ]]; then
  [[ -n "$matched_mode" && "$matched_mode" == "${2:-$matched_mode}" ]] || exit 1
fi
