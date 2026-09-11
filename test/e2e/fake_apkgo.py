# 伪 apkgo 服务：一个 /credentials/new 页面（模拟网页侧协议）+ 两个 Open API 端点。
import json, sys
from http.server import BaseHTTPRequestHandler, HTTPServer

PAGE = """<!doctype html><html><head><meta charset="utf-8"><title>fake apkgo</title></head><body>
<h1>fake apkgo · /credentials/new</h1><pre id="log"></pre>
<script>
const log = (m) => { document.getElementById('log').textContent += m + "\\n"; };
window.__state = {};
window.addEventListener('message', (e) => {
  if (e.source !== window || e.origin !== location.origin) return;
  const d = e.data; if (!d || d.source !== 'apkgo-assistant') return;
  log('ext→page ' + JSON.stringify(d));
  if (d.type === 'ready') window.__state.ready = d;
  if (d.type === 'paired') window.__state.paired = d.paired;
  if (d.type === 'error') window.__state.error = d.message;
});
window.postMessage({ source: 'apkgo-web', type: 'hello' }, location.origin);
window.__pair = (key) => window.postMessage({ source: 'apkgo-web', type: 'pair', apiKey: key, origin: location.origin, orgId: 'org-1', orgName: '寓小二科技' }, location.origin);
window.__open = (store) => window.postMessage({ source: 'apkgo-web', type: 'open-console', store }, location.origin);
</script></body></html>"""

RECEIVED = []

class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def _send(self, code, body, ctype="application/json"):
        data = body.encode() if isinstance(body, str) else json.dumps(body, ensure_ascii=False).encode()
        self.send_response(code); self.send_header("Content-Type", ctype + "; charset=utf-8"); self.send_header("Content-Length", str(len(data))); self.end_headers(); self.wfile.write(data)
    def _auth(self):
        k = self.headers.get("X-API-Key", "")
        return k.startswith("apkgo_") and len(k) > 20
    def do_GET(self):
        if self.path.startswith("/credentials/new"): return self._send(200, PAGE, "text/html")
        if self.path == "/openapi/v1/apps":
            if not self._auth(): return self._send(401, {"error": "invalid api key"})
            return self._send(200, {"data": [{"id": "a1", "display_name": "寓小二房东版", "package_name": "com.yuxiaor"}, {"id": "a2", "display_name": "米宿管家", "package_name": "com.yuxiaor.misu"}]})
        if self.path == "/__received": return self._send(200, RECEIVED)
        return self._send(404, {"error": "not found"})
    def do_POST(self):
        n = int(self.headers.get("Content-Length", "0")); body = json.loads(self.rfile.read(n) or b"{}")
        if self.path == "/openapi/v1/credentials":
            if not self._auth(): return self._send(401, {"error": "invalid api key"})
            RECEIVED.append({"headers": {"X-API-Key": self.headers.get("X-API-Key", "")[:14] + "…"}, "body": body})
            if body.get("config", {}).get("client_secret") == "bad":
                return self._send(400, {"error": "凭证验证失败: token: [10001] invalid client_secret"})
            return self._send(201, {"data": {"id": "c1", "store_name": body.get("store_name"), "label": body.get("label"), "verified": True}})
        return self._send(404, {"error": "not found"})

HTTPServer(("127.0.0.1", int(sys.argv[1]) if len(sys.argv) > 1 else 9090), H).serve_forever()
