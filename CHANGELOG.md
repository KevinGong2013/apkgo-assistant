# 更新记录

## 未发布

- **应用宝**：支持一键获取——从「账号管理 → API发布接口」页读出 access_secret，开发者 ID 从页面登录信息（`$loginInfo`）里取，整份应用列表（包名 → App ID）从后台自己的返回里取，无需手填；取不到时才回退到手填一行。
- 新增页面返回记录器（`world: "MAIN"` content script）：按字段名从后台自己的 JSON 返回里取值，不写死接口地址；配方新增 `h.storage()` / `h.responses()` / `h.deepFind()` / `h.scanText()` / `h.reloadAndResume()`、字段的 `auto` 标记、`validate(draft)` 钩子，`finalize` 增加第二个参数（完整草稿）。
- 网页传来的商店名支持别名（`harmony` / `harmonyos` / `hongmeng` → 华为，`google` / `play` → Google Play，`apple` / `ios` → App Store）；「前往后台」没有配方时退回网页给的 URL，并回一条 ack。
- README：各商店状态、两种一键路子（接口直取 / 代填抓下载）、配方全部可选项。

## 0.3.0 · 2026-09-11

- **小米开放平台**：支持一键获取密钥，自动提取现有凭证，无凭证时自动触发创建并引导确认，保存到 apkgo 验证。
- **OPPO 开放平台**：支持纯官方后台接口（`/myapi/server/app-list`、`/myapi/server/app-add`）极速获取或创建服务端应用凭据，直达生态应用页，零 UI 干扰。
- **vivo 开放平台**：支持纯官方接口（`/webapi/access/detail`）一键获取 Access Key 与 Access Secret，未开通时友好跳转并高亮「立即开通」。
- **荣耀开发者服务平台**：支持通过官方接口两步生成并提取 Client ID 与 Client Secret，保存至 apkgo 并验证。
- **登录状态预检**：各大平台一键获取前统一预检登录状态，未登录时给出明确提示。

## 0.2.0 · 2026-09-11

- **一键获取密钥**（华为）：跳页 → 打开创建弹窗并填好 → 用户只点「确认」→ 抓到下载的 JSON → 自动保存验证。真实 AppGallery Connect 上跑通。
- 下载自动抓取：主世界钩子（blob / `<a download>` / attachment fetch+XHR）+ `chrome.downloads` 事件，按内容去重；新增 `scripting`、`downloads` 权限。
- 面板：一键商店改成向导（备注名 + 按钮 + 五步进度），手动步骤和选文件折叠；「帮我点」执行后面板收起让位，提示挪到顶部。
- 启动按钮改成底部偏右居中的药丸（图标 + 文字），滑入 + 光环 + 弹跳，上方引导气泡；点开过就安静。
- 识别与点选支持同源 iframe（AGC 正文在 iframe 里）；值和「复制」按钮同格时也能识别。
- 华为配方按实登路径改写：`用户与访问 → API密钥 → Connect API`，角色列表异步渲染要等。
- 端到端测试进仓库：`npm run e2e`（真扩展 + 伪 apkgo + 拦截伪造的 OPPO / AGC 页）。
- 商店上架材料 `store/`、自动发布 workflow `publish.yml`。

## 0.1.0 · 2026-09-11

- 首个版本：九家商店的步骤引导，自动识别 / 点选采集，直接保存到 apkgo 并验证；与网页 postMessage 配对，密钥权限仅 `credential:create`；可复现构建。
