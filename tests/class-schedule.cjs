const assert=require('node:assert/strict');
const {run,node,page}=require('./lead-registration.cjs');
run(`permissionChangeIdentity('admin');a.courses[0].sessions=[{id:'math-1',name:'有理数'},{id:'math-2',name:'无理数'}];classOpenCreate(0)`);
const template=run('JSON.stringify(a.courses[0].sessions)');
assert(page().includes('有理数'));assert(page().includes('无理数'));
assert(page().includes('classScheduleSetDate(this.value)'));assert(!page().includes('id="class-time"'));
assert(page().includes('设置停课日'));assert.equal((page().match(/id="class-schedule"/g)||[]).length,1);
assert.equal(run('a.classScheduleDraft.rows[0].date'),'');
run("classScheduleSetDate('2026-10-24')");
assert.equal(run('JSON.stringify(a.classScheduleDraft.days)'),'[6]');
assert.equal(run('a.classScheduleDraft.rows[0].date'),'2026-10-24');
assert.equal(run('a.classScheduleDraft.rows[1].date'),'2026-10-31');
assert.equal(run('a.classScheduleDraft.rows[0].start'),'');
run("classScheduleSetSlot(6,0,'start','08:00');classScheduleSetSlot(6,0,'end','10:00')");
assert.equal(run('a.classScheduleDraft.rows[1].start'),'08:00');
assert(node('#class-schedule-rows').innerHTML.includes('value="08:00–10:00" selected'));
node('#class-course').value=run('a.courses[0].name');
assert.equal(run('classSchedulePayload().sessions[1].startsAt'),'2026-10-31T08:00');
assert.equal(run('classSchedulePayload().sessions[1].endsAt'),'2026-10-31T10:00');

// Holiday edits are drafts until confirmation; check skip/unskip and reflow.
run('classScheduleOpenHolidays()');node('#class-holiday-date').value='2026-10-24';run('classScheduleAddHoliday();classScheduleCloseHolidays()');
assert.equal(run('a.classScheduleDraft.holidays.length'),0);
run('classScheduleOpenHolidays();classScheduleAddHoliday();classScheduleAddHoliday();classScheduleConfirmHolidays()');
assert.equal(run('a.classScheduleDraft.holidays.length'),1);
assert.equal(run('a.classScheduleDraft.rows[0].date'),'2026-10-31');
assert.equal(run('a.classScheduleDraft.rows[1].date'),'2026-11-07');
run('classScheduleSkipHolidays(false)');assert.equal(run('a.classScheduleDraft.rows[0].date'),'2026-10-24');
run('classScheduleSkipHolidays(true)');assert.equal(run('a.classScheduleDraft.rows[0].date'),'2026-10-31');

// Multiple daily slots, copying across weekdays, chronological ordering and overlap rejection.
run("classScheduleAddSlot(6);classScheduleSetSlot(6,1,'start','14:00');classScheduleSetSlot(6,1,'end','16:00')");
assert.equal(run('a.classScheduleDraft.rows[1].date'),'2026-10-31');
assert.equal(run('a.classScheduleDraft.rows[1].start'),'14:00');
run("classScheduleSetSlot(6,1,'start','09:00')");assert.equal(run('classSchedulePayload()'),null);
run("classScheduleSetSlot(6,1,'start','14:00');classScheduleToggleDay(0,true);classScheduleCopySlots(6)");
assert.equal(run('a.classScheduleDraft.rows[0].date'),'2026-10-25');
assert.equal(run('a.classScheduleDraft.slots[0][1].start'),'14:00');
run('classScheduleRemoveSlot(6,1);classScheduleRemoveSlot(0,1)');
assert.equal(run('a.classScheduleDraft.rows[1].date'),'2026-10-31');
run("classScheduleSetDate('2026-12-27')");
assert.equal(run('a.classScheduleDraft.rows[1].date'),'2027-01-02');

// Per-lecture overrides are editable, but global rule changes reset them as advertised.
run("classScheduleEditRow(1,'date','2027-01-04')");
assert(run('classScheduleChoices(a.classScheduleDraft.rows[1]).includes("08:00–10:00")'),'a rescheduled weekday can reuse a configured time slot');
run("classScheduleEditRow(1,'date','2027-01-09');classScheduleEditRow(1,'time','08:00–10:00')");
assert.equal(run('classSchedulePayload().sessions[1].date'),'2027-01-09');
run("classScheduleSetSlot(6,0,'start','09:00')");assert.equal(run('a.classScheduleDraft.rows[1].date'),'2027-01-02');
run("classScheduleEditRow(0,'date','2026-12-26');classScheduleEditRow(0,'time','08:00–10:00')");assert.equal(run('classSchedulePayload()'),null);
run('classScheduleGenerate()');
assert.equal(run('JSON.stringify(a.courses[0].sessions)'),template,'scheduling cannot mutate course templates');

// Validated schedules persist on the class and are consumed by the existing trial lesson picker.
node('#class-name').value='讲次排课测试班';node('#class-campus-form').value='城中校区';node('#class-room').value='教室01';
node('#class-extra').value='5';node('#class-teacher-form').value='袁老师';
const before=run('a.classes.length');run('saveClass()');
assert.equal(run('a.classes.length'),before+1);
assert.equal(run('a.classes[0].sessions.length'),2);assert.equal(run('a.classes[0].scheduleSettings.days.length'),2);
assert.equal(run('trialClassSessions(a.classes[0])[1].startsAt'),'2027-01-02T09:00');
const ids=run('JSON.stringify(a.classes[0].sessions.map(s=>s.id))');
run("a.selectedClass=0;nav('classForm')");
assert.equal(run('JSON.stringify(a.classScheduleDraft.rows.map(s=>s.id))'),ids);
assert(page().includes('value="09:00–10:00" selected'));
run("classScheduleSetSlot(6,0,'end','08:00');saveClass()");
assert.equal(run('a.classes[0].sessions[1].endsAt'),'2027-01-02T10:00','invalid edit must not touch saved schedule');
run("classScheduleSetSlot(6,0,'end','11:00');saveClass()");
assert.equal(run('a.classes.length'),before+1);assert.equal(run('a.classes[0].sessions[1].endsAt'),'2027-01-02T11:00');
assert.equal(run('JSON.stringify(a.classes[0].sessions.map(s=>s.id))'),ids);

// Switching courses brings the chosen template, retains class-name customization, and clears stale lectures.
run("classOpenCreate(0);a.courses[1].sessions=[{id:'new-lesson',name:'全新讲次'}]");
node('#class-name').value='自定义班名';node('#class-name').dataset={courseName:run('a.courses[0].name')};
node('#class-course').value=run('a.courses[1].name');run('classCourseChanged()');
assert.equal(run('a.classScheduleDraft.rows.length'),1);assert.equal(run('a.classScheduleDraft.rows[0].name'),'全新讲次');
assert.equal(node('#class-name').value,'自定义班名');
node('#class-course').value=run('a.courses[2].name');run('classCourseChanged()');
assert.equal(run('a.classScheduleDraft.rows.length'),0);assert.equal(run('classSchedulePayload()'),null);
assert.equal(run("classScheduleDate('2026-02-30')"),null);
console.log('PASS: screenshot sequence, course template linkage, weekly/multiple-slot recurrence, holiday draft/skip, year rollover, overrides/reset, invalid schedule rejection, class save/edit and trial integration.');
