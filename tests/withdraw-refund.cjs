const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {run,node,page}=require('./lead-registration.cjs');
run(fs.readFileSync(path.join(__dirname,'..','withdraw-refund.js'),'utf8'));
run("permissionChangeIdentity('admin');a.selectedStudent=0;nav('withdraw')");
assert(page().includes('退回余额'));assert(page().includes('退回客户'));assert(page().includes('id="refund-bank-fields" hidden'));
assert(!page().includes('<option>现金</option>'));assert(page().includes('剩余讲次'));assert(!page().includes('预计应退（示例）'));
run("withdrawSetMethod('customer')");assert.equal(node('#refund-bank-fields').hidden,false);
run("withdrawDraft().card='1234567890123456';withdrawSetMethod('balance')");assert.equal(node('#refund-bank-fields').hidden,true);
run("Object.assign(withdrawDraft(),{classId:a.classes[0].id,amount:'12.345'});finishFlow('withdraw')");assert.equal(run('(a.refundRecords||[]).length'),0);
for(const amount of ['','-1','0','NaN','1e3','999999999999999999999']){
  run(`withdrawDraft().amount=${JSON.stringify(amount)};finishFlow('withdraw')`);assert.equal(run('(a.refundRecords||[]).length'),0);
}
run("withdrawDraft().amount='10.01';finishFlow('withdraw')");
assert.equal(run('a.students[0].accountBalanceCents'),1001);assert.equal(run('a.accountTransactions.length'),1);assert.equal(run('a.refundRecords[0].bankDetails'),undefined,'hidden bank data is excluded from balance refunds');
assert.equal(run('a.refundRecords[0].status'),'已计入余额');assert(page().includes('¥10.01'));assert(page().includes('退费记录'));
run("finishFlow('withdraw')");assert.equal(run('a.accountTransactions.length'),1,'double submit does not credit twice');
run("Object.assign(withdrawDraft(),{classId:a.classes[0].id,amount:'0.29',method:'balance'});finishFlow('withdraw')");assert.equal(run('a.students[0].accountBalanceCents'),1030,'cent-exact accumulation');
assert.equal(run('a.accountTransactions[1].balanceBeforeCents'),1001);assert.equal(run('a.accountTransactions[1].balanceAfterCents'),1030);
run("Object.assign(withdrawDraft(),{classId:a.classes[0].id,amount:'20',method:'customer'});finishFlow('withdraw')");assert.equal(run('a.refundRecords.length'),2,'customer bank info required');
run("Object.assign(withdrawDraft(),{card:'1234 5678 9012 3456',holder:'张家长',bank:'示例银行城中支行',contact:'13812345678',note:'退回客户测试'});finishFlow('withdraw')");
assert.equal(run('a.refundRecords.length'),3);assert.equal(run('a.refundRecords[2].status'),'待退款');assert.equal(run('a.refundRecords[2].bankDetails.card'),'1234567890123456');assert.equal(run('a.students[0].accountBalanceCents'),1030,'customer refunds do not credit the account');assert.equal(run('a.accountTransactions.length'),2);
assert(run('!!a.refundRecords[2].recordedAt'));assert(run('!!a.refundRecords[2].operator'));assert(run('studentProfileCourses(a.students[0]).includes("¥10.30")'));
run("Object.assign(withdrawDraft(),{card:'9999999999999999',amount:'100'});a.selectedStudent=1;academicRender()");assert.equal(run('withdrawDraft().card'),'');assert.equal(run('withdrawDraft().amount'),'');assert.equal(run('withdrawBalanceCents(a.students[1])'),0);
run("withdrawDraft().amount='100';withdrawCancel()");assert.equal(run('withdrawDraft().amount'),'');
run("withdrawDraft().card='9999999999999999';nav('transfer')");assert.equal(run('a.withdrawDraft'),null);assert(!page().includes('refund-bank-fields'));
run("nav('withdraw');Object.assign(withdrawDraft(),{classId:a.classes[0].id,amount:'100',method:'balance'});permissionChangeIdentity('sales');finishFlow('withdraw')");assert.equal(run('a.refundRecords.length'),3,'permission change cannot submit a stale draft');
console.log('PASS: refund destination UI, conditional bank fields, amount/bank validation, cent-exact account credits, pending customer refunds, repeat-submit protection, student/identity isolation and account display.');
