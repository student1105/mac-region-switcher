#!/bin/zsh
# This function edits only the two language keys; callers must close Chrome first.
set_chrome_web_languages() {
  local preferences="$1" languages="$2" temporary fingerprint current_fingerprint
  if [[ ! -f "$preferences" || ! -r "$preferences" || ! -w "$preferences" || -L "$preferences" ]]; then
    print -u2 'Chrome Preferences 不存在、不可读写或为符号链接；未修改该文件。'
    return 1
  fi
  fingerprint=$(/usr/bin/shasum -a 256 "$preferences") || return 1
  temporary=$(/usr/bin/mktemp "${preferences:h}/.locale-switcher.XXXXXX") || return 1
  if ! /bin/cp -p "$preferences" "$temporary"; then
    /bin/rm -f "$temporary"
    return 1
  fi
  if ! /usr/bin/plutil -extract intl json -o /dev/null "$temporary" 2>/dev/null; then
    if ! /usr/bin/plutil -insert intl -json '{}' "$temporary"; then
      /bin/rm -f "$temporary"
      return 1
    fi
  fi
  if ! /usr/bin/plutil -replace intl.accept_languages -string "$languages" "$temporary" ||
     ! /usr/bin/plutil -replace intl.selected_languages -string "$languages" "$temporary" ||
     ! /usr/bin/plutil -convert json "$temporary" ||
     ! /usr/bin/plutil -convert xml1 -o /dev/null "$temporary" ||
     [[ "$(/usr/bin/plutil -extract intl.accept_languages raw "$temporary" 2>/dev/null)" != "$languages" ]] ||
     [[ "$(/usr/bin/plutil -extract intl.selected_languages raw "$temporary" 2>/dev/null)" != "$languages" ]]; then
    print -u2 'Chrome 语言配置验证失败；原文件保持不变。'
    /bin/rm -f "$temporary"
    return 1
  fi
  current_fingerprint=$(/usr/bin/shasum -a 256 "$preferences") || current_fingerprint=''
  if [[ "$current_fingerprint" != "$fingerprint" ]]; then
    print -u2 'Chrome Preferences 在操作期间发生变化；为保护原数据停止写入。'
    /bin/rm -f "$temporary"
    return 1
  fi
  if ! /bin/mv -f "$temporary" "$preferences"; then
    /bin/rm -f "$temporary"
    return 1
  fi
}
