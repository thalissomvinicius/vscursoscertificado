"use strict";

const { createApplication } = require("../server");
let application;
module.exports = async (req,res) => {
  if(!process.env.VS_DATABASE_URL) {
    res.writeHead(503,{"Content-Type":"application/json","Cache-Control":"no-store"});
    res.end(JSON.stringify({error:"Banco online ainda nao configurado."}));
    return;
  }
  application ||= createApplication({secureCookie:true});
  await application.handler(req,res);
};
