ObjC.import('Foundation');
function library(path) {
  var text = $.NSString.stringWithContentsOfFileEncodingError(path,$.NSUTF8StringEncoding,null);
  if (!text) throw new Error('无法读取组件：' + path);
  return ObjC.unwrap(text);
}
function zoneCommand(zone) {
  if (!/^(?:[A-Za-z0-9_+-]+\/)*[A-Za-z0-9_+-]+$/.test(zone) ||
      !$.NSFileManager.defaultManager.fileExistsAtPath('/var/db/timezone/zoneinfo/' + zone)) throw new Error('无效时区');
  // Values reach a privileged shell only after zone validation and quoting.
  function quote(text) { return "'" + text.replace(/'/g, "'\\''") + "'"; }
  var z = quote(zone), target = quote('/var/db/timezone/zoneinfo/' + zone);
  return 'set -eu\n' +
    '/usr/bin/defaults write /Library/Preferences/com.apple.timezone.auto Active -bool false\n' +
    '/usr/sbin/systemsetup -settimezone ' + z + ' >/dev/null 2>&1 || true\n' +
    // systemsetup does not accept every installed IANA identifier.
    '/bin/ln -hfs ' + target + ' /etc/localtime\n' +
    'for attempt in $(/usr/bin/jot 40); do\n' +
    '  link=$(/usr/bin/readlink /etc/localtime 2>/dev/null) || link=unknown\n' +
    '  offset=$(/usr/bin/env -u TZ /bin/date +%z)\n' +
    '  expected=$(/usr/bin/env TZ=' + z + ' /bin/date +%z)\n' +
    '  if [ "$link" = ' + target + ' ] && [ "$offset" = "$expected" ]; then /usr/bin/printf "%s\\n%s\\n" "$link" "$offset"; exit 0; fi\n' +
    '  /bin/sleep 0.25\ndone\n' +
    '/usr/bin/printf "时区等待超时：%s %s\\n" "$link" "$offset" >&2; exit 1';
}
function run(argv) {
  var root = argv[0];
  var authModule = new Function(library(root + '/Resources/authorization.js') + '; return {authorize:authorize};')();
  var cfg = JSON.parse(library(argv[1]));
  // Use the same strict validator as the menu and shell utilities.
  var configModule = new Function(library(root + '/Resources/profiles.js') + '; return {validate:validateConfig};')();
  configModule.validate(cfg);
  var p = cfg.profiles.filter(function(p) { return p.id === argv[2]; })[0];
  if (!p) throw new Error('模式不存在');
  var networkModule = new Function(library(root + '/Resources/ipv6.js') + ';return {plan:configuredIPv6,command:ipv6Command};')();
  // Printing a command is a static check and must not require the developer's
  // example network service to exist on another user's Mac.
  var plan = argv.indexOf('--print-command') >= 0 ? {names:cfg.settings.ipv6Services||[],policy:p.ipv6||'keep'} : networkModule.plan(cfg,p);
  var command = argv.indexOf('--network-only') >= 0 ? 'set -eu\n/usr/bin/readlink /etc/localtime\n/usr/bin/env -u TZ /bin/date +%z\n' : 'set -eu\n(\n' + zoneCommand(p.timeZone) + '\n)\n';
  command += networkModule.command(plan.names,plan.policy);
  if (argv.indexOf('--print-command') >= 0) return command;
  var app = Application.currentApplication(); app.includeStandardAdditions = true;
  var result = authModule.authorize(command, cfg.settings.authorization, app);
  var lines = result.trim().split(/\r\n|\r|\n/);
  if (lines.length < 2 || lines[lines.length-2] !== '/var/db/timezone/zoneinfo/' + p.timeZone || !/^[+-]\d{4}$/.test(lines[lines.length-1])) throw new Error('系统回读与目标时区不一致：' + result);
  return '系统时区已核验：' + p.timeZone + ' ' + lines[lines.length-1];
}
