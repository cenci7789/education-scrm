// Bounded UI traversal: all menu roots and unique controls through three interactions.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const root=path.resolve(__dirname,'..'),out=path.join(root,'.artifact-work/audit');
const stable=value=>String(value).replace(/\b(?:MF|f)\d{10,}[\w-]*/g,'field-id').replace(/COURSE-[\w-]+/g,'course-id');
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const server=http.createServer((req,res)=>{try{let f=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!f.startsWith(root+path.sep))throw Error('path');if(fs.statSync(f).isDirectory())f=path.join(f,'index.html');res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css'})[path.extname(f)]||'application/octet-stream');res.end(fs.readFileSync(f))}catch{res.writeHead(404).end()}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 const results=process.argv.includes('--resume')?JSON.parse(fs.readFileSync(path.join(out,'browser-controls-initial.json'))).results:[],completed=new Set(results.map(r=>r.route));
 try{
  browser=await chromium.launch({headless:true,channel:'msedge'});const url='http://127.0.0.1:'+server.address().port+'/index.html';
  const discovery=await browser.newPage();await discovery.goto(url);const all=await discovery.locator('.menu-item[data-page]').evaluateAll(els=>els.map(e=>e.dataset.page));await discovery.close();
  const routes=all.filter(r=>!completed.has(r)&&(!process.env.AUDIT_ROUTES||process.env.AUDIT_ROUTES.split(',').includes(r)));
  async function worker(){
   const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
   await context.addInitScript(()=>{Object.defineProperty(window,'indexedDB',{value:undefined});localStorage.clear()});
   const page=await context.newPage(),errors=[];page.setDefaultTimeout(1500);page.on('dialog',d=>d.accept());page.on('popup',p=>p.close());page.on('pageerror',e=>errors.push(e.message));page.on('filechooser',c=>c.setFiles([]));
   async function controls(){return page.locator('#view button,#view summary,#view a[onclick],#view input[type=radio],#view input[type=checkbox],#view select,#batch-import-host button,#coupon-claim-host button,#coupon-claim-host select').evaluateAll(els=>{
    document.querySelectorAll('[data-audit-control]').forEach(e=>e.removeAttribute('data-audit-control'));
    const visible=e=>e.checkVisibility()&&!e.closest('[hidden]')&&(!e.closest('details:not([open])')||e.tagName==='SUMMARY');
    const modal=[...document.querySelectorAll('.modal-backdrop,.mfw-modal-backdrop')].filter(visible).at(-1);
    return els.filter(e=>visible(e)&&(!modal||modal.contains(e))).map((e,i)=>{e.dataset.auditControl=i;return {i,text:(e.textContent||e.getAttribute('aria-label')||e.id||e.name||'').trim().slice(0,80),tag:e.tagName,type:e.type,identity:e.id||(e.name?e.name+':'+e.value:''),handler:e.getAttribute('onclick')||e.getAttribute('onchange')||'',disabled:e.disabled,options:e.tagName==='SELECT'?[...e.options].filter(o=>!o.disabled).map(o=>o.value):[]}})
   })}
   async function act(c){const el=page.locator('[data-audit-control="'+c.i+'"]');if(c.tag==='SELECT')await el.selectOption(c.value);else if(c.type==='checkbox'&&await el.evaluate(e=>!!e.closest('label.switch')))await el.locator('..').click();else await el.click();await page.waitForTimeout(10)}
   for(let route;(route=routes.shift());){
    const queue=[[]],seen=new Set(),routeResults=[];
    while(queue.length){
     const chain=queue.shift();await page.goto(url);await page.evaluate(id=>{state.page=id;state.mode='list';render()},route);let failed=false;
     for(const step of chain){const match=(await controls()).find(c=>stable(c.handler)===stable(step.handler)&&c.text===step.text&&c.tag===step.tag&&stable(c.identity)===stable(step.identity));
      if(!match){routeResults.push({route,chain,control:step,status:'replay-changed',errors:errors.splice(0)});failed=true;break}
      try{await act({...match,value:match.tag==='SELECT'?match.options[step.optionIndex]:step.value})}catch(e){routeResults.push({route,chain,control:step,status:'click-failed',detail:e.message.slice(0,500),errors:errors.splice(0)});failed=true;break}
     }
     if(failed)continue;
     const list=await controls(),scope=await page.locator('#view h1,#view h2,.modal-head').allTextContents();
     for(const control of list)for(const c of control.tag==='SELECT'?control.options.map((value,optionIndex)=>({...control,value,optionIndex})).filter(c=>c.value).slice(0,5):[control]){
      const key=JSON.stringify([scope,c.tag,chain.length?stable(c.handler).replace(/\d+/g,'#').replace(/(LEAD|CLAIM|course-session|learning)-[\w-]+/g,'$1-#'):c.handler,chain.length&&c.handler?'':c.text,c.handler?'':stable(c.identity),c.optionIndex]);
      if(seen.has(key))continue;seen.add(key);
      if(c.disabled)routeResults.push({route,chain,control:c,status:'disabled'});
      else if(/^(?:window\.open|location\.)/.test(c.handler))routeResults.push({route,chain,control:c,status:'external'});
      else if(chain.length<3)queue.push([...chain,c]);
      else routeResults.push({route,control:c,status:'depth-limit'});
     }
     if(chain.length)routeResults.push({route,chain:chain.slice(0,-1),control:chain.at(-1),status:'clicked',errors:errors.splice(0),feedback:await page.locator('#toast').textContent()});
    }
    results.push(...routeResults);completed.add(route);console.log(route+': '+routeResults.filter(r=>r.status==='clicked').length+' clicked, '+routeResults.filter(r=>r.errors?.length).length+' errors, '+routeResults.filter(r=>r.status==='click-failed').length+' click failures');
    fs.writeFileSync(path.join(out,'browser-controls-final.json'),JSON.stringify({results,completed:[...completed],errors:[]},null,2));
   }
   await context.close();
  }
  await Promise.all(Array.from({length:4},worker));console.log('TOTAL',results.length,'ROUTES',completed.size,'ERRORS',results.filter(r=>r.errors?.length).length);if(results.some(r=>r.errors?.length||r.status==='click-failed'))process.exitCode=1;
 }finally{await browser?.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exitCode=1});
