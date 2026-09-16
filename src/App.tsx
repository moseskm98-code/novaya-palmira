import React, { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowRight, ArrowLeft, Play, X, List, Plus, MapPin, Phone, MagnifyingGlassPlus, Check } from '@phosphor-icons/react';
import { pages, findPage, plans, categories, faqs, address, phone, type Plan, type Category } from './data';

type ModalKind = 'video'|'plan'|'quarter'|'faq'|'privacy'|'draft'|null;
type Draft = {url:string;message:string};

function Brand({compact=false}:{compact?:boolean}) {
  return <a className={`brand ${compact?'brand-small':''}`} href="/" aria-label="Новая Пальмира — главная"><img src="/brand/palmira-mark-gold.png" width="62" height="58" alt=""/><span><strong>Новая Пальмира</strong><small>Жилой квартал</small></span></a>;
}
function DeveloperBrand(){return <a className="developer-brand" href="/zastroishchik" aria-label="Застройщик Мегаполис Групп"><img src="/brand/megapolis-logo.png" width="112" height="70" alt="Мегаполис Групп"/></a>;}

function Dialog({title,onClose,children,wide=false}:{title:string;onClose:()=>void;children:ReactNode;wide?:boolean}) {
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{
    const el=ref.current; const previous=document.activeElement as HTMLElement|null;
    const old=document.body.style.overflow; document.body.style.overflow='hidden'; el?.showModal();
    return ()=>{el?.close();document.body.style.overflow=old;previous?.focus();};
  },[]);
  return <dialog ref={ref} className={`dialog ${wide?'dialog-wide':''}`} aria-labelledby="dialog-title" onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
    <div className="dialog-inner"><div className="dialog-heading"><h2 id="dialog-title">{title}</h2><button className="icon-button" onClick={onClose} aria-label="Закрыть окно"><X size={24}/></button></div>{children}</div>
  </dialog>;
}

export function App({path}:{path:string}) {
  const page=findPage(path);
  const [menu,setMenu]=useState(false);
  const [modal,setModal]=useState<ModalKind>(null);
  const [category,setCategory]=useState<Category>('1k');
  const [planId,setPlanId]=useState('42-73');
  const [request,setRequest]=useState('');
  const [status,setStatus]=useState<'idle'|'loading'|'error'>('idle');
  const [error,setError]=useState('');
  const [draft,setDraft]=useState<Draft|null>(null);
  const [videoError,setVideoError]=useState(false);
  const videoRef=useRef<HTMLVideoElement>(null);
  const formRef=useRef<HTMLFormElement>(null);
  const [attribution,setAttribution]=useState<Record<string,string>>({});
  useEffect(()=>{
    const query=new URLSearchParams(location.search); const values:Record<string,string>={};
    for(const key of ['utm_source','utm_medium','utm_campaign','utm_content','utm_term']) { const value=query.get(key); if(value)values[key]=value.slice(0,200); }
    try { if(Object.keys(values).length)sessionStorage.setItem('palmira-source',JSON.stringify(values)); else Object.assign(values,JSON.parse(sessionStorage.getItem('palmira-source')||'{}')); }catch{}
    setAttribution(values);
  },[]);
  useEffect(()=>{if(modal==='video'){setVideoError(false);void videoRef.current?.play().catch(()=>{});}},[modal]);
  if(!page) return <main className="not-found"><Brand/><h1>Такой страницы нет</h1><p>Продолжите знакомство с Новой Пальмирой.</p><a className="button" href="/">На главную <ArrowRight/></a></main>;
  const home=page.key==='home';
  const special=page.key==='mansards'||page.key==='commercial';
  const selection=plans.filter(p=>p.category===category);
  const plan=selection.find(p=>p.id===planId)||selection[0];
  const planIndex=selection.findIndex(p=>p.id===plan.id);
  const requestText=page.key==='commercial'?'Подбор коммерческого помещения':page.key==='mansards'?'Подбор мансарды':'';
  const chooseCategory=(key:Category)=>{setCategory(key);setPlanId(plans.find(p=>p.category===key)!.id);};
  const selectPlan=(offset:number)=>setPlanId(selection[(planIndex+offset+selection.length)%selection.length].id);
  const startRequest=(text:string)=>{setRequest(text);setModal(null);setMenu(false);setStatus('idle');setError('');setTimeout(()=>{document.getElementById('visit')?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});formRef.current?.querySelector<HTMLInputElement>('input[name=name]')?.focus({preventScroll:true});},40);};
  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault(); if(status==='loading')return;
    const form=e.currentTarget; const data=new FormData(form);setStatus('loading');setError('');
    try {
      const response=await fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:data.get('name'),phone:data.get('phone'),consent:data.get('consent')==='on',company:data.get('company'),request:request||requestText||'Просмотр квартала',page:page!.path,attribution})});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||'Не удалось подготовить обращение. Попробуйте ещё раз или позвоните в офис.');
      setDraft(result);setStatus('idle');setModal('draft');
    }catch(err){setStatus('error');setError(err instanceof Error?err.message:'Не удалось подготовить обращение.');}
  }
  return <>
    <a className="skip-link" href="#main">Перейти к содержимому</a>
    <header className="header"><div className="header-inner"><Brand/><nav className="desktop-nav" aria-label="Основная навигация">{pages.map(p=><a key={p.key} href={p.path} aria-current={p.key===page.key?'page':undefined}>{p.nav}</a>)}</nav><DeveloperBrand/><button className="menu-button icon-button" aria-label={menu?'Закрыть меню':'Открыть меню'} aria-expanded={menu} aria-controls="mobile-menu" onClick={()=>setMenu(!menu)}>{menu?<X size={26}/>:<List size={26}/>}</button></div>
      {menu&&<nav id="mobile-menu" className="mobile-nav" aria-label="Мобильная навигация">{pages.map(p=><a key={p.key} href={p.path} aria-current={p.key===page.key?'page':undefined}>{p.nav}<ArrowRight size={18}/></a>)}<a href="#plans" onClick={()=>setMenu(false)}>Планировки<ArrowRight size={18}/></a><a href={phone.href}>{phone.label}<Phone size={18}/></a></nav>}
    </header>
    <main id="main">
      <section className={`hero ${home?'hero-home':'hero-detail'}`} aria-labelledby="hero-title">
        <img className="hero-image" src={page.image} alt={page.imageAlt} fetchPriority="high"/>
        <div className="hero-content"><p className="eyebrow">{page.eyebrow}</p><h1 id="hero-title">{page.title}</h1><p className="hero-lead">{page.lead}</p><div className="hero-actions">{special?<button className="button" onClick={()=>startRequest(requestText)}>{page.cta}<ArrowRight size={19}/></button>:<a className="button" href="#plans">{page.cta}<ArrowRight size={19}/></a>}<button className="video-link" onClick={()=>setModal('video')}><span className="play-outline"><Play size={14} weight="fill"/></span>{page.key==='management'?'Смотреть работу УК':page.key==='developer'?'Смотреть строительство':page.key==='commercial'?'Смотреть окружение':'Смотреть квартал'}</button></div></div>
        {home&&<p className="hero-aside">Современный квартал<br/>с продуманной средой,<br/>где есть всё для комфортной<br/>жизни в Махачкале.</p>}
        <p className="hero-caption">{page.caption}</p>
        {(home||page.key==='mansards')&&<span className="visualization-label">Визуализация</span>}
      </section>
      <section className="video-section section-shell" aria-labelledby="video-title">
        <button className="video-preview" onClick={()=>setModal('video')} aria-label={`Смотреть видео: ${page.videoTitle.replace('\n',' ')}`}><img src={page.poster} alt={page.key==='commercial'?'Инфраструктура квартала':'Реальная фотография Новой Пальмиры'} loading="lazy"/><span className="play-large"><Play size={38} weight="fill"/></span><span className="video-preview-caption">{page.key==='mansards'?'Обзор квартала':'Новая Пальмира · Видео'}</span></button>
        <div className="video-story"><h2 id="video-title">{page.videoTitle}</h2><p>{page.videoText}</p><span className="small-rule"/><button className="text-link" onClick={()=>setModal('video')}>Смотреть видео<ArrowRight size={19}/></button></div>
      </section>
      {page.points.length>0&&<section className="theme-points section-shell" aria-label="Особенности">{page.points.map((point,i)=><article key={point.title}><span className="eyebrow">0{i+1}</span><h3>{point.title}</h3><p>{point.text}</p></article>)}</section>}
      {special&&<section className="special-request section-shell" aria-label="Специализированная подборка"><div><p className="eyebrow">{page.nav} · Индивидуальный подбор</p><h2>{page.key==='mansards'?'Найдём вашу мансарду':'Помещение под вашу задачу'}</h2><p>{page.key==='mansards'?'Запросите доступные мансарды и их планы. Ниже — отдельный каталог обычных квартир для знакомства с кварталом.':'Запросите планы коммерческих помещений с нужной площадью и параметрами. Ниже — отдельный каталог жилых квартир квартала.'}</p></div><button className="button" onClick={()=>startRequest(requestText)}>Получить подборку<ArrowRight size={18}/></button></section>}
      <section id="plans" className="plans section-shell" aria-labelledby="plans-title">
        <div className="section-heading"><h2 id="plans-title">{special?'Квартиры в квартале':'Планировка под ваш ритм'}</h2><span/><p>{special?'Общий каталог жилых квартир. Не является подборкой мансард или коммерческих помещений.':'Продуманные планировки для разных жизненных сценариев — от первого собственного жилья до семейного комфорта.'}</p></div>
        <div className="plan-tabs" role="tablist" aria-label="Количество комнат">{categories.map((c,i)=><button key={c.key} role="tab" id={`tab-${c.key}`} aria-selected={category===c.key} aria-controls="plan-panel" tabIndex={category===c.key?0:-1} onClick={()=>chooseCategory(c.key)} onKeyDown={e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();const next=categories[(i+(e.key==='ArrowRight'?1:-1)+categories.length)%categories.length];chooseCategory(next.key);document.getElementById(`tab-${next.key}`)?.focus();}}}>{c.label}</button>)}</div>
        <div className="plan-layout" role="tabpanel" id="plan-panel" aria-labelledby={`tab-${category}`}>
          <div className="plan-visual"><button className="plan-image-button" onClick={()=>setModal('plan')} aria-label={`Увеличить планировку ${plan.area} м²`}><img src={plan.src} alt={`План: ${plan.title}, ${plan.area} м²`} loading="lazy"/><span className="zoom-hint"><MagnifyingGlassPlus size={18}/>Увеличить</span></button></div>
          <div className="plan-info" aria-live="polite"><h3>{plan.title}</h3><div className="plan-area">{plan.area}<span>м²</span></div><p>{plan.description}</p><button className="button" onClick={()=>startRequest(`${plan.title}, ${plan.area} м²`)}>Узнать условия<ArrowRight size={18}/></button><div className="plan-pagination"><button className="icon-button" onClick={()=>selectPlan(-1)} aria-label="Предыдущая планировка"><ArrowLeft size={20}/></button><span>{String(planIndex+1).padStart(2,'0')}<small> / {String(selection.length).padStart(2,'0')}</small></span><button className="icon-button" onClick={()=>selectPlan(1)} aria-label="Следующая планировка"><ArrowRight size={20}/></button></div></div>
        </div>
      </section>
      <section className="trust section-shell" aria-label="О проекте"><article><h3>О квартале</h3><p>Новая Пальмира — жилой квартал в Махачкале с благоустроенной территорией и повседневными сервисами рядом.</p><button className="text-link" onClick={()=>setModal('quarter')}>Узнать больше<ArrowRight size={18}/></button></article><article><h3>Кто строит</h3><p>Проект реализует Мегаполис Групп. Познакомьтесь с готовыми домами и подходом компании к строительству.</p><a className="text-link" href="/zastroishchik">О компании<ArrowRight size={18}/></a></article><article><h3>Кто заботится о доме</h3><p>Управляющая компания Мегаполис Комфорт занимается общими пространствами, территорией и обслуживанием домов.</p><a className="text-link" href="/upravlyayushchaya-kompaniya">Подробнее<ArrowRight size={18}/></a></article></section>
      <div className="essential-links section-shell"><button onClick={()=>setModal('quarter')}><MapPin size={18}/>Расположение и схема квартала</button><button onClick={()=>setModal('faq')}>Условия и вопросы о покупке<Plus size={18}/></button><a href={phone.href}><Phone size={18}/>{phone.label}</a></div>
      <section id="visit" className="visit" aria-labelledby="visit-title"><div className="visit-inner section-shell"><div><h2 id="visit-title">{page.formTitle}</h2><p>Познакомьтесь с кварталом, посмотрите помещения<br className="desktop-break"/> и задайте вопросы команде.</p>{request&&<p className="selected-request"><Check size={16}/>Ваш выбор: {request}<button onClick={()=>setRequest('')} aria-label="Сбросить выбранное предложение"><X size={15}/></button></p>}</div><form ref={formRef} onSubmit={submit}><div className="form-fields"><label><span className="sr-only">Ваше имя</span><input name="name" autoComplete="given-name" placeholder="Ваше имя" required minLength={2} maxLength={80}/></label><label><span className="sr-only">Телефон</span><input name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="Телефон" required minLength={10} maxLength={25}/></label></div><label className="honeypot" aria-hidden="true">Компания<input name="company" tabIndex={-1} autoComplete="off"/></label><button className="button submit-button" type="submit" disabled={status==='loading'}>{status==='loading'?'Подготавливаем обращение…':'Записаться на просмотр'}<ArrowRight size={18}/></button><label className="consent"><input type="checkbox" name="consent" required/><span>Согласен на использование данных для обращения. <button type="button" onClick={()=>setModal('privacy')}>Подробнее</button></span></label><p className="form-note">Подтверждение обращения — следующим шагом в WhatsApp.</p>{error&&<p className="form-error" role="alert">{error}</p>}</form></div></section>
    </main>
    <footer className="footer section-shell"><div className="footer-brands"><Brand compact/><DeveloperBrand/></div><div className="footer-address"><p>{address}</p><a href={phone.href}>{phone.label}</a><button className="text-link" onClick={()=>setModal('privacy')}>Об использовании данных</button></div><p className="footer-tagline">Жилая среда для<br/>больших историй</p></footer>
    <div className="mobile-action"><a href="#plans">Планировки</a><button onClick={()=>startRequest(requestText)}>Записаться на просмотр<ArrowRight size={17}/></button></div>
    {modal&&<Dialog title={modal==='video'?page.videoTitle.replace('\n',' '):modal==='plan'?`${plan.title} · ${plan.area} м²`:modal==='quarter'?'Квартал, который можно увидеть':modal==='faq'?'Вопросы о покупке':modal==='privacy'?'Как используются данные':'Подтвердите обращение'} wide={modal==='video'||modal==='plan'||modal==='quarter'} onClose={()=>setModal(null)}>
      {modal==='video'&&<><video ref={videoRef} className="dialog-video" src={page.video} poster={page.poster} controls playsInline preload="metadata" onError={()=>setVideoError(true)}/>{videoError&&<p role="alert">Не удалось воспроизвести видео. <a href={page.video} target="_blank" rel="noreferrer">Открыть ролик отдельно</a></p>}<p className="dialog-note">{page.key==='mansards'?'Обзор квартала. Видео конкретной мансарды запрашивается отдельно.':page.videoText}</p></>}
      {modal==='plan'&&<><img className="dialog-plan" src={plan.src} alt={`Оригинальная планировка ${plan.area} м²`}/><div className="dialog-actions"><a className="text-link" href={plan.src} download={`Новая-Пальмира-${plan.area}.webp`}>Скачать планировку<ArrowRight size={18}/></a><button className="button" onClick={()=>startRequest(`${plan.title}, ${plan.area} м²`)}>Узнать условия<ArrowRight size={18}/></button></div></>}
      {modal==='quarter'&&<><p>Новая Пальмира — дома, дворы и привычные дела рядом. Начните знакомство с прогулки по кварталу.</p><img className="quarter-photo" src="/images/courtyard.jpg" alt="Реальный двор жилого квартала"/><div className="quarter-details"><div><h3>Приезжайте познакомиться</h3><p>{address}</p><a className="text-link" href={`https://yandex.ru/maps/?text=${encodeURIComponent(address+' Новая Пальмира')}`} target="_blank" rel="noreferrer">Открыть карту<ArrowRight size={18}/></a></div><div><h3>Всё необходимое рядом</h3><p>Прогулочные пространства, магазины и сервисы на первых этажах, общие зоны и управляющая компания.</p></div></div><details><summary>Посмотреть схему квартала</summary><img className="quarter-scheme" src="/images/scheme.jpg" alt="Схема корпусов Новой Пальмиры"/><p className="dialog-note">Схема из материалов проекта. Актуальное наличие и сроки уточняйте в офисе продаж.</p></details><button className="button" onClick={()=>startRequest('Личный просмотр квартала')}>Договориться о просмотре<ArrowRight size={18}/></button></>}
      {modal==='faq'&&<div className="faq-list">{faqs.map(([question,answer])=><details key={question}><summary>{question}<Plus size={20}/></summary><p>{answer}</p></details>)}<button className="button" onClick={()=>startRequest('Консультация по условиям покупки')}>Задать свой вопрос<ArrowRight size={18}/></button></div>}
      {modal==='privacy'&&<div className="privacy-copy"><p>Имя, телефон и выбранное предложение используются для подготовки вашего обращения. На сервере сайта они не сохраняются и в отдел продаж автоматически не отправляются.</p><p>После подготовки вы можете открыть WhatsApp, проверить текст и самостоятельно отправить сообщение. До этого момента запись на просмотр не подтверждена.</p><p>Метки рекламного перехода могут включаться в текст обращения, чтобы команда понимала, какое предложение вас заинтересовало. Их можно удалить перед отправкой.</p><p>Вы также можете связаться с офисом напрямую: <a href={phone.href}>{phone.label}</a>.</p></div>}
      {modal==='draft'&&draft&&<div className="draft-content"><p>Обращение подготовлено, но ещё не отправлено. Проверьте текст, откройте WhatsApp и отправьте сообщение команде.</p><div className="message-preview">{draft.message}</div><a className="button" href={draft.url} target="_blank" rel="noreferrer">Открыть WhatsApp<ArrowRight size={18}/></a><a className="text-link" href={phone.href}>Или позвонить {phone.label}<Phone size={18}/></a><p className="dialog-note">Время просмотра согласует менеджер после получения вашего сообщения.</p></div>}
    </Dialog>}
  </>;
}
