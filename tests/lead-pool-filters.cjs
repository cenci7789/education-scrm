const assert=require('node:assert/strict');
const {run,json,node,handlers}=require('./prototype-runtime.cjs')();
run(`
permissionChangeIdentity('admin');
state.campuses=[{name:'甲校区',active:true},{name:'乙校区',active:true}];
state.staff=[{name:'甲管理员',phone:'13800000001',campus:'甲校区',roleId:'campusAdmin',active:true}];
leadState.leads=['recycle','warning','cold'].flatMap(status=>[
 {name:status+'甲一',ownershipCampus:'甲校区',owner:'甲招生',previousOwner:'甲招生'},
 {name:status+'甲二',ownershipCampus:'甲校区',owner:'乙招生、甲招生',previousOwner:'乙招生、甲招生'},
 {name:status+'乙',ownershipCampus:'乙校区',owner:'丙招生',previousOwner:'丙招生'},
 {name:status+'历史',ownershipCampus:'',owner:'未分配',previousOwner:''}
].map(item=>({...item,status,stage:'新线索',phone:'13900000000',grade:'小一',subject:'数学',guardian:'妈妈',next:'未约定',history:[],campus:'其他意向校区',...(status==='recycle'?{owner:'未分配'}:{})})));
state.page='leadManage';
`);
for(const [tab,status] of [['回收池','recycle'],['预警中','warning'],['冷宫池','cold']]){
 run(`leadState.manageTab='${tab}';leadSetManagementCampus('');render()`);
 assert.equal(run('leadManagePoolRows().length'),4);handlers();
 assert(node('#view').innerHTML.includes('id="lead-management-campus"'));
 assert(node('#view').innerHTML.includes('id="lead-pool-owner"'));
 run("leadManagePoolSetFilter('campus','甲校区');leadManagePoolSetFilter('owner','乙招生')");
 assert.deepEqual(json('leadManagePoolRows().map(l=>l.name)'),[status+'甲二']);
 assert(node('#view').innerHTML.includes('共 1 条线索'));
 const originalIndex=run('leadManagePoolRows()[0].index');
 assert.equal(run(`leadState.leads[${originalIndex}].name`),status+'甲二');
 if(tab==='预警中'){
  run('leadRemindWarnings()');
  assert.deepEqual(json("leadState.leads.filter(l=>l.status==='warning').map(l=>l.history.length)"),[0,1,0,0]);
 }
 run("leadManagePoolSetFilter('campus','乙校区')");
 assert.equal(run('leadManagePoolFilters().owner'),'');
 assert.deepEqual(json('leadManagePoolRows().map(l=>l.name)'),[status+'乙']);
 assert(!run('leadManagePoolFilterHTML()').includes('乙招生'));
 run("leadManagePoolSetFilter('campus','__unrecorded__');leadManagePoolSetFilter('owner','__unrecorded__')");
 assert.deepEqual(json('leadManagePoolRows().map(l=>l.name)'),[status+'历史']);
 run("leadManagePoolResetFilters();leadSetManagementCampus('')");assert.equal(run('leadManagePoolRows().length'),4);
}
run("leadState.manageTab='回收池';leadManagePoolSetFilter('campus','甲校区');leadState.manageTab='冷宫池'");
assert.equal(run('leadManagementSelectedCampus()'),'甲校区');
run("permissionChangeIdentity('staff:'+leadStaffAccessId(state.staff[0]));leadState.manageTab='回收池';render()");
assert.equal(run('leadManagePoolFilters().campus'),'');
assert.equal(run('leadManagePoolRows().length'),2);
assert(!run('leadManagePoolFilterHTML()').includes('乙校区'));
assert(!run('leadManagePoolFilterHTML()').includes('丙招生'));
run("leadManagePoolSetFilter('campus','乙校区')");assert.equal(run('leadManagePoolRows().length'),2);assert.equal(run('leadManagementSelectedCampus()'),'甲校区');
console.log('PASS: three pool filters, combined campus/owner matching, previous/multiple owners, reset, missing data, permission scope and filtered warning reminders.');
