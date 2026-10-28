const assert=require('node:assert/strict');
const {run:execute,json,node,ctx}=require('./prototype-runtime.cjs')();
function run(code){try{return execute(code)}catch(error){console.error('While executing:',code);throw error}}
ctx.URL.createObjectURL=()=> 'blob:mvp-proof';ctx.URL.revokeObjectURL=()=>{};
run(`permissionChangeIdentity('admin');leadState.leads.unshift({...leadState.leads[0],leadId:'MVP-LEAD',studentId:null,name:'MVP链路学生',phone:'13888880001',grade:'小三',stage:'新线索',status:'mine',history:[]});leadState.selected=0;leadState.detailOrigin='myLeads';state.page='leadDetail'`);
const initialStudents=run('a.students.length'),initialOrders=run('a.orders.length');
run('leadToEnrollment()');
assert.equal(run('a.students.length'),initialStudents,'opening enrollment never creates a student');
run(`state.page='myLeads';render();leadState.selected=0;leadToEnrollment()`);
assert.equal(run('a.students.length'),initialStudents,'cancel/reopen never duplicates a student');
assert.equal(run('a.enrollingLeadId'),'MVP-LEAD');
// A trial may have created a student before enrollment; reuse its stable identity.
run(`state.page='myLeads';render();a.students.push({id:'MVP-STUDENT',originLeadId:'MVP-LEAD',name:'MVP链路学生',phone:'13888880001',grade:'小三',status:'试听',className:'—',enrollments:[]});leadState.selected=0;leadToEnrollment()`);
assert.equal(run('enrollmentStudent().id'),'MVP-STUDENT');
const selectedIndex=run('a.selectedStudent');
node('input[name="modal-student"]:checked').value=String(selectedIndex);
run('selectModalStudent()');
assert.equal(run('a.enrollingLeadId'),'MVP-LEAD','choosing matching existing student retains lead attribution');
node('input[name="modal-student"]:checked').value='0';
run('selectModalStudent()');
assert.equal(run('enrollmentStudent().id'),'MVP-STUDENT','cannot attach another student to this lead');
// Array insertions must not retarget an open enrollment draft.
run(`a.students.unshift({id:'OTHER',name:'另一位学生',phone:'13888880002'});a.enrollStep=2;enrollmentOpenClasses();enrollmentToggleClass(a.classes[0].id,true);enrollmentConfirmClasses();enrollmentClassesNext()`);
assert.equal(run('enrollmentStudent().id'),'MVP-STUDENT');
node('#pay-channel').value='现金';node('#pay-amount').value='400';
run(`enrollmentAddProofs(0,[{name:'receipt.png',type:'image/png',size:100}]);finishEnroll();finishEnroll()`);
assert.equal(run('a.orders.length'),initialOrders+1);
assert.equal(run('a.students.length'),initialStudents+2);
assert.equal(run('a.orders[0].studentId'),'MVP-STUDENT');
assert.equal(run('a.orders[0].originLeadId'),'MVP-LEAD');
assert.equal(run('a.orders[0].status'),'等待付款');
assert.equal(run(`a.students.find(s=>s.id==='MVP-STUDENT').status`),'在读','partial payment permits attending');
assert.equal(run(`leadState.leads.find(l=>l.leadId==='MVP-LEAD').stage`),'已报名');
assert.equal(run(`shortcutConvertedLeadIds().has('MVP-LEAD')`),false,'partial payment is not a successful conversion');
assert.equal(run(`leadState.leads.find(l=>l.leadId==='MVP-LEAD').history.filter(h=>h[0]==='报名完成').length`),1);
// Refresh breaks object references. Supplement must still update the original order and enrollment.
run('businessRestore(JSON.parse(JSON.stringify(businessSnapshot())))');
run(`state.page='supplement';a.selectedStudent=a.students.findIndex(s=>s.id==='MVP-STUDENT');supplementSelectClass(a.orders[0].items[0].classId)`);
const debt=run('supplementFeeData().debt');assert(debt>0);
run(`supplementReceiptField(0,'channel','POS刷卡');supplementReceiptField(0,'amount','${debt/100}');supplementDraft().receipts[0].proofs=[{fileName:'补费回单.pdf',url:'blob:supplement-fixture'}];supplementSubmit();supplementDraft().receipts[0].proofs=[{fileName:'补费回单.pdf',url:'blob:supplement-fixture'}];supplementSubmit()`);
assert.equal(run('a.orders[0].status'),'交易成功');
assert.equal(run(`shortcutConvertedLeadIds().has('MVP-LEAD')`),true);
assert.equal(run(`a.students.find(s=>s.id==='MVP-STUDENT').enrollments[0].paidCents`),run('a.orders[0].items[0].dueCents'));
assert.equal(run(`(a.supplementRecords||[]).filter(r=>r.studentId==='MVP-STUDENT').length`),1);
assert.equal(run(`a.orders[0].items[0].orderId`),run('a.orders[0].id'));
console.log('PASS MVP lead → trial-student reuse → partial enrollment → snapshot restore → supplement → successful conversion; cancellation, identity, source and duplicate-submit guards.');
