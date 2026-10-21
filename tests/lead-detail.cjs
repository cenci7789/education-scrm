const assert = require('node:assert/strict');
const { run, node, page, context } = require('./lead-registration.cjs');
context.URL = { createObjectURL: () => 'blob:test-attachment', revokeObjectURL() {} };
run("permissionChangeIdentity('admin');leadDetail(0,'myLeads')");
assert(page().includes('lead-profile-card'));
assert(page().includes('AI 学员简报'));
assert(page().includes('演示摘要'));
assert(page().includes('lead-detail-dock'));
assert(page().includes('话务呼叫'));
assert(page().includes('企微沟通'));
assert(page().includes('上传记录'));
assert.equal(run("leadDetailPhone('13812345678')"), '138****5678');
assert(!page().includes('13812345678'));
const count = run('leadState.leads[0].history.length');
assert.equal((page().match(/class="lead-event /g) || []).length, count);
assert(!page().includes('class="ai-note"'));
const summary = () => page().match(/<section class="lead-summary">([\s\S]*?)<\/section>/)[1];
const timeline = () => page().match(/<section class="lead-history-section">([\s\S]*?)<\/section>/)[1];
assert(summary().includes('综合分析：'));
assert(!timeline().includes('AI 分析'));

run("leadState.modal='follow';leadRender()");
node('#follow-note').value = '约好下周试听';
node('#follow-channel').value = '电话';
node('#communication-result').value = '有效沟通';
node('#communication-intent').value = 'unknown';
node('#follow-time').value = '2026-10-27T16:00';
run('saveFollow()');
assert.equal(run('leadState.leads[0].history.length'), count + 1);
assert(page().includes('约好下周试听'));
assert(page().includes('2026-10-27 16:00'));
run('leadRefreshSummary()');
assert.equal(run('leadState.leads[0].history.length'), count + 1);

run('leadOpenUpload();leadSaveUpload()');
assert(page().includes('id="lead-record-images"'));
assert(node('#lead-record-notice').textContent.includes('请填写沟通说明'));
assert.equal(run('leadState.leads[0].history.length'), count + 1);
run("leadAddRecordFiles([{name:'沟通记录.png',size:30,type:'image/png'}],'image')");
node('#lead-record-note').value = '家长反馈 <script>测试</script>';
run('leadSaveUpload()');
assert.equal(run('leadState.leads[0].history.length'), count + 2);
assert.equal(run('leadState.modal'), null);
assert(page().includes('download="沟通记录.png"'));
assert(page().includes('href="blob:test-attachment"'));
assert(page().includes('&lt;script&gt;测试&lt;/script&gt;'));
assert(!page().includes('<script>'));
assert(page().includes('份附件尚未转文字'));
assert(summary().includes('已归集 1 份附件'));
assert(summary().includes('电话'));
assert(summary().includes('电话沟通'));
assert(!timeline().includes('份附件尚未转文字'));
assert(!page().includes('class="ai-note"'));
run("leadOpenForm('edit')");
assert.equal(run('state.page'),'leadDetail');
assert.equal(run('leadState.modal'),'form');
assert.equal(run('leadRecordDraft.context'),'basicEdit');
assert.equal(run('leadRecordDraft.note'),'');
const editModal=()=>page().slice(page().indexOf('<div class="modal-backdrop">'));
assert(editModal().includes('修改基本信息'));
assert(editModal().includes('保存修改'));
for(const text of ['单条登记','批量导入','lead-tip','name="lead-assign"','id="lead-note"']){
  assert(!editModal().includes(text),`Basic edit must not include ${text}`);
}
for(const text of ['id="lead-edit-note"','上传图片','直接录音','上传语音'])assert(editModal().includes(text));
run('leadCloseForm()');
assert.equal(run('state.page'), 'leadDetail');
assert(page().includes('lead-detail-dock'));
// Save visible basic fields only, including for leads owned by someone else or in a pool.
for(const status of ['assigned','cold','new','recycle']){
  run(`leadState.leads[0].owner='陈静';leadState.leads[0].status='${status}';leadOpenForm('edit')`);
  for(const id of ['communication-result','communication-intent','communication-reason','follow-time'])node('#'+id).value='';
  const snapshot=()=>run('JSON.stringify((({owner,status,stage,intent,next,note,history,leadId,registrar,createdAt})=>({owner,status,stage,intent,next,note,history,leadId,registrar,createdAt}))(leadState.leads[0]))');
  const before=snapshot(),total=run('leadState.leads.length');
  node('#lead-name').value='基本信息修改';
  const originalQuery=context.document.querySelector;
  context.document.querySelector=selector=>{
    assert(selector!=='#lead-note'&&!selector.includes('lead-assign'),'Do not read removed fields during basic edit');
    return originalQuery(selector);
  };
  try{run('saveLead()')}finally{context.document.querySelector=originalQuery}
  assert.equal(run('state.page'),'leadDetail');
  assert.equal(run('leadState.modal'),null);
  assert.equal(run('leadState.leads.length'),total);
  assert.equal(run('leadState.leads[0].name'),'基本信息修改');
  assert.equal(snapshot(),before);
}
run('leadNav(leadState.returnPage)');
assert.equal(run('state.page'), 'myLeads');
assert(!page().includes('lead-detail-dock'));
console.log('PASS: detail sections; masked phone; history/summary updates; attachment validation/save/download; escaping; edit and close navigation.');
