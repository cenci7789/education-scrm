const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {run,node,page,context}=require('./lead-registration.cjs');
context.URL={createObjectURL:()=> 'blob:first-record',revokeObjectURL(){}};
run("permissionChangeIdentity('admin');state.page='quickRegister';render()");
const originalQuery=context.document.querySelector,originalQueryAll=context.document.querySelectorAll;
for(const mode of ['uniform','self','specific']){
  run('leadOpenForm()');
  const fields={'lead-name':'首次登记测试','lead-phone':'13812345678','lead-grade':'初二','lead-campus':'园区校区','lead-source':'家长上门','lead-note':'家长希望试听数学、英语\n沟通备注 <script> & 核实'};
  for(const [key,value] of Object.entries(fields))node('#'+key).value=value;
  run("leadState.assigneeId=state.staff.findIndex(person=>person.account==='sunqian')");
  context.document.querySelector=selector=>selector==='input[name="lead-assign"]:checked'?{value:mode}:originalQuery(selector);
  context.document.querySelectorAll=selector=>selector==='input[name="lead-subject"]:checked'?[{value:'数学'},{value:'英语'}]:originalQueryAll(selector);
  run("leadAddRecordFiles([{name:'首次沟通.png',size:100,type:'image/png'}],'image');saveLead()");
  context.document.querySelector=originalQuery;context.document.querySelectorAll=originalQueryAll;
  const expected=mode==='uniform'?'统一分配':mode==='self'?'王敏-wangmin':'孙倩-sunqian';
  assert.equal(run('leadState.leads[0].history.length'),1,'initial note and attachments belong to one entry');
  assert.equal(run('leadState.leads[0].history[0][0]'),'建档');
  assert.equal(run('leadState.leads[0].history[0][2]'),`就读年级：初二，意向校区：园区校区，意向学科：数学、英语\n分配咨询：${expected}\n${fields['lead-note']}`);
  assert.equal(run('leadState.leads[0].history[0][3].files[0].url'),'blob:first-record');
  assert.equal(run('leadState.leads[0].history[0][3].operator.name'),'王敏','operator is the registrar, not assigned consultant');
  assert.equal(run('leadState.leads[0].history[0][3].operator.account'),'wangmin');
  run("leadDetail(0,'quickRegister')");
  assert(page().includes('操作人：王敏-wangmin'));
  assert(page().includes('沟通备注 &lt;script&gt; &amp; 核实'));
  assert.equal((page().match(/class="lead-event /g)||[]).length,1);
  const saved=run('JSON.stringify(leadState.leads[0].history)');
  run("leadState.leads[0].owner='李强';leadState.leads[0].grade='高一';leadState.leads[0].campus='新校区';leadRender()");
  assert.equal(run('JSON.stringify(leadState.leads[0].history)'),saved,'history is a creation-time snapshot');
  run("leadNav('quickRegister')");
}
// Registration without a note still creates exactly one complete record.
run('leadOpenForm()');node('#lead-note').value='';run('saveLead()');
assert.equal(run('leadState.leads[0].history.length'),1);
assert.equal(run('leadState.leads[0].history[0][2].split("\\n").length'),2);

// Every later communication snapshots the operator next to its heading.
run("leadDetail(0,'myLeads');leadOpenUpload('企微')");
for(const [key,value] of Object.entries({'follow-channel':'企微','communication-result':'有效沟通','communication-intent':'unknown','lead-record-note':'第二次沟通','follow-time':''}))node('#'+key).value=value;
run('leadSaveUpload()');
assert.equal(run('leadState.leads[0].history.at(-1)[3].operator.account'),'wangmin');
assert.equal((page().match(/操作人：王敏-wangmin/g)||[]).length,2);
assert(!page().includes('记录人：'));
const history=run('JSON.stringify(leadState.leads[0].history)');
run("leadDemoOperator.account='changed-account';leadRender()");
assert.equal(run('JSON.stringify(leadState.leads[0].history)'),history);
assert(page().includes('操作人：王敏-wangmin'));
run("leadDemoOperator.account='wangmin'");
assert(run("leadHistoryOperatorHTML({operator:{name:'<姓名>',account:'a&b'}})").includes('&lt;姓名&gt;-a&amp;b'));
assert.equal(run("leadHistoryOperatorHTML(null)"),'<span class="lead-event-operator">操作人：未记录</span>');
assert.equal(run("leadHistoryEntry('操作','内容')[3].operator.account"),'wangmin');
// Automated form submissions have an explicit system operator and the same creation format.
context.URL=URL;context.location={href:'https://example.test/'};
run(fs.readFileSync(path.join(__dirname,'..','marketing-forms.js'),'utf8'));
run("var intakeForm={title:'资料领取',settings:{download:{enabled:true}},fields:[{title:'姓名',type:'name'},{title:'电话',type:'phone'}]};mfCaptureLead(intakeForm,{'姓名':'自动建档','电话':'13712345678'})");
assert.equal(run('leadState.leads[0].history.length'),1);
assert.equal(run('leadState.leads[0].history[0][0]'),'建档');
assert(run('leadState.leads[0].history[0][2]').includes('分配咨询：统一分配'));
assert.equal(run('leadState.leads[0].history[0][3].operator.account'),'system');
run("mfCaptureLead(intakeForm,{'姓名':'自动建档','电话':'13712345678'})");
assert.equal(run('leadState.leads[0].history.at(-1)[3].operator.name'),'系统');
console.log('PASS: one creation entry; grade/campus/subjects/assignment/note layout; self/uniform/specific assignments; attachments; actor account snapshots; escaped timeline headers; preserved history; system attribution.');
