#!/usr/bin/env python3
"""打一个可复现的 zip：同一份源码在任何机器上打出的 zip 字节完全一致。

做法：只收录清单、图标和 src；路径排序；所有条目的时间戳固定成 2000-01-01；
DEFLATED 固定压缩级别。Release 页附带 sha256，商店上架用的就是这个 zip，
任何人 clone 仓库自己跑一遍就能对上。
"""
import hashlib
import json
import os
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INCLUDE_DIRS = ("icons", "src")
INCLUDE_FILES = ("manifest.json", "LICENSE")
FIXED_TIME = (2000, 1, 1, 0, 0, 0)


def files():
    out = list(INCLUDE_FILES)
    for d in INCLUDE_DIRS:
        for base, _dirs, names in os.walk(os.path.join(ROOT, d)):
            for n in names:
                if n.startswith(".") or n.endswith(".svg"):
                    continue
                out.append(os.path.relpath(os.path.join(base, n), ROOT))
    return sorted(out)


def main():
    with open(os.path.join(ROOT, "manifest.json"), encoding="utf-8") as f:
        version = json.load(f)["version"]
    dist = os.path.join(ROOT, "dist")
    os.makedirs(dist, exist_ok=True)
    out = os.path.join(dist, f"apkgo-assistant-{version}.zip")
    with zipfile.ZipFile(out, "w") as z:
        for rel in files():
            with open(os.path.join(ROOT, rel), "rb") as f:
                data = f.read()
            info = zipfile.ZipInfo(rel.replace(os.sep, "/"), date_time=FIXED_TIME)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            z.writestr(info, data, compresslevel=9)
    digest = hashlib.sha256(open(out, "rb").read()).hexdigest()
    with open(out + ".sha256", "w", encoding="utf-8") as f:
        f.write(f"{digest}  {os.path.basename(out)}\n")
    print(out)
    print(digest)
    if len(sys.argv) > 1 and sys.argv[1] == "--check-tag":
        tag = os.environ.get("GITHUB_REF_NAME", "")
        if tag and tag != f"v{version}":
            print(f"tag {tag} != manifest version v{version}", file=sys.stderr)
            sys.exit(1)


if __name__ == "__main__":
    main()
