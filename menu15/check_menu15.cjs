/* End-to-end checks for the real, fully inlined AppSchooling 1.5 entry point.
   Native APIs are fixtures; this suite does not send remote notifications. */
'use strict';
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert');
const {chromium}=require('playwright');
const args=process.argv.slice(2),arg=(name,fallback)=>{const i=args.indexOf(name);return i<0?fallback:args[i+1]};
const project=path.resolve(arg('--project','/workspace/manzanin-notificaciones/AppSchooling_AndroidStudio_1_5'));
const out=path.resolve(arg('--out','/workspace/qa/menu15-verified'));
const root=path.join(project,'app/src/main/assets/www');fs.mkdirSync(out,{recursive:true});
const checks=[],screenshots=[],errors=[],failedRequests=[];
const report={version:'1.5.0',native_delivery:'Fixture only: no physical device or actual push delivery',checks,screenshots};
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.json':'application/json','.webmanifest':'application/manifest+json','.ttf':'font/ttf'};
const server=http.createServer((req,res)=>{
 let rel;try{rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch(_){res.writeHead(400).end();return}
 const file=path.resolve(root,'.'+(rel==='/'?'/index.html':rel));
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return}
 res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);
});
const fixture=()=>{
 if(!localStorage.getItem('appschooling_manzanin09')){
  const date=new Date().toISOString().slice(0,10),p={id:'menu15-existing-child',name:'Alex',age:9,avatar:'',manzaninPose:'lector',manzaninAccessory:'',manzaninAccessories:[],interests:['Naturaleza','Lectura'],approach:'Movimiento',goals:[{id:'g1',title:'Preparar mis materiales',cat:'aprendizaje'}],habits:['preparar','agua','movimiento','respirar'],habitsDone:{},water:{},gameBest:0,tasks:[{id:'t1',title:'Lectura libre',date,cat:'aprendizaje',done:false}],moods:[],goalDone:{}};
  localStorage.setItem('appschooling_manzanin09',JSON.stringify({profiles:[p],activeId:p.id,demo:false,settings:{reminders:false,study:'10:00',water:'12:00',rest:'17:00',notificationLog:{}},created:Date.now()}));
 }
 window.__nativeNoticeMarks=[];
 window.AppSchoolingNative={
  getNoticeStatus:()=>JSON.stringify({configured:true,permission:'granted',enabled:true,registration:'ready'}),
  getNotices:()=>JSON.stringify([]),markNoticeRead:id=>window.__nativeNoticeMarks.push(id),
  markAllNoticesRead:()=>{},openNoticeLink:()=>{},syncStudyReminders:()=>{},applyReminders:()=>{},
  requestNoticePermission:()=>{},openNoticeSettings:()=>{}
 };
};
const incoming={schemaVersion:1,id:'qa-menu15-notice',revision:1,category:'evaluaciones',title:'Evaluación de prueba local',body:'Este aviso existe solo en la prueba de navegador.',publishedAt:'2026-11-23T12:00:00Z',eventAt:null,expiresAt:null,url:null};
let browser;
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin=`http://127.0.0.1:${server.address().port}`;
 const executablePath=process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined);
 browser=await chromium.launch({...(executablePath?{executablePath}:{}),headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,reducedMotion:'no-preference',locale:'es-CL'});
 await context.addInitScript(fixture);
 const page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>failedRequests.push({url:r.url().replace(origin,''),error:r.failure()?.errorText}));
 const waitRoute=async(route)=>{await page.waitForFunction(x=>document.documentElement.dataset.appPage===x,route);await page.evaluate(()=>document.fonts.ready);await page.locator('.page-content').waitFor({state:'visible'});};
 const go=async(route,selector='.page-content')=>{await page.locator(`${selector} [data-action="go"][data-page="${route}"]`).first().click();await waitRoute(route==='habitos'||route==='estrategias'?'planner':route);};
 const home=async()=>{await page.locator('.menu15-nav [data-page="inicio"]').click();await waitRoute('inicio');};
 const shot=async(name,fullPage=false)=>{await page.screenshot({path:path.join(out,name),fullPage});screenshots.push(name);};
 const overflow=async()=>page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth}));
 const noOverflow=async(label)=>{const s=await overflow();assert(s.document<=s.viewport+1&&s.body<=s.viewport+1,`${label}: horizontal overflow ${JSON.stringify(s)}`);};
 const navClearance=async()=>{
  await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
  const r=await page.evaluate(()=>{const n=document.querySelector('.menu15-nav').getBoundingClientRect(),c=document.querySelector('.page-content');const boxes=[...c.querySelectorAll('button,a,input,select,textarea,h1,h2,h3,p')].filter(el=>el.getClientRects().length).map(el=>el.getBoundingClientRect());return {nav:n.toJSON(),contentBottom:Math.max(...boxes.map(x=>x.bottom)),height:innerHeight};});
  assert(r.nav.top>=0&&r.nav.bottom<=r.height+1,'bottom nav remains inside viewport');
  assert(r.contentBottom<=r.nav.top+2,'content can scroll fully above fixed navigation');
  await page.evaluate(()=>window.scrollTo(0,0));
 };
 await page.goto(origin,{waitUntil:'networkidle'});await waitRoute('inicio');
 assert.equal(await page.locator('.menu15-school-name').textContent(),'Colegio Virtual de Chile');
 assert.equal(await page.locator('.menu15-school-mark').count(),1);
 assert.equal(await page.locator('.menu15-bell[data-page="avisos"]').count(),1);
 const cards=page.locator('.menu15-grid .menu15-tile');assert.equal(await cards.count(),4);
 assert.deepEqual(await cards.evaluateAll(a=>a.map(x=>x.dataset.page)),['examenes','avisos','calma','recursos']);
 const texts=await cards.evaluateAll(a=>a.map(x=>x.getAttribute('aria-label')));
 assert.deepEqual(texts,['Exámenes Libres','Información y avisos','Bienestar familiar','Recursos de apoyo']);
 checks.push('Reference header and all four named menu destinations are present in the real entry point');
 const stateBefore=await page.evaluate(()=>JSON.parse(localStorage.getItem('appschooling_manzanin09')||'null'));
 // An existing profile proves that the new shell honors the previous storage key.
 await page.evaluate(()=>{const key='appschooling_manzanin09',s=JSON.parse(localStorage.getItem(key));s.demo=false;s.profiles[0].name='Julia';s.profiles[0].manzaninPose='explorador';localStorage.setItem(key,JSON.stringify(s));});
 await page.reload({waitUntil:'networkidle'});await waitRoute('inicio');
 for(const width of [320,390,768,1440]){
  await page.setViewportSize({width,height:width===320?640:width===1440?960:844});
  await page.evaluate(()=>window.scrollTo(0,0));await noOverflow(`home ${width}`);
  const b=await cards.evaluateAll(a=>a.map(x=>{const r=x.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}}));
  assert(Math.abs(b[0].y-b[1].y)<2&&b[1].x>b[0].x,'first card row has two columns');
  assert(Math.abs(b[2].y-b[3].y)<2&&b[2].y>b[0].y,'second card row has two columns');
  assert(b.every(x=>x.width>=120&&x.height>=120),'cards remain usable touch targets');
  if(width===390)await shot('menu15-home-390.png');
  if(width===1440)await shot('menu15-home-1440.png');
  await navClearance();
 }
 checks.push('Two-column menu fits 320, 390, 768 and 1440 pixels, with content clear of fixed navigation');
 await page.setViewportSize({width:390,height:844});
 const beforeBoxes=await cards.evaluateAll(a=>a.map(x=>{const r=x.getBoundingClientRect();return [r.x,r.y,r.width,r.height]}));
 await page.waitForTimeout(250);
 assert.deepEqual(await cards.evaluateAll(a=>a.map(x=>{const r=x.getBoundingClientRect();return [r.x,r.y,r.width,r.height]})),beforeBoxes);
 const headerMotion=await page.locator('.menu15-header').evaluate(el=>({name:getComputedStyle(el).animationName,duration:getComputedStyle(el).animationDuration,animations:el.getAnimations().map(a=>({state:a.playState,duration:a.effect.getTiming().duration}))}));
 assert.notEqual(headerMotion.name,'none','color movement is available');
 assert(headerMotion.animations.some(x=>x.state==='running'&&Number(x.duration)>=20000),'header uses a slow running color animation');
 report.header_motion=headerMotion;
 await page.emulateMedia({reducedMotion:'reduce'});
 assert.equal(await page.locator('.menu15-header').evaluate(el=>getComputedStyle(el).animationName),'none');
 await page.emulateMedia({reducedMotion:'no-preference'});
 checks.push('Cards remain stationary; header color moves slowly and respects reduced motion');
 const nav=page.locator('.menu15-nav .menu15-nav-button');assert.equal(await nav.count(),4);
 assert.deepEqual(await nav.evaluateAll(a=>a.map(x=>x.dataset.page)),['inicio','planner','habitos','ajustes']);
 assert((await nav.evaluateAll(a=>a.map(x=>({label:x.getAttribute('aria-label'),box:x.getBoundingClientRect().toJSON()})))).every(x=>x.label&&x.box.width>=44&&x.box.height>=44));
 checks.push('Four blue navigation controls have accessible names and usable tap targets');
 await go('examenes');assert(await page.locator('a[href*="mineduc"]').count()>0);await shot('menu15-examenes-390.png');await home();
 await go('avisos');await page.locator('.notice-status').waitFor();
 assert((await page.locator('.notice-status').textContent()).includes('Notificaciones activadas'));await shot('menu15-avisos-390.png');await home();
 await go('calma');await page.locator('#breath-orb').waitFor();await shot('menu15-bienestar-390.png');await home();
 await go('recursos');assert.equal(await page.locator('.menu15-resources').count(),1);
 for(const route of ['avatar','planner','estrategias','familia'])assert(await page.locator(`.menu15-resources [data-page="${route}"]`).count()>0,`resource ${route}`);
 await shot('menu15-recursos-390.png');
 checks.push('All four home cards open working sections, including official exam links, notice inbox and wellbeing');
 await go('planner','.menu15-resources');await page.locator('#focus-dial').waitFor();
 const dial=page.locator('.focus-dial-button');await dial.click();assert.equal(await dial.getAttribute('aria-pressed'),'true');await dial.click();assert.equal(await dial.getAttribute('aria-pressed'),'false');await shot('menu15-planner-390.png');
 await home();await go('recursos');await go('estrategias','.menu15-resources');
 assert.equal(await page.locator('[data-action="routineTab"][data-id="estrategias"]').getAttribute('aria-pressed'),'true');
 assert((await page.locator('.routine-content').textContent()).trim().length>100);
 await home();await go('recursos');await go('familia','.menu15-resources');assert((await page.locator('.page-content').textContent()).trim().length>100);
 checks.push('Resources retain the interactive Pomodoro, study strategies and family guidance');
 await home();await go('recursos');await go('avatar','.menu15-resources');
 const canvas=page.locator('#manzanin-showcase canvas');await canvas.waitFor();
 assert.equal(await canvas.getAttribute('data-character'),'explorador');assert.equal(await canvas.getAttribute('data-animate'),'true');
 await page.waitForTimeout(350);
 await page.evaluate(()=>{window.__qaCanvas=document.querySelector('#manzanin-showcase canvas');window.__qaProfileData=localStorage.getItem('appschooling_manzanin09');});
 await page.evaluate(n=>document.dispatchEvent(new CustomEvent('appschooling:notice',{detail:n})),incoming);
 assert.equal(await page.evaluate(()=>document.querySelector('#manzanin-showcase canvas')===window.__qaCanvas),true,'notice arrival preserves active canvas');
 assert.equal(await page.evaluate(()=>localStorage.getItem('appschooling_manzanin09')===window.__qaProfileData),true,'notice arrival preserves profile data');
 assert.equal(await page.evaluate(()=>window.AppSchoolingAvisos.unreadCount()),1);
 const visibleBadges=page.locator('[data-notice-count]:visible');assert(await visibleBadges.count()>0);assert.equal(await visibleBadges.first().textContent(),'1');
 await shot('menu15-manzanin-390.png');
 await page.evaluate(()=>document.dispatchEvent(new CustomEvent('appschooling:notice-open',{detail:{id:'qa-menu15-notice'}})));await waitRoute('avisos');
 assert((await page.locator('.notice-detail').textContent()).includes(incoming.body));
 assert.equal(await page.evaluate(()=>window.AppSchoolingAvisos.unreadCount()),0);assert.deepEqual(await page.evaluate(()=>window.__nativeNoticeMarks),['qa-menu15-notice']);
 await home();await go('recursos');await go('avatar','.menu15-resources');assert.equal(await canvas.getAttribute('data-character'),'explorador');
 await page.locator('[data-action="manzaninTab"][data-id="juegos"]').click();await page.locator('[data-action="selectGame"][data-id="saltos"]').click();await page.locator('#discovery-platformer').waitFor();
 assert.equal(await page.locator('#discovery-platformer').getAttribute('data-profile'),stateBefore.activeId);
 assert(await page.locator('.discovery-actor canvas').count()>0);await shot('menu15-juego-390.png');
 checks.push('Chosen Manzanín persists and remains animated; notice receipt preserves its canvas and profile; native tap opens and marks the notice read');
 checks.push('Original platform game loads from the Manzanín section with the active profile');
 for(const route of ['planner','habitos','ajustes']){await page.locator(`.menu15-nav [data-page="${route}"]`).click();await waitRoute(route==='habitos'?'planner':route);if(route==='habitos')assert.equal(await page.locator('[data-action="routineTab"][data-id="habitos"]').getAttribute('aria-pressed'),'true');}
 await page.reload({waitUntil:'networkidle'});await waitRoute('inicio');
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('appschooling_manzanin09')));assert.equal(saved.profiles[0].name,'Julia');assert.equal(saved.profiles[0].manzaninPose,'explorador');assert.equal(await page.evaluate(()=>window.AppSchoolingAvisos.unreadCount()),0);
 checks.push('Bottom navigation opens planner, habits and profiles; profile and notice read state survive reload');
 for(const size of [{width:320,height:568},{width:568,height:320},{width:390,height:844},{width:768,height:1024}]){
  await page.setViewportSize(size);await noOverflow(`home ${size.width}x${size.height}`);await navClearance();
  await go('recursos');await noOverflow(`resources ${size.width}`);await navClearance();
  await go('planner','.menu15-resources');await noOverflow(`planner ${size.width}`);await navClearance();
  const r=await page.locator('#focus-dial').boundingBox();assert(r.x>=-1&&r.x+r.width<=size.width+1,'Pomodoro dial stays in viewport');
  await home();await go('calma');await noOverflow(`wellbeing ${size.width}`);await navClearance();await home();
 }
 checks.push('Small phones, landscape and tablets retain scroll clearance and visible Pomodoro controls');
 assert.deepEqual(errors,[],'no browser exceptions');assert.deepEqual(failedRequests,[],'no failed assets');
 report.success=true;report.browser_exceptions=errors;report.failed_requests=failedRequests;checks.push('No browser exceptions or failed asset requests');
 fs.writeFileSync(path.join(out,'browser-report.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({success:true,checks:checks.length,out,screenshots},null,2));
})().catch(async error=>{report.success=false;report.error=String(error.stack||error);report.browser_exceptions=errors;report.failed_requests=failedRequests;fs.writeFileSync(path.join(out,'browser-report.json'),JSON.stringify(report,null,2)+'\n');console.error(error.stack||error);process.exitCode=1;}).finally(async()=>{await browser?.close();await new Promise(r=>server.close(r));});
