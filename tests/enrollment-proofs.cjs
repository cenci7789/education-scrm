const assert=require('node:assert/strict');
const {run,node,page,context}=require('./lead-registration.cjs');
let seq=0;const revoked=[];
context.URL={createObjectURL:()=>`blob:receipt-${++seq}`,revokeObjectURL:url=>revoked.push(url)};
let studentSequence=0;
function open(){
  run("permissionChangeIdentity('admin');a.selectedStudent=null;state.page='quickEnroll';render();a.enrollment.data.name='凭证测试';a.enrollment.data.phone='13812345678';a.enrollment.data.grade='小二';a.enrollStep=2;enrollmentOpenClasses();enrollmentToggleClass(a.classes[0].id,true);enrollmentConfirmClasses();enrollmentClassesNext()");
  run('a.enrollment.data.name += '+JSON.stringify(String(++studentSequence)));
  node('#pay-channel').value='现金';node('#pay-amount').value='1000';node('#pay-note').value='';
}
function add(index=0,name='收款凭证.png',type='image/png'){
  run(`enrollmentAddProofs(${index},[{name:${JSON.stringify(name)},type:${JSON.stringify(type)},size:123}])`);
}
const snapshot=()=>run('JSON.stringify({students:a.students,orders:a.orders,leads:leadState.leads})');
open();assert(page().includes('上传凭证（必填）'));assert(page().includes('type="file"'));
let before=snapshot();run('finishEnroll()');assert.equal(snapshot(),before,'manual receipt cannot submit without proof');
node('#pay-amount').value='0';run('finishEnroll()');assert.equal(snapshot(),before,'manual zero still needs proof');
node('#pay-amount').value='1000';
run("enrollmentAddProofs(0,[{name:'bad.exe',type:'application/octet-stream',size:100},{name:'empty.png',type:'image/png',size:0},{name:'large.pdf',type:'application/pdf',size:21*1024*1024}])");
assert.equal(run('enrollmentCheckout().receipts[0].proofs.length'),0);
add();add(0,'银行回单.pdf','application/pdf');
assert(page().includes('银行回单.pdf'));assert(page().includes('<img src="blob:receipt-1"'));
run('enrollmentPaymentBack();enrollmentClassesNext()');
assert.equal(run('enrollmentCheckout().receipts[0].proofs.length'),2);
run('enrollmentRemoveProof(0,0)');assert(revoked.includes('blob:receipt-1'));
run('enrollmentRemoveProof(0,0)');before=snapshot();run('finishEnroll()');assert.equal(snapshot(),before);
add();const first=run('enrollmentCheckout().receipts[0].proofs[0].url');
node('#pay-amount').value='500';run('enrollmentAddReceipt()');
node('#pay-channel-1').value='POS刷卡';node('#pay-amount-1').value='500';
before=snapshot();run('finishEnroll()');assert.equal(snapshot(),before,'every split receipt requires proof');
add(1,'第二笔.docx','application/vnd.openxmlformats-officedocument.wordprocessingml.document');
const second=run('enrollmentCheckout().receipts[1].proofs[0].url');
run('finishEnroll()');
assert.equal(run('a.orders[0].receipts.length'),2);
assert.equal(run('a.orders[0].receipts[0].proofs[0].url'),first);
assert.equal(run('a.orders[0].receipts[1].proofs[0].url'),second);
assert(!revoked.includes(first));assert(!revoked.includes(second));
assert(page().includes('收款凭证（2）'));assert(page().includes('download="第二笔.docx"'));
assert.equal(run('a.enrollment'),null);
open();add();const abandoned=run('enrollmentCheckout().receipts[0].proofs[0].url');
run("nav('students')");assert(revoked.includes(abandoned));
assert(!revoked.includes(first));assert(!revoked.includes(second));
open();add();const hidden=run('enrollmentCheckout().receipts[0].proofs[0].url');
run("enrollmentChangePayMode('商城支付');finishEnroll()");
assert.equal(run('a.orders[0].paid'),'¥0.00');
assert.equal(run('a.orders[0].receipts.length'),0);
assert(revoked.includes(hidden),'hidden manual proofs must not attach to an online order');
console.log('PASS: required per-receipt proof including zero; accepted images/documents; file guards; preview/removal; step retention; split-receipt validation; saved order links; saved URL ownership; abandoned and hidden-proof cleanup.');
