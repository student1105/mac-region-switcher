ObjC.import('Foundation');
function sq(text) { return "'" + String(text).replace(/'/g, "'\\''") + "'"; }
function automaticConfig() {
  var s = $.NSString.stringWithContentsOfFileEncodingError('/etc/pam.d/sudo_local', $.NSUTF8StringEncoding, null);
  return s ? ObjC.unwrap(s) : '';
}
function touchEnabled() {
  return /^\s*auth\s+sufficient\s+pam_tid\.so\s*(?:#.*)?$/m.test(automaticConfig());
}
function touchCommand(command) {
  // Apple's pam_tid explicitly skips its UI for sudo askpass (-A) mode.
  // Allow PAM's system biometric UI, but provide no shell-password input.
  return '/usr/bin/env -u SUDO_ASKPASS /usr/bin/sudo -k -S -p '+sq('')+' /bin/sh -c '+sq(command)+' </dev/null';
}
function authorize(command, policy, app) {
  if (policy === 'touchIdPreferred' && touchEnabled()) {
    try {
      return app.doShellScript(touchCommand(command));
    } catch (_) {
      // Touch ID may be unavailable after restart or in a remote session.
    }
  }
  return app.doShellScript(command, {administratorPrivileges:true});
}
function enableCommand() {
  return 'set -eu\n' +
    'if [ -e /etc/pam.d/sudo_local ]; then /usr/bin/printf "sudo_local 已存在，请重新检查\\n" >&2; exit 1; fi\n' +
    'umask 022\n' +
    '/usr/bin/printf "%s\\n" "# Touch ID for sudo; enabled by Mac Region Switcher" "auth sufficient pam_tid.so" > /etc/pam.d/sudo_local\n' +
    '/usr/sbin/chown root:wheel /etc/pam.d/sudo_local\n' +
    '/bin/chmod 444 /etc/pam.d/sudo_local';
}
function enableTouch(app) {
  if (touchEnabled()) return 'Touch ID 的 sudo 授权已启用。';
  var existing = automaticConfig();
  if (existing) throw new Error('/etc/pam.d/sudo_local 已有自定义配置。请管理员合并 auth sufficient pam_tid.so；工具不会覆盖现有配置。');
  // First setup always uses the normal OS administrator authorization.
  try { app.doShellScript(enableCommand(), {administratorPrivileges:true}); }
  catch(e) {
    if(/Operation not permitted|not authorized|不允许|不允許/.test(String(e))) {
      throw new Error('macOS 拒绝从此应用修改 sudo 认证配置，Touch ID 尚未启用。密码授权仍可用。请你在本机双击 Resources/手动首次启用TouchID.command 完成设置，再使用“检测 Touch ID 授权”。');
    }
    throw e;
  }
  if (!touchEnabled()) throw new Error('写入后未能读到 Touch ID 配置');
  return 'Touch ID 的 sudo 授权已启用；本机终端中的 sudo 也会受此设置影响。';
}
function run(argv) {
  var app = Application.currentApplication(); app.includeStandardAdditions = true;
  if (argv[0] === 'status') return touchEnabled() ? 'Touch ID sudo 配置：已启用（实际可用性需检测）' : 'Touch ID sudo 配置：未启用（可使用密码）';
  if (argv[0] === 'print-test-command') return touchCommand('/usr/bin/id -u');
  if (argv[0] === 'print-enable-command') return enableCommand();
  if (argv[0] === 'enable') {
    app.displayDialog('启用后，本工具和终端 sudo 都可以尝试使用 Touch ID。首次设置需要 Mac 管理员密码；密码验证仍保留。', {withTitle:'启用 Touch ID',buttons:['取消','继续'],defaultButton:'继续',cancelButton:'取消'});
    return app.displayDialog(enableTouch(app),{buttons:['好'],defaultButton:'好'});
  }
  if (argv[0] === 'test') {
    if (!touchEnabled()) throw new Error('请先启用 Touch ID');
    app.displayDialog('开始后请留意系统指纹弹窗，并用已登记的手指触摸 Touch ID。\n本测试只读取管理员进程的用户编号，不修改地区、时区或网络，也不调用工具的密码回退。',{withTitle:'检测 Touch ID 授权',buttons:['取消','开始检测'],defaultButton:'开始检测',cancelButton:'取消'});
    try {
      var uid=app.doShellScript(touchCommand('/usr/bin/id -u')).trim();
      if(uid!=='0')throw new Error('管理员身份回读未匹配');
      app.displayDialog('系统授权已通过，管理员身份回读为 0。若刚才使用的是指纹，Touch ID 路径即已通过。本次未修改地区、时区或网络，未调用工具的密码回退。',{withTitle:'授权检测结果',buttons:['好'],defaultButton:'好'});
      return '系统授权测试通过：管理员身份 0';
    } catch (e) {
      throw new Error('本次指纹授权未完成，未调用工具的密码回退。\n系统返回：'+(e.message||String(e)));
    }
  }
  throw new Error('无效授权操作');
}
