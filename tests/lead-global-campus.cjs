const assert=require('node:assert/strict');
const {run,json,node,handlers}=require('./prototype-runtime.cjs')();
run(`permissionChangeIdentity('admin');state.campuses=[{name:'甲校区',active:true},{name:'乙校区',active:true},{name:'丙校区',active:true}];
state.staff=[
 {name:'跨校组长',phone:'13800001001',roleId:'campusAdmin',active:true,campus:'甲校区',campuses:['甲校区','乙校区']},
 {name:'单校组长',phone:'13800001002',roleId:'campusAdmin',active:true,campus:'甲校区'},
 {name:'招生主管',phone:'13800001003',roleId:'salesSupervisor',active:true,campus:'分校'},
 {name:'多校招生',phone:'13800001004',roleId:'sales',active:true,campus:'甲校区',campuses:['甲校区','乙校区']}
];
leadState.leads=['new','recycle','warning','cold','assigned','enrolled'].flatMap(status=>['甲校区','乙校区','丙校区',''].map(campus=>({leadId:status+campus,name:status+campus,phone:'13900000000',grade:'小一',subject:'数学',guardian:'妈妈',source:'主动来电',ownershipCampus:campus,campus:'其他意向',status:status==='enrolled'?'assigned':status,stage:status==='enrolled'?'已报名':'新线索',owner:['new','recycle'].includes(status)?'未分配':'多校招生',assignees:[],history:[],next:'未约定'})));
state.page='leadManage';leadState.manageTab='新线索';render();`);
assert.equal(run("permissionRole('campusAdmin').name"),'校区招生组长');
assert(!run("permissionRole('sales').grants.includes('leadManage')"));
run("leadSetManagementCampus('乙校区')");
for(const tab of ['新线索','回收池','预警中','冷宫池','已分配','已报名']){
 run(`setManageTab('${tab}')`);handlers();
 const html=node('#view').innerHTML;
 assert.equal((html.match(/id="lead-management-campus"/g)||[]).length,1);
 assert(html.indexOf('lead-management-campus')<html.indexOf('card pad'));
 assert(!html.includes('lead-pool-campus'));assert(!html.includes('lead-queue-campus'));
 assert.equal(run('leadManagementSelectedCampus()'),'乙校区');
 assert.equal(run('countLead("new")'),1);assert.equal(run('countLead("cold")'),1);
 assert(!html.includes('new甲校区'));assert(!html.includes('assigned甲校区'));
}
run("leadManagePoolResetFilters()");assert.equal(run('leadManagementSelectedCampus()'),'乙校区','local reset preserves global scope');
run("leadSetManagementCampus('__unrecorded__')");assert.equal(run('leadManageEnrolledRows().length'),1);
run("permissionChangeIdentity('staff:'+leadStaffAccessId(state.staff[0]));state.page='leadManage';setManageTab('新线索')");
assert.deepEqual(json('leadManageCampusOptions([])'),['甲校区','乙校区']);
assert.equal(run('leadManagementSelectedCampus()'),'甲校区');
run("leadSetManagementCampus('乙校区')");assert.equal(run('leadManagedCampus()'),'乙校区');
for(const value of ['','丙校区','__unrecorded__']){run(`leadSetManagementCampus('${value}')`);assert.equal(run('leadManagedCampus()'),'乙校区')}
assert.equal(run('leadCanManage(leadState.leads[2])'),false);
run("leadState.selected=2;leadState.modal='assign';leadState.assignmentDraft={lead:leadState.leads[2],ids:[3]};assignLead()");
assert.equal(run('leadState.leads[2].owner'),'未分配');
run("leadState.selected=1;leadState.modal='assign';render()");
assert.deepEqual(json('leadAssignmentCandidates().map(s=>s.name)'),['多校招生']);
run('leadState.assignmentDraft.ids=[3];assignLead()');assert.equal(run('leadState.leads[1].owner'),'多校招生');
run("state.staff[0].campuses=['甲校区'];render()");assert.equal(run('leadManagedCampus()'),'甲校区');
assert(!node('#view').innerHTML.includes('<select class="select" id="lead-management-campus"'));
run("permissionChangeIdentity('staff:'+leadStaffAccessId(state.staff[2]));state.page='leadManage';setManageTab('已报名')");
assert.equal(run('leadManageEnrolledRows().length'),4);
assert(node('#view').innerHTML.includes('全部校区'));
run("leadSetManagementCampus('丙校区')");assert.equal(run('leadManageEnrolledRows().length'),1);
run("permissionChangeIdentity('staff:'+leadStaffAccessId(state.staff[3]))");
assert.equal(run("permissionCanVisit('leadManage')"),false);
assert.equal(run("permissionCanVisit('myLeads')"),true);
assert.equal(run('leadCanManage(leadState.leads[1])'),false);
// Employee create/edit and reload preserve all campuses; no-campus supervisors remain allowed.
run("permissionChangeIdentity('admin');state.page='staff';state.mode='form';state.staffEdit=null;render()");
for(const [id,value] of Object.entries({'staff-name':'新组长','staff-phone':'13800001005','staff-role':'campusAdmin','staff-gender':'女'}))node('#'+id).value=value;
node('#staff-campus').selectedOptions=[{value:'甲校区'},{value:'乙校区'}];run('saveStaff()');
assert.deepEqual(json('state.staff.at(-1).campuses'),['甲校区','乙校区']);
run('const snapshotMulti=businessSnapshot();state.staff=[];businessRestore(snapshotMulti)');
assert.deepEqual(json('state.staff.at(-1).campuses'),['甲校区','乙校区']);
assert(run('permissionStaffPage()').includes('甲校区、乙校区'));
run("state.staffEdit=4;state.mode='form';render()");assert(node('#view').innerHTML.includes('multiple'));
node('#staff-campus').selectedOptions=[{value:'甲校区'},{value:'不存在'}];run('saveStaff()');
assert.deepEqual(json('state.staff[4].campuses'),['甲校区','乙校区']);
node('#staff-campus').selectedOptions=[];run('saveStaff()');assert.equal(run('state.mode'),'form');
node('#staff-role').value='salesSupervisor';run('saveStaff()');assert.equal(run('state.staff[4].campus'),'分校');
const headers=json('batchImportSchemas.staff.headers');
const csv=values=>headers.join(',')+'\n'+values.join(',');
run(`const importMulti=batchImportPlan('staff',${JSON.stringify(csv(['导入组长','13800001006','男','甲校区 | 乙校区','校区招生组长','已启用']))})`);
assert.deepEqual(json('importMulti.errors'),[]);assert.deepEqual(json('importMulti.plans[0].data.campuses'),['甲校区','乙校区']);
run(`const importEmpty=batchImportPlan('staff',${JSON.stringify(csv(['空校区组长','13800001007','男','','校区招生组长','已启用']))})`);
assert(run('importEmpty.errors.length')>0);
console.log('PASS: global campus heading/counts across all tabs, supervisor global access, single/multi-campus leadership, membership revocation, sales denied management, multi-campus assignment, staff edit/import/persistence.');
