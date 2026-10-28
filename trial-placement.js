// 招生选定实际课节后直接排班。单条预约、批量导入共用容量和冲突校验。
function trialPlacementSession(request){
  const cls=a.classes.find(c=>c.id===request.requestedClassId);
  const session=cls&&trialClassSessions(cls).find(s=>s.id===request.requestedSessionId);
  return {cls,session};
}
function trialPlacementError(request,planned=[]){
  const {cls,session}=trialPlacementSession(request);
  if(!cls||!trialAvailableClass(cls))return '试听班级已不可用，请重新选择';
  if(!session||session.cancelled||!trialFuture(session.startsAt)||new Date(session.startsAt).getTime()!==new Date(request.preferredTime).getTime())return '请选择该班级有效的未来课节';
  const start=new Date(session.startsAt).getTime(),end=new Date(trialSessionEndTime(session)).getTime();
  if(!Number.isFinite(end)||end<=start)return '课节结束时间未配置，请先补全课表';
  const student=trialStudentFor(request);
  if(request.studentId&&!student)return '学生档案已移除，请重新选择';
  const regular=student?studentTermEnrollments().filter(r=>r.studentId===student.id&&!['已退费','已退班','已转班','已取消'].includes(r.status)):[];
  if(regular.some(r=>r.classId===cls.id))return '该学生已正式报名此班级，请选择其他试听班级';
  const active=trialState.requests.filter(r=>r.status==='已排班'&&!r.salesReturnedAt&&!r.supersededBy&&r.id!==request.replaceRequestId);
  const scheduled=[...active,...planned.map(r=>({...r,classId:r.requestedClassId,scheduledTime:r.preferredTime,scheduledEndTime:r.requestedEndTime}))];
  const samePerson=r=>trialSamePerson(r,request)||(student&&r.studentId===student.id);
  const overlap=(from,to)=>{const a=new Date(from).getTime(),b=new Date(to).getTime();return Number.isFinite(a)&&(Number.isFinite(b)?a<end&&b>start:a===start)};
  if(scheduled.some(r=>samePerson(r)&&overlap(r.scheduledTime,r.scheduledEndTime)))return '该学生已有时间冲突或重复的试听安排';
  if(regular.some(r=>{const c=a.classes.find(c=>c.id===r.classId);return c&&trialClassSessions(c).some(s=>!s.cancelled&&overlap(s.startsAt,trialSessionEndTime(s)))}))return '试听时间与该学生的正价班课节冲突';
  const occupied=scheduled.filter(r=>r.classId===cls.id&&new Date(r.scheduledTime).getTime()===start).length;
  if(!Number.isFinite(Number(cls.capacity))||Number(cls.capacity)<=0||Number(cls.students||0)+occupied>=Number(cls.capacity))return '该课节班级名额已满，请选择其他班级或课节';
  return '';
}
function trialPlaceRequest(request){
  const {cls,session}=trialPlacementSession(request);let student=trialStudentFor(request);
  if(!student){
    student={id:'TRIAL-'+request.id,name:request.name,phone:request.phone,grade:request.grade,guardian:request.guardian,schools:(request.schools||[]).map(s=>({...s})),schoolSystem:request.schoolSystem==='54'?'54':'63',school:request.schools?.[0]?.name||'',gender:request.gender||'',source:request.source||'',campus:cls.campus,status:'试听',follow:'待跟进',className:'—',originLeadId:request.leadId||null};
    if(request.informationRecord)student.history=[request.informationRecord];
    a.students.push(student);
  }
  Object.assign(request,{studentId:student.id,classId:cls.id,status:'已排班',scheduledTime:session.startsAt,scheduledEndTime:trialSessionEndTime(session),scheduledSessionId:session.id,scheduledSessionName:session.name,teacher:session.teacher||cls.teacher,room:session.room||cls.room,academicTerm:studentClassTerm(cls),confirmedAt:new Date().toISOString(),confirmedBy:trialActor().name,scheduleMode:'招生直接排班'});
  const roster=cls.trialRoster??=[];
  if(!roster.some(r=>r.requestId===request.id))roster.push({requestId:request.id,studentId:student.id,time:request.scheduledTime});
  const lead=leadState.leads.find(l=>request.leadId&&l.leadId===request.leadId);
  if(lead){lead.studentId=student.id;if(lead.stage!=='已报名')lead.stage='约试听'}
  trialLog(request,'试听排班',`招生已排班：${cls.name}，第${session.number}讲 ${session.name}，${session.startsAt.replace('T',' ')}，${request.teacher||'老师待定'}，${request.room||'教室待定'}。`);
  return request;
}
function trialReturnMyTrials(){trialState.successId=null;leadState.mineTab='约试听';leadState.mineSearch='';leadNav('myLeads')}
// 旧待排班记录保留，由招生重新选择课节后替代，不猜测历史时间。
function myTrialSchedulePending(id){
  const request=trialState.requests.find(r=>r.id===id),lead=request&&leadState.leads.find(l=>l.leadId===request.leadId);
  if(!request||request.status!=='待排班'||!myTrialActive(request)||!lead||!leadHasOwner(lead)||!trialAllowed('quickTrial'))return;
  trialStart(lead);trialState.draft.replaceRequestId=id;trialState.step=2;render();
}
function trialLessonRequests(classId,start){
  const time=new Date(start).getTime();
  return trialState.requests.filter(r=>r.status==='已排班'&&!r.supersededBy&&!r.salesReturnedAt&&r.classId===classId&&new Date(r.scheduledTime).getTime()===time);
}
