// 招生预约后直接按课节排班，数据随业务快照保存在本机。
const trialState=state.trials={requests:[],sequence:0,draft:null,step:1,filter:'待排班',modalId:null,successId:null};
const trialPreviousRender=render;
render=function(){if(['quickTrial','trialManage'].includes(state.page))trialRender();else trialPreviousRender()};
function trialAllowed(page){if(permissionCanVisit(page))return true;toast('当前职位没有此操作权限');return false}
function trialActor(){return {id:permissionState.identity,name:leadCurrentOperator().name}}
function trialBlank(){return {name:'',phone:'',grade:'',guardian:'',studentId:'',leadId:'',course:'',campus:'',preferredTime:'',classes:[],classFilters:null,note:'',schools:[{stage:'小学',name:'',entryYear:''}],gender:'',source:'',information:'',optionalOpen:false,actorId:trialActor().id}}
function trialStart(lead=null){
  if(!trialAllowed('quickTrial'))return;
  if(leadRecordDraft?.context==='trial')leadDisposeRecord();
  const d=trialBlank();
  if(lead)Object.assign(d,trialStudentData(lead),{leadId:lead.leadId,campus:state.campuses.some(c=>c.active&&c.name===lead.campus)?lead.campus:''});
  trialState.draft=d;trialState.step=1;trialState.successId=null;leadState.modal=null;state.page='quickTrial';render();
}
function trialRender(){
  if(state.page==='trialManage'){
    trialState.modalId=null;
    if(permissionCanVisit('myLeads')){leadState.mineTab='约试听';state.page='myLeads'}
    else{state.page='students';studentTermView().tab='试听学生'}
    render();return;
  }
  const manage=state.page==='trialManage';
  document.querySelectorAll('.menu-item').forEach(e=>e.classList.toggle('active',e.dataset.page===state.page));
  document.querySelectorAll('.nav-toggle').forEach(e=>e.classList.remove('active-parent'));
  document.querySelector(`[data-nav-toggle="${manage?'academic':'leads'}"]`).classList.add('active-parent');
  if(manage)document.querySelector('[data-nav-toggle="business"]').classList.add('active-parent');
  $('#crumb').textContent=manage?'线索 / 我的线索 / 约试听':'线索 / 我的线索 / 预约试听';
  if(!manage&&(!trialState.draft||trialState.draft.actorId!==trialActor().id)){
    trialState.draft=trialBlank();trialState.step=1;trialState.successId=null;
  }
  $('#view').innerHTML=manage?trialManagementPage():trialBookingPage();
}
function trialSelect(id,options,value,placeholder,change=''){
  return `<select class="select" id="${id}" ${change?`onchange="${change}"`:''}><option value="">${placeholder}</option>${options.map(x=>{const [v,label]=Array.isArray(x)?x:[x,x];return `<option value="${esc(v)}" ${String(value)===String(v)?'selected':''}>${esc(label)}</option>`}).join('')}</select>`;
}
function trialInput(id,value,type='text',readonly=false){return `<input class="input" id="${id}" type="${type}" value="${esc(value||'')}" ${readonly?'readonly':''}>`}
function trialBookingPage(){
  const d=trialState.draft,step=trialState.step,success=trialState.requests.find(r=>r.id===trialState.successId&&r.actorId===trialActor().id);
  let body='';
  if(success)body=`<div class="card pad trial-panel trial-success"><h2 class="section-title">试听预约已提交</h2><p>预约编号 ${success.id} · ${trialBadge(success.status)}</p><p>已按所选课节完成排班，学生已进入对应班级试听名单。</p><button class="btn primary" onclick="trialStart()">继续预约</button>${permissionCanVisit('myLeads')?` <button class="btn" onclick="trialReturnMyTrials()">查看我的试听</button>`:''}</div>`;
  else{
    let fields='';
    if(step===1)fields=trialStudentForm();
    if(step===2)fields=trialSelectedClassesForm();
    if(step===3)fields=`<div class="trial-summary-card">${trialSummary(d)}</div><p class="notice" style="margin-top:20px">提交后直接按所选班级和课节入班试听，无需教务审批。</p>`;
    body=`<div class="steps">${['学生信息','试听意向','确认提交'].map((label,i)=>`${i?'<span class="step-line"></span>':''}<span class="step ${step===i+1?'active':step>i+1?'done':''}"><i>${step>i+1?'✓':i+1}</i>${label}</span>`).join('')}</div><div class="card trial-panel${step===2?' trial-intention-shell':''}">${step===1?aTabs(['单个预约','批量预约'],'单个预约','trialBookingTab'):''}<div class="pad">${fields}<div class="form-actions">
      ${step>1?'<button class="btn" onclick="trialPreviousStep()">上一步</button>':d.leadId?'<button class="btn" onclick="trialReturnLead()">返回线索详情</button>':''}
      <button class="btn primary" id="trial-next" onclick="${step===3?'trialSubmit()':'trialNextStep()'}">${step===3?'提交预约':'下一步'}</button></div></div></div>`;
  }
  return heading('预约试听','登记学生、选择班级和课节，直接完成试听排班')+body+(d.studentPicker?trialStudentPicker():'');
}
function trialPickStudent(id){
  const s=a.students.find(s=>s.id===id),d=trialState.draft;
  if(d.leadId)return;
  if(!leadRecordReadyToSave())return;
  if(leadRecordDraft?.context==='trial')leadDisposeRecord();
  Object.assign(d,trialStudentData(s||{}),{studentId:s?.id||'',information:'',studentPicker:null});render();
}
function trialReadStep(){
  const d=trialState.draft;
  if(trialState.step===1)trialReadStudent();
  if(trialState.step===2)trialCaptureIntention();
}
function trialValidStudent(d){
  if(!d.name||!d.phone){toast('请填写学生姓名和联系电话');return false}
  if(!d.grade){toast('请选择就读年级');return false}
  const source=d.studentId?a.students.find(s=>s.id===d.studentId):d.leadId?leadState.leads.find(l=>l.leadId===d.leadId):null;
  if((d.studentId||d.leadId)&&(!source||source.name!==d.name||source.phone!==d.phone)){toast('原学生资料已更新，请重新选择或从线索发起预约');return false}
  if(!source&&!/^1\d{10}$/.test(d.phone)){toast('请输入11位手机号码');return false}
  return true;
}
function trialFuture(value){return Number.isFinite(new Date(value).getTime())&&new Date(value)>new Date()}
function trialValidIntention(d,checkTime=true){
  if(Array.isArray(d.classes))return trialValidateClasses(d);
  if(!a.courses.some(c=>c.active&&c.name===d.course)||!state.campuses.some(c=>c.active&&c.name===d.campus)){toast('请选择已启用的课程和校区');return false}
  if(checkTime&&d.preferredTime&&!trialFuture(d.preferredTime)){toast('请选择晚于当前时间的意向试听时间');return false}
  return true;
}
function trialNextStep(){
  if(!trialAllowed('quickTrial')||!leadRecordReadyToSave())return;trialReadStep();
  if(trialState.step===1&&!trialValidStudent(trialState.draft)||trialState.step===2&&!trialValidIntention(trialState.draft))return;
  trialState.step=Math.min(3,trialState.step+1);render();
}
function trialPreviousStep(){trialReadStep();trialState.step=Math.max(1,trialState.step-1);render()}
function trialReturnLead(){
  const i=leadState.leads.findIndex(l=>l.leadId===trialState.draft?.leadId);
  if(i>=0)leadDetail(i,leadState.returnPage||'myLeads');
}
function trialSamePerson(x,y){
  if(x.studentId&&y.studentId&&x.studentId===y.studentId)return true;
  if(x.leadId&&y.leadId&&x.leadId===y.leadId)return true;
  return !x.phone.includes('*')&&x.name===y.name&&x.phone===y.phone;
}
function trialSubmit(){
  if(!trialAllowed('quickTrial')||trialState.step!==3||trialState.successId)return;
  const d=trialState.draft;
  if(d.actorId!==trialActor().id||!trialValidStudent(d)||!trialValidIntention(d)||!leadRecordReadyToSave())return;
  const intentions=trialIntentionItems(d);
  const planned=[];
  for(const item of intentions){const request={...d,...item};const error=trialPlacementError(request,planned);if(error){toast(error);return}planned.push(request)}
  if(intentions.some(item=>trialState.requests.some(r=>r.status==='待排班'&&r.id!==d.replaceRequestId&&!r.salesReturnedAt&&!r.supersededBy&&r.attendance!=='未出勤'&&trialSamePerson(r,d)&&(r.requestedClassId?r.requestedClassId===item.requestedClassId:r.course===item.course&&r.campus===item.campus)))){toast('所选班级已有待排班预约，请移除重复班级后提交');return}
  const files=(leadRecordDraft?.context==='trial'?leadRecordDraft.items:[]).map(item=>({fileName:item.file.name,url:item.url,size:item.file.size,kind:item.kind,transcript:item.transcript||''}));
  const actor=trialActor(),requests=intentions.map(item=>{
    const {classes,classFilters,classFilterGrade,studentPicker,sessionPicker,rebookRequestId,...studentData}=d;
    const r={...studentData,...item,schools:d.schools.map(s=>({...s})),files,id:++trialState.sequence,status:'待排班',actorId:actor.id,actor:actor.name,submittedAt:new Date().toLocaleString('zh-CN'),classId:null,scheduledTime:'',confirmedBy:'',confirmedAt:''};
    r.academicTerm=studentClassTerm(a.classes.find(c=>c.id===r.requestedClassId),r);
    if(r.information||files.length)r.informationRecord=leadHistoryEntry('试听预约信息',r.information||'添加了试听预约附件',{files});
    trialLog(r,'预约试听',`提交${r.requestedClassName}试听申请，意向校区：${r.campus}，意向时间：${r.preferredTime?r.preferredTime.replace('T',' '):'待教务安排'}。按所选课节直接排班。${r.note?'备注：'+r.note:''}${r.information?'\n信息记录：'+r.information:''}`,{files});
    return r;
  });
  trialState.requests.unshift(...requests);
  requests.forEach(trialPlaceRequest);
  const replaced=trialState.requests.find(r=>r.id===d.replaceRequestId&&r.leadId===d.leadId&&r.status==='待排班');
  if(replaced){replaced.supersededBy=requests.map(r=>r.id);requests.forEach(r=>r.replacesRequestId=replaced.id);trialLog(replaced,'更新排班','招生已重新选定课节并直接入班，原预约记录保留。')}
  const prior=trialState.requests.find(r=>r.id===d.rebookRequestId&&r.leadId===d.leadId&&r.attendance==='未出勤');
  if(prior){prior.supersededBy=requests.map(r=>r.id);requests.forEach(r=>r.rebookedFrom=prior.id);trialLog(prior,'再次约课','未出勤后已重新提交试听预约，原课节出勤记录保留。')}
  if(leadRecordDraft?.context==='trial'){leadRecordDraft.items=[];leadDisposeRecord()}
  trialState.successId=requests[0].id;render();toast(`已完成${requests.length}条试听排班，学生已进入对应课节`);
}
function trialLog(r,title,text,attachment={}){
  const lead=leadState.leads.find(l=>l.leadId===r.leadId);
  if(lead)lead.history.push(leadHistoryEntry(title,text,attachment,new Date().toLocaleString('zh-CN')));
}
function trialBadge(status){return `<span class="badge ${status==='待排班'?'trial-pending':status==='已取消'?'off':''}">${esc(status)}</span>`}
function trialRequestSessionLabel(r){
  const confirmed=r.status==='已排班',cls=a.classes.find(c=>c.id===(confirmed?r.classId:r.requestedClassId));
  const id=confirmed?r.scheduledSessionId||r.requestedSessionId:r.requestedSessionId;
  const start=confirmed?r.scheduledTime:r.preferredTime;
  const session=cls&&trialClassSessions(cls).find(s=>id?s.id===id:start&&Date.parse(s.startsAt)===Date.parse(start));
  const name=(confirmed?r.scheduledSessionName:r.requestedSessionName)||session?.name||'未指定';
  const number=(confirmed?r.scheduledSessionNumber:r.requestedSessionNumber)||session?.number;
  return number&&!/^第\s*\d+\s*讲(?:\s|[：:、.．-]|$)/.test(name)?`第${number}讲 · ${name}`:name;
}
function trialSummary(r){
  const studentFields=[['学生姓名',r.name],['联系电话',leadDetailPhone(r.phone)],['就读年级',r.grade||'未填写'],['公立学校',(r.schools||[]).filter(s=>s.name).map(s=>s.stage+' · '+s.name+(s.entryYear?' · '+s.entryYear+'年入学':'')).join('；')||'未填写'],['学生性别',r.gender||'未填写'],['招生家长',r.guardian||'未填写']];
  const bookingFields=[['来源渠道',r.source||'未填写'],...(Array.isArray(r.classes)?[]:[['预约班级',r.requestedClassName||'未指定'],['预约课节',trialRequestSessionLabel(r)],['试听课程',r.course],['意向校区',r.campus],['试听时间',r.preferredTime?.replace('T',' ')||'待教务安排']])];
  const fieldsHTML=fields=>`<dl class="trial-confirm-grid">${fields.map(([label,value,full])=>`<div class="trial-confirm-field${full?' full':''}"><dt>${label}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>`;
  const files=r.files||(r===trialState.draft&&leadRecordDraft?.context==='trial'?leadRecordDraft.items.map(item=>({fileName:item.file.name,url:item.url,kind:item.kind})):[]);
  return `<section class="trial-confirm-section"><h2 class="section-title">学生信息</h2>${fieldsHTML(studentFields)}</section>
    <section class="trial-confirm-section"><h2 class="section-title">预约信息</h2>${fieldsHTML(bookingFields)}${Array.isArray(r.classes)?trialSelectedTable(r,false):''}${fieldsHTML([['信息记录',r.information||'无',true],['预约备注',r.note||'无',true]])}${leadRecordFilesHTML({files})}</section>`;
}
function trialRequestTable(list,manage){
  if(!list.length)return '<div class="empty">暂无试听预约</div>';
  return aTable(['学生 / 联系电话','课程 / 校区','意向时间','状态','排班结果',manage?'操作':'提交时间'],list.map(r=>{
    const c=a.classes.find(c=>c.id===r.classId);
    return `<tr><td><strong>${esc(r.name)}</strong><small class="trial-table-note">${esc(leadDetailPhone(r.phone))}</small></td><td>${esc(r.course)}<small class="trial-table-note">${esc(r.campus)}</small>${r.requestedClassName?`<small class="trial-table-note">意向班级：${esc(r.requestedClassName)}</small>`:''}</td><td>${esc(r.preferredTime?r.preferredTime.replace('T',' '):'待教务安排')}</td><td>${trialBadge(r.status)}</td><td>${c?`${esc(c.name)}<small class="trial-table-note">${esc(r.scheduledTime.replace('T',' '))} · ${esc(r.teacher)}</small>`:r.status==='已取消'?esc(r.cancelReason):'等待教务确认'}</td><td>${manage?`<button class="btn small ${r.status==='待排班'?'primary':''}" onclick="trialOpenReview(${r.id})">${r.status==='待排班'?'确认排班':'详情'}</button>`:esc(r.submittedAt)}</td></tr>`;
  }));
}
function trialManagementPage(){
  const tabs=['待排班','已排班','已取消','全部'],list=trialState.requests.filter(r=>trialState.filter==='全部'||r.status===trialState.filter);
  return heading('试听管理','确认班级与试听时间后，学生才正式进班试听')+`<div class="card"><div class="tabs">${tabs.map(t=>`<button class="tab ${trialState.filter===t?'active':''}" onclick="trialState.filter='${t}';trialState.modalId=null;render()">${t}（${trialState.requests.filter(r=>t==='全部'||r.status===t).length}）</button>`).join('')}</div><div class="pad">${trialRequestTable(list,true)}</div></div>`+(trialState.modalId?trialReviewModal():'');
}
function trialOpenReview(id){
  if(!trialAllowed('trialManage'))return;
  if(!trialState.requests.some(r=>r.id===id))return;
  trialState.modalId=id;render();
}
function trialClasses(r){return a.classes.filter(c=>c.course===r.course&&c.campus===r.campus&&['未开课','开课中'].includes(classScheduleStatus(c)))}
function trialReviewModal(){
  const r=trialState.requests.find(r=>r.id===trialState.modalId);if(!r)return '';
  const pending=r.status==='待排班',classes=trialClasses(r),c=a.classes.find(c=>c.id===r.classId);
  const close='<button class="btn" onclick="trialState.modalId=null;render()">关闭</button>';
  return `<div class="modal-backdrop"><section class="modal trial-modal" role="dialog" aria-modal="true" aria-labelledby="trial-review-title"><div class="modal-head"><h2 id="trial-review-title">${pending?'确认排班':'试听详情'}</h2><button class="btn small" aria-label="关闭" onclick="trialState.modalId=null;render()">✕</button></div><p>预约编号 ${r.id} · ${trialBadge(r.status)} · ${esc(r.actor)} 提交</p>${trialSummary(r)}${pending?`
    <div class="notice">选择实际试听班级和时间。确认前，预约不会占用班级名额或进入试听名单。</div>
    <div class="form-grid">${aField('试听班级',trialSelect('trial-confirm-class',classes.map(c=>[c.id,`${c.name} · ${c.teacher} · 正式在班 ${c.students}/${c.capacity}`]),classes.some(c=>c.id===r.requestedClassId)?r.requestedClassId:'','请选择班级','trialClassHint(this.value)'),true)}
    ${aField('实际试听时间',trialInput('trial-confirm-time',r.preferredTime,'datetime-local'),true)}
    <div class="full help" id="trial-class-hint">${classes.length?'请依据班级课表安排试听时间。':'当前课程和校区暂无可用班级，请先在班级管理中建班。'}</div>
    <div class="field full"><label for="trial-schedule-note">排班说明 / 取消原因</label><textarea class="textarea" id="trial-schedule-note" maxlength="500" placeholder="填写上课教室、携带资料等；取消预约时须填写原因"></textarea></div></div>
    <div class="modal-actions">${close}<button class="btn danger" onclick="trialCancel(${r.id})">取消预约</button><button class="btn primary" onclick="trialConfirm(${r.id})" ${classes.length?'':'disabled'}>确认排班</button></div>`:
    `<div class="trial-summary-card">${r.status==='已排班'?`<p>已安排：${esc(c?.name||'班级已移除')}</p><p>${esc(r.scheduledTime.replace('T',' '))} · ${esc(r.teacher)} · ${esc(r.room||'教室待定')}</p><p>${esc(r.confirmedBy)} 于 ${esc(r.confirmedAt)} 确认</p><p>${esc(r.scheduleNote||'')}</p>`:`<p>取消原因：${esc(r.cancelReason)}</p>`}</div><div class="modal-actions">${close}</div>`}</section></div>`;
}
function trialClassHint(id){
  const c=a.classes.find(c=>c.id===id);
  $('#trial-class-hint').textContent=c?`${c.teacher} · ${c.room} · 班级课表参考：${c.date} ${c.time}。请核对实际试听讲次时间。`:'请选择班级';
}
function trialStudentFor(r){
  return a.students.find(s=>(r.studentId&&s.id===r.studentId)||(r.leadId&&s.originLeadId===r.leadId)||(!r.phone.includes('*')&&s.name===r.name&&s.phone===r.phone));
}
function trialConfirm(id){
  if(!trialAllowed('trialManage'))return;
  const r=trialState.requests.find(r=>r.id===id);
  if(!r||r.status!=='待排班'){toast('该预约已处理，请刷新列表');return}
  const c=trialClasses(r).find(c=>c.id===$('#trial-confirm-class').value),time=$('#trial-confirm-time').value;
  if(!trialValidIntention(r,false))return;
  if(!c){toast('请选择匹配课程和校区的可用班级');return}
  if(!trialFuture(time)){toast('实际试听时间须晚于当前时间');return}
  let student=trialStudentFor(r);
  if(r.studentId&&!student){toast('学生档案已移除，请重新提交预约');return}
  const occupied=trialState.requests.filter(x=>x.status==='已排班'&&x.classId===c.id&&x.scheduledTime===time);
  if(occupied.some(x=>trialSamePerson(x,r)||(student&&x.studentId===student.id))){toast('该学生已在此班级同一时间安排试听');return}
  if(trialState.requests.some(x=>x.status==='已排班'&&x.scheduledTime===time&&(trialSamePerson(x,r)||(student&&x.studentId===student.id)))){toast('该学生在此时间已有其他试听安排');return}
  const regular=student?.status==='在读'&&student.className===c.name;
  if(regular){toast('该学生已正式在此班级就读，请选择其他试听班级');return}
  if(Number(c.students)+occupied.length>=Number(c.capacity)){toast('该讲次班级名额已满，请选择其他班级或时间');return}
  if(!student){
    student={id:'TRIAL-'+r.id,name:r.name,phone:r.phone,grade:r.grade,guardian:r.guardian,schools:(r.schools||[]).map(s=>({...s})),schoolSystem:r.schoolSystem==='54'?'54':'63',school:r.schools?.[0]?.name||'',gender:r.gender||'',source:r.source||'',campus:r.campus,status:'试听',follow:'待跟进',className:'—',originLeadId:r.leadId||null};
    if(r.informationRecord)student.history=[r.informationRecord];
    a.students.push(student);
  }
  // 试听按讲次进入独立名单，保留已有学生的正式班级和报名状态。
  Object.assign(r,{studentId:student.id,classId:c.id,scheduledTime:time,teacher:c.teacher,room:c.room,scheduleNote:$('#trial-schedule-note').value.trim(),status:'已排班',confirmedAt:new Date().toLocaleString('zh-CN'),confirmedBy:trialActor().name});
  r.academicTerm=studentClassTerm(c);
  const scheduledSession=trialClassSessions(c).find(s=>!s.cancelled&&new Date(s.startsAt).getTime()===new Date(time).getTime());
  r.scheduledSessionName=scheduledSession?.name||'';r.scheduledEndTime=scheduledSession?trialSessionEndTime(scheduledSession):'';
  (c.trialRoster??=[]).push({requestId:r.id,studentId:student.id,time});
  trialLog(r,'试听排班',`教务已确认：${c.name}，${time.replace('T',' ')}，${c.teacher}，${c.room||'教室待定'}。${r.scheduleNote}`);
  trialState.modalId=null;trialState.filter='已排班';render();toast('已确认排班，学生已进入该班试听名单');
}
function trialCancel(id){
  if(!trialAllowed('trialManage'))return;
  const r=trialState.requests.find(r=>r.id===id);if(!r||r.status!=='待排班')return;
  const reason=$('#trial-schedule-note').value.trim();if(!reason){toast('请填写取消原因');return}
  Object.assign(r,{status:'已取消',cancelReason:reason,cancelledBy:trialActor().name});
  trialLog(r,'取消试听',`预约已取消：${reason}`);trialState.modalId=null;render();toast('试听预约已取消');
}
function trialRosterHTML(list){
  if(!list.length)return '';
  return `<section class="card pad trial-roster"><h2 class="section-title">试听名单（已确认排班）</h2><p class="help">按试听讲次列出学生；试听名额按实际时间计算，正式在班人数保持不变。</p>${aTable(['学生','班级','课程','试听时间','老师 / 教室'],list.map(r=>{const c=a.classes.find(c=>c.id===r.classId);return `<tr><td>${esc(r.name)}</td><td>${esc(c?.name||'班级已移除')}</td><td>${esc(r.course)}</td><td>${esc(r.scheduledTime.replace('T',' '))}</td><td>${esc(r.teacher)} / ${esc(r.room||'待定')}</td></tr>`}))}</section>`;
}
const trialOriginalClassForm=classForm,trialOriginalStudentDetail=studentDetail;
classForm=function(){return trialOriginalClassForm()+trialRosterHTML(trialState.requests.filter(r=>r.status==='已排班'&&r.classId===a.classes[a.selectedClass]?.id))};
studentDetail=function(){
  const s=a.students[a.selectedStudent]||a.students[0],list=trialState.requests.filter(r=>r.status==='已排班'&&r.studentId===s.id);
  const base=s.status==='试听'?`<a class="back-link" onclick="nav('students')">← 返回学生管理</a>`+heading('学生详情',s.id+' · '+s.name)+`<div class="card pad"><p>${esc(s.name)} · ${esc(leadDetailPhone(s.phone))} · ${esc(s.campus)}</p>${trialBadge('试听')}<p class="help">当前为试听学生，尚未产生正式报名订单。</p></div>`:trialOriginalStudentDetail();
  return base+trialRosterHTML(list);
};
