// 考勤筛选独立于班级列表，默认校区按账号保存。
const attendanceFilterViews=new Map();
function attendanceEmptyFilters(){return {campus:'',subject:'',grade:'',teacher:'',format:'',date:'',time:'',search:''}}
function attendanceDefaultKey(){return 'crm.attendance.default-campus.v1.'+encodeURIComponent(studentTermActor())}
function attendanceDefaultRead(){
  try{const value=JSON.parse(globalThis.localStorage?.getItem(attendanceDefaultKey())||'null');return value?.version===1&&typeof value.campus==='string'?value.campus:null}catch{return null}
}
function attendanceFilters(){
  const actor=studentTermActor();
  if(!attendanceFilterViews.has(actor))attendanceFilterViews.set(actor,{...attendanceEmptyFilters(),campus:attendanceDefaultRead()??''});
  return attendanceFilterViews.get(actor);
}
function attendanceTimeKey(value){return String(value||'').replace(/[–—~～]/g,'-').replace(/\s/g,'')}
const attendanceLessonSelections=new Map();
function attendanceSelectionKey(cls){return studentTermActor()+'|'+cls.id}
function attendanceLessons(cls){
  return classDetailSessions(cls).map((session,position)=>({...session,position,key:String(session.id||`${session.date}|${session.time}|${position}`),label:!Array.isArray(cls.sessions)&&/^第\d+讲$/.test(session.name)?session.name:`第${session.number}讲`,time:attendanceTimeKey(session.time)}));
}
function attendanceLessonRecords(cls,lesson){
  return a.attendance.filter(record=>(record.classId?record.classId===cls.id:a.classes[record.classIndex]?.id===cls.id)&&
    (record.sessionId?String(record.sessionId)===lesson.key:record.date===lesson.date&&attendanceTimeKey(record.time)===lesson.time));
}
function attendanceLessonEnd(lesson){
  const end=lesson.time.match(/-(\d{2}:\d{2})$/)?.[1];
  return lesson.date&&end?new Date(lesson.date+'T'+end+':00').getTime():NaN;
}
function attendanceDefaultLesson(lessons,now=Date.now()){
  const ended=lessons.filter(s=>Number.isFinite(attendanceLessonEnd(s))&&attendanceLessonEnd(s)<=now);
  if(ended.length)return ended.reduce((latest,s)=>attendanceLessonEnd(s)>attendanceLessonEnd(latest)?s:latest);
  // 尚无已结束课节时选择最早待上课节；全部未排时间时选择第一节。
  return lessons.filter(s=>Number.isFinite(attendanceLessonEnd(s))).sort((x,y)=>attendanceLessonEnd(x)-attendanceLessonEnd(y))[0]||lessons[0]||null;
}
function attendanceLessonStudents(cls,lesson){
  const records=attendanceLessonRecords(cls,lesson),students=new Map();
  for(const student of classDetailStudentRows(cls).filter(s=>s.kind==='在班学生'))students.set(student.id,student);
  for(const record of records){const student=record.studentId?a.students.find(s=>s.id===record.studentId):a.students[record.studentIndex];if(student)students.set(student.id,student)}
  return [...students.values()].map(student=>({student,record:records.find(r=>r.studentId?r.studentId===student.id:a.students[r.studentIndex]?.id===student.id)}));
}
function attendanceLessonStatus(cls,lesson){
  const entries=attendanceLessonStudents(cls,lesson),done=entries.filter(e=>e.record?.status==='已考勤').length;
  return entries.length&&done===entries.length?'已考勤':done?'部分考勤':'未考勤';
}
function attendanceRows(){
  const classes=classManagementRows();
  const f=attendanceFilters();
  return classes.flatMap(cls=>{
    const course=a.courses.find(c=>c.name===cls.course)||{};
    if(courseCategory(course)!=='班课')return [];
    const lessons=attendanceLessons(cls),eligible=lessons.filter(s=>(!f.date||s.date===f.date)&&(!f.time||s.time===f.time));
    if((f.date||f.time)&&!eligible.length)return [];
    const selected=attendanceLessonSelections.get(attendanceSelectionKey(cls));
    const lesson=eligible.find(s=>s.key===selected)||attendanceDefaultLesson(eligible);
    return [{...cls,classIndex:cls.index,lessons:eligible,lesson,date:lesson?.date||'',time:lesson?.time||'',attendanceStatus:lesson?attendanceLessonStatus(cls,lesson):'未排课'}];
  });
}
function attendanceFiltered(){
  const f=attendanceFilters(),search=f.search.trim().toLowerCase();
  return attendanceRows().filter(row=>['campus','subject','format','date','time'].every(key=>!f[key]||row[key]===f[key])&&
    (!f.grade||enrollmentGradeKey(row.grade)===f.grade)&&(!f.teacher||row.teacher===f.teacher||row.academicTeacher===f.teacher)&&
    (!search||String(row.name||'').toLowerCase().includes(search)));
}
function attendanceOptions(key){
  const options=new Map();
  if(key==='time')return [...new Set(a.classes.flatMap(cls=>attendanceLessons(cls).map(s=>s.time)).filter(Boolean))].sort().map(value=>[value,value]);
  for(const row of classManagementRows()){
    if(key==='teacher'){for(const name of [row.teacher,row.academicTeacher])if(name)options.set(name,name)}
    else if(key==='grade'){if(row.grade)options.set(enrollmentGradeKey(row.grade),row.grade)}
    else if(row[key])options.set(row[key],key==='format'?row[key]+'课':row[key]);
  }
  if(key==='campus')for(const value of [attendanceFilters().campus,attendanceDefaultRead()])if(value)options.set(value,value);
  return [...options];
}
function attendanceDefaultControls(){
  const saved=attendanceDefaultRead(),same=saved!==null&&saved===attendanceFilters().campus;
  return `<button type="button" class="btn small term-default-button" ${same?'disabled':''} onclick="attendanceDefaultSave()">${same?'已设为默认':'设为默认'}</button>${saved!==null?`<span class="help term-default-note">默认：${esc(saved||'全部校区')}</span>`:''}`;
}
function attendanceDefaultSave(){
  if(!permissionCanVisit('attendance'))return;
  try{if(!globalThis.localStorage)throw Error('storage unavailable');globalThis.localStorage.setItem(attendanceDefaultKey(),JSON.stringify({version:1,campus:attendanceFilters().campus}))}
  catch{toast('浏览器未能保存默认校区，请检查本地存储设置后重试');return}
  $('#attendance-default-campus').innerHTML=attendanceDefaultControls();toast('默认校区已保存，下次打开考勤时自动应用');
}
function attendanceFilterFields(){
  const f=attendanceFilters();
  return [['campus','校区'],['subject','科目'],['grade','年级'],['teacher','老师'],['format','授课形式'],['date','开课日期'],['time','上课时间'],['search','班级名称']].map(([key,label])=>{
    const heading=key==='campus'?`<div class="term-default-heading"><label for="attendance-filter-campus">校区</label><span class="term-default-controls" id="attendance-default-campus">${attendanceDefaultControls()}</span></div>`:`<label for="attendance-filter-${key}">${label}</label>`;
    const field=['date','search'].includes(key)?`<input class="input" id="attendance-filter-${key}" type="${key==='date'?'date':'search'}" value="${esc(f[key])}" ${key==='search'?'placeholder="搜索班级名称"':''} ${key==='search'?'oninput':'onchange'}="attendanceSetFilter('${key}',this.value)">`:
      `<select class="select" id="attendance-filter-${key}" onchange="attendanceSetFilter('${key}',this.value)"><option value="">全部${label}</option>${attendanceOptions(key).map(([value,text])=>`<option value="${esc(value)}"${f[key]===value?' selected':''}>${esc(text)}</option>`).join('')}</select>`;
    return `<div class="field">${heading}${field}</div>`;
  }).join('');
}
function attendanceResults(){
  const rows=attendanceFiltered();
  return aTable(['班级名称','考勤课节','科目','学期','年级','授课老师','开课日期','上课时间','学生人数','考勤状态','操作'],rows.map(row=>`<tr><td>${esc(row.name)}</td><td>${row.lesson?`<select class="select" style="min-width:210px" aria-label="${esc(row.name)}考勤课节" onchange="attendanceSelectLesson(${row.classIndex},this.value)">${row.lessons.map(s=>`<option value="${esc(s.key)}"${row.lesson.key===s.key?' selected':''}>${esc(s.label)} · ${esc(s.date||'待排课')} ${esc(s.time)}</option>`).join('')}</select>`:'暂无课节'}</td><td>${esc(row.subject||'—')}</td><td>${esc(classManagementTermLabel(row.term))}</td><td>${esc(row.grade||'—')}</td><td>${esc(row.lesson?.teacher||row.teacher||'—')}</td><td>${esc(row.date||'—')}</td><td>${esc(row.time||'—')}</td><td>${esc(String(row.students??0))}</td><td>${esc(row.attendanceStatus)}</td><td>${row.lesson?`<a onclick="attendanceOpenLesson(${row.classIndex},${row.lesson.position})">${row.attendanceStatus==='已考勤'?'查看考勤':'考勤'}</a>`:'—'}</td></tr>`))+
    (!rows.length?'<div class="empty">暂无符合条件的考勤记录，请调整筛选条件。</div>':'')+`<div class="data-bar">共 ${rows.length} 个班级</div>`;
}
function attendanceSelectLesson(classIndex,key){
  const cls=a.classes[classIndex];if(!cls||!attendanceLessons(cls).some(s=>s.key===key))return;
  attendanceLessonSelections.set(attendanceSelectionKey(cls),key);$('#attendance-results').innerHTML=attendanceResults();
}
function attendanceOpenLesson(classIndex,position){
  if(!permissionCanVisit('attendance'))return;
  const cls=a.classes[classIndex],lesson=cls&&attendanceLessons(cls)[position];if(!lesson)return;
  attendanceLessonSelections.set(attendanceSelectionKey(cls),lesson.key);
  a.attendanceLessonDraft={classId:cls.id,key:lesson.key,actor:studentTermActor()};a.modal='attendanceLesson';academicRender();
}
function attendanceLessonContext(){
  const draft=a.attendanceLessonDraft;if(!draft||draft.actor!==studentTermActor()||!permissionCanVisit('attendance'))return null;
  const cls=a.classes.find(c=>c.id===draft.classId),lesson=cls&&attendanceLessons(cls).find(s=>s.key===draft.key);
  return lesson?{cls,lesson,entries:attendanceLessonStudents(cls,lesson)}:null;
}
const attendancePreviousModal=modalPage;
function attendanceLessonChoiceHTML(record,index){
  if(record?.makeupResolution)return `<span>${esc(record.attendance)}</span><div class="help">${record.makeupResolution.type==='consume'?'已销课':'已返还课时余额'}</div>`;
  return `<select class="select" id="attendance-lesson-student-${index}"><option value="">请选择出勤情况</option>${['出勤','迟到','早退','请假','旷课','未出勤销课'].map(value=>`<option${record?.attendance===value?' selected':''}>${value}</option>`).join('')}</select>`;
}
modalPage=function(){
  if(a.modal!=='attendanceLesson')return attendancePreviousModal();
  const context=attendanceLessonContext(),close='<button class="btn" onclick="a.modal=null;a.attendanceLessonDraft=null;academicRender()">关闭</button>';
  if(!context)return `<div class="modal-backdrop"><div class="modal"><p>课节已变更，请重新选择。</p>${close}</div></div>`;
  const {cls,lesson,entries}=context;
  return `<div class="modal-backdrop"><section class="modal" style="max-height:85vh;overflow:auto" role="dialog" aria-modal="true" aria-labelledby="attendance-lesson-title"><div class="modal-head"><h2 id="attendance-lesson-title">${esc(lesson.label)}考勤</h2>${close}</div><p>${esc(cls.name)} · ${esc(lesson.date||'待排课')} ${esc(lesson.time)}</p>${aTable(['学生ID','学生姓名','考勤状态','出勤情况'],entries.map(({student,record},index)=>`<tr><td>${esc(student.id)}</td><td>${esc(student.name)}</td><td>${esc(record?.status||'未考勤')}</td><td>${attendanceLessonChoiceHTML(record,index)}</td></tr>`))}${entries.length?'':'<div class="empty">该课节暂无可考勤学生</div>'}<div class="modal-actions">${close}${entries.some(entry=>!entry.record?.makeupResolution)?'<button class="btn primary" onclick="attendanceSaveLesson()">保存考勤</button>':''}</div></section></div>`;
};
function attendanceSaveLesson(){
  const context=attendanceLessonContext();if(a.modal!=='attendanceLesson'||!context)return;
  const {cls,lesson,entries}=context,values=entries.map((entry,index)=>entry.record?.makeupResolution?entry.record.attendance:$('#attendance-lesson-student-'+index).value);
  if(!entries.length)return;
  if(!Number.isFinite(attendanceLessonEnd(lesson))){toast('请先完成本课节的日期和时间排课');return}
  if(values.some((value,index)=>!entries[index].record?.makeupResolution&&!['出勤','迟到','早退','请假','旷课','未出勤销课'].includes(value))){toast('请填写每位学生的出勤情况');return}
  // 整批校验后再写入，避免某位学生校验失败时已产生部分销课记录。
  const pending=entries.map(({student,record},index)=>({student,index,record:record||{classId:cls.id,classIndex:a.classes.indexOf(cls),studentId:student.id,studentIndex:a.students.findIndex(s=>s.id===student.id),sessionId:lesson.key,session:lesson.label,date:lesson.date,time:lesson.time.replace('-','–')},isNew:!record}));
  if(pending.some(({student,record,index})=>!record.makeupResolution&&values[index]==='未出勤销课'&&makeupExistingResolution({student,record,cls}))){toast('本课节已有销课或课时返还记录，请刷新后查看');return}
  pending.forEach(({student,record,index,isNew})=>{
    if(record?.makeupResolution)return;
    if(isNew)a.attendance.push(record);
    if(values[index]==='未出勤销课')makeupCommitResolution({student,record,cls},'consume','attendance');
    else {record.attendance=values[index];record.status='已考勤'}
  });
  a.modal=null;a.attendanceLessonDraft=null;academicRender();toast('本课节考勤已保存');
}
function attendanceSetFilter(key,value){
  if(!Object.hasOwn(attendanceEmptyFilters(),key))return;
  attendanceFilters()[key]=value;$('#attendance-results').innerHTML=attendanceResults();
  if(key==='campus')$('#attendance-default-campus').innerHTML=attendanceDefaultControls();
}
function attendanceResetFilters(){Object.assign(attendanceFilters(),attendanceEmptyFilters(),{campus:attendanceDefaultRead()??''});academicRender()}
attendanceTab=function(tab){if(tab!=='班课')return;a.attTab='班课';academicRender()};
attendancePage=function(){
  a.attTab='班课';
  return aHeading('考勤','逐讲登记出勤、迟到、早退、请假与旷课')+`<div class="card pad"><p class="academic-note">每日 24 点锁定当天已考勤学生的考勤情况，请谨慎操作。</p><div class="tabs"><button class="tab active" onclick="attendanceTab('班课')">班课</button>${['1对1','1对N'].map(tab=>`<button class="tab" disabled aria-disabled="true" title="二期开发">${tab} <span class="nav-phase-badge">二期</span></button>`).join('')}</div><div class="class-management-filters" style="margin-top:20px">${attendanceFilterFields()}</div><div class="toolbar class-management-filter-actions"><span class="help">老师可筛选授课老师或教务老师。</span><button class="btn small" onclick="attendanceResetFilters()">重置筛选</button></div><div id="attendance-results">${attendanceResults()}</div></div>`;
};
let attendanceLastView='';
function attendanceEnter(){
  const key=studentTermActor()+'|'+state.page;
  if(key===attendanceLastView)return;attendanceLastView=key;
  if(state.page==='attendance'&&permissionCanVisit('attendance')){
    for(const cls of a.classes)attendanceLessonSelections.delete(attendanceSelectionKey(cls));
    const campus=attendanceDefaultRead();if(campus!==null)Object.assign(attendanceFilters(),attendanceEmptyFilters(),{campus});
  }
}
const attendancePreviousRender=render,attendancePreviousAcademicRender=academicRender;
render=function(){attendanceEnter();return attendancePreviousRender()};
academicRender=function(){attendanceEnter();return attendancePreviousAcademicRender()};
