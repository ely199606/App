/* End-to-end checks for the actual inlined AppSchooling family app.
   Android bridge methods are fixtures; no remote notifications are sent. */
'use strict';
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert');
const {chromium}=require('playwright');
const args=process.argv.slice(2),arg=(name,fallback)=>{const i=args.indexOf(name);return i<0?fallback:args[i+1]};
const project=path.resolve(arg('--project','/workspace/manzanin-notificaciones/AppSchooling_AndroidStudio_1_9'));
const out=path.resolve(arg('--out','/workspace/qa/family19-verified'));
const root=path.join(project,'app/src/main/assets/www');fs.mkdirSync(out,{recursive:true});
const checks=[],screenshots=[],errors=[],failedRequests=[];
const report={version:'1.9.0',native_delivery:'Fixture only: no physical device or real push delivery',checks,screenshots};
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.json':'application/json','.webmanifest':'application/manifest+json','.ttf':'font/ttf'};
const server=http.createServer((req,res)=>{
 let rel;try{rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch(_){res.writeHead(400).end();return}
 const file=path.resolve(root,'.'+(rel==='/'?'/index.html':rel));
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return}
 res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);
});
const fixture=()=>{
 if(!localStorage.getItem('appschooling_manzanin09')){
  const date=new Date().toISOString().slice(0,10),p={id:'family16-existing-child',name:'Julia',age:9,avatar:'',manzaninPose:'explorador',manzaninAccessory:'',manzaninAccessories:[],interests:['Naturaleza','Lectura'],approach:'Movimiento',goals:[{id:'g1',title:'Preparar mis materiales',cat:'aprendizaje'}],habits:['preparar','agua'],habitsDone:{},water:{},gameBest:0,tasks:[{id:'t1',title:'Lectura libre',date,cat:'aprendizaje',done:false}],moods:[],goalDone:{}};
  localStorage.setItem('appschooling_manzanin09',JSON.stringify({profiles:[p],activeId:p.id,demo:false,settings:{reminders:false,study:'10:00',water:'12:00',rest:'17:00',notificationLog:{}},created:Date.now()}));
 }
 window.__nativeNoticeMarks=[];window.__nativeNoticeLinks=[];
 window.AppSchoolingNative={getNoticeStatus:()=>JSON.stringify({configured:true,permission:'granted',enabled:true,registration:'ready'}),getNotices:()=>JSON.stringify([]),markNoticeRead:id=>window.__nativeNoticeMarks.push(id),markAllNoticesRead:()=>{},openNoticeLink:id=>window.__nativeNoticeLinks.push(id),syncStudyReminders:()=>{},applyReminders:()=>{},requestNoticePermission:()=>{},openNoticeSettings:()=>{}};
};
const general={schemaVersion:1,id:'qa-family16-general',revision:1,category:'general',title:'Materiales para la clase',body:'Este aviso existe únicamente en la prueba de navegador. Prepara el material que indicó tu profesora.',publishedAt:'2026-11-23T14:00:00Z',eventAt:null,expiresAt:null,url:'https://ayudamineduc.cl/'};
const exam={...general,id:'qa-family16-examen',category:'examenes',title:'Información de exámenes libres',body:'Consulta las instrucciones oficiales junto a tu familia.',publishedAt:'2026-11-23T14:01:00Z',url:null};
let browser;
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin=`http://127.0.0.1:${server.address().port}`;
 const executablePath=process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined);
 browser=await chromium.launch({...(executablePath?{executablePath}:{}),headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,reducedMotion:'no-preference',locale:'es-CL',userAgent:'Mozilla/5.0 (Linux; Android 15; Samsung) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/135.0.0.0 Mobile Safari/537.36 AppSchoolingAndroid/1.9'});
 await context.addInitScript(fixture);
 await context.addInitScript(()=>{
  window.__family19StartupTexts=[];
  const inspect=()=>{const source=document.querySelector('[data-manzanin-start]');if(source){const copy=source.cloneNode(true);copy.querySelectorAll('noscript').forEach(n=>n.remove());window.__family19StartupTexts.push(copy.textContent.trim());}else if(document.querySelector('.layout'))observer.disconnect();};
  const observer=new MutationObserver(inspect);observer.observe(document,{childList:true,subtree:true});inspect();
 });
 const page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>failedRequests.push({url:r.url().replace(origin,''),error:r.failure()?.errorText}));
 const waitRoute=async route=>{await page.waitForFunction(x=>document.documentElement.dataset.appPage===x,route);await page.evaluate(()=>document.fonts.ready);await page.locator('.page-content').waitFor({state:'visible'});};
 const nav=page.locator('.mobile-nav');
 const home=async()=>{await nav.locator('[data-action="go"][data-page="inicio"]').click();await waitRoute('inicio');};
 const go=async route=>{await page.locator(`.page-content [data-action="go"][data-page="${route}"]`).first().click();await waitRoute(route);};
 const shot=async name=>{await page.screenshot({path:path.join(out,name)});screenshots.push(name);};
 const noOverflow=async label=>{const s=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth}));assert(s.document<=s.viewport+1&&s.body<=s.viewport+1,`${label}: horizontal overflow ${JSON.stringify(s)}`);};
 const navClearance=async()=>{
  await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
  const r=await page.evaluate(()=>{const n=document.querySelector('.mobile-nav').getBoundingClientRect(),c=document.querySelector('.main');const boxes=[...c.querySelectorAll('button,a,input,select,textarea,h1,h2,h3,p,summary')].filter(el=>{if(!el.getClientRects().length)return false;for(let a=el.parentElement;a&&a!==c;a=a.parentElement){if(a.tagName==='DETAILS'&&!a.open){const summary=a.querySelector(':scope > summary');if(!summary?.contains(el))return false;}}return true;}).map(el=>el.getBoundingClientRect());return {nav:n.toJSON(),contentBottom:Math.max(...boxes.map(x=>x.bottom)),height:innerHeight};});
  assert(r.nav.top>=0&&r.nav.bottom<=r.height+1,'bottom navigation stays inside viewport');
  assert(r.contentBottom<=r.nav.top+3,'all content can scroll clear of bottom navigation');
  await page.evaluate(()=>window.scrollTo(0,0));
 };
 await page.goto(origin,{waitUntil:'networkidle'});await waitRoute('inicio');
 const profileBefore=await page.evaluate(()=>localStorage.getItem('appschooling_manzanin09'));
 // Inspect the initial public markup as well as parser-time snapshots: an
 // app render after startup must not hide a visible Manzanín loading heading.
 const entry=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const startup=entry.match(/<div\s+id="app"[^>]*>([\s\S]*?)<script[^>]*data-manzanin-boot-guard/);
 assert(startup,'cold-start markup is present for inspection');
 const initialCopy=startup[1].replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi,'').replace(/<[^>]+>/g,'').trim();
 assert.equal(initialCopy,'','cold startup contains no visible heading or loading copy');
 assert(!/Manzan[ií]n/i.test(await page.title())&&(await page.title()).includes('Colegio'),'window title uses the school identity');
 const seen=await page.evaluate(()=>window.__family19StartupTexts);
 assert(seen.every(text=>text===''),'parser-time startup never exposes the old Manzanín text');report.startup={initial_visible_text:initialCopy,parser_snapshots:seen.length,title:await page.title()};
 checks.push('Cold startup removes the transient Manzanín heading and loading copy while using the school window title');
 const backgroundCanvas=page.locator('#school-background');await backgroundCanvas.waitFor({state:'visible'});
 const canvasStyle=await backgroundCanvas.evaluate(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return {x:r.x,y:r.y,width:r.width,height:r.height,position:s.position,pointerEvents:s.pointerEvents,zIndex:Number(s.zIndex),viewportWidth:innerWidth,viewportHeight:innerHeight};});
 assert(Math.abs(canvasStyle.x)<1&&Math.abs(canvasStyle.y)<1&&Math.abs(canvasStyle.width-canvasStyle.viewportWidth)<1&&Math.abs(canvasStyle.height-canvasStyle.viewportHeight)<1,'one continuous canvas covers the viewport');
 assert(canvasStyle.position==='fixed'&&canvasStyle.pointerEvents==='none','background never takes taps or scrolls with menu controls');
 assert(await page.locator('.main').evaluate(el=>getComputedStyle(el).backgroundColor==='rgba(0, 0, 0, 0)'),'the approved transparent layout exposes the continuous backdrop');
 const stationary=await page.locator('.menu15-tile').evaluateAll(a=>a.map(x=>{const r=x.getBoundingClientRect();return [r.x,r.y,r.width,r.height]}));
 const beforeMotion=await page.evaluate(()=>window.AppSchoolingBackground.status());assert(beforeMotion.available&&beforeMotion.running&&!beforeMotion.reducedMotion,'canvas renderer is available and running');
 await page.screenshot({path:path.join(out,'motion-0.png')});await page.waitForTimeout(3000);await page.screenshot({path:path.join(out,'motion-3.png')});
 const afterMotion=await page.evaluate(()=>window.AppSchoolingBackground.status());assert(afterMotion.frames-beforeMotion.frames>=24&&afterMotion.elapsedMs-beforeMotion.elapsedMs>=2000,'canvas actually paints throughout the visible sample interval');
 assert.deepEqual(await page.locator('.menu15-tile').evaluateAll(a=>a.map(x=>{const r=x.getBoundingClientRect();return [r.x,r.y,r.width,r.height]})),stationary,'menu cards remain stationary while background pixels move');
 // Read screenshot pixels only: the samples are exterior strips beyond the
 // white panel, excluding every animated mascot and control.
 const pixelCode="from PIL import Image,ImageChops,ImageStat;import sys,json; a=Image.open(sys.argv[1]).convert('RGB');b=Image.open(sys.argv[2]).convert('RGB');regions=[(0,200,8,700),(382,200,390,700)]; values=[sum(ImageStat.Stat(ImageChops.difference(a.crop(r),b.crop(r))).mean)/3 for r in regions];print(json.dumps({'mean_change':sum(values)/len(values),'edge_changes':values,'crop_regions':regions}))";
 const measured=JSON.parse(require('child_process').execFileSync('python3',['-c',pixelCode,path.join(out,'motion-0.png'),path.join(out,'motion-3.png')],{encoding:'utf8'}));assert(measured.mean_change>=3,'diffuse red and green background visibly changes over three seconds in exposed areas');report.measured_motion={...measured,frames_advanced:afterMotion.frames-beforeMotion.frames,elapsed_ms:afterMotion.elapsedMs-beforeMotion.elapsedMs};
 const plate=await page.locator('.page-content').evaluate(el=>({background:getComputedStyle(el).backgroundColor,bounds:el.getBoundingClientRect().toJSON()}));assert(plate.background.includes('249, 252, 255'),'the approved light panel remains intact');
 assert(await page.locator('.family16-header').evaluate(el=>getComputedStyle(el).backgroundImage==='none'&&getComputedStyle(el).backgroundColor==='rgba(0, 0, 0, 0)'),'header and lower menu share the same continuous backdrop');
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>window.AppSchoolingBackground.status().reducedMotion);
 const reducedBefore=await page.evaluate(()=>window.AppSchoolingBackground.status());await page.waitForTimeout(350);const reducedAfter=await page.evaluate(()=>window.AppSchoolingBackground.status());assert(!reducedAfter.running&&reducedAfter.frames===reducedBefore.frames,'reduced-motion preference freezes the actual renderer');
 await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForFunction(()=>window.AppSchoolingBackground.status().running);report.background={canvas:canvasStyle,before:beforeMotion,after:afterMotion,reduced:reducedAfter};
 checks.push('A continuous noninteractive canvas visibly animates the diffuse red-green background; reduced motion freezes it and the approved cards stay still');

 const cards=page.locator('.menu15-grid .menu15-tile');assert.equal(await cards.count(),4);
 assert.equal(await page.locator('.family19-home-companion').count(),0,'home does not add a companion below the menu');
 assert.equal(await page.locator('.main [data-school-help],.main .manzanin-animated,.main canvas').count(),0,'home has no Manzanín mascot or contact control');
 const homePanel=await page.locator('.page-content').evaluate(el=>{const p=el.getBoundingClientRect(),n=document.querySelector('.mobile-nav').getBoundingClientRect(),header=document.querySelector('.family16-header').getBoundingClientRect(),cards=[...el.querySelectorAll('.menu15-tile')].map(x=>x.getBoundingClientRect());return {height:p.height,top:p.top,bottom:p.bottom,navTop:n.top,headerBottom:header.bottom,lastCardBottom:Math.max(...cards.map(x=>x.bottom))};});
 assert(homePanel.height>=500,'390px home uses a taller expanded light panel');
 assert(homePanel.bottom>homePanel.lastCardBottom+10,'light panel continues below the last card row');
 assert(homePanel.bottom<=homePanel.navTop-5,'expanded panel leaves the bottom navigation clear');
 assert(homePanel.top>=homePanel.headerBottom&&homePanel.top>0&&homePanel.navTop-homePanel.bottom>=5,'gradient remains visible above and below the panel');
 for(const [key,value] of Object.entries({height:558,top:174,bottom:732,navTop:753,headerBottom:166,lastCardBottom:658}))assert(Math.abs(homePanel[key]-value)<1,'approved 1.8 home geometry remains unchanged: '+key);
 report.home_panel_390=homePanel;checks.push('Home expands the light menu panel toward navigation while keeping the gradient visible and adding no mascot or extra functions');

 assert.deepEqual(await cards.evaluateAll(a=>a.map(x=>x.dataset.page)),['examenes','avisos','calma','recursos']);
 assert.deepEqual(await cards.evaluateAll(a=>a.map(x=>x.getAttribute('aria-label'))),['Exámenes Libres','Información y avisos','Bienestar familiar','Recursos de apoyo']);
 const logo=page.locator('header img.family16-school-logo').first();await logo.waitFor();
 const logoPixels=await logo.evaluate(async el=>{await el.decode();const c=document.createElement('canvas');c.width=el.naturalWidth;c.height=el.naturalHeight;const x=c.getContext('2d');x.filter=getComputedStyle(el).filter;x.drawImage(el,0,0);const b=x.getImageData(0,0,c.width,c.height).data;let opaque=0,white=0,transparent=0;for(let i=0;i<b.length;i+=4){if(b[i+3]<8)transparent++;if(b[i+3]>200){opaque++;if(b[i]>232&&b[i+1]>232&&b[i+2]>232)white++;}}return {width:el.naturalWidth,height:el.naturalHeight,whiteRatio:white/opaque,transparentRatio:transparent/(b.length/4),objectFit:getComputedStyle(el).objectFit,filter:getComputedStyle(el).filter,src:el.getAttribute('src')};});
 assert.equal(logoPixels.width,1600);assert.equal(logoPixels.height,989);assert(logoPixels.src.endsWith('icons/colegio-original.png'),'exact original logo asset is used');
 assert(logoPixels.filter.includes('brightness(0)')&&logoPixels.filter.includes('invert(1)'),'original logo is rendered white by a nondestructive CSS filter');
 assert(logoPixels.whiteRatio>.92&&logoPixels.transparentRatio>.1,'school logo is white on a transparent background');
 assert.equal(logoPixels.objectFit,'contain','original school logo is contained without stretching');report.logo=logoPixels;
 checks.push('Main menu uses the white school logo image and retains its proportions');
 for(const width of [320,390,768,1440]){
  await page.setViewportSize({width,height:width===320?640:width===1440?960:844});await page.evaluate(()=>window.scrollTo(0,0));await noOverflow(`Android home ${width}`);
  const b=await cards.evaluateAll(a=>a.map(x=>{const r=x.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}}));
  assert(Math.abs(b[0].y-b[1].y)<2&&b[1].x>b[0].x,'two first-row cards remain alongside each other');
  assert(Math.abs(b[2].y-b[3].y)<2&&b[2].y>b[0].y,'second card row remains distinct');
  const gutter=b[1].x-(b[0].x+b[0].width);assert(gutter>=19,'neighboring cards have at least 20px clear separation');
  const internal=await cards.evaluateAll(a=>a.map(el=>{const i=el.querySelector('svg').getBoundingClientRect(),t=el.querySelector('.menu15-tile-label').getBoundingClientRect();return {separation:t.top-i.bottom,iconWidth:i.width,cardWidth:el.getBoundingClientRect().width}}));
  assert(internal.every(x=>x.separation>=5&&x.iconWidth<x.cardWidth-10),'card icons and labels do not overlap');
  const sizing=await cards.evaluateAll(a=>a.map(el=>({height:el.getBoundingClientRect().height,icon:el.querySelector('svg').getBoundingClientRect().width,font:parseFloat(getComputedStyle(el.querySelector('.menu15-tile-label')).fontSize),textFits:el.querySelector('.menu15-tile-label').scrollWidth<=el.querySelector('.menu15-tile-label').clientWidth+1})));
  if(width===390){assert(sizing.every(x=>Math.abs(x.height-190)<1&&Math.abs(x.icon-84)<1&&Math.abs(x.font-22)<.1),'390px menu has substantially larger cards, icons and labels');report.home_card_sizing_390=sizing;}
  if(width===320){assert(sizing.every(x=>Math.abs(x.height-142)<1&&Math.abs(x.icon-66)<1&&Math.abs(x.font-18)<.1),'small phone keeps readable labels and usable icons');report.home_card_sizing_320=sizing;}
  assert(sizing.every(x=>x.textFits),'larger labels remain fully visible within their cards');

  const controls=await nav.locator('button').evaluateAll(a=>a.map(x=>{const r=x.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,label:x.getAttribute('aria-label')}}));
  assert.equal(controls.length,4);assert(controls.every(x=>x.label&&x.width>=44&&x.height>=44));
  assert(controls.slice(1).every((r,i)=>r.x>=controls[i].x+controls[i].width-1),'navigation touch targets do not overlap');
  if(width===320)await shot('family19-home-320.png');if(width===390)await shot('family19-home-390.png');if(width===1440)await shot('family19-home-1440.png');await navClearance();
 }
 checks.push('Enlarged menu cards, icons and labels fit Android phones and desktops with an expanded clear panel and no added home companion');
 await page.setViewportSize({width:390,height:844});await go('avisos');await page.locator('.family17-empty-mascot canvas').waitFor();assert.equal(await page.locator('.family17-empty-mascot canvas').getAttribute('data-character'),'saludo');assert((await page.locator('.family17-empty-speech').textContent()).includes('Todavía no tienen avisos'));assert((await page.locator('.family17-empty p').textContent()).includes('Los mensajes que reciban aparecerán aquí'));await shot('family17-avisos-vacio-390.png');await home();await go('examenes');
 const options=page.locator('.family16-exam-menu details.family16-exam-option');assert.equal(await options.count(),4);
 assert.deepEqual(await options.evaluateAll(a=>a.map(x=>x.dataset.examOption)),['sitio','informacion','inscripcion','contacto']);
 assert.equal(await options.evaluateAll(a=>a.filter(x=>x.open).length),0,'exam information starts collapsed');
 assert((await page.locator('.family17-school-help').textContent()).includes('¿Te ayudo?'));
 const helper=page.locator('.family17-school-help canvas');await helper.waitFor();
 assert.equal(await helper.getAttribute('data-character'),'explorador');assert.equal(await helper.getAttribute('data-animate'),'true');
 const compactHeight=await page.evaluate(()=>document.documentElement.scrollHeight);assert(compactHeight<1250,'collapsed exam menu avoids the old long information wall');
 await shot('family16-examenes-390.png');
 await page.locator('[data-school-help]').click();await page.locator('.family17-contact-dialog').waitFor();assert.equal(await page.locator('.family17-contact-dialog a[href="https://colegiovirtualdechile.cl/"]').count(),1);assert.equal(await page.locator('.family17-contact-dialog a[href="tel:6006560060"]').count(),1);await shot('family17-ayuda-390.png');await page.evaluate(()=>window.AppSchoolingNavigation.back());assert.equal(await page.locator('.family17-contact-dialog').count(),0);await waitRoute('examenes');
 const helpPosition=await page.locator('[data-school-help]').evaluate(el=>({speech:el.querySelector('.family17-speech').getBoundingClientRect().bottom,mascot:el.querySelector('.family17-help-mascot').getBoundingClientRect().top}));assert(helpPosition.speech<helpPosition.mascot,'speech bubble sits above Manzanín');checks.push('Manzanín speech bubble opens official website and phone options, and Android Back closes the contact dialog');
 await options.nth(0).locator('summary').click();assert.equal(await options.nth(0).evaluate(x=>x.open),true);
 assert(await options.nth(0).locator('a[href^="https://"]').count()>0);
 await options.nth(1).locator('summary').click();assert.equal(await options.nth(1).evaluate(x=>x.open),true);assert.equal(await options.nth(0).evaluate(x=>x.open),false);
 await options.nth(2).locator('summary').focus();await page.keyboard.press('Enter');assert.equal(await options.nth(2).evaluate(x=>x.open),true);assert.equal(await options.nth(1).evaluate(x=>x.open),false);
 await options.nth(3).locator('summary').click();assert.equal(await options.nth(3).evaluate(x=>x.open),true);assert.equal(await options.nth(2).evaluate(x=>x.open),false);
 assert(await options.nth(3).locator('a[href^="tel:"]').count()>0);await shot('family16-examenes-contacto-390.png');await options.nth(3).locator('summary').click();
 const official=await page.locator('.family16-exam-page a[href^="https://"]').evaluateAll(a=>a.map(x=>x.href));assert(official.length>=2&&official.every(u=>{const h=new URL(u).hostname;return h==='mineduc.cl'||h.endsWith('.mineduc.cl')||h==='ayudamineduc.cl'||h.endsWith('.ayudamineduc.cl')||h==='chileatiende.gob.cl'||h.endsWith('.chileatiende.gob.cl')}));
 checks.push('Exam menu starts compact; each section expands by click or keyboard and closes the previous section; official links and contact numbers remain available');
 await page.evaluate(()=>{window.__family16Helper=document.querySelector('.family17-school-help canvas');});
 await page.evaluate(n=>document.dispatchEvent(new CustomEvent('appschooling:notice',{detail:n})),general);
 await page.evaluate(n=>document.dispatchEvent(new CustomEvent('appschooling:notice',{detail:n})),exam);
 assert.equal(await page.evaluate(()=>document.querySelector('.family17-school-help canvas')===window.__family16Helper),true,'incoming notices preserve the visible helper canvas');
 assert.equal(await page.evaluate(()=>localStorage.getItem('appschooling_manzanin09')),profileBefore,'notices preserve existing family profile data');
 assert.equal(await page.evaluate(()=>window.AppSchoolingAvisos.unreadCount()),2);await home();
 assert((await page.locator('[data-notice-count]:visible').allTextContents()).every(t=>t==='2'));
 await go('avisos');await page.locator('.notice-page').waitFor();assert.equal(await page.locator('.notice-item').count(),2);
 assert.equal(await page.locator('.notice-status-settings').evaluate(x=>x.open),false,'connection details remain folded initially');
 assert((await page.locator('.notice-page h1').textContent()).includes('Información y avisos'));
 assert.equal(await page.locator('[data-notice-action="filter"]').count(),2);await shot('family16-avisos-390.png');
 await page.locator('.notice-status-settings > summary').click();assert((await page.locator('.notice-status').textContent()).includes('Notificaciones activadas'));await page.locator('.notice-status-settings > summary').click();
 await page.locator('[data-notice-action="open"][data-notice-id="qa-family16-general"]').click();assert((await page.locator('.notice-detail').textContent()).includes(general.body));assert.equal(await page.evaluate(()=>window.AppSchoolingAvisos.unreadCount()),1);
 await page.locator('[data-notice-action="link"]').click();assert.deepEqual(await page.evaluate(()=>window.__nativeNoticeLinks),['qa-family16-general']);await shot('family16-aviso-detalle-390.png');
 await page.locator('[data-notice-action="back"]').click();await page.locator('[data-notice-action="filter"][data-notice-id="pendientes"]').click();assert.equal(await page.locator('.notice-item').count(),1);
 await page.locator('[data-notice-category]').selectOption('general');assert.equal(await page.locator('.notice-item').count(),0);
 await page.locator('[data-notice-category]').selectOption('examenes');assert.equal(await page.locator('.notice-item').count(),1);
 await page.locator('[data-notice-category]').selectOption('todos');await page.locator('[data-notice-action="filter"][data-notice-id="todos"]').click();assert.equal(await page.locator('.notice-item').count(),2);
 await page.evaluate(()=>document.dispatchEvent(new CustomEvent('appschooling:notice-open',{detail:{id:'qa-family16-examen'}})));await waitRoute('avisos');assert((await page.locator('.notice-detail').textContent()).includes(exam.body));assert.equal(await page.evaluate(()=>window.AppSchoolingAvisos.unreadCount()),0);
 assert.deepEqual(await page.evaluate(()=>window.__nativeNoticeMarks),['qa-family16-general','qa-family16-examen']);
 checks.push('Restyled notice inbox keeps real filters, categories, native links, read state and notification tap behavior without changing profiles or Manzanín');
 await home();await go('recursos');await shot('family16-recursos-390.png');await noOverflow('resources');await navClearance();
 const resourceLinks=page.locator('.family16-resources [data-action="go"]');assert.equal(await resourceLinks.count(),2);assert.deepEqual(await resourceLinks.evaluateAll(a=>a.map(x=>x.dataset.page)),['estrategias','familia']);
 const routes=await page.locator('.page-content [data-action="go"],.mobile-nav [data-action="go"]').evaluateAll(a=>a.map(x=>x.dataset.page));assert(!routes.some(r=>['avatar','juego','habitos','enfoque'].includes(r)),'family resources hide student games and personalization entry points');
 await go('estrategias');assert.equal(await page.locator('.family16-strategies').count(),1);const strategyGroups=page.locator('.family16-strategies details[data-family-group]');assert.equal(await strategyGroups.count(),5);assert.equal(await strategyGroups.evaluateAll(a=>a.filter(x=>x.open).length),0);
 await strategyGroups.nth(0).locator(':scope > summary').click();assert.equal(await strategyGroups.nth(0).evaluate(x=>x.open),true);await strategyGroups.nth(1).locator(':scope > summary').click();assert.equal(await strategyGroups.nth(1).evaluate(x=>x.open),true);assert.equal(await strategyGroups.nth(0).evaluate(x=>x.open),false);await shot('family16-estrategias-390.png');
 const pomo=page.locator('[data-family-pomodoro]');assert.equal(await pomo.evaluate(x=>x.open),false);await pomo.locator(':scope > summary').click();await page.locator('.focus-dial-button').waitFor({state:'visible'});await page.locator('.focus-dial-button').click();assert.equal(await pomo.evaluate(x=>x.open),true,'timer remains expanded after starting');await page.locator('.focus-dial-button').click();await page.locator('[data-action="focusReset"]').click();await shot('family17-pomodoro-390.png');checks.push('Pomodoro remains an optional collapsed study strategy and its timer can start and pause without closing the disclosure');
 await page.evaluate(()=>window.AppSchoolingNavigation.back());await waitRoute('recursos');await page.evaluate(()=>window.AppSchoolingNavigation.back());await waitRoute('inicio');assert.equal(await page.evaluate(()=>window.AppSchoolingNavigation.back()),true);await waitRoute('inicio');
 await go('recursos');await go('familia');assert.equal(await page.locator('.family16-orientation details[data-family-group]').count(),4);await shot('family16-orientaciones-390.png');
 await home();await go('calma');assert.equal(await page.locator('.family16-wellbeing details[data-family-group]').count(),3);assert.equal(await page.locator('[data-action="waterPlus"],[data-action="waterMinus"],#focus-dial,#discovery-platformer').count(),0);assert(await page.locator('.family16-wellbeing h1').evaluate(el=>el.getBoundingClientRect().height<36),'Bienestar familiar heading is on one line');await shot('family16-bienestar-390.png');await noOverflow('wellbeing');await navClearance();
 await nav.locator('[data-page="planner"]').click();await waitRoute('planner');assert.equal(await page.locator('#focus-dial,#discovery-platformer,[data-action="waterPlus"],[data-action="waterMinus"]').count(),0);assert(await page.locator('.mini-week').count()>0);await shot('family16-planner-390.png');
 const taskModal=page.locator('[data-action="modal"][data-modal="taskNew"]');await taskModal.click();await page.locator('.modal-bg').waitFor();assert.equal(await page.evaluate(()=>window.AppSchoolingNavigation.back()),true);assert.equal(await page.locator('.modal-bg').count(),0);await waitRoute('planner');
 checks.push('Family resources contain exactly strategies and orientation; family planner remains without games or water tracking; Pomodoro is available only as an optional study disclosure');
 await home();await go('avisos');if(await page.locator('[data-notice-action="back"]').count())await page.locator('[data-notice-action="back"]').click();await page.locator('[data-notice-action="open"][data-notice-id="qa-family16-general"]').click();assert(await page.locator('.notice-detail').count()>0);assert.equal(await page.evaluate(()=>window.AppSchoolingNavigation.back()),true);assert.equal(await page.locator('.notice-detail').count(),0);await waitRoute('avisos');await page.evaluate(()=>window.AppSchoolingNavigation.back());await waitRoute('inicio');
 checks.push('Back navigation returns strategies to resources to home, stays on home, and closes a modal or notice detail before leaving its page');
 await page.reload({waitUntil:'networkidle'});await waitRoute('inicio');assert.equal(await page.evaluate(()=>localStorage.getItem('appschooling_manzanin09')),profileBefore);assert.equal(await page.evaluate(()=>window.AppSchoolingAvisos.unreadCount()),0);
 checks.push('Existing family profile and notice read state survive an application reload');
 for(const size of [{width:320,height:568},{width:568,height:320},{width:390,height:844},{width:768,height:1024}]){
  await page.setViewportSize(size);await noOverflow(`home ${size.width}x${size.height}`);await navClearance();
  await go('examenes');await noOverflow(`exams ${size.width}`);await navClearance();await home();
  await go('avisos');if(await page.locator('[data-notice-action="back"]').count())await page.locator('[data-notice-action="back"]').click();await noOverflow(`notices ${size.width}`);await navClearance();await home();
  await go('recursos');await noOverflow(`resources ${size.width}`);await navClearance();await home();
 }
 checks.push('Home, exams, notices and resources fit small phones, landscape and tablets with full navigation clearance');
 assert.deepEqual(errors,[],'no browser exceptions');assert.deepEqual(failedRequests,[],'no failed assets');report.success=true;report.browser_exceptions=errors;report.failed_requests=failedRequests;checks.push('No browser exceptions or failed asset requests');
 fs.writeFileSync(path.join(out,'browser-report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({success:true,checks:checks.length,out,screenshots},null,2));
})().catch(async error=>{report.success=false;report.error=String(error.stack||error);report.browser_exceptions=errors;report.failed_requests=failedRequests;fs.writeFileSync(path.join(out,'browser-report.json'),JSON.stringify(report,null,2)+'\n');console.error(error.stack||error);process.exitCode=1;}).finally(async()=>{await browser?.close();await new Promise(r=>server.close(r));});
