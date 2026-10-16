"use strict";

let page = 1, loadRun = 0, searchTimer;
const selected=new Map();let visibleItems=[],batchBusy=false,stopBatch=false;
const filterIds = { q:"search",status:"filterStatus",course:"filterCourse",from:"filterFrom",to:"filterTo" };
function filterParams(all=false) {
  const params=new URLSearchParams({page:all?"1":String(page),limit:all?"1000":"25"});
  for(const [key,id] of Object.entries(filterIds)) {const value=document.getElementById(id).value;if(value)params.set(key,value);}
  return params;
}
function badge(item) {return `<span class="status-badge ${item.status}">${VS.status(item.status)}</span>`;}
function actions(item) {
  return `<a class="icon-button" href="index.html?id=${item.id}" title="${item.status==="draft"?"Editar rascunho":"Consultar certificado"}" aria-label="${item.status==="draft"?"Editar rascunho":"Consultar certificado"}"><i data-lucide="${item.status==="draft"?"pencil":"eye"}"></i></a>${item.hasPdf?`<button class="icon-button" data-action="pdf" data-id="${item.id}" title="Baixar PDF original" aria-label="Baixar PDF original"><i data-lucide="download"></i></button>`:""}<button class="icon-button" data-action="duplicate" data-id="${item.id}" title="Duplicar certificado" aria-label="Duplicar certificado"><i data-lucide="copy"></i></button>${item.status==="draft"?`<button class="icon-button" data-action="delete" data-id="${item.id}" title="Excluir rascunho" aria-label="Excluir rascunho"><i data-lucide="trash-2"></i></button>`:item.status==="issued" && VS.user.role==="admin"?`<button class="icon-button" data-action="revoke" data-id="${item.id}" title="Cancelar certificado" aria-label="Cancelar certificado"><i data-lucide="ban"></i></button>`:""}`;
}
async function loadHistory() {
  const run=++loadRun;
  const result=await VS.api(`/api/certificates?${filterParams()}`);
  if(run!==loadRun) return;
  if(page>result.pages) {page=result.pages;return loadHistory();}
  visibleItems=result.items;
  for(const item of visibleItems)if(selected.has(item.id))selected.set(item.id,item);
  document.getElementById("historyCount").textContent=`${result.total} registro${result.total===1?"":"s"} encontrado${result.total===1?"":"s"}`;
  document.getElementById("certificateRows").innerHTML=result.items.length?result.items.map(item=>`<tr><td><div class="selectable-student"><input type="checkbox" class="record-select" data-id="${item.id}" aria-label="Selecionar ${VS.escape(item.studentName||"rascunho")}" ${selected.has(item.id)?"checked":""}><div><a class="student-link" href="index.html?id=${item.id}">${VS.escape(item.studentName||"Aluno pendente")}</a><small>${VS.escape(item.company||item.studentDoc||"Sem empresa")}</small><code>${item.code}</code></div></div></td><td class="course-cell" data-label="Curso">${VS.escape(item.course)}<small>${VS.escape(item.hours)}</small></td><td data-label="Data / período">${VS.escape(item.period)}</td><td data-label="Situação">${badge(item)}</td><td data-label="Atualizado">${VS.date(item.updatedAt)}<small>${VS.date(item.updatedAt,true).split(", ").pop()}</small></td><td><div class="row-actions">${actions(item)}</div></td></tr>`).join(""):`<tr><td colspan="6"><div class="empty-state"><i data-lucide="files"></i><h3>Nenhum certificado encontrado</h3><a class="text-link" href="index.html">Criar certificado <i data-lucide="arrow-right"></i></a></div></td></tr>`;
  document.getElementById("pageInfo").textContent=`Página ${result.page} de ${result.pages}`;document.getElementById("previousPage").disabled=page<=1;document.getElementById("nextPage").disabled=page>=result.pages;VS.icons();
  updateSelection();
}
async function loadOverview() {
  const data=await VS.api("/api/dashboard");
  document.getElementById("metrics").innerHTML=[["Certificados emitidos",data.issued,"file-check-2","green"],["Rascunhos",data.drafts,"file-pen-line","gold"],["Alunos certificados",data.students,"users","blue"],["Emissões neste mês",data.month,"calendar-check","green"]].map(([label,value,icon,color])=>`<div class="metric"><div><span>${label}</span><strong>${value}</strong></div><i class="${color}" data-lucide="${icon}"></i></div>`).join("");
  const courses=Object.entries(data.byCourse).sort((a,b)=>b[1]-a[1]);const max=Math.max(1,...courses.map(item=>item[1]));
  document.getElementById("courseChart").innerHTML=courses.length?courses.map(([name,total])=>`<div class="chart-row"><div><span>${VS.escape(name)}</span><strong>${total}</strong></div><div class="chart-track"><span style="width:${total/max*100}%"></span></div></div>`).join(""):'<div class="empty-state"><i data-lucide="chart-no-axes-column"></i><p>Ainda não há certificados emitidos.</p><a href="index.html" class="text-link">Emitir primeiro certificado</a></div>';
  document.getElementById("recentCertificates").innerHTML=data.recent.length?data.recent.map(item=>`<a class="recent-row" href="index.html?id=${item.id}"><span class="recent-icon"><i data-lucide="${item.status==="issued"?"file-check-2":item.status==="draft"?"file-pen-line":"file-x-2"}"></i></span><div><strong>${VS.escape(item.studentName||"Aluno pendente")}</strong><small>${VS.escape(item.course)}</small></div><div>${badge(item)}<small>${VS.date(item.updatedAt)}</small></div></a>`).join(""):'<div class="empty-state"><i data-lucide="clock-3"></i><p>O histórico começa na primeira gravação.</p><a href="index.html" class="text-link">Criar certificado</a></div>';
  VS.icons();
}
async function reload() {await Promise.all([loadHistory(),loadOverview()]);}
function updateSelection(){const count=selected.size;document.getElementById("selectionToolbar").classList.toggle("hidden",!count&&!batchBusy);document.getElementById("selectionCount").textContent=`${count} selecionado${count===1?"":"s"}`;document.getElementById("issueSelected").disabled=batchBusy||!Array.from(selected.values()).some(item=>item.status==="draft");document.getElementById("zipSelected").disabled=batchBusy||!Array.from(selected.values()).some(item=>item.hasPdf);const check=document.getElementById("selectPage"),checked=visibleItems.filter(item=>selected.has(item.id)).length;check.checked=visibleItems.length>0&&checked===visibleItems.length;check.indeterminate=checked>0&&checked<visibleItems.length;check.disabled=batchBusy;document.querySelectorAll(".record-select").forEach(input=>{input.checked=selected.has(input.dataset.id);input.disabled=batchBusy;});document.getElementById("clearSelection").disabled=batchBusy;}
document.getElementById("selectPage").onchange=event=>{for(const item of visibleItems){if(event.target.checked)selected.set(item.id,item);else selected.delete(item.id);}updateSelection();};
document.getElementById("certificateRows").onchange=event=>{const input=event.target.closest(".record-select");if(!input)return;const item=visibleItems.find(item=>item.id===input.dataset.id);if(input.checked)selected.set(item.id,item);else selected.delete(item.id);updateSelection();};
document.getElementById("clearSelection").onclick=()=>{selected.clear();updateSelection();};
document.getElementById("zipSelected").onclick=event=>VS.action(event.currentTarget,async()=>{
  const items=Array.from(selected.values()).filter(item=>item.hasPdf);if(items.length>100 || items.reduce((total,item)=>total+(item.pdfBytes||0),0)>150*1024*1024)throw new Error("Selecione até 100 PDFs, somando no máximo 150 MB por ZIP.");const zip=new JSZip();
  for(let i=0;i<items.length;i++){document.getElementById("batchProgress").textContent=`Reunindo PDF ${i+1} de ${items.length}`;const result=await VS.api(`/api/certificates/${items[i].id}/pdf`,{blob:true});zip.file(`${result.filename.replace(/\.pdf$/i,"")}-${items[i].code}.pdf`,await result.blob.arrayBuffer());}
  VS.download(await zip.generateAsync({type:"blob",compression:"STORE"}),`vs-cursos-certificados-${new Date().toISOString().slice(0,10)}.zip`);document.getElementById("batchProgress").textContent="ZIP baixado";
});
document.getElementById("stopBatch").onclick=()=>{stopBatch=true;document.getElementById("batchProgress").textContent="Encerrando após o certificado atual…";};
document.getElementById("issueSelected").onclick=async()=>{
  if(batchBusy)return;const items=Array.from(selected.values()).filter(item=>item.status==="draft");if(items.length>50){VS.toast("Emita até 50 certificados por lote.",true);return;}
  if(!await VS.confirm({title:"Emitir os rascunhos selecionados?",message:`${items.length} certificados serão registrados com os dados e assinaturas gravados em cada rascunho.`,label:"Emitir certificados"}))return;
  batchBusy=true;stopBatch=false;updateSelection();document.getElementById("stopBatch").classList.remove("hidden");let completed=0;
  const iframe=document.createElement("iframe");iframe.title="Renderização de certificados";iframe.setAttribute("aria-hidden","true");iframe.tabIndex=-1;iframe.style.cssText="position:fixed;left:-10000px;top:0;width:1440px;height:1000px;border:0";document.body.append(iframe);
  try{
    for(const item of items){if(stopBatch)break;document.getElementById("batchProgress").textContent=`Emitindo ${completed+1} de ${items.length} · ${item.studentName}`;
      await new Promise((resolve,reject)=>{const started=Date.now();const check=()=>{try{const editor=iframe.contentWindow?.VS?.editor;if(editor?.initialized&&!editor.loading&&editor.record?.id===item.id)return resolve();}catch{}if(Date.now()-started>30000)return reject(new Error("Não foi possível abrir um rascunho para emissão."));setTimeout(check,100);};iframe.src=`index.html?id=${item.id}`;check();});
      const win=iframe.contentWindow;const blocker=win.focusFirstExportBlocker();if(blocker)throw new Error(`${item.studentName}: ${blocker}`);
      const result=await win.VS.editor.operation(async()=>{await win.VS.editor.save();const blob=await win.downloadPdf();const record=await win.VS.api(`/api/certificates/${item.id}/pdf`,{method:"PUT",headers:{"Content-Type":"application/pdf","X-VS-Revision":String(win.VS.editor.record.revision)},body:blob});await win.VS.editor.load(record);return record;});
      if(!result?.success)throw new Error(`${item.studentName}: ${result?.error?.message||"Falha na emissão"}`);
      selected.set(item.id,result.value);completed++;
    }
    VS.toast(`${completed} certificados emitidos${stopBatch?". Lote interrompido.":"."}`);
  }catch(error){VS.toast(`${completed} emitidos. ${error.message}`,true);}
  finally{iframe.remove();batchBusy=false;document.getElementById("stopBatch").classList.add("hidden");document.getElementById("batchProgress").textContent=`${completed} emissões concluídas`;try{await reload();}catch(error){VS.toast(error.message,true);}updateSelection();}
};
window.addEventListener("beforeunload",event=>{if(batchBusy){event.preventDefault();event.returnValue="";}});
document.getElementById("certificateRows").onclick=async event=>{
  const button=event.target.closest("button[data-action]");if(!button)return;
  await VS.action(button,async()=>{
    const {action,id}=button.dataset;
    if(action==="pdf") {await VS.downloadStored(id);return;}
    if(action==="duplicate") {const item=await VS.api(`/api/certificates/${id}/duplicate`,{method:"POST",body:{}});location.assign(`index.html?id=${item.id}`);return;}
    if(action==="delete") {
      if(!await VS.confirm({title:"Excluir rascunho?",message:"O rascunho e suas imagens serão removidos.",label:"Excluir",danger:true})) return;
      await VS.api(`/api/certificates/${id}`,{method:"DELETE",body:{}});VS.toast("Rascunho excluído.");
    }
    if(action==="revoke") {
      const reason=await VS.confirm({title:"Cancelar certificado?",message:"O PDF original será preservado. A consulta do código passará a indicar o cancelamento.",label:"Cancelar certificado",danger:true,input:true});if(!reason)return;
      await VS.api(`/api/certificates/${id}/revoke`,{method:"POST",body:{reason}});VS.toast("Certificado cancelado.");
    }
    selected.delete(id);await reload();
  });
};
document.getElementById("historyFilters").onsubmit=event=>event.preventDefault();
for(const id of Object.values(filterIds)) document.getElementById(id).addEventListener(id==="search"?"input":"change",()=>{clearTimeout(searchTimer);if(!batchBusy){selected.clear();updateSelection();}searchTimer=setTimeout(()=>{page=1;loadHistory().catch(error=>VS.toast(error.message,true));},id==="search"?250:0);});
document.getElementById("clearFilters").onclick=()=>{for(const id of Object.values(filterIds))document.getElementById(id).value="";if(!batchBusy)selected.clear();page=1;loadHistory().catch(error=>VS.toast(error.message,true));};
document.getElementById("previousPage").onclick=()=>{page--;loadHistory().catch(error=>VS.toast(error.message,true));};
document.getElementById("nextPage").onclick=()=>{page++;loadHistory().catch(error=>VS.toast(error.message,true));};
document.getElementById("refreshHistory").onclick=event=>VS.action(event.currentTarget,reload);
function csvCell(value) {const safe=String(value??"").replace(/^[\s]*[=+@-]/,"'$&");return `"${safe.replace(/"/g,'""')}"`;}
async function reportItems() {
  let all=[],current=1,totalPages=1;
  do {const params=filterParams(true);params.set("page",String(current));const data=await VS.api(`/api/certificates?${params}`);all.push(...data.items);totalPages=data.pages;current++;}while(current<=totalPages);
  return all;
}
document.getElementById("exportCsv").onclick=event=>VS.action(event.currentTarget,async()=>{
  const items=await reportItems();if(!items.length)throw new Error("Não há registros para exportar.");
  const rows=[["Código","Aluno","CPF","Empresa","Curso","Carga horária","Período","Situação","Emissão"],...items.map(item=>[item.code,item.studentName,item.studentDoc,item.company,item.course,item.hours,item.period,VS.status(item.status),VS.date(item.issuedAt)])];
  VS.download(new Blob(["\uFEFF",rows.map(row=>row.map(csvCell).join(";")).join("\r\n")],{type:"text/csv;charset=utf-8"}),`vs-cursos-certificados-${new Date().toISOString().slice(0,10)}.csv`);
});
document.getElementById("exportReport").onclick=event=>VS.action(event.currentTarget,async()=>{
  const items=await reportItems();if(!items.length)throw new Error("Não há registros para o relatório.");
  const pdf=new jspdf.jsPDF({orientation:"landscape",unit:"mm",format:"a4",compress:true});const company=VS.company;
  let y=0,pageNumber=0;
  const footer=()=>VS.pdfFooter(pdf,company,pageNumber);
  const newPage=()=>{if(pageNumber){footer();pdf.addPage();}pageNumber++;VS.pdfHeader(pdf,company,"Relatório de certificados",`${items.length} registros · ${VS.date(new Date().toISOString(),true)}`);pdf.setTextColor(50,60,70);pdf.setFontSize(8);pdf.setFont("helvetica","bold");[["ALUNO / EMPRESA",16],["CURSO",88],["DATA / PERÍODO",183],["SITUAÇÃO",239]].forEach(([label,x])=>pdf.text(label,x,42));y=47;};
  newPage();
  for(const item of items){pdf.setFont("helvetica","normal");pdf.setFontSize(9);const name=pdf.splitTextToSize(item.studentName||"Aluno pendente",66),course=pdf.splitTextToSize(item.course,88),period=pdf.splitTextToSize(item.period,49);const secondary=pdf.splitTextToSize(item.company||item.studentDoc||"-",66);const height=Math.max((name.length+secondary.length)*4.2+8,course.length*4.2+8,period.length*4.2+8,18);if(y+height>187)newPage();pdf.setFillColor(247,249,250);pdf.rect(16,y,265,height,"F");pdf.setTextColor(25,35,45);pdf.setFont("helvetica","bold");pdf.text(name,18,y+6);pdf.setFont("helvetica","normal");pdf.text(course,88,y+6);pdf.text(period,183,y+6);pdf.text(VS.status(item.status),239,y+6);pdf.setFontSize(7);pdf.setTextColor(95,105,115);pdf.text(secondary,18,y+6+name.length*4.2);pdf.text(item.code,88,y+6+course.length*4.2);y+=height+2;}
  footer();pdf.setProperties({title:"Relatório de certificados",author:company.name,creator:"Desenvolvido por Vinicius Dev"});VS.download(pdf.output("blob"),`vs-cursos-relatorio-${new Date().toISOString().slice(0,10)}.pdf`);
});
function changeView(){const history=location.hash==="#history";document.getElementById("overview").classList.toggle("hidden",history);document.getElementById("pageTitle").textContent=history?"Certificados":"Visão geral";if(VS.user)VS.shell(history?"history":"dashboard");}
window.addEventListener("hashchange",changeView);
(async()=>{if(!await VS.boot(location.hash==="#history"?"history":"dashboard"))return;document.getElementById("todayLabel").textContent=new Intl.DateTimeFormat("pt-BR",{dateStyle:"full"}).format(new Date());changeView();try{await reload();}catch(error){VS.toast(error.message,true);}})();
