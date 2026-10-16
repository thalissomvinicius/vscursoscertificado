"use strict";
VS.icons();
const verificationForm=document.getElementById("verifyForm");
const result=document.getElementById("verifyResult");
const codeInput=document.getElementById("certificateCode");
async function verify() {
  result.innerHTML='<p class="muted">Consultando registro…</p>';
  const button=verificationForm.querySelector("button");button.disabled=true;
  try {
    const item=await VS.api(`/api/verify/${encodeURIComponent(codeInput.value.trim().toUpperCase())}`);
    const revoked=item.status==="revoked";
    result.innerHTML=`<div class="verify-outcome ${revoked?"revoked":"issued"}"><i data-lucide="${revoked?"shield-x":"shield-check"}"></i><div><h2>${revoked?"Certificado cancelado":"Emissão confirmada"}</h2><p>${revoked?"Este registro foi cancelado pela empresa emissora.":"O código corresponde a um certificado registrado pela empresa emissora."}</p></div></div><dl class="detail-grid">${[["Código",item.code],["Aluno",item.studentName],["CPF",item.studentDoc],["Curso",item.course],["Carga horária",item.hours],["Data / período",item.period],["Instrutor",item.instructor],["Qualificação / registro",item.instructorRole],["Empresa emissora",item.company],["CNPJ",item.cnpj],["Emitido em",VS.date(item.issuedAt,true)],...(revoked?[["Cancelado em",VS.date(item.revokedAt,true)]]:[])].map(([label,value])=>`<div><dt>${VS.escape(label)}</dt><dd>${VS.escape(value)}</dd></div>`).join("")}</dl><div class="integrity"><strong>Integridade do PDF · SHA-256</strong><code>${VS.escape(item.pdfHash)}</code></div>`;
    VS.icons();
  } catch(error) {
    result.innerHTML=`<div class="verify-outcome revoked"><i data-lucide="shield-alert"></i><div><h2>Emissão não confirmada</h2><p>${VS.escape(error.status===404?"Código não encontrado ou certificado ainda não emitido.":error.message)}</p></div></div>`;VS.icons();
  } finally {button.disabled=false;}
}
verificationForm.onsubmit=event=>{event.preventDefault();verify();};
const query=new URLSearchParams(location.search).get("codigo");
if(query){codeInput.value=query;verify();}
