ObjC.import('Foundation');
function run(argv) {
  var root=argv[0];
  function read(p) { return ObjC.unwrap($.NSString.stringWithContentsOfFileEncodingError(p,$.NSUTF8StringEncoding,null)); }
  var source=read(root+'/Resources/profiles.js');
  var module=new Function(source+';return {validate:validateConfig};')();
  var sample=JSON.parse(read(root+'/profiles.json'));
  var count=0;
  function assert(ok,text) { if(!ok) throw new Error(text); count++; }
  function clone() { return JSON.parse(JSON.stringify(sample)); }
  module.validate(clone()); assert(true,'默认配置');
  var custom=clone();
  custom.profiles.push({id:'new_york',name:'纽约英文',locale:'en_US',languages:['en-US','en'],webLanguages:['en-US','en'],timeZone:'America/New_York'});
  module.validate(custom); assert(true,'自定义纽约配置');
  [
    function(c){c.profiles[0].id='bad;id';},
    function(c){c.profiles[0].timeZone='../etc/passwd';},
    function(c){c.profiles[0].timeZone='Asia/Taipei;id';},
    function(c){c.profiles[0].timeZone='Asia/NotARealCity';},
    function(c){c.profiles[0].locale='$(id)';},
    function(c){c.profiles[0].languages=[];},
    function(c){c.profiles[0].webLanguages=['zh-TW\n$(id)'];},
    function(c){c.profiles[1].id=c.profiles[0].id;},
    function(c){c.settings.chromeProfile='../Default';},
    function(c){c.settings.authorization='disable';},
    function(c){c.profiles[0].ipv6='disabled';},
    function(c){c.settings.ipv6Services=[];},
    function(c){c.settings.ipv6Services=['Wi-Fi','Wi-Fi'];},
    function(c){c.settings.ipv6Services=['Wi-Fi\nother'];},
    function(c){c.settings.defaultBrowser='unknown';},
    function(c){c.settings.applications=['chrome','chrome'];}
  ].forEach(function(change,i){
    var c=clone(), rejected=false; change(c);
    try{module.validate(c);}catch(_){rejected=true;}
    assert(rejected,'无效配置未拒绝：'+i);
  });
  var legacy=clone(); delete legacy.settings.ipv6Services;
  legacy.profiles.forEach(function(p){delete p.ipv6;});
  module.validate(legacy); assert(true,'旧配置默认不管理 IPv6');
  var net=new Function(read(root+'/Resources/ipv6.js')+';return {states:serviceStates,matches:ipv6Matches,command:ipv6Command};')();
  var prefs={CurrentSet:'/Sets/current',Sets:{current:{Network:{Service:{wifi:{},vpn:{}}}}},NetworkServices:{wifi:{UserDefinedName:'Wi-Fi',Interface:{Type:'Ethernet'},IPv6:{ConfigMethod:'Automatic'}},vpn:{UserDefinedName:'VPN',Interface:{Type:'VPN'},IPv6:{ConfigMethod:'Automatic'}}}};
  assert(net.matches(net.states(prefs,['Wi-Fi']),'automatic'),'读取当前网络位置的 IPv6 自动配置');
  prefs.NetworkServices.wifi.IPv6.__INACTIVE__=1;
  assert(net.matches(net.states(prefs,['Wi-Fi']),'off'),'识别已停用 IPv6 协议');
  delete prefs.NetworkServices.wifi.IPv6;
  assert(net.matches(net.states(prefs,['Wi-Fi']),'off'),'识别已移除 IPv6 协议');
  prefs.NetworkServices.wifi.IPv6={ConfigMethod:'Manual'};
  assert(!net.matches(net.states(prefs,['Wi-Fi']),'off'),'手动配置不误判关闭');
  ['VPN','不存在的网卡'].forEach(function(name){var rejected=false;try{net.states(prefs,[name]);}catch(_){rejected=true;}assert(rejected,'拒绝 VPN 或不存在的服务');});
  var ncmd=net.command(["Adapter's $(id)"],'off');
  assert(ncmd.indexOf("'Adapter'\\''s $(id)'")>=0 && ncmd.indexOf("'IPv6: Off'")>=0,'网络服务名正确引号与命令回读');
  assert(net.command(['Wi-Fi'],'keep')==='' && net.command(['Wi-Fi'],'automatic').indexOf('-setv6automatic')>=0,'保留与自动策略');
  var auth=read(root+'/Resources/authorization.js');
  var touchAuth=new Function(auth+';touchEnabled=function(){return true;};return authorize;')();
  var calls=[], result=touchAuth('true','touchIdPreferred',{doShellScript:function(cmd,options){calls.push({cmd:cmd,options:options});return 'ok';}});
  assert(result==='ok'&&calls.length===1&&calls[0].cmd.indexOf('/usr/bin/sudo -k -S')>=0&&!calls[0].options,'优先 Touch ID 路径');
  assert(calls[0].cmd.indexOf(' -A')<0 && calls[0].cmd.indexOf(' </dev/null')>=0,'不使用会抑制指纹的 askpass，且关闭标准输入密码通道');
  calls=[];
  result=touchAuth('true','touchIdPreferred',{doShellScript:function(cmd,options){calls.push({cmd:cmd,options:options});if(!options)throw new Error('Touch ID unavailable');return 'password-ok';}});
  assert(result==='password-ok'&&calls.length===2&&calls[1].options.administratorPrivileges===true,'Touch ID 不可用时密码回退');
  calls=[];
  touchAuth('true','password',{doShellScript:function(cmd,options){calls.push({cmd:cmd,options:options});return 'ok';}});
  assert(calls.length===1&&calls[0].options.administratorPrivileges,'仅密码策略');
  var verifier=new Function(read(root+'/Resources/verify.js')+';return classifyBrowser;')();
  var profiles=[{id:'taipei',name:'台北',locale:'zh-Hant-TW',language:'zh-TW',timeZone:'Asia/Taipei'}];
  assert(verifier({locale:'zh-TW',language:'zh-TW',languages:['zh-TW'],timeZone:'Asia/Taipei',offsetMinutes:480},profiles).id==='taipei','台北浏览器判定');
  assert(!verifier({locale:'zh-CN',language:'zh-CN',languages:['zh-CN'],timeZone:'Asia/Taipei',offsetMinutes:480},profiles),'拒绝台北简体混合');
  assert(!verifier({locale:'zh-TW',language:'zh-TW',languages:['zh-TW'],timeZone:'Etc/GMT-8',offsetMinutes:480},profiles),'拒绝同偏移错误城市');
  var ny=[{id:'ny',name:'纽约',locale:'en-US',language:'en-US',timeZone:'America/New_York'}];
  ['2026-01-15T12:00:00Z','2026-07-15T12:00:00Z'].forEach(function(iso,i) {
    var fixed=new Date(iso);
    var version=new Function('Date',read(root+'/Resources/verify.js')+';return classifyBrowser;')(function(){return fixed;});
    var d={locale:'en-US',language:'en-US',languages:['en-US'],timeZone:'America/New_York',offsetMinutes:i===0?-300:-240};
    assert(version(d,ny).id==='ny','纽约冬季/夏季偏移');
    d.offsetMinutes=i===0?-240:-300;
    assert(!version(d,ny),'拒绝错误的夏令时偏移');
  });
  new Function(read(root+'/tests/configuration.js')+';return testConfiguration;')()(root,assert);
  return count+' 项本机配置、模式管理、IPv6、授权分支与浏览器判定检查通过（未改系统）';
}
