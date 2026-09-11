// 真实端到端：真正的扩展 + 真 Chromium + 伪 apkgo 服务 + 拦截出来的伪 OPPO 后台页。
// 用法：npm run e2e（run.mjs 会先起伪 apkgo 服务）。需要 playwright 的 Chromium：npx playwright install chromium
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const HERE = path.dirname(new URL(import.meta.url).pathname);
const EXT = path.resolve(HERE, "../..");
const ORIGIN = "http://localhost:9090";
const KEY = "apkgo_" + "ab".repeat(24);
const OPPO_HTML = fs.readFileSync(path.join(HERE, "fixtures/oppo.html"), "utf8");

const userData = fs.mkdtempSync(path.join(process.env.TMPDIR || "/tmp", "apkgo-e2e-"));
const ctx = await chromium.launchPersistentContext(userData, {
  channel: "chromium", headless: true, viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1,
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
});
const out = { steps: [] };
const step = (name, data) => { out.steps.push({ name, ...data }); console.log("•", name, JSON.stringify(data)); };
try {
  let sw = ctx.serviceWorkers()[0]; if (!sw) sw = await ctx.waitForEvent("serviceworker", { timeout: 15000 });
  step("service worker up", { url: sw.url() });

  // 1. 网页侧协议：hello → ready；pair → paired
  const page = await ctx.newPage();
  await page.goto(`${ORIGIN}/credentials/new?store=oppo`);
  await page.waitForFunction(() => window.__state.ready, null, { timeout: 10000 });
  step("ready", await page.evaluate(() => window.__state.ready));
  await page.evaluate((k) => window.__pair(k), KEY);
  await page.waitForFunction(() => window.__state.paired || window.__state.error, null, { timeout: 10000 });
  step("paired", await page.evaluate(() => ({ paired: window.__state.paired, error: window.__state.error })));

  // 2. open-console → 后台开新标签到 OPPO（被拦截成伪页面），面板应自动打开
  await ctx.route("https://open.oppomobile.com/**", (route) => route.fulfill({ contentType: "text/html; charset=utf-8", body: OPPO_HTML }));
  // 扩展自己 tabs.create 出来的页会抢在 Playwright 路由之前发请求（加载到真站），
  // 所以只用它验证「open-console 真的开了 OPPO 标签」，然后关掉，改由 Playwright 开页。
  const [autoTab] = await Promise.all([ctx.waitForEvent("page", { timeout: 10000 }), page.evaluate(() => window.__open("oppo"))]);
  await autoTab.waitForLoadState("domcontentloaded").catch(() => {});
  step("open-console opened tab", { url: autoTab.url() });
  await autoTab.close();
  const oppo = await ctx.newPage();
  await oppo.goto("https://open.oppomobile.com/");
  await oppo.waitForSelector("#apkgo-assistant-root", { state: "attached", timeout: 10000 });
  await oppo.waitForTimeout(800);

  // 关闭的 shadow root：走 CDP 穿透
  const cdp = await ctx.newCDPSession(oppo);
  await cdp.send("DOM.enable"); await cdp.send("Runtime.enable");
  async function shadowObject() {
    const { root } = await cdp.send("DOM.getDocument", { depth: 0 });
    const { nodeId: hostId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector: "#apkgo-assistant-root" });
    const { node } = await cdp.send("DOM.describeNode", { nodeId: hostId, pierce: true });
    const { object } = await cdp.send("DOM.resolveNode", { backendNodeId: node.shadowRoots[0].backendNodeId });
    return object.objectId;
  }
  async function inShadow(fnSrc, ...args) {
    const objectId = await shadowObject();
    const r = await cdp.send("Runtime.callFunctionOn", { objectId, functionDeclaration: `function(...a){ return (${fnSrc})(this, ...a); }`, arguments: args.map((v) => ({ value: v })), returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + " " + JSON.stringify(r.exceptionDetails.exception));
    return r.result.value;
  }
  // pendingStore 可能已让面板自动打开（点击会把它关上），所以只在关着时点。
  await inShadow(`(sr) => { if (!sr.querySelector('.panel').classList.contains('open')) sr.querySelector('.launch').click(); }`);
  await oppo.waitForTimeout(500);
  const opened = await inShadow(`(sr) => sr.querySelector('.panel').className`);
  step("panel open", { className: opened });
  await oppo.screenshot({ path: path.join(HERE, "../../dist/shots/01-panel.png") });

  // 3. 自动识别
  await inShadow(`(sr) => sr.querySelector('[data-act=auto]').click()`);
  await oppo.waitForTimeout(500);
  step("auto-detect", await inShadow(`(sr) => ({ id: sr.querySelector('input[data-k=client_id]').value, secret: sr.querySelector('input[data-k=client_secret]').value, msg: (sr.querySelector('.msg')||{}).textContent })`));
  await oppo.screenshot({ path: path.join(HERE, "../../dist/shots/02-detected.png") });

  // 4. 保存 → 伪 apkgo 返回 201
  await inShadow(`(sr) => { const s = sr.querySelector('select[data-k=__app]'); if (s) { s.value = 'a1'; s.dispatchEvent(new Event('change', { bubbles: true })); } sr.querySelector('[data-act=save]').click(); }`);
  await oppo.waitForTimeout(1500);
  step("save ok", await inShadow(`(sr) => ({ msg: (sr.querySelector('.msg')||{}).textContent, idAfter: sr.querySelector('input[data-k=client_id]').value })`));
  await oppo.screenshot({ path: path.join(HERE, "../../dist/shots/03-saved.png") });

  // 5. 错误路径：secret=bad → 400 → 面板显示错误 + 提示
  await inShadow(`(sr) => { for (const [k, v] of [['client_id','30659871'],['client_secret','bad']]) { const i = sr.querySelector('input[data-k='+k+']'); i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); } }`);
  await oppo.waitForTimeout(300);
  await inShadow(`(sr) => sr.querySelector('[data-act=save]').click()`);
  await oppo.waitForTimeout(1500);
  step("save error", await inShadow(`(sr) => ({ msg: (sr.querySelector('.msg')||{}).textContent })`));

  // 6. 服务端真的收到了什么
  const received = await (await fetch(`${ORIGIN}/__received`)).json();
  step("server received", { count: received.length, first: received[0] });

  // 7. 弹窗页能打开、显示已连接
  const popup = await ctx.newPage();
  await popup.goto(`chrome-extension://${new URL(sw.url()).host}/src/popup/popup.html`);
  await popup.waitForTimeout(600);
  step("popup", { conn: await popup.locator("#conn").innerText(), stores: await popup.locator("#stores").innerText() });
  await popup.screenshot({ path: path.join(HERE, "../../dist/shots/04-popup.png") });
  out.ok = true;
} catch (e) {
  out.ok = false; out.error = String(e && e.stack || e); console.error(out.error);
} finally {
  await ctx.close();
  fs.mkdirSync(path.join(HERE, "../../dist/shots"), { recursive: true }); fs.writeFileSync(path.join(HERE, "../../dist/e2e-result.json"), JSON.stringify(out, null, 2));
  console.log(out.ok ? "E2E_OK" : "E2E_FAIL");
}
