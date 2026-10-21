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
  leadOpenUpload(leadState.communicationChannel);
}
function leadCommunicationFields(channel='其他',optional=false,nextRequired=false){
  const lead=leadState.leads[leadState.selected],current=leadIntentLabel(lead);
  return `<section class="communication-fields"><p class="help">${optional?'填写信息记录时，请同时确认以下沟通结果。':'请根据本次交流情况确认，意向由销售人工判断。'}原意向：<strong>${esc(current)}</strong></p><div class="form-grid">
    ${aField('沟通方式',`<select class="select" id="follow-channel">${['电话','企微','面谈','其他'].map(x=>`<option ${x===channel?'selected':''}>${x}</option>`).join('')}</select>`,true)}
    ${aField('沟通结果',`<select class="select" id="communication-result" onchange="leadChangeCommunicationResult()"><option value="">请选择沟通结果</option>${leadCommunicationResults.map(x=>`<option>${x}</option>`).join('')}</select>`,true)}
    <div class="field"><label class="required" for="communication-intent">本次意向（有效沟通时必填）</label><select class="select" id="communication-intent" disabled onchange="leadChangeCommunicationIntent()"><option value="" ${leadIntentOptions.includes(lead.intent)?'':'selected'}>请选择本次意向</option>${leadIntentOptions.map(x=>`<option value="${x}" ${lead.intent===x?'selected':''}>${x}</option>`).join('')}</select><p class="help" id="communication-intent-help">默认带入上次意向，有效沟通后可修改；未接通、暂不方便或无有效回复时保留原意向。</p></div>
    ${aField('下次跟进时间',aInput('follow-time','','datetime-local'),nextRequired)}
    <div class="field full" id="communication-reason-field" hidden><label class="required" for="communication-reason">意向变更原因</label><textarea class="textarea" id="communication-reason" placeholder="说明家长反馈与判断依据"></textarea></div>
  </div></section>`;
}
function leadChangeCommunicationResult(){
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
  return `<div class="communication-history"><span>${esc(data.channel)} · ${esc(data.result)}</span><span>意向：${esc(data.previousIntent||'待判断')}${data.intent!==data.previousIntent?' → '+esc(data.intent||'待判断'):'（保持不变）'}${data.decision==='unknown'?' · 本次暂无法判断':''}</span>${data.reason?`<span>变更原因：${esc(data.reason)}</span>`:''}${data.nextTime?`<span>下次跟进：${esc(data.nextTime.replace('T',' '))}</span>`:''}</div>`;
}
function leadFollowCommunicationForm(){
  return leadCommunicationFields()+`<div class="field"><label class="required" for="follow-note">沟通说明</label><textarea class="textarea" id="follow-note" placeholder="请填写家长反馈、主要顾虑和下一步安排"></textarea></div><div class="modal-actions"><button class="btn" onclick="leadState.modal=null;leadRender()">取消</button><button class="btn primary" onclick="saveFollow()">保存跟进</button></div>`;
}
