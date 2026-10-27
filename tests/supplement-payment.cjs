const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {run,node,page}=require('./lead-registration.cjs');
for(const file of ['withdraw-refund.js','supplement-payment.js'])run(fs.readFileSync(path.join(__dirname,'..',file),'utf8'));
run("permissionChangeIdentity('admin');a.selectedStudent=null;nav('supplement')");
assert(!page().includes('支付信息'),'fees hidden until student and class selected');
run("a.selectedStudent=0;a.orders=[{id:'ORDER-1',studentId:a.students[0].id,paid:'¥200.00',amount:'¥1,000.00',status:'等待付款',receipts:[{channel:'现金',amountCents:20000}],items:[{classId:a.classes[0].id,className:a.classes[0].name,tuitionCents:100000,materialCents:0,discountCents:0,dueCents:100000,paidTuitionCents:20000,paidMaterialCents:0,startSession:1,sessionCount:10}]}];a.attendance=[{studentId:a.students[0].id,classId:a.classes[0].id,session:'第1讲',attendance:'未出勤销课'}];academicRender()");
assert(!page().includes('支付信息'));assert.equal(run('supplementClasses().length'),1);
run('supplementSelectClass(a.classes[0].id)');
for(const label of ['学费','应收','已缴费','支付信息','实付金额','欠费','请选择缴费方式','备注','仅抵扣所选班级','已报10讲次','已上1讲次'])assert(page().includes(label),label);
assert(!page().includes('经办人'));assert(!page().includes('经办校区'));
assert.equal(run('supplementFeeData().debt'),80000);
const snapshot=()=>run('JSON.stringify({orders:a.orders,records:a.supplementRecords})');
let before=snapshot();
for(const channel of ['微信','支付宝','银行卡']){run(`supplementReceiptField(0,'channel',${JSON.stringify(channel)});supplementReceiptField(0,'amount','10');supplementSubmit()`);assert.equal(snapshot(),before,'removed manual supplement channel must be rejected: '+channel)}
for(const amount of ['','-1','0','0.001','800.01','abc']){run(`supplementReceiptField(0,'channel','现金');supplementReceiptField(0,'amount',${JSON.stringify(amount)});supplementSubmit()`);assert.equal(snapshot(),before,amount)}
run("supplementReceiptField(0,'amount','300.10');supplementAddReceipt();supplementReceiptField(1,'channel','POS刷卡');supplementReceiptField(1,'amount','100.20')");
assert.equal(node('#supplement-paid').textContent,'¥400.30');assert.equal(node('#supplement-debt').textContent,'¥399.70');
run("supplementDraft().note='补缴学费';supplementSubmit();supplementSubmit()");
assert.equal(run('a.supplementRecords.length'),1,'duplicate confirmation cannot double charge');
assert.equal(run('a.orders[0].paid'),'¥600.30');assert.equal(run('a.orders[0].items[0].paidTuitionCents'),60030);assert.equal(run('a.orders[0].items[0].paidMaterialCents'),0);assert.equal(run('a.orders[0].receipts.length'),3);
assert.equal(run('a.supplementRecords[0].note'),'补缴学费');assert(run('!!a.supplementRecords[0].operator.account'));
run("supplementReceiptField(0,'channel','POS刷卡');supplementReceiptField(0,'amount','300');supplementSubmit()");
assert.equal(run('a.orders[0].items[0].paidTuitionCents'),90030);assert.equal(run('a.orders[0].items[0].paidMaterialCents'),0,'only tuition is charged');
assert.equal(run('supplementFeeData().debt'),9970);
run("supplementReceiptField(0,'channel','现金');supplementReceiptField(0,'amount','99.70');supplementSubmit()");
assert.equal(run('supplementFeeData().debt'),0);assert.equal(run('a.orders[0].status'),'交易成功');assert.equal(run('a.orders[0].paid'),'¥1000.00');
assert(page().includes('disabled onclick="finishFlow(\'supplement\')"'));
// Class and student changes must not carry prior payment inputs across accounts.
run("supplementReceiptField(0,'amount','999');a.selectedStudent=1;academicRender()");assert.equal(run('supplementDraft().classId'),'');assert.equal(run('supplementDraft().receipts[0].amount'),'');
run("a.selectedStudent=0;academicRender();supplementSelectClass(a.classes[0].id);permissionChangeIdentity('teacher');supplementSubmit()");assert.equal(run('a.supplementRecords.length'),3);
run("permissionChangeIdentity('admin');nav('supplement');a.selectedStudent=0;a.orders[0].paid='¥0.00';Object.assign(a.orders[0].items[0],{paidCents:0,paidTuitionCents:0,paidMaterialCents:0});supplementSelectClass(a.classes[0].id);supplementReceiptField(0,'channel','现金');supplementReceiptField(0,'amount','10');a.orders[0].paid='¥10.00';a.orders[0].items[0].paidCents=1000;supplementSubmit()");assert.equal(run('a.supplementRecords.length'),3,'changed financial data requires rechecking');
run("a.orders[0].items[0].materialCents=10000;supplementSelectClass(a.classes[0].id)");assert(run('!!supplementFeeData().error'));run("a.orders[0].items[0].materialCents=0");
// Ambiguous original order allocations are never invented.
run("a.orders[0].items.push({classId:a.classes[1].id,dueCents:10000});delete a.orders[0].items[0].paidCents;delete a.orders[0].items[0].paidTuitionCents;delete a.orders[0].items[0].paidMaterialCents;supplementSelectClass(a.classes[0].id)");
assert(run('!!supplementFeeData().error'));assert.equal(run('supplementFeeData().debt'),null);
run("a.orders=[];supplementSelectClass(a.classes[0].id)");assert(page().includes('暂无完整报名收费明细'));
console.log('PASS: student/class-dependent fees, split payments, cent precision, tuition-first allocation, original order updates, duplicate/stale/identity guards and unknown historical allocations.');
