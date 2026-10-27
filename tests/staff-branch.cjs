const assert=require('node:assert/strict'),{run,json,node}=require('./prototype-runtime.cjs')();
run("state.page='staff';state.mode='form';state.staffEdit=null;state.campuses=[];state.staff=[]");
const role=run('permissionState.roles.find(r=>r.active).id');
for(const [id,value] of Object.entries({'staff-name':'分校员工','staff-phone':'13845670901','staff-gender':'男','staff-role':role,'staff-campus':''}))node('#'+id).value=value;
assert(run('permissionStaffForm()').includes('不选择校区（归属分校）'));
run('permissionSaveStaff()');assert.equal(run('state.staff.length'),1);assert.equal(run('state.staff[0].campus'),'分校');assert(run('permissionStaffPage()').includes('<td>分校</td>'));
run("state.staffEdit=0;state.mode='form';state.campuses=[{name:'测试校区',active:true}]");node('#staff-campus').value='测试校区';run('permissionSaveStaff()');assert.equal(run('state.staff[0].campus'),'测试校区');
node('#staff-campus').value='';run('permissionSaveStaff()');assert.equal(run('state.staff[0].campus'),'分校');
node('#staff-campus').value='不存在';run("state.mode='form';permissionSaveStaff()");assert.equal(run('state.staff[0].campus'),'分校');assert.equal(run('state.mode'),'form');
run("state.staffEdit=null;batchImportOpen('staff')");
const headers=json('batchImportSchemas.staff.headers'),roleName=run('permissionState.roles.find(r=>r.active).name');
function preview(campus){node('#batch-import-text').value=headers.join(',')+'\n'+['导入分校员工','13845670902','女',campus,roleName,'已启用'].join(',');run('batchImportPreview()');return json('batchImportState.preview')}
for(const value of ['','分校']){assert.deepEqual(preview(value).errors,[]);assert.equal(run('batchImportState.preview.plans[0].data.campus'),'分校')}
assert(preview('不存在').errors.length);assert.deepEqual(preview('').errors,[]);run('batchImportCommit()');assert.equal(run('state.staff.at(-1).campus'),'分校');
console.log('PASS: create without campuses, edit/clear campus, branch list label, invalid campus guard, staff import blank/explicit branch.');
