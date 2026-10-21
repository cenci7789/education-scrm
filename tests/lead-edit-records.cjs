const assert=require('node:assert/strict');
const {File}=require('node:buffer');
const {run,node,page,context}=require('./lead-registration.cjs');
let sequence=0,stops=0;const revoked=[];
context.URL={createObjectURL:()=>`blob:edit-${++sequence}`,revokeObjectURL:url=>revoked.push(url)};
context.AbortController=AbortController;context.File=File;
run("permissionChangeIdentity('admin');leadDetail(0,'myLeads');leadState.leads[0].owner='陈静';leadState.leads[0].status='assigned'");
const history=()=>run('leadState.leads[0].history.length');
const snapshot=()=>run('JSON.stringify(leadState.leads[0])');
function open(){
  run("leadOpenForm('edit')");
  assert.equal(run('state.page'),'leadDetail');assert.equal(run('leadState.modal'),'form');
  assert.equal(run('leadRecordDraft.context'),'basicEdit');
  assert.equal(run('leadRecordDraft.note'),'');
  assert(page().includes('id="lead-edit-note"'));
  node('#lead-edit-note').value='';
  node('#lead-name').value=run('leadState.leads[0].name');
  node('#lead-phone').value=run('leadState.leads[0].phone');
  node('#follow-channel').value='其他';node('#follow-time').value='';
  node('#communication-result').value='有效沟通';node('#communication-intent').value='unknown';
}
function add(kind='image'){
  run(kind==='image'?"leadAddRecordFiles([{name:'沟通截图.png',size:100,type:'image/png'}],'image')":"leadAddRecordFiles([{name:'沟通语音.mp3',size:100,type:'audio/mpeg'}],'audio')");
}
async function test(){
  const note=run('leadState.leads[0].note'),count=run('leadState.leads.length');
  open();let n=history();
  node('#communication-result').value='';node('#communication-intent').value='';
  node('#lead-edit-note').value=' \n ';run('saveLead()');
  assert.equal(history(),n);
  open();node('#lead-edit-note').value='本次沟通：家长希望下周试听';run('saveLead()');
  assert.equal(history(),n+1);
  assert.equal(run('leadState.leads[0].history.at(-1)[2]'),'本次沟通：家长希望下周试听');
  assert.equal(run('leadState.leads[0].note'),note);
  assert.equal(run('leadState.leads[0].owner'),'陈静');
  assert.equal(run('leadState.leads[0].status'),'assigned');
  assert.equal(run('leadState.leads.length'),count);
  assert(page().includes('本次沟通：家长希望下周试听'));
  assert.equal(run('leadState.modal'),null);
  open();node('#communication-result').value='';node('#communication-intent').value='';
  run('saveLead()');assert.equal(history(),n+1,'reopen must not resubmit old content');

  open();add();add('audio');
  const urls=JSON.parse(run('JSON.stringify(leadRecordDraft.items.map(x=>x.url))'));
  const before=snapshot();n=history();node('#lead-name').value='';
  run('saveLead()');assert.equal(snapshot(),before);assert.equal(run('leadRecordDraft.items.length'),2);
  node('#lead-name').value='修改后学生';
  let resolve;
  context.crmTranscribeAttachment=()=>new Promise(r=>{resolve=r});
  const task=run('leadTranscribeRecord(leadRecordDraft.items[1].id)');
  assert.equal(node('#lead-registration-save').disabled,true);
  run('saveLead()');assert.equal(snapshot(),before);
  node('#lead-edit-note').value='手动补充';resolve({text:'语音转写内容'});await task;
  assert.equal(node('#lead-edit-note').value,'手动补充\n\n语音转写内容');
  run('saveLead()');
  assert.equal(history(),n+1,'text and both attachments form one record');
  assert.equal(run('leadState.leads[0].history.at(-1)[3].files.length'),2);
  assert.equal(run('leadState.leads[0].history.at(-1)[3].files[1].transcript'),'语音转写内容');
  assert(urls.every(url=>!revoked.includes(url)));
  assert(page().includes('沟通截图.png'));assert(page().includes('沟通语音.mp3'));
  assert.equal(run('leadState.leads[0].note'),note);

  open();n=history();add();run('saveLead()');
  assert.equal(history(),n,'attachment-only edit requires communication explanation');
  node('#lead-edit-note').value='家长发来的沟通截图';run('saveLead()');
  assert.equal(history(),n+1);
  assert.equal(run('leadState.leads[0].history.at(-1)[2]'),'家长发来的沟通截图');
  open();add();const cancelled=run('leadRecordDraft.items[0].url'),unchanged=snapshot();
  const pending=run('leadTranscribeRecord(leadRecordDraft.items[0].id)');
  // Same path as the modal close icon; late recognition must not revive the draft.
  run('leadState.modal=null;leadRender()');resolve({text:'关闭后返回的识别'});await pending;
  assert.equal(snapshot(),unchanged);assert(revoked.includes(cancelled));assert.equal(run('leadRecordDraft'),null);
  open();assert.equal(run('leadRecordDraft.items.length'),0);run('leadCloseForm()');

  context.MediaRecorder=class{
    static isTypeSupported(){return true}
    constructor(){this.state='inactive';this.mimeType='audio/webm'}
    start(){this.state='recording'}
    stop(){this.state='inactive';this.ondataavailable?.({data:new Blob(['voice'],{type:'audio/webm'})});this.onstop?.()}
  };
  context.navigator={mediaDevices:{getUserMedia:async()=>({getTracks:()=>[{stop:()=>stops++}]})}};
  open();n=history();await run('leadToggleRecording()');
  assert.equal(node('#lead-registration-save').disabled,true);
  run('saveLead()');assert.equal(history(),n);assert.equal(run('leadState.modal'),'form');
  await run('leadToggleRecording()');assert.equal(run('leadRecordDraft.items[0].kind'),'audio');
  const recording=run('leadRecordDraft.items[0].url');
  node('#lead-edit-note').value='现场沟通录音，待后续回访';run('saveLead()');
  assert.equal(history(),n+1);assert(!revoked.includes(recording));assert(stops>0);
  open();add();const abandoned=run('leadRecordDraft.items[0].url');await run('leadToggleRecording()');
  const oldStops=stops;run("state.page='quickRegister';render()");
  assert(stops>oldStops);assert(revoked.includes(abandoned));assert.equal(run('leadRecordDraft'),null);
  console.log('PASS: edit modal editor, blank/no duplicate entries, text/media as one follow-up, validation and busy-save guards, transcription, recording, cancel/navigation cleanup, preserved assignment and old records.');
}
test().catch(error=>{console.error(error);process.exitCode=1});
