'use strict';
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert'),{chromium}=require('playwright');
const args=process.argv.slice(2),arg=(n,d)=>{const i=args.indexOf(n);return i<0?d:args[i+1]};
const project=path.resolve(arg('--project','/workspace/manzanin-notificaciones/AppSchooling_AndroidStudio_2_0'));
const www=path.join(project,'app/src/main/assets/www'),out=path.resolve(arg('--out','/workspace/qa/family20-fit'));fs.mkdirSync(out,{recursive:true});
const report={checks:[],viewports:[],native:{physical_device_tested:false,design:'Insets are consumed on a parent FrameLayout; WebView margins reduce the viewport to the actual safe rectangle, including IME.'}};
const server=http.createServer((req,res)=>{const rel=new URL(req.url,'http://localhost').pathname,file=path.resolve(www,'.'+(rel==='/'?'/index.html':rel));if(!file.startsWith(www+path.sep)||!fs.existsSync(file)){res.writeHead(404).end();return}res.setHeader('content-type',file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'application/octet-stream');fs.createReadStream(file).pipe(res)});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;try{
 const executablePath=process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined);
 browser=await chromium.launch({...(executablePath?{executablePath}:{}),headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'es-CL'});
 await context.addInitScript(()=>{
  const p={id:'fit20-profile',name:'Julia',age:9,manzaninPose:'saludo',interests:[],goals:[],habits:[],habitsDone:{},water:{},tasks:[],moods:[],goalDone:{}};
  localStorage.setItem('appschooling_manzanin09',JSON.stringify({profiles:[p],activeId:p.id,demo:false,settings:{reminders:false},created:Date.now()}));
  window.AppSchoolingNative={getAccessStatus:()=>JSON.stringify({configured:true,authorized:true,busy:false,email:'geometry-fixture@example.invalid',error:''}),getNoticeStatus:()=>JSON.stringify({configured:true,permission:'granted',enabled:true,registration:'ready'}),getNotices:()=>JSON.stringify([]),syncStudyReminders:()=>{},applyReminders:()=>{},markNoticeRead:()=>{},markAllNoticesRead:()=>{},requestNoticePermission:()=>{},openNoticeSettings:()=>{}};
 });
 const page=await context.newPage(),errs=[];page.on('pageerror',e=>errs.push(e.message));
 for(const [width,height] of [[320,568],[360,640],[390,760],[390,844],[412,720],[412,915],[768,1024],[844,390]]){
  await page.setViewportSize({width,height});await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'networkidle'});await page.waitForSelector('.family16-home .menu15-tile');await page.evaluate(()=>document.fonts.ready);
  const g=await page.evaluate(()=>{const rect=q=>{const r=document.querySelector(q).getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right}};return{viewport:{width:innerWidth,height:innerHeight},bodyWidth:document.body.scrollWidth,documentWidth:document.documentElement.scrollWidth,header:rect('.family16-header'),logo:rect('.family16-school-logo'),panel:rect('.page-content'),nav:rect('.mobile-nav'),cards:[...document.querySelectorAll('.menu15-tile')].map(el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right}}),font:getComputedStyle(document.querySelector('.menu15-tile-label')).fontSize,canvas:!!window.AppSchoolingBackground?.status().running}});
  assert(g.documentWidth<=width+1&&g.bodyWidth<=width+1,`no horizontal overflow ${width}x${height}`);
  assert(g.nav.y>=0&&g.nav.bottom<=height-8,`nav inside viewport ${width}x${height}`);
  assert(g.cards[0].right+15<=g.cards[1].x,'columns spaced apart');assert(g.cards[2].y>=g.cards[0].bottom+15,'rows spaced apart');
  assert(g.logo.width/g.logo.height>1.60&&g.logo.width/g.logo.height<1.63,'logo aspect ratio intact');
  assert(parseFloat(g.font)>=18,'legible text');assert.equal(g.cards.length,4,'four home cards');
  if(height>=568){assert(g.panel.bottom<=g.nav.y-8,`panel clear of navigation ${width}x${height}: ${JSON.stringify(g)}`);assert(g.cards[3].bottom<=g.nav.y-16,'fourth card fully visible');}
  else {await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));const lower=await page.locator('.menu15-tile').last().boundingBox();const nav=await page.locator('.mobile-nav').boundingBox();assert(lower.y+lower.height<nav.y-10,'landscape last card can be reached above nav');}
  assert(g.canvas,'background still animates');report.viewports.push(g);await page.screenshot({path:path.join(out,`home-${width}x${height}.png`)});
 }
 assert.deepEqual(errs,[]);report.checks.push('Four home cards fit above navigation for safe phone viewports320–412px wide and568–915px tall; tablet also fits.','Landscape remains scrollable and final card clears fixed navigation.','No horizontal overflow, columns separated, original logo aspect ratio, legible18–25px labels, animated background retained.');
 const native=fs.readFileSync(path.join(project,'app/src/main/java/com/ritmocasa/appdemo/MainActivity.java'),'utf8');
 for(const phrase of ['safeRoot.addView(web','bounds.setMargins(left, top, right, bottom)','WindowInsets.Type.ime()','WindowInsets.CONSUMED','cfg.setTextZoom(100)','cfg.setUseWideViewPort(true)'])assert(native.includes(phrase),'native safe bounds present:'+phrase);
 assert(!native.includes('view.setPadding('),'WebView padding removed');report.checks.push('Static native checks confirm parent bounds, IME/system insets consumed, explicit viewport and100%text zoom; physical Android test still required.');
 fs.writeFileSync(path.join(out,'fit20-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({success:true,checks:report.checks,viewports:report.viewports.map(g=>({viewport:g.viewport,header:g.header.height,tile:g.cards[0].height,panelBottom:g.panel.bottom,navTop:g.nav.y,font:g.font})),report:path.join(out,'fit20-report.json')}));
}finally{await browser?.close();server.close()}})().catch(e=>{console.error(e);process.exit(1)});
