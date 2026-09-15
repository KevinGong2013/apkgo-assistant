# 商店上架材料（Chrome Web Store / Edge Add-ons）

两家商店用同一个 zip：Release 页的 `apkgo-assistant-<版本>.zip`。下面的文案直接粘贴。

## 基本信息

- **名称**：apkgo 助手
- **一句话简介（Summary，≤132 字符）**：在华为、小米、OPPO、vivo、荣耀、应用宝等开放平台后台里带你找到 API 密钥，一键采集并保存到 apkgo cloud 验证。开源，只连 apkgo。
- **类别**：开发者工具（Developer Tools）
- **语言**：中文（简体）
- **官网 / 支持链接**：https://github.com/KevinGong2013/apkgo-assistant
- **隐私政策 URL**：https://github.com/KevinGong2013/apkgo-assistant/blob/main/PRIVACY.md
- **图标**：`icons/128.png`（商店要 128×128）

## 详细描述（Description）

apkgo 助手是 apkgo cloud 的配套扩展。apkgo cloud 帮你把安装包一次提交到多家应用商店，但第一步「去每家开放平台后台拿 API 密钥」一直最麻烦：每家菜单不一样、要主账号、有的还要申请开通。这个扩展把这一步做顺：

• 打开华为、小米、OPPO、vivo、荣耀、应用宝六家开发者后台时，页面下方出现助手按钮，面板里是这家的前置条件和该点的菜单。
• 华为、小米、OPPO、vivo、荣耀、应用宝支持「一键获取密钥」：小米、OPPO、vivo、荣耀直接通过后台自己的接口读出凭据并保存验证，几秒完成；华为由扩展跳到密钥页、打开创建弹窗并填好，你只需点一下「确认」；应用宝分两步，中间你点一下跳到应用列表页。全程密钥自动抓取、保存、验证。
• 点「保存到 apkgo 并验证」，apkgo 会连一次该商店确认密钥可用，结果就地显示，不用来回切页面。

安全与隐私：
• 只向你连接时所在的 apkgo 地址发请求，不连任何第三方。
• 采集到的密钥只在浏览器会话内存里暂存，保存成功立即清除，从不落盘。
• 连接 apkgo 时签发的令牌权限只有「新建商店账号」，不能读取、列出或删除任何数据，可随时在 apkgo 后台吊销。
• 开源（MIT），可复现构建：商店里的版本和 GitHub Release 的 zip 字节一致，附 sha256。

使用前需要一个 apkgo cloud 账号：https://apkgo.baici.tech

## 权限用途说明（商店审核会问）

| 权限 | 用途 |
|---|---|
| `storage` | 保存连接 apkgo 的令牌（local）和采集中的密钥草稿（session，关浏览器即清）。 |
| `scripting` | 在商店后台页面注入一个下载钩子（主世界），页面下载密钥文件时把内容填进面板，免去文件对话框。只读页面自己发起的下载。 |
| `downloads` | 识别刚发生的密钥文件下载（.json/.cer/.pem/.p8），配合钩子；不读取其他下载。 |
| 页面返回记录器 | 在商店后台页面自己的世界里暂存该页面发出的 JSON 返回（40 条 / 64KB 上限，关页即清），仅在用户点「一键获取密钥」后读取声明好的字段（如应用宝的开发者 ID），其余丢弃、不外发。|
| 各商店后台域名（host permissions） | 只列已适配的六家（华为、小米、OPPO、vivo、荣耀、应用宝）的开发者后台域名，用于显示助手面板并按用户操作读取密钥字段。没有 `<all_urls>`。 |
| `https://apkgo.baici.tech/*`、`http://localhost/*` | 让 apkgo 网页把令牌交给扩展；localhost 供本地开发。 |
| 可选站点权限（optional_host_permissions） | 仅当用户把扩展连接到私有化部署的 apkgo 地址时，由用户手动授权。 |

远程代码：无。扩展不加载任何远程脚本。

数据使用声明（Chrome Web Store「隐私权规范」表单）：
- 收集「身份验证信息」（商店 API 密钥、apkgo 令牌）：是；用途仅为扩展的核心功能；不出售、不用于与核心功能无关的目的、不用于信用评估。
- 其余类别（个人信息、健康、财务、位置、网络历史、用户活动、网站内容）：否。

## 单一用途说明（Single purpose）

帮助 apkgo cloud 用户从各应用商店开放平台后台获取 API 密钥并保存到 apkgo cloud。

## 截图

商店要求 1280×800 或 640×400，PNG/JPEG，1 到 5 张。`store/screenshots/` 里的图按顺序上传：

1. `01-panel.png` — OPPO 后台上的助手面板：步骤 + 采集表单。
2. `02-detected.png` — 自动识别到密钥后。
3. `03-saved.png` — 保存并验证通过。

## 提交流程

**Chrome Web Store**（https://chrome.google.com/webstore/devconsole）
1. 首次要用 Google 账号注册开发者并付一次性 5 美元。
2. 「新增项目」→ 上传 zip → 填上面的名称、简介、描述、类别、图标、截图。
3. 「隐私权规范」标签页：单一用途、权限用途、数据使用声明，按上面填；隐私政策 URL 填 PRIVACY.md 链接。
4. 提交审核，通常 1 到 3 个工作日。

**Edge Add-ons**（https://partner.microsoft.com/dashboard/microsoftedge）
1. 微软账号注册 Partner Center，免费。
2. 「创建新扩展」→ 上传同一个 zip → 属性里选类别、填隐私政策 URL 和支持链接 → 商店列表里填名称、描述、截图。
3. 提交认证，通常 1 到 7 个工作日。

两家审核通过后，把商店链接填到 apkgo-cloud 的 `web/src/lib/assistant.ts` 里 `ASSISTANT_CHROME_STORE_URL` / `ASSISTANT_EDGE_STORE_URL`，添加页就会显示对应入口。
