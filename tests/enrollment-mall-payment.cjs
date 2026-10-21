const assert=require('node:assert/strict');
const {run,node,page,addPaymentProof}=require('./lead-registration.cjs');
run("permissionChangeIdentity('admin');state.page='quickEnroll';a.selectedStudent=null;render();a.enrollment.data.name='商城支付测试';a.enrollment.data.phone='13912345678';a.enrollment.data.grade='小二';a.enrollStep=2;enrollmentOpenClasses();enrollmentToggleClass(a.classes[0].id,true);enrollmentConfirmClasses();enrollmentClassesNext()");
node('#pay-channel').value='微信';node('#pay-amount').value='1000';
node('#pay-note').value='保留备注';
const before=run('JSON.stringify(a.orders)');
function assertOptions(){
  assert.equal((page().match(/name="checkout-mode"/g)||[]).length,2);
  assert(page().includes('商城支付'));assert(page().includes('手动录入'));
  for(const removed of ['学生端支付','扫码支付','打开收款弹窗','checkout-scan-title'])assert(!page().includes(removed),removed);
}
assertOptions();
run("enrollmentChangePayMode('商城支付')");
assertOptions();
assert(page().includes('商城支付尚未接入支付服务'));
assert.equal(run('enrollmentCheckout().receipts[0].amount'),'1000');
assert.equal(run('enrollmentCheckout().note'),'保留备注');
assert.equal(run('JSON.stringify(a.orders)'),before);
run("enrollmentChangePayMode('手动录入')");
assertOptions();
assert(page().includes('上传凭证（必填）'));
run('finishEnroll()');assert.equal(run('JSON.stringify(a.orders)'),before);
addPaymentProof();run('finishEnroll()');
assert.equal(run('a.orders[0].paid'),'¥1000.00');
assert.equal(run('a.orders[0].receipts[0].proofs.length'),1);
console.log('PASS: only manual/mall payment options; no scan dialog; switching retains manual draft; manual receipt proof remains required.');
