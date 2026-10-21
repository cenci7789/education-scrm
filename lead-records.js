// 沟通记录编辑器。识别由后端适配函数提供，未接入时不生成模拟文字。
// globalThis.crmTranscribeAttachment({file, kind, signal}) => Promise<{text: string}>
let leadRecordDraft=null;
let leadRecordSequence=0;
function leadCreateRecordDraft(context,lead=null,note=''){
  return {context,lead,note,noteId:context==='registration'?'lead-note':context==='basicEdit'?'lead-edit-note':'lead-record-note',saveId:context==='upload'?'lead-record-save':'lead-registration-save',items:[],phase:'idle',recorder:null,stream:null,timer:null,started:0,notice:''};
}
function leadOpenUpload(channel='其他'){
  if(!leadRequireFollow())return;
  leadDisposeRecord();
  leadRecordDraft=leadCreateRecordDraft('upload',leadState.leads[leadState.selected]);
  leadRecordDraft.channel=channel;
  leadState.modal='upload';leadRender();
}
function leadUploadRecordForm(){
  if(!leadRecordDraft)leadRecordDraft=leadCreateRecordDraft('upload',leadState.leads[leadState.selected]);
  return `<p class="record-intro">输入沟通内容，或添加图片、语音转为文字；校对后保存到当前线索。</p>${leadCommunicationFields(leadRecordDraft.channel||'其他')}${leadRecordEditor('沟通说明（必填）')}
    <div class="modal-actions"><button class="btn" onclick="leadCloseUpload()">取消</button><button class="btn primary" id="lead-record-save" onclick="leadSaveUpload()">保存跟进</button></div>`;
}
function leadRegistrationRecordForm(lead){
  if(leadRecordDraft?.context!=='registration'){
    leadDisposeRecord();leadRecordDraft=leadCreateRecordDraft('registration',lead,lead?.note||'');
  }
  const previous=(lead?.history||[]).flatMap(record=>leadRecordFiles(record[3]));
  return leadRecordEditor('信息记录')+(previous.length?`<details class="record-existing"><summary>已保存附件（${previous.length}）</summary>${leadRecordFilesHTML({files:previous})}</details>`:'');
}
function leadBasicRecordForm(lead){
  if(leadIsRegistrationDetail())return '';
  if(leadRecordDraft?.context!=='basicEdit'||leadRecordDraft.lead!==lead){
    leadDisposeRecord();leadRecordDraft=leadCreateRecordDraft('basicEdit',lead);
  }
  return leadCommunicationFields('其他',true)+leadRecordEditor('信息记录');
}
function leadRecordEditor(label){
  return `<div class="record-composer"><label class="record-label" for="${leadRecordDraft.noteId}">${label}</label><textarea id="${leadRecordDraft.noteId}" class="record-textarea" placeholder="记录家长沟通信息，例如：学习需求、课程反馈、下次跟进安排……" oninput="leadRecordDraft.note=this.value">${esc(leadRecordDraft.note)}</textarea>
    <div class="record-tools"><span id="lead-record-timer" class="record-timer" aria-live="polite"></span><div class="record-tool-buttons"><button type="button" class="record-tool" onclick="document.getElementById('lead-record-images').click()">▧ 上传图片</button><button type="button" id="lead-record-mic" class="record-tool" onclick="leadToggleRecording()">● 直接录音</button><button type="button" class="record-tool" onclick="document.getElementById('lead-record-audio').click()">♫ 上传语音</button></div></div></div>
    <input id="lead-record-images" type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple hidden onchange="leadAddRecordFiles(this.files,'image');this.value=''">
    <input id="lead-record-audio" type="file" accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm,.aac,.flac" multiple hidden onchange="leadAddRecordFiles(this.files,'audio');this.value=''">
    <div id="lead-record-notice" class="record-notice" role="status" ${leadRecordDraft.notice?'':'hidden'}>${esc(leadRecordDraft.notice)}</div>
    <div id="lead-record-attachments" class="record-attachments">${leadRecordAttachmentsHTML()}</div>
    <p class="record-help">转文字结果会追加到输入框，原有内容和附件保留。${leadRecordDraft.context==='registration'?'随线索登记一并保存。':leadRecordDraft.context==='enrollment'?'随确认报名一并保存。':leadRecordDraft.context==='trial'?'随提交试听预约一并保存。':leadRecordDraft.context==='basicEdit'?'保存修改时新增为一条跟进记录；留空且不添加附件时不新增记录。':''}附件仅保留在当前页面会话中。</p>`;
}
function leadRecordAttachmentsHTML(){
  return (leadRecordDraft?.items||[]).map(item=>`<div class="record-attachment">
    ${item.kind==='image'?`<a class="record-thumb" href="${esc(item.url)}" target="_blank" rel="noopener"><img src="${esc(item.url)}" alt="${esc(item.file.name)}"></a>`:'<div class="record-audio-icon" aria-hidden="true">♫</div>'}
    <div class="record-attachment-main"><strong title="${esc(item.file.name)}">${esc(item.file.name)}</strong><small>${item.kind==='image'?'图片':'语音'} · ${leadRecordFileSize(item.file.size)}</small>${item.kind==='audio'?`<audio controls preload="metadata" src="${esc(item.url)}"></audio>`:''}<span class="record-status ${item.status==='error'?'error':''}" role="status">${esc(item.message||'待转文字')}</span></div>
    <div class="record-attachment-actions"><button class="btn small" ${item.status==='busy'||item.applied?'disabled':''} onclick="leadTranscribeRecord('${item.id}')">${item.status==='busy'?'正在转文字…':item.applied?'已追加文字':item.status==='error'?'重试转文字':'AI 转文字'}</button><button class="record-remove" aria-label="移除${esc(item.file.name)}" onclick="leadRemoveRecordFile('${item.id}')">移除</button></div></div>`).join('');
}
function leadRecordFileSize(bytes){return bytes<1024*1024?Math.max(1,Math.round(bytes/1024))+' KB':(bytes/1024/1024).toFixed(1)+' MB'}
function leadRecordNotice(message){
  if(!leadRecordDraft)return;
  leadRecordDraft.notice=message;
  const el=$('#lead-record-notice');if(el){el.textContent=message;el.hidden=!message}
}
function leadRefreshRecordAttachments(){const el=$('#lead-record-attachments');if(el)el.innerHTML=leadRecordAttachmentsHTML()}
function leadAddRecordFiles(files,kind){
  const draft=leadRecordDraft;if(!draft)return;
  const errors=[];
  for(const file of Array.from(files)){
    const valid=kind==='image'?/\.(png|jpe?g|webp|gif)$/i.test(file.name)&&(!file.type||/^image\/(png|jpeg|webp|gif)$/i.test(file.type)):/\.(mp3|wav|m4a|ogg|oga|webm|aac|flac|mp4)$/i.test(file.name)&&(!file.type||file.type.startsWith('audio/')||['video/webm','video/mp4','application/ogg'].includes(file.type));
    if(!valid){errors.push(file.name+'：不支持的'+(kind==='image'?'图片':'语音')+'格式');continue}
    if(!file.size){errors.push(file.name+'：文件为空');continue}
    if(file.size>30*1024*1024){errors.push(file.name+'：请使用30 MB以内的文件');continue}
    if(draft.items.length>=10){errors.push('每条记录最多添加10个附件');break}
    draft.items.push({id:'record-'+(++leadRecordSequence),file,kind,url:URL.createObjectURL(file),status:'ready',message:'待转文字',applied:false,controller:null});
  }
  leadRecordNotice(errors.join('；'));leadRefreshRecordAttachments();
}
function leadRemoveRecordFile(id){
  const draft=leadRecordDraft,item=draft?.items.find(x=>x.id===id);if(!item)return;
  item.controller?.abort();URL.revokeObjectURL(item.url);
  draft.items=draft.items.filter(x=>x!==item);
  if(item.applied)leadRecordNotice('附件已移除，已追加到文本框的文字保留，可自行修改。');
  leadRefreshRecordAttachments();leadUpdateRecordingControls();
}
async function leadTranscribeRecord(id){
  const draft=leadRecordDraft,item=draft?.items.find(x=>x.id===id);
  if(!item||item.applied||item.status==='busy')return;
  if(typeof globalThis.crmTranscribeAttachment!=='function'){
    item.status='unavailable';item.message='AI 转文字尚未接入';
    leadRecordNotice('当前尚未连接图片/语音识别服务。可先输入文字并保存附件，接入服务后即可转文字。');
    leadRefreshRecordAttachments();return;
  }
  item.status='busy';item.message='正在识别，请稍候…';item.controller=new AbortController();
  leadRefreshRecordAttachments();leadUpdateRecordingControls();
  try{
    const result=await globalThis.crmTranscribeAttachment({file:item.file,kind:item.kind,signal:item.controller.signal});
    if(leadRecordDraft!==draft||!draft.items.includes(item))return;
    const text=typeof result?.text==='string'?result.text.trim():'';
    if(!text)throw new Error('empty-result');
    const input=$('#'+draft.noteId),existing=input?input.value:draft.note;
    draft.note=existing+(existing.trim()?'\n\n':'')+text;
    if(input)input.value=draft.note;
    item.transcript=text;item.applied=true;item.status='done';item.message='文字已追加，请校对后保存';
    leadRecordNotice('识别文字已追加到输入框，请核对姓名、时间和数字。');
  }catch(error){
    if(leadRecordDraft!==draft||!draft.items.includes(item))return;
    item.status='error';item.message=error?.message==='empty-result'?'未识别到文字，可重新识别或手动填写':'转文字失败，请重试；附件和已输入内容已保留';
  }finally{
    item.controller=null;
    if(leadRecordDraft===draft){leadRefreshRecordAttachments();leadUpdateRecordingControls()}
  }
}
function leadUpdateRecordingControls(){
  const draft=leadRecordDraft;if(!draft)return;
  const button=$('#lead-record-mic'),timer=$('#lead-record-timer'),save=$('#'+draft.saveId);
  if(button){button.textContent=({idle:'● 直接录音',requesting:'等待麦克风授权…',recording:'■ 停止录音',stopping:'正在生成语音…'})[draft.phase];button.disabled=['requesting','stopping'].includes(draft.phase);button.classList.toggle('recording',draft.phase==='recording')}
  if(timer){const seconds=Math.floor((Date.now()-draft.started)/1000);timer.textContent=draft.phase==='recording'?'录音中 '+String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0'):''}
  if(save)save.disabled=draft.phase!=='idle'||draft.items.some(x=>x.status==='busy');
}
function leadStopRecordTracks(draft){draft.stream?.getTracks().forEach(track=>track.stop());draft.stream=null;clearInterval(draft.timer);draft.timer=null}
async function leadToggleRecording(){
  const draft=leadRecordDraft;if(!draft)return;
  if(draft.phase==='recording'){
    draft.phase='stopping';clearInterval(draft.timer);
    try{draft.recorder.stop()}catch{leadStopRecordTracks(draft);draft.phase='idle';leadRecordNotice('录音未能生成，请重新录制。')}
    leadUpdateRecordingControls();return;
  }
  if(draft.phase!=='idle')return;
  if(!globalThis.navigator?.mediaDevices?.getUserMedia||!globalThis.MediaRecorder){leadRecordNotice('当前环境不支持直接录音，请使用支持录音的浏览器和 HTTPS/本地开发服务，或上传已有语音。');return}
  draft.phase='requesting';leadRecordNotice('请在浏览器提示中允许使用麦克风。');leadUpdateRecordingControls();
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:true});
    if(leadRecordDraft!==draft){stream.getTracks().forEach(track=>track.stop());return}
    draft.stream=stream;
    const mime=['audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus'].find(type=>MediaRecorder.isTypeSupported?.(type));
    const recorder=new MediaRecorder(stream,mime?{mimeType:mime}:undefined),chunks=[];
    draft.recorder=recorder;
    recorder.ondataavailable=event=>{if(event.data?.size)chunks.push(event.data)};
    recorder.onerror=()=>{
      recorder.onstop=null;recorder.ondataavailable=null;
      try{if(recorder.state!=='inactive')recorder.stop()}catch{}
      leadStopRecordTracks(draft);draft.phase='idle';
      if(leadRecordDraft===draft){leadRecordNotice('录音发生错误，可重新录制或上传语音。');leadUpdateRecordingControls()}
    };
    recorder.onstop=()=>{
      leadStopRecordTracks(draft);draft.phase='idle';draft.recorder=null;
      if(leadRecordDraft!==draft)return;
      const type=recorder.mimeType||chunks[0]?.type||'audio/webm';
      const extension=type.includes('mp4')?'m4a':type.includes('ogg')?'ogg':'webm';
      const file=new File(chunks,'沟通录音-'+new Date().toISOString().replace(/[:.]/g,'-')+'.'+extension,{type});
      leadAddRecordFiles([file],'audio');leadUpdateRecordingControls();
    };
    recorder.start(1000);draft.phase='recording';draft.started=Date.now();
    draft.timer=setInterval(leadUpdateRecordingControls,1000);
    leadRecordNotice('正在录音，完成后点击“停止录音”，即可试听或转文字。');leadUpdateRecordingControls();
  }catch(error){
    leadStopRecordTracks(draft);draft.phase='idle';
    if(leadRecordDraft===draft){leadRecordNotice(error?.name==='NotAllowedError'?'麦克风未获授权，可以重新尝试或上传已有语音。':'无法使用麦克风，请检查设备后重试，或上传已有语音。');leadUpdateRecordingControls()}
  }
}
function leadDisposeRecord(){
  const draft=leadRecordDraft;if(!draft)return;
  leadRecordDraft=null;
  if(draft.recorder){draft.recorder.onstop=null;draft.recorder.ondataavailable=null;draft.recorder.onerror=null;try{if(draft.recorder.state!=='inactive')draft.recorder.stop()}catch{}}
  leadStopRecordTracks(draft);
  draft.items.forEach(item=>{item.controller?.abort();URL.revokeObjectURL(item.url)});
}
function leadCloseUpload(){leadDisposeRecord();leadState.modal=null;leadRender()}
function leadRecordReadyToSave(){
  const draft=leadRecordDraft;
  if(!draft)return true;
  if(draft.phase!=='idle'){leadRecordNotice('请先结束录音，再保存。');return false}
  if(draft.items.some(item=>item.status==='busy')){leadRecordNotice('正在转文字，请等待完成，或移除对应附件后保存。');return false}
  return true;
}
function leadCommitRegistrationRecord(record,assignment){
  const draft=leadRecordDraft;
  if(draft?.context!=='registration')return;
  const files=draft.items.map(item=>({fileName:item.file.name,url:item.url,size:item.file.size,kind:item.kind,transcript:item.transcript||''}));
  record.history.push(leadHistoryEntry('建档',leadRegistrationBody(record,assignment),{files}));
  draft.items=[]; // 已保存的附件由线索历史持有，取消下一次编辑时不可释放。
}
function leadPrepareBasicCommunication(){
  const draft=leadRecordDraft;
  if(draft?.context!=='basicEdit')return null;
  const text=$('#'+draft.noteId).value.trim();
  const intent=$('#communication-intent').value.trim();
  const hasCommunicationFields=['communication-result','communication-reason','follow-time'].some(id=>$('#'+id).value.trim())||
    (intent&&intent!==(draft.lead.intent||''));
  if(!text&&!draft.items.length&&!hasCommunicationFields)return null;
  return leadReadCommunication(text)||false;
}
function leadCommitBasicRecord(lead,data){
  if(!leadRequireFollow())return;
  const draft=leadRecordDraft;
  if(draft?.context!=='basicEdit'||draft.lead!==lead)return;
  const text=$('#'+draft.noteId).value.trim();
  const files=draft.items.map(item=>({fileName:item.file.name,url:item.url,size:item.file.size,kind:item.kind,transcript:item.transcript||''}));
  if(text||files.length){if(!data)return;leadAppendCommunication(lead,text,files,data,'信息记录')}
  draft.items=[]; // 保存后交由跟进记录持有，关闭弹窗时不释放。
}
function leadSaveUpload(){
  if(!leadRequireFollow())return;
  const draft=leadRecordDraft;
  if(draft?.context!=='upload'||leadState.modal!=='upload'||draft.lead!==leadState.leads[leadState.selected])return;
  if(draft.phase!=='idle'){leadRecordNotice('请先结束录音，再保存记录。');return}
  if(draft.items.some(item=>item.status==='busy')){leadRecordNotice('正在转文字，请等待完成，或移除对应附件后保存。');return}
  const text=$('#lead-record-note').value.trim();
  if(!text){leadRecordNotice('请填写沟通说明；可将图片、语音转文字并校对后保存。');return}
  const data=leadReadCommunication(text);if(!data)return;
  const files=draft.items.map(item=>({fileName:item.file.name,url:item.url,size:item.file.size,kind:item.kind,transcript:item.transcript||''}));
  leadAppendCommunication(draft.lead,text,files,data);
  draft.items=[]; // URL 所有权移交给已保存记录，关闭编辑器时不释放。
  leadDisposeRecord();leadState.modal=null;leadRender();toast('沟通记录已保存');
}
function leadRecordFiles(attachment){return attachment?.files||(attachment?.fileName?[attachment]:[])}
function leadRecordFilesHTML(attachment){
  return leadRecordFiles(attachment).filter(file=>file.url?.startsWith('blob:')).map(file=>`<div class="lead-saved-attachment">${file.kind==='image'?`<a href="${esc(file.url)}" target="_blank" rel="noopener"><img src="${esc(file.url)}" alt="${esc(file.fileName)}" loading="lazy"></a>`:file.kind==='audio'?`<audio controls preload="none" src="${esc(file.url)}"></audio>`:''}<a class="lead-record-file" href="${esc(file.url)}" download="${esc(file.fileName)}">↧ ${esc(file.fileName)}</a></div>`).join('');
}
function leadCleanClosedRecord(){
  if(!leadRecordDraft)return;
  const active=leadRecordDraft.context==='enrollment'?['enroll','quickEnroll'].includes(state.page):
    leadRecordDraft.context==='trial'?state.page==='quickTrial'&&leadRecordDraft.trial===trialState.draft&&trialState.draft.actorId===trialActor().id&&!trialState.successId:
    leadRecordDraft.context==='registration'?state.page==='leadForm':
    leadRecordDraft.context==='basicEdit'?state.page==='leadDetail'&&!leadIsRegistrationDetail()&&leadState.modal==='form'&&leadState.formMode==='edit'&&leadRecordDraft.lead===leadState.leads[leadState.selected]:
    state.page==='leadDetail'&&!leadIsRegistrationDetail()&&leadState.modal==='upload';
  if(!active){
    if(leadRecordDraft.context==='trial'&&leadRecordDraft.trial)leadRecordDraft.trial.information=leadRecordDraft.note;
    if(leadRecordDraft.context==='basicEdit'&&leadState.modal==='form')leadState.modal=null;
    leadDisposeRecord();
  }
}
const leadRecordPreviousRender=render,leadRecordPreviousLeadRender=leadRender;
render=function(){leadCleanClosedRecord();return leadRecordPreviousRender()};
leadRender=function(){leadCleanClosedRecord();return leadRecordPreviousLeadRender()};
globalThis.addEventListener?.('pagehide',leadDisposeRecord);
