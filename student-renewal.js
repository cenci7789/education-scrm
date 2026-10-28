// 学生列表的续报工作流。只授权所选学生和原班，不扩大普通报名入口权限。
let studentRenewalContext=null;
function studentRenewalActor(origin){return origin==='learningActive'?learningActorKey():JSON.stringify([studentTermActor(),permissionState.identity,state.currentUser?.account])}
function studentRenewalSources(studentId,origin){
  if(!['students','learningActive'].includes(origin)||!permissionCanVisit(origin)||state.currentUser?.active===false)return [];
  const rows=origin==='learningActive'?learningOwnRows().filter(r=>!learningHistorical(r)):studentTermEnrollments();
  return rows.filter(r=>r.studentId===studentId&&r.classId&&a.classes.some(c=>c.id===r.classId)&&!['已退费','已退班','已转班','已取消'].includes(r.status));
}
function studentRenewalAllowed(){
  const c=studentRenewalContext;
  if(!c||c.actor!==studentRenewalActor(c.origin)||!a.students.some(s=>s.id===c.studentId))return false;
  const rows=studentRenewalSources(c.studentId,c.origin);
  return c.classId?rows.some(r=>r.classId===c.classId):rows.length>0;
}
function studentRenewalButton(studentId,classId=''){
  const available=studentRenewalSources(studentId,state.page).some(r=>!classId||r.classId===classId);
  return `<button class="btn small" ${available?'':'disabled title="暂无可续报的正式班级"'} onclick="studentRenewalOpen(${studentLifecycleArg(studentId)},${studentLifecycleArg(classId)})">续报</button>`;
}
function studentRenewalOpen(studentId,classId=''){
  const origin=state.page,rows=studentRenewalSources(studentId,origin);
  if(!rows.length||classId&&!rows.some(r=>r.classId===classId))return;
  enrollmentDisposeProofs();leadDisposeRecord();a.enrollment=null;a.enrollingLeadId=null;a.modal=null;
  studentRenewalContext={origin,studentId,actor:studentRenewalActor(origin),classId:''};
  a.selectedStudent=a.students.findIndex(s=>s.id===studentId);a.selectedClass=null;a.enrollStep=2;
  const source=classId|| (rows.length===1?rows[0].classId:'');
  state.page='studentRenewal';
  if(source)studentRenewalChooseSource(source);else render();
}
function studentRenewalNextGrade(grade,schoolSystem='63'){
  const sequence=schoolSystem==='54'?['小一','小二','小三','小四','小五','初一','初二','初三','初四','高一','高二','高三']:leadGradeNames.filter(g=>g!=='初四');
  const i=sequence.findIndex(g=>leadGradeKey(g)===leadGradeKey(grade));
  if(i<0||i===sequence.length-1)return '';
  const next=sequence[i+1];
  return leadConfiguredGradeNames().find(g=>leadGradeKey(g)===leadGradeKey(next))||next;
}
function studentRenewalDefaults(row){
  const student=a.students.find(s=>s.id===row.studentId),sourceTerm=studentTermParts(row.term);
  const grade=sourceTerm?.season==='春季'?studentRenewalNextGrade(row.grade,student?.schoolSystem):row.grade;
  return {grade:grade||'',subject:row.subject||'',classType:row.classType||'',campus:row.campus||'',term:studentTermShift(row.term,1),teacher:row.teacher||'',format:row.format||''};
}
function studentRenewalChooseSource(classId){
  if(state.page!=='studentRenewal'||!studentRenewalAllowed())return;
  const c=studentRenewalContext,row=studentRenewalSources(c.studentId,c.origin).find(r=>r.classId===classId);
  if(!row)return;
  if(!studentTermParts(row.term)||!row.subject){toast('请先补齐原班年份、学期和科目，再发起续报');render();return}
  c.classId=classId;c.defaults=studentRenewalDefaults(row);
  enrollmentDisposeProofs();leadDisposeRecord();a.enrollment=null;
  a.selectedStudent=a.students.findIndex(s=>s.id===c.studentId);a.enrollStep=2;
  const draft=enrollmentEnsure();draft.renewalFrom=enrollmentRenewalSnapshot(row);
  draft.classPicker={ids:[],filters:{...c.defaults}};
  render();
}
function studentRenewalReturnPage(){return studentRenewalContext?.origin||'students'}
function studentRenewalBack(){const origin=studentRenewalReturnPage();nav(origin)}
function studentRenewalDraftAllowed(){
  const c=studentRenewalContext,d=a.enrollment;
  if(!studentRenewalAllowed()||!c.classId||d?.studentId!==c.studentId||d.renewalFrom?.studentId!==c.studentId||d.renewalFrom?.classId!==c.classId)return false;
  const source=studentRenewalSources(c.studentId,c.origin).find(r=>r.classId===c.classId);
  return source?.term===d.renewalFrom.academicTerm&&source?.subject===d.renewalFrom.subject;
}
const renewalPreviousPermission=permissionCanVisit;
permissionCanVisit=function(page){return page==='studentRenewal'?Boolean(studentRenewalAllowed()):renewalPreviousPermission(page)};
const renewalPreviousOperator=leadCurrentOperator;
leadCurrentOperator=function(){
  if(state.page==='studentRenewal'&&studentRenewalAllowed()){
    const staff=state.currentUser||(studentRenewalContext.origin==='learningActive'?learningTeacher():null);
    if(staff)return {...leadStaffIdentity(staff),staffId:staff.id||staff.staffId||'',role:permissionRole()?.name||''};
  }
  return renewalPreviousOperator();
};
const renewalPreviousOpenClasses=enrollmentOpenClasses;
enrollmentOpenClasses=function(){
  if(state.page!=='studentRenewal')return renewalPreviousOpenClasses();
  if(!studentRenewalDraftAllowed())return;
  a.enrollment.classPicker={ids:a.enrollment.classes.map(r=>r.classId),filters:{...studentRenewalContext.defaults}};academicRender();
};
const renewalPreviousCancelClasses=enrollmentCancelClasses;
enrollmentCancelClasses=function(){
  if(state.page!=='studentRenewal')return renewalPreviousCancelClasses();
  if(a.enrollment?.classes.length){a.enrollment.classPicker=null;academicRender()}else studentRenewalBack();
};
const renewalPreviousValidClasses=enrollmentValidClasses;
enrollmentValidClasses=function(){
  if(state.page==='studentRenewal'&&!studentRenewalDraftAllowed()){toast('原班级或账号权限已变化，请返回学生列表重新续报');return false}
  return renewalPreviousValidClasses();
};
const renewalPreviousConfirmClasses=enrollmentConfirmClasses;
enrollmentConfirmClasses=function(){if(state.page==='studentRenewal'&&!studentRenewalDraftAllowed())return;return renewalPreviousConfirmClasses()};
const renewalPreviousFinish=finishEnroll;
finishEnroll=function(){
  if(state.page!=='studentRenewal')return renewalPreviousFinish();
  if(!studentRenewalDraftAllowed()||!enrollmentValidate(a.enrollment.data)||!enrollmentValidClasses())return;
  const payment=enrollmentValidateCheckout();if(!payment)return;
  // 续报只增加课程和收费记录，不将未来班级的年级、校区覆盖为学生当前基本资料。
  enrollmentCompleteOrder(enrollmentStudent(),payment);leadDisposeRecord();a.enrollment=null;
};
function studentRenewalPage(){
  const c=studentRenewalContext,student=a.students.find(s=>s.id===c.studentId),back='<a class="back-link" onclick="studentRenewalBack()">← 返回学生列表</a>';
  if(!c.classId){
    const rows=studentRenewalSources(c.studentId,c.origin);
    return back+aHeading('续报',student.name+' · 选择续报原班级')+`<section class="card pad">${aTable(['原班级','学期','年级','科目','班型','校区','授课老师','操作'],rows.map(r=>`<tr><td>${esc(r.className)}</td><td>${esc(studentTermLabel(r.term))}</td><td>${esc(r.grade)}</td><td>${esc(r.subject)}</td><td>${esc(r.classType)}</td><td>${esc(r.campus)}</td><td>${esc(r.teacher)}</td><td><button class="btn small" onclick="studentRenewalChooseSource(${studentLifecycleArg(r.classId)})">选择原班</button></td></tr>`))}</section>`;
  }
  if(!studentRenewalDraftAllowed())return back+'<div class="empty">续报资料已变化，请返回学生列表重新发起。</div>';
  const source=a.enrollment.renewalFrom;
  const note=`<p class="notice">${esc(student.name)} · 续报原班：${esc(source.className)}（${esc(studentTermLabel(source.academicTerm))}）${c.defaults.grade?'':'；原班年级无法自动升班，请手动选择目标年级。'}</p>`;
  if(a.enrollment.classPicker)return enrollmentClassPickerPage().replace('← 返回单个报名','← 返回').replace('选择报名班级','续报').replace('<div class="card pad">',note+'<div class="card pad">');
  const body=a.enrollStep===3?enrollPayment():`<div class="toolbar"><button class="btn primary" onclick="enrollmentOpenClasses()">选择班级</button></div>`+enrollClass().replace('a.enrollStep=1;academicRender()','enrollmentOpenClasses()').replace(/<select\b[^>]*aria-label="[^"]*签约类型"[^>]*>[\s\S]*?<\/select>/g,'<span class="badge">续费</span>');
  return back+aHeading('续报',student.name+' · '+(a.enrollStep===3?'费用结算':'确认续报班级'))+note+`<section class="card pad">${body}</section>`;
}
function studentRenewalRender(){
  if(!studentRenewalAllowed()){enrollmentDisposeProofs();leadDisposeRecord();a.enrollment=null;permissionDenied('studentRenewal');return}
  $('#view').innerHTML=studentRenewalPage();
  $('#crumb').textContent=(studentRenewalContext.origin==='learningActive'?'教学 / 学生':'教务 / 学生管理')+' / 续报';
  document.querySelectorAll('.menu-item').forEach(e=>e.classList.toggle('active',e.dataset.page===studentRenewalContext.origin));
  permissionRefreshNavigation();
}
const renewalPreviousRender=render,renewalPreviousAcademicRender=academicRender;
render=function(){if(state.page==='studentRenewal')return studentRenewalRender();if(studentRenewalContext){studentRenewalContext=null;enrollmentCleanup()}return renewalPreviousRender()};
academicRender=function(){if(state.page==='studentRenewal')return studentRenewalRender();return renewalPreviousAcademicRender()};
