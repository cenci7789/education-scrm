const assert=require('node:assert/strict');
const {File}=require('node:buffer');
const {run,node,page,context}=require('./lead-registration.cjs');
let sequence=0,stops=0;const revoked=[];
context.URL={createObjectURL:()=>`blob:registration-${++sequence}`,revokeObjectURL:url=>revoked.push(url)};
context.AbortController=AbortController;context.File=File;
run("permissionChangeIdentity('admin');state.page='quickRegister';render()");
function open(){run('leadOpenForm()');node('#lead-name').value='';node('#lead-note').value=''}
function fill(){node('#lead-name').value='资料登记学生';node('#lead-phone').value='13812345678';node('#lead-note').value='家长招生数学'}
function add(){run("leadAddRecordFiles([{name:'需求截图.png',size:100,type:'image/png'}],'image')")}
async function test(){
  open();assert(!page().includes('modal-backdrop'));assert(page().includes('lead-registration-record'));
  assert(page().includes('上传图片'));assert(page().includes('直接录音'));assert(page().includes('上传语音'));
  assert(page().includes('id="lead-note"'));assert(!page().includes('id="lead-record-note"'));
  const before=run('leadState.leads.length');add();const url=run('leadRecordDraft.items[0].url');
  run('saveLead()');assert.equal(run('leadState.leads.length'),before);
  assert.equal(run('leadRecordDraft.items.length'),1);assert(!revoked.includes(url));
  fill();run("leadSwitchRegistration('import');leadSwitchRegistration('single')");
  assert.equal(node('#lead-note').value,'家长招生数学');assert.equal(run('leadRecordDraft.items.length'),1);
  let resolve;
  context.crmTranscribeAttachment=()=>new Promise(r=>{resolve=r});
  const task=run('leadTranscribeRecord(leadRecordDraft.items[0].id)');
  assert.equal(node('#lead-registration-save').disabled,true);
  run('saveLead()');assert.equal(run('leadState.leads.length'),before);
  node('#lead-note').value='识别期间手动补充';resolve({text:'截图文字'});await task;
  assert.equal(node('#lead-note').value,'识别期间手动补充\n\n截图文字');
  run('saveLead()');assert.equal(run('state.page'),'quickRegister');
  assert.equal(run('leadState.leads[0].note'),'识别期间手动补充\n\n截图文字');
  assert.equal(run('leadState.leads[0].history.length'),1);
  assert.equal(run('leadState.leads[0].history[0][0]'),'建档');
  assert.equal(run('leadState.leads[0].history.at(-1)[3].files[0].url'),url);
  assert(!revoked.includes(url));assert.equal(run('leadRecordDraft'),null);
  assert.equal(run('leadState.leads[0].registrar'),'王敏');
  run("leadDetail(0,'myLeads')");assert(page().includes('需求截图.png'));assert(page().includes('截图文字'));

  run("leadOpenForm('edit')");assert.equal(run('state.page'),'leadDetail');
  assert.equal(run('leadRecordDraft.context'),'basicEdit');assert.equal(run('leadRecordDraft.note'),'');
  assert(!page().includes('id="lead-note"'));assert(page().includes('id="lead-edit-note"'));
  const historyCount=run('leadState.leads[0].history.length');
  const savedNote=run('leadState.leads[0].note');
  node('#lead-note').value='不应写入基本信息';run('saveLead()');
  assert.equal(run('leadState.leads[0].note'),savedNote);
  assert.equal(run('leadState.leads[0].history.length'),historyCount);
  run('leadOpenUpload()');add();const unsaved=run('leadRecordDraft.items[0].url');run('leadCloseUpload()');
  assert(revoked.includes(unsaved));assert(!revoked.includes(url));
  assert.equal(run('leadState.leads[0].history.length'),historyCount);

  run("state.page='myLeads';render()");open();fill();
  context.MediaRecorder=class{
    static isTypeSupported(){return true}
    constructor(){this.state='inactive';this.mimeType='audio/webm'}
    start(){this.state='recording'}
    stop(){this.state='inactive';this.ondataavailable?.({data:new Blob(['recording'],{type:'audio/webm'})});this.onstop?.()}
  };
  context.navigator={mediaDevices:{getUserMedia:async()=>({getTracks:()=>[{stop:()=>stops++}]})}};
  await run('leadToggleRecording()');assert.equal(node('#lead-registration-save').disabled,true);
  run("leadSwitchRegistration('import')");assert.equal(run('leadState.registrationTab'),'single');
  const count=run('leadState.leads.length');run('saveLead()');assert.equal(run('leadState.leads.length'),count);
  await run('leadToggleRecording()');assert.equal(run('leadRecordDraft.items[0].kind'),'audio');
  run('saveLead()');assert.equal(run('state.page'),'myLeads');
  assert.equal(run('leadState.leads[0].history.at(-1)[3].files[0].kind'),'audio');
  open();add();const abandoned=run('leadRecordDraft.items[0].url');await run('leadToggleRecording()');
  const stoppedBefore=stops;run("state.page='system';render()");
  assert(stops>stoppedBefore);assert(revoked.includes(abandoned));assert.equal(run('leadRecordDraft'),null);
  console.log('PASS: embedded editor; upload/transcription target; validation preserves draft; tab preservation; save with history; unchanged edit avoids duplicates; cancel preserves saved files; registration recording and navigation cleanup.');
}
test().catch(error=>{console.error(error);process.exitCode=1});
