const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const nodes = new Map();
function node(key) {
  if (!nodes.has(key)) nodes.set(key, {
    value: '', innerHTML: '', textContent: '', hidden: false,
    classList: { add() {}, remove() {}, toggle() {} },
    querySelector() { return null; },
    setAttribute(name, value) { this[name]=value; }
  });
  return nodes.get(key);
}
const document = {
  querySelector: node,
  querySelectorAll() { return []; },
  getElementById(id) { return node('#' + id); }
};
const context = vm.createContext({ document, setTimeout() {}, setInterval() {return 1}, clearInterval() {} });
let proofSequence=0;
context.URL={createObjectURL:()=>`blob:proof-${++proofSequence}`,revokeObjectURL(){}};
const run = code => vm.runInContext(code, context);
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
run([...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n'));
for (const file of ['academic.js', 'leads.js', 'shortcuts.js', 'trials.js', 'permissions.js', 'lead-history.js', 'lead-communication.js', 'lead-records.js', 'enrollment.js', 'enrollment-classes.js', 'enrollment-payment.js', 'order-filters.js', 'trial-student.js', 'trial-classes.js', 'trial-placement.js', 'my-leads.js', 'lead-enrolled.js', 'lead-rules.js', 'lead-assignment.js', 'course-catalog.js', 'class-setup.js', 'class-schedule.js', 'class-details.js', 'student-terms.js', 'class-filters.js', 'student-profile.js', 'teaching-default-term.js', 'student-exams.js']) {
  run(fs.readFileSync(path.join(root, file), 'utf8'));
}
const page = () => node('#view').innerHTML;
const set = (id, value) => { node('#' + id).value = value; };
function fill(name) {
  set('lead-name', name);set('lead-phone', '13812345678');
  set('lead-grade', '小三');set('lead-source', '家长上门');
  set('lead-guardian', '爸爸');set('lead-campus', '园区校区');
  set('lead-ownership-campus', '城中校区');
  set('lead-note', '登记测试');
}

for (const origin of ['quickRegister', 'myLeads']) {
  run(`state.page='${origin}';render()`);
  assert(page().includes('leadOpenForm()'));
  const before = run('leadState.leads.length');
  run('leadOpenForm()');
  assert.equal(run('state.page'), 'leadForm');
  assert.equal(run('leadState.modal'), null);
  assert(!page().includes('modal-backdrop'));
  assert(page().includes('lead-registration-page'));
  assert(page().includes('lead-school-rows'));
  assert(!page().includes('id="lead-campus"'));
  assert.equal(page().includes('lead-assignee-panel'),origin!=='quickRegister');
  if(origin==='quickRegister'){
    assert(page().includes('线索登记（非招生）'));
    assert(page().indexOf('id="lead-ownership-campus"')<page().indexOf('id="lead-grade"'));
  }
  fill('页内登记');
  run("leadSwitchRegistration('import')");
  assert.equal(node('#lead-registration-single').hidden, true);
  assert.equal(node('#lead-registration-import').hidden, false);
  run("leadSwitchRegistration('single')");
  assert.equal(node('#lead-name').value, '页内登记');
  set('lead-name', '');run('saveLead()');
  assert.equal(run('state.page'), 'leadForm');
  assert.equal(run('leadState.leads.length'), before);
  fill('页内登记');
  run('saveLead()');
  assert.equal(run('state.page'), origin);
  assert.equal(run('leadState.leads.length'), before + 1);
  assert.equal(run('leadState.leads[0].registrar'), '王敏');
  assert(run('Boolean(leadState.leads[0].leadId && leadState.leads[0].createdAt)'));
  if (origin === 'quickRegister') assert(page().includes('页内登记'));
  run('leadOpenForm();leadCloseForm()');
  assert.equal(run('state.page'), origin);
  assert.equal(run('leadState.leads.length'), before + 1);
  run("leadOpenForm('create','import')");
  assert.equal(node('#lead-registration-import').hidden, false);
  assert(!page().includes('modal-backdrop'));
  run('leadCloseForm()');
}

run("leadState.leads[0].campus='历史校区';leadDetail(0,'myLeads');leadOpenForm('edit')");
assert.equal(node('#lead-source').value, '家长上门');
assert.equal(node('#lead-guardian').value, '爸爸');
fill('更新线索');run('saveLead()');
assert.equal(run('state.page'), 'leadDetail');
assert.equal(run('leadState.leads[0].name'), '更新线索');
assert.equal(run('leadState.leads[0].campus'), '历史校区');
run("permissionChangeIdentity('sales');state.page='quickRegister';render();leadOpenForm()");
assert.equal(run("permissionCanVisit('leadForm')"), true);
assert(page().includes('lead-registration-page'));
run("permissionChangeIdentity('finance')");
assert.equal(run("permissionCanVisit('leadForm')"), true);
run("leadState.formReturnPage='myLeads'");
assert.equal(run("permissionCanVisit('leadForm')"), false);
console.log('PASS: inline registration; both entry points; form fields; tab state; validation; save/cancel return; registrar stats; detail edit; permissions.');
const addPaymentProof=(index=0)=>run(`enrollmentAddProofs(${index},[{name:'收款凭证.png',size:100,type:'image/png'}])`);
module.exports = { run, node, page, context, addPaymentProof };
