const assert=require('node:assert/strict');const {run,json,handlers}=require('./prototype-runtime.cjs')();
run(`permissionChangeIdentity('admin');state.campuses=[{name:'甲校区',active:true},{name:'乙校区',active:true}];
a.courses=[{name:'数学课程',subject:'数学',grade:'初一'},{name:'英语课程',subject:'英语',grade:'初二'}];
a.classes=[{id:'m',name:'数学一班',course:'数学课程',campus:'甲校区',teacher:'班级教师',academicTeacher:'教务甲',room:'101',sessions:[{id:'m1',date:'2026-10-27',time:'08:00–10:00',teacher:'代课教师'}]},
{id:'e',name:'英语一班',course:'英语课程',campus:'甲校区',teacher:'英语教师',academicTeacher:'教务乙',room:'102',sessions:[{id:'e1',date:'2026-10-27',time:'08:00–10:00'}]},
{id:'b',name:'异校数学班',course:'数学课程',campus:'乙校区',teacher:'代课教师',academicTeacher:'教务甲',room:'201',sessions:[{id:'b1',date:'2026-10-27',time:'08:00–10:00'}]}];
a.attendance=[];trialState.requests=[];nav('schedule');scheduleSetDate('2026-10-27');`);
for(const key of ['grade','subject','teacher','academicTeacher','courseName'])assert(run('schedulePage()').includes('id="schedule-filter-'+key+'"'));
assert.deepEqual(json('scheduleVisibleLessons().map(e=>e.classId)'),['m','e']);
assert.deepEqual(json("scheduleTimeFilterOptions('teacher').map(o=>o[0])"),['代课教师','英语教师']);
for(const [key,value] of [['grade','7'],['subject','数学'],['teacher','代课教师'],['academicTeacher','教务甲'],['courseName','数学课程']]){
 run(`scheduleSetTimeFilter(${JSON.stringify(key)},${JSON.stringify(value)})`);assert.deepEqual(json('scheduleVisibleLessons().map(e=>e.classId)'),['m']);
}
assert(!run('scheduleExportCSV()').includes('英语课程'),'export uses same filters');
run("scheduleSetTimeFilter('academicTeacher','教务乙')");assert.equal(run('scheduleVisibleLessons().length'),0,'AND combination');
run("scheduleResetTimeFilters();scheduleSetTimeFilter('courseName','数学一班')");assert.equal(run('scheduleView().timeFilters.courseName'),'','arbitrary input is rejected');assert.equal(run('scheduleVisibleLessons().length'),2);
run("scheduleView().searchPicker={key:'courseName',query:''};schedulePickerSearch('courseName','数学')");assert(run("schedulePickerList('courseName')").includes('数学课程'));assert.equal(run('scheduleVisibleLessons().length'),2,'typing only searches options');
run("schedulePickerChoose('courseName','数学课程')");assert.equal(run('scheduleVisibleLessons().length'),1);
run("schedulePickerChoose('courseName','不存在的课程')");assert.equal(run('scheduleView().timeFilters.courseName'),'数学课程');
run("scheduleResetTimeFilters();scheduleSetTimeFilter('subject','数学');scheduleTab('老师课表')");assert.equal(run('scheduleVisibleLessons().length'),2,'day filters do not affect weekly tabs');
assert(!run('schedulePage()').includes('id="schedule-filter-grade"'));
run("scheduleTab('时间课表')");assert.equal(run('scheduleVisibleLessons().length'),1,'day filters retained on return');
const controls=run('scheduleDateControls()');let previous=-1;for(const label of ['选择课表日期','今天','昨天','明天','本周六','本周日']){const at=controls.indexOf(label);assert(at>previous);previous=at}
assert(!controls.includes('scheduleMoveDate'));
run(`const OriginalScheduleTestDate=Date;globalThis.Date=class extends OriginalScheduleTestDate {constructor(...args){super(...(args.length?args:['2026-11-01T12:00:00']))}};scheduleSetDate('2020-01-01')`);
for(const [key,date] of [['today','2026-11-01'],['yesterday','2026-10-31'],['tomorrow','2026-11-02'],['saturday','2026-10-31'],['sunday','2026-11-01']]){run(`scheduleQuickDate('${key}')`);assert.equal(run('scheduleView().date'),date)}
run(`globalThis.Date=class extends OriginalScheduleTestDate {constructor(...args){super(...(args.length?args:['2026-12-31T12:00:00']))}};scheduleQuickDate('saturday')`);assert.equal(run('scheduleView().date'),'2027-01-02');
run("scheduleQuickDate('sunday')");assert.equal(run('scheduleView().date'),'2027-01-03');run('globalThis.Date=OriginalScheduleTestDate');
handlers();console.log('PASS: day filter metadata, independent teacher/academic fields, AND search/export, tab isolation, date control order, Sunday/month/year boundaries.');
