ObjC.import('Foundation');
function configSource(path) {
  var value = $.NSString.stringWithContentsOfFileEncodingError(path,$.NSUTF8StringEncoding,null);
  if (!value) throw new Error('无法读取：' + path);
  return ObjC.unwrap(value);
}
function configLibrary(root) {
  return new Function(configSource(root+'/Resources/profiles.js')+';return {load:loadConfig,validate:validateConfig,write:writeText};')();
}
function configPath(root) {
  var custom = ObjC.unwrap($.NSProcessInfo.processInfo.environment.objectForKey('REGION_SWITCHER_CONFIG'));
  return typeof custom === 'string' && custom.length ? custom : root+'/profiles.json';
}
function readDictionary(path) {
  var value = $.NSDictionary.dictionaryWithContentsOfFile(path);
  return value ? ObjC.deepUnwrap(value) || {} : {};
}
function physicalServices(preferences) {
  var setID = String(preferences.CurrentSet || '').split('/').pop();
  var location = (preferences.Sets || {})[setID];
  if (!location || !location.Network || !location.Network.Service) return [];
  return Object.keys(location.Network.Service).map(function(id) { return (preferences.NetworkServices || {})[id]; }).filter(function(s) {
    return s && s.Interface && ['Ethernet','IEEE80211'].indexOf(s.Interface.Type)>=0;
  }).map(function(s) {
    var protocol=s.IPv6;
    return {name:s.UserDefinedName,ipv6:!protocol || Number(protocol.__INACTIVE__ || 0)===1 ? 'Off' : protocol.ConfigMethod || 'Unknown'};
  });
}
function normalizedLanguages(values) {
  return values.map(function(value){return String(value).trim().replace(/_/g,'-');}).filter(function(value,i,a){return value && a.indexOf(value)===i;});
}
function recommendedIPv6(locale) {
  var components=ObjC.deepUnwrap($.NSLocale.componentsFromLocaleIdentifier(locale));
  return components.kCFLocaleCountryCodeKey==='CN' ? 'automatic' : 'off';
}
function readMachine(c) {
  var defaults=$.NSUserDefaults.standardUserDefaults;
  var locale=ObjC.unwrap(defaults.objectForKey('AppleLocale')) || ObjC.unwrap($.NSLocale.currentLocale.localeIdentifier);
  var languages=ObjC.deepUnwrap(defaults.objectForKey('AppleLanguages')) || ObjC.deepUnwrap($.NSLocale.preferredLanguages);
  var zone=ObjC.unwrap($.NSFileManager.defaultManager.destinationOfSymbolicLinkAtPathError('/etc/localtime',null));
  if (!zone || zone.indexOf('/zoneinfo/')<0) throw new Error('无法读取当前 IANA 时区');
  zone=zone.split('/zoneinfo/').pop();
  var base=ObjC.unwrap($.NSHomeDirectory()), web=normalizedLanguages(languages), webSource='按系统语言建议';
  var chromePath=base+'/Library/Application Support/Google/Chrome/'+c.settings.chromeProfile+'/Preferences';
  if ($.NSFileManager.defaultManager.fileExistsAtPath(chromePath)) {
    try {
      var prefs=JSON.parse(configSource(chromePath));
      if (prefs.intl && typeof prefs.intl.accept_languages==='string' && prefs.intl.accept_languages.trim()) {
        web=normalizedLanguages(prefs.intl.accept_languages.split(','));webSource='Chrome 保存值';
      }
    } catch (_) { webSource='Chrome 无法读取；按系统语言建议'; }
  }
  var candidates={chrome:['/Applications/Google Chrome.app',base+'/Applications/Google Chrome.app'],safari:['/Applications/Safari.app','/System/Applications/Safari.app'],terminal:['/System/Applications/Utilities/Terminal.app','/Applications/Utilities/Terminal.app']};
  var detected=Object.keys(candidates).filter(function(key){return candidates[key].some(function(path){return Boolean($.NSFileManager.defaultManager.fileExistsAtPath(path));});});
  var auto=readDictionary('/Library/Preferences/com.apple.timezone.auto.plist').Active;
  return {locale:String(locale).split('@')[0],languages:normalizedLanguages(languages),timeZone:zone,webLanguages:web,webSource:webSource,automaticTimeZone:auto===undefined?'未知':Boolean(auto),applications:detected,services:physicalServices(readDictionary('/Library/Preferences/SystemConfiguration/preferences.plist'))};
}
function modeFromMachine(snapshot, id, name) {
  return {id:id,name:name,locale:snapshot.locale,languages:snapshot.languages.slice(),webLanguages:snapshot.webLanguages.slice(),timeZone:snapshot.timeZone,ipv6:recommendedIPv6(snapshot.locale)};
}
function saveConfiguration(root, c, expected) {
  var library=configLibrary(root), path=configPath(root);
  library.validate(c);
  var current=configSource(path);
  if (current!==expected) throw new Error('配置在编辑期间已改变；请重新打开编辑，未覆盖新内容。');
  var parent=path.slice(0,path.lastIndexOf('/')), backups=parent+'/配置备份';
  var fm=$.NSFileManager.defaultManager;
  if (!fm.createDirectoryAtPathWithIntermediateDirectoriesAttributesError(backups,true,$({}),null)) throw new Error('无法创建配置备份目录');
  var backup=backups+'/profiles-'+Date.now()+'-'+Math.floor(Math.random()*1000000)+'.json';
  if (!fm.copyItemAtPathToPathError(path,backup,null)) throw new Error('原配置备份失败，未保存修改');
  library.write(path,JSON.stringify(c,null,2)+'\n');
  return backup;
}
function machineSummary(s) {
  var names={Off:'关闭',Automatic:'自动',Manual:'手动',LinkLocal:'仅本地链路'};
  return '系统地区（非地理定位）：'+s.locale+'\n系统首选语言：'+s.languages.join(', ')+'\n当前时区：'+s.timeZone+'\n自动时区：'+s.automaticTimeZone+'\n网页语言：'+s.webLanguages.join(', ')+'（'+s.webSource+'）\n检测到应用：'+s.applications.join(', ')+'\n网卡 IPv6 保存配置：'+(s.services.map(function(v){return v.name+' '+(names[v.ipv6]||v.ipv6);}).join('；')||'未读取到实体网卡')+'\n\n读取不会切换系统。已运行应用的实际语言和 Intl 仍需浏览器验证。';
}
function run(argv) {
  var root=argv[0],c=configLibrary(root).load(configPath(root)),s=readMachine(c);
  if(argv[1]==='json') return JSON.stringify(s);
  if(argv[1]==='summary') return machineSummary(s);
  throw new Error('无效本机读取操作');
}
