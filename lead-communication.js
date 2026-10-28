// 各沟通入口共用人工确认流程。真实呼叫、企微及识别服务由外部系统接入。
const leadIntentOptions=['高意向','中意向','低意向','无意向'];
const leadCommunicationResults=['有效沟通','未接通','暂不方便','无有效回复'];
function leadIntentLabel(lead){return lead.intent||'待判断'}
function leadStartCommunication(channel){
  if(!leadRequireFollow())return;
  leadDisposeRecord();
  leadState.communicationChannel=channel;leadState.modal='communicationSession';leadRender();
}
function leadCommunicationSessionPage(){
  const channel=leadState.communicationChannel,l=leadState.leads[leadState.selected],phone=channel==='电话';
  return `<div class="modal-backdrop"><section class="modal lead-modal" role="dialog" aria-modal="true" aria-labelledby="communication-title"><div class="modal-head"><h2 id="communication-title">${phone?'话务呼叫':'企微沟通'}</h2><button class="btn small" aria-label="关闭" onclick="leadState.modal=null;leadRender()">✕</button></div><p>${esc(l.name)} · ${esc(leadDetailPhone(l.phone))}</p><p class="notice">${phone?'当前尚未接入话务服务。完成外部通话后，点击“完成沟通”记录结果。':'当前尚未接入企微聊天服务。完成一轮交流后，点击“完成本次跟进”，可将多条消息合并记录。'}</p><div class="modal-actions"><button class="btn" onclick="leadState.modal=null;leadRender()">取消</button><button class="btn primary" onclick="leadCompleteCommunication()">${phone?'完成沟通':'完成本次跟进'}</button></div></section></div>`;
}
function leadCompleteCommunication(){
  if(!leadRequireFollow()||leadState.modal!=='communicationSession')return;
  leadOpenUpload(leadState.communicationChannel,true);
}
function leadCommunicationFields(channel='其他',optional=false,nextRequired=false,completion=false){
  const lead=leadState.leads[leadState.selected],current=leadIntentLabel(lead);
  return `<section class="communication-fields"><p class="help">${completion?'沟通结果与本次意向由 AI 判断，可人工修改；接口未接入时请人工填写。':optional?'填写信息记录时，请同时确认以下沟通结果。':'请根据本次交流情况确认。'}原意向：<strong>${esc(current)}</strong></p><div class="form-grid">
    ${aField('沟通方式',`<select class="select" id="follow-channel">${['电话','企微','面谈','其他'].map(x=>`<option ${x===channel?'selected':''}>${x}</option>`).join('')}</select>`,true)}
    ${aField('沟通结果',`<select class="select" id="communication-result" onchange="leadChangeCommunicationResult(true)"><option value="">请选择沟通结果</option>${leadCommunicationResults.map(x=>`<option>${x}</option>`).join('')}</select>`,true)}
    <div class="field"><label class="required" for="communication-intent">本次意向（有效沟通时必填）</label><select class="select" id="communication-intent" disabled onchange="leadChangeCommunicationIntent()"><option value="" ${leadIntentOptions.includes(lead.intent)?'':'selected'}>请选择本次意向</option>${leadIntentOptions.map(x=>`<option value="${x}" ${lead.intent===x?'selected':''}>${x}</option>`).join('')}</select><p class="help" id="communication-intent-help">默认带入上次意向，有效沟通后可修改；未接通、暂不方便或无有效回复时保留原意向。</p></div>
    ${completion?'':aField('下次跟进时间',aInput('follow-time','','datetime-local'),nextRequired)}
    <div class="field full" id="communication-reason-field" hidden><label class="required" for="communication-reason">意向变更原因</label><textarea class="textarea" id="communication-reason" placeholder="说明家长反馈与判断依据"></textarea></div>
  </div></section>`;
}
function leadChangeCommunicationResult(manual=false){
  if(manual&&leadRecordDraft?.completion)(leadRecordDraft.manualFields??={}).result=true;
  const effective=$('#communication-result').value==='有效沟通';
  $('#communication-intent').disabled=!effective;
  leadChangeCommunicationIntent();
}
function leadChangeCommunicationIntent(){
  const intent=$('#communication-intent').value,lead=leadState.leads[leadState.selected];
  $('#communication-reason-field').hidden=!($('#communication-result').value==='有效沟通'&&leadIntentOptions.includes(intent)&&intent!==lead.intent);
}
function leadReadCommunication(text){
  const lead=leadState.leads[leadState.selected],result=$('#communication-result').value,channel=$('#follow-channel').value;
  if(!leadCommunicationResults.includes(result)){toast('请选择沟通结果');return null}
  if(!['电话','企微','面谈','其他'].includes(channel)){toast('请选择沟通方式');return null}
  if(!text.trim()){toast('请填写沟通说明');return null}
  const effective=result==='有效沟通',decision=effective?$('#communication-intent').value:'keep';
  if(effective&&!leadIntentOptions.includes(decision)&&decision!=='unknown'&&!(decision==='keep'&&lead.intent)){toast('请确认本次意向');return null}
  const intent=leadIntentOptions.includes(decision)?decision:lead.intent||'';
  const reason=intent!==(lead.intent||'')?$('#communication-reason').value.trim():'';
  if(intent!==(lead.intent||'')&&!reason){toast('请填写意向变更原因');return null}
  const nextTime=$('#follow-time').value;
  if(nextTime&&(!Number.isFinite(new Date(nextTime).getTime())||new Date(nextTime)<=new Date())){toast('下次跟进时间应晚于当前时间');return null}
  const operator=leadCurrentOperator();
  return {channel,result,decision,previousIntent:lead.intent||'',intent,reason,nextTime,actor:operator.name,actorAccount:operator.account};
}
function leadAppendCommunication(lead,text,files,data,title){
  lead.lastCommunicationAt=new Date().toISOString();
  if(data.result==='有效沟通'){lead.lastEffectiveCommunicationAt=lead.lastCommunicationAt;lead.followupDeadlineAt=data.nextTime||''}
  else if(data.nextTime){
    const old=leadRuleTime(lead.followupDeadlineAt===undefined?lead.next:lead.followupDeadlineAt),next=leadRuleTime(data.nextTime);
    const effective=leadRuleTime(lead.lastEffectiveCommunicationAt);
    lead.followupDeadlineAt=Number.isFinite(old)&&!(effective>=old)&&old<next?new Date(old).toISOString():data.nextTime;
  }
  lead.history.push(leadHistoryEntry(title||data.channel+'沟通',text,{files,communication:data}));
  lead.intent=data.intent;
  if(data.nextTime)lead.next=data.nextTime.replace('T',' ');
  if(lead.stage!=='已报名'&&lead.status!=='cold')lead.stage=leadHasNextFollowup(lead)?'跟进中':'新线索';
}
function leadCommunicationMetadataHTML(attachment){
  const data=attachment?.communication;if(!data)return '';
  return `<div class="communication-history"><span>${esc(data.channel)} · ${esc(data.result)}</span><span>意向：${esc(data.previousIntent||'待判断')}${data.intent!==data.previousIntent?' → '+esc(data.intent||'待判断'):'（保持不变）'}${data.decision==='unknown'?' · 本次暂无法判断':''}</span>${data.reason?`<span>变更原因：${esc(data.reason)}</span>`:''}${data.nextTime?`<span>下次跟进：${esc(data.nextTime.replace('T',' '))}</span>`:''}${data.nextAction?`<span>下一步安排：${esc(leadCompletionActions[data.nextAction]||(data.nextAction==='colleague'?'转同事':data.nextAction))}</span>`:''}</div>`;
}
function leadFollowCommunicationForm(){
  return leadCommunicationFields()+`<div class="field"><label class="required" for="follow-note">沟通说明</label><textarea class="textarea" id="follow-note" placeholder="请填写家长反馈、主要顾虑和下一步安排"></textarea></div><div class="modal-actions"><button class="btn" onclick="leadState.modal=null;leadRender()">取消</button><button class="btn primary" onclick="saveFollow()">保存跟进</button></div>`;
}
const leadCompletionActions={follow:'下次跟进',trial:'约试听',enroll:'去报名',publicPool:'回公海',cold:'冷宫池'};
function leadFollowDock(){
  return `<footer class="lead-detail-dock" aria-label="跟进操作"><div class="lead-detail-dock-inner"><strong>跟进操作</strong><button class="btn small lead-call-action" onclick="leadOpenCommunicationChoice()">去沟通</button><button class="btn small" onclick="leadOpenAction('trial')">约试听</button><button class="btn small lead-enroll-action" onclick="leadToEnrollment()">去报名</button><button class="btn small" onclick="leadOpenAction('publicPool')">回公海</button><button class="btn small" onclick="leadState.modal='cold';leadRender()">冷宫池</button></div></footer>`;
}
function leadOpenCommunicationChoice(){if(!leadRequireFollow())return;leadState.modal='communicationChoice';leadRender()}
function leadCommunicationChoicePage(){
  return `<div class="modal-backdrop"><section class="modal lead-modal" role="dialog" aria-modal="true" aria-labelledby="communication-choice-title"><div class="modal-head"><h2 id="communication-choice-title">选择沟通方式</h2><button class="btn small" aria-label="关闭" onclick="leadState.modal=null;leadRender()">×</button></div><div class="lead-operation"><button class="btn" onclick="leadStartCommunication('企微')">企微沟通</button><button class="btn" onclick="leadStartCommunication('电话')">话务呼叫</button><button class="btn" onclick="leadOpenUpload('其他',true)">上传沟通记录</button></div></section></div>`;
}
function leadCompletionForm(){
  let editor=leadRecordEditor('沟通说明（必填）').replace('oninput="leadRecordDraft.note=this.value"','oninput="leadRecordDraft.note=this.value;leadScheduleCommunicationAnalysis()"');
  let fields=leadCommunicationFields(leadRecordDraft.channel||'其他',false,false,true)
    .replace('onchange="leadChangeCommunicationIntent()"','onchange="leadMarkCommunicationManual(\'intent\');leadChangeCommunicationIntent()"')
    .replace('id="communication-reason"','id="communication-reason" oninput="leadMarkCommunicationManual(\'reason\')"');
  return `<p class="notice" id="communication-upload-status" role="status">沟通记录上传：待接入</p>${editor}<p class="help" id="communication-ai-status" role="status">AI 判断服务待接入，可人工填写沟通结果和本次意向。</p>${fields}
    <section class="lead-completion-actions" aria-label="下一步"><p class="required">下一步（点击记录并办理）</p><div class="lead-operation">${Object.entries(leadCompletionActions).map(([value,label])=>`<button type="button" class="btn small${value==='enroll'?' lead-enroll-action':''}" data-completion-action="${value}" onclick="leadChooseCompletionAction('${value}')">${label}</button>`).join('')}<button type="button" class="btn small" onclick="leadCloseUpload()">取消</button></div></section>
    <dialog id="communication-next-time" class="lead-follow-time-dialog" aria-labelledby="communication-time-title" oncancel="leadRecordDraft.nextAction=null"><h2 id="communication-time-title">下次跟进</h2><div class="field"><label class="required" for="follow-time">下次跟进时间</label><input class="input" id="follow-time" type="datetime-local"></div><div class="modal-actions"><button type="button" class="btn" onclick="leadCancelCompletionTime()">取消</button><button type="button" class="btn primary" id="lead-record-save" onclick="leadConfirmCompletionTime()">确认跟进时间</button></div></dialog>`;
}
function leadChooseCompletionAction(value){
  if(!leadRequireFollow()||!leadRecordDraft?.completion||leadState.modal!=='upload'||!Object.hasOwn(leadCompletionActions,value))return;
  leadRecordDraft.nextAction=value;
  if(value==='follow'){$('#communication-next-time').showModal();$('#follow-time').focus();return}
  $('#follow-time').value='';leadSaveUpload();
}
function leadCancelCompletionTime(){
  if(leadRecordDraft?.completion)leadRecordDraft.nextAction=null;
  $('#communication-next-time').close();
}
function leadConfirmCompletionTime(){
  if(!leadRecordDraft?.completion||leadRecordDraft.nextAction!=='follow')return;
  const input=$('#follow-time');
  if(!input.value||!Number.isFinite(new Date(input.value).getTime())||new Date(input.value)<=new Date()){
    input.setCustomValidity('请选择晚于当前时间的下次跟进时间');input.reportValidity();input.setCustomValidity('');return;
  }
  $('#communication-next-time').close();leadSaveUpload();
}
function leadReadCompletionAction(){
  const value=leadRecordDraft?.nextAction;
  if(!Object.hasOwn(leadCompletionActions,value)){toast('请选择沟通后的下一步安排');return false}
  if(value==='follow'&&!$('#follow-time').value){toast('请选择下次跟进时间');return false}
  if(value!=='follow')$('#follow-time').value='';
  return value;
}
function leadDispatchCompletionAction(action){
  if(action==='follow')return;
  if(action==='enroll'){leadToEnrollment();return}
  if(action==='cold'){leadState.modal='cold';leadRender();return}
  leadOpenAction(action);
}
function leadMarkCommunicationManual(field){if(leadRecordDraft?.completion)(leadRecordDraft.manualFields??={})[field]=true}
function leadCommunicationStatus(id,message){const el=$('#'+id);if(el)el.textContent=message}
function leadScheduleCommunicationAnalysis(){
  const draft=leadRecordDraft;if(!draft?.completion)return;
  globalThis.clearTimeout?.(draft.analysisTimer);
  draft.analysisRevision=(draft.analysisRevision||0)+1;
  draft.analysisTimer=setTimeout(()=>{if(leadRecordDraft===draft)leadAnalyzeCommunication()},500);
}
// 接入点：crmAnalyzeCommunication({text,channel,leadId,previousIntent}) => {result,intent,reason}。
async function leadAnalyzeCommunication(){
  const draft=leadRecordDraft;if(!draft?.completion)return;
  const text=$('#lead-record-note').value.trim();
  if(!text)return;
  if(typeof globalThis.crmAnalyzeCommunication!=='function'){leadCommunicationStatus('communication-ai-status','AI 判断服务待接入，请人工填写沟通结果和本次意向。');return}
  const revision=draft.analysisRevision=(draft.analysisRevision||0)+1;
  leadCommunicationStatus('communication-ai-status','AI 正在判断沟通结果和本次意向…');
  try{
    const result=await globalThis.crmAnalyzeCommunication({text,channel:$('#follow-channel').value,leadId:draft.lead.leadId,previousIntent:draft.lead.intent||''});
    if(leadRecordDraft!==draft||draft.analysisRevision!==revision||$('#lead-record-note').value.trim()!==text)return;
    if(!leadCommunicationResults.includes(result?.result)||(result.result==='有效沟通'&&!leadIntentOptions.includes(result.intent)))throw Error('invalid analysis');
    draft.analysis={result:result.result,intent:result.intent||'',reason:String(result.reason||''),at:new Date().toISOString()};
    if(!draft.manualFields?.result)$('#communication-result').value=result.result;
    if(!draft.manualFields?.intent&&$('#communication-result').value==='有效沟通')$('#communication-intent').value=result.intent||'';
    if(!draft.manualFields?.reason)$('#communication-reason').value=draft.analysis.reason;
    leadChangeCommunicationResult();
    leadCommunicationStatus('communication-ai-status','AI 已完成判断，人工修改的内容已保留。');
  }catch{if(leadRecordDraft===draft&&draft.analysisRevision===revision)leadCommunicationStatus('communication-ai-status','AI 判断失败，请人工填写或修改沟通说明后重试。')}
}
// 接入点：crmCollectCommunication({channel,leadId}) => {text,attachments:[{file,kind}]}。
async function leadCollectCommunication(){
  const draft=leadRecordDraft;if(!draft?.completion)return;
  if(typeof globalThis.crmCollectCommunication!=='function'||draft.channel==='其他'){
    draft.uploadState='unavailable';leadCommunicationStatus('communication-upload-status',draft.channel==='其他'?'请上传沟通记录，并保留或补充沟通说明。':'沟通记录上传：话务 / 企微回传接口待接入，请上传记录或填写沟通说明。');return;
  }
  draft.uploadState='busy';leadCommunicationStatus('communication-upload-status','沟通记录正在上传');
  try{
    const record=await globalThis.crmCollectCommunication({channel:draft.channel,leadId:draft.lead.leadId});
    if(leadRecordDraft!==draft)return;
    if(!record||(!String(record.text||'').trim()&&!record.attachments?.length))throw Error('empty record');
    if(record.text){const input=$('#lead-record-note');draft.note=input.value+(input.value?'\n\n':'')+String(record.text);input.value=draft.note}
    for(const item of record.attachments||[])if(item.file)leadAddRecordFiles([item.file],item.kind==='image'?'image':'audio');
    draft.uploadState='done';if(draft.notice==='沟通记录正在上传，请稍候再保存。')leadRecordNotice('');leadCommunicationStatus('communication-upload-status','沟通记录已上传，请核对沟通说明。');leadScheduleCommunicationAnalysis();
  }catch{if(leadRecordDraft===draft){draft.uploadState='error';if(draft.notice==='沟通记录正在上传，请稍候再保存。')leadRecordNotice('');leadCommunicationStatus('communication-upload-status','沟通记录上传失败，请手动上传或补充沟通说明。')}}
}
