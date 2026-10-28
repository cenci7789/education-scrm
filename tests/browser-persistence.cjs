const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),http=require('http');
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const root=path.resolve(__dirname,'..');
(async()=>{const server=http.createServer((req,res)=>{try{let p=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!p.startsWith(root+path.sep))throw Error('path');if(fs.statSync(p).isDirectory())p=path.join(p,'index.html');res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css'})[path.extname(p)]||'application/octet-stream');res.end(fs.readFileSync(p))}catch{res.writeHead(404).end()}});await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;try{
 browser=await chromium.launch({channel:'msedge',headless:true});const context=await browser.newContext(),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());const url=process.argv.includes('--file')?require('url').pathToFileURL(path.join(root,'index.html')).href:'http://127.0.0.1:'+server.address().port+'/index.html';await page.goto(url);await page.waitForFunction(()=>businessStorage.ready&&!businessStorage.busy);
 assert.equal(await page.evaluate(()=>a.orders.length),0);
 await page.evaluate(()=>{state.campuses=[{name:'保存测试校区',active:true,classrooms:[]}];a.orders=[{id:'PERSIST-ORDER',studentId:'PERSIST-STUDENT',status:'交易成功',amount:'¥100.00',paid:'¥100.00',items:[],receipts:[{channel:'现金',amountCents:10000,proofs:[]}]}];a.students=[{id:'PERSIST-STUDENT',name:'保存测试学生',phone:'13855550000',enrollments:[]}]});
 await page.evaluate(()=>{state.page='staff';render();batchImportOpen('staff')});
 const csv=await page.evaluate(()=>batchImportSchemas.staff.headers.join(',')+'\n本机保存测试,13855556666,女,'+state.campuses.find(c=>c.active).name+','+permissionState.roles.find(r=>r.active&&r.id!=='admin').name+',已启用');
 await page.locator('#batch-import-text').fill(csv);await page.getByRole('button',{name:'校验并预览',exact:true}).click();await page.getByRole('button',{name:'确认导入',exact:true}).click();await page.evaluate(()=>businessSave());await page.waitForFunction(()=>!businessStorage.busy);
 assert.equal(await page.evaluate(()=>state.staff.filter(s=>s.phone==='13855556666').length),1);
 await page.evaluate(()=>{const blob=new Blob(['persistent receipt'],{type:'text/plain'});a.orders[0].receipts[0].proofs=[{fileName:'receipt.txt',url:URL.createObjectURL(blob)}];state.organization={name:'刷新测试机构',province:'江苏省',city:'苏州市'};return businessSave()});await page.waitForFunction(()=>!businessStorage.busy);
 await page.reload();await page.waitForFunction(()=>businessStorage.ready&&!businessStorage.busy);
 assert.equal(await page.evaluate(()=>state.staff.filter(s=>s.phone==='13855556666').length),1);assert.equal(await page.evaluate(()=>state.organization.name),'刷新测试机构');assert.equal(await page.evaluate(async()=>await(await fetch(a.orders[0].receipts[0].proofs[0].url)).text()),'persistent receipt');assert.equal(await page.evaluate(()=>state.importHistory.length),1);
 // A second tab cannot silently overwrite records saved since it opened.
 const second=await context.newPage();second.on('dialog',d=>d.accept());await second.goto(url);await second.waitForFunction(()=>businessStorage.ready&&!businessStorage.busy);
 // Reload first so both share the current revision, then edit second and finally stale first.
 await page.reload();await page.waitForFunction(()=>businessStorage.ready&&!businessStorage.busy);
 await second.reload();await second.waitForFunction(()=>businessStorage.ready&&!businessStorage.busy);
 await second.evaluate(()=>{state.organization.name='另页最新';return businessSave()});await second.waitForFunction(()=>!businessStorage.busy);
 assert.equal(await page.evaluate(()=>{state.organization.name='过期覆盖';return businessSave()}),false);assert.equal(await page.evaluate(()=>businessStorage.conflict),true);
 await page.reload();await page.waitForFunction(()=>businessStorage.ready&&!businessStorage.busy);assert.equal(await page.evaluate(()=>state.organization.name),'另页最新');assert.deepEqual(errors,[]);
 console.log('PASS browser: actual CSV preview/commit, IndexedDB reload, uploaded blob restoration, import history, cross-tab stale-write protection.');
 }finally{await browser?.close();await new Promise(r=>server.close(r))}})().catch(e=>{console.error(e);process.exitCode=1});
