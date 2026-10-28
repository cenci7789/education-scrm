const assert=require('node:assert/strict'),path=require('node:path');
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},timezoneId:'Asia/Shanghai'}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.clock.setFixedTime(new Date('2026-10-25T12:00:00+08:00'));
 await page.goto(require('node:url').pathToFileURL(path.resolve(__dirname,'../index.html')).href);await page.waitForFunction(()=>businessStorage.ready&&!businessStorage.busy);
 await page.evaluate(()=>{permissionChangeIdentity('admin');leadState.leads=[{leadId:'completion-test',name:'沟通测试',phone:'13845670123',grade:'1年级',subject:'数学',intent:'中意向',stage:'新线索',status:'assigned',owner:'管理员',registrar:'管理员',history:[]}];leadDetail(0,'myLeads')});
 const count=()=>page.evaluate(()=>leadState.leads[0].history.length);
 assert.equal(await page.locator('.lead-detail-dock').evaluate(el=>getComputedStyle(el).position),'fixed');
 assert.equal(await page.locator('.lead-follow-card').count(),0);
 await page.getByRole('button',{name:'去沟通',exact:true}).click();
 for(const name of ['企微沟通','话务呼叫','上传沟通记录'])assert.equal(await page.getByRole('button',{name,exact:true}).count(),1);
 await page.getByRole('button',{name:'话务呼叫',exact:true}).click();await page.getByRole('button',{name:'完成沟通',exact:true}).click();
 assert.match(await page.locator('#communication-upload-status').innerText(),/待接入/);
 assert.match(await page.locator('#communication-ai-status').innerText(),/待接入/);
 assert(await page.locator('#lead-record-note').isVisible());
 await page.locator('#lead-record-note').fill('家长明确希望参加试听，保留沟通说明。');
 await page.locator('#communication-result').selectOption('有效沟通');await page.locator('#communication-intent').selectOption('高意向');await page.locator('#communication-reason').fill('家长主动确认试听');
  assert.equal(await page.locator('#communication-next-action').count(),0);assert.equal(await page.locator('.lead-completion-actions [data-completion-action]').count(),5);assert.equal(await page.locator('[data-completion-action="colleague"]').count(),0);
  await page.locator('[data-completion-action="follow"]').click();assert(await page.locator('#follow-time').isVisible());await page.locator('#communication-next-time').getByRole('button',{name:'取消',exact:true}).click();assert.equal(await count(),0);assert.equal(await page.locator('#lead-record-note').inputValue(),'家长明确希望参加试听，保留沟通说明。');
  await page.locator('[data-completion-action="follow"]').click();await page.locator('#lead-record-save').click();assert.equal(await count(),0);
 await page.locator('#follow-time').fill('2026-10-24T12:00');await page.locator('#lead-record-save').click();assert.equal(await count(),0);
 await page.locator('#follow-time').fill('2026-10-26T12:00');await page.locator('#lead-record-save').click();assert.equal(await count(),1);
 assert.equal(await page.evaluate(()=>leadState.leads[0].next),'2026-10-26 12:00');assert.equal(await page.evaluate(()=>leadState.leads[0].intent),'高意向');
 assert.match(await page.locator('.lead-history-section').innerText(),/保留沟通说明/);
 // Each required next action routes into the existing business flow only after saving.
 for(const action of ['trial','enroll','publicPool','cold']){
  await page.evaluate(()=>{leadDetail(0,'myLeads');leadOpenUpload('其他',true)});
  const before=await count();await page.locator('[data-completion-action="'+action+'"]').click();assert.equal(await count(),before);assert.equal(await page.evaluate(()=>state.page),'leadDetail');
  await page.locator('#lead-record-note').fill('安排下一步：'+action);await page.locator('#communication-result').selectOption('未接通');
  assert(!(await page.locator('#follow-time').isVisible()));await page.locator('[data-completion-action="'+action+'"]').click();assert.equal(await count(),before+1);
  assert.equal(await page.evaluate(()=>leadState.leads[0].history.filter(x=>x[3]?.communication).at(-1)[3].communication.nextAction),action);
  const route=await page.evaluate(()=>({page:state.page,modal:leadState.modal}));
  if(action==='trial')assert.equal(route.page,'quickTrial');else if(action==='enroll')assert(['quickEnroll','enroll'].includes(route.page));else assert.equal(route.modal,action);
 }
 // A cancelled completion never changes the lead.
 await page.evaluate(()=>{leadDetail(0,'myLeads');leadStartCommunication('企微');leadCompleteCommunication()});const beforeCancel=await count();await page.locator('#lead-record-note').fill('取消内容');await page.locator('.lead-modal').getByRole('button',{name:'取消',exact:true}).click();assert.equal(await count(),beforeCancel);
 // Deferred AI replies preserve manual edits and cannot affect a closed draft.
 await page.evaluate(()=>{leadOpenUpload('其他',true);globalThis.crmAnalyzeCommunication=()=>new Promise(resolve=>globalThis.resolveAnalysis=resolve);document.querySelector('#lead-record-note').value='用于判断的沟通';leadAnalyzeCommunication()});
 await page.locator('#communication-result').selectOption('有效沟通');await page.locator('#communication-intent').selectOption('低意向');await page.locator('#communication-reason').fill('人工核对');
 await page.evaluate(()=>resolveAnalysis({result:'有效沟通',intent:'高意向',reason:'AI 判断'}));await page.waitForFunction(()=>document.querySelector('#communication-ai-status').textContent.includes('已完成'));
 assert.equal(await page.locator('#communication-intent').inputValue(),'低意向');assert.equal(await page.locator('#communication-reason').inputValue(),'人工核对');
 await page.evaluate(()=>{leadAnalyzeCommunication();leadCloseUpload();leadOpenUpload('其他',true);resolveAnalysis({result:'有效沟通',intent:'无意向',reason:'过期结果'})});assert.equal(await page.locator('#communication-result').inputValue(),'');
 await page.evaluate(async()=>{globalThis.crmAnalyzeCommunication=async()=>({result:'有效沟通',intent:'中意向',reason:'需要考虑时间'});document.querySelector('#lead-record-note').value='等待安排时间';await leadAnalyzeCommunication()});
 assert.equal(await page.locator('#communication-result').inputValue(),'有效沟通');assert.equal(await page.locator('#communication-intent').inputValue(),'中意向');assert.equal(await page.locator('#communication-reason').inputValue(),'需要考虑时间');
 await page.evaluate(async()=>{globalThis.crmAnalyzeCommunication=async()=>{throw Error('offline')};await leadAnalyzeCommunication()});assert.match(await page.locator('#communication-ai-status').innerText(),/判断失败/);assert.equal(await page.locator('#communication-intent').inputValue(),'中意向');
 // Record callbacks show uploading, block save until completion, and append to existing notes.
 await page.evaluate(()=>{leadCloseUpload();delete globalThis.crmAnalyzeCommunication;globalThis.crmCollectCommunication=()=>new Promise(resolve=>globalThis.resolveCollection=resolve);leadStartCommunication('电话');leadCompleteCommunication()});
 assert.match(await page.locator('#communication-upload-status').innerText(),/正在上传/);
  await page.locator('#lead-record-note').fill('人工补充');await page.locator('#communication-result').selectOption('未接通');const beforeUpload=await count();await page.locator('[data-completion-action="trial"]').click();assert.equal(await count(),beforeUpload);
 await page.evaluate(()=>resolveCollection({text:'接口回传记录'}));await page.waitForFunction(()=>document.querySelector('#communication-upload-status').textContent.includes('已上传'));assert.equal(await page.locator('#lead-record-note').inputValue(),'人工补充\n\n接口回传记录');
  assert(!(await page.locator('#lead-record-notice').isVisible()));await page.locator('.lead-completion-actions').scrollIntoViewIfNeeded();await page.screenshot({path:path.resolve(__dirname,'../.artifact-work/lead-completion.png')});await page.locator('[data-completion-action="follow"]').click();await page.locator('#follow-time').fill('2026-10-27T12:00');await page.locator('#lead-record-save').click();assert.equal(await count(),beforeUpload+1);
 // Persisted communication, selected next action and notes survive reload.
 await page.waitForTimeout(4000);await page.reload();await page.waitForFunction(()=>businessStorage.ready&&!businessStorage.busy);
 assert.equal(await count(),beforeUpload+1);assert.equal(await page.evaluate(()=>leadState.leads[0].history.at(-1)[3].communication.nextAction),'follow');
 assert.deepEqual(errors,[]);console.log('PASS browser: fixed actions, three channels, required next step/time, all five current routes, retained notes, cancellation, AI manual/stale response guards, upload blocking/append, reload persistence.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
