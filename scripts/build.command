#!/bin/zsh
set -euo pipefail
project="${0:A:h:h}"
destination="${1:-${project}/build/区域模式一键切换}"
[[ ! -e "$destination" ]] || { print -u2 '构建目标已存在，请选择新的空目标目录。'; exit 1; }
/usr/bin/osascript -l JavaScript "${project}/Resources/profiles.js" validate "${project}/profiles.json"
/bin/mkdir -p "${destination}/Resources"
/bin/cp -R -X "${project}/Resources/." "${destination}/Resources/"
/bin/cp -X "${project}/profiles.json" "${project}/run-mode.command" "${project}/查看当前模式.command" "$destination/"
/bin/cp -X "${project}/README.md" "$destination/README.md"
cache=$(/usr/bin/mktemp -d /private/tmp/mac-region-swift-cache.XXXXXX)
target_arch=$(/usr/bin/uname -m)
CLANG_MODULE_CACHE_PATH="$cache" /usr/bin/xcrun swiftc -target "${target_arch}-apple-macosx14.0" -module-cache-path "$cache" "${project}/Resources/DefaultBrowser.swift" -o "${destination}/Resources/set-default-browser"
/usr/bin/osascript -l JavaScript "${project}/Resources/profiles.js" browser "${destination}/profiles.json" "${destination}/Resources/verify-profiles.js"
typeset -a names keys
names=('区域模式一键切换' '查看当前模式' '启用TouchID' '检测TouchID授权')
keys=(menu status enabletouch testtouch)
for i in {1..${#names}}; do
  app="${destination}/${names[i]}.app"
  /bin/mkdir -p "${app}/Contents/MacOS"
  /bin/cp -X "${project}/templates/Info.plist" "${app}/Contents/Info.plist"
  /bin/cp -X "${project}/templates/launcher" "${app}/Contents/MacOS/launcher"
  /usr/libexec/PlistBuddy -c "Set :CFBundleDisplayName ${names[i]}" "${app}/Contents/Info.plist"
  /usr/libexec/PlistBuddy -c "Set :CFBundleName ${names[i]}" "${app}/Contents/Info.plist"
  /usr/libexec/PlistBuddy -c "Set :CFBundleIdentifier org.macregionswitcher.${keys[i]}" "${app}/Contents/Info.plist"
  /bin/chmod 755 "${app}/Contents/MacOS/launcher"
  /usr/bin/xattr -cr "$app"
  /usr/bin/codesign --force --sign - "$app"
done
/bin/chmod 755 "${destination}"/*.command "${destination}/Resources"/*.sh "${destination}/Resources"/*.command
print -r -- "构建完成：$destination"
