ObjC.import('Foundation');
function readText(path) {
  var value = $.NSString.stringWithContentsOfFileEncodingError(path, $.NSUTF8StringEncoding, null);
  if (!value) throw new Error('无法读取文件：' + path);
  return ObjC.unwrap(value);
}
function writeText(path, text) {
  if (!$(text).writeToFileAtomicallyEncodingError(path, true, $.NSUTF8StringEncoding, null)) {
    throw new Error('无法写入文件：' + path);
  }
}
function validateConfig(c) {
  function assert(ok, text) { if (!ok) throw new Error('配置错误：' + text); }
  function unique(a) { return a.every(function(v, i) { return a.indexOf(v) === i; }); }
  function tags(a, name) {
    assert(Array.isArray(a) && a.length > 0 && a.length <= 20 && unique(a), name + ' 应为不重复的非空语言数组');
    a.forEach(function(tag) {
      assert(typeof tag === 'string' && /^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8}){0,5}$/.test(tag), name + ' 含无效语言标识');
    });
  }
  assert(c && c.schemaVersion === 1, 'schemaVersion 必须为 1');
  var s = c.settings;
  assert(s && (s.setupCompleted===undefined || typeof s.setupCompleted==='boolean'), 'setupCompleted 必须为布尔值');
  assert(s && Array.isArray(s.applications) && unique(s.applications), 'settings.applications 必须为应用数组');
  s.applications.forEach(function(a) { assert(['chrome','safari','terminal'].indexOf(a) >= 0, '未知应用 ' + a); });
  assert(['chrome','keep'].indexOf(s.defaultBrowser) >= 0, 'defaultBrowser 只能是 chrome 或 keep');
  assert(s.defaultBrowser !== 'chrome' || s.applications.indexOf('chrome') >= 0, '默认 Chrome 时须启用 chrome 应用');
  assert(typeof s.chromeProfile === 'string' && /^[A-Za-z0-9][A-Za-z0-9 _.-]{0,79}$/.test(s.chromeProfile) && s.chromeProfile.indexOf('..') < 0, 'chromeProfile 必须为配置目录名，例如 Default 或 Profile 1');
  assert(['touchIdPreferred','password'].indexOf(s.authorization) >= 0, 'authorization 只能是 touchIdPreferred 或 password');
  if (s.ipv6Services !== undefined) {
    assert(Array.isArray(s.ipv6Services) && s.ipv6Services.length <= 20 && unique(s.ipv6Services), 'ipv6Services 必须为不重复的网络服务名称数组');
    s.ipv6Services.forEach(function(name) {
      assert(typeof name === 'string' && name.trim().length > 0 && name.length <= 128 && !/[\x00-\x1f\x7f]/.test(name), 'IPv6 网络服务名称无效');
    });
  }
  assert(Array.isArray(c.profiles) && c.profiles.length > 0 && c.profiles.length <= 100, 'profiles 应有 1 至 100 个模式');
  var ids = [];
  c.profiles.forEach(function(p) {
    assert(p && typeof p.id === 'string' && /^[a-z][a-z0-9_-]{0,39}$/.test(p.id) && ids.indexOf(p.id) < 0, '模式 id 必须唯一，仅使用小写字母、数字、下划线或连字符');
    ids.push(p.id);
    assert(p.ipv6 === undefined || ['keep','off','automatic'].indexOf(p.ipv6) >= 0, 'ipv6 只能是 keep、off 或 automatic');
    assert(!p.ipv6 || p.ipv6 === 'keep' || (s.ipv6Services && s.ipv6Services.length > 0), '管理 IPv6 时须指定 ipv6Services');
    assert(typeof p.name === 'string' && p.name.trim().length > 0 && p.name.length <= 80 && !/[\x00-\x1f\x7f]/.test(p.name), '模式名称不应为空或包含控制字符');
    assert(typeof p.locale === 'string' && /^[A-Za-z]{2,8}(?:[-_][A-Za-z0-9]{2,8}){0,4}$/.test(p.locale), '地区标识格式无效，例如 zh-Hant_TW 或 en_US');
    tags(p.languages, 'languages');
    tags(p.webLanguages, 'webLanguages');
    assert(typeof p.timeZone === 'string' && /^(?:[A-Za-z0-9_+-]+\/)*[A-Za-z0-9_+-]+$/.test(p.timeZone), '时区格式无效');
    assert($.NSFileManager.defaultManager.fileExistsAtPath('/var/db/timezone/zoneinfo/' + p.timeZone), '此 Mac 不包含时区 ' + p.timeZone);
  });
  return c;
}
function loadConfig(path) { return validateConfig(JSON.parse(readText(path))); }
function run(argv) {
  var action = argv[0], c = loadConfig(argv[1]);
  if (action === 'validate') return '配置有效：' + c.profiles.length + ' 个模式';
  if (action === 'list') return c.profiles.map(function(p) { return p.id; }).join('\n');
  if (action === 'menu') return JSON.stringify(c.profiles.map(function(p) { return {id:p.id,name:p.name,locale:p.locale,languages:p.languages,timeZone:p.timeZone,ipv6:p.ipv6||'keep'}; }));
  if (action === 'browser') {
    if (!argv[2]) throw new Error('缺少输出文件');
    var exported = c.profiles.map(function(p) {
      return {id:p.id,name:p.name,locale:p.languages[0],language:p.webLanguages[0],timeZone:p.timeZone};
    });
    writeText(argv[2], 'var regionProfiles = ' + JSON.stringify(exported) + ';\n');
    return '浏览器配置已生成';
  }
  if (action === 'get') {
    var found = c.profiles.filter(function(p) { return p.id === argv[2]; })[0];
    if (!found) throw new Error('模式不存在：' + argv[2]);
    return [found.name,found.timeZone,found.locale,found.languages.join(','),found.webLanguages.join(','),c.settings.chromeProfile,c.settings.defaultBrowser,c.settings.applications.join(',') || '-',c.settings.authorization].join('\n');
  }
  throw new Error('无效配置操作');
}
