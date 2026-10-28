const assert=require('node:assert/strict');
const {run,node,page,context}=require('./lead-registration.cjs');
const storage=new Map();context.localStorage={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)};
run(`permissionChangeIdentity('admin');state.currentAcademicTerm='2026-春季';
a.courses=[{name:'春季语文',year:'2026',term:'春季',grade:'小二'},{name:'暑期语文',year:'2026',term:'暑假',grade:'小二'},{name:'秋季数学',year:'2026',term:'秋季',grade:'小二'},{name:'寒假数学',year:'2027',term:'寒假'},{name:'缺少年份',term:'春季'}];
a.classes=[
 {id:'spring',name:'春季1班',course:'春季语文',campus:'城中校区',date:'2026-03-01',status:'开课中',sessions:[{id:'end',startsAt:'2026-06-20T08:00',endsAt:'2026-06-20T10:00'}]},
 {id:'summer',name:'暑期1班',course:'暑期语文',campus:'园区校区',date:'2026-07-10',status:'未开课',sessions:[]},
 {id:'summer2',name:'暑期2班',course:'暑期语文',campus:'城中校区',date:'2026-07-11',status:'未开课'},
 {id:'autumn',name:'秋季1班',course:'秋季数学',campus:'城中校区',date:'2026-09-01',status:'开课中'},
 {id:'winter',name:'寒假1班',course:'寒假数学',date:'2027-01-20',status:'未开课'},
 {id:'unknown',name:'待补学期班',course:'缺少年份',campus:'城中校区'}];
a.students=[
 {id:'shared',name:'春暑同学',phone:'13812345678',status:'历史',enrollments:[{classId:'spring',enrollmentStatus:'上课中'},{classId:'summer',enrollmentStatus:'上课中'},{classId:'summer2',enrollmentStatus:'上课中'}]},
 {id:'refund',name:'已退费同学',phone:'13912345678',enrollments:[{classId:'summer',enrollmentStatus:'已退费'}]},
 {id:'old',name:'收尾同学',phone:'13712345678',status:'历史',className:'春季1班'},
 {id:'missing',name:'待补信息同学',phone:'13612345678',enrollments:[{classId:'unknown'}]},
 {id:'archived',name:'归档班学生',phone:'13512345678',enrollments:[{classId:'removed',className:'已归档春季班',academicTerm:'2025-春季',enrollmentStatus:'已结课'}]}];
a.orders=[{studentId:'shared',items:[{classId:'summer',enrollmentStatus:'上课中'}]}];
trialState.requests=[{id:10,name:'试听新生',phone:'13212345678',grade:'小二',requestedClassId:'summer',requestedClassName:'暑期1班',course:'暑期语文',status:'待排班',preferredTime:'2026-07-10T08:00',requestedEndTime:'2026-07-10T10:00',requestedSessionName:'第1讲',schools:[]},
 {id:11,studentId:'shared',name:'春暑同学',phone:'13812345678',classId:'summer2',requestedClassName:'暑期2班',course:'暑期语文',status:'已排班',scheduledTime:'2026-07-11T08:00',scheduledEndTime:'2026-07-11T10:00',scheduledSessionName:'第1讲',attendance:'已试听',schools:[]}];
nav('students');`);
for(const tab of ['正价学生','试听学生'])assert(page().includes(tab));
for(const text of ['工作学期','查看上期学生','下期报名学生','本期学生','新生录入','学生批量导入','跟进状态'])assert(!page().includes(text));
for(const key of ['classKey','grade','subject','campus','teacher','format','search'])assert(page().includes(`id="student-filter-${key}"`));
assert(page().includes('id="teaching-term-trigger-students"'));
for(const header of ['班级 / 学期','校区','授课老师','教务老师','本班状态'])assert(!page().includes(`<th>${header}</th>`));
for(const action of ['沟通','学生档案'])assert(page().includes(`>${action}</button>`));
assert.equal(run('studentTermView().term'),'');assert.equal(run('studentTermView().tab'),'正价学生');
assert(page().includes('收尾同学'));assert(page().includes('春暑同学'));assert(page().includes('归档班学生'));assert(page().includes('待补信息同学'));
assert.equal(run('studentTermRows().length'),7,'duplicate order is merged, all semesters and refunded students remain available');
assert.equal(run("studentTermEnrollments(new Date('2026-07-01T12:00').getTime()).find(r=>r.studentId==='shared'&&r.classId==='summer').status"),'待开课');
assert.equal(run("studentTermEnrollments(new Date('2026-07-01T12:00').getTime()).find(r=>r.studentId==='shared'&&r.classId==='spring').status"),'已结课');
run("a.classes[0].teacher='春季授课老师';a.classes[0].academicTeacher='春季教务老师';a.classes[1].teacher='暑期授课老师';a.classes[1].academicTeacher='暑期教务老师';a.classes[2].teacher='另一老师';a.courses[0].subject='语文';a.courses[1].subject='数学';a.courses[1].grade='2年级';a.courses[1].teachingFormat='直播';academicRender()");
for(const name of ['春季授课老师','春季教务老师','暑期授课老师','暑期教务老师'])assert(page().includes(name));
const filtered=()=>JSON.parse(run('JSON.stringify(studentTermFiltered(studentTermRows()))'));
run("studentTermSetFilter('term','2026-暑期')");assert.equal(filtered().length,3);
assert(node('#student-term-results').innerHTML.includes('共 2 位学生'));
assert.equal((node('#student-term-results').innerHTML.match(/>春暑同学<\/strong>/g)||[]).length,1);
run("studentTermSetFilter('campus','园区校区')");assert.equal(filtered().length,2);
assert(!node('#student-term-results').innerHTML.includes('暑期2班'));
run("studentTermSetFilter('classKey','id:summer');studentTermSetFilter('grade','2');studentTermSetFilter('subject','数学');studentTermSetFilter('teacher','暑期教务老师');studentTermSetFilter('format','直播');studentTermSetFilter('search','13812345678')");
assert.equal(filtered().length,1);assert.equal(filtered()[0].classId,'summer');
run("studentTermSetFilter('teacher','暑期授课老师')");assert.equal(filtered().length,1);
run("studentTermSetFilter('subject','语文')");assert.equal(filtered().length,0,'filters combine with AND');
assert(node('#student-term-results').innerHTML.includes('暂无符合条件'));
run('studentTermResetFilters()');assert.equal(filtered().length,7);
assert.equal(run('studentTermView().term'),'');assert.equal(run('studentTermView().teacher'),'');
run("studentTermSetFilter('term','__unknown')");assert.equal(filtered().length,1);assert.equal(filtered()[0].studentId,'missing');
run("studentTermResetFilters();studentTermSetFilter('grade','2')");assert.equal(filtered().length,5,'grade aliases use the same filter value');
run("studentTermResetFilters();studentTermSetFilter('search','shared')");assert.equal(filtered().length,3);
run("studentTermSetFilter('search','春暑同学')");assert.equal(filtered().length,3);
run("studentTermOpenStudent('shared')");assert.equal(run('state.page'),'studentDetail');
run("nav('students')");assert.equal(run('studentTermView().search'),'春暑同学');
run("studentTermSetTab('试听学生')");assert.equal(run('studentTermView().search'),'');assert(page().includes('试听新生'));
run("studentTermOpenCourses('contact:试听新生|13212345678')");assert.equal(run('state.page'),'studentCourses');assert(page().includes('基本信息'));assert(page().includes('第1讲'));assert(page().includes('暑期教务老师'));run('studentTermCloseCourses()');
assert.equal(run('a.students.length'),5,'pending trial is shown without creating a student dossier');
run("studentTermSetFilter('teacher','暑期教务老师')");assert.equal(filtered().length,1);assert.equal(filtered()[0].requestId,10);
run('studentTermInspectTrial(10)');assert(page().includes('role="dialog"'));run('studentTermCloseTrial()');
run("studentTermSetTab('正价学生');studentTermSetFilter('term','2025-春季')");assert.equal(filtered()[0].studentId,'archived');
run("permissionChangeIdentity('academic');nav('students')");assert.equal(run('studentTermView().term'),'');
run("studentTermSetFilter('term','2026-暑期');permissionChangeIdentity('admin');nav('students')");assert.equal(run('studentTermView().term'),'2025-春季');
storage.set('crm.student-work-term.v1.admin','2026-秋季');
run("studentTermViews.delete('admin');nav('students')");assert.equal(run('studentTermView().term'),'','old work-term preference no longer restricts records');
run("a.students.push({id:'orphan',name:'旧班级学生',status:'历史',className:'已删除旧班'});academicRender()");assert(page().includes('旧班级学生'));
run("permissionChangeIdentity('finance');nav('students')");assert(!page().includes('id="student-filter-term"'));
console.log('PASS: paid/trial tabs, all-term default, eight combined filters, grade aliases, both teacher roles, unknown/archived records, per-account view state, shared dossiers and permissions.');
