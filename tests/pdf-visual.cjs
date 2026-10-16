"use strict";
const fs=require("node:fs/promises");
const path=require("node:path");
const assert=require("node:assert/strict");
const {createCanvas}=require("@napi-rs/canvas");
const sharp=require("sharp");

(async()=>{
  const {getDocument}=await import(require("node:url").pathToFileURL(require.resolve("pdfjs-dist/legacy/build/pdf.mjs")).href);
  const directory=path.join(__dirname,"..","test-results");
  const document=await getDocument({data:new Uint8Array(await fs.readFile(path.join(directory,"certificate.pdf")))}).promise;
  assert.equal(document.numPages,2);
  const results=[];
  for(let number=1;number<=2;number++){
    const name=number===1?"front":"back";const page=await document.getPage(number);const base=page.getViewport({scale:1});const viewport=page.getViewport({scale:2244/base.width});
    const canvas=createCanvas(Math.round(viewport.width),Math.round(viewport.height));await page.render({canvasContext:canvas.getContext("2d"),viewport}).promise;
    const rendered=canvas.toBuffer("image/png");await fs.writeFile(path.join(directory,`pdf-${name}.png`),rendered);
    const image=await sharp(rendered).resize(1122,794,{fit:"fill"}).removeAlpha().raw().toBuffer();const expected=await sharp(path.join(directory,`export-${name}.png`)).resize(1122,794,{fit:"fill"}).removeAlpha().raw().toBuffer();
    let difference=0,dark=0;
    for(let i=0;i<image.length;i++){difference+=Math.abs(image[i]-expected[i]);if(image[i]<180)dark++;}
    const averageDifference=difference/image.length;const darkRatio=dark/image.length;
    assert.ok(darkRatio>0.01,`Página ${number} em branco`);assert.ok(averageDifference<5,`A página ${number} difere da prévia: ${averageDifference}`);
    results.push({page:number,width:canvas.width,height:canvas.height,meanPixelDifference:Number(averageDifference.toFixed(3)),darkRatio:Number(darkRatio.toFixed(3))});
  }
  await document.destroy();console.log(JSON.stringify({result:"PASS",pages:results},null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
