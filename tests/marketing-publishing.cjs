const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {run,json,node,ctx,root,copies,storage}=require('./prototype-runtime.cjs')();
(async()=>{
 run("mfNew();mfwSetForm('title','发布表单');mfPublish()");assert.equal(await run('mfCopyLink()'),true);assert(copies.at(-1).includes('form='));const qr=run('mfwPublishQR()');run('mfwQRStyle()');assert.notEqual(run('mfwPublishQR()'),qr);
 run("mfNewDownload();mfChooseResource({name:'资料.pdf',type:'application/pdf',size:12});mfNew()");await new Promise(resolve=>setImmediate(resolve));assert.equal(run('mfState.draft.settings.download'),undefined,'late resource load cannot modify another draft');
 run("mfNewDownload();mfChooseResource({name:'资料.pdf',type:'application/pdf',size:12})");await new Promise(resolve=>setImmediate(resolve));assert.equal(run('mfState.draft.settings.download.fileName'),'资料.pdf');run('mfPublish()');assert.equal(run('mfState.draft.status'),'已发布');
 run("wxLiveNew();wxLiveSet('type','personal')");await run("wxLiveUpload([{name:'微信.png',type:'image/png',size:12}])");assert.equal(run('wxLive.draft.codes.length'),1);run("wxLiveSet('name','个人活码');wxLiveSet('title','联系老师');wxLiveSet('guide','长按添加');wxLiveSave()");const id=run('wxLive.items[0].id');assert.equal(await run('wxLiveCopy()'),true);assert(copies.at(-1).includes('wechat-live.html?id='));
 run('wxLiveNew()');const upload=run("wxLiveUpload([{name:'取消.png',type:'image/png',size:12}])");run('wxLiveNav()');await upload;assert.equal(run('wxLive.draft'),null,'late QR load does not resurrect cancelled drafts');assert.equal(run('wxLive.items.length'),1);
 // Exercise the actual standalone landing script against the saved local activity.
 const htmlNode={innerHTML:''},landing=vm.createContext({URL,Date,location:{href:'http://localhost/wechat-live.html?id='+id},localStorage:ctx.localStorage,document:{getElementById:()=>htmlNode,title:''}});
 vm.runInContext(fs.readFileSync(path.join(root,'wechat-live-runtime.js'),'utf8'),landing);vm.runInContext(fs.readFileSync(path.join(root,'wechat-live-landing.js'),'utf8'),landing);
 assert(htmlNode.innerHTML.includes('微信二维码'));assert.equal(JSON.parse(storage.get('crm-wechat-livecodes-v1'))[0].events.length,1);
 run(`wxLiveEdit('${id}');wxLiveSet('type','tagged');wxLiveSet('groupName','学习群');wxLive.draft.tags=['一年级'];wxLive.draft.codes[0].tag='一年级';wxLive.draft.codes[0].expires='2099-01-01';wxLiveSave()`);
 const groupLanding=vm.createContext({URL,Date,location:{href:'http://localhost/wechat-live.html?id='+id},localStorage:ctx.localStorage,document:{getElementById:()=>htmlNode,title:''}});
 vm.runInContext(fs.readFileSync(path.join(root,'wechat-live-runtime.js'),'utf8'),groupLanding);vm.runInContext(fs.readFileSync(path.join(root,'wechat-live-landing.js'),'utf8'),groupLanding);assert(htmlNode.innerHTML.includes('请选择分组标签'));assert.equal(JSON.parse(storage.get('crm-wechat-livecodes-v1'))[0].events.length,1,'no visit before choosing a tag');vm.runInContext('wxLandingChoose(0)',groupLanding);assert(htmlNode.innerHTML.includes('微信二维码'));assert.equal(JSON.parse(storage.get('crm-wechat-livecodes-v1'))[0].events.length,2);
 console.log('PASS: clipboard/QR variants, download and QR asynchronous upload guards, real standalone landing, local visit persistence and tag selection.');
})().catch(error=>{console.error(error);process.exitCode=1});
