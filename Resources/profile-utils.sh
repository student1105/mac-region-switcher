#!/bin/zsh
resources="${0:A:h}"
[[ "${resources:t}" == 'Resources' ]] || resources="${resources}/Resources"
tool_dir="${resources:h}"
config_file="${REGION_SWITCHER_CONFIG:-${tool_dir}/profiles.json}"
load_profile() {
  local values
  values=$(/usr/bin/osascript -l JavaScript "${resources}/profiles.js" get "$config_file" "${1:-}") || return 2
  local -a fields
  fields=("${(@f)values}")
  (( ${#fields} == 9 )) || return 2
  mode_name="$fields[1]"
  target_timezone="$fields[2]"
  target_locale="$fields[3]"
  target_languages=("${(@s:,:)fields[4]}")
  target_language="$target_languages[1]"
  target_languages_plist="(\"${(j:\",\":)target_languages}\")"
  target_web_languages="$fields[5]"
  chrome_profile="$fields[6]"
  default_browser_policy="$fields[7]"
  managed_applications="$fields[8]"
  authorization_policy="$fields[9]"
  target_offset=$(/usr/bin/env TZ="$target_timezone" /bin/date '+%z')
}
list_profiles() { /usr/bin/osascript -l JavaScript "${resources}/profiles.js" list "$config_file"; }
manages() { [[ ",$managed_applications," == *",$1,"* ]]; }
timezone_matches() { [[ "$1" == "$target_timezone" && "$2" == "$target_offset" ]]; }
read_timezone() {
  local timezone_link
  timezone_link=$(/usr/bin/readlink /etc/localtime 2>/dev/null) || timezone_link='未知'
  actual_timezone="${timezone_link##*/zoneinfo/}"
  actual_offset=$(/usr/bin/env -u TZ /bin/date '+%z')
}
read_timezone_auto() {
  actual_timezone_auto=$(/usr/bin/plutil -extract Active raw /Library/Preferences/com.apple.timezone.auto.plist 2>/dev/null) || actual_timezone_auto='未知'
}
wait_for_timezone() {
  local attempt
  for attempt in {1..40}; do
    target_offset=$(/usr/bin/env TZ="$target_timezone" /bin/date '+%z')
    read_timezone
    read_timezone_auto
    timezone_matches "$actual_timezone" "$actual_offset" && [[ "$actual_timezone_auto" == false ]] && return 0
    /bin/sleep 0.25
  done
  return 1
}
