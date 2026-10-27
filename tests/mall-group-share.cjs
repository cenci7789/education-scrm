const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),nodes=new Map(),storage=new Map(),copied=[];
const node=k=>{if(!nodes.has(k))nodes.set(k,{value:'',innerHTML:'',textContent:'',classList:{add(){},remove(){},toggle(){}},querySelector(){return null},setAttribute(k,v){this[k]=v},focus(){},select(){}});return nodes.get(k)};
const ctx=vm.createContext({document:{querySelector:node,querySelectorAll(){return []},getElementById:id=>node('#'+id),execCommand(){return false}},setTimeout(){},setInterval(){},clearInterval(){},URL,URLSearchParams,btoa,atob,crypto:require('node:crypto').webcrypto,location:{href:'http://localhost:8080/index.html'},localStorage:{getItem:k=>storage.get(k)||null,setItem(k,v){storage.set(k,v)}},navigator:{clipboard:{async writeText(text){copied.push(text)}}}}),run=s=>vm.runInContext(s,ctx);
for(const m of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script(?: src="([^"]+)")?>([\s\S]*?)<\/script>/g)){if(m[1]==='mall-group-share.js')continue;run(m[1]?fs.readFileSync(path.join(root,m[1]),'utf8'):m[2])}
const joint=run("mallRowActions('joint',0)"),coupon=run("mallRowActions('coupon',0)");
run(fs.readFileSync(path.join(root,'mall-group-share.js'),'utf8'));
assert.equal(run("mallRowActions('joint',0)"),joint);assert.equal(run("mallRowActions('coupon',0)"),coupon);
run(`mallState.activities.group[0]={name:'秋季拼团 <测试>',start:'2030-09-01T09:00',end:'2030-10-01T09:00',status:'未开始',validHours:24,people:2,limit:'2人团',tiers:[{people:2,mode:'price',value:900},{people:5,mode:'discount',value:8.5}],products:['语文'],groupProducts:[{name:'语文课',price:1000,materialFee:20,classes:[{id:'private-id',teacherPhone:'13812345678'}]}],internalNotes:'不可公开'};state.page='mallGroup';render();groupShareOpen(0)`);
const page=node('#view').innerHTML;assert(page.includes('分享'));assert(page.includes('短链接'));assert(page.includes('原链接'));assert(page.includes('download="拼团推广二维码.gif"'));assert(page.includes('本机短链接'));
const original=run('groupShareState.current.original'),short=run('groupShareState.current.short'),payload=run('GroupShareCodec.resolve(groupShareState.current.original,localStorage)');
assert.equal(payload.name,'秋季拼团 <测试>');assert.equal(payload.tiers.length,2);assert.equal(payload.courses[0].materials,undefined);
assert.equal(run('GroupShareCodec.resolve(groupShareState.current.short,localStorage).name'),payload.name);
assert(!JSON.stringify(payload).includes('13812345678'));assert(!JSON.stringify(payload).includes('不可公开'));
assert(run('groupShareState.current.qrImage').startsWith('data:image/gif;base64,'));assert(short.length<original.length);
for(const m of page.matchAll(/\bonclick="([^"]*)"/g))new vm.Script('(function(){'+m[1].replaceAll('&quot;','"').replaceAll('&#39;',"'").replaceAll('&amp;','&')+'})');
(async()=>{
 assert.equal(await run("groupShareCopy('short')"),true);assert.equal(copied.at(-1),short);
 assert.equal(await run("groupShareCopy('original')"),true);assert.equal(copied.at(-1),original);
 ctx.navigator.clipboard.writeText=async()=>{throw Error('denied')};assert.equal(await run("groupShareCopy('original')"),false);assert(node('#group-share-copy-status').textContent.includes('Ctrl+C'));
 run('groupShareClose()');assert(!node('#view').innerHTML.includes('group-share-modal'));assert.equal(await run("groupShareCopy('short')"),false);
 // Original link works independently of local short-link storage, and is escaped in the preview.
 ctx.location.href=original;ctx.localStorage.getItem=()=>{throw Error('storage unavailable')};run(fs.readFileSync(path.join(root,'group-share-preview.js'),'utf8'));
 assert(node('#group-share-view').innerHTML.includes('秋季拼团 &lt;测试&gt;'));assert(!node('#group-share-view').innerHTML.includes('<测试>'));
 ctx.location.href=short;run(fs.readFileSync(path.join(root,'group-share-preview.js'),'utf8'));assert(node('#group-share-view').innerHTML.includes('暂时无法打开活动'));
 ctx.location.href='http://localhost:8080/index.html';ctx.localStorage.setItem=()=>{throw Error('quota')};run('groupShareOpen(0)');assert.equal(run('groupShareState.current.short'),'');assert(run('groupShareState.current.original').length>0);assert(node('#view').innerHTML.includes('暂不能生成本机短链接'));
 run("groupShareClose();permissionState.identity='finance';groupShareOpen(0)");assert.equal(run('groupShareState.current'),null);
 console.log('PASS: group-only share action, local short/original resolution, public-only snapshot, real QR generation/download, clipboard success/failure, preview escaping, storage failure, permissions.');
})().catch(e=>{console.error(e);process.exitCode=1});
