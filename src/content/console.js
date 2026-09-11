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

  const MARK = '<svg viewBox="0 0 100 100" fill="currentColor"><rect x="18" y="70" width="64" height="13" rx="6.5"/><rect x="18" y="51" width="64" height="13" rx="6.5"/><rect x="22" y="26" width="56" height="13" rx="6.5"/></svg>';
  const DRAFT_KEY = APKGO.KEY_DRAFT(recipe.id);

  // ---- state ----
  let draft = { label: "", config: {}, files: {}, appId: "" };
  let paired = null;
  let apps = [];
  let picking = null; // 正在点选的字段 key
  let result = null;  // { kind: ok|err|warn, html }
  let busy = false;

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
  launch.innerHTML = MARK + '<span class="dot"></span>';
  const panel = document.createElement("div");
  panel.className = "panel";
  const pickbar = document.createElement("div");
  pickbar.className = "pickbar";
  root.append(launch, panel, pickbar);
  document.documentElement.appendChild(host);

  launch.addEventListener("click", () => togglePanel());

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

    const stepsHtml = `<div class="sec"><div class="sec-t">在 ${esc(recipe.product)} 里</div><ol class="steps">${recipe.steps.map((s, i) => `<li><span class="n">${i + 1}</span><div><div class="st">${esc(s.t)}</div>${s.d ? `<div class="sd">${esc(s.d)}</div>` : ""}</div></li>`).join("")}</ol></div>`;

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
    const t = e.target.closest("[data-act],[data-pick],[data-eye],[data-unfile]");
    if (!t) return;
    if (t.dataset.act === "close") return togglePanel(false);
    if (t.dataset.act === "auto") return autoDetect();
    if (t.dataset.act === "clear") { draft = { label: "", config: {}, files: {}, appId: draft.appId }; result = null; await saveDraft(); return render(); }
    if (t.dataset.act === "save") return submit();
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
    if (open) { refreshState(); }
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
  function isVisible(el) {
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) return false;
    const cs = getComputedStyle(el);
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
    const all = document.body.querySelectorAll("label,th,td,dt,dd,span,div,p,strong,b,li,h1,h2,h3,h4");
    for (const el of all) {
      if (el.children.length > 3) continue;
      const t = textOf(el);
      if (!t || t.length > 60) continue;
      if (f.hints.some((re) => re.test(t)) && isVisible(el)) labels.push(el);
      if (labels.length > 40) break;
    }
    for (const label of labels) {
      const cands = [];
      if (label.tagName === "LABEL" && label.htmlFor) {
        const inp = document.getElementById(label.htmlFor);
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
    document.addEventListener("mouseover", onHover, true);
    document.addEventListener("click", onPickClick, true);
    document.addEventListener("keydown", onKey, true);
    render();
  }
  function stopPick() {
    picking = null;
    pickbar.classList.remove("on");
    if (lastHover) { lastHover.style.outline = lastHover.__apkgoOutline || ""; lastHover = null; }
    document.removeEventListener("mouseover", onHover, true);
    document.removeEventListener("click", onPickClick, true);
    document.removeEventListener("keydown", onKey, true);
    render();
  }
  function onHover(e) {
    const el = e.target;
    if (!el || host.contains(el)) return;
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
      const { [APKGO.KEY_PENDING]: pending } = await chrome.storage.session.get(APKGO.KEY_PENDING);
      if (pending === recipe.id) { await chrome.storage.session.remove(APKGO.KEY_PENDING); togglePanel(true); }
    } catch { /* ignore */ }
  })();
})();
