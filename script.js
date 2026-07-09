const fields = {
  studentName: document.getElementById("studentName"),
  studentDoc: document.getElementById("studentDoc"),
  courseSelect: document.getElementById("courseSelect"),
  customCourse: document.getElementById("customCourse"),
  dateMode: document.getElementById("dateMode"),
  courseHours: document.getElementById("courseHours"),
  completionDate: document.getElementById("completionDate"),
  startDate: document.getElementById("startDate"),
  endDate: document.getElementById("endDate"),
  signatureMode: document.getElementById("signatureMode"),
  instructorSignatureUpload: document.getElementById("instructorSignatureUpload"),
  studentSignatureUpload: document.getElementById("studentSignatureUpload"),
  instructorSignatureWidth: document.getElementById("instructorSignatureWidth"),
  instructorSignatureHeight: document.getElementById("instructorSignatureHeight"),
  instructorSignatureX: document.getElementById("instructorSignatureX"),
  instructorSignatureY: document.getElementById("instructorSignatureY"),
  instructorSignatureReset: document.getElementById("instructorSignatureReset"),
  studentSignatureWidth: document.getElementById("studentSignatureWidth"),
  studentSignatureHeight: document.getElementById("studentSignatureHeight"),
  studentSignatureX: document.getElementById("studentSignatureX"),
  studentSignatureY: document.getElementById("studentSignatureY"),
  studentSignatureReset: document.getElementById("studentSignatureReset"),
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
  frontPeriodLead: document.getElementById("frontPeriodLead"),
  frontPeriod: document.getElementById("frontPeriod"),
  cpfStatus: document.getElementById("cpfStatus"),
  dateStatus: document.getElementById("dateStatus"),
  appStatus: document.getElementById("appStatus"),
  appStatusTitle: document.getElementById("appStatusTitle"),
  appStatusDetail: document.getElementById("appStatusDetail"),
  exportStatus: document.getElementById("exportStatus"),
  backProgram: document.getElementById("backProgram"),
  verificationCode: document.getElementById("verificationCode"),
  qrCode: document.getElementById("qrCode"),
  signatureRow: document.getElementById("signatureRow"),
  instructorSignatureBlock: document.getElementById("instructorSignatureBlock"),
  studentSignatureBlock: document.getElementById("studentSignatureBlock"),
  instructorSignatureBox: document.getElementById("instructorSignatureBox"),
  studentSignatureBox: document.getElementById("studentSignatureBox"),
  instructorSignatureImage: document.getElementById("instructorSignatureImage"),
  studentSignatureImage: document.getElementById("studentSignatureImage"),
  instructorSignatureWrap: document.getElementById("instructorSignatureWrap"),
  studentSignatureWrap: document.getElementById("studentSignatureWrap"),
  instructorSignatureAdjust: document.getElementById("instructorSignatureAdjust"),
  studentSignatureAdjust: document.getElementById("studentSignatureAdjust"),
  instructorSignatureWidthValue: document.getElementById("instructorSignatureWidthValue"),
  instructorSignatureHeightValue: document.getElementById("instructorSignatureHeightValue"),
  instructorSignatureXValue: document.getElementById("instructorSignatureXValue"),
  instructorSignatureYValue: document.getElementById("instructorSignatureYValue"),
  studentSignatureWidthValue: document.getElementById("studentSignatureWidthValue"),
  studentSignatureHeightValue: document.getElementById("studentSignatureHeightValue"),
  studentSignatureXValue: document.getElementById("studentSignatureXValue"),
  studentSignatureYValue: document.getElementById("studentSignatureYValue"),
};

const downloadButtons = [
  document.getElementById("downloadPdf"),
  document.getElementById("downloadDataPdf"),
  document.getElementById("downloadFront"),
  document.getElementById("downloadBack"),
];

const certificateSize = {
  width: 1122,
  height: 794,
};

const developerCredit = "Desenvolvido por Vinicius Dev";

const today = new Date();
fields.completionDate.valueAsDate = today;
fields.startDate.valueAsDate = today;
fields.endDate.valueAsDate = today;

const signatureImages = {
  instructor: "",
  student: "",
};

const defaultSignatureSettings = {
  width: 300,
  height: 90,
  x: 0,
  y: 0,
};

const signatureSettings = {
  instructor: { ...defaultSignatureSettings },
  student: { ...defaultSignatureSettings },
};

let activeSignatureKind = "";
let signatureInteraction = null;

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
  nr18: {
    title: "NR 18 - Condi\u00e7\u00f5es de Seguran\u00e7a e Sa\u00fade no Trabalho na Ind\u00fastria da Constru\u00e7\u00e3o",
    hours: "8 horas",
    program: [
      "Introdu\u00e7\u00e3o \u00e0 NR 18",
      "Legisla\u00e7\u00e3o Aplic\u00e1vel \u00e0 Ind\u00fastria da Constru\u00e7\u00e3o",
      "Responsabilidades do Empregador e do Trabalhador",
      "Programa de Gerenciamento de Riscos (PGR)",
      "Organiza\u00e7\u00e3o e Sinaliza\u00e7\u00e3o do Canteiro de Obras",
      "\u00c1reas de Viv\u00eancia",
      "Medidas de Prote\u00e7\u00e3o Coletiva",
      "Equipamentos de Prote\u00e7\u00e3o Individual (EPI)",
      "Trabalho em Altura na Constru\u00e7\u00e3o",
      "Escadas, Rampas e Passarelas",
      "Andaimes e Plataformas de Trabalho",
      "Movimenta\u00e7\u00e3o e Transporte de Materiais",
      "M\u00e1quinas, Equipamentos e Ferramentas",
      "Instala\u00e7\u00f5es El\u00e9tricas Tempor\u00e1rias",
      "Demoli\u00e7\u00e3o, Escava\u00e7\u00e3o e Funda\u00e7\u00f5es",
      "Preven\u00e7\u00e3o e Combate a Inc\u00eandio",
      "Ordem, Limpeza e Organiza\u00e7\u00e3o",
      "Procedimentos de Emerg\u00eancia",
      "No\u00e7\u00f5es de Primeiros Socorros",
    ],
  },
  nr33: {
    title: "NR 33 - Seguran\u00e7a e Sa\u00fade nos Trabalhos em Espa\u00e7os Confinados",
    hours: "8 horas",
    program: [
      "Introdu\u00e7\u00e3o \u00e0 NR 33",
      "Legisla\u00e7\u00e3o Aplic\u00e1vel a Espa\u00e7os Confinados",
      "Responsabilidades do Empregador e do Trabalhador",
      "Conceitos e Defini\u00e7\u00f5es de Espa\u00e7o Confinado",
      "Reconhecimento, Avalia\u00e7\u00e3o e Controle de Riscos",
      "Riscos Atmosf\u00e9ricos, F\u00edsicos, Qu\u00edmicos e Biol\u00f3gicos",
      "Permiss\u00e3o de Entrada e Trabalho (PET)",
      "Procedimentos de Entrada, Perman\u00eancia e Sa\u00edda",
      "Monitoramento da Atmosfera",
      "Ventila\u00e7\u00e3o e Controle de Contaminantes",
      "Equipamentos de Prote\u00e7\u00e3o Individual e Coletiva",
      "Sinaliza\u00e7\u00e3o e Isolamento da \u00c1rea",
      "Comunica\u00e7\u00e3o entre Equipe, Vigia e Supervisor",
      "Atribui\u00e7\u00f5es do Trabalhador Autorizado",
      "Atribui\u00e7\u00f5es do Vigia",
      "Atribui\u00e7\u00f5es do Supervisor de Entrada",
      "Plano de Emerg\u00eancia e Salvamento",
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

function currentDateInfo() {
  if (fields.dateMode.value === "range") {
    return {
      lead: "realizado no período de",
      value: `${formatDate(fields.startDate.value)} a ${formatDate(fields.endDate.value)}`,
    };
  }

  return {
    lead: "concluído em",
    value: formatDate(fields.completionDate.value),
  };
}

function updateDateFields() {
  const isRange = fields.dateMode.value === "range";
  document.getElementById("completionDateWrap").classList.toggle("hidden", isRange);
  document.getElementById("periodDateWrap").classList.toggle("hidden", !isRange);
}

function dateState() {
  if (fields.dateMode.value !== "range") {
    return fields.completionDate.value
      ? { valid: true, message: "Data informada." }
      : { valid: false, message: "Informe a data de conclusão." };
  }

  if (!fields.startDate.value || !fields.endDate.value) {
    return { valid: false, message: "Informe a data de início e término." };
  }

  if (fields.startDate.value > fields.endDate.value) {
    return { valid: false, message: "A data de início não pode ser depois da data de término." };
  }

  return { valid: true, message: "Período informado." };
}

function updateDateStatus() {
  const state = dateState();
  const hasProblem = !state.valid;

  output.dateStatus.classList.toggle("is-valid", state.valid);
  output.dateStatus.classList.toggle("is-invalid", hasProblem);
  output.dateStatus.textContent = state.message;

  [fields.completionDate, fields.startDate, fields.endDate].forEach((field) => {
    field.classList.toggle("is-invalid", hasProblem);
    field.classList.toggle("is-valid", state.valid);
  });

  return state;
}

function updateCertificateStatus(cpfInfo, dateInfo) {
  const blockers = [];

  if (!cpfInfo.valid) {
    blockers.push(cpfInfo.complete ? "CPF inválido" : "CPF pendente");
  }

  if (!dateInfo.valid) {
    blockers.push("datas inválidas");
  }

  const ready = blockers.length === 0;
  downloadButtons.forEach((button) => {
    button.disabled = !ready;
    button.setAttribute("aria-disabled", String(!ready));
  });

  output.appStatus.classList.toggle("is-ready", ready);
  output.appStatus.classList.toggle("is-warning", !ready);
  output.appStatus.classList.toggle("is-pending", !ready);
  output.appStatusTitle.textContent = ready ? "Certificado pronto" : "Preenchimento pendente";
  output.appStatusDetail.textContent = ready
    ? "Dados validados. PDF e imagens liberados."
    : `Bloqueio: ${blockers.join(" e ")}.`;
  output.exportStatus.textContent = ready
    ? "Certificado pronto para exportação."
    : "Complete os dados obrigatórios para exportar.";

  return ready;
}

function focusFirstExportBlocker() {
  const cpfInfo = cpfState();
  const currentDateState = dateState();

  if (!cpfInfo.valid) {
    fields.studentDoc.focus();
    return "Informe um CPF válido antes de exportar o certificado.";
  }

  if (!currentDateState.valid) {
    const target = fields.dateMode.value === "range" ? fields.startDate : fields.completionDate;
    target.focus();
    return currentDateState.message;
  }

  return "";
}

function signatureParts(kind) {
  if (kind === "instructor") {
    return {
      box: output.instructorSignatureBox,
      image: output.instructorSignatureImage,
      adjust: output.instructorSignatureAdjust,
      width: fields.instructorSignatureWidth,
      height: fields.instructorSignatureHeight,
      x: fields.instructorSignatureX,
      y: fields.instructorSignatureY,
      widthValue: output.instructorSignatureWidthValue,
      heightValue: output.instructorSignatureHeightValue,
      xValue: output.instructorSignatureXValue,
      yValue: output.instructorSignatureYValue,
    };
  }

  return {
    box: output.studentSignatureBox,
    image: output.studentSignatureImage,
    adjust: output.studentSignatureAdjust,
    width: fields.studentSignatureWidth,
    height: fields.studentSignatureHeight,
    x: fields.studentSignatureX,
    y: fields.studentSignatureY,
    widthValue: output.studentSignatureWidthValue,
    heightValue: output.studentSignatureHeightValue,
    xValue: output.studentSignatureXValue,
    yValue: output.studentSignatureYValue,
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function clampSignatureValue(kind, key, value) {
  const control = signatureParts(kind)[key];
  return clamp(Math.round(value), Number(control.min), Number(control.max));
}

function previewScale() {
  const preview = document.querySelector(".preview-zone");
  const value = Number.parseFloat(getComputedStyle(preview).getPropertyValue("--preview-scale"));
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function selectSignature(kind) {
  activeSignatureKind = kind;
  output.instructorSignatureBox.classList.toggle("is-selected", kind === "instructor");
  output.studentSignatureBox.classList.toggle("is-selected", kind === "student");
}

function clearSignatureSelection() {
  activeSignatureKind = "";
  output.instructorSignatureBox.classList.remove("is-selected", "is-dragging");
  output.studentSignatureBox.classList.remove("is-selected", "is-dragging");
}

function syncSignatureControls(kind) {
  const parts = signatureParts(kind);
  const settings = signatureSettings[kind];

  parts.width.value = settings.width;
  parts.height.value = settings.height;
  parts.x.value = settings.x;
  parts.y.value = settings.y;
  parts.widthValue.textContent = settings.width;
  parts.heightValue.textContent = settings.height;
  parts.xValue.textContent = settings.x;
  parts.yValue.textContent = settings.y;
}

function applySignatureSettings(kind) {
  const parts = signatureParts(kind);
  const settings = signatureSettings[kind];

  parts.box.style.setProperty("--signature-image-width", `${settings.width}px`);
  parts.box.style.setProperty("--signature-image-height", `${settings.height}px`);
  parts.box.style.setProperty("--signature-image-x", `${settings.x}px`);
  parts.box.style.setProperty("--signature-image-y", `${settings.y}px`);
  syncSignatureControls(kind);
}

function resetSignatureSettings(kind) {
  signatureSettings[kind] = { ...defaultSignatureSettings };
  applySignatureSettings(kind);
}

function updateSignatureSetting(kind, key, value) {
  signatureSettings[kind][key] = Number(value);
  selectSignature(kind);
  applySignatureSettings(kind);
}

function updateSignatureFromDrag(state, event) {
  const scale = previewScale();
  const deltaX = (event.clientX - state.startClientX) / scale;
  const deltaY = (event.clientY - state.startClientY) / scale;
  const next = { ...state.start };

  if (state.action === "move") {
    next.x = clampSignatureValue(state.kind, "x", state.start.x + deltaX);
    next.y = clampSignatureValue(state.kind, "y", state.start.y + deltaY);
  } else {
    const handle = state.handle;
    const resizesLeft = handle.includes("w");
    const resizesRight = handle.includes("e");
    const resizesTop = handle.includes("n");
    const resizesBottom = handle.includes("s");

    if (resizesLeft || resizesRight) {
      const rawWidth = resizesLeft ? state.start.width - deltaX : state.start.width + deltaX;
      next.width = clampSignatureValue(state.kind, "width", rawWidth);
      if (resizesLeft) {
        next.x = clampSignatureValue(state.kind, "x", state.start.x + (state.start.width - next.width));
      }
    }

    if (resizesTop || resizesBottom) {
      const rawHeight = resizesTop ? state.start.height - deltaY : state.start.height + deltaY;
      next.height = clampSignatureValue(state.kind, "height", rawHeight);
      if (resizesTop) {
        next.y = clampSignatureValue(state.kind, "y", state.start.y + (state.start.height - next.height));
      }
    }
  }

  signatureSettings[state.kind] = next;
  applySignatureSettings(state.kind);
}

function setupSignatureDirectEditing(kind) {
  const { box } = signatureParts(kind);

  box.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;

    const handle = event.target?.dataset?.resizeHandle || "";
    selectSignature(kind);
    event.preventDefault();
    event.stopPropagation();

    signatureInteraction = {
      kind,
      action: handle ? "resize" : "move",
      handle,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      start: { ...signatureSettings[kind] },
    };

    box.classList.add("is-dragging");
    box.setPointerCapture(event.pointerId);
  });

  box.addEventListener("pointermove", (event) => {
    if (!signatureInteraction || signatureInteraction.pointerId !== event.pointerId) return;
    event.preventDefault();
    updateSignatureFromDrag(signatureInteraction, event);
  });

  const endInteraction = (event) => {
    if (!signatureInteraction || signatureInteraction.pointerId !== event.pointerId) return;
    box.classList.remove("is-dragging");
    if (box.hasPointerCapture(event.pointerId)) {
      box.releasePointerCapture(event.pointerId);
    }
    signatureInteraction = null;
  };

  box.addEventListener("pointerup", endInteraction);
  box.addEventListener("pointercancel", endInteraction);
}

function renderSignatureImage(kind) {
  const { box, image } = signatureParts(kind);
  const source = signatureImages[kind];

  if (!source) {
    image.removeAttribute("src");
    box.classList.add("hidden");
    return;
  }

  image.src = source;
  box.classList.remove("hidden");
  applySignatureSettings(kind);
}

function updateSignaturePreview() {
  const mode = fields.signatureMode.value;
  const showInstructor = mode === "both" || mode === "instructor";
  const showStudent = mode === "both" || mode === "student";
  const singleSignature = showInstructor !== showStudent;

  output.signatureRow.classList.toggle("single", singleSignature);
  output.instructorSignatureBlock.classList.toggle("hidden", !showInstructor);
  output.studentSignatureBlock.classList.toggle("hidden", !showStudent);
  output.instructorSignatureWrap.classList.toggle("hidden", !showInstructor);
  output.studentSignatureWrap.classList.toggle("hidden", !showStudent);
  output.instructorSignatureAdjust.classList.toggle("hidden", !showInstructor || !signatureImages.instructor);
  output.studentSignatureAdjust.classList.toggle("hidden", !showStudent || !signatureImages.student);

  renderSignatureImage("instructor");
  renderSignatureImage("student");
}

function readSignatureImage(kind, input) {
  const file = input.files?.[0];

  if (!file) {
    signatureImages[kind] = "";
    updateSignaturePreview();
    return;
  }

  if (!file.type.startsWith("image/")) {
    alert("Selecione um arquivo de imagem para a assinatura.");
    input.value = "";
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    signatureImages[kind] = String(reader.result || "");
    resetSignatureSettings(kind);
    updateSignaturePreview();
    selectSignature(kind);
  });
  reader.readAsDataURL(file);
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
    periodo: data.date,
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
  const dateInfo = currentDateInfo();
  const data = {
    studentName: plainValue(studentName),
    studentDoc: plainValue(studentDoc),
    course: plainValue(course),
    hours: plainValue(hours),
    date: dateInfo.value,
    instructor: companyInstructor.name,
    instructorRole: companyInstructor.role,
    cpfComplete: cpfInfo.complete,
    cpfValid: cpfInfo.valid,
  };

  document.getElementById("customCourseWrap").classList.toggle("hidden", fields.courseSelect.value !== "custom");
  updateDateFields();
  const currentDateState = updateDateStatus();
  updateSignaturePreview();
  updateCertificateStatus(cpfInfo, currentDateState);

  output.frontStudent.textContent = studentName;
  output.frontCpfText.textContent = studentDoc;
  output.frontCourse.textContent = course;
  output.frontHours.textContent = hours;
  output.frontPeriodLead.textContent = dateInfo.lead;
  output.frontPeriod.textContent = dateInfo.value;
  fillProgramList(fields.programContent.value);
  fitStudentName();
  updatePreviewScale();
  return updateVerification(data);
}

async function renderPage(element) {
  const exportWidth = certificateSize.width;
  const exportHeight = certificateSize.height;
  const sandbox = document.createElement("div");
  const clone = element.cloneNode(true);

  sandbox.className = "export-sandbox";
  sandbox.style.width = `${exportWidth}px`;
  sandbox.style.height = `${exportHeight}px`;
  clone.classList.add("exporting");
  clone.style.setProperty("width", `${exportWidth}px`, "important");
  clone.style.setProperty("min-width", `${exportWidth}px`, "important");
  clone.style.setProperty("height", `${exportHeight}px`, "important");
  clone.style.setProperty("transform", "none", "important");
  sandbox.appendChild(clone);
  document.body.appendChild(sandbox);
  preserveCanvasContent(element, clone);

  if (document.fonts?.ready) {
    await document.fonts.ready;
  }
  await waitForImages(clone);
  await nextFrame();

  try {
    return await html2canvas(clone, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
      imageTimeout: 0,
      logging: false,
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

function nextFrame() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

function waitForImage(image) {
  if (!image?.src || image.complete) return Promise.resolve();

  return new Promise((resolve) => {
    const done = () => {
      image.removeEventListener("load", done);
      image.removeEventListener("error", done);
      resolve();
    };

    image.addEventListener("load", done, { once: true });
    image.addEventListener("error", done, { once: true });
  });
}

function waitForImages(container) {
  return Promise.all(Array.from(container.querySelectorAll("img")).map(waitForImage));
}

function preserveCanvasContent(source, clone) {
  const sourceCanvases = Array.from(source.querySelectorAll("canvas"));
  const cloneCanvases = Array.from(clone.querySelectorAll("canvas"));

  sourceCanvases.forEach((sourceCanvas, index) => {
    const cloneCanvas = cloneCanvases[index];
    if (!cloneCanvas) return;

    try {
      const image = document.createElement("img");
      image.src = sourceCanvas.toDataURL("image/png");
      image.width = sourceCanvas.width;
      image.height = sourceCanvas.height;
      image.className = cloneCanvas.className;
      image.alt = cloneCanvas.getAttribute("aria-label") || "";
      cloneCanvas.replaceWith(image);
    } catch (error) {
      // If a browser blocks canvas serialization, html2canvas can still try the original clone.
    }
  });
}

function slugifyFilename(value, fallback = "arquivo") {
  const slug = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/(^-|-$)/g, "")
    .toLowerCase()
    .slice(0, 90)
    .replace(/-$/g, "");

  return slug || fallback;
}

function courseFilenameLabel() {
  const course = currentCourse();
  const match = course.match(/^(NR\s*\d+)\s*-\s*(.+)$/i);

  if (!match) return course;

  return `${match[1]} ${match[2]}`;
}

function studentFilenameLabel() {
  return plainValue(fields.studentName.value) || "Aluno";
}

function courseStudentFilename(prefix, extension = "pdf", extra = "") {
  const parts = [
    prefix,
    slugifyFilename(courseFilenameLabel(), "curso"),
    slugifyFilename(studentFilenameLabel(), "aluno"),
    extra,
  ].filter(Boolean);

  return `${parts.join("-")}.${extension}`;
}

function certificateFilename(extension = "pdf", extra = "") {
  return courseStudentFilename("certificado", extension, extra);
}

function collectionFilename() {
  return courseStudentFilename("coleta", "pdf");
}

function savePdfFile(pdf, filename) {
  if (typeof pdf.save === "function") {
    pdf.save(filename);
    return;
  }

  const pdfBlob = pdf.output("blob");
  const pdfUrl = URL.createObjectURL(pdfBlob);
  const link = document.createElement("a");

  link.href = pdfUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(pdfUrl), 1000);
}

function programLines() {
  return fields.programContent.value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function currentSignatureLabel() {
  const labels = {
    both: "Instrutor e aluno",
    instructor: "Somente instrutor",
    student: "Somente aluno",
  };
  return labels[fields.signatureMode.value] || "Instrutor e aluno";
}

function collectionData() {
  const dateInfo = currentDateInfo();
  return {
    studentName: plainValue(fields.studentName.value) || "Nome completo do aluno",
    studentDoc: plainValue(fields.studentDoc.value) || "-",
    course: plainValue(currentCourse()),
    hours: plainValue(fields.courseHours.value) || "-",
    periodLabel: dateInfo.lead,
    period: dateInfo.value,
    instructor: companyInstructor.name,
    instructorRole: companyInstructor.role,
    signatures: currentSignatureLabel(),
    verificationCode: output.verificationCode.textContent || "VS-000000",
    issueDate: new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date()),
    program: programLines(),
  };
}

function addCollectionPdfFooter(pdf) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  pdf.setDrawColor(184, 138, 53);
  pdf.setLineWidth(0.2);
  pdf.line(18, pageHeight - 15, pageWidth - 18, pageHeight - 15);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(100, 116, 139);
  pdf.text("VS Cursos - CNPJ 60.953.721/0001-48", 18, pageHeight - 9);
  pdf.text(developerCredit, pageWidth - 18, pageHeight - 9, { align: "right" });
}

function addCollectionPdfHeader(pdf, title = "Resumo da coleta") {
  const pageWidth = pdf.internal.pageSize.getWidth();

  pdf.setFillColor(23, 35, 61);
  pdf.rect(0, 0, pageWidth, 30, "F");
  pdf.setFillColor(184, 138, 53);
  pdf.rect(0, 30, pageWidth, 2, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.setTextColor(255, 255, 255);
  pdf.text("VS CURSOS", 18, 15);
  pdf.setFontSize(9);
  pdf.setTextColor(221, 192, 121);
  pdf.text("Valorização Profissional", 18, 22);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.setTextColor(255, 255, 255);
  pdf.text(title.toUpperCase(), pageWidth - 18, 17, { align: "right" });
}

function drawCollectionRow(pdf, label, value, x, y, width) {
  const wrapped = pdf.splitTextToSize(String(value || "-"), width - 42);
  const rowHeight = Math.max(11, wrapped.length * 5 + 5);

  pdf.setFillColor(248, 250, 252);
  pdf.roundedRect(x, y, width, rowHeight, 2, 2, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(143, 103, 37);
  pdf.text(label.toUpperCase(), x + 4, y + 7);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(31, 41, 55);
  pdf.text(wrapped, x + 42, y + 7);

  return rowHeight + 3;
}

async function downloadCollectionPdf() {
  await updatePreview();
  const exportBlocker = focusFirstExportBlocker();

  if (exportBlocker) {
    alert(exportBlocker);
    return;
  }

  if (!window.jspdf) {
    alert("A biblioteca de PDF ainda não carregou. Recarregue a página e tente novamente.");
    return;
  }

  const data = collectionData();
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 18;
  let y = 44;

  const ensureSpace = (height) => {
    if (y + height <= pageHeight - 24) return;
    addCollectionPdfFooter(pdf);
    pdf.addPage();
    addCollectionPdfHeader(pdf, "Resumo da coleta");
    y = 44;
  };

  const sectionTitle = (title) => {
    ensureSpace(14);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(23, 35, 61);
    pdf.text(title.toUpperCase(), margin, y);
    pdf.setDrawColor(184, 138, 53);
    pdf.line(margin, y + 2, pageWidth - margin, y + 2);
    y += 8;
  };

  const row = (label, value) => {
    ensureSpace(18);
    y += drawCollectionRow(pdf, label, value, margin, y, pageWidth - margin * 2);
  };

  addCollectionPdfHeader(pdf, "Resumo da coleta");

  sectionTitle("Dados principais");
  row("Aluno", data.studentName);
  row("CPF / Documento", data.studentDoc);
  row("Curso", data.course);
  row("Carga horária", data.hours);
  row("Data / período", `${data.periodLabel} ${data.period}`);

  sectionTitle("Validação e assinaturas");
  row("Código de verificação", data.verificationCode);
  row("Instrutor", data.instructor);
  row("Registro", data.instructorRole);
  row("Assinaturas configuradas", data.signatures);
  row("Gerado em", data.issueDate);

  sectionTitle("Conteúdo programático");
  const lines = data.program.length ? data.program : ["Conteúdo programático não informado."];
  lines.forEach((line, index) => {
    const text = `${String(index + 1).padStart(2, "0")}. ${line}`;
    const wrapped = pdf.splitTextToSize(text, pageWidth - margin * 2 - 6);
    const itemHeight = wrapped.length * 5 + 4;
    ensureSpace(itemHeight + 2);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9.5);
    pdf.setTextColor(47, 59, 82);
    pdf.text(wrapped, margin + 3, y);
    y += itemHeight;
  });

  addCollectionPdfFooter(pdf);
  pdf.setProperties({
    title: `Coleta - ${data.studentName}`,
    subject: "Resumo dos dados coletados para certificado VS Cursos",
    author: "VS Cursos",
    creator: developerCredit,
  });

  savePdfFile(pdf, collectionFilename());
}

async function downloadImage(pageId, name) {
  await updatePreview();
  const exportBlocker = focusFirstExportBlocker();
  if (exportBlocker) {
    alert(exportBlocker);
    return;
  }
  if (!window.html2canvas) {
    alert("A biblioteca de imagem ainda não carregou. Recarregue a página e tente novamente.");
    return;
  }
  clearSignatureSelection();
  await nextFrame();
  const element = document.getElementById(pageId);
  const canvas = await renderPage(element);
  const link = document.createElement("a");
  link.download = certificateFilename("png", name);
  link.href = canvas.toDataURL("image/png");
  document.body.appendChild(link);
  link.click();
  link.remove();
}

async function downloadPdf() {
  await updatePreview();
  const exportBlocker = focusFirstExportBlocker();
  if (exportBlocker) {
    alert(exportBlocker);
    return;
  }
  if (!window.html2canvas || !window.jspdf) {
    alert("As bibliotecas de PDF/imagem ainda não carregaram. Recarregue a página e tente novamente.");
    return;
  }
  clearSignatureSelection();
  await nextFrame();
  const { jsPDF } = window.jspdf;
  const frontCanvas = await renderPage(document.getElementById("frontPage"));
  const backCanvas = await renderPage(document.getElementById("backPage"));
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  pdf.addImage(frontCanvas.toDataURL("image/png"), "PNG", 0, 0, 297, 210);
  pdf.addPage("a4", "landscape");
  pdf.addImage(backCanvas.toDataURL("image/png"), "PNG", 0, 0, 297, 210);

  savePdfFile(pdf, certificateFilename("pdf"));
}

document.getElementById("downloadPdf").addEventListener("click", downloadPdf);
document.getElementById("downloadDataPdf").addEventListener("click", downloadCollectionPdf);
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
  fields.dateMode,
  fields.courseHours,
  fields.completionDate,
  fields.startDate,
  fields.endDate,
  fields.signatureMode,
  fields.programContent,
].forEach((field) => {
  field.addEventListener("input", updatePreview);
  field.addEventListener("change", updatePreview);
});

fields.instructorSignatureUpload.addEventListener("change", () => {
  readSignatureImage("instructor", fields.instructorSignatureUpload);
});

fields.studentSignatureUpload.addEventListener("change", () => {
  readSignatureImage("student", fields.studentSignatureUpload);
});

[
  { kind: "instructor", key: "width", control: fields.instructorSignatureWidth },
  { kind: "instructor", key: "height", control: fields.instructorSignatureHeight },
  { kind: "instructor", key: "x", control: fields.instructorSignatureX },
  { kind: "instructor", key: "y", control: fields.instructorSignatureY },
  { kind: "student", key: "width", control: fields.studentSignatureWidth },
  { kind: "student", key: "height", control: fields.studentSignatureHeight },
  { kind: "student", key: "x", control: fields.studentSignatureX },
  { kind: "student", key: "y", control: fields.studentSignatureY },
].forEach(({ kind, key, control }) => {
  control.addEventListener("input", () => updateSignatureSetting(kind, key, control.value));
});

fields.instructorSignatureReset.addEventListener("click", () => resetSignatureSettings("instructor"));
fields.studentSignatureReset.addEventListener("click", () => resetSignatureSettings("student"));

setupSignatureDirectEditing("instructor");
setupSignatureDirectEditing("student");

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
