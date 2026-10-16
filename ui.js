"use strict";

window.VS = {
  user: null,
  company: null,
  async api(url, options = {}) {
    const headers = { "X-VS-Request": "1", ...options.headers };
    if (options.body && !(options.body instanceof Blob)) headers["Content-Type"] = "application/json";
    const payload=options.body && !(options.body instanceof Blob) ? JSON.stringify(options.body) : options.body;
    const file=payload ? (payload instanceof Blob ? payload : new Blob([payload],{type:"application/json"})) : null;
    if(file?.size>3*1024*1024) return this.upload(url,options,headers,file);
    const response = await fetch(url, { credentials: "same-origin", ...options, headers, body:payload });
    if (!response.ok) {
      let message = "Não foi possível concluir a operação.";
      try { message = (await response.json()).error || message; } catch {}
      if (response.status === 401 && !url.startsWith("/api/auth/")) location.assign("login.html");
      const error = new Error(message); error.status = response.status; throw error;
    }
    if (options.blob) return { blob: await response.blob(), filename: response.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] || "arquivo" };
    return response.json();
  },
  async upload(url,options,headers,file) {
    const digest=await crypto.subtle.digest("SHA-256",await file.arrayBuffer());
    const hash=Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,"0")).join("");
    const revision=Object.entries(headers).find(([key])=>key.toLowerCase()==="x-vs-revision")?.[1];
    const type=file.type.split(";")[0] || Object.entries(headers).find(([key])=>key.toLowerCase()==="content-type")?.[1];
    const upload=await this.api("/api/transfers",{method:"POST",body:{route:url,method:options.method||"POST",size:file.size,type,hash,revision}});
    try {
      for(let start=0,part=0;start<file.size;start+=upload.chunkSize,part++) {
        const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(",")[1]);reader.onerror=()=>reject(new Error("Falha ao ler o arquivo."));reader.readAsDataURL(file.slice(start,start+upload.chunkSize));});
        await this.api(`/api/transfers/${upload.id}/parts/${part}`,{method:"PUT",body:{data}});
      }
      return await this.api(`/api/transfers/${upload.id}/complete`,{method:"POST",body:{}});
    } catch(error) {
      await this.api(`/api/transfers/${upload.id}`,{method:"DELETE",body:{}}).catch(()=>{});
      throw error;
    }
  },
  async boot(active) {
    try {
      const auth = await this.api("/api/auth/status");
      if (!auth.user) { location.replace("login.html"); return null; }
      this.user = auth.user;
      this.company = (await this.api("/api/settings")).company;
      this.shell(active);
      return this.user;
    } catch (error) { this.toast(error.message, true); return null; }
  },
  shell(active) {
    const header = document.getElementById("appHeader");
    if (header) {
      header.innerHTML = `<a class="app-brand" href="dashboard.html"><img src="logo.svg" alt="VS Cursos" width="182" height="50"></a>
        <span class="navigation-label">ÁREA DE TRABALHO</span><nav aria-label="Navegação principal"><a href="dashboard.html" ${active === "dashboard" ? 'aria-current="page"' : ""}><i data-lucide="layout-dashboard"></i>Painel</a><a href="dashboard.html#history" ${active === "history" ? 'aria-current="page"' : ""}><i data-lucide="files"></i>Certificados</a><a href="index.html" ${active === "editor" ? 'aria-current="page"' : ""}><i data-lucide="file-plus-2"></i>Emitir</a><a href="settings.html" ${active === "settings" ? 'aria-current="page"' : ""}><i data-lucide="settings-2"></i>Configurações</a></nav>
        <div class="account-menu"><span class="account-avatar" id="accountAvatar" aria-hidden="true"></span><div class="account-details"><span id="accountName"></span><small>${this.user.role === "admin" ? "Administrador" : "Operador"}</small></div><button class="icon-button" id="signOut" title="Sair da conta" aria-label="Sair da conta"><i data-lucide="log-out"></i></button></div>`;
      document.getElementById("accountName").textContent = this.user.name;
      document.getElementById("accountAvatar").textContent = this.user.name.trim().split(/\s+/).slice(0,2).map(part=>part[0]).join("").toUpperCase();
      header.querySelector("img").src = this.company.logo || "logo.svg";
      document.getElementById("signOut").addEventListener("click", async () => {
        try { await this.api("/api/auth/logout", { method: "POST", body: {} }); location.replace("login.html"); }
        catch (error) { this.toast(error.message, true); }
      });
    }
    this.icons();
  },
  icons() { if (window.lucide) lucide.createIcons({ attrs: { "aria-hidden": "true" } }); },
  escape(value) { return String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" }[c])); },
  toast(message, error = false) {
    let container = document.getElementById("notifications");
    if (!container) { container = document.createElement("div"); container.id = "notifications"; container.setAttribute("aria-live", "polite"); document.body.append(container); }
    const item = document.createElement("div"); item.className = `toast ${error ? "error" : "success"}`; item.setAttribute("role", error ? "alert" : "status");
    const label = document.createElement("span"); label.textContent = message;
    const close = document.createElement("button"); close.className="icon-button";close.title="Fechar aviso";close.setAttribute("aria-label","Fechar aviso");close.innerHTML='<i data-lucide="x"></i>';close.onclick=()=>item.remove();
    item.append(label, close); container.append(item); this.icons(); if(!error) setTimeout(()=>item.remove(),6000);
  },
  download(blob, filename) {
    const url = URL.createObjectURL(blob), a = document.createElement("a"); a.href = url; a.download = filename; document.body.append(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),60000);
  },
  async downloadStored(id) {
    const result = await this.api(`/api/certificates/${id}/pdf`, { blob: true }); this.download(result.blob, result.filename);
  },
  async downloadRemote(url) {
    const auth=await this.api("/api/auth/status");if(!auth.user){location.assign("login.html");throw new Error("Entre novamente para baixar o arquivo.");}
    const link=document.createElement("a");link.href=url;link.download="";document.body.append(link);link.click();link.remove();
  },
  date(value, time = false) {
    if (!value) return "—";
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", ...(time ? { timeStyle:"short" } : {}) }).format(new Date(value));
  },
  status(value) { return ({draft:"Rascunho",issued:"Emitido",revoked:"Cancelado"})[value] || value; },
  async confirm({ title, message, label = "Confirmar", danger = false, input = false }) {
    const dialog = document.createElement("dialog"); dialog.className="app-dialog";
    dialog.innerHTML=`<form method="dialog"><h2>${this.escape(title)}</h2><p>${this.escape(message)}</p>${input ? '<label>Motivo<textarea name="reason" required minlength="5" maxlength="500" rows="3"></textarea></label>' : ""}<div class="dialog-actions"><button value="cancel" class="button secondary" formnovalidate>Voltar</button><button value="confirm" class="button ${danger ? "danger" : "primary"}">${this.escape(label)}</button></div></form>`;
    document.body.append(dialog); dialog.showModal();
    return new Promise(resolve=>{dialog.addEventListener("close",()=>{const result=dialog.returnValue==="confirm"?(input?dialog.querySelector("textarea").value:true):false;dialog.remove();resolve(result);},{once:true});});
  },
  async image(file) {
    if(!file) return "";
    if(!["image/png","image/jpeg","image/webp"].includes(file.type) || file.size>2*1024*1024) throw new Error("Use uma imagem PNG, JPEG ou WebP de até 2 MB.");
    const url=URL.createObjectURL(file);
    try {
      const image=new Image();image.src=url;await image.decode();
      if(image.width*image.height>24000000) throw new Error("A imagem é muito grande. Use até 24 megapixels.");
      const canvas=document.createElement("canvas");const scale=Math.min(1,1600/Math.max(image.width,image.height));canvas.width=Math.round(image.width*scale);canvas.height=Math.round(image.height*scale);canvas.getContext("2d").drawImage(image,0,0,canvas.width,canvas.height);let result=canvas.toDataURL("image/png");if(result.length>2800000)result=canvas.toDataURL("image/webp",0.9);if(result.length>2800000)throw new Error("A imagem ainda é muito grande. Use uma imagem menor.");return result;
    } finally {URL.revokeObjectURL(url);}
  },
  async action(button, operation) {
    if(button.disabled) return;
    button.disabled=true;
    try {await operation();} catch(error) {this.toast(error.message,true);} finally {button.disabled=false;}
  },
  pdfHeader(pdf, company, title, subtitle = "") {
    const width=pdf.internal.pageSize.getWidth();
    pdf.setFillColor(21,94,239);pdf.rect(0,0,width,30,"F");pdf.setFillColor(214,228,255);pdf.rect(0,30,width,1.5,"F");
    let x=18;
    if(company.logo){try{const properties=pdf.getImageProperties(company.logo);const scale=Math.min(34/properties.width,18/properties.height);const w=properties.width*scale,h=properties.height*scale;pdf.setFillColor(255,255,255);pdf.rect(16,5,38,20,"F");pdf.addImage(company.logo,18+(34-w)/2,6+(18-h)/2,w,h);x=60;}catch{}}
    const maxWidth=width-18-x-80;let size=16;pdf.setFont("helvetica","bold");pdf.setFontSize(size);
    while(pdf.getTextWidth(company.name)>maxWidth&&size>8){size--;pdf.setFontSize(size);}
    const name=pdf.splitTextToSize(company.name,maxWidth);pdf.setTextColor(255,255,255);pdf.text(name.slice(0,2),x,name.length>1?11:15);
    pdf.setFont("helvetica","normal");pdf.setFontSize(8);pdf.setTextColor(234,242,255);pdf.text(pdf.splitTextToSize(subtitle||company.tagline,maxWidth).slice(0,1),x,24);
    pdf.setFont("helvetica","bold");pdf.setFontSize(10);pdf.setTextColor(255,255,255);pdf.text(title.toUpperCase(),width-18,16,{align:"right"});
  },
  pdfFooter(pdf, company, page = "") {
    const width=pdf.internal.pageSize.getWidth(),height=pdf.internal.pageSize.getHeight();pdf.setDrawColor(206,220,245);pdf.setLineWidth(.2);pdf.line(18,height-15,width-18,height-15);pdf.setFont("helvetica","normal");pdf.setTextColor(98,107,121);
    const label=`${company.name} - CNPJ ${company.cnpj}`;let size=8;pdf.setFontSize(size);while(pdf.getTextWidth(label)>width-36-70&&size>5){size--;pdf.setFontSize(size);}pdf.text(label,18,height-9);pdf.setFontSize(8);pdf.text(`Desenvolvido por Vinicius Dev${page?` · ${page}`:""}`,width-18,height-9,{align:"right"});
  }
};
