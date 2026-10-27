// 本机验收：沿用学生详情、沟通记录和报名页面，串联入班后的服务与续报。
function studentLifecycleArg(value){return `decodeURIComponent('${encodeURIComponent(String(value)).replace(/'/g,'%27')}')`}
function studentServiceClasses(student){
  const rows=[...studentTermEnrollments(),...studentTermTrials()].filter(r=>r.studentId===student.id&&r.classId);
  return [...new Map(rows.map(r=>[r.classId,r])).values()];
}
function studentServiceNext(student,classId){
  const rows=(student.communications||[]).filter(r=>(r.classId||'')===(classId||''));
  const latest=rows.slice().reverse().sort((x,y)=>String(y.recordedAt||y.time).localeCompare(String(x.recordedAt||x.time)))[0];
  return latest?.nextTime||'';
}
function studentServiceClassField(){
  const student=studentProfileCurrent(),rows=student?studentServiceClasses(student):[];
  return aField('关联班级',`<select class="select" id="student-service-class"><option value="">学生日常沟通（不指定班级）</option>${rows.map(r=>`<option value="${esc(r.classId)}" ${leadRecordDraft?.serviceClassId===r.classId?'selected':''}>${esc(r.className)} · ${esc(studentTermLabel(r.term))}</option>`).join('')}</select>`);
}
const lifecycleCommunicationPage=studentCommunicationPage;
studentCommunicationPage=function(){return lifecycleCommunicationPage().replace('<div class="form-grid">','<div class="form-grid">'+studentServiceClassField())};
const lifecycleCommunicationSave=studentCommunicationSave;
studentCommunicationSave=function(){
  const student=studentProfileCurrent();if(!student)return;
  const classId=$('#student-service-class')?.value||'',row=classId&&studentServiceClasses(student).find(r=>r.classId===classId);
  if(classId&&!row){toast('关联班级已变化，请重新选择');return}
  const count=student.communications?.length||0;
  lifecycleCommunicationSave();
  if((student.communications?.length||0)===count+1){
    Object.assign(student.communications.at(-1),{classId,className:row?.className||'',academicTerm:row?.term||'',teacher:row?.teacher||'',academicTeacher:row?.academicTeacher||''});
    academicRender();
  }
};
function studentServiceOpen(id,classId){
  const student=a.students.find(s=>s.id===id);
  if(!student||!studentServiceClasses(student).some(r=>r.classId===classId))return;
  studentOpenCommunication(id);
  if(leadRecordDraft?.context==='studentCommunication'){leadRecordDraft.serviceClassId=classId;academicRender()}
}
const lifecycleProfileCommunications=studentProfileCommunications;
studentProfileCommunications=function(student){return lifecycleProfileCommunications(student).map(r=>r.className?{...r,text:`【${r.className}】\n${r.text}`} :r)};

function enrollmentRenewalSource(studentId,classId){
  return studentTermEnrollments().find(r=>r.studentId===studentId&&r.classId===classId&&!['已退费','已退班','已转班','已取消'].includes(r.status));
}
function enrollmentRenewalSnapshot(row){return {studentId:row.studentId,classId:row.classId,className:row.className,academicTerm:row.term,subject:row.subject,teacher:row.teacher,academicTeacher:row.academicTeacher,initiatedAt:new Date().toISOString()}}
function enrollmentRenewalCandidates(item){
  const student=enrollmentStudent();
  return student?studentTermEnrollments().filter(row=>row.studentId===student.id&&enrollmentRenewalSource(student.id,row.classId)&&enrollmentRenewalTarget(item.class||a.classes.find(c=>c.id===item.classId)||{},enrollmentRenewalSnapshot(row))):[];
}
function enrollmentRenewalField(item,index){
  if(item.signupType!=='续费')return '';
  const source=a.enrollment?.renewalFrom;
  if(source)return `<div class="help">续报原班：${esc(source.className)}</div>`;
  const rows=enrollmentRenewalCandidates(item);
  return `<select class="select" aria-label="续报原班${index+1}" onchange="enrollmentSetRenewalSource(${index},this.value)"><option value="">请选择续报原班</option>${rows.map(r=>`<option value="${esc(r.classId)}" ${item.renewalFrom?.classId===r.classId?'selected':''}>${esc(r.className)} · ${esc(studentTermLabel(r.term))}</option>`).join('')}</select>${rows.length?'':'<div class="help">须先选择已有学生，且原班为同学科的更早学期。</div>'}`;
}
function enrollmentSetRenewalSource(index,id){
  const item=a.enrollment?.classes[index];if(!item)return;
  const row=enrollmentRenewalCandidates(item).find(r=>r.classId===id);
  item.renewalFrom=row?enrollmentRenewalSnapshot(row):null;
}
function enrollmentStartRenewal(studentId,classId){
  if(!permissionCanVisit('enroll'))return;
  const row=enrollmentRenewalSource(studentId,classId),student=a.students.find(s=>s.id===studentId);
  if(!row||!student||!studentTermParts(row.term)||!row.subject){toast('请先补齐原班的年份、学期和学科，再发起续报');return}
  enrollmentDisposeProofs();leadDisposeRecord();a.enrollment=null;a.enrollingLeadId=null;
  a.selectedStudent=a.students.indexOf(student);a.selectedClass=null;a.enrollStep=2;a.modal=null;
  const draft=enrollmentEnsure();
  draft.renewalFrom=enrollmentRenewalSnapshot(row);
  nav('enroll');
}
function enrollmentRenewalTarget(cls,source=a.enrollment?.renewalFrom){
  if(!source)return true;
  const oldTerm=studentTermParts(source.academicTerm),nextTerm=studentTermParts(studentClassTerm(cls));
  return cls.id!==source.classId&&oldTerm&&nextTerm&&enrollmentClassInfo(cls).subject===source.subject&&
    (nextTerm.year*4+studentTermSeasons.indexOf(nextTerm.season)>oldTerm.year*4+studentTermSeasons.indexOf(oldTerm.season));
}
const lifecycleFilteredClasses=enrollmentFilteredClasses;
enrollmentFilteredClasses=function(){return lifecycleFilteredClasses().filter(c=>enrollmentRenewalTarget(c))};
const lifecycleConfirmClasses=enrollmentConfirmClasses;
enrollmentConfirmClasses=function(){
  if(a.enrollment?.renewalFrom){
    const ids=a.enrollment.classPicker?.ids||[];
    if(ids.some(id=>!enrollmentRenewalTarget(a.classes.find(c=>c.id===id)||{}))){toast('续报请选择同学科、后续学期的班级');return}
    a.enrollment.classes=ids.map(classId=>({...a.enrollment.classes.find(r=>r.classId===classId),classId,startSession:a.enrollment.classes.find(r=>r.classId===classId)?.startSession||1,signupType:'续费'}));
  }
  return lifecycleConfirmClasses();
};
const lifecycleValidClasses=enrollmentValidClasses;
enrollmentValidClasses=function(){
  const source=a.enrollment?.renewalFrom;
  if(source&&(!enrollmentRenewalSource(enrollmentStudent()?.id,source.classId)||enrollmentSelectedClasses().some(item=>item.signupType!=='续费'||!enrollmentRenewalTarget(item.class||{})))){
    toast('请核对续报原班，并选择同学科后续学期的班级，签约类型为续费');return false;
  }
  if(!source&&enrollmentSelectedClasses().some(item=>item.signupType==='续费'&&!enrollmentRenewalCandidates(item).some(row=>row.classId===item.renewalFrom?.classId))){toast('请为续费班级选择有效的续报原班');return false}
  return lifecycleValidClasses();
};
const lifecycleEnrollPage=enrollPage;
enrollPage=function(){
  const html=lifecycleEnrollPage(),source=a.enrollment?.renewalFrom;
  return source?`<p class="notice">续报原班：${esc(source.className)} · ${esc(studentTermLabel(source.academicTerm))}。选择同学科后续学期班级；部分缴费可入班，缴清后计为续报成功。</p>`+html:html;
};
function studentRenewalStatus(studentId,classId){
  const rows=a.orders.filter(o=>o.studentId===studentId&&!['已取消','已关闭','交易关闭'].includes(o.status)).flatMap(order=>(order.items||[]).filter(item=>item.renewalFrom?.classId===classId).map(item=>({order,item})));
  if(!rows.length)return '未发起续报';
  const active=rows.filter(({item})=>!['已退费','已退班','已取消','已转班'].includes(item.enrollmentStatus));
  if(!active.length)return '续报已退转';
  return active.some(({item})=>Number.isSafeInteger(item.paidCents)&&Number.isSafeInteger(item.dueCents)&&item.paidCents>=item.dueCents)?'续报成功':'已报名，待补费';
}
studentProfileCourses=function(student){
  const rows=studentTermEnrollments().filter(r=>r.studentId===student.id),trials=studentTermTrials().filter(r=>r.studentId===student.id);
  const items=rows.map(r=>{
    const next=studentServiceNext(student,r.classId),canRenew=enrollmentRenewalSource(student.id,r.classId),period=typeof renewalPeriodFor==='function'?renewalPeriodFor(r):null;
    return `<tr><td>${esc(r.className)}<div class="help">${esc(studentTermLabel(r.term))}</div></td><td>${esc(r.campus||'—')}</td><td>${esc(r.teacher||'—')} / ${esc(r.academicTeacher||'—')}</td><td>${esc(r.status)}</td><td>${esc(studentProfileEnrollmentTime(student,r)?studentProfileTime(studentProfileEnrollmentTime(student,r)):'未记录')}</td><td>${next?`${esc(studentProfileTime(next))}${Date.parse(next)<Date.now()?'<span class="badge off">待跟进</span>':''}`:'未约定'}</td><td>${esc(studentRenewalStatus(student.id,r.classId))}<div class="help">${period?`${renewalPeriodStatus(period)} · ${esc(renewalPeriodTimeLabel(period.start))} 至 ${esc(renewalPeriodTimeLabel(period.end,true))}`:'未设置续报期'}</div></td><td><div class="actions"><button class="btn small" onclick="studentServiceOpen(${studentLifecycleArg(student.id)},${studentLifecycleArg(r.classId)})">记录沟通</button>${canRenew&&permissionCanVisit('enroll')?`<button class="btn small" onclick="enrollmentStartRenewal(${studentLifecycleArg(student.id)},${studentLifecycleArg(r.classId)})">续报</button>`:''}</div></td></tr>`;
  });
  return `<h2 class="section-title">历次报名课程</h2>${aTable(['班级 / 学期','校区','授课老师 / 教务老师','本班状态','报名时间','下次沟通','续报状态 / 续报期','操作'],items)}${rows.length?'':'<div class="empty">暂无正式报名课程</div>'}${trials.length?`<hr class="divider"><h2 class="section-title">试听课程</h2>${aTable(['试听班级','课节','试听时间','状态'],trials.map(r=>`<tr><td>${esc(r.className)}</td><td>${esc(r.session||'—')}</td><td>${esc(r.time||'—')}</td><td>${esc(r.status)}</td></tr>`))}`:''}`;
};
