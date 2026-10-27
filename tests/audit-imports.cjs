const assert=require('node:assert/strict');const {run,json,node,clicks}=require('./prototype-runtime.cjs')();
function prepare(kind,rows){run(`state.page=${JSON.stringify(kind==='staff'?'staff':kind==='trial'?'quickTrial':'enroll')};batchImportOpen('${kind}')`);const text=json(`batchImportSchemas.${kind}.headers`).join(',')+'\n'+rows.map(r=>r.join(',')).join('\n');node('#batch-import-text').value=text;run('batchImportPreview()');return json('batchImportState.preview')}
const grade=run('leadGradeNames[0]'),cls=run('a.classes[0].id');
let p=prepare('trial',[['','试听导入','13855557777',grade,cls,'','','','','测试']]);assert.deepEqual(p.errors,[]);run('batchImportCommit();batchImportCommit()');assert.equal(run('trialState.requests.length'),1);assert.equal(run('trialState.requests[0].status'),'待排班');assert.equal(run('trialState.requests[0].requestedClassId'),cls);
p=prepare('trial',[['','试听导入','13855557777',grade,cls,'','','','','测试']]);assert(p.errors.length);run('batchImportCommit()');assert.equal(run('trialState.requests.length'),1);
const campus=run('state.campuses.find(c=>c.active).name'),role=run('permissionState.roles.find(r=>r.active).name'),before=run('state.staff.length');
p=prepare('staff',[['有效员工','13877771111','男',campus,role,'已启用'],['错误员工','bad','男',campus,role,'已启用']]);assert(p.errors.length);run('batchImportCommit()');assert.equal(run('state.staff.length'),before,'batch with one error writes nothing');
p=prepare('staff',[['有效员工','13877771111','男',campus,role,'已启用']]);assert.deepEqual(p.errors,[]);run('batchImportTemplate();batchImportCommit()');assert.equal(clicks.at(-1).download,'导入员工模板.csv');assert.equal(run('state.staff.length'),before+1);
p=prepare('staff',[['重复手机号','13877771111','女',campus,role,'已启用']]);assert(p.errors.length);
run("batchImportClose();permissionState.identity='teacher';batchImportOpen('staff')");assert.equal(run('batchImportState.kind'),null);
console.log('PASS batch trial/staff templates, valid save, duplicates, malformed phone, all-or-none and access guards.');
