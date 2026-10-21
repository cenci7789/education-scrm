const assert=require('node:assert/strict');
const {run,node,page,addPaymentProof}=require('./lead-registration.cjs');
function open(){
  run("permissionChangeIdentity('admin');state.page='quickEnroll';a.selectedStudent=null;render();a.enrollment.data.name='结算测试';a.enrollment.data.phone='13912345678';a.enrollment.data.grade='小二';a.enrollStep=2;enrollmentOpenClasses();enrollmentToggleClass(a.classes[0].id,true);enrollmentToggleClass(a.classes[1].id,true);enrollmentConfirmClasses();enrollmentClassesNext()");
  node('#pay-channel').value='现金';node('#pay-amount').value='';
  node('#pay-note').value='';
}
open();
assert(!page().includes('单个报名'));assert(!page().includes('批量报名'));
for(const label of ['订单确认','购买项目','原价金额（元）','优惠','应收金额（元）','费用结算','原价合计','优惠券','收款','手动录入','商城支付','实收金额','其他信息','经办人','备注','立即报名'])assert(page().includes(label),label);
assert(!page().includes('pay-campus'));assert(!page().includes('经办校区'));
assert(page().includes('结算测试'));assert(page().includes('13912345678'));assert(page().includes('王敏-wangmin'));
assert(page().includes('maxlength="50"'));
assert(!page().includes('<th>优惠</th>'));
assert(!page().includes('checkout-discount-control'));
assert(!page().includes('enrollmentUpdateDiscount'));
assert.equal(run('enrollmentQuote().dueCents'),200000);
// A legacy draft must not silently apply removed item discounts.
run("enrollmentCheckout().discounts={[a.classes[0].id]:{type:'直减',value:'100'},[a.classes[1].id]:{type:'折扣',value:'8'}};enrollmentRefreshQuote()");
assert.equal(run('enrollmentQuote().dueCents'),200000);
assert.equal(run('enrollmentQuote().discountCents'),0);
assert.equal(node('#checkout-due').textContent,'2000.00元');
assert.equal(node('#checkout-item-due-0').textContent,'1000.00');
node('#pay-amount').value='200';
node('#pay-note').value='家长确认 <备注>';
run('enrollmentAddReceipt()');
assert.equal(run('enrollmentCheckout().receipts.length'),2);
assert.equal(run('enrollmentCheckout().receipts[0].amount'),'200');
node('#pay-channel-1').value='微信';node('#pay-amount-1').value='1800';
run('enrollmentToggleCoupon()');
assert(page().includes('核验服务待接入'));assert.equal(run('enrollmentQuote().dueCents'),200000);
assert.equal(run('enrollmentCheckout().receipts[1].amount'),'1800');
run('enrollmentPaymentBack()');assert.equal(run('a.enrollStep'),2);
run('enrollmentClassesNext()');
assert.equal(run('enrollmentQuote().dueCents'),200000);
assert(page().includes('家长确认 &lt;备注&gt;'));
const snapshot=()=>run('JSON.stringify({students:a.students,orders:a.orders,leads:leadState.leads})');
const before=snapshot();
node('#pay-note').value='字'.repeat(51);run('finishEnroll()');assert.equal(snapshot(),before);
node('#pay-note').value='家长确认 <备注>';
for(const amount of ['','-1','0.001','1801']){
  node('#pay-amount-1').value=amount;run('finishEnroll()');assert.equal(snapshot(),before);
}
node('#pay-amount-1').value='1800';
addPaymentProof(0);addPaymentProof(1);
run('finishEnroll()');
assert.equal(run('a.orders[0].originalAmount'),'¥2000.00');
assert.equal(run('a.orders[0].amount'),'¥2000.00');assert.equal(run('a.orders[0].paid'),'¥2000.00');
assert.equal(run('a.orders[0].items[0].discountCents'),0);assert.equal(run('a.orders[0].items[1].discountCents'),0);
assert.equal(run('a.orders[0].receipts.length'),2);assert.equal(run('a.orders[0].handlingCampus'),undefined);
assert.equal(run('a.orders[0].operator.account'),'wangmin');
assert.equal(run('a.orders[0].note'),'家长确认 <备注>');
assert.equal(run('a.orders[0].status'),'交易成功');
assert.equal(run('a.orders[0].studentPhone'),'13912345678');
assert(run('a.orders[0].createdAt'));
assert.equal(run('a.orders[0].items[0].term'),'春季');
assert.equal(run('a.orders[0].items[0].grade'),'2年级');
assert.equal(run('a.orders[0].items[0].subject'),'语文');
assert.equal(run('a.orders[0].items[0].format'),'面授');
for(const mode of ['商城支付']){
  open();node('#pay-amount').value='2000';run(`enrollmentChangePayMode('${mode}')`);
  assert(page().includes('尚未接入支付服务'));
  assert(!page().includes('id="pay-amount"'));
  run('finishEnroll()');
  assert.equal(run('a.orders[0].paid'),'¥0.00');assert.equal(run('a.orders[0].status'),'等待付款');
  assert.equal(run('a.orders[0].payMode'),mode);assert.equal(run('a.orders[0].receipts.length'),0);
}
open();node('#pay-amount').value='100';run('enrollmentAddReceipt()');
node('#pay-channel-1').value='微信';node('#pay-amount-1').value='50';
run('enrollmentRemoveReceipt(1)');
assert.equal(run('enrollmentCheckout().receipts.length'),1);
assert.equal(run('enrollmentCheckout().receipts[0].amount'),'100');
console.log('PASS: checkout without handling campus; invalid inputs have no side effects; split receipts; note and operator retained; order snapshots; online orders stay unpaid.');
