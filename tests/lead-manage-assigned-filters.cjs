const assert=require('node:assert/strict');
const {run,json,node,handlers}=require('./prototype-runtime.cjs')();
run(`permissionChangeIdentity('admin');
state.campuses=[{name:'甲校区',active:true},{name:'乙校区',active:true}];
state.staff=[{name:'甲主管',account:'manager-a',campus:'甲校区',roleId:'campusAdmin',active:true}];
leadState.leads=[
 {leadId:'new-owner',name:'新分配学生',owner:'甲招生',stage:'新分配'},
 {leadId:'following',name:'跟进学生',owner:'甲招生、共同招生',stage:'跟进中'},
 {leadId:'trial',name:'试听学生',owner:'共同招生',stage:'跟进中'},
 {leadId:'returned',name:'试听回流学生',owner:'甲招生',stage:'约试听'},
 {leadId:'warning',name:'预警学生',owner:'甲招生',status:'warning',stage:'跟进中'},
 {leadId:'enrolled-a',name:'甲报名学生',owner:'甲招生、共同招生',stage:'已报名'},
 {leadId:'enrolled-b',name:'乙报名学生',owner:'乙招生',stage:'已报名',ownershipCampus:'乙校区'},
 {leadId:'other',name:'乙跟进学生',owner:'乙招生',stage:'跟进中',ownershipCampus:'乙校区'},
 {leadId:'unrecorded',name:'历史跟进学生',owner:'历史招生',stage:'新线索',ownershipCampus:''}
].map(l=>({ownershipCampus:'甲校区',status:'assigned',guardian:'妈妈',phone:'13900000000',grade:'小一',subject:'数学',history:[],next:'未约定',...l}));
trialState.requests=[{id:'T1',leadId:'trial',status:'已排班'},{id:'T2',leadId:'returned',status:'已排班',salesReturnedAt:'2026-10-25'}];
a.students=[];a.orders=[{id:'O1',originLeadId:'enrolled-a',createdAt:'2026-08-01T10:00:00',status:'交易成功'},{id:'O2',originLeadId:'enrolled-a',createdAt:'2026-10-27T10:00:00',status:'等待付款'},{id:'O3',originLeadId:'enrolled-b',createdAt:'2026-10-27T10:00:00',status:'交易成功'}];
state.page='leadManage';leadState.manageTab='已分配';render();`);
assert.equal(run('leadManagePoolRows().length'),7);handlers();
assert(!node('#view').innerHTML.includes('甲报名学生'));
assert.deepEqual(json("leadState.leads.slice(0,5).map(leadAssignedCategory)"),['跟进中','跟进中','约试听','跟进中','跟进中']);
run("leadManagePoolSetFilter('campus','甲校区');leadManagePoolSetFilter('owner','共同招生');leadManagePoolSetFilter('stage','跟进中')");
assert.deepEqual(json('leadManagePoolRows().map(l=>l.name)'),['跟进学生']);
assert(node('#view').innerHTML.includes('共 1 条线索'));handlers();
run("leadManagePoolSetFilter('stage','约试听')");
assert.deepEqual(json('leadManagePoolRows().map(l=>l.name)'),['试听学生']);
assert.equal(run('leadManagePoolRows()[0].index'),2,'filtered row keeps original index');
run("leadManagePoolSetFilter('campus','乙校区')");assert.equal(run('leadManagePoolFilters().owner'),'');
assert.equal(run('leadManagePoolRows().length'),0);assert(!run('leadManagePoolFilterHTML()').includes('共同招生'));
run("leadManagePoolResetFilters();leadSetManagementCampus('')");assert.equal(run('leadManagePoolRows().length'),7);
run("leadManagePoolSetFilter('campus','__unrecorded__')");assert.deepEqual(json('leadManagePoolRows().map(l=>l.name)'),['历史跟进学生']);
run("setManageTab('已报名');leadManagePoolSetFilter('campus','甲校区');leadManagePoolSetFilter('owner','共同招生');leadEnrolledSetDate('leadManage','from','2026-10-27');leadEnrolledSetDate('leadManage','to','2026-10-27')");
assert.deepEqual(json('leadManageEnrolledRows().map(l=>l.name)'),['甲报名学生']);handlers();
assert(!node('#view').innerHTML.includes('lead-pool-stage'));
run("leadEnrolledSetDate('leadManage','from','2026-10-28');leadEnrolledSetDate('leadManage','to','2026-10-28')");
assert.equal(run('leadManageEnrolledRows().length'),0);
run("leadEnrolledQuickDate('leadManage','全部')");assert.equal(run('leadManageEnrolledRows().length'),1);
assert.equal(run('leadManagementSelectedCampus()'),'甲校区','campus filter is shared across tabs');
run("permissionChangeIdentity('staff:'+leadStaffAccessId(state.staff[0]));setManageTab('已分配')");
assert.equal(run('leadManagePoolRows().length'),5);assert(!run('leadManagePoolFilterHTML()').includes('乙招生'));
run("setManageTab('已报名')");assert.equal(run('leadManageEnrolledRows().length'),1);assert(!run('leadManagePoolFilterHTML()').includes('乙校区'));
console.log('PASS: assigned category parity, campus/owner/status intersection, shared owners, original row indices, tab isolation, any-enrollment dates and campus permission scope.');
