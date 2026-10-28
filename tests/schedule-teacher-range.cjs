const assert=require('node:assert/strict');const {run,json,handlers}=require('./prototype-runtime.cjs')();
run(`permissionChangeIdentity('admin');state.campuses=[{name:'甲校区',active:true}];a.courses=[{name:'数学',grade:'初一',subject:'数学'}];a.classes=[{id:'a',name:'数学班',course:'数学',campus:'甲校区',teacher:'张老师',room:'101',sessions:[
{id:'before',date:'2026-10-20',time:'09:00–10:00'},
{id:'night',startsAt:'2026-10-20T23:00',endsAt:'2026-10-21T01:00'},
{id:'start',date:'2026-10-21',time:'09:00–10:00'},
{id:'end',date:'2026-10-23',time:'09:00–10:00'},
{id:'after',date:'2026-10-24',time:'09:00–10:00'}]}];a.attendance=[];trialState.requests=[];nav('schedule');scheduleSetDate('2026-10-21');scheduleTab('老师课表');
scheduleTeacherSetRange('start','2026-10-21');scheduleTeacherSetRange('end','2026-10-23');`);
assert.deepEqual(json('scheduleDisplayDates()'),['2026-10-21','2026-10-22','2026-10-23']);
assert.deepEqual(json('scheduleVisibleLessons().map(e=>e.key)'),['a|night','a|start','a|end']);
assert(run('schedulePage()').includes('10月21日（周三）'));assert(run('schedulePage()').includes('10月23日（周五）'));
assert(!run('schedulePage()').includes('schedule-date-bar'));assert(!run('schedulePage()').includes('aria-label="选择课表日期"'));
run("scheduleTeacherChoose('李老师')");assert.equal(run('scheduleView().teacherName'),'','unlisted names cannot be selected');run("scheduleTeacherChoose('张老师')");assert.equal(run('scheduleVisibleLessons().length'),3);assert.equal(run('scheduleView().teacherName'),'张老师');
run("scheduleTeacherSetRange('start','2026-10-24')");assert.equal(run('scheduleTeacherRange().start'),'2026-10-21');
run("scheduleTeacherSetRange('end','2026-02-30')");assert.equal(run('scheduleTeacherRange().end'),'2026-10-23');
run("scheduleTab('时间课表');scheduleSetDate('2026-10-24');scheduleTab('老师课表')");assert.equal(run('scheduleTeacherRange().start'),'2026-10-21','custom range retained across tabs');
run(`const OriginalTeacherTestDate=Date;globalThis.Date=class extends OriginalTeacherTestDate{constructor(...args){super(...(args.length?args:['2027-01-03T12:00:00']))}};`);
for(const [offset,start,end] of [[-1,'2026-12-21','2026-12-27'],[0,'2026-12-28','2027-01-03'],[1,'2027-01-04','2027-01-10']]){
 run(`scheduleTeacherQuickWeek(${offset})`);assert.deepEqual(json('scheduleTeacherRange()'),{start,end});assert.equal(run('scheduleDisplayDates().length'),7);
}
run('globalThis.Date=OriginalTeacherTestDate');
for(const kind of ['teacher','room']){
 run(`scheduleTab('${kind==='teacher'?'老师课表':'教室课表'}');scheduleSetDate('2026-10-21');scheduleResourceSetRange('${kind}','end','2026-10-26')`);
 assert.equal(run(`scheduleResourceRange('${kind}').end`),'2026-10-25','eight inclusive days rejected');
 run(`scheduleResourceSetRange('${kind}','start','2026-10-18')`);
 assert.equal(run(`scheduleResourceRange('${kind}').start`),'2026-10-19','extending start beyond seven days rejected');
 run(`scheduleResourceSetRange('${kind}','start','2026-10-25')`);
 assert.equal(run('scheduleDisplayDates().length'),1,'single day allowed');
 run(`scheduleResourceSetRange('${kind}','end','2026-10-31')`);
 assert.equal(run('scheduleDisplayDates().length'),7,'seven inclusive days allowed across weeks');
 run(`scheduleResourceSetRange('${kind}','end','2026-11-01')`);
 assert.equal(run('scheduleDisplayDates().length'),7,'invalid change preserves existing range');
}
run(`state.campuses.push({name:'乙校区',active:true});a.classes.push({...a.classes[0],id:'b',campus:'乙校区'});scheduleSetCampus('');scheduleSetDate('2026-10-21');scheduleRoomChoose(scheduleRoomKey('甲校区','101'));`);
assert.equal(run('scheduleResources("room",scheduleVisibleLessons()).length'),1);
assert(run('scheduleVisibleLessons().every(e=>e.campus==="甲校区")'),'same-named rooms at different campuses are distinct');
assert(run('scheduleRoomControls()').includes('101 · 甲校区'));
run(`scheduleRoomChoose('fake');`);assert.equal(run('scheduleView().roomKey'),JSON.stringify(['甲校区','101']));
run(`scheduleSetCampus('乙校区')`);assert.equal(run('scheduleView().roomKey'),'','campus change clears unavailable selection');
assert(!run('schedulePage()').includes('aria-label="搜索课表"'));
assert(!run('schedulePage()').includes('schedule-date-bar'));
handlers();console.log('PASS: teacher/room ranges, seven-day limits, room selection and campus isolation, week shortcuts and date boundaries.');
