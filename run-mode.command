#!/bin/zsh
set -uo pipefail
source "${0:A:h}/Resources/profile-utils.sh"
load_profile "${1:-}" || exit 2
mode="$1"
log_dir="${HOME}/Library/Logs/区域模式一键切换"
log_file="${log_dir}/最近一次切换.log"
if /bin/mkdir -p "$log_dir" && : > "$log_file"; then exec > >(/usr/bin/tee -a "$log_file") 2>&1; fi
show_result() {
  print -r -- "$2"
  /usr/bin/osascript -l JavaScript -e 'function run(a){var x=Application.currentApplication();x.includeStandardAdditions=true;x.displayDialog(a[1],{withTitle:a[0],buttons:["好"],defaultButton:"好"});}' "$1" "$2" >/dev/null 2>&1
}
typeset -a failures
failures=()
print "Mac Region Switcher · 2026.10.21 · 目标：$mode_name"
read_timezone
read_timezone_auto
typeset -a system_options
system_options=()
if timezone_matches "$actual_timezone" "$actual_offset" && [[ "$actual_timezone_auto" == false ]]; then system_options=(--network-only); fi
if (( ${#system_options} == 0 )) || ! /usr/bin/osascript -l JavaScript "${resources}/ipv6.js" "$tool_dir" check "$mode" >/dev/null 2>&1; then
  if ! response=$(/usr/bin/osascript -l JavaScript "${resources}/set-timezone.js" "$tool_dir" "$config_file" "$mode" "${system_options[@]}" 2>&1); then
    print -u2 -r -- "$response"
    if ! wait_for_timezone || ! /usr/bin/osascript -l JavaScript "${resources}/ipv6.js" "$tool_dir" check "$mode" >/dev/null 2>&1; then
      show_result '系统设置未完成' "目标：$target_timezone $target_offset
实际：$actual_timezone $actual_offset
$response
日志：$log_file"
      exit 1
    fi
  else
    print -r -- "$response"
  fi
fi
if ! response=$(/usr/bin/osascript -l JavaScript "${resources}/ipv6.js" "$tool_dir" check "$mode" 2>&1); then
  show_result 'IPv6 核验失败' "$response
日志：$log_file"
  exit 1
fi
if ! wait_for_timezone; then
  show_result '时区核验失败' "目标：$target_timezone $target_offset
实际：$actual_timezone $actual_offset
日志：$log_file"
  exit 1
fi
for attempt in {1..6}; do
  /bin/sleep 0.5
  read_timezone; read_timezone_auto
  if ! timezone_matches "$actual_timezone" "$actual_offset" || [[ "$actual_timezone_auto" != false ]]; then
    show_result '时区未能保持' "实际：$actual_timezone $actual_offset；自动时区：$actual_timezone_auto"
    exit 1
  fi
done
if ! /usr/bin/osascript -l JavaScript "${resources}/quit-browsers.js" "$managed_applications"; then
  show_result '浏览器退出未完成' '请保存未提交内容并正常退出浏览器后重试。'
  exit 1
fi
if ! "${resources}/switch-profile.sh" "$mode"; then failures+=('语言配置未全部保存'); fi
/usr/bin/osascript -l JavaScript "${resources}/profiles.js" browser "$config_file" "${resources}/verify-profiles.js" || failures+=('离线验证配置生成失败')
if ! "${resources}/current-mode.sh" --check "$mode" >/dev/null; then failures+=('保存配置尚未全部匹配'); fi
if manages chrome; then /usr/bin/open -a 'Google Chrome' "${resources}/verify.html" || failures+=('Chrome 验证页打开失败'); fi
if manages safari; then /usr/bin/open -a Safari "${resources}/verify.html" --args -AppleLanguages "$target_languages_plist" -AppleLocale "$target_locale" || failures+=('Safari 验证页打开失败'); fi
details=$("${resources}/current-mode.sh")
if (( ${#failures} )); then
  show_result '部分完成' "${(F)failures}

$details
日志：$log_file"
  exit 1
fi
show_result '保存配置已匹配' "$details

请核对 Chrome / Safari 的离线验证页。
Terminal 等旧窗口需完全退出并重开才会更新界面语言。"
