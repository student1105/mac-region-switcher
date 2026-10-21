function testConfiguration(root,assert) {
  function read(path){return ObjC.unwrap($.NSString.stringWithContentsOfFileEncodingError(path,$.NSUTF8StringEncoding,null));}
  var api=new Function(read(root+'/Resources/configuration.js')+';return {policy:recommendedIPv6,draft:modeFromMachine,save:saveConfiguration,services:physicalServices};')();
  assert(api.policy('en_CN')==='automatic' && api.policy('zh-Hans_CN')==='automatic','大陆 IPv6 建议按地区而非语言');
  assert(api.policy('zh-Hant_TW')==='off' && api.policy('en_US')==='off','非大陆 IPv6 建议关闭');
  var snapshot={locale:'en_US',languages:['en-US','en'],webLanguages:['en-US','en'],timeZone:'America/New_York'};
  var draft=api.draft(snapshot,'my_mode','自由模式');
  assert(draft.id==='my_mode' && draft.locale==='en_US' && draft.timeZone==='America/New_York' && draft.ipv6==='off','从当前本机模板建立任意模式');
  draft.languages.push('ja-JP');assert(snapshot.languages.length===2,'编辑模板不污染读取值');
  var prefs={CurrentSet:'/Sets/current',Sets:{current:{Network:{Service:{wifi:{},vpn:{}}}}},NetworkServices:{wifi:{UserDefinedName:'My Wi-Fi',Interface:{Type:'Ethernet'},IPv6:{ConfigMethod:'Automatic'}},vpn:{UserDefinedName:'VPN',Interface:{Type:'VPN'}}}};
  assert(api.services(prefs).length===1 && api.services(prefs)[0].name==='My Wi-Fi','自动发现本机实体网卡并排除 VPN');
  var tmp='/private/tmp/mac-region-config-test-'+ObjC.unwrap($.NSUUID.UUID.UUIDString),fm=$.NSFileManager.defaultManager;
  assert(Boolean(fm.createDirectoryAtPathWithIntermediateDirectoriesAttributesError(tmp+'/Resources',true,$({}),null)),'创建隔离配置测试目录');
  assert(Boolean(fm.copyItemAtPathToPathError(root+'/Resources/profiles.js',tmp+'/Resources/profiles.js',null)),'复制配置校验器');
  var original=read(root+'/profiles.json');
  assert(Boolean($(original).writeToFileAtomicallyEncodingError(tmp+'/profiles.json',true,$.NSUTF8StringEncoding,null)),'创建隔离配置样本');
  var c=JSON.parse(original);c.profiles.push(draft);
  var backup=api.save(tmp,c,original);
  assert(read(backup)===original,'保存前完整备份原配置');
  var saved=JSON.parse(read(tmp+'/profiles.json'));
  assert(saved.profiles.some(function(p){return p.id==='my_mode';}) && saved.profiles.length===c.profiles.length,'新增模式可重新读取');
  var failed=false;try{api.save(tmp,c,original);}catch(_){failed=true;}
  assert(failed && read(tmp+'/profiles.json')===JSON.stringify(c,null,2)+'\n','拒绝过期编辑并保留新配置');
  var current=read(tmp+'/profiles.json');c.profiles[c.profiles.length-1].name='更新后的模式';api.save(tmp,c,current);
  assert(JSON.parse(read(tmp+'/profiles.json')).profiles.pop().name==='更新后的模式','编辑模式可持久保存');
}
