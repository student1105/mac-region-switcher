#!/bin/zsh
set -uo pipefail
resources="${0:A:h}"
print '启用 macOS sudo 的 Touch ID；本工具和终端 sudo 都会受影响，密码授权保留。'
print '只在本机终端输入管理员密码；不会保存密码。'
if /usr/bin/grep -Eq '^[[:space:]]*auth[[:space:]]+sufficient[[:space:]]+pam_tid[.]so([[:space:]]*(#.*)?)?$' /etc/pam.d/sudo_local 2>/dev/null; then
  print '已经启用。'
elif [[ -e /etc/pam.d/sudo_local ]]; then
  print -u2 '已有 sudo_local 配置，请管理员自行合并 auth sufficient pam_tid.so。本脚本未修改文件。'
else
  command_text=$(/usr/bin/osascript -l JavaScript "${resources}/authorization.js" print-enable-command) || exit 1
  /usr/bin/sudo /bin/sh -c "$command_text" || {
    print -u2 '设置未完成。'
    read -r '?按回车关闭…'
    exit 1
  }
  print '已启用。请打开“检测TouchID授权.app”并触摸传感器。'
fi
read -r '?按回车关闭…'
