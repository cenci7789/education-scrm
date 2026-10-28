const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {run,node,page}=require('./lead-registration.cjs');
for(const file of ['attendance-filters.js','makeup-picker.js','makeup-resolution.js','trial-management.js','schedule-calendar.js','temp-move-search.js','transfer-search.js','withdraw-refund.js','refund-workflow.js','refund-call-flow.js'])run(fs.readFileSync(path.join(__dirname,'..',file),'utf8'));
const role=id=>run(`permissionChangeIdentity('${id}');nav('withdraw')`);
function create(student,method='balance'){
  role('academic');run(`refundNew();a.selectedStudent=${student};a.classes[${student}].sessions=[{id:'cut-1',name:'第一课'},{id:'cut-2',name:'第二课'}];a.orders=a.orders.filter(o=>o.studentId!==a.students[${student}].id);a.orders.push({studentId:a.students[${student}].id,paid:'200.50',items:[{classId:a.classes[${student}].id,tuitionCents:20050,materialCents:0,discountCents:0,dueCents:20050,sessionCount:2,startSession:1}]});academicRender();withdrawSelectClass(a.classes[${student}].id);refundSelectStop('cut-1');refundReasonInput('家长提出时间冲突');refundSubmit()`);
  assert.equal(run('refundCurrent().step'),1);return run('refundCurrent().id');
}
function call(step,method='balance',amount){
  run("refundCallStart();refundCallFinish();refundCompleteCall()");
  assert.equal(run('refundCurrent().step'),step,'communication result required');
  run("refundResultChange('有效沟通');refundOpinionChange('继续退费');refundCallField('method','"+method+"');leadRecordDraft.note='实际沟通内容'");
  if(amount)run(`refundCallField('amount',${JSON.stringify(amount)})`);
  run("leadAddRecordFiles([{name:'电话.mp3',size:100,type:'audio/mpeg'}],'audio')");node('#refund-audio-confirm').checked=true;
  run("refundAudioReady(leadRecordDraft.items[0].id,35);refundCompleteCall()");assert.equal(run('refundCurrent().step'),step+1);
}
(async()=>{
  role('academic');run("a.selectedStudent=0;refundNew()");
  for(const label of ['退款去向','银行卡号','开户人','开户行','退款方式'])assert(!page().includes(label),'creation must not show '+label);
  assert(page().includes('flow-student-summary'));assert(page().includes('费用信息'));
  const id=create(0);
  assert.equal(run('withdrawBalanceCents(a.students[0])'),0);assert.equal(run('a.refundApplications.length'),1);
  run("refundFinanceComplete()");assert.equal(run('refundCurrent().step'),1,'cannot jump to finance');
  call(1,'balance','90.25');
  assert(!page().includes('AI 申请汇总'),'standalone summary removed');
  assert(page().includes('<audio'),'saved recording is playable');
  assert(page().indexOf('<audio')<page().indexOf('AI 沟通分析'),'analysis sits below recording');
  assert(page().indexOf('refund-call-card')<page().indexOf('refund-call-next'),'saved communication precedes next call');
  assert.equal(run('a.students[0].communications.at(-1).category'),'教务沟通');assert.equal(run('refundCurrent().calls[0]===a.students[0].communications.at(-1)'),true,'timeline shares original record');
  run("refundCallStart()");assert.equal(run('refundWork.call'),null,'academic cannot do teacher step');
  role('teacher');
  assert(page().indexOf('refund-communication-actions')<page().indexOf('refund-call-card'),'communication actions appear in section header');
  call(2);
  assert.equal(run('a.students[0].communications.at(-1).category'),'教师沟通');
  assert.equal(run('withdrawBalanceCents(a.students[0])'),0);
  role('manager');run("refundDecision(true)");assert.equal(run('refundCurrent().step'),3,'opinion required');
  run("refundWork.opinion='核对两次沟通，通过';refundWork.approved='90.25';refundDecision(true)");assert.equal(run('refundCurrent().step'),4);
  run("refundWork.opinion='尝试越级';refundDecision(true)");assert.equal(run('refundCurrent().step'),4,'manager cannot approve principal step');
  role('principal');run("refundWork.opinion='同意按批准金额退费';refundDecision(true)");assert.equal(run('refundCurrent().step'),5);assert.equal(run('withdrawBalanceCents(a.students[0])'),0);
  role('finance');run("refundFinanceComplete();refundFinanceComplete()");assert.equal(run('refundCurrent().step'),6);assert.equal(run('withdrawBalanceCents(a.students[0])'),9025);assert.equal(run('a.accountTransactions.length'),1);assert.equal(run('a.refundRecords.length'),1);assert.equal(run('a.students[0].enrollments.at(-1).enrollmentStatus'),'已退班');assert.equal(run('refundCurrent().calls.length'),2);
  const second=create(1);call(1,'customer');role('teacher');call(2,'customer');role('manager');run("refundWork.opinion='需补充教务沟通';refundDecision(false)");assert.equal(run('refundCurrent().step'),1);assert.equal(run('refundCurrent().calls.length'),2,'return preserves previous records');
  role('academic');call(1,'customer');role('teacher');call(2,'customer');role('manager');run("refundWork.opinion='通过';refundDecision(true)");role('principal');run("refundWork.opinion='通过';refundDecision(true)");role('finance');run("refundFinanceComplete()");assert.equal(run('refundCurrent().step'),5,'no payout without receipt');
  run("refundBankField('card','1234567890123456');refundBankField('holder','张家长');refundBankField('bank','示例银行支行');refundBankField('refundContact','13812345678');refundSaveBank();refundPaymentField('reference','BANK-123');refundPaymentField('time','2026-01-02T09:00');refundFinanceProof([{name:'退款凭证.pdf',size:100,type:'application/pdf'}])");node('#refund-paid-confirm').checked=true;run("refundFinanceComplete()");assert.equal(run('refundCurrent().step'),6);assert.equal(run('withdrawBalanceCents(a.students[1])'),0);assert.equal(run('a.refundRecords.at(-1).status'),'已退款');assert.equal(run('a.refundRecords.at(-1).payment.reference'),'BANK-123');
  await run('refundAnalyze()');assert(!run('refundCurrent().aiText'),'no fabricated summary without transcription');
  const cid=run('refundCurrent().calls[0].id');await run(`refundTranscribe('${cid}',0)`);assert(run('refundCurrent().calls[0].files[0].error.includes("尚未接入")'));
  run("globalThis.crmTranscribeAttachment=async()=>({text:'家长：时间冲突无法继续上课。老师：可以尝试调整时间。家长：仍然申请退费。'})");await run(`refundTranscribe('${cid}',0)`);
  run("globalThis.crmSummarizeCommunications=async()=>({text:'退费原因为时间冲突；已提出调课方案，家长仍要求退费。'})");await run(`refundAnalyze('${cid}')`);assert(run('refundCurrent().calls[0].aiText.includes("时间冲突")'));
  assert(page().includes('退费原因为时间冲突；已提出调课方案，家长仍要求退费。'),'analysis rendered inside saved record');
  assert.equal(run('refundCurrent().calls[0]===a.students[1].communications.find(c=>c.id===refundCurrent().calls[0].id)'),true,'analysis remains on shared student communication record');
  create(2);run("refundCallStart();refundWork.call.card='9999999999999999'");role('teacher');assert.equal(run('refundWork.call'),null,'switch identity disposes unfinished bank/recording draft');
  role('academic');run("refundCallStart();refundCallFinish();refundResultChange('有效沟通');refundOpinionChange('撤回申请');leadRecordDraft.note='家长决定继续上课';refundCompleteCall()");assert.equal(run('refundCurrent().closed'),'已撤回');assert.equal(run('a.refundRecords.length'),2);
  role('sales');assert.equal(run("permissionCanVisit('withdraw')"),false);
  console.log('PASS: initial form separation, sequential roles, call-result modal, shared student timeline, return/reapproval, withdrawal, deferred finance ledger, customer receipt, duplicate guards, AI adapters and identity cleanup.');
})().catch(e=>{console.error(e);process.exitCode=1});
