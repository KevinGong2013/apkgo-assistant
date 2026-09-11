# apkgo 助手

Chrome / Edge 扩展。打开华为、小米、OPPO、vivo、荣耀、应用宝等开放平台后台时，它在页面右下角带你找到 API 密钥那一页，点一下采集，直接保存到 [apkgo cloud](https://apkgo.baici.tech) 并验证。之后发布就由 apkgo 代你提交到各家商店。

开源（MIT），**只连 apkgo，不连任何第三方**。密钥采集后只在浏览器会话内存里暂存，保存成功立即清除。

## 支持的商店

| 商店 | 采集 | 说明 |
|---|---|---|
| 华为 AppGallery | 服务账号 JSON 文件 | 需团队管理员 |
| 小米 | 邮箱、私钥、公钥证书文件 | 需主账号，首次通常要联系客服开通 |
| OPPO | client_id / client_secret | 需企业开发者，团队账号用管理员登录 |
| vivo | access_key / access_secret | 需主账号 |
| 荣耀 | client_id / client_secret | |
| 应用宝 | user_id / access_secret / app_id | API 发布接口要申请开通并等审核 |
| 魅族 | client_id / client_secret | |
| Samsung | Service Account ID / 私钥 PEM / Content ID | |
| App Store | Issuer ID / Key ID / .p8 | 需 Account Holder 或 Admin |
| Google Play | 仅引导 | 请在 apkgo 添加页上传服务账号 JSON |

各家后台会改版，菜单名和入口以实际为准。发现对不上，改 [`src/recipes.js`](src/recipes.js) 提个 PR 就行，一家商店就是一个对象。

## 安装

- Chrome 商店 / Edge 商店：上架后在这里补链接。
- 手动加载：到 [Releases](https://github.com/KevinGong2013/apkgo-assistant/releases/latest) 下载 zip 并解压 → 浏览器打开 `chrome://extensions`（Edge 是 `edge://extensions`）→ 打开「开发者模式」→「加载已解压的扩展程序」→ 选解压出来的文件夹。

## 使用

1. 登录 apkgo，进「商店账号 → 添加」，在商店表单上方点 **「连接助手」**。这一步会签发一把只能「新建商店账号」的密钥并交给扩展，你不用复制任何东西。
2. 点 **「前往 X 后台采集」**，或者自己打开那家后台。页面右下角出现绿色助手按钮。
3. 面板里是这一家的前置条件和步骤。走到显示密钥的那一页，点「自动识别本页」，或者对每个字段点「点选」再点页面上的值；文件类的密钥（华为 JSON、小米证书、.p8）直接选文件。
4. 点 **「保存到 apkgo 并验证」**。apkgo 会连一次该商店确认密钥可用，结果就地显示；失败会给出下一步该做什么。

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
