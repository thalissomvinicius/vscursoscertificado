"use strict";

const {test,before,after}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs/promises");
const os=require("node:os");
const path=require("node:path");
const {jsPDF}=require("../jspdf.umd.min.js");
const {createApplication}=require("../server");
const {DEFAULT_COMPANY,validateCertificate,cpfValid,validDate,hash}=require("../core");

let app,origin,directory,cookie;
const validData=()=>({studentName:"Aluno de Teste",studentDoc:"529.982.247-25",company:"Empresa de Teste",courseKey:"nr35",course:"NR 35 - Trabalho em Altura",customCourse:"",hours:"8 horas",program:"Análise de riscos\nProteção contra quedas\nProcedimentos de resgate",instructor:"Instrutor de Teste",instructorRole:"Técnico de segurança",dateMode:"range",completionDate:"2026-10-03",startDate:"2026-10-01",endDate:"2026-10-03",signatureMode:"instructor",signatureImages:{},signatureSettings:{},brand:DEFAULT_COMPANY});
async function api(route,{method="GET",body,auth=true,headers={}}={}) {
  const isPdf=Buffer.isBuffer(body);
  const response=await fetch(`${origin}${route}`,{method,headers:{Origin:origin,"X-VS-Request":"1",...(auth&&cookie?{Cookie:cookie}:{}),...(body?{"Content-Type":isPdf?"application/pdf":"application/json"}:{}),...headers},body:body?(isPdf?body:JSON.stringify(body)):undefined});
  const data=response.headers.get("content-type")?.includes("application/json")?await response.json():Buffer.from(await response.arrayBuffer());
  return {response,status:response.status,data};
}
function pdfBuffer(){const pdf=new jsPDF({orientation:"landscape",compress:true});pdf.text("VS Cursos - certificado de teste",20,20);pdf.addPage();pdf.text("Conteudo programatico",20,20);return Buffer.from(pdf.output("arraybuffer"));}
async function draft(data=validData()){const result=await api("/api/certificates",{method:"POST",body:data});assert.equal(result.status,201,JSON.stringify(result.data));return result.data;}
async function issue(item){return api(`/api/certificates/${item.id}/pdf`,{method:"PUT",body:pdfBuffer(),headers:{"X-VS-Revision":String(item.revision)}});}

before(async()=>{
  directory=await fs.mkdtemp(path.join(os.tmpdir(),"vs-cursos-tests-"));app=createApplication({dataDir:directory});
  await new Promise(resolve=>app.server.listen(0,"127.0.0.1",resolve));origin=`http://127.0.0.1:${app.server.address().port}`;
});
after(async()=>{await app.close();const absolute=path.resolve(directory);assert.ok(absolute.startsWith(path.resolve(os.tmpdir())+path.sep));await fs.rm(absolute,{recursive:true,force:true});});

test("CPF, datas impossíveis e emissão incompleta são rejeitados",()=>{
  assert.ok(cpfValid("529.982.247-25"));assert.equal(cpfValid("111.111.111-11"),false);assert.equal(validDate("2026-02-30"),false);assert.equal(validDate("2024-02-29"),true);
  assert.throws(()=>validateCertificate({...validData(),studentName:"Aluno"},true),/nome completo/);
  assert.throws(()=>validateCertificate({...validData(),program:""},true),/tópicos/);
  assert.throws(()=>validateCertificate({...validData(),startDate:"2026-10-05"},true),/início/);
  assert.throws(()=>validateCertificate({...validData(),courseKey:"nr33",hours:"8 horas"},true),/16 horas/);
  assert.throws(()=>validateCertificate({...validData(),signatureImages:{instructor:"data:image/svg+xml;base64,PHN2Zz4="}},true),/imagem/);
});

test("acesso sem sessão e CSRF são bloqueados; primeiro administrador não usa senha fixa",async()=>{
  assert.equal((await api("/api/certificates",{auth:false})).status,401);
  const wrongOrigin=await api("/api/auth/setup",{method:"POST",body:{},headers:{Origin:"http://evil.example"}});assert.equal(wrongOrigin.status,403);
  assert.equal((await api("/api/auth/setup",{method:"POST",body:{name:"Admin Teste",username:"admin",password:"curta"}})).status,400);
  const setup=await api("/api/auth/setup",{method:"POST",body:{name:"Admin Teste",username:"admin",password:"senha-longa-de-teste"}});assert.equal(setup.status,201);
  cookie=setup.response.headers.get("set-cookie").split(";")[0];assert.match(setup.response.headers.get("set-cookie"),/HttpOnly/);assert.match(setup.response.headers.get("set-cookie"),/SameSite=Strict/);
  const account=app.db.prepare("SELECT password FROM users WHERE username='admin'").get();assert.ok(!account.password.includes("senha-longa-de-teste"));
  assert.equal((await api("/api/auth/setup",{method:"POST",body:{name:"Outro",username:"outro",password:"senha-longa-de-teste"}})).status,409);
  assert.equal((await api("/api/auth/login",{method:"POST",body:{username:"admin",password:"errada"}})).status,401);
  assert.equal((await api("/.data/vscursos.sqlite")).status,404);assert.equal((await api("/server.js")).status,404);
});

test("rascunho incompleto salva e revisões impedem perda de dados entre abas",async()=>{
  const item=await draft({...validData(),studentName:"",studentDoc:""});
  const updated=await api(`/api/certificates/${item.id}`,{method:"PUT",body:{revision:1,data:validData()}});assert.equal(updated.status,200);assert.equal(updated.data.revision,2);
  const conflict=await api(`/api/certificates/${item.id}`,{method:"PUT",body:{revision:1,data:{...validData(),studentName:"Outra Pessoa"}}});assert.equal(conflict.status,409);
  assert.equal((await api(`/api/certificates/${item.id}`)).data.studentName,"Aluno de Teste");
});

test("identidade da empresa é controlada pelo servidor e congelada no rascunho",async()=>{
  const item=await draft({...validData(),brand:{...DEFAULT_COMPANY,name:"Empresa Falsa"}});assert.equal(item.data.brand.name,"VS Cursos");
  const changed=await api(`/api/certificates/${item.id}`,{method:"PUT",body:{revision:item.revision,data:{...validData(),brand:{...DEFAULT_COMPANY,name:"Outra Identidade"}}}});assert.equal(changed.status,200);assert.equal(changed.data.data.brand.name,"VS Cursos");
});

test("QR consulta o banco, não dados manipuláveis da URL",async()=>{
  const item=await draft();assert.equal((await api(`/api/verify/${item.code}`,{auth:false})).status,404);
  const issued=await issue(item);assert.equal(issued.status,200);assert.equal(issued.data.status,"issued");
  const verify=await api(`/api/verify/${item.code}?aluno=Nome%20Falso&cpf=00000000000`,{auth:false});assert.equal(verify.status,200);assert.equal(verify.data.studentName,"Aluno de Teste");assert.notEqual(verify.data.studentDoc,"529.982.247-25");assert.equal(verify.data.studentDoc,"***.982.247-**");
});

test("PDF original é persistido, tem nome padronizado e emissão é imutável",async()=>{
  const item=await draft();const buffer=pdfBuffer();
  const uploaded=await api(`/api/certificates/${item.id}/pdf`,{method:"PUT",body:buffer,headers:{"X-VS-Revision":"1"}});assert.equal(uploaded.status,200);assert.equal(uploaded.data.pdfHash,hash(buffer));
  const downloaded=await api(`/api/certificates/${item.id}/pdf`);assert.equal(downloaded.status,200);assert.deepEqual(downloaded.data,buffer);assert.match(downloaded.response.headers.get("content-disposition"),/certificado-nr-35-trabalho-em-altura-aluno-de-teste.pdf/);
  assert.equal((await api(`/api/certificates/${item.id}`,{method:"PUT",body:{revision:uploaded.data.revision,data:validData()}})).status,409);
  assert.equal((await api(`/api/certificates/${item.id}`,{method:"DELETE",body:{}})).status,409);
  assert.equal((await issue(item)).status,409);
  const duplicate=await api(`/api/certificates/${item.id}/duplicate`,{method:"POST",body:{}});assert.equal(duplicate.status,201);assert.notEqual(duplicate.data.code,item.code);assert.equal(duplicate.data.status,"draft");
});

test("PDF inválido, CPF inválido e revisão antiga não podem emitir",async()=>{
  const item=await draft();assert.equal((await api(`/api/certificates/${item.id}/pdf`,{method:"PUT",body:Buffer.from("invalido"),headers:{"X-VS-Revision":"1"}})).status,400);
  assert.equal((await api(`/api/certificates/${item.id}/pdf`,{method:"PUT",body:pdfBuffer(),headers:{"X-VS-Revision":"0"}})).status,409);
  const invalid=await draft({...validData(),studentDoc:"000.000.000-00"});assert.equal((await issue(invalid)).status,400);assert.equal((await api(`/api/certificates/${invalid.id}`)).data.status,"draft");
});

test("duas emissões concorrentes não sobrescrevem o PDF original",async()=>{
  const item=await draft();const results=await Promise.all([issue(item),issue(item)]);
  assert.deepEqual(results.map(result=>result.status).sort(),[200,409]);
  assert.equal((await api(`/api/certificates/${item.id}`)).data.revision,2);
});

test("busca aceita CPF sem pontuação e nomes sem acento; páginas não expõem arquivos privados",async()=>{
  await draft({...validData(),studentName:"João André da Silva"});
  const search=await api("/api/certificates?q=Joao%20Andre&limit=1");assert.equal(search.status,200);assert.equal(search.data.items.length,1);assert.equal(search.data.items[0].studentName,"João André da Silva");
  const cpf=await api("/api/certificates?q=52998224725");assert.ok(cpf.data.total>0);
  assert.equal((await api("/api/settings",{method:"PUT",body:DEFAULT_COMPANY,headers:{"X-VS-Request":""}})).status,403);
  const forbiddenHost=await new Promise((resolve,reject)=>require("node:http").get(`${origin}/api/auth/status`,{headers:{Host:"host-nao-autorizado.example"}},response=>{response.resume();resolve(response.statusCode);}).on("error",reject));assert.equal(forbiddenHost,403);
  const index=await api("/index.html");assert.equal(index.response.headers.get("x-frame-options"),"SAMEORIGIN");
  const verify=await api("/verify.html");assert.equal(verify.response.headers.get("x-frame-options"),"DENY");
});

test("cancelamento preserva PDF e aparece na consulta pública",async()=>{
  const item=await draft();await issue(item);const original=await api(`/api/certificates/${item.id}/pdf`);
  const revoked=await api(`/api/certificates/${item.id}/revoke`,{method:"POST",body:{reason:"Dados corrigidos em nova emissão"}});assert.equal(revoked.status,200);assert.equal(revoked.data.status,"revoked");
  assert.equal((await api(`/api/verify/${item.code}`,{auth:false})).data.status,"revoked");assert.deepEqual((await api(`/api/certificates/${item.id}/pdf`)).data,original.data);
  assert.equal((await api(`/api/certificates/${item.id}/revoke`,{method:"POST",body:{reason:"Cancelar novamente"}})).status,409);
});

test("operador emite certificados mas não altera empresa, equipe ou backup",async()=>{
  const created=await api("/api/users",{method:"POST",body:{username:"operador",name:"Operador Teste",role:"operator",password:"senha-operador-teste"}});assert.equal(created.status,201);
  const adminCookie=cookie;const login=await api("/api/auth/login",{method:"POST",auth:false,body:{username:"operador",password:"senha-operador-teste"}});cookie=login.response.headers.get("set-cookie").split(";")[0];
  for(const route of ["/api/users","/api/backup","/api/audit"]) assert.equal((await api(route)).status,403);
  assert.equal((await api("/api/settings",{method:"PUT",body:DEFAULT_COMPANY})).status,403);
  const item=await draft();assert.equal((await issue(item)).status,200);assert.equal((await api(`/api/certificates/${item.id}/revoke`,{method:"POST",body:{reason:"Operador cancelando"}})).status,403);
  cookie=adminCookie;assert.equal((await api(`/api/users/${created.data.user.id}`,{method:"PATCH",body:{active:false,role:"operator"}})).status,200);
  assert.equal((await api("/api/auth/login",{method:"POST",body:{username:"operador",password:"senha-operador-teste"}})).status,401);
});

test("lote é atômico e rejeita linhas inválidas",async()=>{
  const count=app.db.prepare("SELECT COUNT(*) n FROM certificates").get().n;
  assert.equal((await api("/api/certificates/batch",{method:"POST",body:{items:[validData(),{...validData(),studentDoc:"0"}]}})).status,400);
  assert.equal(app.db.prepare("SELECT COUNT(*) n FROM certificates").get().n,count);
  const batch=await api("/api/certificates/batch",{method:"POST",body:{items:[validData(),{...validData(),studentName:"Outro Aluno",studentDoc:"168.995.350-09"}]}});assert.equal(batch.status,201);assert.equal(batch.data.items.length,2);
});

test("backup restaura sem sobrescrever e rejeita PDF adulterado",async()=>{
  const exported=await api("/api/backup");assert.equal(exported.status,200);assert.equal(exported.data.version,2);
  const imported=await api("/api/backup/import",{method:"POST",body:exported.data});assert.equal(imported.status,200,JSON.stringify(imported.data));assert.equal(imported.data.added,0);assert.equal(imported.data.skipped,exported.data.items.length);
  const damaged=structuredClone(exported.data);const item=damaged.items.find(item=>item.pdf);item.pdf=pdfBuffer().toString("base64");item.pdfHash="0".repeat(64);assert.equal((await api("/api/backup/import",{method:"POST",body:damaged})).status,400);
  const count=app.db.prepare("SELECT COUNT(*) n FROM certificates").get().n;assert.equal(count,exported.data.items.length);
  const conflicting=structuredClone(exported.data);conflicting.items[0].data.studentName="Pessoa Alterada";assert.equal((await api("/api/backup/import",{method:"POST",body:conflicting})).status,409);
  await app.automaticBackup();const files=await fs.readdir(path.join(directory,"backups"));assert.ok(files.some(name=>name.endsWith(".sqlite")));
  const snapshot=await api("/api/backup/database");assert.equal(snapshot.status,200);assert.equal(snapshot.data.subarray(0,15).toString(),"SQLite format 3");
});

test("alterar senha revoga sessões anteriores e mantém a nova sessão",async()=>{
  const priorCookie=cookie;
  assert.equal((await api("/api/auth/password",{method:"PUT",body:{currentPassword:"errada",password:"nova-senha-longa-teste"}})).status,403);
  const result=await api("/api/auth/password",{method:"PUT",body:{currentPassword:"senha-longa-de-teste",password:"nova-senha-longa-teste"}});assert.equal(result.status,200);
  assert.equal((await api("/api/dashboard",{headers:{Cookie:priorCookie}})).status,401);
  cookie=result.response.headers.get("set-cookie").split(";")[0];assert.equal((await api("/api/dashboard")).status,200);
});

test("registros sobrevivem ao reinício e logout invalida a sessão",async()=>{
  const count=app.db.prepare("SELECT COUNT(*) n FROM certificates").get().n;await app.close();app=createApplication({dataDir:directory});await new Promise(resolve=>app.server.listen(0,"127.0.0.1",resolve));origin=`http://127.0.0.1:${app.server.address().port}`;
  assert.equal(app.db.prepare("SELECT COUNT(*) n FROM certificates").get().n,count);assert.equal((await api("/api/dashboard")).status,200);
  assert.equal((await api("/api/auth/logout",{method:"POST",body:{}})).status,200);assert.equal((await api("/api/dashboard")).status,401);
});
