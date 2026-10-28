const studentTermSeasons=['寒假','春季','暑期','秋季'];
const studentTermTabs=['正价学生','试听学生'];
const studentTermViews=new Map();
function studentTermSeason(value){return ({寒季:'寒假',寒期:'寒假',寒假:'寒假',春:'春季',春季:'春季',暑:'暑期',暑假:'暑期',暑期:'暑期',秋:'秋季',秋季:'秋季'})[value]||''}
function studentTermKey(year,season){return /^\d{4}$/.test(String(year))&&studentTermSeason(season)?`${year}-${studentTermSeason(season)}`:''}
function studentTermParts(key){const match=String(key||'').match(/^(\d{4})-(寒假|春季|暑期|秋季)$/);return match?{year:Number(match[1]),season:match[2]}:null}
function studentTermLabel(key){const term=studentTermParts(key);return term?`${term.year}年${term.season}`:'待补学期'}
function studentTermShift(key,delta){const term=studentTermParts(key);if(!term)return '';const n=term.year*4+studentTermSeasons.indexOf(term.season)+delta;return `${Math.floor(n/4)}-${studentTermSeasons[((n%4)+4)%4]}`}
function studentClassTerm(cls={},record={}){
  if(studentTermParts(record.academicTerm))return record.academicTerm;
  const course=a.courses.find(c=>c.name===(record.course||cls.course))||{};
  const season=record.term||cls.term||course.term;
  const explicitYear=record.year||cls.year||course.year;
  const date=cls.date||cls.sessions?.[0]?.date||cls.sessions?.[0]?.startsAt||'';
  return studentTermKey(explicitYear||String(date).match(/^\d{4}/)?.[0]||'',season);
}
function studentTermEnrollmentStatus(cls,record,now=Date.now()){
  const status=record.enrollmentStatus||record.status||'';
  if(['已退费','已退班','已转班','已取消','已结课','停课中'].includes(status))return status;
  const classStatus=classScheduleStatus(cls,now);
  if(['已结课','已取消','停课中'].includes(classStatus))return classStatus;
  if(['未开课','待开课'].includes(classStatus))return '待开课';
  if(['开课中','上课中','在读'].includes(classStatus)||['上课中','在读'].includes(status))return '上课中';
  return status||'待排课';
}
function studentTermClassFields(cls={},record={}){
  const course=a.courses.find(c=>c.name===(record.course||cls.course));
  const info=enrollmentClassInfo({...cls,course:record.course||cls.course});
  const format=record.format||record.teachingFormat||((cls.id||course)?info.format:'')||'';
  return {subject:record.subject||info.subject||'',format:format.replace(/课$/,''),teacher:cls.teacher||record.teacher||'',academicTeacher:classAcademicTeacherLabel(cls)||record.academicTeacher||''};
}
function studentTermEnrollments(now=Date.now()){
  return a.students.flatMap((student,index)=>{
    const records=new Map();
    const add=record=>{
      const cls=a.classes.find(c=>record.classId?c.id===record.classId:c.name===record.className);
      const term=studentClassTerm(cls,record),className=cls?.name||record.className||record.course||'班级待确认';
      const key=(record.classId||className)+'|'+term;
      records.set(key,{...studentTermClassFields(cls,record),startSession:record.startSession??records.get(key)?.startSession,course:record.course||cls?.course||'',classType:record.classType||enrollmentClassInfo(cls||{}).classType||'',room:cls?.room||record.room||'',personKey:'student:'+student.id,studentId:student.id,studentIndex:index,name:student.name,phone:student.phone,grade:record.grade||enrollmentClassInfo(cls||{}).grade||student.grade||'',
        term,classId:cls?.id||record.classId,className,campus:record.campus||cls?.campus||student.campus||'',status:studentTermEnrollmentStatus(cls,record,now),kind:'enrollment'});
    };
    // Orders support older records; the student's current enrollment record takes precedence.
    for(const order of a.orders.filter(o=>o.studentId===student.id&&!['已取消','已关闭','交易关闭'].includes(o.status)).slice().reverse())for(const item of order.items||[])add(item);
    for(const item of student.enrollments||[])add(item);
    if(student.status!=='试听'){
      const names=student.classNames||String(student.className||'').split('、');
      for(const cls of a.classes.filter(c=>student.classId?c.id===student.classId:names.includes(c.name))){
        if([...records.values()].some(r=>r.classId===cls.id))continue;
        add({classId:cls.id,enrollmentStatus:student.status==='历史'?'已结课':''});
      }
      for(const name of names.filter(name=>name&&name!=='—')){
        if(!a.classes.some(c=>c.name===name)&&![...records.values()].some(r=>r.className===name))add({className:name,enrollmentStatus:student.status==='历史'?'已结课':'待确认'});
      }
    }
    return [...records.values()];
  });
}
function studentTermTrials(now=Date.now()){
  const rows=trialState.requests.map(r=>{
    const cls=a.classes.find(c=>c.id===(r.classId||r.requestedClassId));
    const student=a.students.find(s=>(r.studentId&&s.id===r.studentId)||(r.leadId&&s.originLeadId===r.leadId));
    const timing=myTrialTiming(r);
    return {...studentTermClassFields(cls,r),personKey:student?'student:'+student.id:r.leadId?'lead:'+r.leadId:r.phone&&!r.phone.includes('*')?'contact:'+r.name+'|'+r.phone:'request:'+r.id,
      studentId:student?.id||r.studentId||'',studentIndex:student?a.students.indexOf(student):-1,name:student?.name||r.name,phone:student?.phone||r.phone,grade:enrollmentClassInfo(cls||{}).grade||r.grade||student?.grade||'',
      term:studentClassTerm(cls,r),classId:cls?.id||r.classId||r.requestedClassId,className:timing.className||cls?.name||r.course||'待确认班级',campus:cls?.campus||r.campus||'',
      status:r.status==='已取消'?'已取消':r.supersededBy?'已重新预约':r.status==='待排班'?'待排班':myTrialStatus(r,now),kind:'trial',requestId:r.id,session:timing.name,time:myTrialTimeText(timing)};
  });
  // Keep legacy trial students accessible even when their request snapshot is missing.
  for(const [index,student] of a.students.entries())if(student.status==='试听'&&!rows.some(r=>r.studentId===student.id)){
    const cls=a.classes.find(c=>student.classId?c.id===student.classId:c.name===student.className);
    rows.push({...studentTermClassFields(cls),personKey:'student:'+student.id,studentId:student.id,studentIndex:index,name:student.name,phone:student.phone,grade:enrollmentClassInfo(cls||{}).grade||student.grade||'',term:studentClassTerm(cls),classId:cls?.id,className:cls?.name||'待确认班级',campus:cls?.campus||student.campus||'',status:'待确认课节',kind:'trial',session:'待确认课节',time:'待确认时间'});
  }
  return rows;
}
function studentTermActor(){return String(state.currentUser?.id||permissionState.identity||'admin')}
function studentTermEmptyFilters(){return {term:'',classKey:'',grade:'',subject:'',campus:'',teacher:'',format:'',search:''}}
function studentTermView(){
  const actor=studentTermActor();
  if(!studentTermViews.has(actor))studentTermViews.set(actor,{tab:'正价学生',...studentTermEmptyFilters()});
  return studentTermViews.get(actor);
}
function studentTermSetTab(tab){
  if(!studentTermTabs.includes(tab))return;
  const view=studentTermView(),term=view.term;view.tab=tab;Object.assign(view,studentTermEmptyFilters(),{term});a.studentTermRequest=null;studentTermCourseSelection=null;academicRender();
}
studentTab=studentTermSetTab;
function studentTermRows(tab=studentTermView().tab){return tab==='试听学生'?studentTermTrials():studentTermEnrollments()}
function studentTermClassKey(row){return row.classId?'id:'+row.classId:'name:'+row.className}
function studentTermFiltered(rows){
  const v=studentTermView(),search=v.search.trim().toLowerCase();
  return rows.filter(r=>(!v.term||(v.term==='__unknown'?!r.term:r.term===v.term))&&(!v.classKey||studentTermClassKey(r)===v.classKey)&&
    (!v.grade||enrollmentGradeKey(r.grade)===v.grade)&&(!v.subject||r.subject===v.subject)&&(!v.campus||r.campus===v.campus)&&
    (!v.teacher||r.teacher===v.teacher||r.academicTeacher===v.teacher)&&(!v.format||r.format===v.format)&&
    (!search||[r.studentId,r.name,r.phone].some(x=>String(x||'').toLowerCase().includes(search))));
}
function studentTermSetFilter(key,value){if(!Object.hasOwn(studentTermEmptyFilters(),key))return;studentTermView()[key]=value;$('#student-term-results').innerHTML=studentTermResults()}
function studentTermResetFilters(){Object.assign(studentTermView(),studentTermEmptyFilters());academicRender()}
function studentTermFilterOptions(key,rows){
  const options=new Map();
  for(const row of rows){
    if(key==='term')options.set(row.term||'__unknown',studentTermLabel(row.term));
    else if(key==='classKey')options.set(studentTermClassKey(row),row.className);
    else if(key==='grade'&&row.grade)options.set(enrollmentGradeKey(row.grade),row.grade);
    else if(key==='teacher')for(const name of [row.teacher,row.academicTeacher]){if(name)options.set(name,name)}
    else if(row[key])options.set(row[key],key==='format'?row[key]+'课':row[key]);
  }
  const list=[...options];
  if(key==='term')list.sort(([a],[b])=>{const x=studentTermParts(a),y=studentTermParts(b);return !x?1:!y?-1:y.year-x.year||studentTermSeasons.indexOf(y.season)-studentTermSeasons.indexOf(x.season)});
  return list;
}
function studentTermFiltersHTML(rows){
  const view=studentTermView();
  return [['term','学期'],['classKey','班级'],['grade','年级'],['subject','科目'],['campus','校区'],['teacher','老师'],['format','授课形式']].map(([key,label])=>
    `<div class="field"><label for="student-filter-${key}">${label}</label><select class="select" id="student-filter-${key}" onchange="studentTermSetFilter('${key}',this.value)"><option value="">全部${label}</option>${studentTermFilterOptions(key,rows).map(([value,text])=>`<option value="${esc(value)}"${view[key]===value?' selected':''}>${esc(text)}</option>`).join('')}</select></div>`).join('')+
    `<div class="field"><label for="student-filter-search">学生信息</label><input class="input" id="student-filter-search" placeholder="搜索学生姓名、电话、学生ID" value="${esc(view.search)}" oninput="studentTermSetFilter('search',this.value)"></div>`;
}

function studentTermOpenStudent(id,section='沟通记录'){
  const sections={'沟通':'沟通记录','沟通记录':'沟通记录','学生档案':'在读课程','在读课程':'在读课程','基本信息':'基本信息','学习档案':'学习档案','购课记录':'购课信息'};
  const tab=sections[section],index=a.students.findIndex(s=>s.id===id);
  if(!tab||index<0||!permissionCanVisit('studentDetail'))return;
  studentProfileState.requestedCommunicationType=state.page==='students'&&tab==='沟通记录'?'教务沟通':null;
  a.selectedStudent=index;studentProfileState.tab=tab;studentProfileState.requestedSection=tab;studentProfileState.communicationType='全部';studentProfileState.editing=false;studentProfileState.basicExpanded=false;nav('studentDetail');
}
function studentTermOpenClass(id){const index=a.classes.findIndex(c=>c.id===id);if(index<0||!permissionCanVisit('classDetail'))return;classOpenDetail(index)}
function studentTermInspectTrial(id){const r=trialState.requests.find(r=>r.id===id);if(!r||!(permissionCanVisit('students')||state.page==='learningActive'&&permissionCanVisit('learningActive')&&learningOwnTrials().some(row=>row.requestId===id)))return;a.studentTermRequest=id;academicRender()}
function studentTermCloseTrial(){a.studentTermRequest=null;academicRender()}
function studentTermTrialModal(){
  const r=trialState.requests.find(r=>r.id===a.studentTermRequest);if(!r||state.page==='learningActive'&&!learningOwnTrials().some(row=>row.requestId===r.id))return '';
  return `<div class="modal-backdrop"><section class="modal" style="max-height:85vh;overflow:auto" role="dialog" aria-modal="true" aria-labelledby="student-term-trial-title"><div class="modal-head"><h2 id="student-term-trial-title">试听预约信息</h2><button class="btn small" aria-label="关闭" onclick="studentTermCloseTrial()">×</button></div>${trialSummary(r)}<div class="modal-actions"><button class="btn" onclick="studentTermCloseTrial()">关闭</button></div></section></div>`;
}
function studentTermTable(rows,trial=false){
  const groups=new Map();for(const r of rows){if(!groups.has(r.personKey))groups.set(r.personKey,[]);groups.get(r.personKey).push(r)}
  const arg=value=>`decodeURIComponent('${encodeURIComponent(String(value)).replace(/'/g,'%27')}')`;
  return aTable(['学生ID','学生姓名','联系电话','班级 / 学期',...(trial?['预约课节 / 时间']:[]),'校区','授课老师','教务老师',trial?'试听状态':'本班状态','操作'],[...groups.values()].flatMap(group=>group.map((r,i)=>`<tr>${i?'':`<td rowspan="${group.length}">${esc(r.studentId||'待建档')}</td><td rowspan="${group.length}"><strong>${esc(r.name)}</strong>${r.grade?`<div class="help">${esc(r.grade)}</div>`:''}</td><td rowspan="${group.length}">${esc(r.phone||'—')}</td>`}<td>${r.classId&&a.classes.some(c=>c.id===r.classId)&&permissionCanVisit('classDetail')?`<a onclick="studentTermOpenClass(${arg(r.classId)})">${esc(r.className)}</a>`:esc(r.className)}<div class="help">${studentTermLabel(r.term)}</div></td>${trial?`<td>${esc(r.session||'待确认课节')}<div class="help">${esc(r.time||'待确认时间')}</div></td>`:''}<td>${esc(r.campus||'—')}</td><td>${esc(r.teacher||'—')}</td><td>${esc(r.academicTeacher||'—')}</td><td><span class="badge ${['已结课','已退费','已取消','已转班','已退班'].includes(r.status)?'off':''}">${esc(r.status)}</span></td><td><div class="actions">${r.studentIndex>=0?`<button class="btn small" onclick="studentTermOpenStudent(${arg(r.studentId)},'沟通')">沟通</button><button class="btn small" onclick="studentTermOpenStudent(${arg(r.studentId)},'学习档案')">学习档案</button><button class="btn small" onclick="studentTermOpenStudent(${arg(r.studentId)},'购课记录')">购课记录</button>`:''}${r.requestId!==undefined?`<button class="btn small" onclick="studentTermInspectTrial(${Number(r.requestId)})">预约详情</button>`:''}</div></td></tr>`)))+(!rows.length?'<div class="empty">暂无符合条件的学生，请调整筛选条件。</div>':'')+`<div class="data-bar">共 ${groups.size} 位学生 · ${rows.length} 条${trial?'试听':'班级'}记录</div>`;
}
function studentTermArg(value){return `decodeURIComponent('${encodeURIComponent(String(value)).replace(/'/g,'%27')}')`}
function studentTermPeopleTable(rows){
  const people=new Map();for(const row of rows)if(!people.has(row.personKey))people.set(row.personKey,row);
  return aTable(['学生ID','学生姓名','联系电话','操作'],[...people.values()].map(r=>{
    const student=a.students.find(s=>s.id===r.studentId),disabled=student?'':'disabled title="此历史预约尚未关联学生档案"';
    return `<tr><td>${esc(r.studentId||'待建档')}</td><td><strong>${esc(student?.name||r.name)}</strong>${student?.grade?`<div class="help">${esc(student.grade)}</div>`:''}</td><td>${esc(student?.phone||r.phone||'—')}</td><td><div class="actions"><button class="btn small" ${disabled} onclick="studentTermOpenStudent(${studentTermArg(r.studentId)},'沟通')">沟通</button><button class="btn small" ${disabled} onclick="studentTermOpenStudent(${studentTermArg(r.studentId)},'学生档案')">学生档案</button></div></td></tr>`;
  }))+(!people.size?'<div class="empty">暂无符合条件的学生，请调整筛选条件。</div>':'')+`<div class="data-bar">共 ${people.size} 位学生</div>`;
}
let studentTermCourseSelection=null;
const studentTermPreviousRender=academicRender;
academicRender=function(){
  if(!['students','studentCourses'].includes(state.page)||studentTermCourseSelection?.actor!==studentTermActor())studentTermCourseSelection=null;
  return studentTermPreviousRender();
};
function studentTermOpenCourses(personKey){
  if(state.page!=='students'||!permissionCanVisit('students')||!studentTermFiltered(studentTermRows()).some(r=>r.personKey===personKey))return;
  studentTermCourseSelection={personKey,actor:studentTermActor()};
  const row=studentTermRows().find(r=>r.personKey===personKey);a.selectedStudent=row?.studentIndex??null;studentProfileState.editing=false;nav('studentCourses');
}
function studentTermCloseCourses(){studentTermCourseSelection=null;studentProfileState.editing=false;nav('students')}
function studentCoursesContext(){
  const selection=studentTermCourseSelection;
  if(!selection||state.page!=='studentCourses'||!permissionCanVisit('studentCourses')||selection.actor!==studentTermActor())return null;
  const all=[...studentTermEnrollments(),...studentTermTrials()].filter(r=>r.personKey===selection.personKey),person=all[0];
  if(!person)return null;
  const rows=studentCurrentCourseRows(all);
  return {person,rows,student:a.students.find(s=>s.id===person.studentId)};
}
function studentCurrentCourseRows(all){return all.filter(r=>r.kind==='enrollment'?!['已结课','已退费','已退班','已转班','已取消'].includes(r.status):!['已取消','已重新预约'].includes(r.status)&&!trialState.requests.find(t=>t.id===r.requestId)?.salesReturnedAt)}
function studentProfileCurrentCourses(student){
  if(!student||!studentProfileAllowed())return '';
  return studentCurrentCoursesTable(studentCurrentCourseRows([...studentTermEnrollments(),...studentTermTrials()].filter(row=>row.studentId===student.id)));
}
function studentCourseTrialSession(row){
  const request=trialState.requests.find(r=>r.id===row.requestId),cls=a.classes.find(c=>c.id===row.classId);if(!request||!cls)return null;
  const key=request.scheduledSessionId||request.requestedSessionId,at=myTrialTiming(request).start;
  return trialClassSessions(cls).find(s=>key?s.id===key:at&&Date.parse(s.startsAt)===Date.parse(at))||null;
}
function studentCourseEntry(row){
  if(row.kind==='trial'){const session=studentCourseTrialSession(row);return session?`第${session.number}讲`:/^第\d+讲/.test(row.session||'')?row.session.match(/^第\d+讲/)[0]:'待确认'}
  const start=Number(row.startSession);return Number.isInteger(start)&&start>0?`第${start}讲`:'未记录';
}
function studentCourseSchedule(row){
  const cls=a.classes.find(c=>c.id===row.classId);if(!cls)return '待排课';
  let sessions=trialClassSessions(cls).filter(s=>!s.cancelled&&Number.isFinite(Date.parse(s.startsAt)));
  if(row.kind==='trial'){const session=studentCourseTrialSession(row);sessions=session?[session]:[]}
  if(!sessions.length)return row.kind==='trial'?row.time||'待确认时间':'待排课';
  const groups=new Map();
  for(const session of sessions){const start=new Date(session.startsAt),end=new Date(trialSessionEndTime(session)),pad=n=>String(n).padStart(2,'0');
    const time=pad(start.getHours())+':'+pad(start.getMinutes())+(Number.isFinite(end.getTime())?'-'+pad(end.getHours())+':'+pad(end.getMinutes()):'（结束时间待确认）');
    const date=start.getFullYear()+'-'+pad(start.getMonth()+1)+'-'+pad(start.getDate());
    if(!groups.has(time))groups.set(time,[]);groups.get(time).push({date,weekday:'周'+'日一二三四五六'[start.getDay()]});
  }
  const holiday=['寒假','暑期'].includes(studentTermParts(row.term)?.season||studentTermSeason(enrollmentClassInfo(cls).term));
  return [...groups].map(([time,dates])=>{dates.sort((x,y)=>x.date.localeCompare(y.date));return holiday?`${dates[0].date} 至 ${dates.at(-1).date} ${time}`:[...new Set(dates.map(d=>d.weekday))].map(day=>day+' '+time).join('；')}).join('；');
}
function studentCourseRowKey(row){return JSON.stringify([row.kind,row.classId,row.className,row.term,row.requestId])}
function studentCourseAttendance(index){
  const row=studentCoursesContext()?.rows[index];if(!row)return;
  studentTermCourseSelection.attendanceKey=studentCourseRowKey(row);academicRender();
}
function studentCourseCloseAttendance(){if(studentTermCourseSelection)delete studentTermCourseSelection.attendanceKey;academicRender()}
function studentCourseAttendanceRows(row){
  const cls=a.classes.find(c=>c.id===row.classId);if(!cls)return [];
  const trial=studentCourseTrialSession(row),start=Number(row.startSession);
  const lessons=attendanceLessons(cls).filter(lesson=>row.kind==='trial'?trial&&(lesson.key===trial.id||Date.parse(lesson.startsAt||lesson.date+'T'+lesson.time.slice(0,5))===Date.parse(trial.startsAt)):!Number.isInteger(start)||start<1||lesson.number>=start);
  const source=row.kind==='trial'?a.attendance:businessAttendanceRecords();
  return lessons.map(lesson=>{
    const records=source.filter(record=>row.studentId&&(record.studentId||a.students[record.studentIndex]?.id)===row.studentId&&
      (record.classId||a.classes[record.classIndex]?.id)===cls.id&&
      (record.sessionId?String(record.sessionId)===lesson.key:record.date===lesson.date&&attendanceTimeKey(record.time)===lesson.time)&&
      (row.kind!=='trial'||record.trialRequestId===row.requestId));
    return {lesson,records};
  });
}
function studentCourseAttendanceModal(){
  const context=studentCoursesContext(),row=context?.rows.find(r=>studentCourseRowKey(r)===studentTermCourseSelection?.attendanceKey);if(!row)return '';
  const rows=studentCourseAttendanceRows(row);
  return `<div class="modal-backdrop"><section class="modal" style="width:1000px;max-width:94vw;max-height:85vh;overflow:auto" role="dialog" aria-modal="true" aria-labelledby="student-course-attendance-title"><div class="modal-head"><h2 id="student-course-attendance-title">学生考勤记录</h2><button class="btn small" aria-label="关闭考勤记录" onclick="studentCourseCloseAttendance()">×</button></div><p>${esc(context.person.name)} · ${esc(row.className)}${row.kind==='trial'?' [试听]':''}</p>${aTable(['讲次','课节名称','上课日期','上课时间','考勤状态','出勤情况'],rows.map(({lesson,records})=>`<tr><td>${esc(lesson.label)}</td><td>${esc(lesson.name||'—')}</td><td>${esc(lesson.date||'待排课')}</td><td>${esc(lesson.time||'待排课')}</td><td>${esc(records.length?[...new Set(records.map(r=>r.status||'未考勤'))].join('、'):'未考勤')}</td><td>${esc(records.length?[...new Set(records.map(r=>r.attendance||'未记录'))].join('、'):'—')}</td></tr>`))}${rows.length?'':'<div class="empty">暂无可展示的课节考勤记录</div>'}<div class="modal-actions"><button class="btn" onclick="studentCourseCloseAttendance()">关闭</button></div></section></div>`;
}
function studentCoursesPage(){
  const context=studentCoursesContext(),back='<a class="back-link" onclick="studentTermCloseCourses()">← 返回学生管理</a>';
  if(!context)return back+'<div class="empty">请从学生管理选择学生查看在读课程。</div>';
  const {student,person,rows}=context;
  const basic=student?studentProfileBasic(student,true):`<section class="card pad page-block"><h2 class="section-title">基本信息</h2><div class="academic-grid three"><div>学生姓名：${esc(person.name)}</div><div>联系电话：${esc(person.phone||'—')}</div><div>年级：${esc(person.grade||'—')}</div></div></section>`;
  return back+aHeading('在读课程',person.name+' · '+(person.studentId||'待建档'))+basic+`<section class="card pad"><h2 class="section-title">在读课程</h2>${studentCurrentCoursesTable(rows)}</section>`;
}
function studentCurrentCoursesTable(rows){
  return `<div style="overflow-x:auto" id="student-current-courses">${aTable(['课程 / 班级','学科','班型','上课形式','授课老师','教务老师','校区','教室','进班课节','上课时间'],rows.map(row=>{
    const cls=a.classes.find(c=>c.id===row.classId),info=cls?enrollmentClassInfo(cls):{},trial=studentCourseTrialSession(row);
    return `<tr><td><strong>${esc(cls?.course||row.course||row.className)}</strong><div class="help">${esc(row.className)}${row.kind==='trial'?' [试听]':''}</div></td><td>${esc(row.subject||info.subject||'—')}</td><td>${esc(row.classType||info.classType||'—')}</td><td>${esc(row.format||info.format||'—')}</td><td>${esc(trial?.teacher||row.teacher||'—')}</td><td>${esc(row.academicTeacher||'—')}</td><td>${esc(row.campus||'—')}</td><td>${esc(trial?.room||cls?.room||row.room||'—')}</td><td>${esc(studentCourseEntry(row))}</td><td>${esc(studentCourseSchedule(row))}</td></tr>`;
  }))}</div>${rows.length?'':'<div class="empty">暂无在读课程或试听安排</div>'}`;
}
function studentTermResults(){return studentTermPeopleTable(studentTermFiltered(studentTermRows()))}
studentsPage=function(){
  const view=studentTermView(),rows=studentTermRows();
  return aHeading('学生管理','查看正价学生与试听学生，按学期、班级和教学信息筛选')+`<section class="card"><div class="tabs" role="tablist" aria-label="学生分类">${studentTermTabs.map(tab=>`<button class="tab ${view.tab===tab?'active':''}" role="tab" aria-selected="${view.tab===tab}" onclick="studentTermSetTab('${tab}')">${tab} <span class="count">${new Set(studentTermRows(tab).map(r=>r.personKey)).size}</span></button>`).join('')}</div><div class="pad"><div class="student-management-filters">${studentTermFiltersHTML(rows)}</div><div class="toolbar student-management-reset"><span class="help">老师可筛选授课老师或教务老师。</span><button class="btn small" onclick="studentTermResetFilters()">重置筛选</button></div><div id="student-term-results">${studentTermResults()}</div></div></section>${studentTermTrialModal()}`;
};
