"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs/promises");
const os=require("node:os");
const path=require("node:path");
const {createApplication}=require("../server");
const {chromium}=require("playwright");

(async()=>{
  const dataDir=await fs.mkdtemp(path.join(os.tmpdir(),"vs-cursos-browser-"));
  const output=path.join(__dirname,"..","test-results");await fs.mkdir(output,{recursive:true});
  const app=createApplication({dataDir});await new Promise(resolve=>app.server.listen(0,"127.0.0.1",resolve));
  const origin=`http://127.0.0.1:${app.server.address().port}`;
  const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||"C:/Program Files/Google/Chrome/Application/chrome.exe",headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});const page=await context.newPage();
  const errors=[];page.on("pageerror",error=>errors.push(error.message));page.on("console",message=>{if(message.type()==="error")console.log("CONSOLE:",message.text());});
  async function noOverflow(){
    const size=await page.evaluate(()=>{
      const stage=document.querySelector(".preview-stage"),table=document.querySelector("#historySection .table-scroll");
      return {width:innerWidth,scroll:document.documentElement.scrollWidth,previewOverflow:stage&&VS.editor?.zoom===1?stage.scrollWidth-stage.clientWidth:0,mobileTableOverflow:table&&innerWidth<=760?table.scrollWidth-table.clientWidth:0};
    });
    assert.ok(size.scroll<=size.width+1,`Overflow: ${JSON.stringify(size)}`);
    assert.ok(size.previewOverflow<=1,`A prévia ajustada ultrapassa a área: ${JSON.stringify(size)}`);
    assert.ok(size.mobileTableOverflow<=1,`A lista móvel requer rolagem lateral: ${JSON.stringify(size)}`);
  }
  try{
    await page.goto(origin);await page.waitForURL("**/login.html");await page.getByText("Crie o administrador").waitFor();await page.screenshot({path:path.join(output,"login-desktop.png"),fullPage:true});await noOverflow();
    await page.locator("#loginName").fill("Administrador Teste");await page.locator("#loginUser").fill("admin");await page.locator("#loginPassword").fill("senha-longa-browser");await page.locator("#loginConfirmation").fill("senha-longa-browser");await page.locator("#loginSubmit").click();await page.waitForURL("**/dashboard.html");await page.getByText("Ainda não há certificados emitidos.").waitFor();
    await page.screenshot({path:path.join(output,"dashboard-empty-desktop.png"),fullPage:true});await noOverflow();
    const theme=await page.evaluate(()=>({brand:getComputedStyle(document.querySelector(".button.primary")).backgroundColor,sidebar:document.querySelector(".app-header").getBoundingClientRect().width}));assert.equal(theme.brand,"rgb(21, 94, 239)");assert.equal(theme.sidebar,232);
    await page.goto(`${origin}/index.html`);await page.locator("#editorFields:not([disabled])").waitFor();
    await page.locator("#studentName").fill("MARIA EDUARDA DE OLIVEIRA SANTOS");await page.locator("#studentDoc").fill("52998224725");await page.locator("#studentCompany").fill("Empresa de Teste");await page.locator("#courseSelect").selectOption("nr33");assert.equal(await page.locator("#courseHours").inputValue(),"16 horas");await page.locator("#trainingType").selectOption("refresher");assert.equal(await page.locator("#courseHours").inputValue(),"8 horas");
    await page.locator("#dateMode").selectOption("range");await page.locator("#startDate").fill("2026-10-01");await page.locator("#endDate").fill("2026-10-03");
    await page.getByText("Salvo no histórico",{exact:true}).waitFor();const id=new URL(page.url()).searchParams.get("id");assert.ok(id);
    await page.locator('summary').filter({hasText:"Assinaturas e instrutor"}).click();await page.locator("#signatureMode").selectOption("instructor");
    const signaturePage=await context.newPage();await signaturePage.setContent('<html><body style="margin:0;background:white;width:360px;height:120px;color:#243556;display:flex;align-items:center;justify-content:center;font:bold italic 24px Georgia">Assinatura de Teste</body></html>');await signaturePage.locator("body").screenshot({path:path.join(output,"signature-test.png")});await signaturePage.close();
    await page.locator("#instructorSignatureUpload").setInputFiles(path.join(output,"signature-test.png"));await page.locator("#instructorSignatureBox:not(.hidden)").waitFor();
    const box=await page.locator("#instructorSignatureBox").boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+22,box.y+box.height/2-14,{steps:5});await page.mouse.up();
    const moved=await page.evaluate(()=>({...signatureSettings.instructor}));assert.ok(moved.x>0);assert.ok(moved.y<0);
    const handle=await page.locator("#instructorSignatureBox .bottom-right").boundingBox();await page.mouse.move(handle.x+handle.width/2,handle.y+handle.height/2);await page.mouse.down();await page.mouse.move(handle.x+35,handle.y+15,{steps:5});await page.mouse.up();assert.ok((await page.evaluate(()=>signatureSettings.instructor.width))>300);
    await page.getByText("Salvo no histórico",{exact:true}).waitFor();await page.reload();await page.locator("#editorFields:not([disabled])").waitFor();assert.equal(await page.locator("#studentName").inputValue(),"MARIA EDUARDA DE OLIVEIRA SANTOS");assert.ok((await page.evaluate(()=>signatureSettings.instructor.x))>0);
    await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(output,"editor-desktop.png"),fullPage:true});await noOverflow();
    // Store the exact export canvases for a visual comparison with the generated PDF.
    for(const [pageId,name] of [["frontPage","front"],["backPage","back"]]){const base64=await page.evaluate(async pageId=>{clearSignatureSelection();await updatePreview();return (await renderPage(document.getElementById(pageId))).toDataURL("image/png").split(",")[1];},pageId);await fs.writeFile(path.join(output,`export-${name}.png`),Buffer.from(base64,"base64"));}
    const downloadPromise=page.waitForEvent("download");await page.locator("#downloadPdf").click();const download=await downloadPromise;assert.match(download.suggestedFilename(),/^certificado-nr-33-.*maria-eduarda/);await download.saveAs(path.join(output,"certificate.pdf"));await page.getByText("Certificado emitido e PDF salvo no histórico.").waitFor();assert.ok(await page.locator("#studentName").isDisabled());
    const content=await fs.readFile(path.join(output,"certificate.pdf"));assert.ok(content.length>100000 && content.length<4000000,`Unexpected PDF size: ${content.length}`);
    const redownloadPromise=page.waitForEvent("download");await page.locator("#downloadPdf").click();const redownload=await redownloadPromise;await redownload.saveAs(path.join(output,"certificate-original.pdf"));assert.deepEqual(await fs.readFile(path.join(output,"certificate-original.pdf")),content);
    const code=await page.locator("#verificationCode").textContent();const publicContext=await browser.newContext();const publicPage=await publicContext.newPage();await publicPage.goto(`${origin}/verify.html?codigo=${code}&aluno=FALSO`);await publicPage.getByText("Emissão confirmada",{exact:true}).waitFor();assert.equal(await publicPage.getByText("FALSO",{exact:true}).count(),0);await publicPage.screenshot({path:path.join(output,"verification-desktop.png"),fullPage:true});await publicContext.close();
    await page.goto(`${origin}/dashboard.html`);await page.getByText("MARIA EDUARDA DE OLIVEIRA SANTOS").first().waitFor();await page.screenshot({path:path.join(output,"dashboard-desktop.png"),fullPage:true});
    await page.goto(`${origin}/dashboard.html#history`);await page.locator("#search").fill("Inexistente");await page.getByText("Nenhum certificado encontrado").waitFor();await page.locator("#clearFilters").click();await page.locator("#certificateRows .student-link").waitFor();
    const reportPromise=page.waitForEvent("download");await page.locator("#exportReport").click();await (await reportPromise).saveAs(path.join(output,"report.pdf"));
    await page.goto(`${origin}/settings.html`);await page.locator("#companyForm input[name=name]").waitFor();await page.locator("#companyForm input[name=phone]").fill("(91) 99999-9999");await page.locator("#saveCompany").click();await page.getByText("Empresa atualizada. Certificados já emitidos foram preservados.").waitFor();
    const backupPromise=page.waitForEvent("download");await page.locator("#exportBackup").click();await (await backupPromise).saveAs(path.join(output,"backup.json"));
    const databasePromise=page.waitForEvent("download");await page.locator("#exportDatabase").click();await (await databasePromise).saveAs(path.join(output,"backup.sqlite"));assert.equal((await fs.readFile(path.join(output,"backup.sqlite"))).subarray(0,15).toString(),"SQLite format 3");
    await page.goto(`${origin}/index.html?id=${id}`);await page.locator("#duplicateCurrent").click();await page.getByText("Editar rascunho",{exact:true}).waitFor();
    await page.locator(".batch-tools summary").click();await page.locator("#batchText").fill('Nome;CPF;Empresa\nALUNO UM TESTE;52998224725;"Empresa; Unidade 1"\nALUNO DOIS TESTE;16899535009;Unidade 2');await page.locator("#previewBatch").click();await page.locator("#saveBatch:not([disabled])").waitFor();await page.locator("#saveBatch").click();await page.getByText("2 rascunhos criados no histórico.").waitFor();
    await page.goto(`${origin}/dashboard.html#history`);await page.locator("#search").fill("ALUNO");await page.getByText("2 registros encontrados",{exact:true}).waitFor();await page.locator("#selectPage").check();await page.locator("#issueSelected").click();await page.locator("dialog button[value=confirm]").click();await page.getByText("2 certificados emitidos.",{exact:true}).waitFor({timeout:60000});
    const zipPromise=page.waitForEvent("download");await page.locator("#zipSelected").click();const zipDownload=await zipPromise;await zipDownload.saveAs(path.join(output,"certificates.zip"));const JSZip=require("jszip");const zip=await JSZip.loadAsync(await fs.readFile(path.join(output,"certificates.zip")));assert.equal(Object.keys(zip.files).filter(name=>name.endsWith(".pdf")).length,2);
    for(const width of [390,360,768]){await page.setViewportSize({width,height:900});await page.goto(`${origin}/dashboard.html`);await page.locator("#metrics .metric").first().waitFor();await noOverflow();await page.screenshot({path:path.join(output,`dashboard-${width}.png`),fullPage:true});await page.goto(`${origin}/index.html?id=${id}`);await page.getByText("Certificado registrado",{exact:true}).waitFor();await noOverflow();await page.screenshot({path:path.join(output,`editor-${width}.png`),fullPage:true});await page.locator("#zoomIn").click();await page.locator("#zoomIn").click();await noOverflow();await page.locator("#zoomFit").click();await page.goto(`${origin}/settings.html`);await page.locator("#myAccount").getByText("admin",{exact:true}).waitFor();await noOverflow();await page.screenshot({path:path.join(output,`settings-${width}.png`),fullPage:true});}
    assert.deepEqual(errors,[]);console.log(JSON.stringify({result:"PASS",screenshots:output,pdfBytes:content.length,record:id,code,errors},null,2));
  } finally {await browser.close();await app.close();const resolved=path.resolve(dataDir);assert.ok(resolved.startsWith(path.resolve(os.tmpdir())+path.sep)&&path.basename(resolved).startsWith("vs-cursos-browser-"));await fs.rm(resolved,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
