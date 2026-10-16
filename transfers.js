"use strict";

const { randomUUID } = require("node:crypto");
const { AppError, hash } = require("./core");
const CHUNK_SIZE=1024*1024;

function transferLimit(route,method,user) {
  if(route==="/api/backup/import" && method==="POST" && user.role==="admin") return 120*CHUNK_SIZE;
  if(/^\/api\/certificates\/[^/]+\/pdf$/.test(route) && method==="PUT") return 25*CHUNK_SIZE;
  if((route==="/api/certificates" || route==="/api/certificates/batch") && method==="POST") return 16*CHUNK_SIZE;
  if(/^\/api\/certificates\/[^/]+$/.test(route) && method==="PUT") return 16*CHUNK_SIZE;
  if(route==="/api/settings" && method==="PUT" && user.role==="admin") return 16*CHUNK_SIZE;
  throw new AppError("Destino de envio nao autorizado.",403);
}

async function transfer(req,res,url,{db,user,body,send,dispatch}) {
  await db.prepare("DELETE FROM transfers WHERE expires<?").run(Date.now());
  if(url.pathname==="/api/transfers" && req.method==="POST") {
    const input=await body(req,4096);
    const max=transferLimit(input.route,input.method,user);
    const type=input.route.endsWith("/pdf")?"application/pdf":"application/json";
    if(!Number.isSafeInteger(input.size) || input.size<1 || input.size>max || !/^[a-f0-9]{64}$/.test(input.hash) || input.type!==type) throw new AppError("Arquivo invalido ou maior que o limite.",413);
    const pending=await db.prepare("SELECT user_id,metadata FROM transfers").all();
    if(pending.filter(row=>row.user_id===user.id).length>=2 || pending.reduce((sum,row)=>sum+JSON.parse(row.metadata).size,0)+input.size>180*CHUNK_SIZE) throw new AppError("Ha outros envios em andamento. Aguarde ou tente novamente em 30 minutos.",429);
    const metadata={route:input.route,method:input.method,type,size:input.size,hash:input.hash,revision:String(input.revision||"").slice(0,12)};
    const id=randomUUID();
    await db.prepare("INSERT INTO transfers (id,user_id,metadata,expires) VALUES (?,?,?,?)").run(id,user.id,JSON.stringify(metadata),Date.now()+1800000);
    return send(res,201,{id,chunkSize:CHUNK_SIZE});
  }
  const match=url.pathname.match(/^\/api\/transfers\/([a-f0-9-]{36})(?:\/(complete|parts\/(\d+)))?$/);
  if(!match) throw new AppError("Envio nao encontrado.",404);
  const [,id,action,index]=match;
  const row=await db.prepare("SELECT * FROM transfers WHERE id=? AND user_id=?").get(id,user.id);
  if(!row) throw new AppError("Envio expirado ou nao encontrado.",404);
  const metadata=JSON.parse(row.metadata);
  transferLimit(metadata.route,metadata.method,user);
  if(!action && req.method==="DELETE") {
    await db.prepare("DELETE FROM transfers WHERE id=?").run(id);
    return send(res,200,{ok:true});
  }
  if(index!==undefined && req.method==="PUT") {
    const part=Number(index),total=Math.ceil(metadata.size/CHUNK_SIZE);
    if(!Number.isSafeInteger(part) || part>=total) throw new AppError("Parte de arquivo invalida.");
    const input=await body(req,Math.ceil(CHUNK_SIZE*1.34)+256);
    if(typeof input.data!=="string") throw new AppError("Parte de arquivo invalida.");
    const data=Buffer.from(input.data,"base64");
    if(data.toString("base64")!==input.data || data.length!==Math.min(CHUNK_SIZE,metadata.size-part*CHUNK_SIZE)) throw new AppError("Parte de arquivo incompleta.");
    await db.prepare("INSERT INTO transfer_parts (transfer_id,part,data) VALUES (?,?,?) ON CONFLICT(transfer_id,part) DO UPDATE SET data=excluded.data").run(id,part,data);
    return send(res,200,{ok:true});
  }
  if(action==="complete" && req.method==="POST") {
    const parts=await db.prepare("SELECT part,data FROM transfer_parts WHERE transfer_id=? ORDER BY part").all(id);
    if(parts.length!==Math.ceil(metadata.size/CHUNK_SIZE)) throw new AppError("O envio ainda esta incompleto.",409);
    const data=Buffer.concat(parts.map(part=>Buffer.from(part.data)));
    if(data.length!==metadata.size || hash(data)!==metadata.hash) throw new AppError("A integridade do arquivo nao confere.");
    const forwarded={method:metadata.method,socket:req.socket,_transferBody:data,headers:{...req.headers,"content-type":metadata.type,"content-length":String(data.length),"x-vs-revision":metadata.revision}};
    await dispatch(forwarded,res,new URL(metadata.route,url.origin));
    await db.prepare("DELETE FROM transfers WHERE id=?").run(id);
    return;
  }
  throw new AppError("Metodo de envio nao permitido.",405);
}

module.exports={transfer};
