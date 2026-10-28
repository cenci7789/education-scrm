const assert=require('node:assert/strict');
const {run,json,node,handlers}=require('./prototype-runtime.cjs')();
run("permissionChangeIdentity('admin');state.page='quickRegister';render();leadOpenForm()");
const page=()=>node('#view').innerHTML;
assert(page().includes('线索登记（非招生）'));
assert(page().indexOf('id="lead-ownership-campus"')<page().indexOf('id="lead-grade"'));
assert(page().includes('id="lead-ownership-campus" required aria-required="true"'));
assert(!page().includes('name="lead-assign"'));
assert(!page().includes('lead-assignee-panel'));
assert(!page().includes('id="lead-campus"'));
handlers();
const campuses=json('state.campuses.filter(c=>c.active).map(c=>c.name)');
const fields={'lead-name':'校区登记测试','lead-phone':'13855551111','lead-grade':run('leadConfiguredGradeNames()[0]'),'lead-campus':campuses[1],'lead-note':'家长招生数学'};
for(const [id,value] of Object.entries(fields))node('#'+id).value=value;
const count=run('leadState.leads.length');
for(const campus of ['', '不存在的校区',run('state.campuses.find(c=>!c.active).name')]){
 node('#lead-ownership-campus').value=campus;run('saveLead()');assert.equal(run('leadState.leads.length'),count);
}
// Even a stale or injected self/specific selection cannot bypass the campus queue.
node('#lead-ownership-campus').value=campuses[0];node('input[name="lead-assign"]:checked').value='self';run('saveLead()');
let lead=json('leadState.leads[0]');
assert.equal(lead.ownershipCampus,campuses[0]);assert.equal(lead.campus,'待定');
assert.equal(lead.status,'new');assert.equal(lead.owner,'未分配');assert.deepEqual(lead.assignees,[]);
assert.deepEqual(lead.assignmentQueue,{campus:campuses[0],role:'校区招生组长'});
assert.equal(lead.registrar,'王敏');assert.equal(lead.history.length,1);
assert(lead.history[0][2].includes(campuses[0]+'招生组长待分配'));assert(lead.history[0][2].includes('家长招生数学'));
assert.equal(lead.history[0][3].operator.account,'wangmin');
assert(page().includes(campuses[0]+'招生组长（待分配）'));
assert.equal(run('leadMyCategory(leadState.leads[0])'),'');
// Ownership campus is stable when basic student information is edited.
run("leadDetail(0,'quickRegister');leadOpenForm('edit')");assert(!page().includes('id="lead-ownership-campus"'));
run('saveLead()');assert.equal(run('leadState.leads[0].ownershipCampus'),campuses[0]);
run("state.page='leadManage';leadState.manageTab='新线索';render()");
assert(page().includes('校区登记测试'));assert(page().includes('归属校区'));handlers();
run(`leadSetManagementCampus(${JSON.stringify(campuses[1])});render()`);assert(!page().includes('校区登记测试'));
run(`leadSetManagementCampus(${JSON.stringify(campuses[0])});render();leadState.selected=0;leadState.modal='assign';render();leadSelectAssignee(state.staff.findIndex(s=>s.account==='sunqian'));assignLead()`);
lead=json('leadState.leads[0]');assert.equal(lead.owner,'孙倩');assert.equal(lead.status,'assigned');assert(!lead.assignmentQueue);assert.equal(lead.ownershipCampus,campuses[0]);
assert(!page().includes('校区登记测试'));assert.equal(lead.history.at(-1)[0],'分配');
// Sales registration retains the original assignment control and has no campus requirement.
run("state.page='myLeads';render();leadOpenForm()");assert(page().includes('name="lead-assign"'));assert(!page().includes('id="lead-ownership-campus"'));
run("leadCloseForm();state.page='quickRegister';render();batchImportOpen('lead')");
const headers=json("batchImportSchema('lead').headers");assert(headers.includes('归属校区'));assert(!headers.includes('意向校区'));assert(!headers.includes('分配方式'));assert(!headers.includes('招生账号'));
const row={'学生姓名':'非招生导入测试','联系电话':'13855552222','归属校区':campuses[1],'就读年级':fields['lead-grade'],'意向校区':campuses[0],'意向学科':'数学','备注':'导入备注'};
function preview(data){node('#batch-import-text').value=headers.join(',')+'\n'+headers.map(h=>data[h]||'').join(',');run('batchImportPreview()');return json('batchImportState.preview')}
assert(preview({...row,归属校区:''}).errors.some(e=>e.includes('归属校区必填')));
assert.deepEqual(preview(row).errors,[]);
// Recheck campus availability on confirmation; no partial writes.
run(`state.campuses.find(c=>c.name===${JSON.stringify(campuses[1])}).active=false;batchImportCommit()`);
assert(!run("leadState.leads.some(l=>l.name==='非招生导入测试')"));
run(`state.campuses.find(c=>c.name===${JSON.stringify(campuses[1])}).active=true`);
assert.deepEqual(preview(row).errors,[]);run('batchImportCommit()');
lead=json('leadState.leads[0]');assert.equal(lead.status,'new');assert.equal(lead.ownershipCampus,campuses[1]);assert.equal(lead.campus,'待定');assert.equal(lead.assignmentQueue.role,'校区招生组长');
assert(lead.history[0][2].includes(campuses[1]+'招生组长待分配'));
console.log('PASS: non-sales label, required active ownership campus, removed intended-campus field, pending campus routing, assignment transition, immutable history, preserved sales entry and batch validation.');
