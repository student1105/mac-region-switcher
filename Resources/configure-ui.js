ObjC.import('Foundation');
function run(argv) {
  var root=argv[0],action=argv[1],app=Application.currentApplication();app.includeStandardAdditions=true;
  var source=$.NSString.stringWithContentsOfFileEncodingError(root+'/Resources/configuration.js',$.NSUTF8StringEncoding,null);
  var api=new Function(ObjC.unwrap(source)+';return {library:configLibrary,path:configPath,read:configSource,machine:readMachine,draft:modeFromMachine,save:saveConfiguration,summary:machineSummary,policy:recommendedIPv6,languages:normalizedLanguages};')();
  var original=api.read(api.path(root)),c=api.library(root).load(api.path(root)),machine=api.machine(c);
  function dialog(text){app.displayDialog(text,{withTitle:'本机与模式配置',buttons:['好'],defaultButton:'好'});}
  function input(title,value){return app.displayDialog(title,{withTitle:'本机与模式配置',defaultAnswer:value,buttons:['取消','下一步'],defaultButton:'下一步',cancelButton:'取消'}).textReturned.trim();}
  function choose(title,values,defaults,multiple){
    var result=app.chooseFromList(values,{withTitle:'本机与模式配置',withPrompt:title,defaultItems:defaults||[],multipleSelectionsAllowed:!!multiple,emptySelectionAllowed:!!multiple,okButtonName:'选择',cancelButtonName:'取消'});
    if(!result) throw new Error('取消');return result;
  }
  function catalog(title,current,items){
    var answer=app.displayDialog(title+'\n可直接输入标识，或搜索本机提供的列表。',{withTitle:'本机与模式配置',defaultAnswer:current,buttons:['取消','搜索列表','使用此值'],defaultButton:'使用此值',cancelButton:'取消'});
    if(answer.buttonReturned==='使用此值')return answer.textReturned.trim();
    var query=input(title+'：搜索关键词（支持标识或显示名称）','').toLowerCase();
    var found=items.filter(function(v){return v.toLowerCase().indexOf(query)>=0;});
    if(!found.length)throw new Error('没有匹配项，请换关键词或直接输入标识。');
    var selected=choose(title+'：匹配 '+found.length+' 项'+(found.length>200?'，显示前 200 项；可取消后缩小关键词':''),found.slice(0,200),[],false)[0];
    return selected.split(' — ')[0];
  }
  function localeItems(){return ObjC.deepUnwrap($.NSLocale.availableLocaleIdentifiers).filter(function(id){return /^[A-Za-z]{2,8}(?:[-_][A-Za-z0-9]{2,8}){0,4}$/.test(id);}).sort().map(function(id){var name=ObjC.unwrap($.NSLocale.currentLocale.displayNameForKeyValue($.NSLocaleIdentifier,id));return id+' — '+(name||id);});}
  function languageList(title,current){
    var value=catalog(title+'\n搜索可选择一种语言；需要多种语言时，输入逗号分隔的有序列表。',current.join(', '),localeItems().map(function(item){var parts=item.split(' — ');return parts[0].replace(/_/g,'-')+' — '+parts[1];}));
    return api.languages(value.split(','));
  }
  function zoneItems(){
    var aliases={'Asia/Tokyo':'东京 日本','Asia/Taipei':'台北','Etc/GMT-8':'固定东八区 南京等','America/New_York':'纽约','Europe/London':'伦敦'};
    var zones=ObjC.deepUnwrap($.NSTimeZone.knownTimeZoneNames);if(zones.indexOf('Etc/GMT-8')<0)zones.push('Etc/GMT-8');
    return zones.sort().map(function(id){return id+(aliases[id]?' — '+aliases[id]:'');});
  }
  function selectProfile(title){var labels=c.profiles.map(function(p){return p.name+' ['+p.id+']';});return c.profiles[labels.indexOf(choose(title,labels,[],false)[0])];}
  function settings(){
    var labels=['chrome','safari','terminal'].map(function(k){return k+(machine.applications.indexOf(k)<0?'（未检测到）':'');});
    var defaults=c.settings.applications.filter(function(k){return machine.applications.indexOf(k)>=0;}).map(function(k){return labels[['chrome','safari','terminal'].indexOf(k)];});
    c.settings.applications=choose('选择要统一管理语言的应用，可不选。未检测到的应用请谨慎选择。',labels,defaults,true).map(function(label){return label.split('（')[0];});
    if(c.settings.applications.indexOf('chrome')>=0)c.settings.chromeProfile=input('Chrome 配置目录名（Default、Profile 1 等）',c.settings.chromeProfile);
    else c.settings.defaultBrowser='keep';
    var names=machine.services.map(function(s){return s.name;});
    if(!names.length)throw new Error('未读取到可管理实体网卡，请在高级 JSON 配置中将模式 IPv6 设为 keep。');
    var selected=(c.settings.ipv6Services||[]).filter(function(n){return names.indexOf(n)>=0;});
    if(!selected.length)selected=[names.indexOf('Wi-Fi')>=0?'Wi-Fi':names[0]];
    c.settings.ipv6Services=choose('选择要管理 IPv6 的实体网卡；不包含 VPN。设置会作用于所有模式。',names,selected,true);
    c.settings.setupCompleted=true;
    api.library(root).validate(c);
    app.displayDialog('保存本机管理范围？\n应用：'+c.settings.applications.join(', ')+'\n网卡：'+c.settings.ipv6Services.join(', ')+'\n仅保存工具配置，不切换系统。',{buttons:['取消','保存'],defaultButton:'保存',cancelButton:'取消'});
    api.save(root,c,original);dialog('已保存。原配置已备份到安装目录的“配置备份”。');
  }
  function wizard(base,editing){
    var p=JSON.parse(JSON.stringify(base));
    p.name=input('模式名称',p.name);
    p.locale=catalog('系统地区标识（如 zh-Hans_CN、zh-Hant_TW、en_US）',p.locale,localeItems());
    p.languages=languageList('系统与所选应用的首选语言',p.languages);
    p.webLanguages=languageList('Chrome 网页语言',p.webLanguages);
    p.timeZone=catalog('IANA 时区（地区和语言可独立选择）',p.timeZone,zoneItems());
    var options=['开启自动配置 [automatic]','关闭 IPv6 [off]','保留当前配置 [keep]'];
    var policy=editing?(p.ipv6||'keep'):api.policy(p.locale);
    p.ipv6=['automatic','off','keep'][options.indexOf(choose('指定网卡 IPv6 策略。新模式默认大陆自动、其他地区关闭，可自由改选。',options,[options[['automatic','off','keep'].indexOf(policy)]],false)[0])];
    var candidate=JSON.parse(JSON.stringify(c));
    if(editing)candidate.profiles[candidate.profiles.map(function(v){return v.id;}).indexOf(p.id)]=p;else candidate.profiles.push(p);
    api.library(root).validate(candidate);
    app.displayDialog('模式：'+p.name+'\n地区：'+p.locale+'\n语言：'+p.languages.join(', ')+'\n网页语言：'+p.webLanguages.join(', ')+'\n时区：'+p.timeZone+'\nIPv6：'+p.ipv6+'\n应用：'+c.settings.applications.join(', ')+'\n网卡：'+(c.settings.ipv6Services||[]).join(', ')+'\n\n保存不立即切换。所选应用会使用上面填写的统一语言；这不是完整系统备份。自动时区在实际切换时将关闭。',{withTitle:'确认模式配置',buttons:['取消','保存模式'],defaultButton:'保存模式',cancelButton:'取消'});
    api.save(root,candidate,original);dialog('模式已保存，主菜单现在可选择它。原配置已自动备份。');
  }
  if(action==='inspect'){dialog(api.summary(machine));return;}
  if(action==='setup'){
    var answer=app.displayDialog('首次使用：先读取这台 Mac，选择要管理的应用和网卡。现有示例模式会保留，所有操作都先保存配置。\n\n'+api.summary(machine),{withTitle:'首次本机配置',buttons:['稍后','配置本机'],defaultButton:'配置本机'});
    if(answer.buttonReturned==='稍后')return;
    settings();return;
  }
  if(action==='settings'){settings();return;}
  if(action==='create'){
    app.displayDialog(api.summary(machine)+'\n\n将以上系统地区、语言和固定时区作为新模式模板；后续每项均可修改。IPv6 使用所选地区的建议策略，可在保存前改选。',{withTitle:'读取本机作为模板',buttons:['取消','继续'],defaultButton:'继续',cancelButton:'取消'});
    wizard(api.draft(machine,'local_'+Date.now(),'我的本机模式'),false);return;
  }
  if(action==='edit'){wizard(selectProfile('选择要编辑的模式'),true);return;}
  if(action==='delete'){
    if(c.profiles.length<=1)throw new Error('至少保留一个模式。');
    var p=selectProfile('选择要移除的模式');
    app.displayDialog('从工具移除“'+p.name+'”？不会切换系统；原配置会自动备份，可从“配置备份”恢复。',{buttons:['取消','移除'],defaultButton:'取消',cancelButton:'取消'});
    c.profiles=c.profiles.filter(function(v){return v.id!==p.id;});api.save(root,c,original);dialog('模式已移除，原配置已备份。');return;
  }
  throw new Error('无效配置界面操作');
}
