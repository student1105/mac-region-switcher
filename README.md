# Mac Region Switcher · 区域模式一键切换

在 macOS 上切换系统地区、首选语言、时区、指定网卡的 IPv6，以及 Chrome / Safari / Terminal 的语言。内置“东八区简体中文”和“台北繁体中文”，也可以自行添加其他地点与语言。

这是 v0.1.0 预览版，采用 MIT 许可证。运行时完全本地工作，不需要账号、服务器或 API 密钥。

仓库：[student1105/mac-region-switcher](https://github.com/student1105/mac-region-switcher)。下载：[预览版本与运行包](https://github.com/student1105/mac-region-switcher/releases)。

## 快速开始

最低构建目标：macOS 14。当前预编译运行包面向 Apple Silicon（arm64），二进制最低系统标记与应用声明均为 14.0。实际运行仅在 macOS 26.6.2 验证；macOS 14／15 等版本尚未实机验收。Intel Mac 可尝试从源码在本机构建，尚未做 Intel 实机验证。

下载运行包并解压，保留整个“区域模式一键切换”文件夹，把它放到自己的 Applications 目录或其他可写位置，再打开其中的“区域模式一键切换.app”。请勿只复制单个 .app，外部 Resources 与 profiles.json 也是运行所需文件。

从源码构建需要 Xcode Command Line Tools（使用系统 Swift 编译默认浏览器检查组件）。构建后的应用运行不依赖 Python、Node.js 或 Homebrew。

```sh
zsh tests/run.command
zsh scripts/build.command
zsh scripts/install.command
```

安装到用户目录 `~/Applications/区域模式一键切换`，打开里面的“区域模式一键切换.app”即可。已有侧边栏目录入口可继续使用。安装过程不修改系统模式或启用 Touch ID。

应用包使用本地临时签名，尚未取得 Developer ID 签名或 Apple 公证。

自动检查通过以及本机指纹授权通过，并不代表完整系统／浏览器／IPv6 联合切换已在所有设备验收。因此本次以预览版发布。

首次打开会读取本机地区、首选语言、IANA 时区、Chrome 保存的网页语言、已检测到的应用和实体网卡，供用户检查并选择管理范围。首次配置不切换系统；也可以点击“稍后”，从主菜单进入设置。

主菜单显示当前保存配置，所有已保存模式都可自由选择，不限定为内置的两个示例。切换前会显示目标地区、语言、时区和 IPv6 策略，确认后才执行。请先保存浏览器未提交的内容；工具会请求正常退出 Chrome / Safari。

## 不写 JSON 的日常使用

1. “读取本机当前设置”：只读查看当前地区、语言、时区、自动时区开关和网卡 IPv6；地区是系统区域设置，不是地理定位。
2. “选择管理的应用与网卡”：选择这台 Mac 实际要管理的 Chrome、Safari、Terminal 和实体网卡。没有 Chrome 时可不选它；网卡名从当前网络位置读取，不必沿用示例的 Wi-Fi。
3. “读取本机并新建模式”：用当前系统地区、语言和固定时区作为模板，逐项修改名称、地区、语言、网页语言、时区、IPv6。地区、语言与时区独立选择，可使用日本地区配英文与东京时间等组合。
4. 地区、语言和时区可以直接输入标识，或搜索本机提供的列表；语言支持逗号分隔的有序列表。时区支持 IANA 名称搜索，部分常用城市带中文别名。
5. 保存前查看完整目标配置。保存只更新工具自己的模式，主菜单立即显示新模式；点击对应的“切换”并确认才更改系统。

“编辑已有模式”可更改任意模式；“移除已有模式”可移除不需要的示例或自定义模式，至少保留一个。每次保存都先把原 profiles.json 复制到安装目录的“配置备份”；需要恢复时可将相应备份复制回 profiles.json。高级用户仍可直接编辑 JSON。

本机读取用于提供模板，不是完整系统备份：应用会使用模式中的统一语言，已有应用独立语言覆盖、手动 IPv6 地址和自动时区策略不会完整克隆。切换使用固定目标时区，并关闭自动时区。创建时 IPv6 默认建议为大陆 automatic、其他地区 off，用户可以改为 automatic、off 或 keep。

本机读取结果、模式和配置备份只在本地使用。程序没有遥测、上传或账号注册；对外发布时应使用源码中的示例 profiles.json，不要把个人安装目录的配置备份、切换日志或现场读取结果放进仓库。

## 自定义地点、语言与时区

点击菜单中的“高级：编辑 JSON 配置”，修改安装目录的 `profiles.json`，保存后点击“检查配置”。添加模式后无需重新编译应用，模式列表和离线验证页会按配置更新。界面管理模式时也保存到同一文件。

例如，在 `profiles` 数组中增加纽约英文：

```json
{
  "id": "new_york",
  "name": "纽约英文",
  "locale": "en_US",
  "languages": ["en-US", "en"],
  "webLanguages": ["en-US", "en"],
  "timeZone": "America/New_York",
  "ipv6": "off"
}
```

| 字段 | 含义 |
| --- | --- |
| `id` | 唯一的模式标识；小写字母、数字、下划线或连字符 |
| `name` | 应用菜单显示的名称 |
| `locale` | macOS 地区，如 `zh-Hant_TW`、`en_US`、`ja_JP` |
| `languages` | 系统与应用的首选语言，按优先级排列 |
| `webLanguages` | Chrome 网页语言，首项也是浏览器验证的目标语言 |
| `timeZone` | 本机自带的 IANA 时区，如 `Asia/Taipei`、`Europe/London` |
| `ipv6` | `off` 关闭指定网卡 IPv6；`automatic` 设为自动；`keep` 或省略表示保留 |

时区偏移按当前日期计算，支持夏令时。固定东八区使用 `Etc/GMT-8`；IANA 的 Etc/GMT 符号与日常写法相反。

`settings.applications` 可从 `chrome`、`safari`、`terminal` 中选择要处理的应用；没有安装 Chrome 时应移除 `chrome`。`chromeProfile` 指定要修改的 Chrome 配置目录，默认 `Default`，也可用 `Profile 1`。其他 Chrome 配置不受影响。

`defaultBrowser` 默认为 `keep`（保留现有默认浏览器），设为 `chrome` 才会请求将 Chrome 设为默认。`authorization` 默认为 `touchIdPreferred`，也可设为 `password`。

## 切换时管理 IPv6

本预览按所选模式管理 IPv6：中国大陆的“东八区简体中文”为 `"ipv6": "automatic"`（开启自动配置），台北繁体中文为 `"ipv6": "off"`（关闭）。通过界面新建模式时，按所选地区建议大陆 automatic、其他地区 off，保存前可自由调整；直接编辑 JSON 时需自行填写。这按系统地区代码判断，不依赖语言或实际地理位置。

`settings.ipv6Services` 默认为 `["Wi-Fi"]`。切换会通过 macOS 的 `networksetup` 设置该网卡的 IPv6；更改时区和 IPv6 使用同一轮管理员授权。即使时区已经匹配，也会独立检查 IPv6。命令回读和保存配置检查失败会报告未完成。

其他用户可通过“选择管理的应用与网卡”从本机列表选择，也可填写自己在“系统设置 → 网络”中的服务名称，例如 `["Wi-Fi", "USB 10/100/1000 LAN"]`。仅处理当前网络位置中的指定实体网卡，不改 VPN 配置。不存在的服务或 VPN 服务会被拒绝。切换网络位置、改名或增加网卡后，应相应修改配置。

菜单中的“将指定网卡 IPv6 设为自动”可重新打开自动配置；它不恢复原有的手动 IPv6 地址。下一次切换仍会按模式的 `ipv6` 执行；如需永久保留现状，将两套模式改为 `keep`。升级安装保留已有 profiles.json，旧配置没有 IPv6 字段时不会自动关闭网络协议。

主菜单和“查看当前模式”显示网卡的 IPv6 保存配置。网卡设为关闭不等于所有 VPN 隧道都没有 IPv6 出口，也不证明网站只能看到 IPv4。关闭 IPv6 可能影响依赖它的局域网功能，包括部分设备互联功能。安装本身不更改网络。

## Touch ID

先点击“启用 Touch ID”或单独打开“启用TouchID.app”。第一次需要管理员密码，用于在 macOS 自带的 sudo 配置中启用 `pam_tid.so`。这也会影响本机终端 sudo，密码授权仍然保留；本工具不保存密码。

随后可点击“检测 Touch ID 授权”，只做一次指纹授权测试，不切换系统模式。需要你本人触摸传感器。

本实现通过 macOS 自带 PAM 指纹模块发起系统授权。调用使用 `sudo -k -S` 并将标准输入接到 `/dev/null`，让系统可以弹出指纹界面，同时不从脚本读取密码。不使用 `sudo -A`：苹果 [pam_tid 源码](https://github.com/apple-oss-distributions/pam_modules/blob/main/modules/pam_tid/pam_tid.c) 明确在 askpass 模式下跳过指纹界面。早期预览使用过这一错误参数，已修正。

独立检测只运行 `id -u`，回读管理员身份 `0`，不调用工具的密码回退。这个结果证明系统授权成功；是否确实使用指纹，应以用户刚才在系统弹窗中采用的验证方式为准，不能仅凭退出码或配置文件存在就认定指纹通过。失败时保留系统返回的错误，便于区分未提供密码、指纹不可用或会话权限问题。

本次预览已在测试 Mac 上通过真实指纹管理员授权：用户确认使用指纹，程序回读管理员身份 0，未走工具密码回退。其他 Mac 仍应先运行独立检测。

切换时若需要管理员权限，会先尝试 sudo 的 Touch ID；未启用、不可用或验证失败时回退到系统管理员密码弹窗。重启后、远程会话、传感器不可用等情况仍可能要求密码。时区与指定网卡 IPv6 均已匹配时不会重复索取管理员授权。

已有自定义 `/etc/pam.d/sudo_local` 时，工具不会覆盖它，请管理员自行合并 `auth sufficient pam_tid.so`。关闭本工具的指纹优先策略只需把 `authorization` 改为 `password`。若需关闭全局 sudo 的 Touch ID，由管理员移除该配置文件中的 `pam_tid.so` 行。

若首次配置被 macOS 以“Operation not permitted”拦截，请你在本机 Finder 中双击安装目录下 `Resources/手动首次启用TouchID.command`。它会在终端内通过 sudo 完成同一个设置；已经存在的配置仍不会被覆盖。无需授予整盘权限、关闭系统保护或保存密码。

## 验证与限制

“保存配置已匹配”表示系统和应用保存配置回读匹配。Chrome / Safari 打开的离线页才显示实际运行的 Intl、首选语言、时区和偏移；绿色只代表当前这一款浏览器。Terminal 和其他已经运行的应用需完全退出重开才会更新界面语言。

本工具会关闭自动时区，并按配置管理指定网卡 IPv6；系统时间同步不变。它不更换 VPN 节点或修改账号、Cookie，也不保证网站的账号或风控判断。

切换日志保存在 `~/Library/Logs/区域模式一键切换/最近一次切换.log`。分享问题时可自行截取日志，日志不应作为源码提交。

## 项目结构

`profiles.json` 管理模式；`Resources/profiles.js` 校验配置；`Resources/configuration.js` 只读发现本机设置、构造模板并备份保存配置；`Resources/configure-ui.js` 提供首次配置和模式编辑界面；`Resources/authorization.js` 管理授权；`Resources/set-timezone.js` 设置并核验时区；`Resources/ipv6.js` 管理指定网卡 IPv6；`run-mode.command` 串联切换；`Resources/verify.html` 离线检测实际浏览器值。

构建产物提供通用主应用、状态查看与 Touch ID 入口，不再为固定地区生成快捷应用；模式名称、数量和标识均从用户配置读取。旧安装目录已有的地区快捷入口会保留兼容。

单元测试不改系统设置。实机 Touch ID 通过与否、管理员密码回退、系统与浏览器切换结果，需要在实际 Mac 上分别验收。

许可证：MIT。
