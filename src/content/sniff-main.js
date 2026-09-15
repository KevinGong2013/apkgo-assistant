// 在页面自己的世界（MAIN world）里记录它发出的 JSON 响应，供配方按字段名取值。
//
// 为什么要它：有些后台（应用宝）把开发者 ID 之类只放在自己接口的返回里，页面上看不到。
// 与其把接口地址写死在配方里（改版就坏），不如让页面照常请求，我们从它自己的返回里取。
//
// 边界：
//   - 只在装了配方的商店后台域名上运行（见 manifest 的 matches）。
//   - 数据只留在这个页面的内存里，上限 40 条、每条 64KB，页面一关就没了。
//   - 不主动外发。只有内容脚本明确来要（用户点了「一键获取密钥」）才回一份，
//     内容脚本也只取配方声明的那几个字段，其余当场丢弃。
//   - 只读，不改写页面的任何请求或返回。
(() => {
  if (window.__apkgoSniff) return;
  const MAX_ENTRIES = 40;
  const MAX_BYTES = 64 * 1024;
  const log = [];
  window.__apkgoSniff = log;

  const push = (url, text) => {
    if (!text || text.length > MAX_BYTES) return;
    const t = text.trimStart();
    if (t[0] !== "{" && t[0] !== "[") return;
    log.push({ url: String(url || "").slice(0, 300), text });
    if (log.length > MAX_ENTRIES) log.shift();
  };
  const isJSON = (ct) => /json/i.test(ct || "");

  const origFetch = window.fetch;
  if (origFetch) {
    window.fetch = function (input, init) {
      const p = origFetch.apply(this, arguments);
      try {
        p.then((r) => {
          try {
            if (!isJSON(r.headers.get("content-type"))) return;
            r.clone().text().then((t) => push(typeof input === "string" ? input : (input && input.url), t), () => {});
          } catch { /* ignore */ }
        }, () => {});
      } catch { /* ignore */ }
      return p;
    };
  }

  const XO = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (m, u) {
    this.addEventListener("load", function () {
      try {
        if (!isJSON(this.getResponseHeader("content-type"))) return;
        if (typeof this.response === "string") push(u, this.response);
        else if (this.responseType === "" || this.responseType === "text") push(u, this.responseText);
        else if (this.response && typeof this.response === "object") push(u, JSON.stringify(this.response));
      } catch { /* ignore */ }
    });
    return XO.apply(this, arguments);
  };

  window.addEventListener("message", (e) => {
    if (e.source !== window) return;
    const d = e.data;
    if (!d || d.source !== "apkgo-assistant" || d.type !== "sniff-req") return;
    window.postMessage({ source: "apkgo-assistant-sniff", type: "sniff-res", id: d.id, entries: log.slice() }, "*");
  });
})();
