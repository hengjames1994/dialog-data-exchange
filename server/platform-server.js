import { createServer } from "node:http";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const rootDir = resolve(__dirname, "..");
const publicDir = resolve(process.env.PUBLIC_DIR || join(rootDir, "www"));
const dataDir = resolve(process.env.DATA_DIR || join(rootDir, "server", "data"));
const dbFile = resolve(process.env.DB_FILE || join(dataDir, "market.json"));
const port = Number(process.env.PORT || 8787);

const defaultPackages = [
  {
    id: "research-methods",
    title: "科研论文方法论多轮问答包",
    domain: "科研",
    records: 12840,
    score: 92,
    price: 148000,
    license: "商业训练",
    tags: ["实验设计", "统计检验", "文献综述"],
    seller: "平台精选",
    status: "listed",
    createdAt: "2026-06-02T00:00:00.000Z",
  },
  {
    id: "python-debug",
    title: "Python Debug 与代码解释对话包",
    domain: "编程",
    records: 36420,
    score: 88,
    price: 126000,
    license: "微调训练",
    tags: ["异常定位", "重构", "测试"],
    seller: "开发者社区",
    status: "listed",
    createdAt: "2026-06-02T00:00:00.000Z",
  },
  {
    id: "office-writing",
    title: "办公写作与会议纪要优化包",
    domain: "办公",
    records: 52100,
    score: 74,
    price: 68000,
    license: "商业训练",
    tags: ["邮件", "纪要", "汇报"],
    seller: "企业团队",
    status: "listed",
    createdAt: "2026-06-02T00:00:00.000Z",
  },
  {
    id: "tutor-dialogue",
    title: "中学数学分步讲解对话包",
    domain: "教育",
    records: 21460,
    score: 81,
    price: 91000,
    license: "评测/研究",
    tags: ["解题步骤", "错因分析", "追问"],
    seller: "教育内容方",
    status: "listed",
    createdAt: "2026-06-02T00:00:00.000Z",
  },
];

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload));
}

function sendText(response, statusCode, text) {
  response.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
  response.end(text);
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

async function readJsonBody(request) {
  const body = await readBody(request);
  if (!body) return {};
  return JSON.parse(body);
}

async function readDb() {
  if (!existsSync(dbFile)) {
    return { packages: defaultPackages, orders: [] };
  }
  return JSON.parse(await readFile(dbFile, "utf8"));
}

async function writeDb(db) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(dbFile, JSON.stringify(db, null, 2));
}

function cleanPackage(input) {
  const now = new Date().toISOString();
  const title = String(input.title || "").trim().slice(0, 80);
  const domain = String(input.domain || "日常").trim().slice(0, 20);
  const score = Math.max(1, Math.min(100, Number(input.score || 1)));
  const price = Math.max(1, Math.round(Number(input.price || 1)));
  const records = Math.max(1, Math.round(Number(input.records || 1)));
  const license = String(input.license || "评测/研究").trim().slice(0, 30);
  const seller = String(input.seller || "匿名贡献者").trim().slice(0, 40);
  const tags = Array.isArray(input.tags) ? input.tags.map((tag) => String(tag).slice(0, 20)).slice(0, 6) : [];
  const sample = String(input.sample || "").slice(0, 6000);

  if (!title) throw new Error("数据包名称不能为空");

  return {
    id: `pkg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    domain,
    records,
    score,
    price,
    license,
    tags,
    seller,
    sample,
    status: "listed",
    createdAt: now,
  };
}

async function handleApi(request, response, url) {
  if (request.method === "GET" && url.pathname === "/api/health") {
    sendJson(response, 200, { ok: true, service: "dialog-data-exchange" });
    return true;
  }

  if (request.method === "GET" && url.pathname === "/api/packages") {
    const db = await readDb();
    sendJson(response, 200, { packages: db.packages.filter((item) => item.status === "listed") });
    return true;
  }

  if (request.method === "POST" && url.pathname === "/api/packages") {
    const input = await readJsonBody(request);
    const db = await readDb();
    const item = cleanPackage(input);
    db.packages = [item, ...db.packages];
    await writeDb(db);
    sendJson(response, 201, { package: item });
    return true;
  }

  if (request.method === "POST" && url.pathname === "/api/orders") {
    const input = await readJsonBody(request);
    const db = await readDb();
    const item = db.packages.find((entry) => entry.id === input.packageId);

    if (!item) {
      sendJson(response, 404, { error: "数据包不存在" });
      return true;
    }

    const order = {
      id: `order-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      packageId: item.id,
      packageTitle: item.title,
      buyer: String(input.buyer || "模型公司试用账号").slice(0, 60),
      amount: item.price,
      status: "pending-payment",
      createdAt: new Date().toISOString(),
    };

    db.orders = [order, ...db.orders];
    await writeDb(db);
    sendJson(response, 201, { order });
    return true;
  }

  if (request.method === "GET" && url.pathname === "/api/orders") {
    const db = await readDb();
    sendJson(response, 200, { orders: db.orders });
    return true;
  }

  return false;
}

async function serveStatic(request, response, url) {
  const requestedPath = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const safePath = requestedPath.replace(/^\/+/, "");
  const filePath = resolve(publicDir, safePath);

  if (!filePath.startsWith(publicDir)) {
    sendText(response, 403, "Forbidden");
    return;
  }

  try {
    const info = await stat(filePath);
    const target = info.isDirectory() ? join(filePath, "index.html") : filePath;
    const content = await readFile(target);
    const ext = extname(target);
    response.writeHead(200, {
      "Content-Type": mimeTypes[ext] || "application/octet-stream",
      "Cache-Control": ext === ".js" || ext === ".css" ? "public, max-age=3600" : "no-cache",
    });
    response.end(content);
  } catch {
    const fallback = await readFile(join(publicDir, "index.html"));
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end(fallback);
  }
}

const server = createServer(async (request, response) => {
  if (request.method === "OPTIONS") {
    sendJson(response, 204, {});
    return;
  }

  try {
    const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
    if (url.pathname.startsWith("/api/")) {
      const handled = await handleApi(request, response, url);
      if (!handled) sendJson(response, 404, { error: "接口不存在" });
      return;
    }
    await serveStatic(request, response, url);
  } catch (error) {
    sendJson(response, 500, { error: error.message || "服务器错误" });
  }
});

server.listen(port, () => {
  console.log(`数语交易中心已启动：http://localhost:${port}`);
});
