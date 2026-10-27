// 退课申请状态机。数据与录音沿用原型会话存储；付款须由财务登记实际凭证。
const refundSteps=['登记申请','教务电话沟通','教师电话沟通','主管审核','校长审核','财务办理','已完成'];
const refundActions=['refundCreate','refundAcademic','refundTeacher','refundManager','refundPrincipal','refundFinance'];
permissionGroups.push({id:'refundWorkflow',name:'退课审批流程',items:refundActions.map((id,i)=>[id,refundSteps[i]])});
permissionAll.push(...refundActions);
for(const [id,name] of [['teacher','授课教师'],['principal','校长']])if(!permissionRole(id))permissionState.roles.push({id,name,active:true,grants:[]});
for(const [role,grants] of [['academic',['withdraw','refundCreate','refundAcademic']],['teacher',['withdraw','refundTeacher']],['manager',['withdraw','refundManager']],['principal',['withdraw','refundPrincipal']],['finance',['withdraw','refundFinance']]]){
  const entry=permissionRole(role);if(entry)entry.grants=[...new Set([...entry.grants,...grants])];
}
if(!permissionState.dirty)permissionState.working=new Set(permissionRole(permissionState.selected)?.grants||[]);
a.refundApplications??=[];
const refundWork={selectedId:null,list:false,tab:'create',call:null,opinion:'',approved:'',payment:null,sequence:0,actor:studentTermActor()};
function refundCan(step){return permissionCanVisit('withdraw')&&(permissionState.identity==='admin'||permissionRole()?.grants.includes(refundActions[step]))}
function refundCurrent(){return a.refundApplications.find(r=>r.id===refundWork.selectedId)}
function refundAudit(r,action,note='',details={}){
  r.audit??=[];
  r.audit.push({id:r.id+'-audit-'+r.audit.length,action,note,time:new Date().toISOString(),operator:{...studentExamOperator()},step:r.step,...details});
}
function refundParentRecord(r){
  if(!r.parentCommunication&&(r.reason?.trim()||r.reasonFiles?.length)){
    const entry=r.audit.find(e=>e.action==='登记申请');
    const operator={...(entry?.operator||{name:'未记录',account:'',role:'未记录'})};
    r.parentCommunication={id:r.id+'-application',requestId:r.id,title:'家长申请',category:'教务沟通',role:operator.role,operator,time:r.createdAt||entry?.time||'',recordedAt:r.createdAt||entry?.time||'',channel:'申请登记',source:'退课／退班申请',text:r.reason||'',files:r.reasonFiles||[]};
  }
  const record=r.parentCommunication,student=a.students.find(s=>s.id===r.studentId);
  if(record&&student&&!(student.communications||[]).some(c=>c.id===record.id))(student.communications??=[]).push(record);
  return record;
}
function refundParentCard(record){
  if(!record)return '';
  return `<article class="refund-call-card refund-parent-request"><div class="toolbar"><strong>家长申请：${esc(record.operator.account||record.operator.name)}（账号归属：${esc(record.operator.role||'未记录')}）</strong><span>${record.time?esc(studentProfileTime(record.time)):'时间未记录'}</span></div><p class="help">记录人：${esc(record.operator.name)}</p><div class="profile-text">家长诉求：${esc(record.text)}</div>${leadRecordFilesHTML(record)}${record.files.filter(f=>f.transcript).map(f=>`<details><summary>申请附件转写 · ${esc(f.fileName)}</summary><div class="profile-text">${esc(f.transcript)}</div></details>`).join('')}</article>`;
}
function refundField(key,label,value='',type='text',handler='refundDraftField'){
  return aField(label,`<input class="input" type="${type}" id="refund-work-${key}" value="${esc(value)}" oninput="${handler}('${key}',this.value)">`,true);
}
function refundDraftField(key,value){if(key==='reason')withdrawDraft().reason=value}
function refundStopLessons(cls=a.classes.find(c=>c.id===withdrawDraft().classId)){
  if(!cls)return [];
  return classDetailSessions(cls).map((s,index)=>({...s,id:String(s.id||`${cls.id}:lesson:${index+1}`),number:Array.isArray(cls.sessions)?index+1:Number(String(s.name||'').match(/^第\s*(\d+)\s*[讲节]$/)?.[1])||s.number})).filter(s=>!s.cancelled&&s.status!=='已取消');
}
function refundSelectedStop(){return refundStopLessons().find(s=>s.id===withdrawDraft().stopSessionId)||null}
function refundStopField(){
  const d=withdrawDraft(),lessons=refundStopLessons();
  return aField('申请截止课节',`<select class="select" id="refund-stop-session" ${!d.classId||!lessons.length?'disabled':''} onchange="refundSelectStop(this.value)"><option value="">${!d.classId?'请先选择课程／班级':lessons.length?'请选择截止课节':'该班级暂无课节'}</option>${lessons.map(s=>`<option value="${esc(s.id)}" ${d.stopSessionId===s.id?'selected':''}>第${s.number}节${s.name?' · '+esc(s.name):''}${s.date?' · '+esc(s.date):' · 待排课'}</option>`).join('')}</select>`,true)+`<p class="help">所选课节为最后保留课节，从下一课节起退课；已销课课节不重复退费。</p>`;
}
function refundSelectStop(value){withdrawDraft().stopSessionId=refundStopLessons().some(s=>s.id===value)?value:'';$('#withdraw-fee-summary').innerHTML=withdrawFeeSummary()}
const refundPreviousSelectClass=withdrawSelectClass;
withdrawSelectClass=function(value){
  const d=withdrawDraft();if(d.classId!==value)d.stopSessionId='';
  refundPreviousSelectClass(value);const field=$('#refund-stop-field');if(field)field.innerHTML=refundStopField();
};
function refundAmountLabel(r){return Number.isSafeInteger(r.amountCents)?withdrawMoney(r.amountCents):'待核算'}
function refundConfirmedAmount(r){
  if(Number.isSafeInteger(r.requestedAmountCents))return r.requestedAmountCents;
  const record=r.calls?.slice().reverse().find(c=>Number.isSafeInteger(c.refundAmountCents));
  return record?.refundAmountCents??r.amountCents;
}
function refundRecalculate(){
  const r=refundCurrent();if(!r||r.closed||![3,4].includes(r.step)||!refundCan(r.step)||Number.isSafeInteger(r.amountCents))return;
  const previousStudent=a.selectedStudent,previousDraft=a.withdrawDraft;let fees;
  try{
    a.selectedStudent=a.students.findIndex(s=>s.id===r.studentId);a.withdrawDraft=null;
    Object.assign(withdrawDraft(),{classId:r.classId,stopSessionId:r.stopSession?.id});
    if(!refundSelectedStop()){toast('原截止课节已变更，请先核对班级课节');return}
    fees=withdrawFeeData();
  }finally{a.selectedStudent=previousStudent;a.withdrawDraft=previousDraft}
  if(!Number.isSafeInteger(fees.remainingFee)||fees.remainingFee<=0){toast('尚无可核算的退费金额，请补齐报名收费与讲次明细');return}
  if(Number.isSafeInteger(r.requestedAmountCents)&&r.requestedAmountCents>fees.remainingFee){toast('沟通确认的退费金额超过重新核算的剩余学费，请退回教务核对金额');return}
  r.amountCents=r.requestedAmountCents??fees.remainingFee;r.fees=fees;r.approvedCents=null;
  if(r.step===4)r.step=3;
  r.revision++;refundAudit(r,'补齐费用核算',withdrawMoney(r.amountCents));refundResetEditor();academicRender();
}
function refundReasonInput(value){withdrawDraft().reason=value;if(leadRecordDraft?.context==='refundApplication')leadRecordDraft.note=value}
function refundReasonEditor(){
  const d=withdrawDraft();
  if(leadRecordDraft?.context!=='refundApplication'||leadRecordDraft.applicationDraft!==d){
    leadDisposeRecord();leadRecordDraft=leadCreateRecordDraft('refundApplication',null,d.reason||'');
    Object.assign(leadRecordDraft,{applicationDraft:d,studentId:d.studentId,actorId:studentTermActor(),noteId:'refund-work-reason',saveId:'refund-application-save'});
  }
  d.reason=leadRecordDraft.note;
  return `<div class="refund-reason-editor">${leadRecordEditor('申请原因 / 家长诉求（必填）').replace('oninput="leadRecordDraft.note=this.value"','oninput="refundReasonInput(this.value)"').replace('保存后，附件随记录保存在本机浏览器中。','随退课申请一并保存。保存后，附件随记录保存在本机浏览器中。')}</div>`;
}
function refundClasses(){const id=a.students[a.selectedStudent]?.id;const ids=new Set(studentTermEnrollments().filter(r=>r.studentId===id&&!['已退班','已退费','已取消','已转班'].includes(r.status)).map(r=>r.classId));return a.classes.filter(c=>ids.has(c.id))}
function refundResetEditor(){
  if(['refundCall','refundApplication'].includes(leadRecordDraft?.context))leadDisposeRecord();
  refundWork.call=null;refundWork.opinion='';refundWork.approved='';
  refundWork.payment?.controller?.abort();
  if(refundWork.payment?.proof)URL.revokeObjectURL(refundWork.payment.proof.url);
  refundWork.payment=null;
}
function refundNew(){refundResetEditor();refundWork.selectedId=null;refundWork.list=false;refundWork.tab='create';a.withdrawDraft=null;academicRender()}
function refundList(tab){
  const current=refundCurrent();
  refundWork.tab=tab||((refundWork.tab==='all'||current?.closed)?'all':current?.step===6?'completed':refundWork.tab==='completed'?'completed':'pending');
  refundResetEditor();refundWork.selectedId=null;refundWork.list=true;academicRender();
}
function refundSwitchTab(tab){
  if(!permissionCanVisit('withdraw'))return;
  if(tab==='create'){if(refundCan(0))refundNew();return}
  if(['pending','completed'].includes(tab))refundList(tab);
}
function refundTabs(active){return '<nav class="refund-tabs" aria-label="退费办理分类">'+[['create','申请退费'],['pending','审批中'],['completed','完成退费']].map(([key,label])=>
  `<button type="button" class="btn ${active===key?'primary':''}" ${key==='create'&&!refundCan(0)?'disabled':''} ${active===key?'aria-current="page"':''} onclick="refundSwitchTab('${key}')">${label}</button>`).join('')+'</nav>'}
function refundListRecords(tab=refundWork.tab){return a.refundApplications.filter(r=>tab==='completed'?r.step===6&&!r.closed:tab==='pending'?r.step<6&&!r.closed:true).slice().reverse()}

function refundOpen(id){if(!permissionCanVisit('withdraw'))return;refundResetEditor();refundWork.selectedId=id;refundWork.list=false;academicRender()}
function refundListHTML(){
  const tab=['pending','completed','all'].includes(refundWork.tab)?refundWork.tab:'pending',records=refundListRecords(tab),title=tab==='completed'?'完成退费':tab==='pending'?'审批中':'全部申请记录';
  return aHeading('学生退课／退班','先登记退课与费用信息，再进入教务电话沟通')+`<div class="toolbar refund-tabbar">${refundTabs(tab)}<button class="btn" onclick="refundList('all')">查看申请记录</button></div><section class="card pad"><div class="toolbar"><h2 class="section-title">${title}</h2><span class="help">共 ${records.length} 条申请</span></div>${aTable(['申请单号','学生 / 班级','申请金额','当前环节','申请时间','操作'],records.map(r=>`<tr><td>${esc(r.id)}</td><td>${esc(r.studentName)}<div class="help">${esc(r.className)}</div></td><td>${refundAmountLabel(r)}</td><td>${esc(r.closed||refundSteps[r.step])}</td><td>${esc(studentProfileTime(r.createdAt))}</td><td><button class="btn small" onclick="refundOpen('${r.id}')">${r.closed||r.step===6?'查看详情':'查看 / 办理'}</button></td></tr>`))}${!records.length?'<div class="empty">'+(tab==='completed'?'暂无完成退费记录':tab==='pending'?'暂无审批中的申请':'暂无退课申请')+'</div>':''}</section>`;
}
function refundCreatePage(){
  const student=a.students[a.selectedStudent],d=withdrawDraft();
  return aHeading('学生退课／退班','先登记退课与费用信息，再进入教务电话沟通')+`<div class="toolbar refund-tabbar">${refundTabs('create')}<button class="btn" onclick="refundList('all')">查看申请记录</button></div><section class="card pad"><h2 class="section-title">退课信息</h2><div class="toolbar"><button class="btn" onclick="a.modal='selectStudent';academicRender()">${student?'重新选择学生':'选择学生'}</button>${student?`<strong>${esc(student.name)} · ${esc(student.phone)}</strong>`:''}</div>${aField('退课课程／班级',`<select class="select" id="flow-from" onchange="withdrawSelectClass(this.value)"><option value="">请选择已报名课程／班级</option>${refundClasses().map(c=>`<option value="${esc(c.id)}" ${d.classId===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select>`,true)}<div class="form-grid" style="margin-top:20px"><div id="refund-stop-field">${refundStopField()}</div></div><hr class="divider"><h2 class="section-title">费用信息</h2><div id="withdraw-fee-summary">${withdrawFeeSummary()}</div>${refundReasonEditor()}<p class="help">提交后进入教务电话沟通，暂不办理退班或资金入账。</p><div class="form-actions"><button class="btn" onclick="refundNew()">重置</button><button class="btn primary" id="refund-application-save" onclick="refundSubmit()">提交</button></div></section>`;
}
function refundSubmit(){
  if(state.page!=='withdraw'||!refundCan(0))return;
  const d=withdrawDraft(),s=a.students[a.selectedStudent],cls=refundClasses().find(c=>c.id===d.classId);
  if(!s||!cls){toast('请选择学生及其已报名班级');return}
  if(leadRecordDraft?.context!=='refundApplication'||leadRecordDraft.applicationDraft!==d||!leadRecordReadyToSave())return;
  d.reason=leadRecordDraft.note;
  const stop=refundSelectedStop();
  if(!stop||!d.reason?.trim()){toast('请选择申请截止课节并填写退课原因');return}
  if(a.refundApplications.some(r=>r.studentId===s.id&&r.classId===cls.id&&!r.closed&&r.step<6)){toast('该班级已有办理中的退课申请');return}
  const fees=withdrawFeeData(),cents=fees.remainingFee;
  if(cents===0){toast('所选截止课节后暂无可退学费，请核对课节和报名记录');return}
  const r={id:'TK'+Date.now()+'-'+(++refundWork.sequence),studentId:s.id,studentName:s.name,classId:cls.id,className:cls.name,course:cls.course,reason:d.reason.trim(),stopSession:{id:stop.id,number:stop.number,name:stop.name||'',date:stop.date||'',time:stop.time||''},amountCents:cents,fees,step:1,createdAt:new Date().toISOString(),calls:[],audit:[],revision:0};
  r.reasonFiles=leadRecordDraft.items.map(i=>({fileName:i.file.name,url:i.url,kind:i.kind,size:i.file.size,transcript:i.transcript||''}));
  leadRecordDraft.items=[];leadDisposeRecord();
  refundAudit(r,'登记申请','',{recordId:r.id+'-application'});refundParentRecord(r);a.refundApplications.push(r);a.withdrawDraft=null;refundOpen(r.id);
}
function refundCallStart(){
  const r=refundCurrent();if(!r||r.closed||![1,2].includes(r.step)||!refundCan(r.step))return;
  refundResetEditor();leadDisposeRecord();leadRecordDraft=leadCreateRecordDraft('refundCall');leadRecordDraft.actorId=studentTermActor();leadRecordDraft.requestId=r.id;leadRecordDraft.saveId='refund-call-save';
  refundWork.call={requestId:r.id,step:r.step,revision:r.revision,actor:studentTermActor(),time:studentProfileLocalTime(),contact:'',phone:'',connected:false,conclusion:'',outcome:'继续退费',...(r.destination||{method:'',card:'',holder:'',bank:'',refundContact:''})};academicRender();
}
function refundCallField(key,value){const d=refundWork.call;if(d&&Object.hasOwn(d,key))d[key]=value}
function refundDestination(value){refundCallField('method',value);$('#refund-work-bank').hidden=value!=='customer'}
function refundCallValid(){const r=refundCurrent(),d=refundWork.call;return r&&d&&!r.closed&&r.id===d.requestId&&r.step===d.step&&r.revision===d.revision&&d.actor===studentTermActor()&&refundCan(r.step)&&leadRecordDraft?.context==='refundCall'&&leadRecordDraft.requestId===r.id}
function refundAudioReady(id,duration){const item=leadRecordDraft?.items.find(i=>i.id===id);if(leadRecordDraft?.context==='refundCall'&&item&&Number.isFinite(duration)&&duration>0)item.duration=duration}
const refundPreviousAttachments=leadRecordAttachmentsHTML;
leadRecordAttachmentsHTML=function(){let html=refundPreviousAttachments();if(leadRecordDraft?.context==='refundCall')for(const item of leadRecordDraft.items)if(item.kind==='audio')html=html.replace(`src="${esc(item.url)}"`,`src="${esc(item.url)}" onloadedmetadata="refundAudioReady('${item.id}',this.duration)"`);return html};
const refundPreviousCleanRecord=leadCleanClosedRecord;
leadCleanClosedRecord=function(){if(leadRecordDraft?.context==='refundApplication'){if(state.page!=='withdraw'||refundWork.selectedId||refundWork.list||leadRecordDraft.actorId!==studentTermActor()||leadRecordDraft.studentId!==(a.students[a.selectedStudent]?.id||'')||leadRecordDraft.applicationDraft!==a.withdrawDraft)leadDisposeRecord();return}if(leadRecordDraft?.context==='refundCall'){if(state.page!=='withdraw'||!refundCallValid())refundResetEditor();return}return refundPreviousCleanRecord()};
function refundCallEditor(r){
  const d=refundWork.call;
  return `<h2 class="section-title">${refundSteps[r.step]} · 记录电话沟通</h2><p class="academic-note">话务系统尚未接入。请上传实际电话录音并试听核对；直接录音不会自动验证为电话通话。保存后，录音和资料保存在本机浏览器中。</p><div class="form-grid">${refundField('contact','沟通家长',d.contact,'text','refundCallField')}${refundField('phone','通话号码',d.phone,'tel','refundCallField')}${refundField('time','通话时间',d.time,'datetime-local','refundCallField')}${aField('接通情况',`<select class="select" onchange="refundCallField('connected',this.value==='yes')"><option value="no">未接通 / 待确认</option><option value="yes" ${d.connected?'selected':''}>已接通</option></select>`,true)}</div>${leadRecordEditor('通话内容 / 人工补充说明')}<div class="form-grid"><div class="field full"><label class="required">办理结论</label><textarea class="textarea" oninput="refundCallField('conclusion',this.value)">${esc(d.conclusion)}</textarea></div>${aField('家长最终意见',`<select class="select" onchange="refundCallField('outcome',this.value)">${['继续退费','撤回申请'].map(v=>`<option ${d.outcome===v?'selected':''}>${v}</option>`).join('')}</select>`,true)}</div>${r.step===1?`<hr class="divider"><h2 class="section-title">家长确认的退款去向</h2>${aField('退款去向',`<select class="select" onchange="refundDestination(this.value)"><option value="">请选择</option><option value="balance" ${d.method==='balance'?'selected':''}>存入账户余额</option><option value="customer" ${d.method==='customer'?'selected':''}>退回客户</option></select>`,true)}<div id="refund-work-bank" ${d.method==='customer'?'':'hidden'}><div class="form-grid" style="margin-top:16px">${[['card','银行卡号'],['holder','开户人'],['bank','开户行'],['refundContact','联系方式']].map(([key,label])=>refundField(key,label,d[key],'text','refundCallField')).join('')}</div></div><p class="help">家长撤回申请时无需填写退款资料。存入余额也须经审核与财务确认后入账。</p>`:''}<label><input type="checkbox" id="refund-audio-confirm"> 我已试听核对，录音为本人与家长本次电话沟通的完整内容</label><div class="form-actions"><button class="btn" onclick="refundResetEditor();academicRender()">取消</button><button class="btn primary" id="refund-call-save" onclick="refundCompleteCall()">完成本次沟通</button></div>`;
}
function refundCompleteCall(){
  if(!refundCallValid()||!leadRecordReadyToSave())return;
  const r=refundCurrent(),d=refundWork.call,files=leadRecordDraft.items.filter(i=>i.kind==='audio');
  if(!d.connected||!d.contact.trim()||!/^\+?[\d ()-]{6,30}$/.test(d.phone)||!Number.isFinite(Date.parse(d.time))||Date.parse(d.time)>Date.now()||!d.conclusion.trim()||!files.length||files.some(f=>!f.duration)||!$('#refund-audio-confirm').checked){toast('请核对接通信息、通话时间、可播放的电话录音、办理结论，并确认已试听');return}
  if(!['继续退费','撤回申请'].includes(d.outcome))return;
  if(r.step===1&&d.outcome==='继续退费'){
    if(!['balance','customer'].includes(d.method)){toast('请选择退款去向');return}
    if(d.method==='customer'&&(!/^\d{8,30}$/.test(d.card.replace(/\s/g,''))||!d.holder.trim()||!d.bank.trim()||!/^\+?[\d ()-]{6,30}$/.test(d.refundContact))){toast('请完整填写有效的银行卡号、开户人、开户行和联系方式');return}
    r.destination={method:d.method,...(d.method==='customer'?{card:d.card.replace(/\s/g,''),holder:d.holder.trim(),bank:d.bank.trim(),refundContact:d.refundContact.trim()}:{})};
  }
  const record={id:r.id+'-call-'+r.calls.length,requestId:r.id,step:r.step,category:r.step===1?'教务沟通':'教师沟通',role:r.step===1?'教务':'教师',operator:studentExamOperator(),time:new Date(d.time).toISOString(),recordedAt:new Date().toISOString(),channel:'电话',contact:d.contact,phone:d.phone,connected:true,outcome:d.outcome,text:leadRecordDraft.note,conclusion:d.conclusion,source:'人工上传 / 录制电话录音',files:leadRecordDraft.items.map(i=>({fileName:i.file.name,file:i.file,url:i.url,kind:i.kind,size:i.file.size,transcript:i.transcript||'',duration:i.duration||0})),aiStatus:'未分析'};
  r.calls.push(record);const s=a.students.find(s=>s.id===r.studentId);(s.communications??=[]).push(record);
  refundAudit(r,refundSteps[r.step]+'完成',d.conclusion,{recordId:record.id});r.revision++;r.aiText='';r.aiError='';
  if(d.outcome==='撤回申请'){r.closed='已撤回';refundAudit(r,'家长撤回申请')}else r.step++;
  leadRecordDraft.items=[];refundResetEditor();academicRender();
}
function refundCallCards(r){return r.calls.map(c=>`<article class="refund-call-card"><div class="toolbar"><strong>${esc(c.category)} · ${esc(c.operator.name)}</strong><span>${esc(studentProfileTime(c.time))}</span></div><p class="help">${esc(c.contact)} · ${esc(c.phone)} · ${esc(c.source)}</p>${leadRecordFilesHTML(c)}${c.files.map((f,i)=>f.kind==='audio'?`<details ${f.transcript?'':'open'}><summary>录音转写 · ${esc(f.fileName)}</summary><div class="profile-text">${esc(f.transcript||f.error||'暂无转写')}</div><button class="btn small" ${f.busy?'disabled':''} onclick="refundTranscribe('${c.id}',${i})">${f.busy?'转写中…':'AI 转文字 / 重试'}</button></details>`:'').join('')}<div class="profile-text">${esc(c.text)}</div><p><strong>办理结论：</strong>${esc(c.conclusion)} · ${esc(c.outcome)}</p><div class="refund-ai"><div class="toolbar"><strong>AI 沟通分析</strong><button class="btn small" ${c.aiBusy?'disabled':''} onclick="refundAnalyze('${c.id}')">${c.aiBusy?'分析中…':'分析 / 重试'}</button></div><p class="profile-text">${esc(c.aiText||c.aiError||'尚未生成分析。转写后可分析原因、家长诉求、承诺及未解决事项。')}</p></div></article>`).join('')||'<div class="empty">暂无已完成电话沟通</div>'}
async function refundTranscribe(callId,index){
  const r=refundCurrent(),c=r?.calls.find(c=>c.id===callId),f=c?.files[index];if(!permissionCanVisit('withdraw')||!f||f.kind!=='audio'||f.busy)return;
  if(typeof globalThis.crmTranscribeAttachment!=='function'){f.error='语音转写服务尚未接入，原始录音已保留。';academicRender();return}
  f.busy=true;f.error='';academicRender();
  try{const result=await globalThis.crmTranscribeAttachment({file:f.file,kind:'audio'});if(!result?.text?.trim())throw Error();f.transcript=result.text.trim();c.aiText='';r.aiText=''}catch{f.error='转写失败，可重试；原始录音已保留。'}finally{f.busy=false;if(refundCurrent()===r&&state.page==='withdraw')academicRender()}
}
async function refundAnalyze(callId){
  const r=refundCurrent();if(!r||!permissionCanVisit('withdraw'))return;
  const c=callId?r.calls.find(c=>c.id===callId):r;if(!c||c.aiBusy)return;
  const calls=callId?[c]:r.calls;
  if(!calls.length||calls.some(c=>!c.files.some(f=>f.kind==='audio'&&f.transcript))){toast('请先对电话录音完成转文字；可在沟通编辑时使用 AI 转文字');return}
  if(typeof globalThis.crmSummarizeCommunications!=='function'){c.aiError='AI 分析服务尚未接入，未生成分析结果。';academicRender();return}
  const rev=r.revision,actor=studentTermActor();c.aiBusy=true;c.aiError='';academicRender();
  try{const result=await globalThis.crmSummarizeCommunications({context:'refund',instruction:'依据录音转写汇总退费原因、家长诉求、挽留方案、承诺、分歧与后续建议；引用原文，不编造录音时间点，不代替审核。',records:calls.map(x=>({role:x.role,time:x.time,transcripts:x.files.map(f=>f.transcript).filter(Boolean),note:x.text,conclusion:x.conclusion}))});const value=typeof result==='string'?result:result?.text;if(!value?.trim())throw Error();if(r.revision===rev&&actor===studentTermActor()){c.aiText=value.trim();c.aiStatus='已分析'}}catch{c.aiError='分析失败，请重试；原始记录已保留。'}finally{c.aiBusy=false;if(refundCurrent()===r&&state.page==='withdraw')academicRender()}
}
function refundDestinationInfo(r){if(!r.destination)return '<p class="help">退款去向在教务电话沟通阶段填写。</p>';const d=r.destination;return `<p>退款去向：<strong>${d.method==='balance'?'存入账户余额':'退回客户'}</strong></p>${d.method==='customer'?`<div class="academic-grid"><div>银行卡号：${esc(r.step===5&&refundCan(5)?d.card:d.card.slice(0,4)+' **** '+d.card.slice(-4))}</div><div>开户人：${esc(d.holder)}</div><div>开户行：${esc(d.bank)}</div><div>联系方式：${esc(d.refundContact)}</div></div>`:''}`}
function refundDecision(approve){
  const r=refundCurrent();if(!r||r.closed||![3,4].includes(r.step)||!refundCan(r.step))return;
  const note=refundWork.opinion.trim();if(!note){toast('请填写审核意见');return}
  const cents=refundConfirmedAmount(r);
  if(approve&&(!Number.isSafeInteger(cents)||cents<=0||!['balance','customer'].includes(r.destination?.method))){toast('请先由沟通人员确认退费金额和退款方式，可驳回教务补充');return}
  if(approve){r.amountCents=cents;r.approvedCents=cents;refundAudit(r,refundSteps[r.step]+'通过',note+'；批准金额 '+withdrawMoney(cents));r.step++}
  else {refundAudit(r,refundSteps[r.step]+'退回教务补充',note);r.step=1;r.approvedCents=null}
  r.revision++;refundResetEditor();academicRender();
}
function refundReceiptTime(value){
  if(typeof value!=='string')return '';
  const match=value.trim().match(/^(\d{4})[年\/-](\d{1,2})[月\/-](\d{1,2})日?[T\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if(!match)return '';
  const [,year,month,day,hour,minute,second='00']=match,parts=[year,month,day,hour,minute,second].map(Number),date=new Date(...[parts[0],parts[1]-1,...parts.slice(2)]);
  if(date.getFullYear()!==parts[0]||date.getMonth()!==parts[1]-1||date.getDate()!==parts[2]||date.getHours()!==parts[3]||date.getMinutes()!==parts[4]||date.getSeconds()!==parts[5]||date.getTime()>Date.now())return '';
  return `${year}-${month.padStart(2,'0')}-${day.padStart(2,'0')}T${hour.padStart(2,'0')}:${minute}:${second}`;
}
function refundReceiptFields(result){
  const text=typeof result?.text==='string'?result.text:'';
  const reference=typeof result?.reference==='string'?result.reference.trim():text.match(/(?:转账流水号|交易流水号|银行流水号|流水号|交易单号)\s*[:：]\s*([A-Za-z0-9-]+)/)?.[1]||'';
  const time=typeof result?.time==='string'?result.time:text.match(/(?:实际转账时间|转账时间|交易时间|付款时间)\s*[:：]\s*(\d{4}[年\/-]\d{1,2}[月\/-]\d{1,2}日?[T\s]+\d{1,2}:\d{2}(?::\d{2})?)/)?.[1]||'';
  return {reference:/^[A-Za-z0-9-]{1,100}$/.test(reference)?reference:'',time:refundReceiptTime(time)};
}
function refundFinanceProof(files){
  const r=refundCurrent();if(state.page!=='withdraw'||!r||r.closed||r.step!==5||!refundCan(5)||r.destination?.method!=='customer')return;
  const file=Array.from(files)[0];if(!file)return;
  if(!file.size||file.size>20*1024*1024||!(/\.(pdf|png|jpe?g|webp)$/i.test(file.name))){toast('请上传20 MB以内的图片或 PDF 凭证');return}
  const previous=refundWork.payment;previous?.controller?.abort();
  if(previous?.proof)URL.revokeObjectURL(previous.proof.url);
  refundWork.payment={reference:previous?.proof?'':previous?.reference||'',time:previous?.proof?'':previous?.time||'',checked:false,fieldVersions:{reference:0,time:0},proof:{fileName:file.name,file,url:URL.createObjectURL(file),size:file.size,kind:/\.pdf$/i.test(file.name)?'document':'image'}};
  return refundRecognizeReceipt();
}
// Optional backend: crmExtractRefundReceipt({file, signal}) => {reference: string, time: local datetime, text?: string}.
// Existing image/PDF text recognition can also supply the original receipt text.
async function refundRecognizeReceipt(){
  const r=refundCurrent(),payment=refundWork.payment,proof=payment?.proof;
  if(state.page!=='withdraw'||!r||r.closed||r.step!==5||!refundCan(5)||!proof||payment.busy)return;
  const extract=globalThis.crmExtractRefundReceipt,transcribe=globalThis.crmTranscribeAttachment;
  payment.checked=false;const checkbox=$('#refund-paid-confirm');if(checkbox)checkbox.checked=false;
  if(typeof extract!=='function'&&typeof transcribe!=='function'){
    payment.notice='凭证已上传，识别服务尚未接入，请对照凭证填写流水号和转账时间。';academicRender();return;
  }
  const actor=studentTermActor(),revision=r.revision,versions={...payment.fieldVersions};
  const valid=()=>state.page==='withdraw'&&refundCurrent()===r&&refundWork.payment===payment&&payment.proof===proof&&!r.closed&&r.step===5&&r.revision===revision&&studentTermActor()===actor&&refundCan(5);
  payment.busy=true;payment.notice='正在识别退款凭证…';payment.controller=new AbortController();academicRender();
  try{
    const result=typeof extract==='function'?await extract({file:proof.file,signal:payment.controller.signal}):await transcribe({file:proof.file,kind:proof.kind,signal:payment.controller.signal});
    if(!valid())return;
    const fields=refundReceiptFields(result);payment.recognition={...fields,text:typeof result?.text==='string'?result.text:'',recognizedAt:new Date().toISOString()};
    for(const key of ['reference','time'])if(fields[key]&&(payment.fieldVersions?.[key]||0)===(versions[key]||0))payment[key]=fields[key];
    payment.notice=fields.reference&&fields.time?'已识别流水号和转账时间，请对照原始凭证核对，可直接修改。':'部分信息未识别或格式不明确，请对照凭证补填并核对。';
  }catch(error){if(valid())payment.notice='凭证识别失败，可重新识别或手动填写；原始凭证已保留。'}
  finally{payment.busy=false;payment.controller=null;if(valid())academicRender()}
}
function refundFinanceReceiptForm(){
  const p=refundWork.payment||{},proof=p.proof;
  return `<p class="help">上传实际退款凭证，自动识别流水号与转账时间，核对后确认退款。</p><div class="field"><label class="required">上传退款凭证</label><input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" onchange="refundFinanceProof(this.files);this.value=''">${proof?`<div class="toolbar"><a href="${esc(proof.url)}" target="_blank" rel="noopener">${esc(proof.fileName)} · 查看凭证</a><button type="button" class="btn small" ${p.busy?'disabled':''} onclick="refundRecognizeReceipt()">${p.busy?'识别中…':'重新识别'}</button></div>`:''}<p class="help" role="status">${esc(p.notice||'支持图片或 PDF，单个文件不超过20 MB。')}</p></div><div class="form-grid">${refundField('reference','转账流水号',p.reference||'','text','refundPaymentField')}${refundField('time','实际转账时间',p.time||'','datetime-local','refundPaymentField').replace('type="datetime-local"','type="datetime-local" step="1"')}</div><label><input type="checkbox" id="refund-paid-confirm" ${p.checked?'checked':''} ${p.busy?'disabled':''} onchange="(refundWork.payment??={}).checked=this.checked"> 已核对退款凭证、流水号、转账时间、收款资料与批准金额，确认实际退款成功</label>`;
}
function refundFinanceComplete(){
  const r=refundCurrent();if(!r||r.closed||r.step!==5||!refundCan(5)||!r.destination||!Number.isSafeInteger(r.approvedCents)||r.approvedCents<=0)return;
  if(r.transferId&&(!Number.isSafeInteger(r.maximumCents)||r.approvedCents>r.maximumCents)){toast('退款金额不能超过本次转课待退差额');return}
  if(a.refundRecords?.some(x=>x.applicationId===r.id))return;
  const s=a.students.find(s=>s.id===r.studentId),cls=a.classes.find(c=>c.id===r.classId);if(!s||!cls)return;
  const payment=refundWork.payment||{},customer=r.destination.method==='customer';
  if(customer&&payment.busy){toast('请等待凭证识别完成后核对');return}
  if(customer&&(!payment.proof||!payment.reference?.trim()||!Number.isFinite(Date.parse(payment.time))||Date.parse(payment.time)>Date.now()||!$('#refund-paid-confirm').checked)){toast('请填写实际转账时间、流水号、上传凭证，并确认退款成功');return}
  const before=withdrawBalanceCents(s),after=before+r.approvedCents;if(!Number.isSafeInteger(after)){toast('账户金额超出有效范围');return}
  const record={id:r.id,applicationId:r.id,studentId:r.studentId,classId:r.classId,className:r.className,amountCents:r.approvedCents,method:r.destination.method,status:customer?'已退款':'已计入余额',recordedAt:new Date().toISOString(),operator:studentExamOperator(),...(customer?{bankDetails:{...r.destination},payment:{...payment}}:{})};
  if(!customer){s.accountBalanceCents=after;(a.accountTransactions??=[]).push({id:r.id,refundId:r.id,studentId:s.id,type:'退费入账',amountCents:r.approvedCents,balanceBeforeCents:before,balanceAfterCents:after,recordedAt:record.recordedAt,operator:record.operator})}
  (a.refundRecords??=[]).push(record);
  if(!r.transferId){
  const items=(s.enrollments??=[]).filter(i=>i.classId===r.classId);if(!items.length)s.enrollments.push({classId:cls.id,className:cls.name,course:cls.course,enrollmentStatus:'已退班',withdrawalApplicationId:r.id});else items.forEach(i=>{i.enrollmentStatus='已退班';i.withdrawalApplicationId=r.id});
  const names=s.classNames||String(s.className||'').split('、');s.classNames=names.filter(n=>n!==cls.name);s.className=s.classNames.join('、')||'—';if(!s.classNames.length)s.status='历史';
  cls.students=Math.max(0,(Number(cls.students)||0)-1);
  }
  r.step=6;r.completedAt=record.recordedAt;refundAudit(r,(customer?'财务确认退款成功':'财务转入余额')+(r.transferId?'':'并退班'),withdrawMoney(r.approvedCents)+(customer?'；转账流水号 '+payment.reference+'；实际转账时间 '+payment.time+'；已核对退款凭证':''));
  if(refundWork.payment)refundWork.payment.proof=null;refundResetEditor();academicRender();
}
function refundTask(r){
  if(r.closed||r.step===6)return `<h2 class="section-title">${esc(r.closed||'办理完成')}</h2><p>${r.closed?'保留申请及沟通记录，未办理资金变动。':r.destination.method==='balance'?'批准金额已计入学生账户余额，并完成退班。':'财务已登记退款成功凭证，并完成退班。'}</p>`;
  if(!refundCan(r.step))return `<h2 class="section-title">当前待办：${refundSteps[r.step]}</h2><p class="help">等待对应岗位办理，当前身份可查看申请记录。</p>`;
  if([3,4].includes(r.step)&&!Number.isSafeInteger(r.amountCents))return '<h2 class="section-title">费用待核算</h2><p>报名费用明细不完整，补齐后可按原截止课节重新计算，再继续审核。</p><button class="btn primary" onclick="refundRecalculate()">重新核算费用</button>';
  if([1,2].includes(r.step))return refundWork.call?refundCallEditor(r):`<h2 class="section-title">${refundSteps[r.step]}</h2><p>需记录已接通的电话、可播放录音和办理结论。${r.step===1?'在本环节确认退款去向及收款资料。':''}</p><button class="btn primary" onclick="refundCallStart()">开始记录电话沟通</button>`;
  if([3,4].includes(r.step))return `<h2 class="section-title">${refundSteps[r.step]}</h2><div class="form-grid">${refundField('approved','批准金额（元）',refundWork.approved||(Number.isSafeInteger(r.approvedCents??r.amountCents)?String((r.approvedCents??r.amountCents)/100):''),'text','refundReviewField')}</div><label class="required">审核意见</label><textarea class="textarea" oninput="refundWork.opinion=this.value">${esc(refundWork.opinion)}</textarea><div class="form-actions"><button class="btn" onclick="refundDecision(false)">退回教务补充</button><button class="btn primary" onclick="refundDecision(true)">审核通过</button></div>`;
  return `<h2 class="section-title">财务办理</h2><p>批准金额：<strong>${withdrawMoney(r.approvedCents)}</strong></p>${refundDestinationInfo(r)}${r.destination.method==='customer'?refundFinanceReceiptForm():'<p class="help">确认后转入该学生账户余额，生成入账流水。</p>'}<div class="form-actions"><button class="btn primary" ${refundWork.payment?.busy?'disabled':''} onclick="refundFinanceComplete()">${r.destination.method==='customer'?'确认退款成功并退班':'确认转入余额并退班'}</button></div>`;
}
function refundReviewField(key,value){if(key==='approved')refundWork.approved=value}
function refundPaymentField(key,value){if(['time','reference'].includes(key)){const p=refundWork.payment??={};p[key]=value;p.fieldVersions??={};p.fieldVersions[key]=(p.fieldVersions[key]||0)+1;p.checked=false;const checkbox=$('#refund-paid-confirm');if(checkbox)checkbox.checked=false}}
function refundFacts(r){return refundDestinationInfo(r)}
function refundApprovalAction(){return ''}
function refundCommunicationActions(){return ''}
function refundCommunicationPanel(r){
  const communicating=!r.closed&&[1,2].includes(r.step),parent=refundParentRecord(r);
  const records=!!parent||r.calls.length,actions=refundCommunicationActions(r);
  return `${records||actions||communicating?`<section class="card pad page-block refund-communications"><div class="toolbar refund-communication-toolbar">${records?'<h2 class="section-title">沟通记录</h2>':'<span></span>'}${actions}</div>${refundParentCard(parent)}${r.calls.length?refundCallCards(r):''}${communicating?'<div class="'+(records?'refund-call-next':'')+'">'+refundTask(r)+'</div>':''}</section>`:''}${communicating||(!r.closed&&[3,4].includes(r.step))?'':'<section class="card pad page-block refund-current">'+refundTask(r)+'</section>'}`;
}
function refundCallFees(r,showHelp=true){
  return `<strong>费用信息</strong>${[['原价','original'],['优惠','discount'],['实收','paid'],['课单价','unit'],['已上讲次','used'],['剩余讲次','remaining'],['剩余学费','remainingFee']].map(([label,key])=>{const value=r.fees?.[key];return `<div class="summary-line"><span>${label}</span><span>${Number.isFinite(value)?(['used','remaining'].includes(key)?value+' 讲':withdrawMoney(value)):'—'}</span></div>`}).join('')}${showHelp?'<p class="help">申请时费用信息，可选中文字复制。</p>':''}`;
}
function refundFeeDetails(r){
  return `<div class="refund-fee-help refund-student-details" onkeydown="if(event.key==='Escape'){event.preventDefault();document.activeElement.blur()}"><button type="button" class="refund-details-link" aria-label="查看学生退课费用信息" aria-describedby="refund-summary-fees">详情</button><div class="refund-fee-popover" id="refund-summary-fees" role="tooltip"><div class="refund-fee-content">${refundCallFees(r)}</div></div></div>`;
}
function refundDetail(r){return `<button class="btn back-link" onclick="refundList()">← 返回申请记录</button>`+aHeading('退课／退班申请',r.id+' · '+r.studentName+' · '+r.className)+`<ol class="refund-progress">${refundSteps.map((step,i)=>`<li class="${i===r.step?'current':i<r.step?'done':''}"><span>${i+1}</span>${step}</li>`).join('')}</ol><section class="card pad page-block"><h2 class="section-title">退课与费用信息</h2><div class="refund-summary-grid"><div class="refund-student-name">学生：${esc(r.studentName)}${refundFeeDetails(r)}</div><div>班级：${esc(r.className)}</div><div>申请截止课节：${r.stopSession?`第${r.stopSession.number}节 · ${esc(r.stopSession.name)}${r.stopSession.date?' · '+esc(r.stopSession.date):''}`:'未记录截止课节'}</div></div>${refundFacts(r)}${refundApprovalAction(r)}</section>${refundCommunicationPanel(r)}`}
const refundWorkflowPreviousPage=flowPage;
flowPage=function(type){if(type!=='withdraw')return refundWorkflowPreviousPage(type);const r=refundCurrent();return r?refundDetail(r):refundWork.list||!refundCan(0)?refundListHTML():refundCreatePage()};
const refundWorkflowPreviousFinish=finishFlow;
finishFlow=function(type){if(type==='withdraw')return refundSubmit();return refundWorkflowPreviousFinish(type)};
const refundWorkflowPreviousRender=academicRender;
academicRender=function(){if(state.page!=='withdraw'||refundWork.actor!==studentTermActor())refundResetEditor();refundWork.actor=studentTermActor();return refundWorkflowPreviousRender()};
