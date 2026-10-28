const assert=require('node:assert/strict');
const runtime=require('./prototype-runtime.cjs');
function setup(){const t=runtime();t.run("state.page='transfer';a.selectedStudent=2;tempMoveChoose('from',2);tempMoveChoose('to',0);transferDraft().to.session=tempMoveSessions('to')[5].key");return t}
{
 const {run,handlers}=setup();
 assert.equal(run('transferQuote().differenceCents'),50000);
 handlers(run("flowPage('transfer')"));
 assert(run('transferSourceHTML().includes("考勤明细")'));
 assert(run('transferTargetHTML().includes("当前进入")'));
 run('transferAttendanceOpen()');handlers(run('modalPage()'));
 assert(run('modalPage().includes(a.students[2].name)'));
 run("a.modal=null;transferSetDiscount('type','amount');transferSetDiscount('value','100.25')");
 assert.equal(run('transferQuote().dueCents'),39975);assert.equal(run('transferQuote().balanceCreditCents'),60025);
 for(const value of ['-1','500.01','1.234','abc','']){run(`transferDraft().discountValue=${JSON.stringify(value)}`);assert(run('!!transferQuote().error'))}
 run("transferDraft().discountType='rate';transferDraft().discountValue='8.55'");assert.equal(run('transferQuote().dueCents'),42750);
 for(const value of ['11','10.01','-1','1.234','']){run(`transferDraft().discountValue=${JSON.stringify(value)}`);assert(run('!!transferQuote().error'))}
 run("transferDraft().discountType='none';transferDraft().to.session=tempMoveSessions('to')[0].key");assert.equal(run('transferQuote().differenceCents'),0);
 run("a.selectedStudent=1;transferDraft()");assert.equal(run('transferDraft().discountType'),undefined);
}
{
 const {run,json}=setup();run("a.students[2].accountBalanceCents=1234;transferDraft().discountType='amount';transferDraft().discountValue='100.25';finishFlow('transfer');transferCommit();transferCommit()");
 assert.equal(run('a.students[2].accountBalanceCents'),61259);
 assert.equal(run('a.accountTransactions.length'),1);
 assert.deepEqual(json('a.accountTransactions.map(t=>[t.amountCents,t.balanceBeforeCents,t.balanceAfterCents])'),[[60025,1234,61259]]);
 assert.equal(run('a.accountTransactions[0].transferId'),run('a.transferRecords[0].id'));
 assert.equal(run('a.transferRecords[0].balanceTransactionId'),run('a.accountTransactions[0].id'));
 assert.equal(run('a.orders[0].items[0].discountCents'),10025);
 assert.equal(run('a.orders[0].items[0].dueCents'),39975);
 assert.equal(run('a.refundApplications.length'),0);
 const saved=run('JSON.stringify(businessSnapshot())');run('a.students=[];a.accountTransactions=[]');run('businessRestore('+saved+')');
 assert.equal(run('a.accountTransactions[0].amountCents'),60025);assert.equal(run('a.students[2].accountBalanceCents'),61259);
}
for(const mutation of ["transferDraft().discountType='amount';transferDraft().discountValue='10'",'a.students[2].accountBalanceCents=1',"a.courses.find(c=>c.name===a.classes[0].course).fee=2000"]){
 const {run}=setup();const orders=run('a.orders.length');run("finishFlow('transfer');"+mutation+';transferCommit()');
 assert.equal(run('a.orders.length'),orders);assert.equal(run('(a.transferRecords||[]).length'),0);assert.equal(run('(a.accountTransactions||[]).length'),0);
}
console.log('PASS transfer payment panels, discount validation, exact balance ledger, persistence, duplicate and stale quote guards.');
