const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),nodes=new Map(),storage=new Map(),copied=[];
const node=k=>{if(!nodes.has(k))nodes.set(k,{value:'',innerHTML:'',textContent:'',classList:{add(){},remove(){},toggle(){}},querySelector(){return null},setAttribute(k,v){this[k]=v},focus(){},select(){}});return nodes.get(k)};
const ctx=vm.createContext({document:{querySelector:node,querySelectorAll(){return []},getElementById:id=>node('#'+id),execCommand(){return false}},setTimeout(){},setInterval(){},clearInterval(){},URL,URLSearchParams,btoa,atob,crypto:require('node:crypto').webcrypto,location:{href:'http://localhost:8080/index.html'},localStorage:{getItem:k=>storage.get(k)||null,setItem(k,v){storage.set(k,v)}},navigator:{clipboard:{async writeText(text){copied.push(text)}}}}),run=s=>vm.runInContext(s,ctx);
for(const m of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script(?: src="([^"]+)")?>([\s\S]*?)<\/script>/g)){if(m[1]==='mall-joint-share.js')continue;run(m[1]?fs.readFileSync(path.join(root,m[1]),'utf8'):m[2])}
const group=run("mallRowActions('group',0)"),coupon=run("mallRowActions('coupon',0)");
run(fs.readFileSync(path.join(root,'mall-joint-share.js'),'utf8'));
assert.equal(run("mallRowActions('group',0)"),group);assert.equal(run("mallRowActions('coupon',0)"),coupon);
run(`mallState.activities.joint[0]={name:'秋季联报 <测试>',start:'2030-09-01T09:00',end:'2030-10-01T09:00',status:'未开始',rules:[{quantity:1,mode:'reduction',value:100},{quantity:2,mode:'discount',value:8.5}],participants:['在读学员','历史学员'],stackCoupon:true,products:['语文'],jointProducts:[{name:'语文课',price:1000,materialFee:20,classes:[{id:'private-id',teacherPhone:'13812345678'}]}],internalNotes:'不可公开'};state.page='mallJoint';render();jointShareOpen(0)`);
const page=node('#view').innerHTML;assert(page.includes('分享'));assert(page.includes('短链接'));assert(page.includes('原链接'));assert(page.includes('download="联报推广二维码.gif"'));assert(page.includes('本机短链接'));
const original=run('jointShareState.current.original'),short=run('jointShareState.current.short'),payload=run('JointShareCodec.resolve(jointShareState.current.original,localStorage)');
assert.equal(payload.name,'秋季联报 <测试>');assert.equal(payload.rules.length,2);assert.equal(payload.courses[0].materials,undefined);assert.equal(payload.version,2);assert.equal(payload.stackCoupon,true);assert(!('hours' in payload));assert(!('tiers' in payload));
assert.equal(run('JointShareCodec.resolve(jointShareState.current.short,localStorage).name'),payload.name);
assert(!JSON.stringify(payload).includes('13812345678'));assert(!JSON.stringify(payload).includes('不可公开'));
assert(run('jointShareState.current.qrImage').startsWith('data:image/gif;base64,'));assert(short.length<original.length);
for(const m of page.matchAll(/\bonclick="([^"]*)"/g))new vm.Script('(function(){'+m[1].replaceAll('&quot;','"').replaceAll('&#39;',"'").replaceAll('&amp;','&')+'})');
(async()=>{
 assert.equal(await run("jointShareCopy('short')"),true);assert.equal(copied.at(-1),short);
 assert.equal(await run("jointShareCopy('original')"),true);assert.equal(copied.at(-1),original);
 ctx.navigator.clipboard.writeText=async()=>{throw Error('denied')};assert.equal(await run("jointShareCopy('original')"),false);assert(node('#joint-share-copy-status').textContent.includes('Ctrl+C'));
 run('jointShareClose()');assert(!node('#view').innerHTML.includes('joint-share-modal'));assert.equal(await run("jointShareCopy('short')"),false);
 // Original link works independently of local short-link storage, and is escaped in the preview.
 ctx.location.href=original;ctx.localStorage.getItem=()=>{throw Error('storage unavailable')};run(fs.readFileSync(path.join(root,'joint-share-preview.js'),'utf8'));
 assert(node('#joint-share-view').innerHTML.includes('秋季联报 &lt;测试&gt;'));assert(!node('#joint-share-view').innerHTML.includes('<测试>'));assert(node('#joint-share-view').innerHTML.includes('报名班级数量≥2 · 总价8.5折'));assert(node('#joint-share-view').innerHTML.includes('在读学员、历史学员'));assert(!node('#joint-share-view').innerHTML.includes('成团'));assert(!node('#joint-share-view').innerHTML.includes('有效期'));
 ctx.location.href=short;run(fs.readFileSync(path.join(root,'joint-share-preview.js'),'utf8'));assert(node('#joint-share-view').innerHTML.includes('暂时无法打开活动'));
 ctx.location.href='http://localhost:8080/index.html';ctx.localStorage.setItem=()=>{throw Error('quota')};run('jointShareOpen(0)');assert.equal(run('jointShareState.current.short'),'');assert(run('jointShareState.current.original').length>0);assert(node('#view').innerHTML.includes('暂不能生成本机短链接'));
 run("jointShareClose();permissionState.identity='finance';jointShareOpen(0)");assert.equal(run('jointShareState.current'),null);
 console.log('PASS: joint-only share action, local short/original resolution, public-only snapshot, real QR generation/download, clipboard success/failure, preview escaping, storage failure, permissions.');
})().catch(e=>{console.error(e);process.exitCode=1});
