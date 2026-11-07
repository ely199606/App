/* Real Chromium checks of the restored frontend. Native delivery is mocked here. */
const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert');
const opts={};for(let i=2;i<process.argv.length;i+=2)opts[process.argv[i].replace(/^--/,'')]=process.argv[i+1];
for(const key of ['project','reference','out'])assert(opts[key],`Missing --${key}`);
const project=path.resolve(opts.project),reference=path.resolve(opts.reference),out=path.resolve(opts.out);
fs.mkdirSync(out,{recursive:true});
const roots={'/reference/':reference,'/restored/':path.join(project,'app/src/main/assets/www')};
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.ttf':'font/ttf','.json':'application/json','.webmanifest':'application/manifest+json'};
const server=http.createServer((req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname),prefix=Object.keys(roots).find(p=>pathname.startsWith(p));
  if(!prefix){res.writeHead(404);return res.end();}
  const root=roots[prefix],file=path.resolve(root,pathname.slice(prefix.length)||'index.html');
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);
});
const report={native_delivery:'Not exercised: bridge fixture only',checks:[],screenshots:[]};
const check=(name)=>report.checks.push(name);
async function main(){
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch({headless:true});
  try{
    const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,reducedMotion:'reduce',locale:'es-CL',timezoneId:'America/Santiago'});
    await ctx.addInitScript(()=>{
      window.__qaNotices=[];
      window.AppSchoolingNative={getNotices:()=>JSON.stringify(window.__qaNotices),getNoticeStatus:()=>JSON.stringify({configured:true,permission:'granted',enabled:true,registration:'ready'}),markNoticeRead(id){const n=window.__qaNotices.find(x=>x.id===id);if(n)n.readAt=new Date().toISOString()},markAllNoticesRead(){for(const n of window.__qaNotices)n.readAt=new Date().toISOString()},syncStudyReminders(){},applyReminders(){},exportJson(value){window.__qaExport=value}};
    });
    const page=await ctx.newPage(),errors=[],failed=[];
    page.on('pageerror',e=>errors.push(String(e)));
    page.on('response',r=>{if(r.status()>=400)failed.push({status:r.status(),url:r.url()});});
    const ready=async()=>{await page.waitForFunction(()=>window.AppSchoolingManzanin&&document.querySelector('.hero'));await page.evaluate(()=>window.AppSchoolingManzanin.ready());await page.evaluate(()=>document.fonts.ready);};
    const capture=async name=>{await page.screenshot({path:path.join(out,name),fullPage:true});report.screenshots.push(name);};
    await page.goto(base+'/reference/');await ready();await capture('reference-home-390.png');
    await page.goto(base+'/restored/');await ready();await capture('restored-home-390.png');
    const nav=await page.locator('.mobile-nav .nav-label').allTextContents();
    assert.deepStrictEqual(nav,['Inicio','Hábitos y planner','Manzanín','Exámenes']);check('Four approved mobile destinations retained');
    assert((await page.locator('body').evaluate(n=>getComputedStyle(n).fontFamily)).includes('Atkinson'));check('Original large Atkinson typography loaded');
    for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),`Horizontal overflow at ${width}`);}
    check('Home fits 320, 390, 768 and 1440 pixels');await capture('restored-home-1440.png');
    await page.setViewportSize({width:390,height:844});
    await page.locator('.mobile-nav [data-page="planner"]').click();
    await page.locator('#focus-dial').waitFor();
    await capture('restored-planner-390.png');
    await page.locator('[data-action="routineTab"][data-id="estrategias"]').click();
    assert((await page.locator('.routine-content').innerText()).length>150);check('Study strategies and Pomodoro restored');
    await page.locator('.mobile-nav [data-page="avatar"]').click();
    await page.locator('[data-action="avatarPose"][data-id="estudioso"]').click();
    // The large selected companion is the animated canvas, outside the cards.
    const selectedCanvas=()=>page.locator('.manzanin-canvas[data-animate="true"]').first();
    await page.evaluate(()=>window.AppSchoolingManzanin.ready());
    const student=await selectedCanvas().evaluate(n=>n.toDataURL());
    await page.locator('[data-action="avatarPose"][data-id="explorador"]').click();
    const explorer=await selectedCanvas().evaluate(n=>n.toDataURL());
    assert(student!==explorer,'Aventurero must differ even with reduced motion');check('Aventurero has its own complete resting artwork');
    await capture('restored-aventurero-390.png');
    await page.emulateMedia({reducedMotion:'no-preference'});
    const before=await selectedCanvas().evaluate(n=>n.toDataURL());
    await page.waitForTimeout(1150);
    const after=await selectedCanvas().evaluate(n=>n.toDataURL());
    assert.notStrictEqual(before,after);check('Aventurero visibly animates with motion enabled');
    await page.emulateMedia({reducedMotion:'reduce'});
    // An arriving notice updates its badge without remounting the current character.
    await selectedCanvas().evaluate(n=>{window.__qaActor=n;});
    const profileBefore=await page.evaluate(()=>localStorage.getItem('appschooling_manzanin09'));
    await page.evaluate(()=>{
      const n={schemaVersion:1,id:'qa-family-evaluation',revision:1,category:'evaluaciones',title:'Aviso de prueba en Chromium',body:'Fixture local para comprobar lectura y navegación.',publishedAt:new Date().toISOString(),url:'https://www.ayudamineduc.cl/'};
      window.__qaNotices=[n];document.dispatchEvent(new CustomEvent('appschooling:notice',{detail:n}));
    });
    assert(await page.evaluate(()=>window.__qaActor.isConnected));
    assert.strictEqual(await page.locator('.notice-top-button [data-notice-count]').innerText(),'1');
    assert.strictEqual(await page.evaluate(()=>localStorage.getItem('appschooling_manzanin09')),profileBefore);check('Notice badge preserves current animation and student data');
    await page.evaluate(()=>document.dispatchEvent(new CustomEvent('appschooling:notice-open',{detail:{id:'qa-family-evaluation'}})));
    await page.getByRole('heading',{name:'Aviso de prueba en Chromium'}).waitFor();
    assert.strictEqual(await page.evaluate(()=>window.AppSchoolingAvisos.unreadCount()),0);check('Notification tap opens detail and updates read state');
    await capture('restored-notice-390.png');
    await page.locator('.mobile-nav [data-page="avatar"]').click();
    assert.strictEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('appschooling_manzanin09')).profiles.find(p=>p.id===JSON.parse(localStorage.getItem('appschooling_manzanin09')).activeId).manzaninPose),'explorador');check('Chosen companion survives navigation');
    await page.locator('[data-action="manzaninTab"][data-id="juegos"]').click();
    await page.locator('[data-action="selectGame"][data-id="saltos"]').click();
    assert(await page.locator('#discovery-platformer').count()>0);await capture('restored-game-390.png');check('Platform game loads with original physics module');
    await page.locator('.mobile-nav [data-page="examenes"]').click();
    assert(await page.locator('a[href*="mineduc"]').count()>0);check('Official Mineduc links retained');
    await page.reload();await ready();
    assert.strictEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('appschooling_manzanin09')).profiles.find(p=>p.id===JSON.parse(localStorage.getItem('appschooling_manzanin09')).activeId).manzaninPose),'explorador');check('Profile remains after reload');
    assert.deepStrictEqual(errors,[],'No JavaScript page errors');assert.deepStrictEqual(failed,[],'No missing local assets');
    check('No browser exceptions or failed asset requests');
    report.success=true;await ctx.close();
  }finally{await browser.close();server.close();fs.writeFileSync(path.join(out,'browser-report.json'),JSON.stringify(report,null,2));}
}
main().then(()=>console.log(JSON.stringify(report))).catch(e=>{report.success=false;report.error=String(e.stack||e);fs.writeFileSync(path.join(out,'browser-report.json'),JSON.stringify(report,null,2));server.close();console.error(e);process.exitCode=1;});
