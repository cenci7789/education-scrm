const assert=require('node:assert/strict');
const {run,json,node,handlers}=require('./prototype-runtime.cjs')();
run(`
permissionChangeIdentity('sales');
const day=new Date();day.setDate(day.getDate()+7);const date=leadEnrollmentDate(day.toISOString());
state.campuses=[{name:'试听校区',active:true}];
state.staff=[{id:'T1',name:'甲老师',roleId:'teacher',active:true},{id:'T2',name:'乙老师',roleId:'teacher',active:true}];
a.courses=[{id:'C1',name:'数学',active:true,grade:'小三',subject:'数学',year:day.getFullYear(),term:'秋季',fee:1000,sessions:[{name:'第1讲'},{name:'第2讲'}]}];
a.classes=['A','B'].map((id,i)=>({id,name:id+'班',course:'数学',campus:'试听校区',teacher:i?'乙老师':'甲老师',teacherId:i?'T2':'T1',academicTeacher:'教务老师',room:'教室'+id,capacity:2,students:0,sessions:[{id:id+'1',number:1,name:'第一讲',date,time:i?'09:00–11:00':'08:00–10:00',startsAt:date+(i?'T09:00':'T08:00')},{id:id+'2',number:2,name:'第二讲',date,time:'14:00–16:00',startsAt:date+'T14:00'}]}));
a.students=[];a.orders=[];a.attendance=[];trialState.requests=[];
leadState.leads=[{leadId:'L1',name:'试听学生甲',phone:'13888880001',grade:'小三',guardian:'妈妈',status:'mine',stage:'新线索',owner:leadCurrentOperator().name,ownershipCampus:'试听校区',next:'未约定',history:[]}];
function testDraft(name='试听学生甲',phone='13888880001',cls='A',session='A1'){
 trialStart(name==='试听学生甲'?leadState.leads[0]:null);
 const c=a.classes.find(c=>c.id===cls),s=trialClassSessions(c).find(s=>s.id===session);
 Object.assign(trialState.draft,{name,phone,grade:'小三',classes:[{classId:cls,sessionId:s.id,sessionName:s.name,preferredTime:s.startsAt}]});trialState.step=3;
}
testDraft();trialSubmit();trialSubmit();
`);
assert.equal(run('trialState.requests.length'),1);
assert.equal(run('trialState.requests[0].status'),'已排班');
assert.equal(run('a.students.length'),1);assert.equal(run('a.students[0].status'),'试听');
assert.equal(run('a.classes[0].students'),0);assert.equal(run('a.classes[0].trialRoster.length'),1);
assert.equal(run('leadState.leads[0].studentId'),run('a.students[0].id'));
assert.equal(run('leadState.leads[0].history.at(-1)[0]'),'试听排班');
assert.equal(run('trialState.requests[0].confirmedBy'),'王敏');
assert.equal(run('a.orders.length'),0);
assert(node('#view').innerHTML.includes('查看我的试听'));assert(!node('#view').innerHTML.includes('等待教务确认'));handlers();
run('trialReturnMyTrials()');assert.equal(run('state.page'),'myLeads');assert(node('#view').innerHTML.includes('试听学生甲'));
// Capacity, interval collisions, stale sessions and all-or-none writes.
run("testDraft();trialSubmit()");assert.equal(run('trialState.requests.length'),1);
run("testDraft('试听学生甲','13888880001','B','B1');trialSubmit()");assert.equal(run('trialState.requests.length'),1);
run("testDraft('试听学生乙','13888880002');trialSubmit()");assert.equal(run('trialState.requests.length'),2);
run("testDraft('超额学生','13888880003');trialSubmit()");assert.equal(run('a.students.length'),2);
run("testDraft('试听学生甲','13888880001','A','A2');trialSubmit()");assert.equal(run('a.students.length'),2);assert.equal(run('trialState.requests.length'),3);
run("testDraft('整批失败','13888880004','A','A2');trialState.draft.classes.push({classId:'B',sessionId:'B2',preferredTime:date+'T14:00'});trialSubmit()");assert.equal(run('trialState.requests.length'),3);
run("testDraft('过期课节','13888880005','A','A2');a.classes[0].sessions[1].cancelled=true;trialSubmit()");assert.equal(run('trialState.requests.length'),3);
run("a.classes[0].sessions[1].cancelled=false");
// Student/teacher lists and calendar preserve lesson and teacher scope.
run("permissionChangeIdentity('admin');state.page='students';studentTermSetTab('试听学生');studentTermSetFilter('term','')");
assert.equal(run('studentTermRows().length'),3);assert(node('#view').innerHTML.includes('试听学生甲'));
run("state.page='learningActive';render();learningSelectTeacher('T1');studentTermSetTab('试听学生')");
assert.equal(run('studentTermRows().length'),3);assert(node('#view').innerHTML.includes('role="tab"'));handlers();
run("studentTermInspectTrial(trialState.requests[0].id)");assert(node('#view').innerHTML.includes('试听预约信息'));
run("studentTermCloseTrial();learningOpenStudent(a.students[0].id,'沟通')");assert.equal(run('state.page'),'studentDetail');
run("state.page='learningActive';render();learningSelectTeacher('T2');studentTermSetTab('试听学生')");assert.equal(run('studentTermRows().length'),0);
run("state.page='schedule';render();scheduleView().date=date;scheduleView().campus='试听校区';render()");
assert(node('#view').innerHTML.includes('试听学生甲[试听]'));
assert.equal(run("attendanceLessonStudents(a.classes[0],attendanceLessons(a.classes[0])[0]).length"),2);
assert.equal(run("attendanceLessonStudents(a.classes[0],attendanceLessons(a.classes[0])[1]).length"),1);
assert.equal(run("attendanceLessonStudents(a.classes[1],attendanceLessons(a.classes[1])[0]).length"),0);
// Trial attendance feeds outcomes without consuming formal tuition.
run("state.page='attendance';attendanceOpenLesson(0,0)");
node('#attendance-lesson-student-0').value='出勤';node('#attendance-lesson-student-1').value='旷课';run('attendanceSaveLesson()');
assert.equal(run('a.attendance.length'),2);
assert.equal(run('a.attendance.every(r=>r.trialRequestId&&r.consumptionCents===0)'),true);
assert.equal(run('businessAttendanceRecords().length'),0);
assert.equal(run("trialState.requests.find(r=>r.name==='试听学生甲'&&r.scheduledSessionId==='A1').attendance"),'已试听');
assert.equal(run("trialState.requests.find(r=>r.name==='试听学生乙').attendance"),'未出勤');
run('const trialSnapshot=businessSnapshot();trialState.requests=[];businessRestore(trialSnapshot)');assert.equal(run('trialState.requests.length'),3);
const html=require('node:fs').readFileSync(require('node:path').resolve(__dirname,'../index.html'),'utf8');
assert(!html.includes('data-page="trialManage"'));assert(!html.includes('data-page="quickTrial"'));
console.log('PASS: direct trial placement, reuse/linkage, duplicate/overlap/capacity/stale guards, student/teacher lists, per-lesson roster, calendar label, attendance without billing and persistence.');
