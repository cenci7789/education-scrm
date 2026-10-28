// 教学入口复用正价学生组件；账号授课范围在列表、详情和沟通保存时统一核验。
const learningPages=['learningClasses','learningActive','learningData'];
const learningRoutes=[...learningPages,'learningClassDetail','learningStudentCourses'];
const learningViews=new Map(),learningCalendarViews=new Map(),learningDemoTeachers=new Map();
let learningStudentContext=null;
const learningTeacherRole=permissionRole('teacher');
if(learningTeacherRole)learningTeacherRole.grants=[...new Set([...learningTeacherRole.grants,...learningPages])];
learningUpgradePermissions();
function learningIsTeachingRole(role){return Boolean(role&&(role.id==='teacher'||/授课|教师|主讲/.test(role.name||'')))}
function learningCanUseModule(){
  if(state.currentUser?.active===false)return false;
  if(permissionState.identity==='admin')return true;
  return learningIsTeachingRole(permissionRole(state.currentUser?.roleId||permissionState.identity))&&Boolean(permissionRole()?.active);
}
function learningUpgradePermissions(){
  for(const role of permissionState.roles){
    const teaching=learningIsTeachingRole(role),hadStudents=role.grants.includes('learningActive');
    role.grants=role.grants.filter(page=>page!=='learningHistory');
    if(!teaching){role.grants=role.grants.filter(page=>!learningPages.includes(page));continue}
    if(!role.teachingMenuVersion){
      if(hadStudents&&!role.grants.includes('learningClasses'))role.grants.push('learningClasses');
      role.teachingMenuVersion=1;
    }
  }
}
const learningClassViews=new Map();
function learningClassView(){const key=learningActorKey();if(!learningClassViews.has(key))learningClassViews.set(key,{search:'',campus:'',status:''});return learningClassViews.get(key)}
function learningOwnClasses(){return a.classes.filter(learningMatchesTeacher).map(cls=>({...cls,status:classScheduleStatus(cls)}))}
function learningClassStudentCount(cls){return classDetailStudentRows(cls).filter(s=>s.kind==='在班学生'&&!['试听','已取消'].includes(s.classStatus)).length}
function learningClassDetailAllowed(){return learningHasPage('learningClasses')&&Boolean(classDetailCurrent()&&learningMatchesTeacher(classDetailCurrent()))}
function learningOpenClass(id){
  if(state.page!=='learningClasses'||!permissionCanVisit('learningClasses'))return;
  const cls=a.classes.find(c=>c.id===id);if(!cls||!learningMatchesTeacher(cls))return;
  a.classDetailId=cls.id;a.selectedClass=a.classes.indexOf(cls);a.classDetailTab='课节';a.classStudentTab='在班学生';a.classStudentSearch='';a.classDetailAttendance=null;a.modal=null;
  nav('learningClassDetail');
}
function learningClassDetailPage(){
  if(!learningClassDetailAllowed())return '<div class="empty">当前班级不在您的授课范围内。</div>';
  return classDetailPage({returnPage:'learningClasses',returnLabel:'返回班级',readOnly:true});
}
function learningClassOpenStudent(index){
  const student=a.students[index],cls=classDetailCurrent();
  if(state.page!=='learningClassDetail'||!learningClassDetailAllowed()||!student||!learningOwnStudent(student.id)||!classDetailStudentRows(cls).some(s=>s.id===student.id))return;
  learningStudentContext={actor:learningActorKey(),origin:'learningClassDetail'};
  a.selectedStudent=index;studentTermOpenStudent(student.id,'学生档案');
}
function learningSetClassFilter(key,value){
  if(state.page!=='learningClasses'||!permissionCanVisit('learningClasses')||!['search','campus','status'].includes(key))return;
  learningClassView()[key]=value;$('#learning-class-results').innerHTML=learningClassResults();
}
function learningResetClassFilters(){if(!permissionCanVisit('learningClasses'))return;Object.assign(learningClassView(),{search:'',campus:'',status:''});academicRender()}
function learningClassResults(){
  if(!permissionCanVisit('learningClasses'))return '';
  const v=learningClassView(),query=v.search.trim().toLocaleLowerCase(),rows=learningOwnClasses().filter(c=>(!v.campus||c.campus===v.campus)&&(!v.status||c.status===v.status)&&(!query||[c.id,c.name,c.course].join(' ').toLocaleLowerCase().includes(query)));
  return aTable(['班级ID','班级名称','授课形式','课程名称','授课老师','上课时间','在班人数','状态','操作'],rows.map(c=>{
    const info=enrollmentClassInfo(c),id=esc(JSON.stringify(c.id)),count=learningClassStudentCount(c);
    return `<tr><td>${esc(c.id)}</td><td><a onclick="learningOpenClass(${id})">${esc(c.name)}</a></td><td>${esc(String(info.format||'—').replace(/课$/,''))}</td><td>${esc(c.course||'—')}</td><td>${esc(c.teacher||'—')}</td><td>${esc(c.date||classDetailSessions(c)[0]?.date||'—')} ${esc(c.time||classDetailSessions(c)[0]?.time||'')}</td><td>${count}/${esc(c.capacity??'—')}</td><td><span class="badge ${c.status==='开课中'?'':'off'}">${esc(c.status||'—')}</span></td><td><a onclick="learningOpenClass(${id})">详情</a></td></tr>`;
  }))+(!rows.length?'<div class="empty">暂无符合条件的授课班级</div>':'')+`<div class="data-bar">共 ${rows.length} 条班级 · 在班合计 ${rows.reduce((sum,c)=>sum+learningClassStudentCount(c),0)} 人次</div>`;
}
function learningClassesPage(){
  const view=learningClassView(),classes=learningOwnClasses();
  return aHeading('班级','查看本人负责授课的班级')+`<section class="card pad">${learningTeacherControl()}<div class="toolbar"><div class="toolbar-left learning-class-filters"><input class="input" aria-label="搜索班级" placeholder="搜索班级名称、课程或班级ID" value="${esc(view.search)}" oninput="learningSetClassFilter('search',this.value)">${[['campus','校区'],['status','状态']].map(([key,label])=>`<select class="select" aria-label="班级${label}" onchange="learningSetClassFilter('${key}',this.value)"><option value="">全部${label}</option>${[...new Set(classes.map(c=>c[key]).filter(Boolean))].map(value=>`<option value="${esc(value)}" ${view[key]===value?'selected':''}>${esc(value)}</option>`).join('')}</select>`).join('')}<button class="btn small" onclick="learningResetClassFilters()">重置筛选</button></div></div><div id="learning-class-results">${learningClassResults()}</div></section>`;
}
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
function learningHasPage(page){return learningCanUseModule()&&(permissionState.identity==='admin'||Boolean(permissionRole()?.active&&permissionRole().grants.includes(page)))}
function learningOwnStudent(id){return learningOwnRows().some(r=>r.studentId===id&&!learningHistorical(r)&&learningHasPage('learningActive'))||learningHasPage('learningActive')&&learningOwnTrials().some(r=>r.studentId===id)}
function learningStudentCoursesAllowed(){return learningStudentContext?.actor===learningActorKey()&&learningHasPage('learningActive')&&learningOwnStudent(learningStudentContext.studentId)}
function learningStudentCoursesPage(){
  if(!learningStudentCoursesAllowed())return '<div class="empty">当前学生不在您的授课范围内。</div>';
  const student=a.students.find(s=>s.id===learningStudentContext.studentId);
  const rows=studentCurrentCourseRows([...learningOwnRows(),...learningOwnTrials()].filter(row=>row.studentId===student.id));
  return '<a class="back-link" onclick="learningBack()">← 返回学生</a>'+aHeading('在读课程',student.name+' · '+student.id)+studentProfileBasic(student,true)+`<section class="card pad"><h2 class="section-title">在读课程</h2>${studentCurrentCoursesTable(rows)}</section>`;
}
function learningScopedProfile(){
  const context=learningStudentContext?.actor===learningActorKey();
  const general=permissionState.identity==='admin'||permissionRole()?.grants.includes('students');
  return ['studentDetail','studentCommunication'].includes(state.page)&&(context||!general&&learningHasPage('learningActive'));
}
const learningPreviousPermission=permissionCanVisit;
permissionCanVisit=function(page){
  if(page==='learningHistory')return false;
  if(page==='learningClassDetail')return learningClassDetailAllowed();
  if(page==='learningStudentCourses')return Boolean(learningStudentCoursesAllowed());
  if(learningPages.includes(page))return learningHasPage(page);
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
  if(state.currentUser||!learningRoutes.includes(state.page)||!permissionCanVisit(state.page)||!learningTeacherOptions().some(t=>t.key===key))return;
  leadDisposeRecord();learningStudentContext=null;a.selectedStudent=null;learningDemoTeachers.set(permissionState.identity,key);academicRender();
}
function learningView(){const key=learningActorKey()+'|'+state.page;if(!learningViews.has(key))learningViews.set(key,{tab:'正价学生',...studentTermEmptyFilters()});return learningViews.get(key)}
const learningPreviousStudentView=studentTermView,learningPreviousStudentRows=studentTermRows,learningPreviousResults=studentTermResults,learningPreviousReset=studentTermResetFilters;
studentTermView=function(){return (state.page==='learningActive')?learningView():learningPreviousStudentView()};
studentTermRows=function(tab=studentTermView().tab){return state.page==='learningActive'&&tab==='试听学生'?learningOwnTrials():(state.page==='learningActive')?learningOwnRows().filter(r=>!learningHistorical(r)):learningPreviousStudentRows(tab)};
studentTermResults=function(){return (state.page==='learningActive')?studentTermTable(studentTermFiltered(studentTermRows()),state.page==='learningActive'&&studentTermView().tab==='试听学生').replaceAll('studentTermOpenStudent(', 'learningOpenStudent('):learningPreviousResults()};
studentTermResetFilters=function(){if((state.page==='learningActive')){Object.assign(learningView(),studentTermEmptyFilters());academicRender();return}return learningPreviousReset()};
learningStudentsPage=function(){
  const rows=studentTermRows();
  const filters=teachingPreviousStudentFields(rows);
  return aHeading('学生','查看本人班级的正价学生与已排班的试听学生')+`<section class="card pad">${learningTeacherControl()}<div class="tabs" role="tablist" aria-label="学生分类">${studentTermTabs.map(tab=>`<button class="tab ${learningView().tab===tab?'active':''}" role="tab" aria-selected="${learningView().tab===tab}" onclick="studentTermSetTab('${tab}')">${tab} <span class="count">${new Set(studentTermRows(tab).map(r=>r.personKey)).size}</span></button>`).join('')}</div><div class="student-management-filters">${filters}</div><div class="toolbar student-management-reset"><p class="help">按本人班级的就读状态分类，同一学生可有多条班级记录。</p><button class="btn small" onclick="studentTermResetFilters()">重置筛选</button></div><div id="student-term-results">${studentTermResults()}</div></section>${studentTermTrialModal()}`;
};
function learningOpenStudent(id,section){
  if(!(state.page==='learningActive')||!permissionCanVisit(state.page)||!studentTermRows().some(r=>r.studentId===id))return;
  learningStudentContext={actor:learningActorKey(),origin:state.page,studentId:id};
  if(section==='课程'){nav('learningStudentCourses');return}
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
  const html=learningPreviousDetail().replace('onclick="studentProfileState.editing=false;nav(\'students\')"','onclick="learningBack()"').replace('← 返回学生管理',learningStudentContext?.origin==='learningClassDetail'?'← 返回班级详情':'← 返回学生').replace('aria-label="教务沟通操作"','aria-label="教师沟通操作"');
  $('#crumb').textContent='教学 / '+'学生'+' / '+studentProfileState.tab;
  return html;
};
studentCommunicationPage=function(){return learningScopedProfile()?learningPreviousCommunicationPage().replaceAll('教务沟通','教师沟通'):learningPreviousCommunicationPage()};
studentProfileOperator=function(){if(!learningScopedProfile())return learningPreviousOperator();const t=learningTeacher();return t?{name:t.name,account:t.account||t.id||t.key||'',role:'授课教师'}:null};
studentProfileOperatorSelect=function(){if(!learningScopedProfile())return learningPreviousOperatorSelect();const t=learningTeacher();return `<p>记录人：${esc(t?.name||'未关联老师')} · 授课教师</p>`};
const learningPreviousExamOperator=studentExamOperator;
studentExamOperator=function(){return learningScopedProfile()?studentProfileOperator():learningPreviousExamOperator()};
function learningCalendarView(){const key=learningActorKey();if(!learningCalendarViews.has(key))learningCalendarViews.set(key,{date:scheduleDateText(new Date())});return learningCalendarViews.get(key)}
function learningSetDate(value){if(permissionCanVisit('learningData')&&scheduleDate(value)){const days=scheduleWeekDates(value);Object.assign(learningCalendarView(),{date:value,range:{start:days[0],end:days[6]}});academicRender()}}
function learningMoveWeek(delta){if([-1,1].includes(delta))learningSetDate(scheduleShiftDate(learningCalendarView().date,delta*7))}
function learningCalendarRange(){const view=learningCalendarView();if(!view.range){const days=scheduleWeekDates(view.date);view.range={start:days[0],end:days[6]}}return view.range}
function learningCalendarDays(){const range=learningCalendarRange(),days=[];for(let date=range.start;date<=range.end;date=scheduleShiftDate(date,1))days.push(date);return days}
function learningSetRange(key,value){
  if(!permissionCanVisit('learningData'))return;
  if(!['start','end'].includes(key)||!scheduleDate(value)){academicRender();return}
  const range={...learningCalendarRange(),[key]:value};
  if(range.start>range.end){toast('开始日期不能晚于结束日期');academicRender();return}
  if(range.end>scheduleShiftDate(range.start,6)){toast('日期范围最多选择7天（含起止日期）');academicRender();return}
  Object.assign(learningCalendarView(),{date:range.start,range});academicRender();
}
function learningQuickWeek(offset){if([-1,0,1].includes(offset))learningSetDate(scheduleShiftDate(scheduleDateText(new Date()),offset*7))}
function learningDateControls(){
  const range=learningCalendarRange();
  return `<div class="schedule-teacher-range"><span>日期</span><input class="input" type="date" aria-label="教学课表开始日期" title="最多选择7天（含起止日期）" value="${range.start}" min="${scheduleShiftDate(range.end,-6)}" max="${range.end}" onchange="learningSetRange('start',this.value)"><span>至</span><input class="input" type="date" aria-label="教学课表结束日期" title="最多选择7天（含起止日期）" value="${range.end}" min="${range.start}" max="${scheduleShiftDate(range.start,6)}" onchange="learningSetRange('end',this.value)">${[[-1,'上周'],[0,'本周'],[1,'下周']].map(([offset,text])=>`<button class="btn small" onclick="learningQuickWeek(${offset})">${text}</button>`).join('')}</div>`;
}
function learningWeekLessons(){
  const days=learningCalendarDays(),start=scheduleDate(days[0]).getTime(),end=scheduleDate(scheduleShiftDate(days.at(-1),1)).getTime();
  const own=scheduleLessons().filter(e=>learningMatchesTeacher(e));
  return own.filter(e=>e.start<end&&e.end>start).map(e=>({...e,conflict:scheduleHasConflict(e,own)}));
}
function learningWeekCalendar(){
  const days=learningCalendarDays(),events=learningWeekLessons(),segments=days.flatMap(date=>scheduleDaySegments(events,date));
  const from=Math.min(7*60,...segments.map(e=>Math.floor(e.from/60)*60)),to=Math.max(22*60,...segments.map(e=>Math.ceil(e.to/60)*60)),height=to-from,today=scheduleDateText(new Date());
  return `<div class="schedule-scroll learning-week-scroll" onscroll="scheduleHideEvent()"><div class="schedule-time-grid learning-week-grid" style="grid-template-columns:72px repeat(${days.length},minmax(140px,1fr));min-width:${72+days.length*140}px"><div class="schedule-axis-heading">时间</div>${days.map((date,i)=>`<div class="schedule-room-heading ${date===today?'learning-today':''}">周${'日一二三四五六'[scheduleDate(date).getDay()]}<small>${date.slice(5)}</small></div>`).join('')}<div class="schedule-time-axis" style="height:${height}px">${Array.from({length:(to-from)/60+1},(_,i)=>`<span style="top:${i*60}px">${String(from/60+i).padStart(2,'0')}:00</span>`).join('')}</div>${days.map(date=>`<div class="schedule-room-track" style="height:${height}px" aria-label="${date}课程">${scheduleLanes(scheduleDaySegments(events,date)).map(event=>scheduleEventButton(event,`top:${event.from-from}px;height:${Math.max(22,event.to-event.from)}px;left:calc(${event.lane/event.lanes*100}% + 3px);width:calc(${100/event.lanes}% - 6px)`)).join('')}</div>`).join('')}</div></div><p class="help">当前范围 ${events.length} 个课节。${events.length?'悬停或聚焦课程卡片查看课程、校区和教室等完整信息。':'暂无排课，可切换日期查看。'}</p>`;
}
learningDataPage=function(){
  return aHeading('课表','按日期范围查看我的授课安排')+`<section class="card pad">${learningTeacherControl()}<div class="schedule-date-bar">${learningDateControls()}<div class="schedule-legend"><span>● 已排课</span><span class="conflict">● 时间冲突</span></div></div>${learningWeekCalendar()}</section><aside id="schedule-event-tooltip" class="schedule-tooltip" role="tooltip" hidden></aside>`;
};
const learningPreviousVisibleLessons=scheduleVisibleLessons;
scheduleVisibleLessons=function(){return state.page==='learningData'?learningWeekLessons():learningPreviousVisibleLessons()};
function learningCleanContext(){
  if(learningStudentContext&&(learningStudentContext.actor!==learningActorKey()||!['studentDetail','studentCommunication',...learningRoutes].includes(state.page)))learningStudentContext=null;
}
const learningPreviousStructureRender=structureRender;
structureRender=function(){learningCleanContext();if(!permissionCanVisit(state.page)){permissionDenied(state.page);return}if(learningRoutes.includes(state.page)){leadDisposeRecord();if(typeof refundResetEditor==='function')refundResetEditor();studentProfileState.archiveDraft?.files?.forEach(f=>URL.revokeObjectURL(f.url));studentProfileState.archiveDraft=null;studentProfileState.editing=false;a.supplementDraft=null;a.modal=null}const result=learningPreviousStructureRender();permissionRefreshNavigation();return result};
const learningPreviousAcademicRender=academicRender;
academicRender=function(){
  learningCleanContext();
  if(learningRoutes.includes(state.page)){structureRender();return}
  const result=learningPreviousAcademicRender();
  if(learningScopedProfile()&&permissionCanVisit(state.page)){
    document.querySelectorAll('[data-nav-toggle]').forEach(e=>e.classList.remove('active-parent'));
    document.querySelector('[data-nav-toggle="learning"]').classList.add('active-parent');
    document.querySelectorAll('.menu-item').forEach(e=>e.classList.toggle('active',e.dataset.page===(learningStudentContext?.origin==='learningClassDetail'?'learningClasses':learningStudentContext?.origin||'learningActive')));
    $('#crumb').textContent='教学 / '+'学生'+' / '+(state.page==='studentCommunication'?'记录沟通':studentProfileState.tab);
  }
  return result;
};
