const assert=require('node:assert/strict'),{run,json,node}=require('./prototype-runtime.cjs')();
run(`state.config.班型=[['基础班',false,'对外别名',true],['提高班',true,'提高班',false]];courseOpenForm(null)`);
assert.deepEqual(json('courseConfiguredClassTypes()'),['基础班']);
let html=run('courseForm()');assert(html.includes('value="基础班"'));assert(!html.includes('value="提高班"'));assert(!html.includes('对外别名'));assert(!html.includes('S+班'));
for(const [id,value] of Object.entries({'course-name':'配置班型课程','course-category':'班课','course-format':'面授','course-class-type':'基础班','course-fee':'100'}))node('#'+id).value=value;
run('saveCourse()');assert.equal(run('a.courses[0].classType'),'基础班');
run('state.config.班型[0][3]=false;courseOpenForm(0)');assert.match(run('courseForm()'),/value="基础班" selected disabled>基础班（历史班型）/);
run('saveCourse()');assert.equal(run('a.courses[0].classType'),'基础班');
run('courseOpenForm(0)');node('#course-class-type').value='';run('saveCourse()');assert.equal(run('a.courses[0].classType'),'');
run('courseOpenForm(null)');node('#course-name').value='非法班型课程';node('#course-class-type').value='基础班';const count=run('a.courses.length');run('saveCourse()');assert.equal(run('a.courses.length'),count);
run('state.config.班型=[]');node('#course-class-type').value='';run('saveCourse()');assert.equal(run('a.courses[0].classType'),'');assert.equal(run('a.courses.length'),count+1);
run(`state.config.班型=[['精品班',true,'公开名',true]];state.page='course';batchImportOpen('course')`);
const headers=json('batchImportSchemas.course.headers');
function preview(type){node('#batch-import-text').value=headers.join(',')+'\n'+['班型导入测试','面授','2030','春季','数学','1年级',type,'100','第一讲'].join(',');run('batchImportPreview()');return json('batchImportState.preview')}
assert.deepEqual(preview('精品班').errors,[]);assert.equal(run('batchImportState.preview.plans[0].data.classType'),'精品班');assert(preview('公开名').errors.length);assert.deepEqual(preview('').errors,[]);
run('state.config.班型[0][3]=false');assert(preview('精品班').errors.length);
console.log('PASS: configured internal class types, active options, save/edit/clear, historical values, empty configuration, invalid selection and course import.');
