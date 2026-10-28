// One atomic local IndexedDB snapshot for committed business records and their uploaded files.
// Form, live-code and storefront publishers retain their existing, independent local stores.
const businessStorage={ready:false,busy:false,dirty:false,error:'',db:null,blobs:new Map(),last:'',queued:false,revision:0,conflict:false};
const businessAcademicKeys=['courses','classes','students','orders','attendance','refundApplications','refundRecords','accountTransactions','transferRecords','tempMoveRecords','lessonConsumptionRecords','lessonBalanceRecords','supplementRecords','couponClaims','renewalPeriods','renewalDiscounts'];
function businessSnapshot(){return JSON.parse(JSON.stringify({version:1,settings:{campuses:state.campuses,staff:state.staff,config:state.config,organization:state.organization,importHistory:state.importHistory},academic:Object.fromEntries(businessAcademicKeys.map(k=>[k,a[k]||[]])),leads:leadState.leads,communicationSummaries:[...studentCommunicationSummaries],trials:{requests:trialState.requests,sequence:trialState.sequence},permissions:{roles:permissionState.roles,logs:permissionState.logs},mall:{shelved:mallState.shelved,hiddenShelved:mallState.hiddenShelved,activities:mallState.activities,offered:mallShelfState.offered}},(key,value)=>['controller','signal','recorder','stream','file','busy','aiBusy'].includes(key)?undefined:value))}
function businessRestore(snapshot){
 if(!snapshot||snapshot.version!==1||!Array.isArray(snapshot.academic?.students)||!Array.isArray(snapshot.academic?.courses)||!Array.isArray(snapshot.settings?.campuses)||!Array.isArray(snapshot.leads))throw Error('invalid snapshot');
 Object.assign(state,snapshot.settings);for(const key of businessAcademicKeys)if(Array.isArray(snapshot.academic[key]))a[key]=snapshot.academic[key];
 if(!Array.isArray(snapshot.academic.renewalPeriods))a.renewalPeriods=[];
 if(!Array.isArray(snapshot.academic.renewalDiscounts))a.renewalDiscounts=[];
 leadState.leads=snapshot.leads;studentCommunicationSummaries.clear();for(const [key,value] of snapshot.communicationSummaries||[])studentCommunicationSummaries.set(key,value);Object.assign(trialState,snapshot.trials);Object.assign(permissionState,snapshot.permissions);
 if(typeof leadEnsureCampusAdminRole==='function')leadEnsureCampusAdminRole();
 permissionState.selected=permissionState.roles.some(r=>r.id===permissionState.selected)?permissionState.selected:permissionState.roles[0]?.id;
 permissionState.working=new Set(permissionRole(permissionState.selected)?.grants||[]);
 if(snapshot.mall){mallState.shelved=snapshot.mall.shelved||[];mallState.hiddenShelved=snapshot.mall.hiddenShelved||[];mallState.activities=snapshot.mall.activities||{};mallShelfState.offered=snapshot.mall.offered||{}}
 financeNormalizeLegacyLinks();
  demoUpgradeLedger();walletEnsureIds();mfReconcileLeads();
}
function businessStorageStatus(){const el=document.getElementById?.('business-storage-status');if(el){el.textContent=businessStorage.error?'本机保存失败 · '+businessStorage.error:!businessStorage.ready?'正在读取本机数据…':businessStorage.busy||businessStorage.dirty?'正在保存本机数据…':'业务数据已保存在本机';el.title=businessStorage.error?'请保留当前页面并释放浏览器空间后点击重试':'当前浏览器保存，其他设备不会自动同步';el.style.color=businessStorage.error?'#c33':'#71839a'}}
function businessBlobUrls(value,urls=new Set()){if(typeof value==='string'&&value.startsWith('blob:'))urls.add(value);else if(value&&typeof value==='object')for(const v of Object.values(value))businessBlobUrls(v,urls);return urls}
function businessReplaceUrls(value,map){if(typeof value==='string')return map.get(value)||value;if(Array.isArray(value))return value.map(v=>businessReplaceUrls(v,map));if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,businessReplaceUrls(v,map)]));return value}
async function businessSave(){
  if(!businessStorage.ready||!businessStorage.db||businessStorage.conflict)return false;
 businessStorage.dirty=true;if(businessStorage.busy)return false;
 businessStorage.busy=true;businessStorageStatus();
 try{while(businessStorage.dirty){businessStorage.dirty=false;const snapshot=businessSnapshot(),json=JSON.stringify(snapshot);if(json===businessStorage.last)continue;
  const attachments=[...businessBlobUrls(snapshot)].map(url=>({url,blob:businessStorage.blobs.get(url)})).filter(x=>x.blob);
   await new Promise((resolve,reject)=>{const tx=businessStorage.db.transaction('snapshots','readwrite'),store=tx.objectStore('snapshots'),read=store.get('current');read.onsuccess=()=>{if((read.result?.revision||0)!==businessStorage.revision){businessStorage.conflict=true;tx.abort();return}store.put({snapshot,attachments,generation:cleanStartGeneration,revision:businessStorage.revision+1,savedAt:new Date().toISOString()},'current')};tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('aborted'))});businessStorage.revision++;businessStorage.last=json;
  }businessStorage.error='';return true}catch(error){businessStorage.error=businessStorage.conflict?'其他页面已更新数据，请保留当前内容并刷新核对':error?.name==='QuotaExceededError'?'浏览器空间不足':'未能写入浏览器存储';return false}finally{businessStorage.busy=false;businessStorageStatus()}
}
function businessScheduleSave(){if(!businessStorage.ready||businessStorage.queued)return;businessStorage.queued=true;queueMicrotask(()=>{businessStorage.queued=false;businessSave()})}
async function businessInitialize(){
  cleanStartIdentity();
 if(!globalThis.indexedDB){businessStorage.error='浏览器不支持本机数据库';return}
 const create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);
 URL.createObjectURL=function(blob){const url=create(blob);businessStorage.blobs.set(url,blob);return url};
 URL.revokeObjectURL=function(url){revoke(url);/* Keep bytes until the next committed snapshot decides which files remain referenced. */};
 const bar=document.createElement('button');bar.id='business-storage-status';bar.type='button';bar.style.cssText='position:fixed;bottom:4px;right:12px;font-size:11px;border:0;background:#fff;padding:4px 8px;z-index:59;cursor:pointer';bar.onclick=()=>businessSave();document.body.appendChild(bar);businessStorageStatus();
 // Prevent a user action during asynchronous restore from being overwritten.
 const loading=document.createElement('div');loading.style.cssText='position:fixed;inset:0;background:#ffffffbb;z-index:10000;display:grid;place-items:center';loading.textContent='正在读取本机业务数据…';document.body.appendChild(loading);
 try{
  businessStorage.db=await new Promise((resolve,reject)=>{const request=indexedDB.open('crm-business-v1',1);request.onupgradeneeded=()=>request.result.createObjectStore('snapshots');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);request.onblocked=()=>reject(Error('database blocked'))});
  const record=await new Promise((resolve,reject)=>{const tx=businessStorage.db.transaction('snapshots','readonly'),req=tx.objectStore('snapshots').get('current');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});
   businessStorage.revision=record?.revision||0;
   if(record?.generation!==cleanStartGeneration)cleanStartReset();
   else{const mapping=new Map();for(const file of record.attachments||[]){const url=URL.createObjectURL(file.blob);mapping.set(file.url,url)}const snapshot=businessReplaceUrls(record.snapshot,mapping);businessStorage.last=JSON.stringify(snapshot);businessRestore(snapshot)}
  businessStorage.ready=true;render();await businessSave();
 }catch(error){businessStorage.error='读取失败，未覆盖原有本机数据';businessStorage.ready=false;console.error('CRM local storage:',error)}finally{loading.remove();businessStorageStatus()}
 if(!businessStorage.ready)return;
 for(const event of ['click','change','input','submit'])document.addEventListener(event,businessScheduleSave,true);
 for(const key of ['render','academicRender','leadRender','trialRender','mallRender','permissionRender','structureRender']){const previous=globalThis[key];if(typeof previous==='function')globalThis[key]=function(...args){const result=previous(...args);businessScheduleSave();return result}}
 // Async transcription/analysis may finish after the user leaves its page, without a render.
 setInterval(businessScheduleSave,3000);
 globalThis.addEventListener('beforeunload',event=>{if(businessStorage.ready&&JSON.stringify(businessSnapshot())!==businessStorage.last){businessStorage.dirty=true;businessScheduleSave()}if(businessStorage.busy||businessStorage.dirty||businessStorage.error){event.preventDefault();event.returnValue='数据尚未保存'}});
 globalThis.addEventListener('pagehide',businessScheduleSave);
}
// Non-browser logic tests intentionally opt out; the real browser suite verifies save/reload/files.
if(globalThis.indexedDB&&typeof document.addEventListener==='function')businessInitialize();
