const assert=require('node:assert/strict');
const {run,node,page,addPaymentProof}=require('./lead-registration.cjs');
run("permissionChangeIdentity('admin');a.selectedStudent=null;state.page='quickEnroll';render();a.enrollment.data={...a.enrollment.data,name:'多班报名',phone:'13912345678',grade:'小三',subjects:['数学','英语']};a.enrollStep=2;academicRender()");
assert(!page().includes('单个报名'));assert(!page().includes('批量报名'));
assert(page().includes('已选班级'));
assert(page().indexOf('enrollment-class-header')<page().indexOf('已选班级'));
assert.equal((page().match(/onclick="enrollmentOpenClasses\(\)"/g)||[]).length,1);
// Explicit fixtures supply live/face-to-face formats, grade aliases and time boundaries.
run(`a.courses.push({name:'直播数学',fee:500,materialFee:20,totalSessions:5},{name:'面授英语',fee:400,materialFee:0,totalSessions:4},{name:'数学',fee:500,materialFee:0,totalSessions:5});a.classes.push(
 {id:'live-noon',name:'中午直播数学',course:'直播数学',grade:'小三',subject:'数学',classType:'提高班',campus:'园区校区',term:'秋季',teacher:'李老师',date:'2026-10-21',time:'12:00–14:00',teachingFormat:'直播',students:2,capacity:20,totalSessions:5,fee:500,materialFee:20},
 {id:'evening',name:'晚间面授英语',course:'面授英语',grade:'3年级',subject:'英语',classType:'尖子班',campus:'城中校区',term:'春季',teacher:'王老师',date:'2026-10-22',time:'18:00–20:00',teachingFormat:'面授',students:3,capacity:20,totalSessions:4,fee:400,materialFee:0},
 {id:'before-noon',name:'上午跨时段数学',course:'数学',grade:'小三',subject:'数学',classType:'提高班',campus:'园区校区',term:'秋季',teacher:'李老师',date:'2026-10-23',time:'11:59–13:30',teachingFormat:'面授',students:1,capacity:20,totalSessions:5,fee:500,materialFee:0});enrollmentOpenClasses()`);
assert(!page().includes('modal-backdrop'));assert(page().includes('返回单个报名'));
assert.equal(run('a.enrollment.classPicker.filters.grade'),'小三');
assert(page().includes('value="小三" selected'));
assert.equal(run('enrollmentFilteredClasses().length'),3);
run("enrollmentSetClassFilter('grade','4年级')");
assert.equal(run('enrollmentFilteredClasses()[0].id'),'5683393');
assert.equal(run('a.enrollment.data.grade'),'小三','filter changes do not edit student grade');
run("enrollmentSetClassFilter('grade','')");
assert.equal(run('enrollmentFilteredClasses().length'),6,'all grades remains available');
run("enrollmentCancelClasses();a.enrollment.data.grade='高三';enrollmentOpenClasses()");
assert(page().includes('value="高三" selected'),'grade is visible even without matching classes');
assert.equal(run('enrollmentFilteredClasses().length'),0);
run("enrollmentCancelClasses();a.enrollment.data.grade='小三';enrollmentOpenClasses()");
for(const label of ['年级','科目','班型','校区','学期','老师','时间','授课形式','搜索班级名称'])assert(page().includes(label));
for(const [time,band] of [['05:59–08:00',''],['06:00–08:00','上午'],['11:59–14:00','上午'],['12:00–14:00','下午'],['17:59–20:00','下午'],['18:00–20:00','晚上'],['21:59–23:00','晚上'],['22:00–23:30',''],['24:00',''],['bad','']]){
  assert.equal(run(`enrollmentTimeBand('${time}')`),band,time);
}
const ids=()=>JSON.parse(run('JSON.stringify(enrollmentFilteredClasses().map(c=>c.id))'));
for(const [key,value,expected] of [['grade','小三',['live-noon','evening','before-noon']],['subject','英语',['evening']],['classType','提高班',['live-noon','before-noon']],['campus','园区校区',['5683393','live-noon','before-noon']],['term','春季',['5683440','evening']],['teacher','李老师',['live-noon','before-noon']],['time','上午',['5683440','before-noon']],['format','直播',['live-noon']],['search','晚间',['evening']]]){
  run(`a.enrollment.classPicker.filters={};enrollmentSetClassFilter('${key}','${value}')`);
  assert.deepEqual(ids(),expected,key);
}
run("enrollmentSetClassFilter('teacher','李老师')");
assert.equal(ids().length,0,'filters compose with AND');
assert(node('#enrollment-class-results').innerHTML.includes('没有符合'));
run("enrollmentResetClassFilters();enrollmentToggleClass('live-noon',true);enrollmentSetClassFilter('format','面授');enrollmentToggleClass('evening',true)");
assert.equal(run('a.enrollment.classPicker.ids.length'),2,'hidden selections persist');
assert.equal(node('#enrollment-selection-count').textContent,'2');
run('enrollmentConfirmClasses()');
assert.equal(run('a.enrollment.classPicker'),null);assert.equal(run('a.enrollStep'),2);
assert.equal(run('a.enrollment.classes.length'),2);
assert.equal(run('a.enrollment.data.subjects.join("、")'),'数学、英语');
assert(page().includes('中午直播数学'));assert(page().includes('晚间面授英语'));
assert(page().includes('教辅'));assert(page().includes('进班首讲'));
assert.equal(run('enrollmentTotal()'),92000);
run("enrollmentChangeClass(0,'startSession','2');enrollmentChangeClass(1,'signupType','续费')");
assert.equal(run('enrollmentTotal()'),82000);
assert(page().includes('820.00'));
const before=run('JSON.stringify(a.enrollment.classes)');
run("enrollmentOpenClasses();enrollmentToggleClass('live-noon',false);enrollmentCancelClasses()");
assert.equal(run('JSON.stringify(a.enrollment.classes)'),before,'cancel preserves confirmed selections/settings');
run("enrollmentOpenClasses();enrollmentToggleClass('before-noon',true);enrollmentConfirmClasses()");
assert.equal(run('a.enrollment.classes[0].startSession'),2,'reopening preserves start session');
assert.equal(run('a.enrollment.classes[1].signupType'),'续费');
run('enrollmentRemoveClass(2)');assert.equal(run('a.enrollment.classes.length'),2);
assert.equal(run('a.enrollment.data.subjects.join("、")'),'数学、英语','duplicate subject is deduplicated');
run('enrollmentClassesNext()');assert.equal(run('a.enrollStep'),3);
assert(page().includes('中午直播数学'));assert(page().includes('晚间面授英语'));
assert(page().includes('820.00'));
const studentCount=run('a.students.length'),orderCount=run('a.orders.length');
node('#pay-channel').value='微信';node('#pay-amount').value='820';
addPaymentProof();
run('finishEnroll()');
assert.equal(run('a.students.length'),studentCount+1);assert.equal(run('a.orders.length'),orderCount+1);
assert.equal(run('a.orders[0].items.length'),2);
assert.equal(run('a.orders[0].items[0].startSession'),2);
assert.equal(run('a.orders[0].amount'),'¥820.00');assert.equal(run('a.orders[0].paid'),'¥820.00');
assert.equal(run('a.students[0].enrollments.length'),2);
assert.equal(run('a.students[0].classNames.length'),2);
assert.equal(run('state.page'),'orders');
run('finishEnroll()');assert.equal(run('a.orders.length'),orderCount+1,'repeat submit does not duplicate order');
// Empty selection and deleted classes cannot advance or save.
run("state.page='enroll';a.selectedStudent=null;render();a.enrollment.data.name='测试';a.enrollment.data.phone='13812345678';a.enrollment.data.grade='初一';a.enrollment.data.subjects=['数学'];a.enrollStep=2;enrollmentClassesNext()");
assert.equal(run('a.enrollStep'),2);
run("enrollmentOpenClasses();enrollmentConfirmClasses()");
assert(run('Boolean(a.enrollment.classPicker)'));
run("enrollmentToggleClass('live-noon',true);enrollmentConfirmClasses();a.classes=a.classes.filter(c=>c.id!=='live-noon');enrollmentClassesNext()");
assert.equal(run('a.enrollStep'),2);
assert.equal(run('enrollmentClassPrice({classId:"missing",startSession:1})'),null);
// Lead-origin enrollment retains linkage and all selected classes in the resulting history.
run("leadNav('myLeads');leadDetail(0,'myLeads');leadState.leads[0].grade='初二';leadState.leads[0].subject='数学';leadToEnrollment();a.enrollStep=2;enrollmentOpenClasses();enrollmentToggleClass(a.classes[0].id,true);enrollmentToggleClass(a.classes[1].id,true);enrollmentConfirmClasses();enrollmentClassesNext()");
const leadId=run('a.enrollingLeadId'),leadHistory=run('leadState.leads[0].history.length');
node('#pay-channel').value='现金';node('#pay-amount').value='2000';
addPaymentProof();
run('finishEnroll()');
assert.equal(run('a.orders[0].originLeadId'),leadId);
assert.equal(run('a.orders[0].items.length'),2);
assert.equal(run('leadState.leads[0].stage'),'已报名');
assert.equal(run('leadState.leads[0].history.length'),leadHistory+1);
for(const className of JSON.parse(run('JSON.stringify(a.orders[0].items.map(x=>x.className))'))){
  assert(run('leadState.leads[0].history.at(-1)[2]').includes(className));
}
console.log('PASS: inline multi-class picker; all filters; start-time boundaries; persistent hidden selections; cancel/confirm/removal; per-class sessions and pricing; multi-item payment/order/student persistence; invalid/empty classes; duplicate-submit guard.');
