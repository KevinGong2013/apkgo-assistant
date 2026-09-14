// 各处共用的小工具。经典脚本（非 module），后台用 importScripts 引入，
// 内容脚本和弹窗按顺序 <script> 引入，共享一个全局作用域。
/* global APKGO_RECIPES */

const APKGO = {
  VERSION: chrome.runtime.getManifest().version,
  DEFAULT_ORIGIN: "https://apkgo.baici.tech",
  // storage.local：配对信息（含密钥）。密钥权限只有 credential:create。
  KEY_PAIRED: "paired",
  // storage.session：采集草稿（按商店）和「刚从 apkgo 跳过来要打开面板」的标记。
  // 关浏览器即清，密钥明文从不落盘。
  KEY_DRAFT: (storeId) => `draft:${storeId}`,
  KEY_PENDING: "pendingStore",
  // 一句话的中文提示：把 apkgo 返回的验证错误映射成「下一步该做什么」。
  errorHint(message) {
    const m = String(message || "");
    if (/no app found for package/i.test(m)) return "这个开发者账号下没有对应包名的应用。确认用的是上架该应用的账号；或者先在后台创建应用，再采集。";
    if (/intro .*is empty|应用简介/i.test(m)) return "荣耀要求应用简介不能为空，先在后台把简介填上。";
    if (/token|access_token|invalid_client|401|签名|signature|secret/i.test(m)) return "密钥对不上：回到后台核对是否完整复制，或者密钥是否刚被重置过。";
    if (/配额|上限|quota|limit/i.test(m)) return "商店账号数量已到套餐上限，在 apkgo 升级套餐或删掉不用的账号。";
    if (/已存在|已被使用|鉴权信息|duplicate|conflict/i.test(m)) return "这组密钥已经在 apkgo 里了（多半是刚才那次已经自动保存成功），不用重复添加；去 apkgo「商店账号」里能看到。";
    if (/permission|权限/i.test(m)) return "连接用的密钥权限不对，回到 apkgo 添加页重新连接一次。";
    return "";
  },
  maskSecret(v) {
    const s = String(v || "");
    if (s.length <= 8) return "••••••••";
    return s.slice(0, 3) + "••••••" + s.slice(-3);
  },
  recipeForUrl(url) {
    let host = "";
    try { host = new URL(url).hostname; } catch { return null; }
    return APKGO_RECIPES.find((r) => r.hostRe.test(host)) || null;
  },
  recipeById(id) {
    if (!id) return null;
    const key = String(id).toLowerCase().trim();
    const alias = {
      harmony: "huawei",
      harmonyos: "huawei",
      hongmeng: "huawei",
      google: "googleplay",
      google_play: "googleplay",
      play: "googleplay",
      apple: "appstore",
      ios: "appstore",
    };
    const targetId = alias[key] || key;
    return APKGO_RECIPES.find((r) => r.id === targetId) || null;
  },
  // 把 File 读成 base64（不带 data: 前缀），和网页添加页的 readFileAsBase64 一致。
  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result).replace(/^data:[^;]*;base64,/, ""));
      fr.onerror = () => reject(fr.error);
      fr.readAsDataURL(file);
    });
  },
  fileToText(file) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.onerror = () => reject(fr.error);
      fr.readAsText(file);
    });
  },
  send(msg) {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(msg, (r) => {
          if (chrome.runtime.lastError) resolve({ ok: false, error: chrome.runtime.lastError.message });
          else resolve(r || { ok: false, error: "后台没有响应" });
        });
      } catch (e) {
        resolve({ ok: false, error: e.message || String(e) });
      }
    });
  },
};
