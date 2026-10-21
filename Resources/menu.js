function sq(s) { return "'" + s.replace(/'/g,"'\\''") + "'"; }
function run(argv) {
  var root=argv[0], a=Application.currentApplication(); a.includeStandardAdditions=true;
  function shell(s) { return a.doShellScript(s); }
  function dialog(text) { a.displayDialog(String(text),{withTitle:'区域模式一键切换',buttons:['好'],defaultButton:'好'}); }
  function auth(action) {
    ObjC.import('Foundation');
    var source=$.NSString.stringWithContentsOfFileEncodingError(root+'/Resources/authorization.js',$.NSUTF8StringEncoding,null);
    if(!source) throw new Error('无法读取授权组件');
    var module=new Function(ObjC.unwrap(source)+';return {run:run};')();
    return module.run([action]);
  }
  function configure(action) {
    ObjC.import('Foundation');
    var source=$.NSString.stringWithContentsOfFileEncodingError(root+'/Resources/configure-ui.js',$.NSUTF8StringEncoding,null);
    if(!source)throw new Error('无法读取本机配置界面');
    return new Function(ObjC.unwrap(source)+';return run;')()([root,action]);
  }
  try {
    if (argv[1] === 'enable-touch-id' || argv[1] === 'test-touch-id') {
      var action=argv[1] === 'enable-touch-id' ? 'enable' : 'test';
      auth(action);
      return;
    }
    if(argv[1]==='inspect'){configure('inspect');return;}
    var initial=JSON.parse(shell('/bin/cat '+sq(root+'/profiles.json')));
    if(initial.settings.setupCompleted!==true)configure('setup');
    while(true) {
    var current=shell(sq(root+'/Resources/current-mode.sh'));
    var profiles=JSON.parse(shell('/usr/bin/osascript -l JavaScript '+sq(root+'/Resources/profiles.js')+' menu '+sq(root+'/profiles.json')));
    var choices=profiles.map(function(p){return '切换：'+p.name+' ['+p.id+']';});
    choices=choices.concat(['读取本机当前设置','读取本机并新建模式','编辑已有模式','移除已有模式','选择管理的应用与网卡','查看当前模式','高级：编辑 JSON 配置','检查配置','将指定网卡 IPv6 设为自动','启用 Touch ID','检测 Touch ID 授权']);
    var lines=current.split(/\r\n|\r|\n/);
    var selected=a.chooseFromList(choices,{withTitle:'区域模式一键切换',withPrompt:lines.slice(0,3).concat(lines.filter(function(s){return s.indexOf('IPv6')===0;})).join('\n'),okButtonName:'打开',cancelButtonName:'取消'});
    if (!selected) return;
    var index=choices.indexOf(selected[0]);
    if(index<profiles.length) {
      var target=profiles[index];
      a.displayDialog('地区：'+target.locale+'\n语言：'+target.languages.join(', ')+'\n时区：'+target.timeZone+'\nIPv6：'+target.ipv6+'\n\n切换将按配置更改系统和指定网卡，并正常退出已启用的浏览器。请保存未提交的网页内容。',{withTitle:target.name,buttons:['取消','切换'],defaultButton:'切换',cancelButton:'取消'});
      shell(sq(root+'/run-mode.command')+' '+sq(profiles[index].id));
    } else if(selected[0]==='查看当前模式') dialog(current);
    else if(selected[0]==='高级：编辑 JSON 配置') {shell('/usr/bin/open -a TextEdit '+sq(root+'/profiles.json'));return;}
    else if(selected[0]==='读取本机当前设置') configure('inspect');
    else if(selected[0]==='读取本机并新建模式') configure('create');
    else if(selected[0]==='编辑已有模式') configure('edit');
    else if(selected[0]==='移除已有模式') configure('delete');
    else if(selected[0]==='选择管理的应用与网卡') configure('settings');
    else if(selected[0]==='检查配置') dialog(shell('/usr/bin/osascript -l JavaScript '+sq(root+'/Resources/profiles.js')+' validate '+sq(root+'/profiles.json')));
    else if(selected[0]==='将指定网卡 IPv6 设为自动') {
      a.displayDialog('将 profiles.json 中 ipv6Services 指定的网卡设为 IPv6 自动配置。下一次切换仍按模式配置执行。',{buttons:['取消','设为自动'],defaultButton:'设为自动',cancelButton:'取消'});
      dialog(shell('/usr/bin/osascript -l JavaScript '+sq(root+'/Resources/ipv6.js')+' '+sq(root)+' automatic'));
    }
    else auth(selected[0]==='启用 Touch ID'?'enable':'test');
    }
  } catch(e) {
    if(e.errorNumber===-128 || /cancel|取消/i.test(String(e))) return;
    dialog(e.message || e);
  }
}
