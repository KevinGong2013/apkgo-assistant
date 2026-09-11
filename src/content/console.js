// 注入在各家商店后台页面上的助手面板。
//
// 三件事：把这家商店的「前置条件 + 步骤」贴在页面右下角；帮用户把密钥从页面上
// 拿下来（自动识别标签旁边的值，或者进入「点选」模式点一下）；点保存直接调
// apkgo 新建凭证并验证，结果就地显示。密钥草稿只放 storage.session。
/* global APKGO, APKGO_PANEL_CSS */
(() => {
  if (window.top !== window) return;
  const recipe = APKGO.recipeForUrl(location.href);
  if (!recipe) return;
  if (document.getElementById("apkgo-assistant-root")) return;

  // viewBox 收紧到正好框住三根横条（x18–82、y26–83），水平垂直居中，去掉原 100×100 画布顶部的空白。
  const escLabel = (s) => String(s ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const MARK = '<svg viewBox="12 16.5 76 76" fill="currentColor"><rect x="18" y="70" width="64" height="13" rx="6.5"/><rect x="18" y="51" width="64" height="13" rx="6.5"/><rect x="22" y="26" width="56" height="13" rx="6.5"/></svg>';
  const DRAFT_KEY = APKGO.KEY_DRAFT(recipe.id);

  // ---- state ----
  let draft = { label: "", config: {}, files: {}, appId: "" };
  let paired = null;
  let apps = [];
  let picking = null; // 正在点选的字段 key
  let result = null;  // { kind: ok|err|warn, html }
  let busy = false;
  let busyAction = "";

  // ---- shadow host ----
  const host = document.createElement("div");
  host.id = "apkgo-assistant-root";
  const root = host.attachShadow({ mode: "closed" });
  const style = document.createElement("style");
  style.textContent = APKGO_PANEL_CSS;
  root.appendChild(style);
  const launch = document.createElement("button");
  launch.className = "launch";
  launch.title = `apkgo 助手 · ${recipe.cn}`;
  const launchSub = recipe.flow && recipe.flow.length ? "一键获取密钥" : (recipe.fields.length ? "采集密钥，直接保存到 apkgo" : "这一家的密钥怎么拿");
  launch.innerHTML = MARK + `<span class="lbl">apkgo 助手<small>${escLabel(recipe.cn)} · ${launchSub}</small></span><span class="dot"></span>`;
  const panel = document.createElement("div");
  panel.className = "panel";
  const pickbar = document.createElement("div");
  pickbar.className = "pickbar";
  // 「帮我点」做完后的提示条：面板会收起来让位给页面上的按钮，提示挪到顶部。
  const notice = document.createElement("div");
  notice.className = "pickbar notice";
  // 引导气泡：告诉用户「点这里」。
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  const bubbleText = recipe.flow && recipe.flow.length
    ? `${escLabel(recipe.cn)}的密钥在哪？点这里，一键获取 👇`
    : (recipe.fields.length ? `${escLabel(recipe.cn)}的密钥在哪？点这里，帮你找到并存进 apkgo 👇` : `${escLabel(recipe.cn)}的密钥怎么拿？点这里看步骤 👇`);
  bubble.innerHTML = `<span>${bubbleText}</span><button class="bx" title="知道了">×</button>`;
  bubble.addEventListener("click", (e) => {
    if (e.target.classList.contains("bx")) { hideBubble(); return; }
    hideBubble(); hideNotice(); togglePanel(true);
  });
  function hideBubble() { bubble.classList.remove("on"); try { chrome.storage.session.set({ launcherSeen: true }); } catch { /* ignore */ } }
  root.append(launch, panel, pickbar, notice, bubble);
  notice.addEventListener("click", (e) => { if (e.target.dataset.n === "open") { hideNotice(); togglePanel(true); } if (e.target.dataset.n === "x") hideNotice(); });
  function showNotice(html) { notice.innerHTML = `<span>${html}</span><button class="mini" data-n="open">打开面板</button><button class="x" data-n="x" title="关闭">×</button>`; notice.classList.add("on"); }
  function hideNotice() { notice.classList.remove("on"); }
  document.documentElement.appendChild(host);

  launch.addEventListener("click", () => { hideNotice(); togglePanel(); });
  // 引起注意：滑入 + 光环 + 弹跳，本会话里点开过一次就不再闹。
  (async () => {
    let seen = false;
    try { ({ launcherSeen: seen } = await chrome.storage.session.get("launcherSeen")); } catch { /* ignore */ }
    if (!seen) {
      launch.classList.add("attn"); bubble.classList.add("on");
      setTimeout(() => { launch.classList.remove("attn"); bubble.classList.remove("on"); }, 30000);
    }
  })();

  function esc(s) { return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

  // ---- render ----
  function render() {
    const fields = recipe.fields;
    const hasFields = fields.length > 0;
    const captured = fields.filter((f) => valueOf(f)).length;
    launch.classList.toggle("has-draft", captured > 0);

    const connHtml = paired
      ? `<div class="conn"><span class="sdot"></span><span>已连接 apkgo · ${esc(paired.orgName)}</span></div>`
      : `<div class="conn off"><span class="sdot"></span><span>还没连接。去 <a href="${esc(APKGO.DEFAULT_ORIGIN)}/credentials/new?store=${recipe.id}" target="_blank" rel="noopener">apkgo 添加商店账号页</a> 点「连接助手」。</span></div>`;

    const preHtml = recipe.prereq.length
      ? `<div class="sec"><div class="sec-t">先确认</div><ul class="pre">${recipe.prereq.map((p) => `<li>${esc(p)}</li>`).join("")}</ul></div>` : "";

    const oneClick = recipe.flow && recipe.flow.length
      ? `<div class="oneclick"><button class="btn acc" data-oneclick="1" ${busyAction || !paired ? "disabled" : ""}>${busyAction ? "正在替你点…" : "一键获取密钥"}</button><div class="hint">扩展会跳到密钥页、打开创建弹窗并填好；唯一留给你的是弹窗上的「确认」。之后下载、保存、验证都自动完成。</div></div>`
      : "";
    const stepsHtml = `<div class="sec"><div class="sec-t">在 ${esc(recipe.product)} 里</div>${oneClick}<ol class="steps">${recipe.steps.map((s, i) => `<li><span class="n">${i + 1}</span><div style="flex:1;min-width:0"><div class="st">${esc(s.t)}</div>${s.d ? `<div class="sd">${esc(s.d)}</div>` : ""}</div>${s.action ? `<button class="mini ${busyAction === s.action ? "on" : ""}" data-action="${esc(s.action)}" ${busyAction ? "disabled" : ""}>${busyAction === s.action ? "正在点…" : "帮我点"}</button>` : ""}</li>`).join("")}</ol></div>`;

    let formHtml = "";
    if (hasFields) {
      const autoable = fields.some((f) => f.hints && f.hints.length);
      formHtml = `<div class="sec"><div class="sec-t" style="display:flex;justify-content:space-between;align-items:center">采集
        ${autoable ? '<button class="mini" data-act="auto">自动识别本页</button>' : ""}</div>` +
        fields.map((f) => fieldHtml(f)).join("") +
        `<div class="field"><label>备注名（可选）</label><input class="in" data-k="__label" placeholder="默认「${esc(recipe.cn)}账号」，同一商店多个账号时区分" value="${esc(draft.label)}"></div>` +
        (apps.length ? `<div class="field"><label>关联应用（可选，验证时会更严格）</label><select class="sel" data-k="__app"><option value="">不关联</option>${apps.map((a) => `<option value="${esc(a.id)}" ${draft.appId === a.id ? "selected" : ""}>${esc(a.name)} · ${esc(a.pkg)}</option>`).join("")}</select></div>` : "") +
        (result ? `<div class="msg ${result.kind}">${result.html}</div>` : "") +
        `<div class="actions"><button class="btn acc" data-act="save" ${busy || !paired ? "disabled" : ""}>${busy ? "保存并验证中…" : "保存到 apkgo 并验证"}</button><button class="btn ghost" data-act="clear">清空</button></div>
        <div class="hint">保存时 apkgo 会连一次 ${esc(recipe.cn)}确认密钥可用。密钥加密保存，只在这台浏览器的会话里暂存。</div></div>`;
    } else {
      formHtml = `<div class="msg warn">这一家的密钥是文件形式，请按上面的步骤拿到文件后，回到 <a href="${esc((paired && paired.origin) || APKGO.DEFAULT_ORIGIN)}/credentials/new?store=${recipe.id}" target="_blank" rel="noopener">apkgo 添加页</a> 上传。</div>` +
        (result ? `<div class="msg ${result.kind}">${result.html}</div>` : "");
    }

    panel.innerHTML = `
      <div class="head"><span class="mark">${MARK}</span><div class="t">apkgo 助手<small>${esc(recipe.cn)} · ${esc(recipe.product)}</small></div><button class="x" data-act="close" title="收起">×</button></div>
      <div class="body">${connHtml}<div style="height:12px"></div>${preHtml}${stepsHtml}${formHtml}</div>`;
    if (result) { const m = panel.querySelector(".msg"); if (m) m.scrollIntoView({ block: "nearest" }); }
  }

  function valueOf(f) {
    if (f.kind === "file-b64" || f.kind === "file-text") return draft.config[f.key] ? (draft.files[f.key] || "已选择文件") : "";
    return draft.config[f.key] || "";
  }

  function fieldHtml(f) {
    const req = f.required ? "<b>*</b>" : "";
    const v = draft.config[f.key] || "";
    const okc = v ? "ok" : "";
    if (f.kind === "file-b64" || f.kind === "file-text") {
      return `<div class="field"><label><span>${esc(f.label)}${req}</span></label>
        <div class="file"><span class="name ${okc}">${esc(draft.files[f.key] || "还没选择文件")}</span>
        <label class="mini">选文件<input type="file" data-file="${esc(f.key)}" accept="${esc(f.accept || "")}"></label>
        ${v ? `<button class="mini" data-unfile="${esc(f.key)}">移除</button>` : ""}</div></div>`;
    }
    const pickBtn = f.virtual && !f.hints ? "" : `<button class="mini ${picking === f.key ? "on" : ""}" data-pick="${esc(f.key)}">${picking === f.key ? "点页面上的值…" : "点选"}</button>`;
    if (f.kind === "multiline") {
      return `<div class="field"><label><span>${esc(f.label)}${req}</span>${pickBtn}</label><textarea class="in ${okc}" data-k="${esc(f.key)}" spellcheck="false" placeholder="${esc(f.placeholder || "")}">${esc(v)}</textarea></div>`;
    }
    const type = f.kind === "secret" ? "password" : "text";
    return `<div class="field"><label><span>${esc(f.label)}${req}</span>${pickBtn}</label>
      <div class="row"><input class="in ${okc}" type="${type}" data-k="${esc(f.key)}" spellcheck="false" autocomplete="off" placeholder="${esc(f.placeholder || "")}" value="${esc(v)}">${f.kind === "secret" ? `<button class="mini" data-eye="${esc(f.key)}">显示</button>` : ""}</div></div>`;
  }

  // ---- events (delegated) ----
  panel.addEventListener("click", async (e) => {
    const t = e.target.closest("[data-act],[data-pick],[data-eye],[data-unfile],[data-action],[data-oneclick]");
    if (!t) return;
    if (t.dataset.act === "close") return togglePanel(false);
    if (t.dataset.act === "auto") return autoDetect();
    if (t.dataset.act === "clear") { draft = { label: "", config: {}, files: {}, appId: draft.appId }; result = null; await saveDraft(); return render(); }
    if (t.dataset.act === "save") return submit();
    if (t.dataset.action) return runAction(t.dataset.action);
    if (t.dataset.oneclick) return oneClick();
    if (t.dataset.pick) return startPick(t.dataset.pick);
    if (t.dataset.eye) { const inp = panel.querySelector(`input[data-k="${t.dataset.eye}"]`); if (inp) { inp.type = inp.type === "password" ? "text" : "password"; t.textContent = inp.type === "password" ? "显示" : "隐藏"; } return; }
    if (t.dataset.unfile) { delete draft.config[t.dataset.unfile]; delete draft.files[t.dataset.unfile]; await saveDraft(); return render(); }
  });
  panel.addEventListener("input", async (e) => {
    const k = e.target.dataset.k;
    if (!k) return;
    if (k === "__label") draft.label = e.target.value;
    else draft.config[k] = e.target.value;
    e.target.classList.toggle("ok", !!e.target.value);
    await saveDraft();
    launch.classList.toggle("has-draft", recipe.fields.some((f) => valueOf(f)));
  });
  panel.addEventListener("change", async (e) => {
    if (e.target.dataset.k === "__app") { draft.appId = e.target.value; await saveDraft(); return; }
    const fk = e.target.dataset.file;
    if (!fk) return;
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const f = recipe.fields.find((x) => x.key === fk);
    try {
      draft.config[fk] = f.kind === "file-text" ? await APKGO.fileToText(file) : await APKGO.fileToBase64(file);
      draft.files[fk] = file.name;
      await saveDraft();
      render();
    } catch (err) {
      result = { kind: "err", html: "读取文件失败：" + esc(err.message || err) };
      render();
    }
  });

  function togglePanel(force) {
    const open = force === undefined ? !panel.classList.contains("open") : force;
    panel.classList.toggle("open", open);
    launch.classList.toggle("hide", open);
    if (open) {
      launch.classList.remove("attn"); bubble.classList.remove("on");
      try { chrome.storage.session.set({ launcherSeen: true }); } catch { /* ignore */ }
      refreshState(); ensureHook();
    }
  }

  // ---- storage ----
  async function loadDraft() {
    try {
      const { [DRAFT_KEY]: d } = await chrome.storage.session.get(DRAFT_KEY);
      if (d) draft = { label: "", config: {}, files: {}, appId: "", ...d };
    } catch { /* session storage 不可用时就只在内存里 */ }
  }
  async function saveDraft() {
    try { await chrome.storage.session.set({ [DRAFT_KEY]: draft }); } catch { /* ignore */ }
  }
  async function clearDraft() {
    draft = { label: "", config: {}, files: {}, appId: "" };
    try { await chrome.storage.session.remove(DRAFT_KEY); } catch { /* ignore */ }
  }
  async function refreshState() {
    const st = await APKGO.send({ type: "state" });
    paired = st.ok ? st.paired : null;
    if (paired && !apps.length && recipe.fields.length) {
      const r = await APKGO.send({ type: "apps" });
      if (r.ok) apps = r.apps;
    }
    render();
  }

  // ---- auto detect: 找标签文字，再在它附近找一个像样的值 ----
  // 不少后台（华为 AGC 就是）把正文放在同源 iframe 里，识别和点选都要进去找。
  // 跨域 iframe 拿不到 contentDocument，会被静默跳过。
  function docs() {
    const out = [document];
    document.querySelectorAll("iframe").forEach((f) => {
      try { const d = f.contentDocument; if (d && d.body) out.push(d); } catch { /* 跨域 */ }
    });
    return out;
  }
  function isVisible(el) {
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) return false;
    const win = (el.ownerDocument && el.ownerDocument.defaultView) || window;
    const cs = win.getComputedStyle(el);
    return cs.visibility !== "hidden" && cs.display !== "none";
  }
  function textOf(el) { return (el.innerText || el.textContent || "").trim(); }
  function valuesIn(el) {
    const out = [];
    el.querySelectorAll("input,textarea").forEach((i) => { if (i.value) out.push(i.value); });
    // 值经常和「复制」按钮同在一个单元格里：整段文字之外，再把只含文本的直接
    // 子节点和每个叶子元素各作为一个候选，让 pattern 有机会单独命中。
    const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).filter(Boolean).join(" ");
    if (own) out.push(own);
    el.querySelectorAll("*").forEach((c) => { if (!c.children.length) { const t = textOf(c); if (t) out.push(t); } });
    const t = textOf(el);
    if (t) out.push(t);
    return out;
  }
  function plausible(f, raw) {
    let v = String(raw || "").trim();
    if (!v || v.length > 4096 || /^[•*·]+$/.test(v)) return "";
    // 「Client ID：123456」这种同一节点里带标签的，取冒号后面那段。
    const m = v.match(/[:：]\s*([^\s:：]+)\s*$/);
    if (m && f.hints && f.hints.some((re) => re.test(v))) v = m[1];
    if (f.pattern) {
      if (f.pattern.test(v)) return v;
      // 「30659871 复制」：按空白拆开，取第一个像样的片段。
      const parts = v.split(/\s+/);
      if (parts.length <= 6) { const hit = parts.find((x) => f.pattern.test(x)); if (hit) return hit; }
      return "";
    }
    return v.length >= 4 && !/\n/.test(v) ? v : "";
  }
  function detectField(f) {
    if (!f.hints || !f.hints.length) return "";
    const labels = [];
    for (const doc of docs()) {
      const all = doc.body.querySelectorAll("label,th,td,dt,dd,span,div,p,strong,b,li,h1,h2,h3,h4");
      for (const el of all) {
        if (el.children.length > 3) continue;
        const t = textOf(el);
        if (!t || t.length > 60) continue;
        if (f.hints.some((re) => re.test(t)) && isVisible(el)) labels.push(el);
        if (labels.length > 40) break;
      }
    }
    for (const label of labels) {
      const cands = [];
      if (label.tagName === "LABEL" && label.htmlFor) {
        const inp = label.ownerDocument.getElementById(label.htmlFor);
        if (inp && inp.value) cands.push(inp.value);
      }
      const inner = plausible(f, textOf(label));
      if (inner && f.hints.some((re) => re.test(textOf(label)))) cands.push(textOf(label));
      let node = label;
      for (let depth = 0; depth < 4 && node; depth++, node = node.parentElement) {
        let sib = node.nextElementSibling;
        for (let n = 0; sib && n < 3; n++, sib = sib.nextElementSibling) cands.push(...valuesIn(sib));
        if (node.parentElement && node.parentElement.tagName === "TR") break;
      }
      for (const c of cands) { const v = plausible(f, c); if (v) return v; }
    }
    return "";
  }
  async function autoDetect() {
    let n = 0;
    for (const f of recipe.fields) {
      if (f.kind.startsWith("file") || draft.config[f.key]) continue;
      const v = detectField(f);
      if (v) { draft.config[f.key] = v; n++; }
    }
    await saveDraft();
    result = n ? { kind: "ok", html: `识别到 ${n} 个字段，请核对后保存。没识别到的可以用「点选」。` } : { kind: "warn", html: "这一页上没找到像密钥的内容。走到显示密钥的那一页再试，或者用「点选」。" };
    render();
  }

  // ---- pick mode: 点页面上的元素，取它的值 ----
  let lastHover = null;
  function startPick(key) {
    if (picking === key) return stopPick();
    picking = key;
    const f = recipe.fields.find((x) => x.key === key);
    pickbar.innerHTML = `点一下页面上的 <b>${esc(f.label)}</b>，Esc 取消`;
    pickbar.classList.add("on");
    pickDocs = docs();
    for (const d of pickDocs) {
      d.addEventListener("mouseover", onHover, true);
      d.addEventListener("click", onPickClick, true);
      d.addEventListener("keydown", onKey, true);
    }
    render();
  }
  let pickDocs = [];
  function stopPick() {
    picking = null;
    pickbar.classList.remove("on");
    if (lastHover) { lastHover.style.outline = lastHover.__apkgoOutline || ""; lastHover = null; }
    for (const d of pickDocs) {
      d.removeEventListener("mouseover", onHover, true);
      d.removeEventListener("click", onPickClick, true);
      d.removeEventListener("keydown", onKey, true);
    }
    pickDocs = [];
    render();
  }
  function onHover(e) {
    const el = e.target;
    if (!el || !el.style || host.contains(el)) return;
    if (lastHover && lastHover !== el) lastHover.style.outline = lastHover.__apkgoOutline || "";
    if (el !== lastHover) { el.__apkgoOutline = el.style.outline; el.style.outline = "2px solid #18E299"; lastHover = el; }
  }
  function onKey(e) { if (e.key === "Escape") { e.preventDefault(); stopPick(); } }
  async function onPickClick(e) {
    const el = e.target;
    if (!el || host.contains(el)) return;
    e.preventDefault(); e.stopPropagation();
    const key = picking;
    const f = recipe.fields.find((x) => x.key === key);
    let v = (el.tagName === "INPUT" || el.tagName === "TEXTAREA") ? el.value : textOf(el);
    const cleaned = plausible(f, v) || v.trim();
    stopPick();
    if (!cleaned) { result = { kind: "warn", html: "这个位置上没有文字。" }; return render(); }
    draft.config[key] = cleaned;
    await saveDraft();
    result = f.pattern && !f.pattern.test(cleaned)
      ? { kind: "warn", html: `已填入「${esc(APKGO.maskSecret(cleaned))}」，但看起来不太像 ${esc(f.label)}，保存前请核对。` }
      : null;
    render();
  }

  // ---- 「帮我点」：配方里声明的页面动作。最后的确认键永远留给用户 ----
  function byText(sel, re, root) {
    const roots = root ? [root] : docs().map((d) => d.body);
    for (const r of roots) {
      for (const el of r.querySelectorAll(sel)) {
        if (re.test(textOf(el)) && el.getClientRects().length) return el;
      }
    }
    return null;
  }
  function setInput(inp, value) {
    const proto = Object.getPrototypeOf(inp);
    const desc = Object.getOwnPropertyDescriptor(proto, "value") || Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
    if (desc && desc.set) desc.set.call(inp, value); else inp.value = value;
    inp.dispatchEvent(new Event("input", { bubbles: true }));
    inp.dispatchEvent(new Event("change", { bubbles: true }));
  }
  function highlight(el) {
    el.style.outline = "3px solid #18E299";
    el.style.outlineOffset = "2px";
    try { el.scrollIntoView({ block: "center", behavior: "smooth" }); } catch { /* ignore */ }
  }
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  async function waitFor(fn, ms = 4000) {
    const end = Date.now() + ms;
    while (Date.now() < end) { const v = fn(); if (v) return v; await wait(120); }
    return null;
  }
  function onConsolePage() {
    const target = new URL(recipe.console);
    return location.href.split("#")[0] === recipe.console.split("#")[0] && (!target.hash || location.hash === target.hash);
  }
  async function runAction(id) {
    if (id === "goto") {
      if (!onConsolePage()) { location.href = recipe.console; return false; }
      result = { kind: "ok", html: "已经在这一页了。" }; render(); return true;
    }
    const fn = recipe.actions && recipe.actions[id];
    if (!fn) return false;
    busyAction = id; result = null; render();
    try {
      await ensureHook();
      const msg = await fn({ docs, byText, setInput, highlight, wait, waitFor, draft, textOf });
      result = { kind: "ok", html: esc(msg || "已完成。") };
      busyAction = ""; render();
      // 让位：面板可能正盖着页面上要点的按钮。
      togglePanel(false);
      showNotice(esc(msg || "已完成。"));
      return true;
    } catch (e) {
      result = { kind: "warn", html: esc(e.message || String(e)) };
    }
    busyAction = ""; render();
    return false;
  }

  // 一键获取 = 按配方的 flow 依次跑 actions；不在入口页就先跳过去，落地后接着跑
  // （标记放 session）。流程里唯一留给用户的是后台弹窗上的「确认」——那一下真正
  // 在对方账号里创建密钥，扩展不替用户点。之后下载抓取 → 保存 → 验证自动完成。
  let autoSave = false;
  async function oneClick() {
    const flow = recipe.flow || [];
    if (!flow.length) return;
    if (!onConsolePage()) {
      try { await chrome.storage.session.set({ [APKGO.KEY_PENDING]: recipe.id, ["autorun:" + recipe.id]: true }); } catch { /* ignore */ }
      location.href = recipe.console;
      return;
    }
    autoSave = true;
    for (const id of flow) { if (!(await runAction(id))) { autoSave = false; return; } }
  }

  // ---- 下载自动抓取：页面一下载密钥文件，直接填进对应的文件字段 ----
  let hookReady = false;
  const hookedWindows = new WeakSet();
  async function ensureHook() {
    if (!recipe.fields.some((f) => f.capture)) return;
    // 页面里的钩子是幂等的（挂过就跳过），每次都注入一遍，好把后来才加载的 iframe 也覆盖到。
    const r = await APKGO.send({ type: "injectHook" }); hookReady = !!r.ok;
    for (const d of docs()) {
      const w = d.defaultView;
      if (!w || hookedWindows.has(w)) continue;
      hookedWindows.add(w);
      w.addEventListener("message", onHookMessage);
    }
  }
  function onHookMessage(e) {
    const d = e.data;
    if (!d || d.source !== "apkgo-assistant-hook" || d.type !== "download") return;
    ingestDownload(d.name, d.mime, d.text);
  }
  async function ingestDownload(name, mime, text) {
    const f = recipe.fields.find((x) => x.capture && ((x.capture.name && x.capture.name.test(name || "")) || (x.capture.mime && x.capture.mime.test(mime || ""))));
    if (!f || !text) return;
    draft.config[f.key] = f.kind === "file-text" ? text : btoa(unescape(encodeURIComponent(text)));
    draft.files[f.key] = name || "下载的文件";
    await saveDraft();
    result = { kind: "ok", html: `已自动抓到下载的 ${esc(name || "文件")}，填进了「${esc(f.label)}」。${autoSave ? "正在保存并验证…" : "核对后点保存。"}` };
    hideNotice();
    togglePanel(true);
    render();
    if (autoSave) { autoSave = false; submit(); }
  }
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg && msg.type === "download-created" && recipe.fields.some((f) => f.capture)) {
      fetch(msg.url, { credentials: "include" }).then((r) => (r.ok ? r.text() : "")).then((t) => ingestDownload(msg.filename.split("/").pop(), "", t)).catch(() => {});
    }
  });

  // ---- submit ----
  async function submit() {
    const missing = recipe.fields.filter((f) => f.required && !draft.config[f.key]);
    if (missing.length) { result = { kind: "warn", html: "还差：" + missing.map((f) => esc(f.label)).join("、") }; return render(); }
    busy = true; result = null; render();
    let config = {};
    for (const f of recipe.fields) if (draft.config[f.key]) config[f.key] = draft.config[f.key];
    if (recipe.finalize) config = recipe.finalize(config);
    const r = await APKGO.send({ type: "submit", store: recipe.id, label: draft.label.trim(), config, appId: draft.appId });
    busy = false;
    if (r.ok) {
      const link = `<a href="${esc(paired.origin)}/credentials" target="_blank" rel="noopener">在 apkgo 里查看</a>`;
      result = r.credential.verified
        ? { kind: "ok", html: `已保存，${esc(recipe.cn)}验证通过。${link}，或者继续采集下一家。` }
        : { kind: "ok", html: `已保存。${esc(recipe.cn)}这次没能完成验证（接口没探到或被跳过），发布时仍会用它。${link}` };
      await clearDraft();
      launch.classList.remove("has-draft");
    } else {
      const hint = APKGO.errorHint(r.error);
      result = { kind: "err", html: `${esc(r.error)}${hint ? `<div class="hint" style="color:inherit;opacity:.85">${esc(hint)}</div>` : ""}` };
      if (r.status === 401) paired = null;
    }
    render();
  }

  // ---- messages from popup / background ----
  chrome.runtime.onMessage.addListener((msg, _s, sendResponse) => {
    if (msg && msg.type === "open-panel") { togglePanel(true); sendResponse({ ok: true }); }
  });

  // ---- init ----
  (async () => {
    await loadDraft();
    render();
    try {
      const { [APKGO.KEY_PENDING]: pending, ["autorun:" + recipe.id]: autorun } = await chrome.storage.session.get([APKGO.KEY_PENDING, "autorun:" + recipe.id]);
      if (pending === recipe.id) { await chrome.storage.session.remove(APKGO.KEY_PENDING); togglePanel(true); }
      if (autorun) { await chrome.storage.session.remove("autorun:" + recipe.id); togglePanel(true); await refreshState(); await wait(1500); oneClick(); }
    } catch { /* ignore */ }
  })();
})();
