"use strict";

const editorFields=document.getElementById("editorFields");
const saveButton=document.getElementById("saveDraft");
const pdfButton=document.getElementById("downloadPdf");
const saveLabel=document.getElementById("saveStatus");

VS.editor = {
  initialized:false, busy:false, loading:true, record:null, brand:null, dirty:false, timer:null, saving:null, generation:0, zoom:1,
  snapshot() {
    return {studentName:fields.studentName.value,studentDoc:fields.studentDoc.value,company:fields.studentCompany.value,courseKey:fields.courseSelect.value,course:currentCourse(),customCourse:fields.customCourse.value,hours:fields.courseHours.value,dateMode:fields.dateMode.value,completionDate:fields.completionDate.value,startDate:fields.startDate.value,endDate:fields.endDate.value,signatureMode:fields.signatureMode.value,trainingType:fields.trainingType.value,nr33Role:fields.nr33Role.value,instructor:fields.instructorName.value,instructorRole:fields.instructorRole.value,program:fields.programContent.value,signatureImages:{...signatureImages},signatureSettings:structuredClone(signatureSettings),brand:structuredClone(this.brand)};
  },
  changed() {
    if(!this.initialized || this.loading || this.busy || (this.record && this.record.status!=="draft"))return;
    this.dirty=true;this.generation++;saveLabel.textContent="Alterações pendentes";
    clearTimeout(this.timer);
    this.timer=setTimeout(()=>this.save().catch(error=>{saveLabel.textContent="Não salvo";VS.toast(error.message,true);}),900);
  },
  async save() {
    if(!this.initialized)throw new Error("Aguarde o carregamento do sistema.");
    if(this.saving) {await this.saving;if(this.dirty)return this.save();return this.record;}
    if(this.record && this.record.status!=="draft")return this.record;
    if(!this.dirty && this.record)return this.record;
    clearTimeout(this.timer);
    const generation=this.generation;
    const data=this.snapshot();
    saveLabel.textContent="Salvando…";
    this.saving=(async()=>{
      const item=this.record?await VS.api(`/api/certificates/${this.record.id}`,{method:"PUT",body:{revision:this.record.revision,data}}):await VS.api("/api/certificates",{method:"POST",body:data});
      this.record=item;this.brand=structuredClone(item.data.brand);this.renderBrand();this.dirty=this.generation!==generation;
      history.replaceState(null,"",`index.html?id=${item.id}`);
      saveLabel.textContent=this.dirty?"Alterações pendentes":"Salvo no histórico";
      document.getElementById("previewRecordCode").textContent=item.code;
      await updatePreview();return item;
    })();
    try{return await this.saving;}finally{this.saving=null;}
  },
  renderBrand() {
    const brand=this.brand;
    document.getElementById("backIssuer").textContent=`${brand.name.toUpperCase()} - CNPJ ${brand.cnpj}`;
    document.querySelector(".cert-seal>span").textContent=brand.name;
    for(const logo of document.querySelectorAll(".certificate-logo")) {
      logo.replaceChildren();logo.classList.toggle("has-image",Boolean(brand.logo));
      if(brand.logo){const image=document.createElement("img");image.src=brand.logo;image.alt=brand.name;logo.append(image);}
      else {const name=document.createElement("span"),subtitle=document.createElement("small"),line=document.createElement("i"),tagline=document.createElement("em");name.textContent=brand.name.toLowerCase()==="vs cursos"?"VS":brand.name;subtitle.textContent=brand.name.toLowerCase()==="vs cursos"?"CURSOS":"";tagline.textContent=brand.tagline;logo.append(name,subtitle,line,tagline);if(brand.name.toLowerCase()!=="vs cursos"){name.style.fontSize="25px";name.style.lineHeight="1.2";name.style.overflowWrap="anywhere";}}
    }
  },
  async load(item) {
    this.loading=true;this.record=item;this.brand=structuredClone(item.data.brand);const data=item.data;
    const mapping={studentName:"studentName",studentDoc:"studentDoc",company:"studentCompany",courseKey:"courseSelect",customCourse:"customCourse",hours:"courseHours",dateMode:"dateMode",completionDate:"completionDate",startDate:"startDate",endDate:"endDate",signatureMode:"signatureMode",trainingType:"trainingType",nr33Role:"nr33Role",instructor:"instructorName",instructorRole:"instructorRole",program:"programContent"};
    for(const [key,field] of Object.entries(mapping))fields[field].value=data[key]||"";
    Object.assign(signatureImages,data.signatureImages);Object.assign(signatureSettings,structuredClone(data.signatureSettings));
    this.renderBrand();await updatePreview();this.dirty=false;this.loading=false;
    const locked=item.status!=="draft";editorFields.disabled=locked;saveButton.disabled=locked;saveButton.classList.toggle("hidden",locked);document.getElementById("editorTitle").textContent=locked?"Certificado registrado":"Editar rascunho";
    saveLabel.textContent=locked?VS.status(item.status):"Salvo no histórico";
    const notice=document.getElementById("recordNotice");notice.classList.toggle("hidden",!locked);
    if(locked){notice.innerHTML=`<span><strong>${item.code} · ${VS.status(item.status)}</strong><br>${item.status==="revoked"?`Cancelado: ${VS.escape(item.revokeReason)}`:`Emitido em ${VS.date(item.issuedAt,true)}. O PDF original está preservado.`}</span><button class="button secondary" id="duplicateCurrent"><i data-lucide="copy"></i>Duplicar</button>`;document.getElementById("duplicateCurrent").onclick=event=>VS.action(event.currentTarget,async()=>{const next=await VS.api(`/api/certificates/${item.id}/duplicate`,{method:"POST",body:{}});await this.load(next);history.replaceState(null,"",`index.html?id=${next.id}`);});}
    document.getElementById("previewRecordCode").textContent=item.code;
    pdfButton.querySelector("span").textContent=locked?"Baixar PDF original":"Emitir e baixar PDF";
    pdfButton.disabled=locked?!item.hasPdf:!updateCertificateStatus(cpfState(),dateState());
    for(const kind of ["instructor","student"])signatureParts(kind).box.style.pointerEvents=locked?"none":"";
    VS.icons();
  },
  async fresh() {
    clearTimeout(this.timer);if(this.saving)await this.saving;
    this.loading=true;this.record=null;this.brand=structuredClone(VS.company);this.dirty=false;
    document.getElementById("certificateForm").reset();
    fields.completionDate.value=localDate;fields.startDate.value=localDate;fields.endDate.value=localDate;
    fields.instructorName.value=this.brand.instructor;fields.instructorRole.value=this.brand.instructorRole;
    signatureImages.instructor=this.brand.instructorSignature;signatureImages.student="";
    signatureSettings.instructor={...defaultSignatureSettings};signatureSettings.student={...defaultSignatureSettings};
    for(const kind of ["instructor","student"])signatureParts(kind).box.style.pointerEvents="";
    this.renderBrand();applyCoursePreset();editorFields.disabled=false;saveButton.disabled=false;saveButton.classList.remove("hidden");this.loading=false;
    document.getElementById("editorTitle").textContent="Novo certificado";document.getElementById("recordNotice").classList.add("hidden");document.getElementById("previewRecordCode").textContent="A4 · Paisagem · Frente e verso";pdfButton.querySelector("span").textContent="Emitir e baixar PDF";saveLabel.textContent="Novo rascunho";
    history.replaceState(null,"","index.html?new=1");
  },
  async operation(operation) {
    if(this.busy || !this.initialized)return;
    this.busy=true;clearTimeout(this.timer);const locked=this.record && this.record.status!=="draft";
    editorFields.disabled=true;saveButton.disabled=true;downloadButtons.forEach(button=>button.disabled=true);
    clearSignatureSelection();for(const kind of ["instructor","student"])signatureParts(kind).box.style.pointerEvents="none";
    document.getElementById("newCertificate").disabled=true;
    try{return {success:true,value:await operation()};}catch(error){VS.toast(error.message,true);saveLabel.textContent=this.dirty?"Não salvo":"Salvo no histórico";return {success:false,error};}
    finally{this.busy=false;editorFields.disabled=Boolean(this.record && this.record.status!=="draft");saveButton.disabled=editorFields.disabled;for(const kind of ["instructor","student"])signatureParts(kind).box.style.pointerEvents=editorFields.disabled?"none":"";document.getElementById("newCertificate").disabled=false;await updatePreview();if(locked || (this.record && this.record.status!=="draft"))pdfButton.disabled=!this.record.hasPdf;}
  },
  async issue() {
    if(this.record && this.record.status!=="draft") {
      if(this.record.status==="revoked" && !await VS.confirm({title:"Baixar certificado cancelado?",message:"Este arquivo é a cópia original de uma emissão cancelada.",label:"Baixar original"}))return;
      return this.operation(()=>VS.downloadStored(this.record.id));
    }
    const blocker=focusFirstExportBlocker();if(blocker){VS.toast(blocker,true);return;}
    await this.operation(async()=>{
      if(!this.record)this.dirty=true;
      await this.save();await updatePreview();
      saveLabel.textContent="Gerando PDF…";
      const blob=await downloadPdf();saveLabel.textContent="Registrando emissão…";
      const item=await VS.api(`/api/certificates/${this.record.id}/pdf`,{method:"PUT",headers:{"Content-Type":"application/pdf","X-VS-Revision":String(this.record.revision)},body:blob});
      await this.load(item);await VS.downloadStored(item.id);VS.toast("Certificado emitido e PDF salvo no histórico.");
    });
  }
};

saveButton.onclick=()=>VS.editor.operation(async()=>{VS.editor.dirty=true;await VS.editor.save();VS.toast("Rascunho salvo no histórico.");});
pdfButton.onclick=()=>VS.editor.issue();
document.getElementById("downloadDataPdf").onclick=()=>VS.editor.operation(async()=>{if(!VS.editor.record)VS.editor.dirty=true;await VS.editor.save();await downloadCollectionPdf();});
document.getElementById("downloadFront").onclick=()=>VS.editor.operation(async()=>{await downloadImage("frontPage","frente");});
document.getElementById("downloadBack").onclick=()=>VS.editor.operation(async()=>{await downloadImage("backPage","verso");});
document.getElementById("newCertificate").onclick=()=>VS.editor.operation(async()=>{if(VS.editor.dirty)await VS.editor.save();await VS.editor.fresh();});
for(const [id,kind] of [["removeInstructorSignature","instructor"],["removeStudentSignature","student"]])document.getElementById(id).onclick=()=>{signatureImages[kind]="";fields[`${kind}SignatureUpload`].value="";updateSignaturePreview();VS.editor.changed();};
document.getElementById("restoreProgram").onclick=async()=>{if(await VS.confirm({title:"Restaurar conteúdo?",message:"Os tópicos atuais serão substituídos pelo modelo do curso.",label:"Restaurar"})){applyCoursePreset();VS.editor.changed();}};
document.querySelectorAll("[data-preview-page]").forEach(button=>button.onclick=()=>{
  const front=button.dataset.previewPage==="front";document.getElementById("frontFrame").classList.toggle("hidden",!front);document.getElementById("backFrame").classList.toggle("hidden",front);document.querySelectorAll("[data-preview-page]").forEach(item=>item.setAttribute("aria-pressed",String(item===button)));updatePreview();
});
document.getElementById("certificateForm").onsubmit=event=>event.preventDefault();
for (const [id,change] of [["zoomIn",0.5],["zoomOut",-0.5],["zoomFit",0]]) document.getElementById(id).onclick=()=>{VS.editor.zoom=change?clamp(VS.editor.zoom+change,1,4):1;updatePreviewScale();document.getElementById("zoomOut").disabled=VS.editor.zoom<=1;document.getElementById("zoomIn").disabled=VS.editor.zoom>=4;};
document.getElementById("zoomOut").disabled=true;
document.addEventListener("pointerdown",event=>{if(!event.target.closest(".signature-image-box"))clearSignatureSelection();});
window.addEventListener("beforeunload",event=>{if(VS.editor.dirty || VS.editor.saving || VS.editor.busy){event.preventDefault();event.returnValue="";}});

// Each line is one collaborator; the current course and layout are the batch template.
const batchTools=document.createElement("details");batchTools.className="batch-tools";
batchTools.innerHTML='<summary>Importar turma</summary><div class="section-fields"><label>Alunos e CPFs<textarea id="batchText" rows="5" placeholder="Nome completo; CPF; Empresa" maxlength="60000"></textarea></label><label>Planilha CSV<input id="batchFile" type="file" accept=".csv,text/csv"></label><div class="heading-actions"><button class="button secondary" id="batchModel" type="button"><i data-lucide="sheet"></i>Modelo CSV</button><button class="button secondary" id="previewBatch" type="button"><i data-lucide="list-checks"></i>Conferir</button></div><p id="batchError" class="inline-error" role="alert"></p><div id="batchPreview" class="batch-preview"></div><button class="button primary" id="saveBatch" type="button" disabled><i data-lucide="files"></i>Salvar turma como rascunhos</button></div>';
document.querySelector(".preview-zone").append(batchTools);
let batchRows=[];
function parseCsv(source) {
  // RFC 4180 quoting, with semicolon or tab support for Brazilian spreadsheets.
  const firstLine=source.split(/\r?\n/,1)[0];const delimiter=firstLine.includes(";")?";":firstLine.includes("\t")?"\t":",";
  const rows=[];let row=[],cell="",quoted=false;
  for(let i=0;i<source.length;i++){
    const char=source[i];
    if(char==='"'){if(quoted&&source[i+1]==='"'){cell+='"';i++;}else if(!quoted&&cell.length){throw new Error("Aspas inválidas na planilha.");}else quoted=!quoted;}
    else if(char===delimiter&&!quoted){row.push(cell.trim());cell="";}
    else if((char==="\n"||char==="\r")&&!quoted){if(char==="\r"&&source[i+1]==="\n")i++;row.push(cell.trim());if(row.some(Boolean))rows.push(row);row=[];cell="";}
    else cell+=char;
  }
  if(quoted)throw new Error("Há aspas abertas na planilha.");row.push(cell.trim());if(row.some(Boolean))rows.push(row);
  if(rows[0] && /^(nome|aluno|nome completo)$/i.test(rows[0][0].replace(/^\uFEFF/,"")))rows.shift();
  return rows;
}
document.getElementById("batchFile").onchange=async event=>{try{const file=event.target.files[0];if(file){if(file.size>150000)throw new Error("Use um CSV de até 150 KB.");document.getElementById("batchText").value=await file.text();batchRows=[];document.getElementById("saveBatch").disabled=true;}}catch(error){document.getElementById("batchError").textContent=error.message;}};
document.getElementById("batchModel").onclick=()=>VS.download(new Blob(["\uFEFFNome;CPF;Empresa\r\n"],{type:"text/csv;charset=utf-8"}),"modelo-turma-vs-cursos.csv");
document.getElementById("batchText").oninput=()=>{batchRows=[];document.getElementById("saveBatch").disabled=true;};
document.getElementById("previewBatch").onclick=()=>{
  const errorBox=document.getElementById("batchError");errorBox.textContent="";batchRows=[];document.getElementById("saveBatch").disabled=true;
  try{const rows=parseCsv(document.getElementById("batchText").value.trim());if(!rows.length||rows.length>200)throw new Error("Informe de 1 a 200 alunos.");const seen=new Set();batchRows=rows.map((row,index)=>{if(row.length<2||row.length>3)throw new Error(`Linha ${index+1}: use Nome; CPF; Empresa.`);if(row[0].split(/\s+/).length<2||!isValidCpf(row[1]))throw new Error(`Linha ${index+1}: confira o nome completo e o CPF.`);const cpf=onlyDigits(row[1]);if(seen.has(cpf))throw new Error(`Linha ${index+1}: CPF duplicado na turma.`);seen.add(cpf);return {studentName:row[0],studentDoc:formatCpf(row[1]),company:row[2]||""};});document.getElementById("batchPreview").innerHTML=`<table class="records-table"><thead><tr><th>Aluno</th><th>CPF</th><th>Empresa</th></tr></thead><tbody>${batchRows.map(row=>`<tr><td>${VS.escape(row.studentName)}</td><td>${row.studentDoc}</td><td>${VS.escape(row.company)}</td></tr>`).join("")}</tbody></table>`;document.getElementById("saveBatch").disabled=false;}
  catch(error){batchRows=[];errorBox.textContent=error.message;document.getElementById("batchPreview").replaceChildren();}
};
document.getElementById("saveBatch").onclick=async event=>{const button=event.currentTarget;await VS.action(button,async()=>{
  if(!batchRows.length)throw new Error("Confira a turma antes de salvar.");
  const template=VS.editor.snapshot();
  const result=await VS.api("/api/certificates/batch",{method:"POST",body:{template,students:batchRows}});VS.toast(`${result.items.length} rascunhos criados no histórico.`);batchRows=[];document.getElementById("batchText").value="";document.getElementById("batchPreview").replaceChildren();document.getElementById("saveBatch").disabled=true;
});button.disabled=!batchRows.length;};

(async()=>{
  if(!await VS.boot("editor"))return;VS.editor.brand=structuredClone(VS.company);VS.editor.initialized=true;
  const id=new URLSearchParams(location.search).get("id");
  try{if(id)await VS.editor.load(await VS.api(`/api/certificates/${encodeURIComponent(id)}`));else await VS.editor.fresh();}
  catch(error){VS.toast(error.message,true);saveLabel.textContent="Falha ao abrir registro";VS.editor.loading=false;}
  VS.icons();
})();
