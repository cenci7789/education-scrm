const assert=require('node:assert/strict');
const {run,node,page}=require('./lead-registration.cjs');
const date=`${new Date().getFullYear()+1}-12-01`;
run(`permissionChangeIdentity('admin');trialStart();Object.assign(trialState.draft,{name:'课节测试',phone:'13912345678',grade:'小二'});trialState.step=2;
  a.classes[0].sessions=[
    {id:'ended',name:'已结束',date:'2000-01-01',time:'08:00–10:00'},
    {id:'one',name:'第1讲',date:'${date}',time:'08:00–10:00'},
    {id:'two',name:'第2讲',date:'${date}',time:'10:00–12:00'},
    {id:'cancelled',name:'已取消',date:'${date}',time:'14:00–16:00',cancelled:true}
  ];render()`);
assert(page().includes('trial-class-module'));assert(page().includes('trial-booking-module'));
assert(page().includes('<th>下节课上课时间</th>'));
assert(!page().includes('<th>上课时间</th>'));
assert.equal(run('trialFilteredClasses()[0].nextSession.id'),'one');
assert(page().includes(run('trialSessionDateHtml(trialSessionDisplay(trialFilteredClasses()[0].nextSession))')));
assert(!page().includes('2000-01-01'));
assert(page().includes('选择课节'));assert(!page().includes('type="checkbox"'));
node('#trial-note').value='保留预约备注';
run("a.classes[0].sessions.push({id:'started',name:'已开始课节',startsAt:new Date(Date.now()-60000).toISOString()},{id:'upcoming',name:'稍后课节',startsAt:new Date(Date.now()+3600000).toISOString()},{id:'unscheduled',name:'待排课',startsAt:'invalid'})");
run("a.classes[0].sessions.push({id:'cancelled-soon',startsAt:new Date(Date.now()+1800000).toISOString(),cancelled:true})");
assert.equal(run('trialFilteredClasses()[0].nextSession.id'),'upcoming','skip past/cancelled/invalid sessions and choose the earliest future start');
run('trialOpenSessions(a.classes[0].id)');
assert(page().includes('role="dialog"'));assert(page().includes('第1讲'));
assert(!page().includes('value="ended"'));assert(!page().includes('2000-01-01'));assert(page().includes('value="cancelled"  disabled'));
assert(!page().includes('value="started"'));assert(!page().includes('value="unscheduled"'));assert(page().includes('value="upcoming"'));
const weekday=['周日','周一','周二','周三','周四','周五','周六'][new Date(date+'T08:00').getDay()];
assert(page().includes(`${date}<span class="trial-session-weekday">（${weekday}）</span>`));
run('trialCloseSessions()');
assert.equal(run('trialState.draft.classes.length'),0);
assert.equal(run('trialState.draft.note'),'保留预约备注');
run("trialOpenSessions(a.classes[0].id);trialState.draft.sessionPicker.selected='ended';trialConfirmSession()");
assert.equal(run('trialState.draft.classes.length'),0);
run("trialState.draft.sessionPicker.selected='one';trialConfirmSession()");
assert.equal(run('trialState.draft.classes.length'),1);
assert.equal(run('trialState.draft.classes[0].preferredTime'),date+'T08:00');
assert(page().includes('<th>预约班级</th>'));assert(page().includes('<th>试听时间</th>'));
assert(page().includes('第1讲'));assert(!page().includes('datetime-local'));
run("trialOpenSessions(a.classes[0].id);trialState.draft.sessionPicker.selected='two';trialConfirmSession()");
assert.equal(run('trialState.draft.classes.length'),1);
assert.equal(run('trialState.draft.classes[0].sessionId'),'two');
run('a.classes[0].sessions[2].cancelled=true;trialNextStep()');
assert.equal(run('trialState.step'),2);
run('a.classes[0].sessions[2].cancelled=false;trialNextStep()');
assert.equal(run('trialState.step'),3);
const before=run('JSON.stringify({orders:a.orders,roster:a.classes[0].trialRoster})');
run('trialSubmit()');
assert.equal(run('trialState.requests[0].requestedSessionId'),'two');
assert.equal(run('trialState.requests[0].requestedSessionName'),'第2讲');
assert.equal(run('trialState.requests[0].preferredTime'),date+'T10:00');
assert.equal(run('trialState.requests[0].classId'),null);
assert.equal(run('trialState.requests[0].status'),'待排班');
assert.equal(run('JSON.stringify({orders:a.orders,roster:a.classes[0].trialRoster})'),before);
run("trialStart();trialState.step=2;render();trialOpenSessions(a.classes[1].id)");
assert(page().includes('暂无可预约课节'));
run("trialCloseSessions();trialSetClassFilter('grade','4年级')");
assert(node('#trial-class-results').innerHTML.includes('暂无后续课节'));
console.log('PASS: separate filter/booking modules; lesson picker, cancel, expired/cancelled guards, change without duplicate class, auto time, stale lesson validation, pending request retains lesson snapshot.');
