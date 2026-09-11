# apkgo 助手

Chrome / Edge 扩展。打开华为、小米、OPPO、vivo、荣耀、应用宝等开放平台后台时，它在页面右下角带你找到 API 密钥那一页，点一下采集，直接保存到 [apkgo cloud](https://apkgo.baici.tech) 并验证。之后发布就由 apkgo 代你提交到各家商店。

开源（MIT），**只连 apkgo，不连任何第三方**。密钥采集后只在浏览器会话内存里暂存，保存成功立即清除。

## 支持的商店

| 商店 | 方式 | 状态（2026-09-11） |
|---|---|---|
| 华为 AppGallery | **一键获取**：跳到 Connect API → 打开创建 Service Account 弹窗并填好（开发者级 · APP管理员）→ 你点「确认」→ 抓到下载的 JSON → 自动保存验证 | ✅ 真实后台跑通 |
| 小米 | **一键获取**：后台接口自动获取账号邮箱 + 页面自动提取私钥 → 自动保存验证（公钥由 apkgo 内置） | ✅ 真实后台实登核对 |
| OPPO | 采集：client_id / client_secret（自动识别或点选） | ⚠️ 未实登核对 |
| vivo | 采集：access_key / access_secret | ⚠️ 未实登核对 |
| 荣耀 | 采集：client_id / client_secret | ⚠️ 未实登核对 |
| 应用宝 | 采集：user_id / access_secret / app_id | ⚠️ 未实登核对 |
| 魅族 | 采集：client_id / client_secret | ⚠️ 未实登核对 |
| Samsung | 采集：Service Account ID / 私钥 PEM / Content ID | ⚠️ 未实登核对 |
| App Store | 采集：Issuer ID / Key ID / .p8 | ⚠️ 未实登核对 |
| Google Play | 仅引导，请在 apkgo 添加页上传 JSON | — |

「未实登核对」的商店，面板里的菜单名和入口 URL 来自官方文档与社区教程，改版了对不上就改 [`src/recipes.js`](src/recipes.js)，一家商店就是一个对象。华为这套「一键获取」机制是通用的，其他商店补上 `flow` 和 `actions` 就能用同样的方式。

## 安装

- Chrome 商店 / Edge 商店：上架后在这里补链接。
- 手动加载：到 [Releases](https://github.com/KevinGong2013/apkgo-assistant/releases/latest) 下载 zip 并解压 → 浏览器打开 `chrome://extensions`（Edge 是 `edge://extensions`）→ 打开「开发者模式」→「加载已解压的扩展程序」→ 选解压出来的文件夹。

## 使用

1. 登录 apkgo，进「商店账号 → 添加」，在商店表单上方点 **「连接助手」**。这一步会签发一把只能「新建商店账号」的密钥并交给扩展，你不用复制任何东西。
2. 点 **「前往 X 后台采集」**，或者自己打开那家后台。页面右下角出现绿色助手按钮。
3. 面板顶上有「一键获取密钥」：扩展跳到密钥页、打开创建弹窗并填好名称和角色，**唯一留给你的是弹窗上的「确认」**（那一下真正在你的账号里创建密钥，扩展不替你点）。之后页面一下载密钥文件，面板自动抓到、自动保存并验证，不用选文件也不用再点保存。每一步旁边也有单独的「帮我点」。走到显示密钥的那一页，点「自动识别本页」，或者对每个字段点「点选」再点页面上的值；文件类的密钥（华为 JSON、小米证书、.p8）直接选文件。
4. 点 **「保存到 apkgo 并验证」**。apkgo 会连一次该商店确认密钥可用，结果就地显示；失败会给出下一步该做什么。

## 一键获取密钥是怎么工作的

以华为为例，点「一键获取密钥」后：

1. **跳页**：不在密钥页就先跳到 `用户与访问 → API密钥 → Connect API`，落地后自动继续。
2. **填弹窗**：在同源 iframe 里找到「创建」按钮点开，等异步渲染的角色列表出现，填名称、选「开发者级」、勾「APP管理员」，把「确认」按钮描上绿框。面板收起让位，提示挪到页面顶部。
3. **你点「确认」**：这是整个流程里唯一留给用户的动作，它真正在你的开发者账号里创建密钥，扩展不替你点。
4. **抓下载**：扩展事先在页面主世界挂了钩子（`chrome.scripting` MAIN world），覆盖 blob、`<a download>`、带 attachment 头的 fetch / XHR，外加 `chrome.downloads` 事件；AGC 一下载 JSON，内容直接进面板，不用选文件。同一次下载被多条路径抓到会按内容去重。
5. **自动保存验证**：调 apkgo 新建凭证，服务端连华为验证一次，结果显示在面板进度里。

失败时面板底部的「手动模式」会自动展开：完整步骤、每步单独的「帮我点」、自动识别、点选、选文件都在里面。

## 写一份配方

`src/recipes.js` 里每家商店一个对象：

```js
{
  id: "oppo", cn: "OPPO", product: "OPPO 开放平台",
  hostRe: /(^|\.)open\.oppomobile\.com$/,     // 在哪些域名上注入
  console: "https://open.oppomobile.com/",      // 密钥页入口（「跳到密钥页」用）
  prereq: ["需要企业开发者账号"],                 // 前置条件
  steps: [{ t: "管理中心 → API 密钥管理", d: "说明", action: "open-create" }],  // 带 action 的步骤旁边有「帮我点」
  fields: [
    { key: "client_id", label: "Client ID", kind: "text", hints: [/client[\s_-]*id/i], pattern: /^\d{4,}$/, required: true },
    { key: "service_account", label: "JSON 文件", kind: "file-b64", capture: { name: /\.json$/i } },  // capture：下载自动抓取
  ],
  flow: ["open-create"],                        // 有 flow 才显示「一键获取密钥」，按顺序跑 actions
  actions: {
    "open-create": async (h) => { /* h.byText / h.setInput / h.highlight / h.waitFor / h.docs()，返回给用户看的一句话 */ },
  },
}
```

- `kind`：`text` / `secret` / `multiline`（PEM）/ `file-b64` / `file-text`。字段 `key` 必须等于 apkgo store schema 的 key（`GET https://apkgo.baici.tech/api/v1/stores/schemas`）。
- `hints` 是自动识别时匹配页面标签文字的正则，`pattern` 过滤识别到的值。
- `actions` 里拿到的 `h` 会跨同源 iframe 查找；最后的确认按钮请 `h.highlight()` 而不是点它。
- 改完跑 `npm run e2e`，再在真实后台过一遍。

## 安全与隐私

- **网络**：扩展只向你连接时所在的 apkgo 地址发请求（默认 `https://apkgo.baici.tech`），代码里没有任何别的地址。全部请求集中在 [`src/background.js`](src/background.js) 一个文件里，可以自己看。
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

不用手动装扩展：`npm install && npx playwright install chromium && npm run e2e`。脚本用真 Chromium 加载真正的扩展，起一个伪 apkgo 服务（配对页 + 两个 Open API 端点），把 `open.oppomobile.com` 拦截成一张伪造的「API 密钥管理」页，然后走完配对 → 打开后台 → 自动识别 → 保存成功 / 失败提示 → 弹窗。截图落在 `dist/shots/`，商店截图就是这么来的。

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
