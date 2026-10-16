"use strict";

const fs=require("node:fs");
const path=require("node:path");
const readline=require("node:readline");
const {Writable}=require("node:stream");
const {scrypt,randomBytes}=require("node:crypto");
const {promisify}=require("node:util");
const {DatabaseSync}=require("node:sqlite");

async function main(){
  const [command,username]=process.argv.slice(2);
  if(command!=="reset-password" || !username || !/^[a-z0-9._-]{3,64}$/.test(username)){console.log("Uso: node manage.js reset-password usuario");process.exitCode=1;return;}
  const file=path.join(process.env.VS_DATA_DIR||path.join(__dirname,".data"),"vscursos.sqlite");
  if(!fs.existsSync(file))throw new Error("Banco não encontrado. Configure o primeiro acesso pelo navegador.");
  const db=new DatabaseSync(file,{timeout:5000});
  let rl;
  try{
    const user=db.prepare("SELECT id,name FROM users WHERE username=?").get(username);if(!user)throw new Error("Usuário não encontrado.");
    if(!process.stdin.isTTY)throw new Error("Execute esta recuperação em um terminal interativo.");
    let muted=false;
    const output=new Writable({write(chunk,encoding,callback){if(!muted)process.stdout.write(chunk,encoding);callback();}});
    rl=readline.createInterface({input:process.stdin,output,terminal:true});
    const secret=prompt=>new Promise(resolve=>{muted=false;rl.question(prompt,value=>{muted=false;process.stdout.write("\n");resolve(value);});muted=true;});
    console.log(`Recuperação local da conta ${username} (${user.name}).`);
    const password=await secret("Nova senha (mínimo de 12 caracteres): ");
    if(password.trim().length<12 || password.length>200 || /[\x00-\x1f]/.test(password))throw new Error("Senha inválida. Use de 12 a 200 caracteres.");
    if(password!==await secret("Confirme a nova senha: "))throw new Error("As senhas não conferem.");
    const salt=randomBytes(16).toString("hex"),digest=await promisify(scrypt)(password,salt,64);
    db.exec("BEGIN IMMEDIATE");
    try{db.prepare("UPDATE users SET password=? WHERE id=?").run(`${salt}:${digest.toString("hex")}`,user.id);db.prepare("DELETE FROM sessions WHERE user_id=?").run(user.id);db.prepare("INSERT INTO audit (at,user_id,actor,action,target,detail) VALUES (?,?,?,?,?,?)").run(new Date().toISOString(),user.id,"recuperacao-local","account.password",user.id,"Recuperação pelo terminal local");db.exec("COMMIT");}catch(error){db.exec("ROLLBACK");throw error;}
    console.log("Senha atualizada. Entre novamente pelo navegador.");
  }finally{if(rl)rl.close();db.close();}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
