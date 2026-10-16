"use strict";

const http = require("node:http");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const { pipeline } = require("node:stream/promises");
const path = require("node:path");
const os = require("node:os");
const { createStorage } = require("./storage");
const { transfer } = require("./transfers");
const { randomBytes, randomUUID, scrypt, timingSafeEqual } = require("node:crypto");
const { promisify } = require("node:util");
const { AppError, DEFAULT_COMPANY, text, validateCompany, validateCertificate, code, hash, filename, checkPdf, period } = require("./core");

const scryptAsync = promisify(scrypt);
const ROOT = __dirname;
const PUBLIC_FILES = new Set(["index.html", "login.html", "dashboard.html", "settings.html", "verify.html", "styles.css", "workspace.css", "script.js", "ui.js", "editor.js", "login.js", "dashboard.js", "settings.js", "verify.js", "favicon.svg", "logo.svg", "lucide.min.js", "jszip.min.js", "html2canvas.min.js", "jspdf.umd.min.js", "qrcode.min.js"]);
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml" };
const SUMMARY_SQL = `SELECT id,code,status,revision,pdf_hash,LENGTH(pdf) AS pdf_bytes,created_at,updated_at,issued_at,revoked_at,revoke_reason,
  json_extract(data,'$.studentName') AS student_name,json_extract(data,'$.studentDoc') AS student_doc,
  json_extract(data,'$.company') AS company,json_extract(data,'$.course') AS course,json_extract(data,'$.courseKey') AS course_key,
  json_extract(data,'$.hours') AS hours,json_extract(data,'$.dateMode') AS date_mode,json_extract(data,'$.completionDate') AS completion_date,
  json_extract(data,'$.startDate') AS start_date,json_extract(data,'$.endDate') AS end_date FROM certificates`;

async function passwordHash(password, salt = randomBytes(16).toString("hex")) {
  const digest = await scryptAsync(password, salt, 64);
  return `${salt}:${digest.toString("hex")}`;
}
async function passwordMatches(password, stored) {
  const [salt, digest] = stored.split(":");
  const candidate = await passwordHash(password, salt);
  return timingSafeEqual(Buffer.from(candidate.split(":")[1], "hex"), Buffer.from(digest, "hex"));
}
function accountInput(input) {
  const username = text(input.username || "", 64).toLowerCase();
  const name = text(input.name || "", 120);
  const password = passwordInput(input.password);
  if (!/^[a-z0-9._-]{3,64}$/.test(username)) throw new AppError("Usuário: use de 3 a 64 letras, números, ponto, hífen ou sublinhado.");
  if (!name) throw new AppError("Informe seu nome.");
  if (password.trim().length < 12) throw new AppError("Use uma senha com pelo menos 12 caracteres.");
  return { username, name, password, role: input.role === "operator" ? "operator" : "admin" };
}

function passwordInput(value) {
  if (typeof value !== "string" || value.length > 200 || /[\x00-\x1f]/.test(value)) throw new AppError("Senha inválida.");
  return value;
}

function bufferedResponse() {
  let status=200, payload;
  const headers={};
  return {
    setHeader(key,value){headers[key]=value;},
    writeHead(code,values){status=code;Object.assign(headers,values);},
    end(value){payload=value;},
    flush(res){res.writeHead(status,headers);res.end(payload);}
  };
}

function createApplication({ dataDir = process.env.VS_DATA_DIR || (process.env.VS_DATABASE_URL ? path.join(os.tmpdir(), "vscursos") : path.join(ROOT, ".data")), secureCookie = process.env.VS_SECURE_COOKIE === "1", databaseUrl = process.env.VS_DATABASE_URL } = {}) {
  const storage = createStorage(dataDir, databaseUrl);
  const { db } = storage;
  const attempts = new Map();
  let setupBusy = false;
  let closing = false;
  const allowedHosts = new Set(["127.0.0.1", "localhost", "[::1]", process.env.VERCEL_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL, ...(process.env.VS_ALLOWED_HOSTS || "").split(",")].filter(Boolean).map((value) => value.trim().toLowerCase()));
  const now = () => new Date().toISOString();
  function businessDate(value = now()) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: process.env.VS_TIMEZONE || "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value)).map((item) => [item.type, item.value]));
    return `${parts.year}-${parts.month}-${parts.day}`;
  }
  const company = async () => JSON.parse((await db.prepare("SELECT data FROM settings WHERE id=1").get()).data);
  const publicUser = (row) => ({ id: row.id, username: row.username, name: row.name, role: row.role, active: !!row.active });
  const audit = async (user, action, target = "", detail = "") => await db.prepare("INSERT INTO audit (at,user_id,actor,action,target,detail) VALUES (?,?,?,?,?,?)").run(now(), user?.id || null, user?.username || "sistema", action, target, detail);
  function transaction(fn) {
    return storage.transaction(fn);
  }
  function record(row, withData = true) {
    const data = row.data ? JSON.parse(row.data) : { studentName: row.student_name, studentDoc: row.student_doc, company: row.company, course: row.course, courseKey: row.course_key, hours: row.hours, dateMode: row.date_mode, completionDate: row.completion_date, startDate: row.start_date, endDate: row.end_date };
    return { id: row.id, code: row.code, status: row.status, revision: row.revision,
      studentName: data.studentName, studentDoc: data.studentDoc, course: data.course, courseKey: data.courseKey, company: data.company,
      hours: data.hours, period: period(data), createdAt: row.created_at, updatedAt: row.updated_at, issuedAt: row.issued_at,
      revokedAt: row.revoked_at, revokeReason: row.revoke_reason, hasPdf: !!row.pdf_hash, pdfHash: row.pdf_hash, pdfBytes: row.pdf?.length || row.pdf_bytes || 0,
      ...(withData ? { data } : {}) };
  }
  async function findRecord(id) {
    const row = await db.prepare("SELECT * FROM certificates WHERE id=?").get(id);
    if (!row) throw new AppError("Certificado não encontrado.", 404);
    return row;
  }
  async function session(req) {
    const raw = (req.headers.cookie || "").match(/(?:^|;\s*)vs_session=([a-f0-9]{64})(?:;|$)/)?.[1];
    if (!raw) return null;
    return (await db.prepare("SELECT u.* FROM sessions s JOIN users u ON s.user_id=u.id WHERE s.token=? AND s.expires>? AND u.active=1").get(hash(raw), Date.now())) || null;
  }
  async function setSession(res, user) {
    const token = randomBytes(32).toString("hex");
    await db.prepare("DELETE FROM sessions WHERE expires<?").run(Date.now());
    await db.prepare("INSERT INTO sessions (token,user_id,expires) VALUES (?,?,?)").run(hash(token), user.id, Date.now() + 12 * 60 * 60 * 1000);
    res.setHeader("Set-Cookie", `vs_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200${secureCookie ? "; Secure" : ""}`);
  }
  function send(res, status, value) {
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    res.end(JSON.stringify(value));
  }
  async function body(req, max = 16 * 1024 * 1024, raw = false) {
    const type = req.headers["content-type"]?.split(";")[0];
    if (type !== (raw ? "application/pdf" : "application/json")) throw new AppError("Tipo de conteúdo inválido.", 415);
    if (Number(req.headers["content-length"] || 0) > max) throw new AppError("Arquivo maior que o limite permitido.", 413);
    const chunks = [];let size = 0;
    if(!req._transferBody) for await (const chunk of req) {size += chunk.length;if (size > max) throw new AppError("Arquivo maior que o limite permitido.", 413);chunks.push(chunk);}
    const buffer = req._transferBody || Buffer.concat(chunks);
    if(buffer.length>max) throw new AppError("Arquivo maior que o limite permitido.",413);
    if (raw) return buffer;
    try {const result = JSON.parse(buffer.toString("utf8"));if (!result || typeof result !== "object" || Array.isArray(result)) throw new Error();return result;}
    catch {throw new AppError("JSON inválido.");}
  }
  function guardMutation(req) {
    const expected = `${secureCookie ? "https" : "http"}://${req.headers.host}`;
    if (req.headers["x-vs-request"] !== "1" || req.headers.origin !== expected) throw new AppError("Origem da solicitação não autorizada.", 403);
  }
  async function throttle(req, kind, limit = 10) {
    const address = process.env.VERCEL ? req.headers["x-vercel-forwarded-for"] || req.socket.remoteAddress : req.socket.remoteAddress;
    const key = hash(`${kind}:${address}`);
    if (await storage.throttle(key, limit)) return;
    const time = Date.now();const entry = attempts.get(key);
    if (entry && entry.until > time && entry.count >= limit) throw new AppError("Muitas tentativas. Aguarde 15 minutos.", 429);
    if (!entry || entry.until <= time) attempts.set(key, { count: 1, until: time + 15 * 60 * 1000 });else entry.count++;
    if (attempts.size > 2000) for (const [k, v] of attempts) if (v.until < time) attempts.delete(k);
  }
  async function createDraft(data, user) {
    const id = randomUUID(),timestamp = now();
    await db.prepare("INSERT INTO certificates (id,code,status,data,created_at,updated_at,user_id) VALUES (?,?,'draft',?,?,?,?)").run(id, code(), JSON.stringify(data), timestamp, timestamp, user.id);
    await audit(user, "draft.created", id);
    return record(await findRecord(id));
  }

  async function api(req, res, url) {
    const route = url.pathname,method = req.method;
    if (!["GET", "POST", "PUT", "PATCH", "DELETE"].includes(method)) throw new AppError("Método não permitido.", 405);
    if (method !== "GET") guardMutation(req);
    if (route === "/api/auth/status" && method === "GET") return send(res, 200, { needsSetup: !(await db.prepare("SELECT id FROM users LIMIT 1").get()), user: (await session(req)) ? publicUser(await session(req)) : null });
    if (route === "/api/auth/setup" && method === "POST") {
      const hostname = new URL(`http://${req.headers.host}`).hostname;
      if (!["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(req.socket.remoteAddress) || !["127.0.0.1", "localhost", "[::1]"].includes(hostname)) throw new AppError("O primeiro acesso deve ser configurado neste computador.", 403);
      if (setupBusy || (await db.prepare("SELECT id FROM users LIMIT 1").get())) throw new AppError("O administrador já foi configurado.", 409);
      setupBusy = true;
      try {
        const input = accountInput(await body(req));const password = await passwordHash(input.password);
        const user = { id: randomUUID(), ...input, role: "admin", active: 1 };
        await transaction(async () => {await db.prepare("INSERT INTO users (id,username,name,password,role,created_at) VALUES (?,?,?,?,?,?)").run(user.id, user.username, user.name, password, "admin", now());await audit(user, "account.setup", user.id);});
        await setSession(res, user);return send(res, 201, { user: publicUser(user) });
      } finally {setupBusy = false;}
    }
    if (route === "/api/auth/login" && method === "POST") {
      await throttle(req, "login");
      const input = await body(req);const username = text(input.username || "", 64).toLowerCase();const password = passwordInput(input.password);
      const user = await db.prepare("SELECT * FROM users WHERE username=? AND active=1").get(username);
      const stored = user?.password || `00000000000000000000000000000000:${"00".repeat(64)}`;
      const matches = await passwordMatches(password, stored);
      if (!user || !matches || !(await db.prepare("SELECT id FROM users WHERE id=? AND active=1 AND password=?").get(user.id, user.password))) throw new AppError("Usuário ou senha inválidos.", 401);
      await setSession(res, user);await audit(user, "account.login", user.id);
      return send(res, 200, { user: publicUser(user) });
    }
    if (route.startsWith("/api/verify/") && method === "GET") {
      await throttle(req, "verify", 300);
      const certificateCode = decodeURIComponent(route.slice(12));
      if (!/^VS-\d{4}-[A-F0-9]{16}$/.test(certificateCode)) throw new AppError("Registro não encontrado.", 404);
      const row = await db.prepare("SELECT * FROM certificates WHERE code=? AND status!='draft'").get(certificateCode);
      if (!row) throw new AppError("Registro não encontrado ou ainda não emitido.", 404);
      const item = record(row);const data = item.data;
      return send(res, 200, { code: item.code, status: item.status, studentName: data.studentName, studentDoc: data.studentDoc.replace(/\D/g, "").replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "***.$2.$3-**"), course: data.course, hours: data.hours, period: item.period, instructor: data.instructor, instructorRole: data.instructorRole, company: data.brand.name, cnpj: data.brand.cnpj, issuedAt: item.issuedAt, revokedAt: item.revokedAt, pdfHash: item.pdfHash });
    }
    const user = await session(req);
    if (!user) throw new AppError("Sua sessão expirou. Entre novamente.", 401);
    if(route.startsWith("/api/transfers")) return transfer(req,res,url,{db,user,body,send,dispatch:api});
    const admin = () => {if (user.role !== "admin") throw new AppError("Esta ação exige um administrador.", 403);};
    if (route === "/api/auth/logout" && method === "POST") {
      const token = (req.headers.cookie || "").match(/vs_session=([a-f0-9]{64})/)?.[1];if (token) await db.prepare("DELETE FROM sessions WHERE token=?").run(hash(token));
      res.setHeader("Set-Cookie", "vs_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0");return send(res, 200, { ok: true });
    }
    if (route === "/api/auth/password" && method === "PUT") {
      await throttle(req, "password");const input = await body(req);
      if (!(await passwordMatches(passwordInput(input.currentPassword), user.password))) throw new AppError("A senha atual está incorreta.", 403);
      const next = passwordInput(input.password);if (next.trim().length < 12) throw new AppError("Use pelo menos 12 caracteres na nova senha.");
      const digest = await passwordHash(next);
      await transaction(async () => {if (!(await db.prepare("SELECT id FROM users WHERE id=? AND active=1 AND password=?").get(user.id, user.password))) throw new AppError("A conta mudou durante esta operação. Entre novamente.", 409);await db.prepare("UPDATE users SET password=? WHERE id=?").run(digest, user.id);await db.prepare("DELETE FROM sessions WHERE user_id=?").run(user.id);await audit(user, "account.password", user.id);});
      await setSession(res, user);return send(res, 200, { ok: true });
    }
    if (route === "/api/settings") {
      if (method === "GET") return send(res, 200, { company: await company() });
      if (method === "PUT") {admin();const next = validateCompany(await body(req));await db.prepare("UPDATE settings SET data=? WHERE id=1").run(JSON.stringify(next));await audit(user, "company.updated");return send(res, 200, { company: next });}
    }
    if (route === "/api/users") {
      admin();
      if (method === "GET") return send(res, 200, { users: (await db.prepare("SELECT * FROM users ORDER BY created_at").all()).map(publicUser) });
      if (method === "POST") {
        const input = accountInput(await body(req));
        if (await db.prepare("SELECT id FROM users WHERE username=?").get(input.username)) throw new AppError("Este usuário já existe.", 409);
        const password = await passwordHash(input.password),id = randomUUID();
        if (await db.prepare("SELECT id FROM users WHERE username=?").get(input.username)) throw new AppError("Este usuário já existe.", 409);
        await db.prepare("INSERT INTO users (id,username,name,password,role,created_at) VALUES (?,?,?,?,?,?)").run(id, input.username, input.name, password, input.role, now());await audit(user, "account.created", id);
        return send(res, 201, { user: publicUser(await db.prepare("SELECT * FROM users WHERE id=?").get(id)) });
      }
    }
    if (/^\/api\/users\/[^/]+$/.test(route) && method === "PATCH") {
      admin();const id = route.split("/")[3],input = await body(req);
      if (id === user.id) throw new AppError("Você não pode desativar ou alterar seu próprio perfil nesta tela.");
      if (!(await db.prepare("SELECT id FROM users WHERE id=?").get(id))) throw new AppError("Usuário não encontrado.", 404);
      if (typeof input.active !== "boolean") throw new AppError("Estado de usuário inválido.");
      const role = input.role === "admin" ? "admin" : "operator";
      await transaction(async () => {await db.prepare("UPDATE users SET active=?,role=? WHERE id=?").run(Number(input.active), role, id);await db.prepare("DELETE FROM sessions WHERE user_id=?").run(id);await audit(user, "account.updated", id);});
      return send(res, 200, { ok: true });
    }
    if (route === "/api/certificates/batch" && method === "POST") {
      const input = await body(req);
      let source = input.items;
      if (input.template && Array.isArray(input.students)) source = input.students.map((student) => ({ ...input.template, studentName: student.studentName, studentDoc: student.studentDoc, company: student.company || "", signatureImages: { ...input.template.signatureImages, student: "" } }));
      if (!Array.isArray(source) || !source.length || source.length > 200) throw new AppError("Importe de 1 a 200 alunos por lote.");
      const seen = new Set();
      const currentBrand = await company();
      const items = source.map((item, index) => {try {const data = validateCertificate({ ...item, brand: currentBrand }, true);const cpf = data.studentDoc.replace(/\D/g, "");if (seen.has(cpf)) throw new AppError("CPF duplicado na turma.");seen.add(cpf);return data;} catch (error) {throw new AppError(`Linha ${index + 1}: ${error.message}`);}});
      const result = await transaction(async () => {const result = [];for (const data of items) {const item = await createDraft(data, user);delete item.data;result.push(item);}return result;});
      return send(res, 201, { items: result });
    }
    if (route === "/api/certificates") {
      if (method === "POST") return send(res, 201, await transaction(async () => await createDraft(validateCertificate({ ...await body(req), brand: await company() }), user)));
      if (method === "GET") {
        const q = text(url.searchParams.get("q") || "", 200).toLocaleLowerCase("pt-BR");const status = url.searchParams.get("status") || "";const course = url.searchParams.get("course") || "";
        const from = url.searchParams.get("from") || "",to = url.searchParams.get("to") || "";
        if (from && !/^\d{4}-\d{2}-\d{2}$/.test(from) || to && !/^\d{4}-\d{2}-\d{2}$/.test(to)) throw new AppError("Filtro de data inválido.");
        let rows = (await db.prepare(`${SUMMARY_SQL} ORDER BY updated_at DESC,id DESC`).all()).map((row) => record(row, false));
        const normalize = (value) => String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
        rows = rows.filter((item) => (!q || normalize([item.studentName, item.studentDoc, item.studentDoc.replace(/\D/g, ""), item.code, item.company, item.course].join(" ")).includes(normalize(q))) && (!status || item.status === status) && (!course || item.courseKey === course) && (!from || businessDate(item.createdAt) >= from) && (!to || businessDate(item.createdAt) <= to));
        const limit = Math.min(1000, Math.max(1, Number(url.searchParams.get("limit")) || 25));const page = Math.max(1, Math.floor(Number(url.searchParams.get("page")) || 1));
        return send(res, 200, { items: rows.slice((page - 1) * limit, page * limit), total: rows.length, page, pages: Math.max(1, Math.ceil(rows.length / limit)) });
      }
    }
    const match = route.match(/^\/api\/certificates\/([^/]+)(?:\/(pdf|revoke|duplicate))?$/);
    if (match) {
      const [, id, action] = match;const row = await findRecord(id);
      if (!action && method === "GET") return send(res, 200, record(row));
      if (!action && method === "PUT") {
        const input = await body(req);
        const current = await findRecord(id);
        if (current.status !== "draft") throw new AppError("Certificados emitidos são imutáveis. Duplique para criar uma nova emissão.", 409);
        if (input.revision !== current.revision) throw new AppError("Este rascunho foi alterado em outra aba. Reabra-o no histórico.", 409);
        const data = validateCertificate({ ...input.data, brand: JSON.parse(current.data).brand });
        await db.prepare("UPDATE certificates SET data=?,revision=revision+1,updated_at=? WHERE id=?").run(JSON.stringify(data), now(), id);
        return send(res, 200, record(await findRecord(id)));
      }
      if (!action && method === "DELETE") {
        if (row.status !== "draft") throw new AppError("Somente rascunhos podem ser excluídos.", 409);
        await transaction(async () => {await db.prepare("DELETE FROM certificates WHERE id=?").run(id);await audit(user, "draft.deleted", id);});
        return send(res, 200, { ok: true });
      }
      if (action === "duplicate" && method === "POST") {
        const data = JSON.parse(row.data);
        data.signatureImages.student = "";
        return send(res, 201, await transaction(async () => await createDraft(data, user)));
      }
      if (action === "pdf" && method === "PUT") {
        if (row.status !== "draft") throw new AppError("Este certificado já foi emitido.", 409);
        const revision = Number(req.headers["x-vs-revision"]);
        if (revision !== row.revision) throw new AppError("O rascunho mudou antes da emissão. Salve e tente novamente.", 409);
        const pdf = await body(req, 25 * 1024 * 1024, true);checkPdf(pdf);const data = validateCertificate(JSON.parse(row.data), true);
        const digest = hash(pdf);
        await transaction(async () => {
          const current = await findRecord(id);
          if (current.status !== "draft" || current.revision !== revision) throw new AppError("Outra aba alterou este certificado. Reabra-o antes de emitir.", 409);
          const stamp = now();
          await db.prepare("UPDATE certificates SET status='issued',pdf=?,pdf_hash=?,pdf_name=?,issued_at=?,updated_at=?,revision=revision+1 WHERE id=?").run(pdf, digest, filename(data), stamp, stamp, id);await audit(user, "certificate.issued", id, row.code);
        });
        return send(res, 200, record(await findRecord(id)));
      }
      if (action === "pdf" && method === "GET") {
        if (!row.pdf) throw new AppError("Este certificado ainda não possui PDF.", 404);
        await audit(user, "certificate.downloaded", id);
        res.writeHead(200, { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${row.pdf_name}"`, "Cache-Control": "no-store", "Content-Length": row.pdf.length });return res.end(Buffer.from(row.pdf));
      }
      if (action === "revoke" && method === "POST") {
        admin();const input = await body(req);const reason = text(input.reason || "", 500);
        if (reason.length < 5) throw new AppError("Descreva o motivo do cancelamento (mínimo de 5 caracteres).");
        const stamp = now();
        await transaction(async () => {if ((await findRecord(id)).status !== "issued") throw new AppError("Somente certificados emitidos podem ser cancelados.", 409);await db.prepare("UPDATE certificates SET status='revoked',revoke_reason=?,revoked_at=?,updated_at=?,revision=revision+1 WHERE id=?").run(reason, stamp, stamp, id);await audit(user, "certificate.revoked", id, reason);});
        return send(res, 200, record(await findRecord(id)));
      }
    }
    if (route === "/api/dashboard" && method === "GET") {
      const items = (await db.prepare(`${SUMMARY_SQL} ORDER BY updated_at DESC`).all()).map((row) => record(row, false));
      const issued = items.filter((item) => item.status === "issued");const byCourse = {};
      for (const item of issued) byCourse[item.course] = (byCourse[item.course] || 0) + 1;
      return send(res, 200, { total: items.length, issued: issued.length, drafts: items.filter((item) => item.status === "draft").length, revoked: items.filter((item) => item.status === "revoked").length, students: new Set(issued.map((item) => item.studentDoc.replace(/\D/g, ""))).size, month: issued.filter((item) => businessDate(item.issuedAt).slice(0, 7) === businessDate().slice(0, 7)).length, byCourse, recent: items.slice(0, 8) });
    }
    if (route === "/api/audit" && method === "GET") {admin();return send(res, 200, { items: await db.prepare("SELECT at,actor,action,target,detail FROM audit ORDER BY id DESC LIMIT 100").all() });}
    if (route === "/api/backup/database" && method === "GET") {
      admin();const file = await automaticBackup("exportado");const info = await fsp.stat(file);await audit(user, "backup.database", "", String(info.size));
      res.writeHead(200, { "Content-Type": "application/octet-stream", "Content-Disposition": `attachment; filename="vs-cursos-banco-${now().slice(0, 10)}.sqlite"`, "Content-Length": info.size, "Cache-Control": "no-store" });
      await pipeline(fs.createReadStream(file), res);return;
    }
    if (route === "/api/backup" && method === "GET") {
      admin();const size = (await db.prepare("SELECT COALESCE(SUM(LENGTH(data)),0)+COALESCE(SUM(LENGTH(pdf)),0)*1.34+COUNT(*)*1500 AS bytes FROM certificates").get()).bytes;
      if (size > 118 * 1024 * 1024) throw new AppError("A base excede o limite do backup JSON. Baixe o backup completo em SQLite.", 413);
      const items = (await db.prepare("SELECT * FROM certificates ORDER BY created_at").all()).map((row) => ({ ...record(row), pdf: row.pdf ? Buffer.from(row.pdf).toString("base64") : null, pdfName: row.pdf_name }));
      await audit(user, "backup.exported", "", String(items.length));
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="vs-cursos-backup-${now().slice(0, 10)}.json"`, "Cache-Control": "no-store" });
      return res.end(JSON.stringify({ format: "vs-cursos", version: 2, exportedAt: now(), company: await company(), items }));
    }
    if (route === "/api/backup/import" && method === "POST") {
      admin();const input = await body(req, 120 * 1024 * 1024);
      if (input.format !== "vs-cursos" || input.version !== 2 || !Array.isArray(input.items) || input.items.length > 5000) throw new AppError("Backup incompatível.");
      const settings = validateCompany(input.company);
      const items = input.items.map((item) => {
        if (!/^[a-f0-9-]{36}$/.test(item.id) || !/^VS-\d{4}-[A-F0-9]{16}$/.test(item.code) || !["draft", "issued", "revoked"].includes(item.status)) throw new AppError("Registro inválido no backup.");
        const data = validateCertificate(item.data, item.status !== "draft");
        const pdf = item.pdf ? Buffer.from(item.pdf, "base64") : null;
        if (item.status !== "draft") {if (!pdf) throw new AppError("PDF ausente no backup.");checkPdf(pdf);if (hash(pdf) !== item.pdfHash) throw new AppError("A integridade de um PDF não confere.");}
        for (const key of ["createdAt", "updatedAt", "issuedAt", "revokedAt"]) if (item[key] && (!/^\d{4}-\d{2}-\d{2}T/.test(item[key]) || !Number.isFinite(Date.parse(item[key])))) throw new AppError("Data inválida no backup.");
        if (!item.createdAt || !item.updatedAt || item.status !== "draft" && !item.issuedAt || item.status === "revoked" && !item.revokedAt) throw new AppError("Backup com registro incompleto.");
        return { ...item, data, pdf, revokeReason: text(item.revokeReason || "", 500) };
      });
      await automaticBackup("antes-restauracao");
      let added = 0,skipped = 0;
      const wasEmpty = (await db.prepare("SELECT COUNT(*) AS n FROM certificates").get()).n === 0;
      await transaction(async () => {
        for (const item of items) {
          const existing = await db.prepare("SELECT * FROM certificates WHERE id=? OR code=?").get(item.id, item.code);
          if (existing) {
            if (existing.id !== item.id || existing.code !== item.code || existing.pdf_hash !== (item.pdfHash || null) || existing.data !== JSON.stringify(item.data) || existing.status !== item.status) throw new AppError("O backup conflita com um registro atual. Nenhum dado foi substituído.", 409);
            skipped++;continue;
          }
          await db.prepare("INSERT INTO certificates (id,code,status,data,revision,pdf,pdf_hash,pdf_name,created_at,updated_at,issued_at,revoked_at,revoke_reason,user_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)").run(item.id, item.code, item.status, JSON.stringify(item.data), 1, item.pdf, item.pdf ? hash(item.pdf) : null, item.pdf ? filename(item.data) : null, item.createdAt, item.updatedAt, item.issuedAt || null, item.revokedAt || null, item.revokeReason || null, user.id);added++;
        }
        if (wasEmpty || input.restoreCompany === true) await db.prepare("UPDATE settings SET data=? WHERE id=1").run(JSON.stringify(settings));
        await audit(user, "backup.imported", "", `${added} adicionados, ${skipped} existentes`);
      });
      return send(res, 200, { added, skipped });
    }
    throw new AppError("Recurso não encontrado.", 404);
  }

  async function automaticBackup(label = "automatico") {
    const directory = path.join(dataDir, "backups");fs.mkdirSync(directory, { recursive: true });
    const name = `${now().replace(/[:.]/g, "-")}-${label}-${randomBytes(3).toString("hex")}.sqlite`;
    const file = path.join(directory, name);
    await storage.snapshot(file, label === "antes-restauracao");
    const files = (await fsp.readdir(directory)).filter((name) => name.endsWith(".sqlite")).sort().reverse();
    for (const file of files.slice(7)) await fsp.unlink(path.join(directory, file));
    return file;
  }
  const timer = storage.cloud ? null : setInterval(() => automaticBackup().catch((error) => console.error("Falha no backup:", error.message)), 24 * 60 * 60 * 1000);
  timer?.unref();
  const handler = async (req, res) => {
    const embeddable = req.url.split("?")[0] === "/index.html";
    res.setHeader("X-Content-Type-Options", "nosniff");res.setHeader("Referrer-Policy", "no-referrer");res.setHeader("X-Frame-Options", embeddable ? "SAMEORIGIN" : "DENY");
    res.setHeader("Content-Security-Policy", `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors ${embeddable ? "'self'" : "'none'"}; form-action 'self'`);
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      if (!allowedHosts.has(url.hostname.toLowerCase())) throw new AppError("Endereço de acesso não autorizado.", 403);
      if (url.pathname.startsWith("/api/")) {
        const mutation = req.method !== "GET";
        if (mutation) guardMutation(req);
        const pending = mutation ? bufferedResponse() : res;
        await storage.request(mutation, async () => {
          return api(req, pending, url);
        });
        if (mutation) pending.flush(res);
        return;
      }
      if (!["GET", "HEAD"].includes(req.method)) throw new AppError("Método não permitido.", 405);
      const file = url.pathname === "/" ? "dashboard.html" : decodeURIComponent(url.pathname.slice(1));
      if (!PUBLIC_FILES.has(file)) throw new AppError("Página não encontrada.", 404);
      const content = await fsp.readFile(path.join(ROOT, file));
      res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-cache", "Content-Length": content.length });res.end(req.method === "HEAD" ? undefined : content);
    } catch (error) {
      if (res.headersSent) {res.end();return;}
      if (!(error instanceof AppError)) console.error("Erro interno:", error);
      send(res, error instanceof AppError ? error.status : 500, { error: error instanceof AppError ? error.message : "Não foi possível concluir a operação. Tente novamente." });
    }
  };
  const server = http.createServer(handler);
  server.requestTimeout = 120000;server.headersTimeout = 15000;
  async function close() {if (closing) return;closing = true;clearInterval(timer);if (server.listening) await new Promise((resolve) => server.close(resolve));await db.close();}
  return { server, handler, db, storage, close, automaticBackup };
}

if (require.main === module) {
  const app = createApplication();const port = Number(process.env.PORT || 5174),host = process.env.HOST || "127.0.0.1";
  app.server.on("error", (error) => {console.error(error.code === "EADDRINUSE" ? `A porta ${port} está ocupada. Defina PORT com outra porta.` : error.message);app.close().finally(() => {process.exitCode = 1;});});
  app.server.listen(port, host, () => {console.log(`VS Cursos: http://${host}:${port}\nDados persistentes: ${process.env.VS_DATA_DIR || path.join(ROOT, ".data")}`);app.automaticBackup().catch((error) => console.error("Backup inicial:", error.message));});
  for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => app.close().then(() => process.exit(0)));
}
module.exports = { createApplication };
