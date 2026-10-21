// Keep legacy attendance linked when new classes or students are inserted ahead of it.
for(const row of a.attendance){row.classId??=a.classes[row.classIndex]?.id;row.studentId??=a.students[row.studentIndex]?.id}
function classDetailCurrent(){return a.classes.find(c=>c.id===a.classDetailId)}
function classOpenDetail(index){
  const cls=a.classes[index];if(!cls)return;
  a.classDetailId=cls.id;a.selectedClass=index;a.classDetailTab='课节';a.classStudentTab='在班学生';a.classStudentSearch='';a.classDetailAttendance=null;a.modal=null;nav('classDetail');
}
function classDetailEdit(){const cls=classDetailCurrent();if(!cls)return;a.selectedClass=a.classes.indexOf(cls);nav('classForm')}
function classDetailField(label,value,wide=false){return `<div class="class-detail-field${wide?' wide':''}"><dt>${esc(label)}</dt><dd>${esc(value===null||value===undefined||value===''?'—':value)}</dd></div>`}
function classDetailFee(value){return value===null||value===undefined||value===''?'未设置':Number.isFinite(Number(value))?`¥${Number(value).toFixed(2)}`:'未设置'}
function classDetailAttendanceRows(cls,session){
  return a.attendance.filter(r=>{
    const sameClass=r.classId?r.classId===cls.id:a.classes[r.classIndex]?.id===cls.id;
    if(!sameClass)return false;
    return !session||(r.sessionId?r.sessionId===session.id:r.date===session.date&&r.time===session.time);
  });
}
function classDetailSessions(cls){
  if(Array.isArray(cls.sessions))return cls.sessions.map((s,i)=>({...s,number:i+1,date:s.date||s.startsAt?.slice(0,10)||'',time:s.time||(s.startsAt&&s.endsAt?`${s.startsAt.slice(11,16)}–${s.endsAt.slice(11,16)}`:''),teacher:s.teacher||cls.teacher,room:s.room||cls.room}));
  // Old classes have per-student attendance rows, so deduplicate the lesson view.
  const seen=new Set();
  return classDetailAttendanceRows(cls).filter(r=>{const key=r.date+'|'+r.time+'|'+r.session;if(seen.has(key))return false;seen.add(key);return true}).map((r,i)=>({id:r.sessionId||`legacy-${cls.id}-${i}`,number:i+1,name:r.session||`第${i+1}讲`,date:r.date,time:r.time,teacher:cls.teacher,room:cls.room}));
}
function classDetailStudentRows(cls){
  const historyStatuses=['已退费','已退班','已转班','已结课','历史'];
  return a.students.flatMap((student,index)=>{
    const enrollments=(student.enrollments||[]).filter(e=>e.classId===cls.id||(!e.classId&&e.className===cls.name));
    const active=enrollments.filter(e=>!historyStatuses.includes(e.enrollmentStatus||e.status));
    const trials=trialState.requests.filter(r=>r.classId===cls.id&&r.studentId===student.id&&r.status==='已排班');
    if(enrollments.length)return [{...student,index,kind:active.length?'在班学生':'历史在班学生',classStatus:active.length?(active.at(-1).enrollmentStatus||active.at(-1).status||'上课中'):(enrollments.at(-1).enrollmentStatus||enrollments.at(-1).status||'历史')}];
    if(trials.length)return [{...student,index,kind:'在班学生',classStatus:'试听'}];
    if(student.classId===cls.id||(!student.classId&&(student.className===cls.name||student.classNames?.includes(cls.name))))return [{...student,index,kind:student.status==='历史'?'历史在班学生':'在班学生',classStatus:student.status||'在班'}];
    return [];
  });
}
function classDetailStudentsHTML(cls){
  const all=classDetailStudentRows(cls),search=String(a.classStudentSearch||'').trim().toLowerCase();
  const list=all.filter(s=>s.kind===(a.classStudentTab||'在班学生')&&(!search||[s.id,s.name,s.phone].some(value=>String(value||'').toLowerCase().includes(search))));
  return aTable(['学生ID','学生姓名','联系电话','在班状态','操作'],list.map(s=>`<tr><td>${esc(s.id)}</td><td>${esc(s.name)}</td><td>${esc(s.phone||'—')}</td><td><span class="badge ${s.kind==='历史在班学生'?'off':''}">${esc(s.classStatus)}</span></td><td>${permissionCanVisit('studentDetail')?`<button class="btn small" onclick="classDetailStudent(${s.index})">查看档案</button>`:'—'}</td></tr>`))+(!list.length?'<div class="empty">暂无符合条件的学生</div>':'')+`<div class="data-bar">共 ${list.length} 位学生</div>`;
}
function classDetailStudent(index){if(!permissionCanVisit('studentDetail')||!a.students[index])return;a.selectedStudent=index;nav('studentDetail')}
function classDetailSearch(value){a.classStudentSearch=value;const cls=classDetailCurrent();if(cls)$('#class-detail-students').innerHTML=classDetailStudentsHTML(cls)}
function classDetailSetStudentTab(value){if(!['在班学生','历史在班学生'].includes(value))return;a.classStudentTab=value;academicRender()}
function classDetailSetTab(value){if(!['课节','学生'].includes(value))return;a.classDetailTab=value;a.classDetailAttendance=null;academicRender()}
function classDetailLessonsHTML(cls){
  const sessions=classDetailSessions(cls);
  return `<div class="toolbar"><span class="count">共 ${sessions.length} 个课节</span>${permissionCanVisit('attendance')?'<button class="btn" onclick="classDetailShowAttendance(null)">查看全部考勤</button>':''}</div>`+aTable(['讲次','讲次名称','上课日期','上课时间','老师 / 教室','考勤记录','操作'],sessions.map((s,index)=>{
    const records=classDetailAttendanceRows(cls,s);
    return `<tr><td>第${s.number}讲</td><td>${esc(s.name||'—')}</td><td>${esc(s.date||'待排课')}</td><td>${esc(s.time||'待排课')}</td><td>${esc(s.teacher||'—')} / ${esc(s.room||'—')}</td><td>${records.filter(r=>r.status==='已考勤').length} / ${records.length}</td><td>${permissionCanVisit('attendance')?`<button class="btn small" onclick="classDetailShowAttendance(${index})">查看考勤</button>`:'—'}</td></tr>`;
  }))+(!sessions.length?'<div class="empty">尚未安排课节，可通过“编辑班级”配置。</div>':'');
}
function classDetailShowAttendance(index){if(!permissionCanVisit('attendance'))return;a.classDetailAttendance={index};academicRender()}
function classDetailCloseAttendance(){a.classDetailAttendance=null;academicRender()}
function classDetailAttendanceModal(cls){
  if(!a.classDetailAttendance||!permissionCanVisit('attendance'))return '';
  const index=a.classDetailAttendance.index,session=index===null?null:classDetailSessions(cls)[index];
  if(index!==null&&!session)return '';
  const rows=classDetailAttendanceRows(cls,session);
  return `<div class="modal-backdrop"><section class="modal" style="width:900px;max-width:95vw;max-height:85vh;overflow:auto" role="dialog" aria-modal="true" aria-labelledby="class-detail-attendance-title"><div class="modal-head"><h2 id="class-detail-attendance-title">${session?`第${session.number}讲考勤记录`:'全部考勤记录'}</h2><button class="btn small" onclick="classDetailCloseAttendance()" aria-label="关闭">×</button></div><p>${esc(cls.name)}</p>${aTable(['学生','讲次','日期 / 时间','考勤状态','出勤情况'],rows.map(r=>{const student=r.studentId?a.students.find(s=>s.id===r.studentId):a.students[r.studentIndex];return `<tr><td>${esc(student?.name||'学生档案已移除')}</td><td>${esc(r.session||'—')}</td><td>${esc(r.date)} ${esc(r.time)}</td><td>${esc(r.status||'未考勤')}</td><td>${esc(r.attendance||'—')}</td></tr>`}))}${!rows.length?'<div class="empty">暂无考勤记录</div>':''}<div class="modal-actions"><button class="btn" onclick="classDetailCloseAttendance()">关闭</button></div></section></div>`;
}
function classDetailPage(){
  const cls=classDetailCurrent();
  if(!cls)return '<div class="card pad"><div class="empty">班级不存在或已移除</div><button class="btn" onclick="nav(\'classes\')">返回班级管理</button></div>';
  const course=a.courses.find(c=>c.name===cls.course),tab=a.classDetailTab||'课节';
  const fields=[['课程名称',cls.course,true],['班级名称',cls.name,true],['课程分类',course?courseCategory(course):'—'],['授课形式',course?courseTeachingFormat(course)+'课':'—'],['年级',course?.grade],['学科',course?.subject],['学期',course?.term],['班型',course?.classType],['校区',cls.campus],['教室',cls.room],['授课老师',cls.teacher],['学生人数上限',cls.capacity],['虚设座位',cls.virtualSeats??5],['班级状态',cls.status]];
  return `<div class="toolbar class-detail-heading"><div class="toolbar-left"><button class="btn" onclick="nav('classes')">‹ 返回班级管理</button><h1>班级详情</h1></div><button class="btn primary" onclick="classDetailEdit()">编辑班级</button></div><div class="class-detail-layout"><section class="card pad"><h2 class="section-title">建课基本信息</h2><dl class="class-detail-grid">${fields.map(f=>classDetailField(...f)).join('')}</dl></section><section class="card pad"><div class="toolbar"><h2 class="section-title" style="margin:0">收费信息</h2>${course&&permissionCanVisit('course')?`<button class="btn small" onclick="courseOpenForm(${a.courses.indexOf(course)})">前往课程管理</button>`:''}</div><p class="help">费用由所属课程统一管理。</p><dl class="class-detail-fees">${classDetailField('课程费',classDetailFee(course?.fee))}${classDetailField('教辅费',classDetailFee(course?.materialFee))}</dl></section><section class="card"><div class="tabs" role="tablist" aria-label="班级明细">${['课节','学生'].map(t=>`<button class="tab ${tab===t?'active':''}" role="tab" aria-selected="${tab===t}" onclick="classDetailSetTab('${t}')">${t}</button>`).join('')}</div><div class="pad" role="tabpanel">${tab==='课节'?classDetailLessonsHTML(cls):`<div class="toolbar"><div class="toolbar-left">${['在班学生','历史在班学生'].map(t=>`<button class="btn ${a.classStudentTab===t?'primary':''}" onclick="classDetailSetStudentTab('${t}')">${t}</button>`).join('')}</div><input class="input" style="width:280px;max-width:100%" placeholder="搜索学生ID、姓名、联系电话" aria-label="搜索班级学生" value="${esc(a.classStudentSearch||'')}" oninput="classDetailSearch(this.value)"></div><div id="class-detail-students">${classDetailStudentsHTML(cls)}</div>`}</div></section></div>${classDetailAttendanceModal(cls)}`;
}
