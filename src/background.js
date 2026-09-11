// 后台 service worker：保管配对信息、替内容脚本调 apkgo Open API、开后台页。
// 扩展里所有的网络请求都在这一个文件里，而且只会发往配对时记下的 apkgo 域名。
/* global APKGO, APKGO_RECIPES */
importScripts("recipes.js", "shared.js");

// 采集草稿放 storage.session，内容脚本要能直接读写，得先放开访问级别。
chrome.storage.session.setAccessLevel({ accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS" }).catch(() => {});

async function getPaired() {
  const { [APKGO.KEY_PAIRED]: p } = await chrome.storage.local.get(APKGO.KEY_PAIRED);
  return p || null;
}

function publicPaired(p) {
  return p ? { origin: p.origin, orgId: p.orgId, orgName: p.orgName, pairedAt: p.pairedAt } : null;
}

async function hostGranted(origin) {
  try { return await chrome.permissions.contains({ origins: [origin + "/*"] }); } catch { return false; }
}

// 调 apkgo Open API。返回 { ok, status, data | error }。
async function apkgoFetch(path, init = {}) {
  const p = await getPaired();
  if (!p) return { ok: false, status: 0, error: "还没连接 apkgo，请在 apkgo 的「添加商店账号」页点「连接助手」" };
  let res;
  try {
    res = await fetch(p.origin + path, {
      ...init,
      headers: { "Content-Type": "application/json", "X-API-Key": p.apiKey, ...(init.headers || {}) },
    });
  } catch (e) {
    return { ok: false, status: 0, error: "连不上 " + p.origin + "：" + (e.message || e) };
  }
  let body = null;
  try { body = await res.json(); } catch { /* 非 JSON */ }
  if (!res.ok) {
    const msg = (body && body.error) || `HTTP ${res.status}`;
    return { ok: false, status: res.status, error: res.status === 401 ? "连接已失效（密钥被吊销或已过期），请回到 apkgo 添加页重新连接" : msg };
  }
  return { ok: true, status: res.status, data: body && body.data !== undefined ? body.data : body };
}

const handlers = {
  async state() {
    const p = await getPaired();
    return { ok: true, version: APKGO.VERSION, paired: publicPaired(p), hostGranted: p ? await hostGranted(p.origin) : false };
  },

  // 只接受和发消息的页面同源的 origin（bridge 已经校验过一遍，这里再兜底），
  // 存之前用密钥调一次只读接口确认它真的可用。
  async pair({ apiKey, origin, orgId, orgName }, sender) {
    if (!apiKey || !/^apkgo_[0-9a-f]{32,}$/.test(apiKey)) return { ok: false, error: "密钥格式不对" };
    let o;
    try { o = new URL(origin).origin; } catch { return { ok: false, error: "origin 不合法" }; }
    const senderOrigin = sender && sender.url ? new URL(sender.url).origin : "";
    if (senderOrigin && senderOrigin !== o) return { ok: false, error: "配对来源和页面不一致" };
    const rec = { origin: o, orgId, orgName, apiKey, pairedAt: Date.now() };
    await chrome.storage.local.set({ [APKGO.KEY_PAIRED]: rec });
    if (await hostGranted(o)) {
      const r = await apkgoFetch("/openapi/v1/apps");
      if (!r.ok) {
        await chrome.storage.local.remove(APKGO.KEY_PAIRED);
        return { ok: false, error: "密钥验证失败：" + r.error };
      }
    }
    return { ok: true, paired: publicPaired(rec) };
  },

  async unpair() {
    await chrome.storage.local.remove(APKGO.KEY_PAIRED);
    await chrome.storage.session.clear();
    return { ok: true };
  },

  async apps() {
    const r = await apkgoFetch("/openapi/v1/apps");
    if (!r.ok) return r;
    const list = Array.isArray(r.data) ? r.data : [];
    return { ok: true, apps: list.map((a) => ({ id: a.id, name: a.display_name || a.name, pkg: a.package_name })) };
  },

  // 新建凭证：和控制台走同一个 handler，服务端会先连商店验证一次再落库。
  async submit({ store, label, config, appId }) {
    const recipe = APKGO.recipeById(store);
    if (!recipe) return { ok: false, error: "未知商店 " + store };
    const body = { store_name: store, label: label || `${recipe.cn}账号`, config };
    if (appId) body.app_id = appId;
    const r = await apkgoFetch("/openapi/v1/credentials", { method: "POST", body: JSON.stringify(body) });
    if (!r.ok) return r;
    return { ok: true, credential: { id: r.data.id, verified: !!r.data.verified, label: r.data.label } };
  },

  async openConsole({ store }) {
    const recipe = APKGO.recipeById(store);
    if (!recipe) return { ok: false, error: "未知商店 " + store };
    await chrome.storage.session.set({ [APKGO.KEY_PENDING]: store });
    await chrome.tabs.create({ url: recipe.console });
    return { ok: true };
  },

  async openPanel({ tabId }) {
    try { await chrome.tabs.sendMessage(tabId, { type: "open-panel" }); return { ok: true }; }
    catch (e) { return { ok: false, error: "这个页面上没有助手面板，刷新一下再试" }; }
  },
};

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const h = msg && handlers[msg.type];
  if (!h) { sendResponse({ ok: false, error: "unknown message " + (msg && msg.type) }); return false; }
  h(msg, sender).then(sendResponse, (e) => sendResponse({ ok: false, error: e.message || String(e) }));
  return true; // 异步回复
});

// 在商店后台页面上给图标点个绿点，提示「这里有助手」。
function updateBadge(tabId, url) {
  const on = url && APKGO.recipeForUrl(url);
  chrome.action.setBadgeText({ tabId, text: on ? "●" : "" });
  if (on) {
    chrome.action.setBadgeBackgroundColor({ tabId, color: "#18E299" });
    chrome.action.setTitle({ tabId, title: `apkgo 助手 · ${on.cn}后台` });
  }
}
chrome.tabs.onUpdated.addListener((tabId, info, tab) => { if (info.status === "complete" || info.url) updateBadge(tabId, tab.url); });
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try { const t = await chrome.tabs.get(tabId); updateBadge(tabId, t.url); } catch { /* 无权限的页面拿不到 url */ }
});
