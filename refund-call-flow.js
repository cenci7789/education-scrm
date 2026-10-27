// 退课电话办理：呼叫窗口 → 结果弹窗；收款资料独立保存，不阻挡沟通记录。
const refundCallResults=['有效沟通','未接听','再次沟通'];
let refundBankDraft=null;
let refundFactDraft=null;
let refundAccountView=null;
let refundSupplementDraft=null;
let refundApprovalDraft=null;
const refundCallPreviousReset=refundResetEditor;
refundResetEditor=function(){
  if(['refundPhone','refundCallResult','refundFact','refundBankDetails','refundSupplementConnect','refundSupplement','refundApproval'].includes(a.modal))a.modal=null;
  if(leadRecordDraft?.context==='refundSupplement')leadDisposeRecord();
  refundCallPreviousReset();refundBankDraft=null;refundFactDraft=null;refundAccountView=null;refundSupplementDraft=null;refundApprovalDraft=null;
};
refundCallValid=function(){
  const r=refundCurrent(),d=refundWork.call;
  return state.page==='withdraw'&&r&&d&&!r.closed&&r.id===d.requestId&&r.step===d.step&&r.revision===d.revision&&d.actor===studentTermActor()&&refundCan(r.step)&&[1,2].includes(r.step);
};
refundCallStart=function(){
  const r=refundCurrent();if(!r||r.closed||![1,2].includes(r.step)||!refundCan(r.step))return;
  refundResetEditor();const s=a.students.find(s=>s.id===r.studentId);
  const amount=r.requestedAmountCents??r.amountCents;
  refundWork.call={requestId:r.id,step:r.step,revision:r.revision,actor:studentTermActor(),phase:'phone',time:new Date().toISOString(),contact:s?.guardian||'家长',phone:s?.phone||'',result:'',nextTime:'',outcome:'',method:r.destination?.method||'',amount:Number.isSafeInteger(amount)?(amount/100).toFixed(2):'',card:r.destination?.card||'',holder:r.destination?.holder||'',bank:r.destination?.bank||'',refundContact:r.destination?.refundContact||''};
  a.modal='refundPhone';academicRender();
};
function refundCallCancel(){refundResetEditor();academicRender()}
function refundCallFinish(){
  if(!refundCallValid()||a.modal!=='refundPhone')return;
  leadDisposeRecord();leadRecordDraft=leadCreateRecordDraft('refundCall');
  Object.assign(leadRecordDraft,{actorId:studentTermActor(),requestId:refundCurrent().id,saveId:'refund-call-save'});
  refundWork.call.phase='result';a.modal='refundCallResult';academicRender();
}
function refundResultChange(value){
  if(!refundCallValid()||!refundCallResults.includes(value))return;
  const d=refundWork.call;d.result=value;
  $('#refund-followup').hidden=!['未接听','再次沟通'].includes(value)||(value!=='未接听'&&d.outcome==='撤回申请');
  $('#refund-parent-opinion').hidden=value==='未接听';
  $('#refund-no-answer-help').hidden=value!=='未接听';
  if(value==='未接听'){d.outcome='';$('#refund-opinion-select').value=''}
  $('#refund-destination-choice').hidden=value==='未接听'||d.outcome!=='继续退费';
  $('#refund-amount-choice').hidden=value==='未接听'||d.outcome!=='继续退费';
  refundCallAccountVisibility();
}
function refundOpinionChange(value){
  if(!refundCallValid()||!['','继续退费','撤回申请'].includes(value))return;
  refundWork.call.outcome=value;$('#refund-destination-choice').hidden=value!=='继续退费';
  $('#refund-amount-choice').hidden=value!=='继续退费';
  $('#refund-followup').hidden=!['未接听','再次沟通'].includes(refundWork.call.result)||value==='撤回申请';
  refundCallAccountVisibility();
}
const refundCallPreviousField=refundCallField;
refundCallField=function(key,value){
  if(!refundCallValid())return;
  refundCallPreviousField(key,value);
  if(key==='method')refundCallAccountVisibility();
};
function refundCallAccountVisible(d=refundWork.call){return d?.result!=='未接听'&&d?.outcome==='继续退费'&&d?.method==='customer'}
function refundCallAccountVisibility(){const card=$('#refund-call-account');if(card)card.hidden=!refundCallAccountVisible()}
function refundCallAccount(d){
  return `<section id="refund-call-account" class="refund-account-card" ${refundCallAccountVisible(d)?'':'hidden'}><div class="toolbar"><strong>退费账户 <span class="help">（可之后补填）</span></strong><button type="button" class="btn small" id="refund-account-copy" onclick="refundCopyAccount()">复制</button></div>${[['card','银行卡号'],['holder','开户人'],['bank','开户行'],['refundContact','联系电话']].map(([key,label])=>`<label class="refund-account-row" for="refund-account-${key}"><span>${label}：</span><input class="input" id="refund-account-${key}" value="${esc(d[key]||'')}" placeholder="选填" autocomplete="off" maxlength="${key==='bank'?120:key==='holder'?80:40}" ${key==='card'?'inputmode="numeric"':''} oninput="refundCallField('${key}',this.value)"></label>`).join('')}<textarea class="textarea refund-account-copy-text" id="refund-account-copy-text" aria-label="退费信息复制文本" readonly hidden></textarea></section>`;
}
function refundAccountText(d){return '【退费信息】\n银行卡号：'+String(d.card||'').trim()+'\n开户人：'+String(d.holder||'').trim()+'\n开户行：'+String(d.bank||'').trim()+'\n联系电话：'+String(d.refundContact||'').trim()}
async function refundCopyAccount(){
  if(!refundCallValid()||a.modal!=='refundCallResult'||!refundCallAccountVisible())return;
  const draft=refundWork.call,text=refundAccountText(draft);
  const current=()=>refundCallValid()&&a.modal==='refundCallResult'&&refundWork.call===draft&&refundCallAccountVisible();
  try{if(!globalThis.navigator?.clipboard?.writeText)throw Error();await navigator.clipboard.writeText(text);if(current())toast('退费信息已复制，可粘贴发送给家长');return}catch{}
  if(!current())return;
  const input=$('#refund-account-copy-text');input.hidden=false;input.value=text;input.focus();input.select();
  try{if(document.execCommand?.('copy')){input.hidden=true;$('#refund-account-copy').focus();toast('退费信息已复制，可粘贴发送给家长');return}}catch{}
  toast('自动复制不可用，已选中文本，请按 Ctrl+C 复制');
}
function refundCallAmount(r,d){
  return `<div id="refund-amount-choice" ${d.result!=='未接听'&&d.outcome==='继续退费'?'':'hidden'}><div class="field"><label class="required" for="refund-call-amount">退费金额（元）</label><div class="refund-amount-input"><input class="input" id="refund-call-amount" inputmode="decimal" placeholder="请输入退费金额" value="${esc(d.amount)}" oninput="refundCallField('amount',this.value)"><div class="refund-fee-help" onkeydown="if(event.key==='Escape'){event.preventDefault();document.activeElement.blur()}"><button type="button" class="btn small refund-fee-question" aria-label="查看费用信息" aria-describedby="refund-call-fees">?</button><div class="refund-fee-popover" id="refund-call-fees" role="tooltip"><div class="refund-fee-content">${refundCallFees(r)}</div></div></div></div></div></div>`;
}
function refundCallModal(){
  if(!refundCallValid())return '';
  const d=refundWork.call,r=refundCurrent(),close='<button class="btn small" aria-label="关闭" onclick="refundCallCancel()">×</button>';
  if(a.modal==='refundPhone')return `<div class="modal-backdrop"><section class="modal refund-phone-modal" role="dialog" aria-modal="true" aria-labelledby="refund-phone-title"><div class="modal-head"><h2 id="refund-phone-title">话务呼叫</h2>${close}</div><p>${esc(r.studentName)} · ${esc(d.phone||'未填写联系电话')}</p><p class="notice">当前尚未接入话务服务。完成外部通话后，点击“完成沟通”记录结果。</p><div class="modal-actions"><button class="btn" onclick="refundCallCancel()">取消</button><button class="btn primary" onclick="refundCallFinish()">完成沟通</button></div></section></div>`;
  const retry=['未接听','再次沟通'].includes(d.result)&&d.outcome!=='撤回申请',noAnswer=d.result==='未接听';
  return `<div class="modal-backdrop"><section class="modal refund-result-modal" role="dialog" aria-modal="true" aria-labelledby="refund-result-title"><div class="modal-head"><h2 id="refund-result-title">沟通情况记录</h2>${close}</div><p class="help">${esc(r.studentName)} · ${esc(refundSteps[r.step])} · 电话</p><div class="form-grid">${aField('沟通结果',`<select class="select" id="refund-result-select" onchange="refundResultChange(this.value)"><option value="">请选择沟通结果</option>${refundCallResults.map(v=>`<option ${d.result===v?'selected':''}>${v}</option>`).join('')}</select>`,true)}<div id="refund-followup" ${retry?'':'hidden'}>${refundField('nextTime','下次沟通时间',d.nextTime,'datetime-local','refundCallField')}</div><div id="refund-parent-opinion" ${noAnswer?'hidden':''}>${aField('家长最终意见',`<select class="select" id="refund-opinion-select" onchange="refundOpinionChange(this.value)"><option value="">请选择家长意见</option>${['继续退费','撤回申请'].map(v=>`<option ${d.outcome===v?'selected':''}>${v}</option>`).join('')}</select>`,true)}</div><div id="refund-destination-choice" ${!noAnswer&&d.outcome==='继续退费'?'':'hidden'}>${aField('退款去向',`<select class="select" onchange="refundCallField('method',this.value)"><option value="">请选择退款去向</option><option value="balance" ${d.method==='balance'?'selected':''}>存入账户余额</option><option value="customer" ${d.method==='customer'?'selected':''}>退回客户</option></select>`,true)}</div>${refundCallAmount(r,d)}</div><p class="help" id="refund-no-answer-help" ${noAnswer?'':'hidden'}>未接听时仅记录联系结果和下次沟通时间，家长意见待接通后确认。</p>${refundCallAccount(d)}${leadRecordEditor('沟通补充说明')}<div class="modal-actions"><button class="btn" onclick="refundCallCancel()">取消</button><button class="btn primary" id="refund-call-save" onclick="refundCompleteCall()">保存</button></div></section></div>`;
}
const refundCallPreviousModal=modalPage;
modalPage=function(){return a.modal==='refundApproval'?refundApprovalModal():['refundSupplementConnect','refundSupplement'].includes(a.modal)?refundSupplementModal():a.modal==='refundBankDetails'?refundBankDetailsModal():a.modal==='refundFact'?refundFactModal():['refundPhone','refundCallResult'].includes(a.modal)?refundCallModal():refundCallPreviousModal()};
refundCompleteCall=function(){
  if(!refundCallValid()||a.modal!=='refundCallResult'||refundWork.call.phase!=='result'||leadRecordDraft?.context!=='refundCall'||leadRecordDraft.requestId!==refundCurrent().id||!leadRecordReadyToSave())return;
  const r=refundCurrent(),d=refundWork.call,missed=d.result==='未接听',retry=d.result==='未接听'||(d.result==='再次沟通'&&d.outcome!=='撤回申请');
  if(!refundCallResults.includes(d.result)){toast('请选择沟通结果');return}
  if(retry&&(!Number.isFinite(Date.parse(d.nextTime))||Date.parse(d.nextTime)<=Date.now())){toast('请选择晚于当前时间的下次沟通时间');return}
  if(!missed&&!['继续退费','撤回申请'].includes(d.outcome)){toast('请选择家长最终意见');return}
  if(!missed&&d.outcome==='继续退费'&&!['balance','customer'].includes(d.method)){toast('请选择退款去向');return}
  const continuing=!missed&&d.outcome==='继续退费',amountText=String(d.amount||'').trim(),amount=continuing?enrollmentAmountCents(amountText):null;
  if(continuing&&(!/^\d+(\.\d{1,2})?$/.test(amountText)||!Number.isSafeInteger(amount)||amount<=0)){toast('请填写大于零的退费金额，最多保留两位小数');return}
  if(continuing&&Number.isSafeInteger(r.fees?.remainingFee)&&amount>r.fees.remainingFee){toast('退费金额不能超过剩余学费');return}
  const bankData={card:d.card.replace(/\s/g,''),holder:d.holder.trim(),bank:d.bank.trim(),refundContact:d.refundContact.trim()};
  if(continuing&&d.method==='customer'&&(!refundBankValid(bankData)||bankData.card.length>30||bankData.holder.length>80||bankData.bank.length>120||bankData.refundContact.length>30)){toast('请核对退费账户中的银行卡号和联系电话，未提供的资料可以留空');return}
  const student=a.students.find(s=>s.id===r.studentId);if(!student)return;
  const outcome=missed?'待确认':d.outcome;
  if(!missed)r.parentOpinion=outcome;
  if(!missed&&outcome==='继续退费'){
    r.requestedAmountCents=amount;r.amountCents=amount;
    r.destination=d.method==='customer'?{method:'customer',...bankData}:{method:'balance'};
  }
  const record={id:r.id+'-call-'+r.calls.length,requestId:r.id,step:r.step,category:r.step===1?'教务沟通':'教师沟通',role:r.step===1?'教务':'教师',operator:studentExamOperator(),time:d.time,recordedAt:new Date().toISOString(),channel:'电话',contact:d.contact,phone:d.phone,connected:!missed,...(continuing?{refundAmountCents:amount}:{}),result:d.result,nextTime:retry?d.nextTime:'',outcome,text:leadRecordDraft.note,conclusion:d.result+(missed?'':' · '+outcome),source:'外部电话 · 人工登记结果',files:leadRecordDraft.items.map(i=>({fileName:i.file.name,file:i.file,url:i.url,kind:i.kind,size:i.file.size,transcript:i.transcript||'',duration:i.duration||0})),aiStatus:'未分析',...(missed?{}:{destinationSnapshot:r.destination?{...r.destination}:null})};
  r.calls.push(record);(student.communications??=[]).push(record);
  refundAudit(r,refundSteps[r.step]+' · '+d.result,leadRecordDraft.note,{recordId:record.id});r.revision++;r.aiText='';r.aiError='';
  if(outcome==='撤回申请'){r.closed='已撤回';r.nextCommunication=null;refundAudit(r,'家长撤回申请','本次沟通记录已保留')}
  else if(retry)r.nextCommunication={step:r.step,time:d.nextTime,result:d.result,operator:record.operator};
  else {r.nextCommunication=null;r.step++}
  leadRecordDraft.items=[];refundResetEditor();academicRender();toast(outcome==='撤回申请'?'已撤回申请，沟通记录已保存':retry?'沟通记录及下次沟通时间已保存':'沟通记录已保存');
};
const refundCallPreviousTask=refundTask;
function refundCanCommunicate(r){return state.page==='withdraw'&&r&&!r.closed&&r.step<6&&[1,2,3,4,5].some(step=>refundCan(step))}
refundCommunicationActions=function(r){
  if(!refundCanCommunicate(r))return '';
  return `<div class="actions refund-communication-actions"><button class="btn small" onclick="refundStartChannel('电话')">☎ 话务呼叫</button><button class="btn small" onclick="refundStartChannel('企微')">企微沟通</button><button class="btn small" onclick="refundStartChannel('上传记录')">↑ 上传记录</button></div>`;
};
function refundStartChannel(channel){
  const r=refundCurrent();if(!refundCanCommunicate(r)||!['电话','企微','上传记录'].includes(channel))return;
  if(channel==='电话'&&[1,2].includes(r.step)&&refundCan(r.step)){refundCallStart();return}
  refundResetEditor();refundSupplementDraft={requestId:r.id,revision:r.revision,actor:studentTermActor(),step:r.step,channel,time:new Date().toISOString()};
  if(channel==='上传记录'){a.modal='refundSupplementConnect';refundSupplementFinish()}
  else {a.modal='refundSupplementConnect';academicRender()}
}
function refundSupplementValid(){const r=refundCurrent(),d=refundSupplementDraft;return d&&r?.id===d.requestId&&r.revision===d.revision&&r.step===d.step&&d.actor===studentTermActor()&&refundCanCommunicate(r)}
function refundSupplementFinish(){
  if(!refundSupplementValid()||a.modal!=='refundSupplementConnect')return;
  leadDisposeRecord();leadRecordDraft=leadCreateRecordDraft('refundSupplement');
  Object.assign(leadRecordDraft,{requestId:refundCurrent().id,actorId:studentTermActor(),saveId:'refund-supplement-save'});
  a.modal='refundSupplement';academicRender();
}
const refundSupplementPreviousClean=leadCleanClosedRecord;
leadCleanClosedRecord=function(){if(leadRecordDraft?.context==='refundSupplement'){if(!refundSupplementValid()||a.modal!=='refundSupplement')refundResetEditor();return}return refundSupplementPreviousClean()};
function refundSupplementModal(){
  if(!refundSupplementValid())return '';
  const d=refundSupplementDraft,r=refundCurrent(),student=a.students.find(s=>s.id===r.studentId),close='<button class="btn small" aria-label="关闭" onclick="refundCallCancel()">×</button>';
  if(a.modal==='refundSupplementConnect')return `<div class="modal-backdrop"><section class="modal refund-phone-modal" role="dialog" aria-modal="true" aria-labelledby="refund-connect-title"><div class="modal-head"><h2 id="refund-connect-title">${d.channel==='电话'?'话务呼叫':'企微沟通'}</h2>${close}</div><p>${esc(r.studentName)} · ${esc(student?.phone||'')}</p><p class="notice">${d.channel==='电话'?'当前尚未接入话务服务，完成外部通话后点击“完成沟通”记录结果。':'当前尚未接入企微聊天服务，完成交流后点击“完成沟通”，可上传聊天截图和语音。'}</p><div class="modal-actions"><button class="btn" onclick="refundCallCancel()">取消</button><button class="btn primary" onclick="refundSupplementFinish()">完成沟通</button></div></section></div>`;
  return `<div class="modal-backdrop"><section class="modal refund-result-modal" role="dialog" aria-modal="true" aria-labelledby="refund-supplement-title"><div class="modal-head"><h2 id="refund-supplement-title">${d.channel==='上传记录'?'上传沟通记录':'记录'+d.channel+'沟通'}</h2>${close}</div><p class="help">${esc(r.studentName)} · ${esc(studentExamOperator().name)}</p><p class="help">补充记录将保存到沟通栏。教务和教师的电话沟通仍需分别完成，补充记录不会推进审批环节。</p>${leadRecordEditor('沟通内容')}<div class="modal-actions"><button class="btn" onclick="refundCallCancel()">取消</button><button class="btn primary" id="refund-supplement-save" onclick="refundSupplementSave()">保存</button></div></section></div>`;
}
function refundSupplementSave(){
  if(!refundSupplementValid()||a.modal!=='refundSupplement'||leadRecordDraft?.context!=='refundSupplement'||leadRecordDraft.requestId!==refundCurrent().id||!leadRecordReadyToSave())return;
  if(!leadRecordDraft.note.trim()&&!leadRecordDraft.items.length){toast('请填写沟通内容或上传记录');return}
  const r=refundCurrent(),d=refundSupplementDraft,student=a.students.find(s=>s.id===r.studentId);if(!student)return;
  const operator=studentExamOperator(),category=permissionState.identity==='teacher'||/教师/.test(operator.role)?'教师沟通':'教务沟通';
  const record={id:r.id+'-call-'+r.calls.length,requestId:r.id,step:r.step,supplemental:true,category,role:operator.role,operator,time:d.time,recordedAt:new Date().toISOString(),channel:d.channel,contact:student.guardian||'家长',phone:student.phone||'',source:d.channel==='电话'?'外部电话 · 补充记录':d.channel==='企微'?'企微交流 · 人工记录':'人工上传记录',result:'补充记录',outcome:'',text:leadRecordDraft.note,files:leadRecordDraft.items.map(i=>({fileName:i.file.name,file:i.file,url:i.url,kind:i.kind,size:i.file.size,transcript:i.transcript||'',duration:i.duration||0})),aiStatus:'未分析'};
  r.calls.push(record);(student.communications??=[]).push(record);r.revision++;r.aiText='';r.aiError='';refundAudit(r,'补充'+d.channel+'沟通',record.text,{recordId:record.id});
  leadRecordDraft.items=[];refundResetEditor();academicRender();toast('沟通记录已保存');
}
refundApprovalAction=function(r){
  if(r.closed||![3,4].includes(r.step))return '';
  return `<div class="refund-approval-action"><button class="btn primary" ${refundCan(r.step)?'':'disabled'} title="${refundCan(r.step)?refundSteps[r.step]:'等待'+refundSteps[r.step]}" onclick="refundOpenApproval()">退费审批</button></div>`;
};
function refundOpenApproval(){
  const r=refundCurrent();if(!r||r.closed||![3,4].includes(r.step)||!refundCan(r.step))return;
  refundResetEditor();refundApprovalDraft={requestId:r.id,revision:r.revision,actor:studentTermActor(),step:r.step};a.modal='refundApproval';academicRender();
}
function refundApprovalValid(){const r=refundCurrent(),d=refundApprovalDraft;return state.page==='withdraw'&&d&&a.modal==='refundApproval'&&r?.id===d.requestId&&r.revision===d.revision&&r.step===d.step&&!r.closed&&d.actor===studentTermActor()&&refundCan(r.step)}
function refundApprovalSummary(record){
  return `<div class="refund-approval-ai"><div class="profile-text">${esc(record.aiText||record.aiError||(record.aiBusy?'正在生成 AI 总结…':'暂未生成 AI 总结'))}</div><button type="button" class="btn small" ${record.aiBusy?'disabled':''} onclick="refundAnalyze('${record.id}')">${record.aiBusy?'生成中…':record.aiText?'刷新总结':'生成总结'}</button></div>`;
}
function refundApprovalEvents(r){
  const parent=refundParentRecord(r),calls=r.calls.map((record,index)=>({record,index})).sort((a,b)=>{
    const first=Date.parse(a.record.time),second=Date.parse(b.record.time);
    return Number.isFinite(first)&&Number.isFinite(second)&&first!==second?first-second:a.index-b.index;
  });
  const rows=[...(parent?[{record:parent,label:'申请退费'}]:[]),...calls.map(({record},index)=>({record,label:index===0?'第一次沟通':index===1?'第二次沟通':`第${index+1}次沟通`}))];
  const linked=new Set();
  for(const [index,event] of (r.audit||[]).entries()){
    // Old session records have no recordId: pair each matching communication once.
    const row=rows.find(row=>!row.operation&&!linked.has(row)&& (event.recordId?event.recordId===row.record.id:
      row.record===parent?event.action==='登记申请':
      row.record.supplemental?event.action==='补充'+row.record.channel+'沟通':
      [refundSteps[row.record.step]+' · '+row.record.result,refundSteps[row.record.step]+'完成'].includes(event.action)));
    if(row){linked.add(row);row.order=index;row.savedAt=event.time;continue}
    rows.push({record:event,operation:true,order:index,label:event.action.replace('审核退回教务补充','审核驳回（退回教务补充）')});
  }
  let callNumber=0;
  return rows.sort((a,b)=>{
    if(a.record===parent||b.record===parent)return a.record===b.record?0:a.record===parent?-1:1;
    const first=Date.parse(a.savedAt||a.record.recordedAt||a.record.time),second=Date.parse(b.savedAt||b.record.recordedAt||b.record.time);
    return Number.isFinite(first)&&Number.isFinite(second)&&first!==second?first-second:(a.order??Infinity)-(b.order??Infinity);
  }).map(row=>{
    if(!row.operation&&row.record!==parent){callNumber++;row.label=callNumber===1?'第一次沟通':callNumber===2?'第二次沟通':`第${callNumber}次沟通`}
    return row;
  });
}
function refundApprovalHistory(r){
  const rows=refundApprovalEvents(r);
  return `<div class="refund-approval-history"><table><thead><tr><th>时间</th><th>操作记录</th><th>操作人 / 账号</th><th>记录内容 / AI 总结</th></tr></thead><tbody>${rows.map(({record,label,operation,savedAt})=>`<tr><td>${(savedAt||record.recordedAt||record.time)?esc(studentProfileTime(savedAt||record.recordedAt||record.time)):'未记录'}</td><td><strong>${esc(label)}</strong>${record.channel?`<div class="help">${esc(record.channel)}</div>`:''}</td><td>${esc(record.operator?.name||'未记录')}<div class="help">${esc(record.operator?.account||'账号未记录')}</div>${record.operator?.role?`<div class="help">${esc(record.operator.role)}</div>`:''}</td><td>${operation?`<div class="profile-text">${esc(record.note||'操作已记录')}</div>`:`<div class="profile-text">${esc([record.result,record.outcome,record.text||record.conclusion].filter(Boolean).join(' · '))}</div>${refundApprovalSummary(record)}`}</td></tr>`).join('')||'<tr><td colspan="4">暂无办理记录</td></tr>'}</tbody></table></div>`;
}
function refundApprovalModal(){
  if(!refundApprovalValid())return '';
  const r=refundCurrent(),student=a.students.find(s=>s.id===r.studentId),cls=a.classes.find(c=>c.id===r.classId),amount=refundConfirmedAmount(r),known=Number.isSafeInteger(amount)&&amount>0&&['balance','customer'].includes(r.destination?.method);
  return `<div class="modal-backdrop"><section class="modal refund-approval-modal" role="dialog" aria-modal="true" aria-labelledby="refund-approval-title"><div class="modal-head"><div><h2 id="refund-approval-title">退费审批</h2><p class="help">${esc(refundSteps[r.step])}</p></div><button class="btn small" aria-label="关闭" onclick="refundCallCancel()">×</button></div><section class="refund-approval-basic"><h3 class="section-title">基本退费信息</h3><div class="refund-approval-basic-grid"><div><span class="help">学生姓名 / 电话</span><p>${esc(r.studentName)} / ${esc(student?.phone||'未记录')}</p></div><div><span class="help">报名班级</span><p>${esc(r.className)}</p></div><div><span class="help">教师 / 教务</span><p>${esc(cls?.teacher||'未指定')} / ${esc(cls?classAcademicTeacherLabel(cls)||'未指定':'未指定')}</p></div></div><div class="refund-approval-fees">${refundCallFees(r,false)}<div class="summary-line refund-confirmed-fee"><span>退费金额</span><strong>${Number.isSafeInteger(amount)&&amount>0?withdrawMoney(amount):'未填写'}</strong></div><div class="summary-line"><span>退款方式</span><strong>${esc(r.destination?.method==='balance'?'存入账户余额':r.destination?.method==='customer'?'退回客户':'待确认')}</strong></div></div>${known?'':'<p class="help">退费金额或退款方式尚未确认，可驳回教务补充。</p>'}</section><section class="refund-approval-records"><h3 class="section-title">沟通与办理记录</h3>${refundApprovalHistory(r)}</section><section class="refund-approval-decision"><div class="toolbar"><h3 class="section-title">审批操作</h3><div class="actions"><button class="btn primary" ${known?'':'disabled'} onclick="refundDecision(true)">通过</button><button class="btn" onclick="refundDecision(false)">驳回</button></div></div><label class="required" for="refund-approval-note">审批备注</label><textarea class="textarea" id="refund-approval-note" placeholder="请填写审批备注" oninput="refundWork.opinion=this.value">${esc(refundWork.opinion)}</textarea><p class="help">驳回后退回教务补充，已有沟通及审批记录保留。</p></section></section></div>`;
}
const refundApprovalPreviousDecision=refundDecision;
refundDecision=function(approve){if(a.modal==='refundApproval'&&!refundApprovalValid())return;return refundApprovalPreviousDecision(approve)};
refundTask=function(r){
  if(r.closed||![1,2].includes(r.step))return refundCallPreviousTask(r);
  return `<div class="toolbar"><h2 class="section-title">${refundSteps[r.step]}</h2></div><p class="help">${refundCan(r.step)?'通话结束后点击“完成沟通”，记录结果及家长意见。':'等待对应岗位完成电话沟通。'}</p>${r.nextCommunication?.step===r.step?`<p class="refund-next-call">${esc(r.nextCommunication.result)} · 下次沟通时间：<strong>${esc(studentProfileTime(r.nextCommunication.time))}</strong></p>`:''}`;
};
function refundBankCanEdit(r){return !r.closed&&r.step<6&&(refundCan(1)||refundCan(2)||refundCan(5))}
function refundBankState(r){
  const actor=studentTermActor();
  if(!refundBankDraft||refundBankDraft.requestId!==r.id||refundBankDraft.actor!==actor||refundBankDraft.revision!==r.revision)refundBankDraft={requestId:r.id,actor,revision:r.revision,card:r.destination.card||'',holder:r.destination.holder||'',bank:r.destination.bank||'',refundContact:r.destination.refundContact||''};
  return refundBankDraft;
}
function refundBankField(key,value){const r=refundCurrent();if(r?.destination?.method==='customer'&&refundBankCanEdit(r)&&['card','holder','bank','refundContact'].includes(key))refundBankState(r)[key]=value}
function refundBankValid(d,required=false){
  return (!required||Object.values(d).every(Boolean))&&(!d.card||/^\d{8,30}$/.test(d.card))&&(!d.refundContact||/^\+?[\d ()-]{6,30}$/.test(d.refundContact));
}
function refundSaveBank(){
  const r=refundCurrent(),d=refundBankDraft;if(!r||r.destination?.method!=='customer'||!refundBankCanEdit(r)||!d||d.requestId!==r.id||d.actor!==studentTermActor()||d.revision!==r.revision)return;
  const data={card:d.card.replace(/\s/g,''),holder:d.holder.trim(),bank:d.bank.trim(),refundContact:d.refundContact.trim()};
  if(!refundBankValid(data)){toast('请核对银行卡号和联系电话；暂未提供的项目可以留空');return}
  Object.assign(r.destination,data);r.revision++;refundAudit(r,'保存退费信息');refundBankDraft=null;academicRender();toast('退费信息已保存');
}
function refundBankPanel(r){
  if(r.destination?.method!=='customer')return '';
  const editable=refundBankCanEdit(r),d=editable?refundBankState(r):r.destination;
  return `<section class="card pad page-block refund-bank-panel"><h2 class="section-title">退费信息</h2><p class="help">可暂留空，后续补充；实际退款前需核对完整收款资料。</p><div class="form-grid">${[['card','银行卡号'],['holder','开户名'],['bank','开户行'],['refundContact','联系电话']].map(([key,label])=>aField(label,editable?`<input class="input" id="refund-bank-${key}" value="${esc(d[key]||'')}" placeholder="选填" autocomplete="off" maxlength="${key==='bank'?120:key==='holder'?80:40}" oninput="refundBankField('${key}',this.value)">`:`<p>${esc(key==='card'&&d.card?d.card.slice(0,4)+' **** '+d.card.slice(-4):d[key]||'—')}</p>`)).join('')}</div>${editable?'<div class="form-actions"><button class="btn" onclick="refundSaveBank()">保存退费信息</button></div>':''}</section>`;
}
refundDestinationInfo=function(r){return r.destination?`<p>退款去向：<strong>${r.destination.method==='balance'?'存入账户余额':'退回客户'}</strong></p>`:'<p class="help">退款去向在沟通结果中确认。</p>'};
const refundFactLabels={opinion:'家长意见',method:'退款去向',amount:'退款金额（元）',card:'银行卡号',holder:'开户人',bank:'开户行',refundContact:'联系电话'};
function refundFactCanEdit(r,key){
  return state.page==='withdraw'&&r&&!r.closed&&r.step<6&&Object.hasOwn(refundFactLabels,key)&&[1,2,3,4,5].some(step=>refundCan(step))&&(!['card','holder','bank','refundContact'].includes(key)||r.destination?.method==='customer');
}
function refundFactValue(r,key){
  if(key==='opinion')return r.parentOpinion||r.calls.slice().reverse().find(c=>['继续退费','撤回申请'].includes(c.outcome))?.outcome||'';
  if(key==='amount'){const cents=r.requestedAmountCents??(r.destination?r.amountCents:null);return Number.isSafeInteger(cents)?(cents/100).toFixed(2):''}
  return r.destination?.[key]||'';
}
function refundFactDisplay(key,value){
  if(!value)return ['card','holder','bank','refundContact'].includes(key)?'未填写':'待确认';
  if(key==='method')return value==='balance'?'存入账户余额':'退回客户';
  if(key==='amount')return withdrawMoney(enrollmentAmountCents(value));
  return value;
}
refundFacts=function(r){
  if(!r.calls.length&&!r.parentOpinion&&!r.destination)return ''; 
  const keys=['opinion','method','amount'];
  return `<div class="refund-facts"><h3 class="section-title">退费确认信息</h3><div class="refund-facts-grid">${keys.map(key=>{
    const editable=refundFactCanEdit(r,key),value=refundFactValue(r,key),shown=key==='card'&&value&&!editable?value.slice(0,4)+' **** '+value.slice(-4):refundFactDisplay(key,value);
    return `<div class="refund-fact" id="${['card','holder','bank','refundContact'].includes(key)?'refund-bank-':'refund-fact-'}${key}"><span class="help">${refundFactLabels[key]}</span><div class="refund-fact-value"><span>${esc(shown)}</span>${editable?`<button type="button" class="btn small refund-edit-icon" title="修改${refundFactLabels[key]}" aria-label="修改${refundFactLabels[key]}" onclick="refundFactEdit('${key}')">${refundEditIcon()}</button>`:''}</div></div>`;
  }).join('')}${refundBankSummary(r)}</div></div>`;
};
function refundEditIcon(){return "<svg width=\"21\" height=\"21\" viewBox=\"0 0 24 24\" fill=\"none\" aria-hidden=\"true\"><path d=\"M14 4H5a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3v-7\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"m9.3 13.8 8.8-8.8 3.6 3.6-8.8 8.8-4.6 1 1-4.6Zm9.8-9.8 1.2-1.2a1.4 1.4 0 0 1 2 0l1.6 1.6a1.4 1.4 0 0 1 0 2l-1.2 1.2L19.1 4Z\" fill=\"currentColor\"/><path d=\"m10.1 14.7 2 2-2.6.6.6-2.6Z\" fill=\"white\"/></svg>"}
function refundBankSummary(r){
  if(r.destination?.method!=='customer')return '';
  const card=String(r.destination.card||'').replace(/\s/g,'');
  return `<div class="refund-fact refund-bank-summary"><div class="refund-bank-heading"><span class="help">退费信息：</span><button class="refund-details-link" type="button" onclick="refundOpenBankDetails()">详情</button></div><div class="refund-fact-value"><span id="refund-bank-card">${card?'**** **** **** '+esc(card.slice(-4)):'银行卡号未填写'}</span>${refundFactCanEdit(r,'card')?`<button type="button" class="btn small refund-edit-icon" title="修改退费信息" aria-label="修改退费信息" onclick="refundOpenBankDetails(true)">${refundEditIcon()}</button>`:''}</div></div>`;
}
function refundOpenBankDetails(editing=false){
  const r=refundCurrent();if(state.page!=='withdraw'||!permissionCanVisit('withdraw')||r?.destination?.method!=='customer'||editing&&!refundFactCanEdit(r,'card'))return;
  refundResetEditor();refundAccountView={requestId:r.id,revision:r.revision,actor:studentTermActor(),editing,values:Object.fromEntries(['card','holder','bank','refundContact'].map(key=>[key,r.destination[key]||'']))};a.modal='refundBankDetails';academicRender();
}
function refundBankDetailsValid(){
  const r=refundCurrent(),d=refundAccountView;
  return state.page==='withdraw'&&permissionCanVisit('withdraw')&&a.modal==='refundBankDetails'&&d&&r?.id===d.requestId&&r.revision===d.revision&&d.actor===studentTermActor()&&r.destination?.method==='customer'&&(!d.editing||refundFactCanEdit(r,'card'));
}
function refundBankDetailsInput(key,value){if(refundBankDetailsValid()&&refundAccountView.editing&&Object.hasOwn(refundAccountView.values,key))refundAccountView.values[key]=value}
function refundBankDetailsModal(){
  if(!refundBankDetailsValid())return '';
  const d=refundAccountView;
  return `<div class="modal-backdrop"><section class="modal refund-bank-details-modal" role="dialog" aria-modal="true" aria-labelledby="refund-bank-details-title"><div class="modal-head"><h2 id="refund-bank-details-title">${d.editing?'修改退费信息':'退费信息'}</h2><div class="actions"><button type="button" class="btn small" id="refund-bank-details-copy" onclick="refundCopyBankDetails()">复制</button><button class="btn small" aria-label="关闭" onclick="refundCallCancel()">×</button></div></div>${Object.entries(d.values).map(([key,value])=>d.editing?aField(refundFactLabels[key],`<input class="input" id="refund-bank-edit-${key}" value="${esc(value)}" placeholder="选填" autocomplete="off" maxlength="${key==='bank'?120:key==='holder'?80:40}" ${key==='card'?'inputmode="numeric"':''} oninput="refundBankDetailsInput('${key}',this.value)">`):`<div class="refund-bank-detail-row"><span class="help">${refundFactLabels[key]}：</span><span>${esc(value||'未填写')}</span></div>`).join('')}<textarea class="textarea refund-account-copy-text" id="refund-bank-details-copy-text" aria-label="退费信息复制文本" readonly hidden></textarea>${d.editing?'<p class="help">各项可留空，实际退款前需补齐并核对。</p>':''}<div class="modal-actions"><button class="btn" onclick="refundCallCancel()">${d.editing?'取消':'关闭'}</button>${d.editing?'<button class="btn primary" onclick="refundBankDetailsSave()">保存</button>':''}</div></section></div>`;
}
function refundBankDetailsSave(){
  if(!refundBankDetailsValid()||!refundAccountView.editing)return;
  const r=refundCurrent(),d=refundAccountView.values,data={card:d.card.replace(/\s/g,''),holder:d.holder.trim(),bank:d.bank.trim(),refundContact:d.refundContact.trim()};
  if(!refundBankValid(data)||data.holder.length>80||data.bank.length>120){toast('请核对收款资料的格式，暂未提供的项目可以留空');return}
  if(Object.entries(data).every(([key,value])=>value===(r.destination[key]||''))){refundCallCancel();return}
  Object.assign(r.destination,data);r.revision++;refundAudit(r,'修改退费信息','已更新收款资料');refundResetEditor();academicRender();toast('退费信息已保存');
}
async function refundCopyBankDetails(){
  if(!refundBankDetailsValid())return;
  const draft=refundAccountView,text=refundAccountText(draft.values),current=()=>refundBankDetailsValid()&&refundAccountView===draft;
  try{if(!globalThis.navigator?.clipboard?.writeText)throw Error();await navigator.clipboard.writeText(text);if(current())toast('退费信息已复制');return}catch{}
  if(!current())return;
  const input=$('#refund-bank-details-copy-text');input.hidden=false;input.value=text;input.focus();input.select();
  try{if(document.execCommand?.('copy')){input.hidden=true;$('#refund-bank-details-copy').focus();toast('退费信息已复制');return}}catch{}
  toast('自动复制不可用，已选中文本，请按 Ctrl+C 复制');
}
function refundFactEdit(key){
  const r=refundCurrent();if(!refundFactCanEdit(r,key))return;
  refundResetEditor();refundFactDraft={requestId:r.id,revision:r.revision,actor:studentTermActor(),key,value:refundFactValue(r,key)};a.modal='refundFact';academicRender();
}
function refundFactValid(){const r=refundCurrent(),d=refundFactDraft;return a.modal==='refundFact'&&d&&r?.id===d.requestId&&r.revision===d.revision&&d.actor===studentTermActor()&&refundFactCanEdit(r,d.key)}
function refundFactInput(value){if(refundFactValid())refundFactDraft.value=value}
function refundFactModal(){
  if(!refundFactValid())return '';
  const d=refundFactDraft,r=refundCurrent(),label=refundFactLabels[d.key],choices=d.key==='opinion'?[['继续退费','继续退费'],['撤回申请','撤回申请']]:d.key==='method'?[['balance','存入账户余额'],['customer','退回客户']]:null;
  const control=choices?`<select id="refund-fact-value" class="select" onchange="refundFactInput(this.value)"><option value="">请选择</option>${choices.map(([value,name])=>`<option value="${value}" ${value===d.value?'selected':''}>${name}</option>`).join('')}</select>`:`<input id="refund-fact-value" class="input" value="${esc(d.value)}" ${d.key==='amount'?'inputmode="decimal"':d.key==='card'?'inputmode="numeric"':''} autocomplete="off" maxlength="${d.key==='bank'?120:d.key==='holder'?80:40}" oninput="refundFactInput(this.value)">`;
  return `<div class="modal-backdrop"><section class="modal refund-fact-modal" role="dialog" aria-modal="true" aria-labelledby="refund-fact-title"><div class="modal-head"><h2 id="refund-fact-title">修改${label}</h2><button class="btn small" aria-label="关闭" onclick="refundCallCancel()">×</button></div>${aField(label,control,['opinion','method','amount'].includes(d.key))}${d.key==='opinion'?'<p class="help">选择“撤回申请”并保存，将结束本次申请，保留原有沟通记录。</p>':''}${d.key==='amount'?`<details class="refund-edit-fees"><summary>查看费用信息</summary>${refundCallFees(r)}</details>`:''}${['method','amount'].includes(d.key)&&r.step>=4?'<p class="help">修改后将重新进入主管审核。</p>':''}<div class="modal-actions"><button class="btn" onclick="refundCallCancel()">取消</button><button class="btn primary" onclick="refundFactSave()">保存</button></div></section></div>`;
}
function refundFactSave(){
  if(!refundFactValid())return;
  const r=refundCurrent(),d=refundFactDraft,key=d.key,before=refundFactValue(r,key);let value=String(d.value).trim();
  if(key==='opinion'&&!['继续退费','撤回申请'].includes(value)){toast('请选择家长意见');return}
  if(key==='method'&&!['balance','customer'].includes(value)){toast('请选择退款去向');return}
  let cents;
  if(key==='amount'){
    cents=enrollmentAmountCents(value);
    if(!/^\d+(\.\d{1,2})?$/.test(value)||!Number.isSafeInteger(cents)||cents<=0){toast('请填写大于零的退款金额，最多保留两位小数');return}
    if(Number.isSafeInteger(r.fees?.remainingFee)&&cents>r.fees.remainingFee){toast('退款金额不能超过剩余学费');return}
    value=(cents/100).toFixed(2);
  }
  if(key==='card')value=value.replace(/\s/g,'');
  if(key==='card'&&!refundBankValid({card:value})||key==='refundContact'&&!refundBankValid({refundContact:value})){toast('请核对填写格式，也可以暂留空');return}
  if(value.length>(key==='bank'?120:key==='holder'?80:40)){toast('填写内容过长');return}
  if(value===before){refundCallCancel();return}
  if(key==='opinion'){
    r.parentOpinion=value;
    if(value==='撤回申请'){r.closed='已撤回';r.nextCommunication=null;r.approvedCents=null}
  }else if(key==='amount'){r.requestedAmountCents=cents;r.amountCents=cents}
  else {r.destination??={};r.destination[key]=value}
  refundAudit(r,'修改'+refundFactLabels[key],['card','holder','bank','refundContact'].includes(key)?'已更新收款资料':refundFactDisplay(key,before)+' → '+refundFactDisplay(key,value));
  if(['amount','method'].includes(key)){
    r.approvedCents=null;
    if(r.step>=4){r.step=3;refundAudit(r,'重新提交主管审核','退款金额或去向已修改')}
  }
  r.revision++;refundResetEditor();academicRender();toast(key==='opinion'&&value==='撤回申请'?'已撤回申请，原有记录已保留':'已保存修改');
}
refundCallCards=function(r){
  return r.calls.map(c=>`<article class="refund-call-card"><div class="toolbar"><strong>${esc(c.category)} · ${esc(c.operator.name)}</strong><span>${esc(studentProfileTime(c.time))}</span></div><p class="help">${esc(c.contact)} · ${esc(c.phone)} · ${esc(c.source)}</p><p><strong>沟通结果：</strong>${esc(c.result||c.conclusion)}${c.outcome&&c.outcome!=='待确认'?' · '+esc(c.outcome):''}</p>${Number.isSafeInteger(c.refundAmountCents)?`<p>退费金额：<strong>${withdrawMoney(c.refundAmountCents)}</strong></p>`:''}${c.nextTime?`<p class="help">下次沟通时间：${esc(studentProfileTime(c.nextTime))}</p>`:''}${c.text?`<div class="profile-text">${esc(c.text)}</div>`:''}<div class="refund-call-recording">${leadRecordFilesHTML(c)}${c.files.some(f=>f.kind==='audio')?'':'<p class="help">本次暂无录音文件。</p>'}</div><div class="refund-ai"><div class="toolbar"><strong>AI 沟通分析</strong><button class="btn small" ${c.aiBusy?'disabled':''} onclick="refundAnalyze('${c.id}')">${c.aiBusy?'分析中…':'分析 / 重试'}</button></div><p class="profile-text">${esc(c.aiText||c.aiError||'尚未生成分析。可依据录音转写和沟通补充说明分析退费原因、家长诉求及待办事项。')}</p></div>${c.files.map((f,i)=>f.kind==='audio'?`<details class="refund-call-transcript" ${f.transcript?'':'open'}><summary>录音转写 · ${esc(f.fileName)}</summary><div class="profile-text">${esc(f.transcript||f.error||'暂无转写')}</div><button class="btn small" ${f.busy?'disabled':''} onclick="refundTranscribe('${c.id}',${i})">${f.busy?'转写中…':'AI 转文字 / 重试'}</button></details>`:'').join('')}</article>`).join('')||'<div class="empty">暂无沟通记录</div>';
};
const refundCallPreviousFinance=refundFinanceComplete;
refundFinanceComplete=function(){
  const r=refundCurrent();if(r?.step===5&&refundCan(5)&&r.destination?.method==='customer'){
    const d=r.destination;if(!refundBankValid({card:d.card||'',holder:d.holder||'',bank:d.bank||'',refundContact:d.refundContact||''},true)){toast('请先补齐并保存退费信息，再确认实际退款');return}
  }
  return refundCallPreviousFinance();
};
refundAnalyze=async function(callId){
  const r=refundCurrent();if(!r||!permissionCanVisit('withdraw'))return;
  const parent=refundParentRecord(r),c=callId?(r.calls.find(c=>c.id===callId)||(parent?.id===callId?parent:null)):r;if(!c||c.aiBusy)return;
  const calls=callId?[c]:r.calls;if(!calls.length){toast('暂无沟通记录');return}
  if(typeof globalThis.crmSummarizeCommunications!=='function'){c.aiError='AI 分析服务尚未接入，未生成分析结果。';academicRender();return}
  const rev=r.revision,actor=studentTermActor();c.aiBusy=true;c.aiError='';academicRender();
  try{const result=await globalThis.crmSummarizeCommunications({context:'refund',instruction:'只依据已提供的沟通结果、补充说明和录音转写总结退费原因、家长诉求、承诺和待办。区分人工登记与原始录音；未接听不得推测家长意见。缺少内容须说明，不编造事实或代替审批。',records:calls.map(x=>({role:x.role,time:x.time,result:x.result,source:x.source,outcome:x.outcome,nextTime:x.nextTime,transcripts:x.files.map(f=>f.transcript).filter(Boolean),note:x.text}))});const text=typeof result==='string'?result:result?.text;if(!text?.trim())throw Error();if(r.revision===rev&&actor===studentTermActor()){c.aiText=text.trim();c.aiStatus='已分析'}}catch{c.aiError='分析失败，请重试；原始记录已保留。'}finally{c.aiBusy=false;if(refundCurrent()===r&&state.page==='withdraw')academicRender()}
};
