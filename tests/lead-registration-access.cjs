const assert=require('node:assert/strict');
const {run,node,page}=require('./lead-registration.cjs');
run("permissionChangeIdentity('admin');state.page='quickRegister';render()");
const own=run('leadState.leads.findIndex(shortcutOwnLead)');
run(`leadDetail(${own},'quickRegister')`);
for(const text of ['AI 学员简报','跟进记录','lead-profile-card','leadOpenForm(\'edit\')'])assert(page().includes(text));
for(const text of ['lead-follow-card','lead-detail-dock','话务呼叫','企微沟通','↑ 上传记录'])assert(!page().includes(text));
assert(node('#crumb').textContent.includes('快捷入口 / 线索登记'));
const snapshot=()=>run('JSON.stringify({leads:leadState.leads,students:a.students,trials:trialState.requests})');
const before=snapshot();
for(const call of ["leadOpenUpload()","leadOpenAction('trial')","leadOpenAction('colleague')","leadOpenAction('publicPool')","leadToEnrollment()","saveFollow()","leadTransferColleague()","leadReturnPublicPool()","archiveLead()","assignLead()","leadSaveUpload()"]){
  run(call);assert.equal(snapshot(),before,call);assert.equal(run('state.page'),'leadDetail');
}
for(const modal of ['follow','cold','colleague','publicPool','upload']){
  run(`leadState.modal='${modal}';leadRender()`);
  assert.equal(run('leadState.modal'),null);
  assert(!page().includes('modal-backdrop'));
}
run("leadOpenForm('edit')");
assert(page().includes('保存修改'));
assert(!page().includes('id="lead-edit-note"'));
assert.equal(run('leadRecordDraft'),null);
node('#lead-name').value='仅改基本信息';node('#lead-phone').value='13812345678';
const history=run('JSON.stringify(leadState.leads[leadState.selected].history)');
run('saveLead()');
assert.equal(run('JSON.stringify(leadState.leads[leadState.selected].history)'),history);
assert.equal(run('state.page'),'leadDetail');assert(!page().includes('lead-follow-card'));
run("leadState.leads.push({...leadState.leads[0],name:'其他人登记的学生',registrar:'其他同事',leadId:'other-owner'});state.page='quickRegister';render()");
assert(!page().includes('其他人登记的学生'));
run("leadDetail(leadState.leads.length-1,'quickRegister')");
assert.equal(run('state.page'),'quickRegister');
run("leadState.selected=leadState.leads.length-1;leadState.returnPage='quickRegister';state.page='leadDetail';render()");
assert(page().includes('无权限'));assert(!page().includes('其他人登记的学生'));
// The shortcut is available to every active role, without exposing the sales routes.
for(const identity of ['finance','academic','manager','sales','admin']){
  run(`permissionChangeIdentity('${identity}');state.page='quickRegister';render();leadDetail(${own},'quickRegister')`);
  assert.equal(run("permissionCanVisit('quickRegister')"),true);
  assert(page().includes('跟进记录'));assert(!page().includes('lead-follow-card'));
  if(['finance','academic'].includes(identity)){
    run("leadState.returnPage='myLeads';render()");
    assert(page().includes('无权限'));
  }
}
// Full sales detail keeps its original controls and composer.
run(`permissionChangeIdentity('sales');leadDetail(${own},'myLeads')`);
assert(page().includes('去沟通'));assert(page().includes('lead-detail-dock'));
run("leadOpenForm('edit')");
assert(page().includes('id="lead-edit-note"'));
run('leadCloseForm();leadOpenUpload()');
assert.equal(run('leadState.modal'),'upload');
node('#follow-channel').value='其他';node('#follow-time').value='';
node('#communication-result').value='有效沟通';node('#communication-intent').value='unknown';
node('#lead-record-note').value='销售正常跟进';run('leadSaveUpload()');
assert(page().includes('销售正常跟进'));
run(`leadDetail(${own},'quickRegister')`);
assert(page().includes('销售正常跟进'));assert(!page().includes('lead-detail-dock'));
console.log('PASS: shortcut ownership, view-only follow-up, basic edit without communication, blocked direct mutations, all-role registration access, unchanged sales detail.');
