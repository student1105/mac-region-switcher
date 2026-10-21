ObjC.import('Foundation');
function ipv6Quote(s) { return "'" + String(s).replace(/'/g, "'\\''") + "'"; }
function networkPreferences() {
  var p = $.NSDictionary.dictionaryWithContentsOfFile('/Library/Preferences/SystemConfiguration/preferences.plist');
  if (!p) throw new Error('无法读取网络服务配置');
  return ObjC.deepUnwrap(p);
}
function serviceStates(preferences, names) {
  var setID = String(preferences.CurrentSet || '').split('/').pop();
  var set = (preferences.Sets || {})[setID];
  if (!set || !set.Network || !set.Network.Service) throw new Error('无法识别当前网络位置');
  var services = Object.keys(set.Network.Service).map(function(id) { return (preferences.NetworkServices || {})[id]; }).filter(Boolean);
  return names.map(function(name) {
    var matches = services.filter(function(s) { return s.UserDefinedName === name; });
    if (matches.length !== 1) throw new Error('当前网络位置没有唯一服务：' + name);
    var s = matches[0], type = (s.Interface || {}).Type;
    if (type !== 'Ethernet' && type !== 'IEEE80211') throw new Error('IPv6 仅管理实体网卡，不管理 VPN：' + name);
    var protocol = s.IPv6;
    var method = !protocol || Number(protocol.__INACTIVE__ || 0) === 1 ? 'Off' : protocol.ConfigMethod;
    return {name:name, method:method || 'Unknown'};
  });
}
function ipv6Matches(states, policy) {
  return policy === 'keep' || states.every(function(s) { return s.method === (policy === 'off' ? 'Off' : 'Automatic'); });
}
function ipv6Command(names, policy) {
  if (policy === 'keep') return '';
  if (['off','automatic'].indexOf(policy) < 0 || !names.length) throw new Error('IPv6 策略无效');
  var expected = policy === 'off' ? 'IPv6: Off' : 'IPv6: Automatic';
  return names.map(function(name) {
    var n = ipv6Quote(name);
    return '/usr/sbin/networksetup -setv6' + (policy === 'off' ? 'off' : 'automatic') + ' ' + n + ' >/dev/null\n' +
      'ipv6_ok=no\nfor ipv6_attempt in $(/usr/bin/jot 20); do\n' +
      '  if /usr/sbin/networksetup -getinfo ' + n + ' | /usr/bin/grep -Fxq ' + ipv6Quote(expected) + '; then ipv6_ok=yes; break; fi\n' +
      '  /bin/sleep 0.25\ndone\n' +
      'if [ "$ipv6_ok" != yes ]; then /usr/bin/printf "%s\\n" ' + ipv6Quote('IPv6 回读未匹配：' + name + ' / ' + policy) + ' >&2; exit 1; fi\n';
  }).join('');
}
function configuredIPv6(c, p) {
  var policy = p.ipv6 || 'keep', names = c.settings.ipv6Services || [];
  return {policy:policy, names:names, states:policy === 'keep' ? [] : serviceStates(networkPreferences(), names)};
}
function run(argv) {
  var root = argv[0], action = argv[1];
  function read(path) { return ObjC.unwrap($.NSString.stringWithContentsOfFileEncodingError(path,$.NSUTF8StringEncoding,null)); }
  var configModule = new Function(read(root + '/Resources/profiles.js') + ';return {load:loadConfig};')();
  var configPath = ObjC.unwrap($.NSProcessInfo.processInfo.environment.objectForKey('REGION_SWITCHER_CONFIG'));
  var c = configModule.load(typeof configPath === 'string' && configPath.length ? configPath : root + '/profiles.json');
  if (action === 'status') {
    var names = c.settings.ipv6Services || [];
    if (!names.length) return 'IPv6：未管理';
    var states = serviceStates(networkPreferences(), names);
    return 'IPv6（网卡保存配置）：' + states.map(function(s) { return s.name + ' ' + ({Off:'关闭',Automatic:'自动',Manual:'手动',LinkLocal:'仅本地链路'}[s.method] || s.method); }).join('；') + '（不含 VPN）';
  }
  if (action === 'automatic') {
    var names = c.settings.ipv6Services || [];
    if (!names.length) throw new Error('尚未配置 ipv6Services');
    serviceStates(networkPreferences(), names);
    var auth = new Function(read(root + '/Resources/authorization.js') + ';return authorize;')();
    var app = Application.currentApplication(); app.includeStandardAdditions = true;
    auth('set -eu\n' + ipv6Command(names,'automatic'), c.settings.authorization, app);
    if (!ipv6Matches(serviceStates(networkPreferences(),names),'automatic')) throw new Error('IPv6 自动配置保存回读未匹配');
    return '指定网卡的 IPv6 已设为自动。下一次切换仍按模式配置执行。';
  }
  var p = c.profiles.filter(function(p) { return p.id === argv[2]; })[0];
  if (!p) throw new Error('模式不存在');
  var plan = configuredIPv6(c,p);
  if (action === 'check') {
    if (!ipv6Matches(plan.states,plan.policy)) throw new Error('IPv6 保存配置未匹配目标：' + plan.policy);
    return 'IPv6 配置已匹配';
  }
  throw new Error('无效 IPv6 操作');
}
