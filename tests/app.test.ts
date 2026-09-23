import {describe,it,expect} from 'bun:test';
import {app} from '../src/server';
import {pages,plans} from '../src/data';
const contact=(body:unknown,headers:Record<string,string>={})=>app.request('http://localhost/api/contact',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
const valid={name:'Тестовый посетитель',phone:'+7 000 000-00-00',consent:true,page:'/',request:'Квартира 42,73 м²',attribution:{utm_campaign:'тест & лето'}};
describe('Самостоятельные входные страницы',()=>{
 for(const page of pages)it(`${page.path} имеет собственный HTML, навигацию и планы`,async()=>{
  const response=await app.request(page.path);const html=await response.text();expect(response.status).toBe(200);
  expect(html).toContain('<html lang="ru"');expect(html).toContain('id="hero-title"');expect(html).toContain('id="plans"');expect(html).toContain('id="visit"');
  for(const destination of pages)expect(html).toContain(`href="${destination.path}"`);
  expect(html).toContain('/assets/client.js');expect(html).toContain('/assets/client.css');
 });
 it('несуществующий маршрут возвращает 404',async()=>expect((await app.request('/not-a-page')).status).toBe(404));
 it('нормализация слеша сохраняет рекламу',async()=>{const r=await app.request('/mansardy/?utm_source=test');expect(r.status).toBe(308);expect(r.headers.get('location')).toBe('/mansardy?utm_source=test');});
 it('все квартирные планы доступны',async()=>{for(const plan of plans){const r=await app.request(plan.src);expect(r.status).toBe(200);expect(r.headers.get('content-type')).toContain('image/');}});
 it('каталог соответствует всем 21 типам из квартирографии',()=>{
  expect(plans.map(({id,category,area})=>({id,category,area}))).toEqual([
   {id:'b37-t03-42-73',category:'1k',area:'42,73'},
   {id:'b37-t09-42-73',category:'1k',area:'42,73'},
   {id:'b4-t07-50-42',category:'1k',area:'50,42'},
   {id:'b4-t06-51-92',category:'1k',area:'51,92'},
   {id:'b4-t05-52-37',category:'1k',area:'52,37'},
   {id:'b4-t03-56-32',category:'1k',area:'56,32'},
   {id:'b37-t05-55-3',category:'e2',area:'55,3'},
   {id:'b37-t06-59-4',category:'e2',area:'59,4'},
   {id:'b37-t07-55-3',category:'e2',area:'55,3'},
   {id:'b37-t12-55-3',category:'e2',area:'55,3'},
   {id:'b37-t13-59-4',category:'e2',area:'59,4'},
   {id:'b37-t14-55-3',category:'e2',area:'55,3'},
   {id:'b37-t02-66-16',category:'2k',area:'66,16'},
   {id:'b37-t10-66-16',category:'2k',area:'66,16'},
   {id:'b4-t01-84-92',category:'2k',area:'84,92'},
   {id:'b37-t01-85-75',category:'2k',area:'85,75'},
   {id:'b37-t11-85-75',category:'2k',area:'85,75'},
   {id:'b4-t04-86-09',category:'2k',area:'86,09'},
   {id:'b37-t04-109-75',category:'3k',area:'109,75'},
   {id:'b37-t08-109-75',category:'3k',area:'109,75'},
   {id:'b4-t02-139-58',category:'3k',area:'139,58'},
  ]);
  expect(new Set(plans.map(plan=>plan.id)).size).toBe(21);
  for(const plan of plans)expect(plan.variant).toMatch(/^Блок/);
 });
});
describe('Видео и перемотка',()=>{
 it('отдаёт правильный byte range',async()=>{const r=await app.request('/video/quarter-overview.mp4',{headers:{range:'bytes=0-511'}});expect(r.status).toBe(206);expect(r.headers.get('content-range')).toMatch(/^bytes 0-511\//);expect((await r.arrayBuffer()).byteLength).toBe(512);});
 it('отдаёт последние байты',async()=>{const r=await app.request('/video/quarter-overview.mp4',{headers:{range:'bytes=-32'}});expect(r.status).toBe(206);expect((await r.arrayBuffer()).byteLength).toBe(32);});
 it('отклоняет диапазон за концом файла',async()=>expect((await app.request('/video/quarter-overview.mp4',{headers:{range:'bytes=999999999999-'}})).status).toBe(416));
 it('не отдаёт произвольные файлы',async()=>expect((await app.request('/video/server.tsx')).status).toBe(404));
});
describe('Подготовка обращения без внешней отправки',()=>{
 it('сохраняет выбор и источник в проверяемом черновике',async()=>{const r=await contact(valid);const d=await r.json();expect(r.status).toBe(200);expect(d.status).toBe('draft');expect(d.message).toContain('42,73 м²');expect(d.message).toContain('тест & лето');expect(new URL(d.url).searchParams.get('text')).toBe(d.message);expect(new URL(d.url).hostname).toBe('wa.me');expect(r.headers.get('cache-control')).toBe('no-store');});
 it('не принимает форму без согласия',async()=>expect((await contact({...valid,consent:false})).status).toBe(400));
 it('проверяет номер на сервере',async()=>expect((await contact({...valid,phone:'123'})).status).toBe(400));
 it('отклоняет посторонний origin',async()=>expect((await contact(valid,{origin:'https://example.org'})).status).toBe(403));
 it('не принимает неверный маршрут',async()=>expect((await contact({...valid,page:'/fake'})).status).toBe(400));
 it('не принимает null вместо объекта',async()=>expect((await contact(null)).status).toBe(400));
 it('ограничивает размер тела',async()=>expect((await contact({...valid,name:'x'.repeat(9000)})).status).toBe(413));
});
