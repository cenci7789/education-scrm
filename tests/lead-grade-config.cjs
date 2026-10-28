const assert=require('node:assert/strict'),{run,json,node}=require('./prototype-runtime.cjs')();
run(`state.config.年级=[['1年级',false,'商城一年级',true],['2年级',true,'商城二年级',false],['初四',true,'初四',true],['学前班',true,'启蒙',true]]`);
assert.deepEqual(json('leadConfiguredGradeNames()'),['1年级','初四','学前班']);
for(const value of ['小一','一年级','小学一年级','1年级'])assert.equal(run(`leadConfiguredGrade(${JSON.stringify(value)})`),'1年级');
for(const value of ['小二','2年级','商城一年级','不存在'])assert.equal(run(`leadConfiguredGrade(${JSON.stringify(value)})`),'');
assert.equal(run("leadConfiguredGrade('初中四年级')"),'初四');
assert.equal(run("leadConfiguredGrade('学前班')"),'学前班');
let html=run('leadGradeSelect()');assert(html.includes('1年级'));assert(!html.includes('2年级'));assert(!html.includes('商城一年级'));
run(`leadState.leads=[{name:'测试',grade:'旧年级',schools:[{stage:'小学',entryYear:new Date().getFullYear()-(new Date().getMonth()<8?1:0)}]}];leadRefreshSchoolGrades()`);
assert.equal(run('leadState.leads[0].grade'),'1年级');
run('state.config.年级[0][3]=false;leadRefreshSchoolGrades()');assert.equal(run('leadState.leads[0].grade'),'1年级');
run('state.config.年级=[];leadRefreshSchoolGrades()');assert.equal(run('leadState.leads[0].grade'),'1年级');assert(run('leadGradeSelect()').includes('请先在教学配置中启用年级'));
run(`state.config.年级=[['学前班',true,'启蒙',true]];state.page='myLeads';batchImportOpen('lead')`);
const headers=json('batchImportSchemas.lead.headers');
function preview(grade){node('#batch-import-text').value=headers.join(',')+'\n'+['年级导入测试','13855550001',grade,'男','妈妈','数学','主动来电','统一分配','','','','',''].join(',');run('batchImportPreview()');return json('batchImportState.preview')}
assert.deepEqual(preview('学前班').errors,[]);assert.equal(run('batchImportState.preview.plans[0].data.grade'),'学前班');
assert(preview('小一').errors.some(e=>e.includes('已启用的年级')));
run('state.config.年级[0][3]=false');assert(preview('学前班').errors.some(e=>e.includes('已启用的年级')));
console.log('PASS: enabled configured grades, internal names, progression aliases, preservation after disable/delete, empty configuration and lead import validation.');
