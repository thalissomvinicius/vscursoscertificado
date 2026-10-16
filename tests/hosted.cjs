"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {chromium}=require("playwright");
const access=JSON.parse(fs.readFileSync(path.join(__dirname,"../.data/preview-access.json"),"utf8"));
const origin=new URL(access.shareableUrl).origin;
(async()=>{
  const browser=await chromium.launch({executablePath:"C:/Program Files/Google/Chrome/Application/chrome.exe",headless:true});
  try {
    const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
    const page=await context.newPage();const errors=[];page.on("pageerror",error=>errors.push(error.message));
    page.on("response",response=>{if(new URL(response.url()).pathname.startsWith("/api/"))console.log(response.status(),new URL(response.url()).pathname);});
    page.on("requestfailed",request=>console.log("REQUEST FAILED",new URL(request.url()).pathname,request.failure()?.errorText));
    const timeout=setTimeout(()=>{console.error("Hosted validation timed out");browser.close();},300000);timeout.unref();
    await page.goto(access.shareableUrl);
    await page.goto(origin+"/login.html");
    await page.locator("#loginUser").fill("admin");
    await page.locator("#loginPassword").fill("nova-senha-longa-teste");
    await page.locator("#loginSubmit").click();
    await page.waitForURL("**/dashboard.html");
    await page.locator("#accountName").waitFor();
    await page.getByText("Carregando indicadores...",{exact:true}).waitFor({state:"hidden"});
    await page.getByText("Carregando registros...",{exact:true}).waitFor({state:"hidden"});
    await page.screenshot({path:"test-results/hosted-dashboard.png",fullPage:true});
    for(const route of ["/server.js","/storage.js","/cloud/schema.sql","/.data/vscursos.sqlite","/package.json"]){
      const r=await context.request.get(origin+route);assert.equal(r.status(),404,route);
    }
    await page.goto(origin+"/index.html");
    await page.locator("#editorFields:not([disabled])").waitFor();
    const result=await page.evaluate(async()=>{
      const data={studentName:"ALUNO FICTICIO TESTE PUBLICACAO",studentDoc:"529.982.247-25",courseKey:"nr35",course:"NR 35 - Trabalho em Altura",hours:"8 horas",program:"Analise de riscos\nProtecao contra quedas\nProcedimentos de resgate",instructor:"Instrutor de Teste",instructorRole:"Tecnico de seguranca",dateMode:"completion",completionDate:"2026-10-16",signatureMode:"instructor",signatureImages:{},signatureSettings:{}};
      const item=await VS.api("/api/certificates",{method:"POST",body:data});
      const pdf=new jspdf.jsPDF({orientation:"landscape",compress:false});
      pdf.text("TESTE DE PUBLICACAO - SEM VALIDADE",20,20);pdf.addPage();pdf.text("Teste de arquivo grande",20,20);pdf.setProperties({subject:"TESTE ".repeat(1024*1024)});
      const blob=pdf.output("blob");
      const issued=await VS.api(`/api/certificates/${item.id}/pdf`,{method:"PUT",body:blob,headers:{"Content-Type":"application/pdf","X-VS-Revision":String(item.revision)}});
      const downloaded=await VS.api(`/api/certificates/${item.id}/pdf`,{blob:true});
      const digest=await crypto.subtle.digest("SHA-256",await downloaded.blob.arrayBuffer());
      const hash=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,"0")).join("");
      if(hash!==issued.pdfHash)throw new Error("Downloaded PDF hash differs");
      const backup=await VS.api("/api/backup",{blob:true});
      const parsed=JSON.parse(await backup.blob.text());
      if(!parsed.items.some(record=>record.id===item.id))throw new Error("Certificate missing from backup");
      parsed.items=parsed.items.filter(record=>record.id===item.id);
      const restored=await VS.api("/api/backup/import",{method:"POST",body:parsed});
      if(restored.added!==0)throw new Error("Import duplicated existing records");
      const database=await VS.api("/api/backup/database",{blob:true});
      if(!((await database.blob.slice(0,15).text()).startsWith("SQLite format 3")))throw new Error("Invalid portable backup");
      const verified=await VS.api(`/api/verify/${item.code}`);
      if(verified.status!=="issued")throw new Error("Verification failed");
      return {pdfBytes:blob.size,downloadBytes:downloaded.blob.size,backupBytes:backup.blob.size,databaseBytes:database.blob.size,filename:downloaded.filename};
    });
    await page.setViewportSize({width:390,height:844});
    console.log("Hosted API validation passed:",JSON.stringify(result));
    await page.goto(origin+"/dashboard.html");await page.locator("#accountName").waitFor({state:"attached"});
    await page.getByText("Carregando indicadores...",{exact:true}).waitFor({state:"hidden"});
    await page.getByText("Carregando registros...",{exact:true}).waitFor({state:"hidden"});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await page.screenshot({path:"test-results/hosted-mobile.png",fullPage:true});
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({result:"PASS",origin,...result,errors},null,2));
  } finally {await browser.close();}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
