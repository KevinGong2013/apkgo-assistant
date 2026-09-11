// 面板样式。放在 Shadow DOM 里，和后台页面的 CSS 互不影响。
// 视觉沿用 apkgo 的设计：Inter，品牌绿 #18E299，深色卡片，5% 透明边框，药丸按钮。
const APKGO_PANEL_CSS = `
:host { all: initial; }
* { box-sizing: border-box; }
/* 启动按钮：底部偏右居中的药丸，带文字，出现时滑入 + 绿色光环脉冲 + 弹跳几下，
   用户点开一次（本会话）后就安静。面板打开时隐藏，避免互相遮挡。 */
.launch { position: fixed; left: 62%; bottom: 72px; transform: translateX(-50%); z-index: 2147483000; height: 54px; padding: 0 22px 0 14px; border-radius: 9999px; border: none; background: #0F1613; color: #fff; display: flex; align-items: center; gap: 10px; cursor: pointer; font: 600 14px/1 Inter, -apple-system, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif; white-space: nowrap; box-shadow: 0 10px 30px rgba(0,0,0,.35), inset 0 0 0 1px rgba(24,226,153,.35); transition: transform .15s, box-shadow .15s; }
.launch:hover { transform: translate(-50%, -2px); box-shadow: 0 14px 34px rgba(0,0,0,.4), 0 0 0 4px rgba(24,226,153,.18), inset 0 0 0 1px rgba(24,226,153,.6); }
.launch svg { width: 26px; height: 26px; color: #18E299; flex-shrink: 0; }
.launch .lbl { text-align: left; }
.launch .lbl small { display: block; font-weight: 400; font-size: 11px; color: #8FA39A; margin-top: 3px; }
.launch .dot { position: absolute; top: -3px; right: -3px; width: 14px; height: 14px; border-radius: 50%; background: #18E299; border: 2px solid #0F1613; display: none; }
.launch.has-draft .dot { display: block; }
.launch.hide { display: none; }
.launch.attn { animation: apkgo-pop .55s cubic-bezier(.2,.9,.3,1.2) both, apkgo-bounce 1.3s ease-in-out 1.4s 3; }
.launch.attn::after { content: ""; position: absolute; inset: -3px; border-radius: 9999px; border: 2px solid #18E299; animation: apkgo-ring 1.7s ease-out infinite; pointer-events: none; }
@keyframes apkgo-pop { from { transform: translate(-50%, 28px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
@keyframes apkgo-bounce { 0%, 100% { transform: translate(-50%, 0); } 30% { transform: translate(-50%, -10px); } 55% { transform: translate(-50%, 0); } 75% { transform: translate(-50%, -5px); } }
@keyframes apkgo-ring { 0% { transform: scale(1); opacity: .9; } 100% { transform: scale(1.3); opacity: 0; } }
/* 引导气泡：在启动按钮正上方，小三角指向按钮；随按钮出现，轻轻浮动；点开面板或点 × 就走。 */
.bubble { position: fixed; left: 62%; bottom: calc(72px + 54px + 16px); transform: translateX(-50%); z-index: 2147483000; display: none; align-items: center; gap: 10px; padding: 11px 12px 11px 16px; border-radius: 14px; background: #18E299; color: #04160E; font: 600 14px/1.3 Inter, -apple-system, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif; white-space: nowrap; box-shadow: 0 12px 32px rgba(0,0,0,.28); cursor: pointer; }
.bubble.on { display: flex; animation: apkgo-bubble-in .45s cubic-bezier(.2,.9,.3,1.2) .7s both, apkgo-bob 2.2s ease-in-out 1.2s infinite; }
.bubble::after { content: ""; position: absolute; left: 50%; bottom: -8px; width: 16px; height: 16px; background: #18E299; transform: translateX(-50%) rotate(45deg); border-radius: 3px; }
.bubble .bx { background: rgba(4,22,14,.12); border: none; color: #04160E; width: 22px; height: 22px; border-radius: 50%; font-size: 15px; line-height: 1; cursor: pointer; display: grid; place-items: center; flex-shrink: 0; }
.bubble .bx:hover { background: rgba(4,22,14,.22); }
@keyframes apkgo-bubble-in { from { transform: translate(-50%, 10px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
@keyframes apkgo-bob { 0%, 100% { transform: translate(-50%, 0); } 50% { transform: translate(-50%, -6px); } }
@media (prefers-reduced-motion: reduce) { .launch.attn { animation: none; } .launch.attn::after { animation: none; display: none; } .bubble.on { animation: none; } }
.panel { position: fixed; right: 20px; bottom: 20px; z-index: 2147483000; width: 360px; max-height: calc(100vh - 100px); overflow: auto; background: #0F1613; color: #E6EDE9; border: 1px solid rgba(255,255,255,.08); border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,.45); font: 13px/1.5 Inter, -apple-system, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif; display: none; }
.panel.open { display: block; }
.head { display: flex; align-items: center; gap: 10px; padding: 14px 16px; border-bottom: 1px solid rgba(255,255,255,.06); position: sticky; top: 0; background: #0F1613; z-index: 1; }
.head .mark { width: 26px; height: 26px; border-radius: 8px; background: rgba(24,226,153,.12); color: #18E299; display: grid; place-items: center; }
.head .mark svg { width: 16px; height: 16px; }
.head .t { font-weight: 600; font-size: 14px; flex: 1; }
.head .t small { display: block; font-weight: 400; font-size: 11px; color: #8FA39A; }
.x { background: none; border: none; color: #8FA39A; font-size: 18px; cursor: pointer; padding: 2px 6px; border-radius: 6px; }
.x:hover { background: rgba(255,255,255,.06); color: #fff; }
.body { padding: 14px 16px 16px; }
.sec { margin-bottom: 14px; }
.sec-t { font-size: 11px; font-weight: 600; letter-spacing: .04em; color: #8FA39A; text-transform: uppercase; margin-bottom: 6px; }
.conn { display: flex; align-items: center; gap: 8px; padding: 9px 11px; border-radius: 10px; background: rgba(255,255,255,.04); font-size: 12px; }
.conn .sdot { width: 8px; height: 8px; border-radius: 50%; background: #18E299; flex-shrink: 0; }
.conn.off .sdot { background: #F5A524; }
.conn a { color: #18E299; text-decoration: none; }
.pre { margin: 0; padding: 0 0 0 16px; color: #C9D6D0; font-size: 12px; }
.pre li { margin: 2px 0; }
.oneclick { margin: 2px 0 12px; }
.oneclick .btn { width: 100%; }
.steps { list-style: none; margin: 0; padding: 0; }
.steps li { display: flex; gap: 9px; align-items: flex-start; padding: 6px 0; }
.steps .n { width: 18px; height: 18px; border-radius: 50%; border: 1.5px solid rgba(255,255,255,.18); font-size: 10px; font-weight: 600; color: #8FA39A; display: grid; place-items: center; flex-shrink: 0; margin-top: 2px; }
.steps .st { font-weight: 600; color: #E6EDE9; }
.steps .sd { color: #8FA39A; font-size: 12px; }
.field { margin-bottom: 10px; }
.field label { display: flex; align-items: center; justify-content: space-between; font-size: 12px; color: #C9D6D0; margin-bottom: 4px; }
.field label b { color: #F87171; font-weight: 500; margin-left: 3px; }
.field .in { width: 100%; padding: 8px 10px; border-radius: 9px; border: 1px solid rgba(255,255,255,.1); background: #151D19; color: #fff; font: 12px/1.4 "Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace; outline: none; }
.field .in:focus { border-color: #18E299; }
.field textarea.in { min-height: 88px; resize: vertical; }
.field .ok { border-color: rgba(24,226,153,.6); }
.row { display: flex; gap: 6px; align-items: center; }
.row .in { flex: 1; }
.mini { padding: 4px 9px; border-radius: 9999px; border: 1px solid rgba(255,255,255,.14); background: transparent; color: #C9D6D0; font-size: 11px; cursor: pointer; white-space: nowrap; font-family: inherit; }
.mini:hover { border-color: #18E299; color: #18E299; }
.mini.on { border-color: #18E299; color: #0F1613; background: #18E299; }
.file { display: flex; align-items: center; gap: 8px; }
.file .name { flex: 1; font-size: 12px; color: #C9D6D0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.file input { display: none; }
.sel { width: 100%; padding: 8px 10px; border-radius: 9px; border: 1px solid rgba(255,255,255,.1); background: #151D19; color: #fff; font: 12px Inter, system-ui, sans-serif; }
.actions { display: flex; gap: 8px; align-items: center; margin-top: 14px; }
.btn { flex: 1; padding: 10px 16px; border-radius: 9999px; border: none; font: 600 13px Inter, system-ui, sans-serif; cursor: pointer; }
.btn.acc { background: #18E299; color: #04160E; }
.btn.acc:disabled { opacity: .4; cursor: not-allowed; }
.btn.ghost { background: transparent; color: #C9D6D0; border: 1px solid rgba(255,255,255,.14); flex: 0 0 auto; }
.msg { margin-top: 10px; padding: 10px 12px; border-radius: 10px; font-size: 12px; line-height: 1.5; }
.msg.ok { background: rgba(24,226,153,.1); color: #9EF0CF; }
.msg.err { background: rgba(248,113,113,.1); color: #FCA5A5; }
.msg.warn { background: rgba(245,165,36,.1); color: #FCD48A; }
.msg a { color: inherit; text-decoration: underline; }
.hint { font-size: 11px; color: #8FA39A; margin-top: 6px; }
.pickbar { position: fixed; left: 50%; top: 16px; transform: translateX(-50%); z-index: 2147483001; background: #0F1613; color: #fff; border: 1px solid rgba(24,226,153,.5); border-radius: 9999px; padding: 8px 16px; font: 12px Inter, system-ui, sans-serif; box-shadow: 0 8px 24px rgba(0,0,0,.4); display: none; }
.pickbar.on { display: block; }
.pickbar b { color: #18E299; }
.notice { display: none; align-items: center; gap: 10px; max-width: min(720px, calc(100vw - 40px)); border-radius: 14px; padding: 9px 10px 9px 16px; line-height: 1.45; }
.notice.on { display: flex; }
.notice .mini { flex-shrink: 0; }
.notice .x { flex-shrink: 0; padding: 0 6px; }
`;
