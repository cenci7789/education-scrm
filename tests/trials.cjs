const assert=require('node:assert/strict');
const {run,node,page,context}=require('./lead-registration.cjs');
const time=`${new Date().getFullYear()+1}-12-01T10:00`;
function set(id,value){node('#'+id).value=value}
function student(name,phone='13898765432'){
  set('trial-name',name);set('trial-phone',phone);set('trial-grade','小三');set('trial-guardian','妈妈');
}
function intention(index=0){
  run(`[...trialState.draft.classes].forEach(item=>trialToggleClass(item.classId,false));trialToggleClass(a.classes[${index}].id,true)`);
  run(`trialState.draft.classes[0].preferredTime='${time}'`);set('trial-note','周末试听');
}
function submitNew(name,phone){
  run('trialStart()');student(name,phone);run('trialNextStep()');intention();run('trialNextStep();trialSubmit()');
  return run('trialState.requests[0].id');
}
function prepare(id,classIndex=0){
  run(`state.page='trialManage';render();trialOpenReview(${id})`);
  set('trial-confirm-class',run(`a.classes[${classIndex}].id`));
  set('trial-confirm-time',time);set('trial-schedule-note','提前10分钟到教室');
}
run("permissionChangeIdentity('sales');trialStart()");
assert(page().includes('学生信息'));
assert(page().includes('试听意向'));
assert(!page().includes('modal-backdrop'));
assert.equal(run("permissionCanVisit('trialManage')"),false);
student('','');run('trialNextStep()');assert.equal(run('trialState.step'),1);
student('试听新生','abc');run('trialNextStep()');assert.equal(run('trialState.step'),1);
student('试听新生');run('trialNextStep()');assert.equal(run('trialState.step'),2);
intention();run("trialState.draft.classes[0].preferredTime='2000-01-01T10:00';trialNextStep()");assert.equal(run('trialState.step'),2);
intention();run('trialNextStep()');assert.equal(run('trialState.step'),3);
assert(page().includes('周末试听'));
run('trialPreviousStep()');assert(page().includes(time.replace('T',' ')));
run('trialNextStep()');
const beforeStudents=run('a.students.length'),beforeClasses=run('JSON.stringify(a.classes)'),beforeOrders=run('JSON.stringify(a.orders)');
run('trialSubmit();trialSubmit()');
assert.equal(run('trialState.requests.length'),1);
assert.equal(run('trialState.requests[0].status'),'待排班');
assert.equal(run('a.students.length'),beforeStudents);
assert.equal(run('JSON.stringify(a.classes)'),beforeClasses);
assert.equal(run('JSON.stringify(a.orders)'),beforeOrders);
assert(page().includes('等待教务确认'));
const first=run('trialState.requests[0].id');
set('trial-confirm-class',run('a.classes[0].id'));set('trial-confirm-time',time);
run(`trialConfirm(${first})`);
assert.equal(run('trialState.requests[0].status'),'待排班');
run("state.page='trialManage';render()");
assert(page().includes('无权限'));
submitNew('试听新生');
assert.equal(run('trialState.requests.length'),1,'duplicate pending application blocked');
run("permissionChangeIdentity('academic')");
assert(page().includes('试听新生'));
prepare(first,1);run(`trialConfirm(${first})`);assert.equal(run('trialState.requests[0].status'),'待排班');
prepare(first);set('trial-confirm-time','2000-01-01T10:00');run(`trialConfirm(${first})`);
assert.equal(run('trialState.requests[0].status'),'待排班');
prepare(first);run(`a.classes[0].students=a.classes[0].capacity;trialConfirm(${first})`);
assert.equal(run('trialState.requests[0].status'),'待排班');
run(`a.classes[0].students=1;a.courses[0].active=false;trialConfirm(${first})`);
assert.equal(run('trialState.requests[0].status'),'待排班');
run(`a.courses[0].active=true;state.campuses[0].active=false;trialConfirm(${first})`);
assert.equal(run('trialState.requests[0].status'),'待排班');
run(`state.campuses[0].active=true;trialConfirm(${first});trialConfirm(${first})`);
assert.equal(run('trialState.requests[0].status'),'已排班');
assert.equal(run('a.students.length'),beforeStudents+1);
assert.equal(run('a.students.at(-1).status'),'试听');
assert.equal(run('a.classes[0].students'),1);
assert.equal(run('a.classes[0].trialRoster.length'),1);
assert.equal(run('JSON.stringify(a.orders)'),beforeOrders);
assert.equal(run('trialState.requests[0].confirmedBy'),'教务岗');
assert.equal(run('trialState.requests[0].scheduledTime'),time);
run("nav('classes')");assert(page().includes('试听名单（已确认排班）'));assert(page().includes('试听新生'));
run("a.tab='试听学生';nav('students')");assert(page().includes('试听新生'));
run("a.selectedStudent=a.students.length-1;nav('studentDetail')");
assert(page().includes('尚未产生正式报名订单'));assert(!page().includes('¥1,000.00'));
run(`state.page='trialManage';trialOpenReview(${first})`);assert(page().includes('提前10分钟到教室'));
assert(!page().includes('onclick="trialConfirm('));

// Same person is linked to the existing trial student; the same slot cannot be scheduled twice.
run("permissionChangeIdentity('sales')");
const duplicate=submitNew('试听新生');
run("permissionChangeIdentity('academic')");prepare(duplicate);run(`trialConfirm(${duplicate})`);
assert.equal(run('trialState.requests[0].status'),'待排班');
assert.equal(run('a.students.length'),beforeStudents+1);
set('trial-confirm-time',time.replace('10:00','11:00'));run(`trialConfirm(${duplicate})`);
assert.equal(run('a.students.length'),beforeStudents+1);
assert.equal(run('a.classes[0].trialRoster.length'),2);

// Another new student fills the last seat for this session, without changing other sessions.
run("permissionChangeIdentity('sales')");
const other=submitNew('另一学生','13912345678');
run("permissionChangeIdentity('academic')");prepare(other);run(`a.classes[0].capacity=2;trialConfirm(${other})`);
assert.equal(run('trialState.requests[0].status'),'待排班');
assert.equal(run('a.students.length'),beforeStudents+1);
set('trial-schedule-note','');run(`trialCancel(${other})`);assert.equal(run('trialState.requests[0].status'),'待排班');
set('trial-schedule-note','家长时间不合适');run(`trialCancel(${other});trialConfirm(${other})`);
assert.equal(run('trialState.requests[0].status'),'已取消');
assert.equal(run('a.students.length'),beforeStudents+1);
run('a.classes[0].capacity=20');

// Existing enrolled students retain formal enrollment and can try a different class.
run("permissionChangeIdentity('sales');trialStart();trialPickStudent(a.students[0].id)");
student(run('a.students[0].name'),run('a.students[0].phone'));
const originalStudent=run('JSON.stringify(a.students[0])');
run('trialNextStep()');intention(1);run('trialNextStep();trialSubmit()');
const existing=run('trialState.requests[0].id');
run("permissionChangeIdentity('academic')");prepare(existing,1);run(`trialConfirm(${existing})`);
assert.equal(run('trialState.requests[0].status'),'已排班');
assert.equal(run('JSON.stringify(a.students[0])'),originalStudent);
assert.equal(run('a.students.length'),beforeStudents+1);

// Lead entry follows the same pending workflow and returns the final arrangement to its history.
run("permissionChangeIdentity('admin');leadDetail(0,'myLeads');leadOpenAction('trial')");
assert.equal(run('state.page'),'quickTrial');assert(!page().includes('modal-backdrop'));
student(run('trialState.draft.name'),run('trialState.draft.phone'));run('trialNextStep()');intention();
const stage=run('leadState.leads[0].stage');
run('trialNextStep();trialSubmit()');
const leadRequest=run('trialState.requests[0].id');
assert.equal(run('leadState.leads[0].history.at(-1)[0]'),'预约试听');
assert.equal(run('leadMyCategory(leadState.leads[0])'),'约试听');
assert.equal(run('leadState.leads[0].stage'),stage);
prepare(leadRequest);set('trial-confirm-time',time.replace('10:00','12:00'));run(`trialConfirm(${leadRequest})`);
assert.equal(run('leadState.leads[0].history.at(-1)[0]'),'试听排班');
assert.equal(run('leadMyCategory(leadState.leads[0])'),'约试听');
assert.equal(run('leadState.leads[0].stage'),stage);
assert.equal(run('JSON.stringify(a.orders)'),beforeOrders);
const confirmedId=run('a.classes[0].id'),roster=run('JSON.stringify(a.classes[0].trialRoster)');
// Editing a class must preserve IDs and trial roster links.
set('class-name',run('a.classes[0].name'));set('class-capacity','20');
run('a.selectedClass=0;saveClass()');
assert.equal(run('a.classes[0].id'),confirmedId);
assert.equal(run('JSON.stringify(a.classes[0].trialRoster)'),roster);
run("permissionChangeIdentity('sales');state.page='quickTrial';render()");
assert(page().includes('预约试听'));assert(!page().includes('我的预约'));
run("permissionChangeIdentity('finance');trialSubmit()");
assert.equal(run("permissionCanVisit('quickTrial')"),false);
// Exercise the exact HTML script order, including unrelated modules that wrap rendering.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const shell=vm.createContext({document:context.document,URL,location:{href:'https://prototype.example.test/'},setTimeout(){},setInterval(){return 1},clearInterval(){}});
for(const match of html.matchAll(/<script(?: src="([^"]+)")?>([\s\S]*?)<\/script>/g)){
  vm.runInContext(match[1]?fs.readFileSync(path.join(root,match[1]),'utf8'):match[2],shell);
}
for(const [route,title] of [['quickTrial','预约试听'],['trialManage','试听管理'],['quickEnroll','报名'],['classes','班级管理']]){
  vm.runInContext(`state.page='${route}';render()`,shell);
  assert(page().includes(title));
}
assert(html.indexOf('data-page="quickTrial"')<html.indexOf('data-page="quickEnroll"'));
assert(html.includes('data-page="trialManage"'));
console.log('PASS: trial wizard, pending-only submit, academic permission, duplicate/capacity/time checks, cancellation, confirmed class roster, student reuse, source lead history, no paid enrollment effects.');
