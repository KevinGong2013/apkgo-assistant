/* global APKGO, APKGO_RECIPES */
(async () => {
  document.getElementById("ver").textContent = "v" + APKGO.VERSION;
  const conn = document.getElementById("conn");
  const here = document.getElementById("here");
  const stores = document.getElementById("stores");

  async function renderConn() {
    const st = await APKGO.send({ type: "state" });
    if (!st.ok || !st.paired) {
      conn.innerHTML = `<div>还没连接 apkgo。</div><div class="row"><a class="btn acc" href="${APKGO.DEFAULT_ORIGIN}/credentials/new" target="_blank" rel="noopener">打开 apkgo 添加页去连接</a></div>`;
      return;
    }
    const p = st.paired;
    conn.innerHTML = `<div class="n">已连接 · ${esc(p.orgName)}</div><div class="o">${esc(p.origin)}</div>
      <div class="row">${st.hostGranted ? "" : `<button class="btn warn" id="grant">允许访问 ${esc(p.origin)}</button>`}<button class="btn ghost" id="unpair">断开连接</button></div>
      ${st.hostGranted ? "" : '<div class="err">这个地址不在默认列表里，需要你点一次允许，助手才能把密钥发过去。</div>'}`;
    document.getElementById("unpair").onclick = async () => { await APKGO.send({ type: "unpair" }); renderConn(); };
    const g = document.getElementById("grant");
    if (g) g.onclick = async () => {
      try { await chrome.permissions.request({ origins: [p.origin + "/*"] }); } catch { /* 用户拒绝 */ }
      renderConn();
    };
  }

  async function renderHere() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const r = tab && tab.url ? APKGO.recipeForUrl(tab.url) : null;
    if (!r) { here.innerHTML = "这不是商店后台页面。下面选一家打开，或者在已打开的后台页面右下角找到助手按钮。"; return; }
    here.innerHTML = `<div>${esc(r.cn)} · ${esc(r.product)}</div><div class="row"><button class="btn acc" id="open">打开助手面板</button></div>`;
    document.getElementById("open").onclick = async () => {
      const res = await APKGO.send({ type: "openPanel", tabId: tab.id });
      if (res.ok) window.close();
      else here.insertAdjacentHTML("beforeend", `<div class="err">${esc(res.error)}</div>`);
    };
  }

  function renderStores() {
    stores.innerHTML = APKGO_RECIPES.map((r) => `<button class="chip" data-id="${r.id}">${esc(r.cn)}</button>`).join("");
    stores.onclick = async (e) => {
      const b = e.target.closest("[data-id]");
      if (!b) return;
      await APKGO.send({ type: "openConsole", store: b.dataset.id });
      window.close();
    };
  }

  function esc(s) { return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

  renderConn();
  renderHere();
  renderStores();
})();
