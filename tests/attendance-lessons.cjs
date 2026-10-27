const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {run,node,page}=require('./lead-registration.cjs');
run(fs.readFileSync(path.join(__dirname,'../attendance-filters.js'),'utf8'));
run(`permissionChangeIdentity('admin');Date.now=()=>new Date('2026-10-21T12:00:00').getTime();
a.classes[0].sessions=[
{id:'s1',name:'已上旧课',date:'2026-10-14',time:'08:00–10:00'},
{id:'s2',name:'最近一讲',date:'2026-10-21',time:'08:00–10:00'},
{id:'s3',name:'正在上课',date:'2026-10-21',time:'11:00–13:00'},
{id:'s4',name:'未来一讲',date:'2026-10-28',time:'08:00–10:00'}];
a.attendance.push({classId:a.classes[0].id,classIndex:0,studentId:a.students[0].id,studentIndex:0,sessionId:'s1',session:'第1讲',date:'2026-10-14',time:'08:00–10:00',status:'已考勤',attendance:'出勤'});
nav('attendance')`);
const first=()=>JSON.parse(run('JSON.stringify(attendanceRows()[0])'));
assert.equal(first().lesson.key,'s2','latest ended lesson, not currently running or future');
assert.equal(run('attendanceRows().length'),3,'one row per class despite multiple attendance records');
assert(page().includes('<th>考勤课节</th>'));assert(page().includes('value="s2" selected'));
assert.equal(first().attendanceStatus,'未考勤');
run("attendanceSelectLesson(0,'s1')");assert.equal(first().attendanceStatus,'已考勤');assert.equal(first().date,'2026-10-14');
assert(node('#attendance-results').innerHTML.includes('attendanceOpenLesson(0,0)'));
run('attendanceOpenLesson(0,0)');assert(page().includes('<option selected>出勤</option>'));
run("a.modal=null;attendanceSelectLesson(0,'s2');attendanceOpenLesson(0,1)");
assert(page().includes('第2讲考勤'));assert(page().includes('张同学'));
const before=run('a.attendance.length');
node('#attendance-lesson-student-0').value='';run('attendanceSaveLesson()');assert.equal(run('a.attendance.length'),before);
node('#attendance-lesson-student-0').value='请假';run('attendanceSaveLesson()');
assert.equal(run('a.attendance.length'),before+1);assert.equal(first().attendanceStatus,'已考勤');assert.equal(first().lesson.key,'s2');
assert.equal(run("a.attendance.find(r=>r.sessionId==='s1').attendance"),'出勤','old lesson unchanged');
assert.equal(run("a.attendance.find(r=>r.sessionId==='s2').attendance"),'请假');
assert.equal(run('classDetailAttendanceRows(a.classes[0],a.classes[0].sessions[1]).length'),1,'class detail sees same lesson record');
run('attendanceOpenLesson(0,1)');node('#attendance-lesson-student-0').value='迟到';run('attendanceSaveLesson()');assert.equal(run('a.attendance.length'),before+1,'resave updates rather than duplicates');
run("attendanceSetFilter('date','2026-10-28')");assert.equal(first().lesson.key,'s4','date can locate a different session');
run("attendanceResetFilters();attendanceSelectLesson(0,'s1');nav('students');nav('attendance')");assert.equal(first().lesson.key,'s2','re-entry recomputes nearest ended session');
run("a.classes[0].sessions=a.classes[0].sessions.filter(s=>s.id==='s4');academicRender()");assert.equal(first().lesson.key,'s4','all future selects earliest upcoming');
run("a.classes[0].sessions=[];academicRender()");assert.equal(first().lesson,null);assert(page().includes('暂无课节'));
run("a.classes[0].sessions=[{id:'new',name:'新课节',date:'2026-10-20',time:'08:00–10:00'}];a.classes[0].name='<img src=x>';academicRender()");assert(page().includes('&lt;img'));assert(!page().includes('<img src=x>'));
run('attendanceOpenLesson(0,0);a.classes[0].sessions=[]');run('attendanceSaveLesson()');assert.equal(run('a.attendance.length'),before+1,'removed session cannot be saved');
console.log('PASS: per-class lesson dropdown, latest ended default, ongoing/future/empty cases, switching/filtering, lesson-specific save/update, shared class detail records and stale session guard.');
