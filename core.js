"use strict";

const { createHash, randomBytes } = require("node:crypto");

class AppError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const COURSE_KEYS = ["nr12", "nr18", "nr33", "nr35", "betoneira", "mecanico-industrial", "custom"];
const DEFAULT_COMPANY = {
  name: "VS Cursos", cnpj: "60.953.721/0001-48", tagline: "Valorização Profissional",
  email: "", phone: "", address: "", logo: "",
  instructor: "Leandro Marques Gonçalves Martins", instructorRole: "Número de Registro: 0042783/PA",
  instructorSignature: "", publicUrl: "",
};

function text(value, max = 200) {
  if (typeof value !== "string" || value.length > max || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value)) {
    throw new AppError("Texto inválido ou maior que o limite permitido.");
  }
  return value.trim();
}

function cpfValid(value) {
  const cpf = String(value || "").replace(/\D/g, "");
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digit = (n) => {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += Number(cpf[i]) * (n + 1 - i);
    return ((sum * 10) % 11) % 10;
  };
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value && value >= "1900-01-01" && value <= "2200-12-31";
}

function imageData(value = "") {
  if (value === "") return "";
  if (typeof value !== "string" || value.length > 2800000 || !/^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/]+=*$/.test(value)) {
    throw new AppError("Use uma imagem PNG, JPEG ou WebP de até 2 MB.");
  }
  const type = value.match(/^data:image\/(\w+)/)[1];
  const buffer = Buffer.from(value.split(",")[1], "base64");
  const valid = type === "png" ? buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
    : type === "jpeg" ? buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255
    : buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WEBP";
  if (!valid || buffer.length > 2 * 1024 * 1024) throw new AppError("A imagem enviada não é válida.");
  return value;
}

function signatureSettings(value = {}) {
  const result = {};
  for (const [key, min, max, fallback] of [["width",80,600,300],["height",30,220,90],["x",-260,260,0],["y",-150,150,0]]) {
    const number = Number(value[key] ?? fallback);
    if (!Number.isFinite(number) || number < min || number > max) throw new AppError("Ajuste de assinatura inválido.");
    result[key] = number;
  }
  return result;
}

function validateCertificate(input, required = false) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new AppError("Dados do certificado inválidos.");
  const data = {};
  for (const [key,max] of [["studentName",160],["studentDoc",20],["company",160],["course",240],["customCourse",240],["hours",40],["program",16000],["instructor",160],["instructorRole",160]]) {
    data[key] = text(input[key] ?? "", max);
  }
  data.courseKey = COURSE_KEYS.includes(input.courseKey) ? input.courseKey : "custom";
  data.dateMode = input.dateMode === "range" ? "range" : "completion";
  data.signatureMode = ["both", "student", "instructor"].includes(input.signatureMode) ? input.signatureMode : "both";
  data.trainingType = input.trainingType === "refresher" ? "refresher" : "initial";
  data.nr33Role = input.nr33Role === "supervisor" ? "supervisor" : "worker";
  for (const key of ["completionDate", "startDate", "endDate"]) {
    data[key] = text(input[key] ?? "", 10);
    if (data[key] && !validDate(data[key])) throw new AppError("Data inválida.");
  }
  const images = input.signatureImages || {};
  const settings = input.signatureSettings || {};
  data.signatureImages = { instructor: imageData(images.instructor), student: imageData(images.student) };
  data.signatureSettings = { instructor: signatureSettings(settings.instructor), student: signatureSettings(settings.student) };
  data.brand = validateCompany(input.brand || DEFAULT_COMPANY);
  if (required) {
    if (data.studentName.split(/\s+/).length < 2) throw new AppError("Informe o nome completo do aluno.");
    if (!cpfValid(data.studentDoc)) throw new AppError("Informe um CPF válido.");
    if (!data.course || (data.courseKey === "custom" && !data.customCourse)) throw new AppError("Informe o nome do curso.");
    const hours = Number(data.hours.replace(/\s*horas?\s*$/i, "").replace(",", "."));
    if (!(hours > 0 && hours <= 1000)) throw new AppError("Informe uma carga horária entre 0,5 e 1000 horas.");
    if (hours < 0.5) throw new AppError("A carga horária mínima é de 0,5 hora.");
    if (data.courseKey === "nr33") {
      const minimum = data.trainingType === "refresher" ? 8 : data.nr33Role === "supervisor" ? 40 : 16;
      if (hours < minimum) throw new AppError(`A carga horária mínima para esta modalidade de NR 33 é de ${minimum} horas.`);
    }
    if (data.dateMode === "range") {
      if (!validDate(data.startDate) || !validDate(data.endDate) || data.startDate > data.endDate) throw new AppError("Confira o início e o término do curso.");
    } else if (!validDate(data.completionDate)) throw new AppError("Informe a data de conclusão.");
    const lines = data.program.split(/\r?\n/).filter((line) => line.trim());
    if (!lines.length || lines.length > 40 || lines.some(line => line.length > 240)) throw new AppError("Informe de 1 a 40 tópicos de até 240 caracteres.");
    if (!data.instructor || !data.instructorRole) throw new AppError("Informe o instrutor e sua qualificação ou registro.");
  }
  return data;
}

function validateCompany(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new AppError("Dados da empresa inválidos.");
  const result = {};
  for (const [key,max] of [["name",120],["cnpj",24],["tagline",120],["email",160],["phone",40],["address",300],["instructor",160],["instructorRole",160],["publicUrl",240]]) {
    result[key] = text(input[key] ?? DEFAULT_COMPANY[key], max);
  }
  if (!result.name) throw new AppError("Informe o nome da empresa.");
  if (result.publicUrl) {
    let url;
    try { url = new URL(result.publicUrl); } catch { throw new AppError("URL pública inválida."); }
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname!=="/") throw new AppError("Use uma URL HTTP ou HTTPS somente com domínio e porta, sem caminhos ou parâmetros.");
    result.publicUrl = url.href.replace(/\/$/, "");
  }
  if (result.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email)) throw new AppError("E-mail inválido.");
  result.logo = imageData(input.logo);
  result.instructorSignature = imageData(input.instructorSignature);
  return result;
}

function code() { return `VS-${new Date().getFullYear()}-${randomBytes(8).toString("hex").toUpperCase()}`; }
function hash(buffer) { return createHash("sha256").update(buffer).digest("hex"); }
function slug(value) {
  return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase().slice(0, 90).replace(/-$/, "") || "curso";
}
function filename(data) { return `certificado-${slug(data.course)}-${slug(data.studentName)}.pdf`; }
function checkPdf(buffer) {
  if (buffer.length < 500 || buffer.length > 25 * 1024 * 1024 || !buffer.subarray(0, 8).toString().startsWith("%PDF-1.") || !buffer.subarray(-1024).toString().includes("%%EOF")) {
    throw new AppError("Arquivo PDF inválido ou maior que 25 MB.");
  }
}
function period(data) {
  const format = value => value ? value.split("-").reverse().join("/") : "-";
  return data.dateMode === "range" ? `${format(data.startDate)} a ${format(data.endDate)}` : format(data.completionDate);
}

module.exports = { AppError, DEFAULT_COMPANY, text, cpfValid, validDate, imageData, validateCompany, validateCertificate, code, hash, filename, checkPdf, period };
