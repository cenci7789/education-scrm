// 教学入口复用正价学生组件；账号授课范围在列表、详情和沟通保存时统一核验。
const learningPages=['learningActive','learningHistory','learningData'];
const learningViews=new Map(),learningCalendarViews=new Map(),learningDemoTeachers=new Map();
let learningStudentContext=null;
const learningTeacherRole=permissionRole('teacher');
if(learningTeacherRole)learningTeacherRole.grants=[...new Set([...learningTeacherRole.grants,...learningPages])];
function learningTeacherOptions(){
  const teachers=state.staff.filter(s=>s.active!==false&&(s.roleId==='teacher'||/教师|老师|主讲|授课/.test(s.roles||'')||a.classes.some(c=>c.teacherId&&String(c.teacherId)===String(s.id)||c.teacher===s.name))).map(s=>({...s,key:String(s.id||s.account||s.phone||s.name)}));
  for(const cls of a.classes)if(cls.teacher&&!teachers.some(s=>s.name===cls.teacher))teachers.push({id:cls.teacherId||'',account:cls.teacherAccount||'',name:cls.teacher,key:'demo:'+cls.teacher});
  return teachers;
}
function learningTeacher(){
  if(state.currentUser)return state.currentUser.active===false?null:state.currentUser;
  const options=learningTeacherOptions(),key=learningDemoTeachers.get(permissionState.identity);
  return options.find(t=>t.key===key)||options[0]||null;
}
function learningActorKey(){const t=learningTeacher();return JSON.stringify([studentTermActor(),permissionState.identity,t?.id,t?.account,t?.name,t?.key])}
function learningMatchesTeacher(source){
  const teacher=learningTeacher();if(!teacher)return false;
  if(source.teacherId)return [teacher.id,teacher.staffId].filter(Boolean).some(id=>String(id)===String(source.teacherId));
  if(source.teacherAccount)return Boolean(teacher.account&&teacher.account===source.teacherAccount);
  if(!source.teacher||source.teacher!==teacher.name)return false;
  // Legacy name-only class assignments are usable only when that name is unambiguous.
  return state.staff.filter(s=>s.active!==false&&s.name===teacher.name).length<=1;
}
function learningRowOwner(row){
  const student=a.students.find(s=>s.id===row.studentId),cls=a.classes.find(c=>c.id===row.classId);
  if(cls&&!learningHistorical(row))return cls;
  const records=[...a.orders.filter(o=>o.studentId===row.studentId).flatMap(o=>o.items||[]),...(student?.enrollments||[])];
  const snapshot=records.filter(r=>(r.classId?r.classId===row.classId:r.className===row.className)&&(!r.academicTerm||r.academicTerm===row.term)).at(-1);
  return snapshot&&(snapshot.teacherId||snapshot.teacherAccount||snapshot.teacher)?snapshot:cls||{teacher:row.teacher};
}
function learningOwnRows(){return studentTermEnrollments().filter(row=>learningMatchesTeacher(learningRowOwner(row))).map(row=>({...row,teacher:learningRowOwner(row).teacher||row.teacher}))}
function learningOwnTrials(){return studentTermTrials().filter(row=>{
  const request=trialState.requests.find(r=>r.id===row.requestId),cls=a.classes.find(c=>c.id===row.classId);
  const sameTeacher=!request?.teacher||request.teacher===cls?.teacher;
  return request?.status==='已排班'&&!request.supersededBy&&!request.salesReturnedAt&&learningMatchesTeacher({teacher:request.teacher||cls?.teacher,teacherId:request.teacherId||(sameTeacher?cls?.teacherId:''),teacherAccount:request.teacherAccount||(sameTeacher?cls?.teacherAccount:'')});
})}
function learningHistorical(row){return ['已结课','已退费','已退班','已转班','已取消'].includes(row.status)}
function learningHasPage(page){return permissionState.identity==='admin'||Boolean(permissionRole()?.active&&permissionRole().grants.includes(page))}
function learningOwnStudent(id){return learningOwnRows().some(r=>r.studentId===id&&learningHasPage(learningHistorical(r)?'learningHistory':'learningActive'))||learningHasPage('learningActive')&&learningOwnTrials().some(r=>r.studentId===id)}
function learningScopedProfile(){
  const context=learningStudentContext?.actor===learningActorKey();
  const general=permissionState.identity==='admin'||permissionRole()?.grants.includes('students');
  return ['studentDetail','studentCommunication'].includes(state.page)&&(context||!general&&(learningHasPage('learningActive')||learningHasPage('learningHistory')));
}
const learningPreviousPermission=permissionCanVisit;
permissionCanVisit=function(page){
  if(['studentDetail','studentCommunication'].includes(page)){
    const general=permissionState.identity==='admin'||permissionRole()?.grants.includes('students');
    const scoped=learningStudentContext?.actor===learningActorKey()||!general;
    if(scoped)return Boolean((permissionState.identity==='admin'||permissionRole()?.active)&&learningOwnStudent(a.students[a.selectedStudent]?.id));
  }
  return learningPreviousPermission(page);
};
function learningTeacherControl(){
  const teacher=learningTeacher();
  if(state.currentUser)return `<p class="help">授课老师：${esc(teacher?.name||'当前账号未关联老师')} · 仅展示本人授课范围</p>`;
  return `<div class="learning-teacher-picker"><label for="learning-demo-teacher">演示授课老师</label><select class="select" id="learning-demo-teacher" onchange="learningSelectTeacher(this.value)">${learningTeacherOptions().map(t=>`<option value="${esc(t.key)}" ${teacher?.key===t.key?'selected':''}>${esc(t.name)}</option>`).join('')}</select><span class="help">登录老师账号后自动使用本人身份</span></div>`;
}
function learningSelectTeacher(key){
  if(state.currentUser||!learningPages.includes(state.page)||!permissionCanVisit(state.page)||!learningTeacherOptions().some(t=>t.key===key))return;
  leadDisposeRecord();learningStudentContext=null;a.selectedStudent=null;learningDemoTeachers.set(permissionState.identity,key);academicRender();
}
function learningView(){const key=learningActorKey()+'|'+state.page;if(!learningViews.has(key))learningViews.set(key,{tab:'正价学生',...studentTermEmptyFilters()});return learningViews.get(key)}
const learningPreviousStudentView=studentTermView,learningPreviousStudentRows=studentTermRows,learningPreviousResults=studentTermResults,learningPreviousReset=studentTermResetFilters;
studentTermView=function(){return ['learningActive','learningHistory'].includes(state.page)?learningView():learningPreviousStudentView()};
studentTermRows=function(tab=studentTermView().tab){return state.page==='learningActive'&&tab==='试听学生'?learningOwnTrials():['learningActive','learningHistory'].includes(state.page)?learningOwnRows().filter(r=>learningHistorical(r)===(state.page==='learningHistory')):learningPreviousStudentRows(tab)};
studentTermResults=function(){return ['learningActive','learningHistory'].includes(state.page)?studentTermTable(studentTermFiltered(studentTermRows()),state.page==='learningActive'&&studentTermView().tab==='试听学生').replaceAll('studentTermOpenStudent(', 'learningOpenStudent('):learningPreviousResults()};
studentTermResetFilters=function(){if(['learningActive','learningHistory'].includes(state.page)){Object.assign(learningView(),studentTermEmptyFilters());academicRender();return}return learningPreviousReset()};
learningStudentsPage=function(){
  const rows=studentTermRows(),historical=state.page==='learningHistory',title=historical?'历史学生':'在读学生';
  const filters=teachingPreviousStudentFields(rows);
  return aHeading(title,historical?'查看本人已结课、退班或转班学生，继续跟进沟通':'查看本人班级的正价学生与已排班的试听学生')+`<section class="card pad">${learningTeacherControl()}${historical?'':`<div class="tabs" role="tablist" aria-label="学生分类">${studentTermTabs.map(tab=>`<button class="tab ${learningView().tab===tab?'active':''}" role="tab" aria-selected="${learningView().tab===tab}" onclick="studentTermSetTab('${tab}')">${tab} <span class="count">${new Set(studentTermRows(tab).map(r=>r.personKey)).size}</span></button>`).join('')}</div>`}<div class="student-management-filters">${filters}</div><div class="toolbar student-management-reset"><p class="help">按本人班级的就读状态分类，同一学生可有多条班级记录。</p><button class="btn small" onclick="studentTermResetFilters()">重置筛选</button></div><div id="student-term-results">${studentTermResults()}</div></section>${studentTermTrialModal()}`;
};
function learningOpenStudent(id,section){
  if(!['learningActive','learningHistory'].includes(state.page)||!permissionCanVisit(state.page)||!studentTermRows().some(r=>r.studentId===id))return;
  learningStudentContext={actor:learningActorKey(),origin:state.page};
  a.selectedStudent=a.students.findIndex(s=>s.id===id);studentTermOpenStudent(id,section);
}
const learningPreviousOpenStudent=studentTermOpenStudent,learningPreviousOpenCommunication=studentOpenCommunication;
studentTermOpenStudent=function(id,section){if(learningScopedProfile()&&!learningOwnStudent(id))return;return learningPreviousOpenStudent(id,section)};
studentOpenCommunication=function(id,channel){if(learningScopedProfile()&&!learningOwnStudent(id??a.students[a.selectedStudent]?.id))return;return learningPreviousOpenCommunication(id,channel)};
function learningBack(){studentProfileState.editing=false;nav(learningStudentContext?.origin||'learningActive')}
const learningPreviousDetail=studentDetail,learningPreviousCommunicationPage=studentCommunicationPage,learningPreviousOperator=studentProfileOperator,learningPreviousOperatorSelect=studentProfileOperatorSelect;
studentDetail=function(){
  if(!learningScopedProfile())return learningPreviousDetail();
  if(!learningOwnStudent(a.students[a.selectedStudent]?.id))return '<div class="empty">当前学生不在您的授课范围内。</div>';
  const html=learningPreviousDetail().replace('onclick="studentProfileState.editing=false;nav(\'students\')"','onclick="learningBack()"').replace('← 返回学生管理','← 返回'+(learningStudentContext?.origin==='learningHistory'?'历史学生':'在读学生')).replace('aria-label="教务沟通操作"','aria-label="教师沟通操作"');
  $('#crumb').textContent='教学 / '+(learningStudentContext?.origin==='learningHistory'?'历史学生':'在读学生')+' / '+studentProfileState.tab;
  return html;
};
studentCommunicationPage=function(){return learningScopedProfile()?learningPreviousCommunicationPage().replaceAll('教务沟通','教师沟通'):learningPreviousCommunicationPage()};
studentProfileOperator=function(){if(!learningScopedProfile())return learningPreviousOperator();const t=learningTeacher();return t?{name:t.name,account:t.account||t.id||t.key||'',role:'授课教师'}:null};
studentProfileOperatorSelect=function(){if(!learningScopedProfile())return learningPreviousOperatorSelect();const t=learningTeacher();return `<p>记录人：${esc(t?.name||'未关联老师')} · 授课教师</p>`};
const learningPreviousExamOperator=studentExamOperator;
studentExamOperator=function(){return learningScopedProfile()?studentProfileOperator():learningPreviousExamOperator()};
function learningCalendarView(){const key=learningActorKey();if(!learningCalendarViews.has(key))learningCalendarViews.set(key,{date:scheduleDateText(new Date())});return learningCalendarViews.get(key)}
function learningSetDate(value){if(permissionCanVisit('learningData')&&scheduleDate(value)){learningCalendarView().date=value;academicRender()}}
function learningMoveWeek(delta){if([-1,1].includes(delta))learningSetDate(scheduleShiftDate(learningCalendarView().date,delta*7))}
function learningWeekLessons(){
  const days=scheduleWeekDates(learningCalendarView().date),start=scheduleDate(days[0]).getTime(),end=scheduleDate(scheduleShiftDate(days[6],1)).getTime();
  const own=scheduleLessons().filter(e=>learningMatchesTeacher(e));
  return own.filter(e=>e.start<end&&e.end>start).map(e=>({...e,conflict:scheduleHasConflict(e,own)}));
}
function learningWeekCalendar(){
  const days=scheduleWeekDates(learningCalendarView().date),events=learningWeekLessons(),segments=days.flatMap(date=>scheduleDaySegments(events,date));
  const from=Math.min(7*60,...segments.map(e=>Math.floor(e.from/60)*60)),to=Math.max(22*60,...segments.map(e=>Math.ceil(e.to/60)*60)),height=to-from,today=scheduleDateText(new Date());
  return `<div class="schedule-scroll learning-week-scroll" onscroll="scheduleHideEvent()"><div class="schedule-time-grid learning-week-grid"><div class="schedule-axis-heading">时间</div>${days.map((date,i)=>`<div class="schedule-room-heading ${date===today?'learning-today':''}">周${'一二三四五六日'[i]}<small>${date.slice(5)}</small></div>`).join('')}<div class="schedule-time-axis" style="height:${height}px">${Array.from({length:(to-from)/60+1},(_,i)=>`<span style="top:${i*60}px">${String(from/60+i).padStart(2,'0')}:00</span>`).join('')}</div>${days.map(date=>`<div class="schedule-room-track" style="height:${height}px" aria-label="${date}课程">${scheduleLanes(scheduleDaySegments(events,date)).map(event=>scheduleEventButton(event,`top:${event.from-from}px;height:${Math.max(22,event.to-event.from)}px;left:calc(${event.lane/event.lanes*100}% + 3px);width:calc(${100/event.lanes}% - 6px)`)).join('')}</div>`).join('')}</div></div><p class="help">本周 ${events.length} 个课节。${events.length?'悬停或聚焦课程卡片查看课程、校区和教室等完整信息。':'暂无排课，可切换日期查看。'}</p>`;
}
learningDataPage=function(){
  const view=learningCalendarView(),days=scheduleWeekDates(view.date);
  return aHeading('课表','按周查看我的授课安排')+`<section class="card pad">${learningTeacherControl()}<div class="schedule-date-bar"><div class="toolbar-left"><button class="btn small" aria-label="上一周" onclick="learningMoveWeek(-1)">‹</button><strong>${days[0]} 至 ${days[6]}</strong><button class="btn small" aria-label="下一周" onclick="learningMoveWeek(1)">›</button><button class="btn small" onclick="learningSetDate(scheduleDateText(new Date()))">本周</button><input type="date" class="input" style="width:170px" aria-label="选择课表日期" value="${view.date}" onchange="learningSetDate(this.value)"></div><div class="schedule-legend"><span>● 已排课</span><span class="conflict">● 时间冲突</span></div></div>${learningWeekCalendar()}</section><aside id="schedule-event-tooltip" class="schedule-tooltip" role="tooltip" hidden></aside>`;
};
const learningPreviousVisibleLessons=scheduleVisibleLessons;
scheduleVisibleLessons=function(){return state.page==='learningData'?learningWeekLessons():learningPreviousVisibleLessons()};
function learningCleanContext(){
  if(learningStudentContext&&(learningStudentContext.actor!==learningActorKey()||!['studentDetail','studentCommunication',...learningPages].includes(state.page)))learningStudentContext=null;
}
const learningPreviousStructureRender=structureRender;
structureRender=function(){learningCleanContext();if(!permissionCanVisit(state.page)){permissionDenied(state.page);return}if(learningPages.includes(state.page)){leadDisposeRecord();if(typeof refundResetEditor==='function')refundResetEditor();studentProfileState.archiveDraft?.files?.forEach(f=>URL.revokeObjectURL(f.url));studentProfileState.archiveDraft=null;studentProfileState.editing=false;a.supplementDraft=null;a.modal=null}const result=learningPreviousStructureRender();permissionRefreshNavigation();return result};
const learningPreviousAcademicRender=academicRender;
academicRender=function(){
  learningCleanContext();
  if(learningPages.includes(state.page)){structureRender();return}
  const result=learningPreviousAcademicRender();
  if(learningScopedProfile()&&permissionCanVisit(state.page)){
    document.querySelectorAll('[data-nav-toggle]').forEach(e=>e.classList.remove('active-parent'));
    document.querySelector('[data-nav-toggle="learning"]').classList.add('active-parent');
    document.querySelectorAll('.menu-item').forEach(e=>e.classList.toggle('active',e.dataset.page===(learningStudentContext?.origin||'learningActive')));
    $('#crumb').textContent='教学 / '+(learningStudentContext?.origin==='learningHistory'?'历史学生':'在读学生')+' / '+(state.page==='studentCommunication'?'记录沟通':studentProfileState.tab);
  }
  return result;
};
