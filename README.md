# apkgo 助手

Chrome / Edge 扩展。打开华为、小米、OPPO、vivo、荣耀、应用宝等开放平台后台时，页面下方出现助手按钮：华为、小米、OPPO、vivo、荣耀五家点一下「一键获取密钥」就拿到 API 密钥并直接保存到 [apkgo cloud](https://apkgo.baici.tech) 验证；其余商店它带你找到密钥那一页，自动识别或点选采集。之后发布就由 apkgo 代你提交到各家商店。

开源（MIT），**只连 apkgo，不连任何第三方**。密钥采集后只在浏览器会话内存里暂存，保存成功立即清除。

## 支持的商店

| 商店 | 方式 | 状态（2026-09-15） |
|---|---|---|
| 华为 AppGallery | **一键获取**：跳到 Connect API → 打开创建 Service Account 弹窗并填好（开发者级 · APP管理员）→ **你点「确认」** → 抓到下载的 JSON → 自动保存验证 | ✅ 真实后台跑通 |
| 小米 | **一键获取**：后台接口读出开发者邮箱，页面提取私钥（没有就自动生成）→ 自动保存验证；完成后可「重置私钥并重新保存」 | ✅ 真实后台跑通 |
| OPPO | **一键获取**：直达「生态应用」页，用后台自己的接口读取服务端应用凭据，没有就新建一个 → 提取 Client ID / Secret → 自动保存验证 | ✅ 真实后台跑通 |
| vivo | **一键获取**：用后台自己的接口读取 Access Key / Secret → 自动保存验证；未开通时跳到开通页并高亮「立即开通」 | ✅ 真实后台跑通 |
| 荣耀 | **一键获取**：在凭据页用后台接口生成 API 客户端并读出 Client ID / Secret → 自动保存验证 | 🟡 已实现，待真实后台确认 |
| 应用宝 | 引导 + 采集：user_id / access_secret / app_id | ⚠️ 步骤按文档写，未实登核对 |
| 魅族 | 引导 + 采集：client_id / client_secret | ⚠️ 未实登核对 |
| Samsung | 引导 + 采集：Service Account ID / 私钥 PEM / Content ID | ⚠️ 未实登核对 |
| App Store | 引导 + 采集：Issuer ID / Key ID / .p8 | ⚠️ 未实登核对 |
| Google Play | 仅引导，请在 apkgo 添加页上传 JSON | — |

一键获取前会先检查登录状态，没登录会明确提示。「未实登核对」的商店，面板里的菜单名和入口 URL 来自官方文档与社区教程，改版了对不上就改 [`src/recipes.js`](src/recipes.js)，一家商店就是一个对象；补上 `flow` 和 `actions` 就能变成一键。

## 安装

- Chrome 商店 / Edge 商店：上架后在这里补链接。
- 手动加载：到 [Releases](https://github.com/KevinGong2013/apkgo-assistant/releases/latest) 下载 zip 并解压 → 浏览器打开 `chrome://extensions`（Edge 是 `edge://extensions`）→ 打开「开发者模式」→「加载已解压的扩展程序」→ 选解压出来的文件夹。

## 使用

1. 登录 apkgo，进「商店账号 → 添加」，在商店表单上方点 **「连接助手」**。这一步会签发一把只能「新建商店账号」的密钥并交给扩展，你不用复制任何东西。
2. 点 **「前往 X 后台采集」**，或者自己打开那家后台。页面下方出现助手按钮和气泡，点开面板。
3. **一键商店**（华为、小米、OPPO、vivo、荣耀）：填个备注名（可选），点「一键获取密钥」，看进度条走完。华为中间会停一下等你点弹窗上的「确认」，其余四家全程不用碰页面。
4. **其他商店**：面板列出这家的前置条件和该点的菜单；走到显示密钥的那一页，点「自动识别本页」，或对每个字段点「点选」再点页面上的值，文件类密钥直接选文件，然后点「保存到 apkgo 并验证」。
5. 结果就地显示。apkgo 会连一次该商店确认密钥可用，失败会给出下一步该做什么。

## 一键获取密钥是怎么工作的

两种路子，取决于那家后台给了什么。

**接口直取**（小米、OPPO、vivo、荣耀）：这些后台的网页本身就是靠一组内部接口在读写密钥（比如 OPPO 的 `/myapi/server/app-list`、vivo 的 `/webapi/access/detail`、荣耀的 `/portal/auth/genAuthenticate`）。扩展在你已登录的页面里，以你的会话直接调这些接口读出（没有则创建）凭据，跳过一切点点点，几秒钟就保存验证完。请求只发往那家后台自己的域名。

**页面代填 + 抓下载**（华为）：AGC 的密钥是一次性下载的 JSON，没有可读的接口，于是：

1. **跳页**：不在密钥页就先跳到 `用户与访问 → API密钥 → Connect API`，落地后自动继续。
2. **填弹窗**：在同源 iframe 里点开「创建」，等异步渲染的角色列表出现，填名称、选「开发者级」、勾「APP管理员」，把「确认」按钮描上绿框。面板收起让位，提示挪到页面顶部。
3. **你点「确认」**：这一下真正在你的开发者账号里创建密钥，扩展不替你点。
4. **抓下载**：扩展事先在页面主世界挂了钩子（`chrome.scripting` MAIN world），覆盖 blob、`<a download>`、带 attachment 头的 fetch / XHR，外加 `chrome.downloads` 事件；AGC 一下载 JSON，内容直接进面板。同一次下载被多条路径抓到会按内容去重。
5. **自动保存验证**：调 apkgo 新建凭证，服务端连华为验证一次，结果显示在面板进度里。

失败时面板底部的「手动模式」会自动展开（接口直取的商店没有手动模式）：完整步骤、每步单独的「帮我点」、自动识别、点选、选文件都在里面。

## 写一份配方

`src/recipes.js` 里每家商店一个对象：

```js
{
  id: "oppo", cn: "OPPO", product: "OPPO 开放平台",
  hostRe: /(^|\.)open\.oppomobile\.com$/,     // 在哪些域名上注入
  console: "https://open.oppomobile.com/new/ecological/app",  // 密钥页入口（「跳到密钥页」用）
  prereq: ["需要企业开发者账号"],                 // 前置条件
  steps: [{ t: "管理中心 → API 密钥管理", d: "说明", action: "open-create" }],  // 带 action 的步骤旁边有「帮我点」
  fields: [
    { key: "client_id", label: "Client ID", kind: "text", hints: [/client[\s_-]*id/i], pattern: /^\d{4,}$/, required: true },
    { key: "service_account", label: "JSON 文件", kind: "file-b64", capture: { name: /\.json$/i } },  // capture：下载自动抓取
  ],
  flow: ["fetch-key"],                          // 有 flow 才显示「一键获取密钥」，按顺序跑 actions
  actions: {
    "fetch-key": async (h) => { /* 用 fetch 调后台接口，或 h.byText / h.setInput / h.highlight / h.waitFor 操作页面；返回给用户看的一句话 */ },
  },
  // 可选：
  preload: async (h) => ({ email: "…" }),       // 面板打开时预填字段（比如从接口读到的账号邮箱）
  detect: async (h) => ({ client_id: "…" }),    // 「自动识别」时优先跑它，再跑 hints 的通用识别
  noManual: true,                               // 不显示「手动模式」（接口直取的商店用）
  hideWizardFields: true,                       // 向导里不显示必填字段（全部由 actions 填）
  progressOrder: ["goto", "filling", "saving", "done"],   // 进度条步骤（默认含 confirm / captured）
  progressLabels: { filling: "自动获取 Client ID 与 Secret" },
  wizardHint: "…", doneHint: "…", doneBtnText: "重新获取并保存",
}
```

- `kind`：`text` / `secret` / `multiline`（PEM）/ `file-b64` / `file-text`。字段 `key` 必须等于 apkgo store schema 的 key（`GET https://apkgo.baici.tech/api/v1/stores/schemas`）。
- `hints` 是自动识别时匹配页面标签文字的正则，`pattern` 过滤识别到的值。
- `actions` 里拿到的 `h` 会跨同源 iframe 查找；需要用户亲手确认的按钮请 `h.highlight()` 而不是点它。
- 网页传来的商店名带别名：`harmony` / `harmonyos` → 华为，`google` / `play` → Google Play，`apple` / `ios` → App Store。
- 改完跑 `npm run e2e`，再在真实后台过一遍。

## 安全与隐私

- **网络**：扩展向外只连你连接时所在的 apkgo 地址（默认 `https://apkgo.baici.tech`），这部分请求集中在 [`src/background.js`](src/background.js) 一个文件里。接口直取的商店会在你已登录的后台页面里调用**那家后台自己的**接口（同站、带你的会话），地址都写在 [`src/recipes.js`](src/recipes.js) 对应商店的配方里，只在你点「一键获取密钥」后发生。除这两处之外没有任何网络地址。
- **密钥**：采集到的商店密钥放 `chrome.storage.session`，关浏览器就没了；保存成功立即清除；从不写入磁盘、从不进 URL。
- **apkgo 令牌**：连接时签发的密钥权限只有 `credential:create`，只能往你的组织里新建一个商店账号，不能读、列、删任何东西。它显示在 apkgo「API 密钥」页，标着「浏览器助手」，随时可吊销。重新连接会自动吊销上一把。
- **页面权限**：只在上表列出的后台域名和 apkgo 域名上注入脚本，清单里一目了然；没有 `tabs`、没有 `<all_urls>`。
- **可复现构建**：`python3 scripts/build.py` 打出的 zip 字节固定；Release 页附 sha256，商店上架的就是这个 zip。想核对就 clone 下来自己打一遍。

私有化部署的 apkgo 地址不在默认列表里，第一次连接后扩展弹窗里会有一个「允许访问 <地址>」按钮，点一次即可。

## 开发

```bash
git clone https://github.com/KevinGong2013/apkgo-assistant
# chrome://extensions → 开发者模式 → 加载已解压的扩展程序 → 选这个目录
python3 scripts/build.py   # 打 zip 到 dist/
```

本地跑 apkgo-cloud 时（`http://localhost:9090`），清单里已经包含 `http://localhost/*`，直接在本地添加页点「连接助手」即可。

目录：

- `manifest.json` — MV3 清单，权限都在这里。
- `src/recipes.js` — 每家商店的域名、入口、步骤、字段、自动识别规则。
- `src/content/console.js` — 后台页面上的面板：引导、采集、保存。
- `src/content/bridge.js` — apkgo 网页和扩展之间的桥（`window.postMessage`）。
- `src/background.js` — 唯一发网络请求的地方。
- `src/popup/` — 工具栏弹窗：连接状态、打开面板、前往后台。

## 端到端测试

不用手动装扩展：`npm install && npx playwright install chromium && npm run e2e`。脚本用真 Chromium 加载真正的扩展，起一个伪 apkgo 服务（配对页 + 两个 Open API 端点），把 `open.oppomobile.com` 和 `developer.huawei.com` 拦截成伪造的后台页（`test/e2e/fixtures/`），然后走完：配对 → OPPO 一键获取（接口直取）→ 华为一键获取（代填弹窗、模拟用户点确认、抓下载、自动保存）→ 弹窗。截图落在 `dist/shots/`，商店截图就是这么来的。

## 发布到商店

首发要在两家后台手动做一次（注册开发者、建条目、填商店列表和隐私表单、传截图），材料都在 [`store/listing.md`](store/listing.md)。之后每个版本全自动：打 tag → Release 出 zip → [`publish.yml`](.github/workflows/publish.yml) 把同一个 zip 传到 Chrome Web Store 和 Edge Add-ons 并提交审核。

一次性配置（在本机跑，拿到的值填进仓库 Secrets）：

```bash
# Chrome：Google Cloud 控制台建一个 OAuth「桌面应用」客户端，然后
npx publish-browser-extension@3 init     # 引导你完成授权，输出 CHROME_REFRESH_TOKEN 等
# Edge：Partner Center → 发布 API → 生成 API key，得到 EDGE_PRODUCT_ID / EDGE_CLIENT_ID / EDGE_API_KEY
gh secret set CHROME_EXTENSION_ID   # 依次把 7 个值设进去
```

## 许可证

MIT
