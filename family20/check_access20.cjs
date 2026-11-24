const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const args=process.argv.slice(2),arg=name=>{const i=args.indexOf(name);return i>=0?args[i+1]:undefined};
const project=arg('--project');
const root=project?path.join(project,'app/src/main/assets/www'):(args[0]&&!args[0].startsWith('--')?args[0]:path.resolve('app/src/main/assets/www'));
const output=arg('--out')||path.resolve('qa-access20');fs.mkdirSync(output,{recursive:true});
const server=http.createServer((request,response)=>{
 const pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname);
 const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
 if(!file.startsWith(path.resolve(root)+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){response.writeHead(404).end();return;}
 const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.ttf':'font/ttf','.json':'application/json','.webmanifest':'application/manifest+json'};
 response.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(response);
});
(async()=>{
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const executablePath=process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined);
const browser=await chromium.launch({...(executablePath?{executablePath}:{}),headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const context=await browser.newContext({viewport:{width:390,height:760},isMobile:true,hasTouch:true});
await context.addInitScript(()=>{
 let status={configured:true,authorized:false,busy:false,email:'',error:''};
 const emit=()=>document.dispatchEvent(new CustomEvent('appschooling:access-status',{detail:status}));
 window.__accessMock={authorize(){status={...status,authorized:true,busy:false,email:'test-family@example.invalid',error:''};emit()},status:()=>status};
 window.__signInCalls=[];
 window.AppSchoolingNative={
  getAccessStatus:()=>JSON.stringify(status),
  signIn:(email,password)=>{window.__signInCalls.push({email,passwordLength:password.length});status={...status,busy:false,error:'No pudimos ingresar. Revisa tus datos o consulta al colegio por tu acceso.'};setTimeout(emit,40)},
  signOut:()=>{status={...status,authorized:false,email:'',busy:false,error:''};emit()},
  getNoticeStatus:()=>JSON.stringify({configured:true,permission:'granted',enabled:true,registration:'ready'}),
  getNotices:()=>JSON.stringify([]),markNoticeRead:()=>{},markAllNoticesRead:()=>{},openNoticeLink:()=>{},syncStudyReminders:()=>{},applyReminders:()=>{},requestNoticePermission:()=>{},openNoticeSettings:()=>{}
 };
});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(origin);await page.locator('#school-access').waitFor({state:'visible'});
await page.waitForFunction(()=>document.documentElement.dataset.appPage==='inicio');
assert.equal(await page.locator('#app').isVisible(),false,'app stays hidden while signed out');
assert.equal(await page.locator('#app').evaluate(e=>e.inert),true,'app is inert while signed out');
assert.equal(await page.locator('.mobile-nav').isVisible(),false,'navigation cannot bypass login');
await page.screenshot({path:path.join(output,'login-390.png')});
await page.locator('.access20-submit').click();
assert.match(await page.locator('.access20-status').textContent(),/Escribe tu correo/);
await page.locator('#access20-email').fill('test-family@example.invalid');
await page.locator('#access20-password').fill('qa-only-example');
await page.locator('.access20-show').click();assert.equal(await page.locator('#access20-password').getAttribute('type'),'text');
await page.locator('.access20-submit').click();await page.waitForFunction(()=>!document.querySelector('.access20-submit').disabled);
assert.match(await page.locator('.access20-status').textContent(),/No pudimos ingresar/);
assert.equal(await page.locator('#access20-password').inputValue(),'','password cleared after native call');
assert.equal(await page.locator('#app').isVisible(),false,'invalid credentials keep app closed');
assert.deepEqual(await page.evaluate(()=>window.__signInCalls),[{email:'test-family@example.invalid',passwordLength:15}]);
const stored=await page.evaluate(()=>JSON.stringify(Object.entries(localStorage)));assert(!stored.includes('qa-only-example'),'no password saved in local storage');
await page.evaluate(()=>window.__accessMock.authorize());await page.locator('#app').waitFor({state:'visible'});
assert.equal(await page.locator('#school-access').isVisible(),false);
await page.locator('.mobile-nav [data-page="ajustes"]').click();
await page.locator('[data-school-signout]').waitFor();assert.match(await page.locator('.access20-account-email').textContent(),/test-family/);
await page.locator('[data-school-signout]').click();await page.locator('#school-access').waitFor({state:'visible'});
assert.equal(await page.locator('#app').isVisible(),false,'logout closes app immediately');
assert.equal(await page.evaluate(()=>AppSchoolingAccess.back()),true,'Back stays on login');
const viewports=[];
for(const viewport of [{width:320,height:568},{width:360,height:640},{width:390,height:760},{width:800,height:360}]){
 await page.setViewportSize(viewport);
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no horizontal login overflow');
 await page.locator('.access20-submit').scrollIntoViewIfNeeded();assert(await page.locator('.access20-submit').isVisible());
 const info=await page.evaluate(()=>({width:innerWidth,height:innerHeight,scrollHeight:document.documentElement.scrollHeight}));viewports.push(info);
}
await page.setViewportSize({width:360,height:400});
await page.locator('#access20-password').focus();await page.locator('.access20-submit').scrollIntoViewIfNeeded();assert(await page.locator('.access20-submit').isVisible(),'login button reachable with short keyboard viewport');
assert.deepEqual(errors,[],'no application script errors');
const report={mock_ui_only:true,checks:['signed-out gate','invalid form','password visibility','wrong password denied','password cleared after native dispatch','no localStorage password','authorized session opens app','account shows verified email','logout closes app','Back stays inside login','320px+landscape+keyboard reachability'],viewports,errors};
fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));
await browser.close();await new Promise(resolve=>server.close(resolve));console.log(JSON.stringify(report));
})().catch(e=>{server.close();console.error(e);process.exit(1)});
