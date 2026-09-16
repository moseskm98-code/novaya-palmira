import React from 'react';
import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';
import { secureHeaders } from 'hono/secure-headers';
import { bodyLimit } from 'hono/body-limit';
import { renderToString } from 'react-dom/server';
import { App } from './App';
import { findPage, pages, phone } from './data';

const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export const app=new Hono();
app.use('*',secureHeaders());
app.get('/health',c=>c.json({status:'ok',runtime:'bun',framework:'hono',ui:'react'}));
app.use('/assets/*',serveStatic({root:'./dist'}));
for(const path of ['/images/*','/brand/*','/fonts/*','/floorplans/*'])app.use(path,serveStatic({root:'./public'}));
app.get('/video/:file',async c=>{
  const name=c.req.param('file');
  if(!['quarter-overview.mp4','comfort-service.mp4','construction.mp4','infrastructure.mp4'].includes(name))return c.notFound();
  const file=Bun.file(`./public/video/${name}`); const size=file.size; const range=c.req.header('range');
  if(range){
    const match=/^bytes=(\d*)-(\d*)$/.exec(range);
    if(!match||(!match[1]&&!match[2]))return new Response(null,{status:416,headers:{'Content-Range':`bytes */${size}`}});
    const start=match[1]?Number(match[1]):Math.max(0,size-Number(match[2]));
    const end=match[1]?(match[2]?Math.min(Number(match[2]),size-1):size-1):size-1;
    if(start> end||start>=size)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${size}`}});
    return new Response(file.slice(start,end+1),{status:206,headers:{'Content-Type':'video/mp4','Content-Range':`bytes ${start}-${end}/${size}`,'Accept-Ranges':'bytes','Content-Length':String(end-start+1)}});
  }
  return new Response(file,{headers:{'Content-Type':'video/mp4','Accept-Ranges':'bytes','Content-Length':String(size)}});
});
app.post('/api/contact',bodyLimit({maxSize:8192,onError:c=>c.json({error:'Слишком большой запрос.'},413)}),async c=>{
  const origin=c.req.header('origin');if(origin&&origin!==new URL(c.req.url).origin)return c.json({error:'Недопустимый источник запроса.'},403);
  let data:Record<string,unknown>;try{data=await c.req.json();}catch{return c.json({error:'Не удалось прочитать данные.'},400);}
  if(!data||typeof data!=='object'||Array.isArray(data))return c.json({error:'Некорректные данные.'},400);
  if(data.company)return c.json({error:'Не удалось подготовить обращение.'},400);
  const name=typeof data.name==='string'?data.name.trim():'';
  const tel=typeof data.phone==='string'?data.phone.trim():'';
  const digits=tel.replace(/\D/g,'');
  if(name.length<2||name.length>80)return c.json({error:'Укажите имя: от 2 до 80 символов.'},400);
  if(!/^[+\d ()-]+$/.test(tel)||digits.length<10||digits.length>15)return c.json({error:'Проверьте номер телефона.'},400);
  if(data.consent!==true)return c.json({error:'Подтвердите согласие на использование данных для обращения.'},400);
  const page=typeof data.page==='string'?findPage(data.page):undefined;
  if(!page)return c.json({error:'Укажите страницу предложения.'},400);
  const request=typeof data.request==='string'?data.request.slice(0,200).replace(/[\r\n]/g,' '):'Просмотр квартала';
  let message=`Здравствуйте! Меня зовут ${name.replace(/[\r\n]/g,' ')}. Интересует: ${request}.\nТелефон: ${tel}.\nСтраница: ${page.nav}.\nХочу согласовать просмотр и уточнить условия.`;
  const tags=data.attribution;
  if(tags&&typeof tags==='object'&&!Array.isArray(tags)){
    const source=Object.entries(tags).filter(([key,value])=>/^utm_(source|medium|campaign|content|term)$/.test(key)&&typeof value==='string').map(([key,value])=>`${key}: ${String(value).slice(0,200).replace(/[\r\n]/g,' ')}`).join('; ');
    if(source)message+=`\nИсточник: ${source}`;
  }
  c.header('Cache-Control','no-store');
  return c.json({status:'draft',message,url:`https://wa.me/${phone.whatsapp}?text=${encodeURIComponent(message)}`});
});
function html(path:string){
  const page=findPage(path);const title=page?`${page.key==='home'?'Новая Пальмира — квартиры в Махачкале':page.nav+' — Новая Пальмира'}`:'Страница не найдена — Новая Пальмира';
  const body=renderToString(<App path={path}/>);
  return `<!doctype html><html lang="ru"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><meta name="theme-color" content="#faf8f3"/><title>${escape(title)}</title><meta name="description" content="${escape(page?.lead.replace(/\n/g,' ')||'Жилой квартал Новая Пальмира')}"/><link rel="icon" href="/brand/palmira-mark-gold.png"/><link rel="preload" href="/fonts/Arsenal-Regular.ttf" as="font" type="font/ttf" crossorigin/><link rel="preload" href="/fonts/Montserrat-Regular.ttf" as="font" type="font/ttf" crossorigin/><link rel="stylesheet" href="/assets/client.css"/></head><body><div id="root">${body}</div><script type="module" src="/assets/client.js"></script></body></html>`;
}
for(const page of pages)app.get(page.path,c=>c.html(html(page.path)));
app.get('*',c=>{
  const clean=c.req.path.replace(/\/$/,'');
  if(clean&&findPage(clean))return c.redirect(clean+new URL(c.req.url).search,308);
  return c.html(html('/404'),404);
});
if(import.meta.main){
  const args=Bun.argv;const portArg=args.indexOf('--port');
  const port=Number(portArg>=0?args[portArg+1]:process.env.PORT||3002);
  Bun.serve({port,hostname:process.env.HOST||'127.0.0.1',fetch:app.fetch});
  console.log(`Новая Пальмира · Hono + Bun + React · http://localhost:${port}`);
}
