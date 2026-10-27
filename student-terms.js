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
      records.set(key,{...studentTermClassFields(cls,record),personKey:'student:'+student.id,studentId:student.id,studentIndex:index,name:student.name,phone:student.phone,grade:record.grade||enrollmentClassInfo(cls||{}).grade||student.grade||'',
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
  const view=studentTermView(),term=view.term;view.tab=tab;Object.assign(view,studentTermEmptyFilters(),{term});a.studentTermRequest=null;academicRender();
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
  const sections={'沟通':'沟通记录','沟通记录':'沟通记录','学习档案':'学习档案','购课记录':'购课信息'};
  const tab=sections[section],index=a.students.findIndex(s=>s.id===id);
  if(!tab||index<0||!permissionCanVisit('studentDetail'))return;
  a.selectedStudent=index;studentProfileState.tab=tab;studentProfileState.requestedSection=tab;studentProfileState.communicationType='全部';studentProfileState.editing=false;nav('studentDetail');
}
function studentTermOpenClass(id){const index=a.classes.findIndex(c=>c.id===id);if(index<0||!permissionCanVisit('classDetail'))return;classOpenDetail(index)}
function studentTermInspectTrial(id){const r=trialState.requests.find(r=>r.id===id);if(!r||!permissionCanVisit('students'))return;a.studentTermRequest=id;academicRender()}
function studentTermCloseTrial(){a.studentTermRequest=null;academicRender()}
function studentTermTrialModal(){
  const r=trialState.requests.find(r=>r.id===a.studentTermRequest);if(!r)return '';
  return `<div class="modal-backdrop"><section class="modal" style="max-height:85vh;overflow:auto" role="dialog" aria-modal="true" aria-labelledby="student-term-trial-title"><div class="modal-head"><h2 id="student-term-trial-title">试听预约信息</h2><button class="btn small" aria-label="关闭" onclick="studentTermCloseTrial()">×</button></div>${trialSummary(r)}<div class="modal-actions"><button class="btn" onclick="studentTermCloseTrial()">关闭</button></div></section></div>`;
}
function studentTermTable(rows,trial=false){
  const groups=new Map();for(const r of rows){if(!groups.has(r.personKey))groups.set(r.personKey,[]);groups.get(r.personKey).push(r)}
  const arg=value=>`decodeURIComponent('${encodeURIComponent(String(value)).replace(/'/g,'%27')}')`;
  return aTable(['学生ID','学生姓名','联系电话','班级 / 学期',...(trial?['预约课节 / 时间']:[]),'校区','授课老师','教务老师',trial?'试听状态':'本班状态','操作'],[...groups.values()].flatMap(group=>group.map((r,i)=>`<tr>${i?'':`<td rowspan="${group.length}">${esc(r.studentId||'待建档')}</td><td rowspan="${group.length}"><strong>${esc(r.name)}</strong>${r.grade?`<div class="help">${esc(r.grade)}</div>`:''}</td><td rowspan="${group.length}">${esc(r.phone||'—')}</td>`}<td>${r.classId&&a.classes.some(c=>c.id===r.classId)&&permissionCanVisit('classDetail')?`<a onclick="studentTermOpenClass(${arg(r.classId)})">${esc(r.className)}</a>`:esc(r.className)}<div class="help">${studentTermLabel(r.term)}</div></td>${trial?`<td>${esc(r.session||'待确认课节')}<div class="help">${esc(r.time||'待确认时间')}</div></td>`:''}<td>${esc(r.campus||'—')}</td><td>${esc(r.teacher||'—')}</td><td>${esc(r.academicTeacher||'—')}</td><td><span class="badge ${['已结课','已退费','已取消','已转班','已退班'].includes(r.status)?'off':''}">${esc(r.status)}</span></td><td><div class="actions">${r.studentIndex>=0?`<button class="btn small" onclick="studentTermOpenStudent(${arg(r.studentId)},'沟通')">沟通</button><button class="btn small" onclick="studentTermOpenStudent(${arg(r.studentId)},'学习档案')">学习档案</button><button class="btn small" onclick="studentTermOpenStudent(${arg(r.studentId)},'购课记录')">购课记录</button>`:''}${r.requestId!==undefined?`<button class="btn small" onclick="studentTermInspectTrial(${Number(r.requestId)})">预约详情</button>`:''}</div></td></tr>`)))+(!rows.length?'<div class="empty">暂无符合条件的学生，请调整筛选条件。</div>':'')+`<div class="data-bar">共 ${groups.size} 位学生 · ${rows.length} 条${trial?'试听':'班级'}记录</div>`;
}
function studentTermResults(){return studentTermTable(studentTermFiltered(studentTermRows()),studentTermView().tab==='试听学生')}
studentsPage=function(){
  const view=studentTermView(),rows=studentTermRows();
  return aHeading('学生管理','查看正价学生与试听学生，按学期、班级和教学信息筛选')+`<section class="card"><div class="tabs" role="tablist" aria-label="学生分类">${studentTermTabs.map(tab=>`<button class="tab ${view.tab===tab?'active':''}" role="tab" aria-selected="${view.tab===tab}" onclick="studentTermSetTab('${tab}')">${tab} <span class="count">${new Set(studentTermRows(tab).map(r=>r.personKey)).size}</span></button>`).join('')}</div><div class="pad"><div class="student-management-filters">${studentTermFiltersHTML(rows)}</div><div class="toolbar student-management-reset"><span class="help">老师可筛选授课老师或教务老师。</span><button class="btn small" onclick="studentTermResetFilters()">重置筛选</button></div><div id="student-term-results">${studentTermResults()}</div></div></section>${studentTermTrialModal()}`;
};
