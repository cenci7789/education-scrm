const assert=require('node:assert/strict');
const {File}=require('node:buffer');
const {run,node,page,context}=require('./lead-registration.cjs');
const revoked=[];let sequence=0,trackStops=0;
context.URL={createObjectURL:()=>`blob:record-${++sequence}`,revokeObjectURL:url=>revoked.push(url)};
context.AbortController=AbortController;context.File=File;
run("permissionChangeIdentity('admin');leadDetail(0,'myLeads')");
function open(){
  run('leadOpenUpload()');node('#lead-record-note').value='';
  node('#follow-channel').value='其他';node('#follow-time').value='';
  node('#communication-result').value='有效沟通';node('#communication-intent').value='unknown';
}
function add(){run("leadAddRecordFiles([{name:'截图.png',size:123,type:'image/png'},{name:'另一张.png',size:123,type:'image/png'}],'image')")}
async function test(){
  open();assert(page().includes('直接录音'));assert(page().includes('上传语音'));
  node('#lead-record-note').value='纯文字沟通';run('leadSaveUpload()');
  assert.equal(run('leadState.leads[0].history.at(-1)[2]'),'纯文字沟通');
  assert.equal(run('leadState.leads[0].history.at(-1)[3].files.length'),0);

  open();add();
  assert(node('#lead-record-attachments').innerHTML.includes('<img'));
  run("leadAddRecordFiles([{name:'脚本.svg',type:'image/svg+xml',size:10}],'image')");
  assert.equal(run('leadRecordDraft.items.length'),2);
  await run('leadTranscribeRecord(leadRecordDraft.items[0].id)');
  assert.equal(run('leadRecordDraft.items[0].status'),'unavailable');
  assert.equal(node('#lead-record-note').value,'');

  let resolveRecognition;
  context.crmTranscribeAttachment=()=>new Promise(resolve=>{resolveRecognition=resolve});
  node('#lead-record-note').value='手写内容';
  const task=run('leadTranscribeRecord(leadRecordDraft.items[0].id)');
  assert.equal(run('leadRecordDraft.items[0].status'),'busy');
  assert.equal(node('#lead-record-save').disabled,true);
  node('#lead-record-note').value='识别期间继续输入';
  resolveRecognition({text:'图片提取文字'});await task;
  assert.equal(node('#lead-record-note').value,'识别期间继续输入\n\n图片提取文字');
  assert.equal(run('leadRecordDraft.items[0].applied'),true);
  await run('leadTranscribeRecord(leadRecordDraft.items[0].id)');
  assert.equal(node('#lead-record-note').value,'识别期间继续输入\n\n图片提取文字');
  context.crmTranscribeAttachment=async()=>{throw Error('network')};
  await run('leadTranscribeRecord(leadRecordDraft.items[1].id)');
  assert.equal(run('leadRecordDraft.items[1].status'),'error');
  assert(node('#lead-record-note').value.includes('图片提取文字'));
  context.crmTranscribeAttachment=async()=>({text:'语音转写补充'});
  await run('leadTranscribeRecord(leadRecordDraft.items[1].id)');
  assert(node('#lead-record-note').value.endsWith('语音转写补充'));
  const savedURL=run('leadRecordDraft.items[0].url');
  run('leadSaveUpload()');assert(!revoked.includes(savedURL));
  assert.equal(run('leadState.leads[0].history.at(-1)[3].files.length'),2);
  assert(page().includes('附件转写文字已并入沟通记录'));

  open();add();
  let lateResult;context.crmTranscribeAttachment=()=>new Promise(resolve=>{lateResult=resolve});
  const late=run('leadTranscribeRecord(leadRecordDraft.items[0].id)');
  const removedURL=run('leadRecordDraft.items[0].url');
  run('leadRemoveRecordFile(leadRecordDraft.items[0].id)');
  lateResult({text:'已移除附件的结果'});await late;
  assert.equal(node('#lead-record-note').value,'');assert(revoked.includes(removedURL));
  run('leadCloseUpload()');assert.equal(run('leadRecordDraft'),null);

  open();await run('leadToggleRecording()');
  assert(node('#lead-record-notice').textContent.includes('不支持直接录音'));
  context.navigator={mediaDevices:{getUserMedia:async()=>{throw Object.assign(Error(),{name:'NotAllowedError'})}}};
  context.MediaRecorder=class {};
  await run('leadToggleRecording()');
  assert.equal(run('leadRecordDraft.phase'),'idle');
  assert(node('#lead-record-notice').textContent.includes('未获授权'));

  let grant;
  const stream={getTracks:()=>[{stop:()=>trackStops++}]};
  context.navigator.mediaDevices.getUserMedia=()=>new Promise(resolve=>{grant=resolve});
  const waiting=run('leadToggleRecording()');run('leadCloseUpload()');
  grant(stream);await waiting;assert.equal(trackStops,1);

  class Recorder{
    static isTypeSupported(type){return type.startsWith('audio/webm')}
    constructor(){this.state='inactive';this.mimeType='audio/webm'}
    start(){this.state='recording'}
    stop(){this.state='inactive';this.ondataavailable?.({data:new Blob(['audio'],{type:'audio/webm'})});this.onstop?.()}
  }
  context.MediaRecorder=Recorder;
  context.navigator.mediaDevices.getUserMedia=async()=>stream;
  open();await run('leadToggleRecording()');
  assert.equal(run('leadRecordDraft.phase'),'recording');
  assert.equal(node('#lead-record-save').disabled,true);
  await run('leadToggleRecording()');
  assert.equal(run('leadRecordDraft.phase'),'idle');
  assert.equal(run('leadRecordDraft.items[0].kind'),'audio');
  assert(node('#lead-record-attachments').innerHTML.includes('<audio controls'));
  const audioURL=run('leadRecordDraft.items[0].url');
  node('#lead-record-note').value='现场录音';run('leadSaveUpload()');
  assert(!revoked.includes(audioURL));assert(page().includes('<audio controls'));
  open();await run('leadToggleRecording()');
  const stopsBefore=trackStops;run('leadCloseUpload()');
  assert(trackStops>stopsBefore);assert.equal(run('leadRecordDraft'),null);
  console.log('PASS: text-only save; image/audio previews; format validation; missing AI service; append without overwrite; retries; no duplicate results; cancel/remove races; microphone denial and late permission; record/stop/cleanup; saved attachment ownership.');
}
test().catch(error=>{console.error(error);process.exitCode=1});
