const fields = {
  studentName: document.getElementById("studentName"),
  studentDoc: document.getElementById("studentDoc"),
  courseSelect: document.getElementById("courseSelect"),
  customCourse: document.getElementById("customCourse"),
  courseHours: document.getElementById("courseHours"),
  completionDate: document.getElementById("completionDate"),
  programContent: document.getElementById("programContent"),
};

const companyInstructor = {
  name: "Leandro Marques Gonçalves Martins",
  role: "Número de Registro: 0042783/PA",
};

const output = {
  frontStudent: document.getElementById("frontStudent"),
  frontCpfText: document.getElementById("frontCpfText"),
  frontCourse: document.getElementById("frontCourse"),
  frontHours: document.getElementById("frontHours"),
  frontPeriod: document.getElementById("frontPeriod"),
  cpfStatus: document.getElementById("cpfStatus"),
  backProgram: document.getElementById("backProgram"),
  verificationCode: document.getElementById("verificationCode"),
  qrCode: document.getElementById("qrCode"),
};

const certificateSize = {
  width: 1122,
  height: 794,
};

const today = new Date();
fields.completionDate.valueAsDate = today;

const coursePresets = {
  nr12: {
    title: "NR 12 - Seguran\u00e7a no Trabalho em M\u00e1quinas e Equipamentos",
    hours: "8 horas",
    program: [
      "Introdu\u00e7\u00e3o \u00e0 NR 12",
      "Legisla\u00e7\u00e3o Aplic\u00e1vel",
      "Responsabilidades do Empregador e do Trabalhador",
      "Conceitos de Perigo e Risco",
      "An\u00e1lise de Riscos",
      "Princ\u00edpios Gerais de Seguran\u00e7a em M\u00e1quinas e Equipamentos",
      "Arranjo F\u00edsico e Instala\u00e7\u00f5es",
      "Sinaliza\u00e7\u00e3o de Seguran\u00e7a",
      "Sistemas de Prote\u00e7\u00e3o e Dispositivos de Seguran\u00e7a",
      "Parada de Emerg\u00eancia",
      "Equipamentos de Prote\u00e7\u00e3o Individual (EPI)",
      "Opera\u00e7\u00e3o Segura de M\u00e1quinas e Equipamentos",
      "Inspe\u00e7\u00e3o e Check-list de Seguran\u00e7a",
      "Manuten\u00e7\u00e3o Segura de M\u00e1quinas",
      "Preven\u00e7\u00e3o de Acidentes",
      "No\u00e7\u00f5es de Primeiros Socorros",
    ],
  },
  nr35: {
    title: "NR 35 - Trabalho em Altura",
    hours: "8 horas",
    program: [
      "Introdu\u00e7\u00e3o \u00e0 NR 35",
      "Legisla\u00e7\u00e3o Aplic\u00e1vel ao Trabalho em Altura",
      "Responsabilidades do Empregador e do Trabalhador",
      "Conceitos e Defini\u00e7\u00f5es de Trabalho em Altura",
      "An\u00e1lise de Riscos",
      "Permiss\u00e3o de Trabalho (PT)",
      "Medidas de Controle para Trabalho em Altura",
      "Sistemas de Prote\u00e7\u00e3o Contra Quedas",
      "Equipamentos de Prote\u00e7\u00e3o Individual (EPI)",
      "Inspe\u00e7\u00e3o, Conserva\u00e7\u00e3o e Limita\u00e7\u00e3o dos Equipamentos",
      "Sistemas de Ancoragem",
      "T\u00e9cnicas de Movimenta\u00e7\u00e3o e Posicionamento em Altura",
      "Condi\u00e7\u00f5es Impeditivas para o Trabalho em Altura",
      "Planejamento, Organiza\u00e7\u00e3o e Execu\u00e7\u00e3o das Atividades",
      "Procedimentos de Emerg\u00eancia e Resgate",
      "No\u00e7\u00f5es de Primeiros Socorros",
    ],
  },
  betoneira: {
    title: "Operador de Betoneira",
    hours: "8 horas",
    program: [
      "Introdu\u00e7\u00e3o ao Curso de Operador de Betoneira",
      "Legisla\u00e7\u00e3o e Normas de Seguran\u00e7a Aplic\u00e1veis",
      "Responsabilidades do Operador",
      "Conceitos B\u00e1sicos de Concretagem",
      "Tipos de Betoneiras",
      "Componentes e Funcionamento da Betoneira",
      "Inspe\u00e7\u00e3o Pr\u00e9-Operacional",
      "Check-list de Seguran\u00e7a da Betoneira",
      "Identifica\u00e7\u00e3o de Perigos e An\u00e1lise de Riscos",
      "Equipamentos de Prote\u00e7\u00e3o Individual (EPI)",
      "Procedimentos para Acionamento da Betoneira",
      "Opera\u00e7\u00e3o Segura da Betoneira",
      "Carregamento e Dosagem de Materiais",
      "Procedimentos Durante a Mistura do Concreto",
      "Limpeza e Conserva\u00e7\u00e3o da Betoneira",
      "Manuten\u00e7\u00e3o Preventiva e Cuidados Operacionais",
      "Principais Riscos na Opera\u00e7\u00e3o da Betoneira",
      "Medidas de Preven\u00e7\u00e3o de Acidentes",
      "Procedimentos em Situa\u00e7\u00f5es de Emerg\u00eancia",
      "No\u00e7\u00f5es de Primeiros Socorros",
    ],
  },
  "mecanico-industrial": {
    title: "Mec\u00e2nico Industrial",
    hours: "8 horas",
    program: [
      "Introdu\u00e7\u00e3o \u00e0 Mec\u00e2nica Industrial",
      "Legisla\u00e7\u00e3o e Normas de Seguran\u00e7a Aplic\u00e1veis",
      "Responsabilidades do Mec\u00e2nico Industrial",
      "Conceitos B\u00e1sicos de Mec\u00e2nica Industrial",
      "Identifica\u00e7\u00e3o de Equipamentos Industriais",
      "Ferramentas Manuais e Ferramentas El\u00e9tricas",
      "Leitura e Interpreta\u00e7\u00e3o de Desenhos Mec\u00e2nicos",
      "Metrologia B\u00e1sica e Instrumentos de Medi\u00e7\u00e3o",
      "Sistemas de Transmiss\u00e3o Mec\u00e2nica",
      "Rolamentos, Mancais e Acoplamentos",
      "Sistemas Hidr\u00e1ulicos e Pneum\u00e1ticos",
      "Lubrifica\u00e7\u00e3o Industrial",
      "Inspe\u00e7\u00e3o e Diagn\u00f3stico de Falhas",
      "Manuten\u00e7\u00e3o Preventiva",
      "Manuten\u00e7\u00e3o Corretiva",
      "Procedimentos de Bloqueio e Sinaliza\u00e7\u00e3o de Energia",
      "An\u00e1lise de Riscos nas Atividades de Manuten\u00e7\u00e3o",
      "Equipamentos de Prote\u00e7\u00e3o Individual e Coletiva (EPI/EPC)",
      "Procedimentos de Emerg\u00eancia",
      "No\u00e7\u00f5es de Primeiros Socorros",
    ],
  },
};

function escapeText(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  if (!value) return "-";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function currentCourse() {
  if (fields.courseSelect.value === "custom") {
    return fields.customCourse.value.trim() || "Curso personalizado";
  }
  return coursePresets[fields.courseSelect.value]?.title || fields.courseSelect.value;
}

function applyCoursePreset() {
  const preset = coursePresets[fields.courseSelect.value];
  if (!preset) {
    updatePreview();
    return;
  }

  fields.courseHours.value = preset.hours;
  fields.programContent.value = preset.program.join("\n");
  updatePreview();
}

function fillProgramList(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    output.backProgram.innerHTML = '<li data-number="01"><span>Conteúdo programático a ser preenchido</span></li>';
    return;
  }

  output.backProgram.innerHTML = lines
    .slice(0, 20)
    .map((line, index) => {
      const number = String(index + 1).padStart(2, "0");
      return `<li data-number="${number}"><span>${escapeText(line)}</span></li>`;
    })
    .join("");
}

function fitStudentName() {
  const element = output.frontStudent;
  element.style.fontSize = "84px";
  element.style.whiteSpace = "nowrap";

  let size = 84;
  while (element.scrollWidth > element.clientWidth && size > 36) {
    size -= 1;
    element.style.fontSize = `${size}px`;
  }
}

function updatePreviewScale() {
  const preview = document.querySelector(".preview-zone");
  if (!preview) return;

  const availableWidth = preview.clientWidth || window.innerWidth;
  const fitScale = Math.min(1, availableWidth / certificateSize.width);
  const readableScale = window.innerWidth <= 680 ? 0.62 : window.innerWidth <= 980 ? 0.66 : 0;
  const scale = Math.min(1, Math.max(fitScale, readableScale));
  preview.style.setProperty("--preview-scale", scale.toFixed(3));
}

function plainValue(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function verificationBase(data) {
  return [
    "VS CURSOS",
    "60.953.721/0001-48",
    data.studentName,
    data.studentDoc,
    data.course,
    data.hours,
    data.date,
    data.instructor,
  ].join("|");
}

function fallbackHash(text) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0).toString(16).padStart(10, "0").slice(0, 10).toUpperCase();
}

async function createVerificationCode(data) {
  const base = verificationBase(data);
  if (!window.crypto?.subtle) {
    return `VS-${fallbackHash(base)}`;
  }

  const bytes = new TextEncoder().encode(base);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  const hex = Array.from(new Uint8Array(hash))
    .slice(0, 5)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
  return `VS-${hex}`;
}

function verificationUrl(code, data) {
  const params = new URLSearchParams({
    codigo: code,
    aluno: data.studentName,
    cpf: data.studentDoc,
    curso: data.course,
    carga: data.hours,
    conclusao: data.date,
    instrutor: data.instructor,
    registro: data.instructorRole,
  });
  return `${window.location.origin}${window.location.pathname.replace(/index\.html$/, "")}verify.html?${params}`;
}

function renderQrCode(text) {
  output.qrCode.innerHTML = "";

  if (!window.QRCode) {
    const placeholder = document.createElement("span");
    placeholder.className = "qr-placeholder";
    placeholder.textContent = "QR";
    output.qrCode.appendChild(placeholder);
    return;
  }

  const holder = document.createElement("div");
  new QRCode(holder, {
    text,
    width: 180,
    height: 180,
    correctLevel: QRCode.CorrectLevel.M,
  });

  const sourceImage = holder.querySelector("img");
  const sourceCanvas = holder.querySelector("canvas");
  const imageSource = sourceImage?.src || sourceCanvas?.toDataURL("image/png");

  if (!imageSource) return;

  const image = document.createElement("img");
  image.src = imageSource;
  image.alt = "QR Code de verificação";
  output.qrCode.appendChild(image);
}

let verificationRun = 0;

async function updateVerification(data) {
  const run = ++verificationRun;

  if (!data.cpfValid) {
    const pendingCode = data.cpfComplete ? "CPF INVÁLIDO" : "AGUARDANDO CPF";
    output.verificationCode.textContent = pendingCode;
    renderQrCode(verificationUrl(pendingCode, data));
    return;
  }

  const code = await createVerificationCode(data);
  if (run !== verificationRun) return;
  output.verificationCode.textContent = code;
  renderQrCode(verificationUrl(code, data));
}

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function formatCpf(value) {
  const digits = onlyDigits(value).slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
}

function isValidCpf(value) {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  const calcDigit = (length) => {
    let sum = 0;
    for (let index = 0; index < length; index += 1) {
      sum += Number(cpf[index]) * (length + 1 - index);
    }
    const result = (sum * 10) % 11;
    return result === 10 ? 0 : result;
  };

  return calcDigit(9) === Number(cpf[9]) && calcDigit(10) === Number(cpf[10]);
}

function cpfState() {
  const digits = onlyDigits(fields.studentDoc.value);
  if (!digits.length) return { complete: false, valid: false, message: "Digite um CPF válido." };
  if (digits.length < 11) return { complete: false, valid: false, message: "CPF incompleto." };
  return isValidCpf(digits)
    ? { complete: true, valid: true, message: "CPF válido." }
    : { complete: true, valid: false, message: "CPF inválido." };
}

function updateCpfStatus() {
  const state = cpfState();
  fields.studentDoc.classList.toggle("is-valid", state.valid);
  fields.studentDoc.classList.toggle("is-invalid", Boolean(onlyDigits(fields.studentDoc.value)) && !state.valid);
  output.cpfStatus.classList.toggle("is-valid", state.valid);
  output.cpfStatus.classList.toggle("is-invalid", Boolean(onlyDigits(fields.studentDoc.value)) && !state.valid);
  output.cpfStatus.textContent = state.message;
  return state;
}

function updatePreview() {
  const studentName = fields.studentName.value.trim() || "Nome completo do aluno";
  const cpfInfo = updateCpfStatus();
  const studentDoc = fields.studentDoc.value.trim() || "-";
  const course = currentCourse();
  const hours = fields.courseHours.value.trim() || "-";
  const date = formatDate(fields.completionDate.value);
  const data = {
    studentName: plainValue(studentName),
    studentDoc: plainValue(studentDoc),
    course: plainValue(course),
    hours: plainValue(hours),
    date,
    instructor: companyInstructor.name,
    instructorRole: companyInstructor.role,
    cpfComplete: cpfInfo.complete,
    cpfValid: cpfInfo.valid,
  };

  document.getElementById("customCourseWrap").classList.toggle("hidden", fields.courseSelect.value !== "custom");

  output.frontStudent.textContent = studentName;
  output.frontCpfText.textContent = studentDoc;
  output.frontCourse.textContent = course;
  output.frontHours.textContent = hours;
  output.frontPeriod.textContent = date;
  fillProgramList(fields.programContent.value);
  fitStudentName();
  updatePreviewScale();
  return updateVerification(data);
}

async function renderPage(element) {
  const exportWidth = Math.round(element.offsetWidth || certificateSize.width);
  const exportHeight = Math.round(element.offsetHeight || certificateSize.height);
  const sandbox = document.createElement("div");
  const clone = element.cloneNode(true);

  sandbox.className = "export-sandbox";
  sandbox.style.width = `${exportWidth}px`;
  sandbox.style.height = `${exportHeight}px`;
  clone.classList.add("exporting");
  clone.style.width = `${exportWidth}px`;
  clone.style.height = `${exportHeight}px`;
  sandbox.appendChild(clone);
  document.body.appendChild(sandbox);

  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  try {
    return await html2canvas(clone, {
      backgroundColor: "#ffffff",
      scale: 3,
      useCORS: true,
      width: exportWidth,
      height: exportHeight,
      windowWidth: exportWidth,
      windowHeight: exportHeight,
      scrollX: 0,
      scrollY: 0,
    });
  } finally {
    sandbox.remove();
  }
}

function filenameSuffix() {
  return currentCourse()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/(^-|-$)/g, "")
    .toLowerCase();
}

async function downloadImage(pageId, name) {
  await updatePreview();
  if (!cpfState().valid) {
    alert("Informe um CPF válido antes de exportar o certificado.");
    fields.studentDoc.focus();
    return;
  }
  if (!window.html2canvas) {
    alert("A biblioteca de imagem ainda não carregou. Recarregue a página e tente novamente.");
    return;
  }
  const element = document.getElementById(pageId);
  const canvas = await renderPage(element);
  const link = document.createElement("a");
  link.download = `certificado-vs-cursos-${filenameSuffix()}-${name}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

async function downloadPdf() {
  const pdfWindow = window.open("", "_blank");
  await updatePreview();
  if (!cpfState().valid) {
    if (pdfWindow) pdfWindow.close();
    alert("Informe um CPF válido antes de exportar o certificado.");
    fields.studentDoc.focus();
    return;
  }
  if (!window.html2canvas || !window.jspdf) {
    if (pdfWindow) pdfWindow.close();
    alert("As bibliotecas de PDF/imagem ainda não carregaram. Recarregue a página e tente novamente.");
    return;
  }
  const { jsPDF } = window.jspdf;
  const frontCanvas = await renderPage(document.getElementById("frontPage"));
  const backCanvas = await renderPage(document.getElementById("backPage"));
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  pdf.addImage(frontCanvas.toDataURL("image/png"), "PNG", 0, 0, 297, 210);
  pdf.addPage("a4", "landscape");
  pdf.addImage(backCanvas.toDataURL("image/png"), "PNG", 0, 0, 297, 210);

  const pdfBlob = pdf.output("blob");
  const pdfUrl = URL.createObjectURL(pdfBlob);

  if (pdfWindow) {
    pdfWindow.location.href = pdfUrl;
  } else {
    const link = document.createElement("a");
    link.href = pdfUrl;
    link.target = "_blank";
    link.rel = "noopener";
    link.click();
  }
}

document.getElementById("downloadPdf").addEventListener("click", downloadPdf);
document.getElementById("downloadFront").addEventListener("click", () => downloadImage("frontPage", "frente"));
document.getElementById("downloadBack").addEventListener("click", () => downloadImage("backPage", "verso"));
document.getElementById("logoutButton").addEventListener("click", () => {
  sessionStorage.removeItem("vsCursosAuth");
  window.location.replace("login.html");
});

fields.courseSelect.addEventListener("change", applyCoursePreset);

fields.studentDoc.addEventListener("input", () => {
  fields.studentDoc.value = formatCpf(fields.studentDoc.value);
  updatePreview();
});

[
  fields.studentName,
  fields.customCourse,
  fields.courseHours,
  fields.completionDate,
  fields.programContent,
].forEach((field) => {
  field.addEventListener("input", updatePreview);
  field.addEventListener("change", updatePreview);
});

window.addEventListener("resize", () => {
  fitStudentName();
  updatePreviewScale();
});

if (window.ResizeObserver) {
  const previewZone = document.querySelector(".preview-zone");
  if (previewZone) {
    new ResizeObserver(updatePreviewScale).observe(previewZone);
  }
}

applyCoursePreset();
