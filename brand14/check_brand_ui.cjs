/* Real Chromium checks of the 1.4 red/green frontend. Native delivery is mocked. */
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
const themeFile=path.join(project,'app/src/main/assets/www/brand-red-green-v14.css');
const themeCss=fs.readFileSync(themeFile,'utf8');
const themeAnimationNames=[...new Set([...themeCss.matchAll(/@(?:-webkit-)?keyframes\s+([\w-]+)/g)].map(match=>match[1]))];
assert(themeAnimationNames.length>=3,'The background theme must define its color and wave movements');
assert(/(?:radial|linear)-gradient\(/.test(themeCss),'Expected a real gradient, not an image placeholder');
const report={version:'1.4.0',native_delivery:'Not exercised: bridge fixture only',checks:[],screenshots:[],theme_animation_names:themeAnimationNames};
const check=(name)=>report.checks.push(name);
const rgba=value=>{const match=/rgba?\(([^)]+)\)/.exec(value);return match?match[1].split(/[\s,/]+/).filter(Boolean).map(Number):null;};
const luminance=rgb=>rgb.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
const contrast=(a,b)=>{const values=[luminance(a),luminance(b)].sort((x,y)=>y-x);return(values[0]+.05)/(values[1]+.05);};
async function main(){
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
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
    await page.screenshot({path:path.join(out,'brand-home-viewport-390.png')});report.screenshots.push('brand-home-viewport-390.png');
    const installedTheme=await page.evaluate(()=>{
      const styles=[...document.querySelectorAll('head style')],last=styles.at(-1);
      const decoration=(selector,pseudo)=>{const node=document.querySelector(selector),style=getComputedStyle(node,pseudo);return {selector,pseudo,background:style.backgroundImage,pointerEvents:style.pointerEvents,position:style.position,animationName:style.animationName};};
      const surface=getComputedStyle(document.querySelector('.page-content'));
      const button=getComputedStyle(document.querySelector('.hero .button:not(.secondary)'));
      return {lastSource:last?.dataset.source,lastText:last?.textContent,decorations:[decoration('body','::before'),decoration('body','::after'),decoration('.layout','::before')],surface:surface.backgroundColor,button:{color:button.color,backgroundColor:button.backgroundColor,backgroundImage:button.backgroundImage}};
    });
    assert.strictEqual(installedTheme.lastSource,'brand-red-green-v14.css');
    assert.strictEqual(installedTheme.lastText.trim(),themeCss.trim(),'Inline and standalone brand theme match');
    for(const decoration of installedTheme.decorations){assert.strictEqual(decoration.pointerEvents,'none',`${decoration.selector}${decoration.pseudo} must not intercept taps`);assert.strictEqual(decoration.position,'fixed');assert.strictEqual(decoration.animationName,'none','Reduced motion disables the decorative background');}
    const backgrounds=installedTheme.decorations.map(d=>d.background).join(' '),backgroundColors=[...backgrounds.matchAll(/rgba?\([^)]+\)/g)].map(m=>rgba(m[0])).filter(Boolean);
    assert(backgroundColors.some(c=>c[0]>160&&c[0]>c[1]*1.3&&c[0]>c[2]*1.1),'The background contains saturated red');
    assert(backgroundColors.some(c=>c[1]>60&&c[1]>c[0]*1.1&&c[1]>c[2]*.8),'The background contains saturated green');
    const paper=rgba(installedTheme.surface);assert(paper&&paper.slice(0,3).reduce((a,b)=>a+b,0)/3>=235&&(paper[3]??1)>=.9,'Long pages use a light readable paper surface');
    const buttonColors=[...installedTheme.button.backgroundImage.matchAll(/rgba?\([^)]+\)/g)].map(m=>rgba(m[0]));
    if(!buttonColors.length)buttonColors.push(rgba(installedTheme.button.backgroundColor));
    const text=rgba(installedTheme.button.color),ratios=buttonColors.filter(Boolean).map(color=>contrast(text,color));
    assert(ratios.length&&Math.min(...ratios)>=4.5,'Primary action text remains readable on every gradient stop');
    report.theme_samples={decorations:installedTheme.decorations,surface:installedTheme.surface,primary_button_min_contrast:Math.min(...ratios)};
    check('Last inline layer supplies red/green colors, readable cards, and tap-safe waves');
    check('Reduced-motion preference stops all new background movements');
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const backgroundAnimations=await page.evaluate(names=>document.getAnimations().filter(a=>names.includes(a.animationName)).map(a=>({name:a.animationName,state:a.playState,duration:a.effect.getComputedTiming().duration})),themeAnimationNames);
    assert.strictEqual(backgroundAnimations.length,themeAnimationNames.length,'All decorative background animations start');
    assert(backgroundAnimations.every(a=>a.state==='running'&&a.duration>=20000),'New motion is slow and continuous');
    const boxes=()=>page.locator('.hero,.card').evaluateAll(nodes=>nodes.slice(0,4).map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};}));
    const initialBoxes=await boxes();await page.waitForTimeout(1200);const laterBoxes=await boxes();
    assert.strictEqual(initialBoxes.length,laterBoxes.length);
    initialBoxes.forEach((box,i)=>Object.keys(box).forEach(key=>assert(Math.abs(box[key]-laterBoxes[i][key])<=1,`Background movement must not shift card ${i}`)));
    report.theme_animations=backgroundAnimations;check('Slow background motion leaves cards and controls stationary');
    await page.emulateMedia({reducedMotion:'reduce'});
    const nav=await page.locator('.mobile-nav .nav-label').allTextContents();
    assert.deepStrictEqual(nav,['Inicio','Hábitos y planner','Manzanín','Exámenes']);check('Four approved mobile destinations retained');
    assert((await page.locator('body').evaluate(n=>getComputedStyle(n).fontFamily)).includes('Atkinson'));check('Original large Atkinson typography loaded');
    for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),`Horizontal overflow at ${width}`);}
    check('Home fits 320, 390, 768 and 1440 pixels');await capture('restored-home-1440.png');
    await page.setViewportSize({width:390,height:844});
    await page.locator('.mobile-nav [data-page="planner"]').click();
    await page.locator('#focus-dial').waitFor();
    assert(await page.locator('#focus-dial').evaluate(n=>{const r=n.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1;}),'Pomodoro stays inside the phone screen');
    await capture('restored-planner-390.png');
    await page.locator('[data-action="routineTab"][data-id="estrategias"]').click();
    assert((await page.locator('.routine-content').innerText()).length>150);check('Study strategies and Pomodoro restored');
    await page.locator('.mobile-nav [data-page="avatar"]').click();
    await page.locator('[data-action="avatarPose"][data-id="estudioso"]').click();
    // The large selected companion is the animated canvas, outside the cards.
    const selectedCanvas=()=>page.locator('#manzanin-showcase .manzanin-canvas[data-animate="true"]');
    const canvasSnapshot=async()=>{
      // Choosing a card scrolls the gallery into view; offscreen actors pause.
      await selectedCanvas().scrollIntoViewIfNeeded();
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      return selectedCanvas().evaluate(n=>n.toDataURL());
    };
    await page.evaluate(()=>window.AppSchoolingManzanin.ready());
    const student=await canvasSnapshot();
    await page.locator('[data-action="avatarPose"][data-id="explorador"]').click();
    const explorer=await canvasSnapshot();
    assert(student!==explorer,'Aventurero must differ even with reduced motion');check('Aventurero has its own complete resting artwork');
    await capture('restored-aventurero-390.png');
    await page.emulateMedia({reducedMotion:'no-preference'});
    const before=await canvasSnapshot();
    await page.waitForFunction(initial=>document.querySelector('#manzanin-showcase .manzanin-canvas').toDataURL()!==initial,before,{timeout:5000,polling:100});
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
    await capture('brand-examenes-390.png');
    const navigate=async target=>{
      if(target==='calma'){await page.locator('[data-action="go"][data-page="inicio"]:visible').first().click();}
      await page.locator(`[data-action="go"][data-page="${target}"]:visible`).first().click();
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    };
    for(const width of [320,390,768,1440]){
      await page.setViewportSize({width,height:950});
      for(const target of ['inicio','planner','avatar','examenes','calma','ajustes']){
        await navigate(target);
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),`Horizontal overflow at ${width}px on ${target}`);
        if(target==='planner')assert(await page.locator('#focus-dial').evaluate(n=>{const r=n.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1;}),`Pomodoro overflow at ${width}px`);
      }
    }
    check('Six sections fit phone, tablet, and desktop widths without hiding Pomodoro');
    await page.setViewportSize({width:390,height:844});await navigate('calma');await capture('brand-bienestar-390.png');await navigate('ajustes');await capture('brand-settings-390.png');
    await page.reload();await ready();
    assert.strictEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('appschooling_manzanin09')).profiles.find(p=>p.id===JSON.parse(localStorage.getItem('appschooling_manzanin09')).activeId).manzaninPose),'explorador');check('Profile remains after reload');
    assert.deepStrictEqual(errors,[],'No JavaScript page errors');assert.deepStrictEqual(failed,[],'No missing local assets');
    check('No browser exceptions or failed asset requests');
    report.success=true;await ctx.close();
  }finally{await browser.close();server.close();fs.writeFileSync(path.join(out,'browser-report.json'),JSON.stringify(report,null,2));}
}
main().then(()=>console.log(JSON.stringify(report))).catch(e=>{report.success=false;report.error=String(e.stack||e);fs.writeFileSync(path.join(out,'browser-report.json'),JSON.stringify(report,null,2));server.close();console.error(e);process.exitCode=1;});
