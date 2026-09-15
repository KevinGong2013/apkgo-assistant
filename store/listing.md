> **注意**：项目已改为自建托管（七牛 CDN + 手动加载），**不再提交 Chrome / Edge 商店**。
> 本文件保留下来是因为里面的描述、权限说明、隐私表单答案仍然是对外沟通的现成素材；
> 哪天决定上架，照着填即可。截图和宣传图在同目录下。

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

## 图片素材

- **图标**：`icons/128.png`（128×128）
- **小宣传图**（Chrome 可选，Edge 不需要）：`store/promo-440x280.png`（440×280）
- **截图**（1280×800，按顺序上传，`store/screenshots/`）：
  1. `01-助手入口.png` — 商店后台页面下方的助手按钮与引导气泡
  2. `02-华为一键填好等你确认.png` — 华为创建弹窗已自动填好，「确认」留给用户
  3. `03-自动抓到密钥并保存.png` — 下载的密钥自动进面板并保存验证
  4. `04-应用宝一键.png` — 应用宝两段式流程
  5. `05-弹窗与连接状态.png` — 工具栏弹窗：连接状态与已适配商店

截图由端到端测试生成（`npm run e2e`，落在 `dist/shots/`），页面是伪造的后台，不含任何真实密钥或账号信息。

## 提交流程

首次上架必须在两家后台手动做一次（注册开发者、建条目、填商店列表与隐私表单、传截图）。上架后每个版本走 [`publish.yml`](../.github/workflows/publish.yml) 自动发。

### Chrome Web Store

后台：https://chrome.google.com/webstore/devconsole

1. Google 账号注册开发者，一次性 5 美元。
2. 「新增项目」→ 上传 `apkgo-assistant-<版本>.zip`（Release 页下载，别自己重新打包）。
3. **商店发布信息**：名称、简介、详细描述、类别「开发者工具」、语言「中文（简体）」，图标 128×128，截图 5 张，小宣传图 440×280（可选）。
4. **隐私权规范**（审核最容易卡的一页，逐项对应本文上面的段落）：
   - 单一用途说明
   - 每个权限的用途：`storage`、`scripting`、`downloads`、六家商店后台域名、apkgo 域名、可选站点权限
   - 远程代码：**否**（扩展不加载任何远程脚本）
   - 数据用途：勾「身份验证信息」，用途只勾「实现扩展的单一用途」；不出售、不用于无关用途、不用于信用评估
   - 隐私政策 URL：https://github.com/KevinGong2013/apkgo-assistant/blob/main/PRIVACY.md
5. 提交审核，通常 1–3 个工作日。

### Edge Add-ons

后台：https://partner.microsoft.com/dashboard/microsoftedge

1. 微软账号注册 Partner Center，免费。
2. 「创建新扩展」→ 上传**同一个 zip**。
3. 「可用性」选公开与目标市场；「属性」填类别、隐私政策 URL、支持链接（仓库地址）。
4. 「商店列表」填名称、简介、描述、截图。
5. 提交认证，通常 1–7 个工作日。

### 上架之后

1. 把两个商店链接填进 apkgo-cloud 的 `web/src/lib/assistant.ts`（`ASSISTANT_CHROME_STORE_URL` / `ASSISTANT_EDGE_STORE_URL`），添加商店账号页就会显示对应入口。
2. 配好 7 个仓库 Secret，之后打 tag 即自动发新版本：

   ```bash
   npx publish-browser-extension@3 init   # Chrome：拿 refresh token
   gh secret set CHROME_EXTENSION_ID      # 依次设置 7 个值
   ```

   Chrome 需要 `CHROME_EXTENSION_ID`、`CHROME_CLIENT_ID`、`CHROME_CLIENT_SECRET`、`CHROME_REFRESH_TOKEN`；
   Edge 需要 `EDGE_PRODUCT_ID`、`EDGE_CLIENT_ID`、`EDGE_API_KEY`（Partner Center → 发布 API）。

### 审核可能被问到的两件事

- **为什么需要读取商店后台页面？** 扩展的唯一功能就是在这些页面上帮用户取回他自己的 API 密钥；host 权限只申请了这六家后台加 apkgo 自己的域名，没有 `<all_urls>`。
- **为什么会读取页面的接口返回和本地存储？** 部分后台（应用宝）把开发者 ID 只放在自己的接口返回和 `localStorage` 里。助手仅在用户点「一键获取密钥」后读取，且只取声明好的字段，其余立即丢弃，不外发、不落盘。详见隐私说明。
