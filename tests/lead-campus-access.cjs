const assert=require('node:assert/strict');
const {run,json,node,handlers}=require('./prototype-runtime.cjs')();
run(`
state.campuses=[{name:'甲校区',active:true},{name:'乙校区',active:true}];
state.staff=[
 {name:'甲管理员',phone:'13800000001',campus:'甲校区',roleId:'campusAdmin',active:true},
 {name:'乙管理员',phone:'13800000002',campus:'乙校区',roleId:'campusAdmin',active:true},
 {name:'甲招生',phone:'13800000003',campus:'甲校区',roleId:'sales',active:true},
 {name:'乙招生',phone:'13800000004',campus:'乙校区',roleId:'sales',active:true}
];
const campusAIdentity='staff:'+leadStaffAccessId(state.staff[0]),campusBIdentity='staff:'+leadStaffAccessId(state.staff[1]);
leadState.leads=['new','recycle','warning','cold','assigned'].flatMap(status=>['甲校区','乙校区'].map(campus=>({
 name:campus+'-'+status,phone:'13900000000',grade:'小一',subject:'数学',guardian:'妈妈',source:'主动来电',
 ownershipCampus:campus,campus:campus==='甲校区'?'乙校区':'甲校区',status,stage:'新线索',next:'未约定',owner:status==='assigned'?campus[0]+'招生':'未分配',assignees:[],history:[]
})));
leadState.leads.push({...leadState.leads[0],name:'未归属历史线索',ownershipCampus:'',history:[]});
state.page='leadManage';leadState.manageTab='新线索';permissionChangeIdentity(campusAIdentity);
`);
assert.equal(run('leadManagedCampus()'),'甲校区');
assert.equal(run('permissionRole().id'),'campusAdmin');
assert.equal(run('leadCurrentOperator().name'),'甲管理员');
assert(node('#demo-role').innerHTML.includes('甲管理员 · 校区招生组长 · 甲校区'));
for(const [tab,status] of [['新线索','new'],['回收池','recycle'],['预警中','warning'],['冷宫池','cold'],['已分配','assigned']]){
 run(`leadState.manageTab=${JSON.stringify(tab)};render()`);
 const html=node('#view').innerHTML;
 assert(html.includes('甲校区-'+status),tab);
 assert(!html.includes('乙校区-'+status),tab);
 assert(!html.includes('未归属历史线索'));
 assert.equal(run(`countLead('${status}')`),1);handlers();
}
run("leadState.manageTab='新线索';leadState.queueCampus='乙校区';render()");
assert(!node('#view').innerHTML.includes('乙校区-new'));
assert.deepEqual(json('leadManageCampusOptions(leadState.leads)'),['甲校区']);
run("leadDetail(1,'leadManage')");assert.equal(run('state.page'),'leadManage');
run("leadDetail(1,'myLeads')");assert.equal(run('state.page'),'leadManage');
run("leadState.selected=1;state.page='leadDetail';leadState.returnPage='leadManage';render()");
assert(node('#view').innerHTML.includes('无权限'));assert(!node('#view').innerHTML.includes('乙校区-new'));
// Submit handlers must enforce scope even with a forged/stale selected index.
const otherBefore=json('leadState.leads[1]');
run("leadState.modal='assign';leadState.assignmentDraft={lead:leadState.leads[1],ids:[2]};assignLead();remindLead(1);reactivateLead(1);leadState.modal='cold';archiveLead();leadOpenForm('edit');leadState.formMode='edit';saveLead()");
assert.deepEqual(json('leadState.leads[1]'),otherBefore);
// Global warning action only writes within the operator's scope.
run("state.page='leadManage';leadRemindWarnings()");
assert.equal(run('leadState.leads[4].history.length'),1);
assert.equal(run('leadState.leads[5].history.length'),0);
assert.equal(run('leadState.leads[4].history[0][3].operator.name'),'甲管理员');
// In-campus assignment works; outsiders cannot be injected into the picker.
run("leadState.formMode='create';leadState.selected=0;leadState.modal='assign';render()");
assert.deepEqual(json('leadAssignmentCandidates().map(s=>s.name)'),['甲招生']);
run('leadState.assignmentDraft.ids=[3];assignLead()');assert.equal(run('leadState.leads[0].status'),'new');
run('leadState.assignmentDraft.ids=[2];assignLead()');assert.equal(run('leadState.leads[0].owner'),'甲招生');
assert.equal(run('leadState.leads[0].ownershipCampus'),'甲校区');
run('permissionChangeIdentity(campusBIdentity);state.page="leadManage";render()');
assert(node('#view').innerHTML.includes('乙校区-new'));assert(!node('#view').innerHTML.includes('甲校区-new'));
// Revocation, employee moves, inactive campuses and roles all take effect without a reload.
run("permissionChangeIdentity(campusAIdentity);leadState.selected=0;leadState.modal='assign';render();state.staff[0].campus='乙校区'");
assert.equal(run('leadCanManage(leadState.leads[0])'),false);
const before=json('leadState.leads[0]');run('assignLead()');assert.deepEqual(json('leadState.leads[0]'),before);
run("state.staff[0].campus='甲校区';state.staff[0].active=false");assert.equal(run("permissionCanVisit('leadManage')"),false);
run('state.staff[0].active=true;state.campuses[0].active=false');assert.equal(run('leadCanManage(leadState.leads[0])'),false);
run("state.campuses[0].active=true;permissionRole('campusAdmin').grants=[]");assert.equal(run('leadCanManage(leadState.leads[0])'),false);
run("permissionRole('campusAdmin').grants=['leadManage'];permissionRole('campusAdmin').active=false");assert.equal(run('leadCanManage(leadState.leads[0])'),false);
run("permissionRole('campusAdmin').active=true;permissionChangeIdentity('campusAdmin')");assert.equal(run("permissionCanVisit('leadManage')"),false);
// Root configures campus permissions through employees, with validation and persistence.
run("permissionChangeIdentity('admin');state.page='staff';state.mode='form';state.staffEdit=null;render()");
assert(node('#view').innerHTML.includes('只能管理所属校区的线索'));handlers();
for(const [id,value] of Object.entries({'staff-name':'丙管理员','staff-phone':'13800000005','staff-role':'campusAdmin','staff-gender':'女'}))node('#'+id).value=value;
const staffCount=run('state.staff.length');
for(const campus of ['', '不存在']){node('#staff-campus').value=campus;run('saveStaff()');assert.equal(run('state.staff.length'),staffCount)}
node('#staff-campus').value='乙校区';run('saveStaff()');assert.equal(run('state.staff.length'),staffCount+1);
run('const campusSnapshot=businessSnapshot();state.staff=[];businessRestore(campusSnapshot);permissionChangeIdentity(campusAIdentity)');
assert.equal(run('leadManagedCampus()'),'甲校区');
assert.equal(run('leadCurrentOperator().name'),'甲管理员');
run("permissionChangeIdentity('admin');state.page='leadManage';leadState.manageTab='新线索';leadState.queueCampus='';render()");
assert(node('#view').innerHTML.includes('未归属历史线索'));
// Switching employee identity must also separate registration ownership and audit actors.
run("permissionChangeIdentity(campusAIdentity);state.page='quickRegister';render();leadOpenForm()");
for(const [id,value] of Object.entries({'lead-name':'甲登记记录','lead-phone':'13900001111','lead-ownership-campus':'甲校区','lead-campus':'乙校区'}))node('#'+id).value=value;
run('saveLead()');assert.equal(run('leadState.leads[0].registrar'),'甲管理员');
assert.equal(run('shortcutOwnLead(leadState.leads[0])'),true);
assert.equal(run('leadState.leads[0].history[0][3].operator.name'),'甲管理员');
run('permissionChangeIdentity(campusBIdentity)');assert.equal(run('shortcutOwnLead(leadState.leads[0])'),false);
run("leadDetail(0,'quickRegister')");assert.equal(run('state.page'),'quickRegister');
assert(!node('#view').innerHTML.includes('甲登记记录'));
console.log('PASS: campus-scoped lists/counts, employee identity/configuration, cross-campus access/actions, assignment revalidation, revocation and snapshot restore.');
