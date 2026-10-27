const assert=require('node:assert/strict');const {run,json,node}=require('./prototype-runtime.cjs')();
assert.equal(run('a.orders.filter(o=>o.demoLedgerVersion===1).length'),3);assert(run('a.orders.every(o=>o.items?.length)'));assert.equal(run('financeArrearsRows()[0].debt'),60000);
run("state.page='transfer';a.selectedStudent=1;tempMoveChoose('from',1);tempMoveChoose('to',0);transferDraft().to.session=tempMoveSessions('to')[0].key");
assert.equal(run('transferQuote().error'),undefined);assert.equal(run('transferQuote().sourceDebtCents'),60000);assert.equal(run('transferQuote().creditCents'),40000);assert.equal(run('transferQuote().topupCents'),60000);
const sourceId=run('transferQuote().order.id');run("finishFlow('transfer');transferCommit();transferCommit()");assert.equal(run('a.transferRecords.length'),1);assert.equal(run('a.orders.length'),4);assert.equal(run('financeArrearsRows().length'),2);assert.equal(run(`a.orders.find(o=>o.id==='${sourceId}').paid`),'¥400.00');
run("state.page='supplement';a.selectedStudent=1;supplementSelectClass(a.classes[1].id)");assert.equal(run('supplementFeeData().debt'),60000,'transferred source debt is still payable');
run("supplementReceiptField(0,'channel','现金');supplementReceiptField(0,'amount','600');supplementSubmit()");assert.equal(run(`a.orders.find(o=>o.id==='${sourceId}').paid`),'¥1000.00');assert.equal(run('a.transferRecords[0].creditCents'),40000,'later source collection never credits the target twice');
run("supplementSelectClass(a.classes[0].id);supplementReceiptField(0,'channel','现金');supplementReceiptField(0,'amount','600');supplementSubmit()");assert.equal(run('a.transferRecords[0].status'),'已完成');
assert.equal(run('financeRefundRows().filter(r=>r.type===\'转课 / 转班\').length'),1);
// Shared batch parser / all-row validation / duplicate submits / allocation order.
run("state.page='enroll';batchImportOpen('enroll')");
const header=json('batchImportSchemas.enroll.headers'),row=['','导入测试','13811112222',run('leadGradeNames[0]'),run('a.classes[0].id')+'|'+run('a.classes[2].id'),'1|1','新签|新签','1200','现金','','','','测试','receipt.pdf'];
run("batchImportState.files=[{fileName:'receipt.pdf',url:'data:application/pdf;base64,YQ=='}]");const text=header.join(',')+'\n'+row.join(',');node('#batch-import-text').value=text;run('batchImportPreview()');assert.deepEqual(json('batchImportState.preview.errors'),[]);run('batchImportCommit();batchImportCommit()');
assert.equal(run("a.orders.filter(o=>o.student==='导入测试').length"),1);assert.deepEqual(json("a.orders.find(o=>o.student==='导入测试').items.map(i=>i.paidTuitionCents)"),[100000,20000]);
run("batchImportOpen('enroll')");node('#batch-import-text').value=text;run('batchImportPreview()');assert(run('batchImportState.preview.errors.length>0'));
assert.throws(()=>run('batchParse(\'a,b\\n"unclosed,b\')'));
const snapshot=run('JSON.stringify(businessSnapshot())');run('a.orders=[];a.students=[]');run('businessRestore('+snapshot+')');assert(run("a.orders.some(o=>o.student==='导入测试')"));
console.log('PASS production chain: complete demo ledger, unpaid source transfer, separate old/new debt repayment, no duplicate credit/order, batch validation/allocation and state roundtrip.');
