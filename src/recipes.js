// 每家商店一份「配方」：后台域名、入口页、前置条件、步骤、要采集的字段。
//
// 加一家商店 = 加一个对象。字段的 key 必须和 apkgo store schema 的 key 一致
// （GET https://apkgo.baici.tech/api/v1/stores/schemas 可以看到全部）。
// kind:
//   text      单行明文（ID 之类）
//   secret    单行密文（secret / key）
//   multiline 多行密文（PEM 私钥），不能用单行输入框，会被吃掉换行
//   file-b64  选文件 → base64（apkgo 对应字段接受 base64）
//   file-text 选文件 → 原文（PEM）
// hints 是自动识别时匹配页面上标签文字的正则；pattern 用来过滤识别到的值。
// 各家后台会改版，菜单名和入口 URL 以实际为准——错了请提 PR，改这个文件就行。

const APKGO_RECIPES = [
  {
    id: "huawei", cn: "华为", product: "AppGallery Connect",
    hostRe: /(^|\.)developer\.huawei\.com$/,
    // 「用户与访问 → API密钥 → Connect API」那一页（2026-09 实登核对）。
    console: "https://developer.huawei.com/consumer/cn/service/josp/agc/index.html#/ups/9249519184595983326",
    prereq: ["需要团队管理员账号，否则顶部没有「用户与访问」", "华为提示「API 客户端」即将被 Service Account 替代，新建请选 Service Account"],
    steps: [
      { t: "登录 AppGallery Connect，顶部点「用户与访问」", d: "" },
      { t: "左侧「API密钥 → Connect API」，停在「Service Account」页签", d: "列表里能看到已有的服务账号；apkgo 需要一个「开发者级 · APP管理员」的。" },
      { t: "点右上角「创建」", d: "名称随意（如 apkgo），类型选「开发者级」，角色勾「APP管理员」，确认。" },
      { t: "下载弹出的 JSON 文件，然后在本面板选中它", d: "JSON 只能下载一次，丢了要重新创建。" },
    ],
    fields: [
      { key: "service_account", label: "服务账号 JSON 文件", kind: "file-b64", accept: ".json,application/json", required: true },
    ],
  },
  {
    id: "xiaomi", cn: "小米", product: "小米开放平台",
    hostRe: /(^|\.)dev\.(mi|xiaomi)\.com$/,
    console: "https://dev.mi.com/",
    prereq: ["请用主账号；团队子账号可能没有「自动发布」入口", "私钥每次「重置」都会变，重置后要重新采集", "第一次开通接口通常要联系小米客服"],
    steps: [
      { t: "登录小米开放平台 → 应用商店开发者站", d: "用主账号。" },
      { t: "找到「自动发布接口」/「API 密钥」页", d: "在应用管理或账号设置附近；文档 pId=1134 有截图。" },
      { t: "生成 / 重置私钥，下载公钥证书", d: "私钥是一串长字符，公钥证书是 .cer 或 .pem 文件。" },
      { t: "在本面板填账号邮箱、私钥，并选中证书文件", d: "" },
    ],
    fields: [
      { key: "email", label: "开发者账号邮箱", kind: "text", hints: [/邮箱|e-?mail|账号/i], pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, required: true },
      { key: "private_key", label: "私钥", kind: "secret", hints: [/私钥|private\s*key|password|密码/i], pattern: /^[A-Za-z0-9+/=_-]{16,}$/, required: true },
      { key: "cert", label: "公钥证书文件（.cer / .pem）", kind: "file-b64", accept: ".cer,.pem,.crt", required: true },
    ],
  },
  {
    id: "oppo", cn: "OPPO", product: "OPPO 开放平台",
    hostRe: /(^|\.)open\.oppomobile\.com$/,
    console: "https://open.oppomobile.com/",
    prereq: ["需要企业开发者账号", "团队账号请用管理员账号登录，子账号看不到「API 密钥管理」"],
    steps: [
      { t: "登录 OPPO 开放平台", d: "用主账号或管理员账号。" },
      { t: "管理中心 → 应用服务平台 → API 密钥管理", d: "" },
      { t: "创建客户端", d: "创建后页面上显示 client_id 和 client_secret。" },
      { t: "在本面板点「自动识别」或逐项「点选」，然后保存", d: "" },
    ],
    fields: [
      { key: "client_id", label: "Client ID", kind: "text", hints: [/client[\s_-]*id/i, /客户端\s*ID/i], pattern: /^\d{4,}$/, required: true },
      { key: "client_secret", label: "Client Secret", kind: "secret", hints: [/client[\s_-]*secret/i, /密钥|secret/i], pattern: /^[A-Za-z0-9]{16,}$/, required: true },
    ],
  },
  {
    id: "vivo", cn: "vivo", product: "vivo 开放平台",
    hostRe: /(^|\.)dev\.vivo\.com\.cn$/,
    console: "https://dev.vivo.com.cn/",
    prereq: ["请用主账号操作", "沙箱密钥和正式密钥是两对，apkgo 只用正式的"],
    steps: [
      { t: "登录 vivo 开放平台", d: "" },
      { t: "账号 → 账号管理 → API 管理", d: "也可能在「分发服务 → API 接入」。" },
      { t: "点「立即开通」", d: "开通后平台分配 access_key 和 access_secret。" },
      { t: "在本面板采集这两个值并保存", d: "" },
    ],
    fields: [
      { key: "access_key", label: "Access Key", kind: "text", hints: [/access[\s_-]*key/i], pattern: /^[A-Za-z0-9]{8,}$/, required: true },
      { key: "access_secret", label: "Access Secret", kind: "secret", hints: [/access[\s_-]*secret/i, /secret|密钥/i], pattern: /^[A-Za-z0-9]{16,}$/, required: true },
    ],
  },
  {
    id: "honor", cn: "荣耀", product: "荣耀开发者服务平台",
    hostRe: /(^|\.)developer\.(honor|hihonor)\.com$/,
    console: "https://developer.honor.com/cn/",
    prereq: ["请用管理员账号", "发布前应用简介不能为空，否则验证会提示"],
    steps: [
      { t: "登录荣耀开发者服务平台", d: "" },
      { t: "管理中心 → 开放能力 → 凭据", d: "" },
      { t: "申请 API 密钥（创建客户端）", d: "拿到 client_id 和密钥。" },
      { t: "在本面板采集并保存", d: "" },
    ],
    fields: [
      { key: "client_id", label: "Client ID", kind: "text", hints: [/client[\s_-]*id/i, /客户端\s*ID/i], pattern: /^[A-Za-z0-9]{6,}$/, required: true },
      { key: "client_secret", label: "Client Secret（密钥）", kind: "secret", hints: [/client[\s_-]*secret/i, /密钥|secret/i], pattern: /^[A-Za-z0-9]{16,}$/, required: true },
    ],
  },
  {
    id: "tencent", cn: "应用宝", product: "腾讯开放平台",
    hostRe: /(^|\.)open\.qq\.com$/,
    console: "https://open.qq.com/",
    prereq: ["API 发布接口需要「申请开通」并等审核", "每个应用还要一个 app_id，在应用详情页能看到"],
    steps: [
      { t: "登录腾讯开放平台（应用宝）", d: "" },
      { t: "账户管理 → API 发布接口 → 申请开通", d: "审核通过后才有 access_secret。" },
      { t: "记下 user_id（开发者 ID）和 access_secret", d: "" },
      { t: "在应用详情页记下要发布的应用的 app_id，一起填到本面板", d: "" },
    ],
    fields: [
      { key: "user_id", label: "User ID（开发者 ID）", kind: "text", hints: [/user[\s_-]*id/i, /开发者\s*ID|用户\s*ID/i], pattern: /^\d{4,}$/, required: true },
      { key: "access_secret", label: "Access Secret", kind: "secret", hints: [/access[\s_-]*secret/i, /secret|密钥/i], pattern: /^[A-Za-z0-9]{16,}$/, required: true },
      { key: "__tencent_pkg", label: "应用包名", kind: "text", placeholder: "com.example.app", required: true, virtual: true },
      { key: "__tencent_appid", label: "该应用的 App ID", kind: "text", hints: [/app\s*id|应用\s*ID/i], pattern: /^\d{4,}$/, required: true, virtual: true },
    ],
    // 应用宝的 app_id 按包名映射；这里把两个虚拟字段合成 apkgo 要的 app_id_map。
    finalize(config) {
      const pkg = (config.__tencent_pkg || "").trim();
      const id = (config.__tencent_appid || "").trim();
      const out = { user_id: config.user_id, access_secret: config.access_secret };
      if (pkg && id) out.app_id_map = JSON.stringify({ [pkg]: id });
      return out;
    },
  },
  {
    id: "meizu", cn: "魅族", product: "魅族 Flyme 开放平台",
    hostRe: /(^|\.)open\.flyme\.cn$/,
    console: "https://open.flyme.cn/",
    prereq: [],
    steps: [
      { t: "登录魅族开放平台", d: "" },
      { t: "找到「客户端凭证」/ API 密钥页", d: "" },
      { t: "在本面板采集 client_id 和 client_secret 并保存", d: "" },
    ],
    fields: [
      { key: "client_id", label: "Client ID", kind: "text", hints: [/client[\s_-]*id/i, /客户端\s*ID/i], pattern: /^[A-Za-z0-9]{4,}$/, required: true },
      { key: "client_secret", label: "Client Secret", kind: "secret", hints: [/client[\s_-]*secret/i, /密钥|secret/i], pattern: /^[A-Za-z0-9]{16,}$/, required: true },
    ],
  },
  {
    id: "samsung", cn: "Samsung", product: "Galaxy Store Seller Portal",
    hostRe: /(^|\.)seller\.samsungapps\.com$/,
    console: "https://seller.samsungapps.com/",
    prereq: ["需要 Seller Portal 的 Assign 权限来创建 service account"],
    steps: [
      { t: "登录 Seller Portal", d: "" },
      { t: "Assistance → API Service → Create Service Account", d: "下载私钥 PEM，只能下载一次。" },
      { t: "记下 Service Account ID，以及应用的 Content ID", d: "" },
      { t: "在本面板填好并保存", d: "" },
    ],
    fields: [
      { key: "service_account_id", label: "Service Account ID", kind: "text", hints: [/service\s*account\s*id/i], required: true },
      { key: "private_key", label: "私钥文件（PEM）", kind: "file-text", accept: ".pem,.key,.txt", required: true },
      { key: "content_id", label: "Content ID", kind: "text", hints: [/content\s*id/i], pattern: /^\d{6,}$/, required: true },
    ],
  },
  {
    id: "appstore", cn: "App Store", product: "App Store Connect",
    hostRe: /(^|\.)appstoreconnect\.apple\.com$/,
    console: "https://appstoreconnect.apple.com/access/integrations/api",
    prereq: ["需要 Account Holder 或 Admin 角色", ".p8 私钥只能下载一次，下载后妥善保存"],
    steps: [
      { t: "用户和访问 → 集成 → App Store Connect API", d: "选「团队密钥」。" },
      { t: "生成 API 密钥，访问权限选 App Manager 或 Admin", d: "" },
      { t: "记下 Issuer ID 和密钥 ID，下载 .p8 文件", d: "" },
      { t: "在本面板填好并选中 .p8 文件，保存", d: "" },
    ],
    fields: [
      { key: "issuer_id", label: "Issuer ID", kind: "text", hints: [/issuer\s*id/i], pattern: /^[0-9a-f-]{36}$/i, required: true },
      { key: "key_id", label: "密钥 ID（Key ID）", kind: "text", hints: [/key\s*id|密钥\s*ID/i], pattern: /^[A-Z0-9]{10}$/, required: true },
      { key: "private_key", label: "私钥文件（.p8）", kind: "file-text", accept: ".p8,.pem", required: true },
    ],
  },
  {
    id: "googleplay", cn: "Google Play", product: "Google Play Console",
    hostRe: /(^|\.)play\.google\.com$/,
    console: "https://play.google.com/console/",
    prereq: ["要先在 Google Cloud 创建服务账号并下载 JSON，再回 Play Console 邀请它", "这一家暂时请在 apkgo 添加页手动上传 JSON"],
    steps: [
      { t: "Play Console → 设置 → API 访问权限", d: "关联一个 Google Cloud 项目。" },
      { t: "在 Google Cloud 创建服务账号并生成 JSON 密钥", d: "" },
      { t: "回到 Play Console 邀请该服务账号，授予发布权限", d: "" },
      { t: "在 apkgo 添加页上传这个 JSON", d: "" },
    ],
    fields: [],
  },
];
