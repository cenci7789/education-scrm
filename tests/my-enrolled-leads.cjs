const assert=require('node:assert/strict');
const {run,node,page}=require('./lead-registration.cjs');
run(`permissionChangeIdentity('sales');
  leadState.leads=[{leadId:'enrolled-lead',name:'已报名学生',guardian:'妈妈',phone:'13912345678',grade:'小二',owner:'王敏',status:'mine',stage:'已报名',history:[]}];
  a.students=[{id:'student-enrolled',name:'已报名学生',enrollments:[{classId:'class-active',className:'语文班',enrollmentStatus:'上课中'},{classId:'class-refund',className:'数学班',enrollmentStatus:'上课中'}]}];
  a.orders=[
    {originLeadId:'enrolled-lead',studentId:'student-enrolled',status:'交易成功',items:[{classId:'class-active',className:'语文班',course:'语文课程',enrollmentStatus:'上课中'},{classId:'class-refund',className:'数学班',course:'数学课程',enrollmentStatus:'已退费'}]},
    {studentId:'unrelated',student:'已报名学生',status:'交易成功',items:[{className:'他人的班级'}]}
  ];
  state.page='myLeads';leadState.mineTab='已报名';leadState.mineSearch='';render();`);
for(const label of ['学生 / 家长','年级','已报课程（班级）','当前状态','操作'])assert(page().includes('<th>'+label+'</th>'));
assert(!page().includes('<th>意向学科</th>'));
assert(page().includes('rowspan="2"'));assert(page().includes('共 1 位学生'));
assert(page().includes('语文班'));assert(page().includes('数学班'));
assert(page().includes('上课中</span>'));assert(page().includes('已退费</span>'));
assert(!page().includes('他人的班级'));
assert.equal(run('myEnrolledCourses(leadState.leads[0]).length'),2,'order items take precedence over duplicate student enrollments');
run("a.orders[0].status='已退费';render()");
assert(run('myEnrolledCourses(leadState.leads[0]).every(c=>c.status===\'已退费\')'));
assert.equal(run('leadMyCategory(leadState.leads[0])'),'已报名','refund keeps enrollment history in enrolled tab');
run("myLeadSearch('不存在')");assert(node('#my-lead-results').innerHTML.includes('暂无符合条件的已报名学生'));
run("myLeadSearch('139123');leadDetail(0,'myLeads')");assert.equal(run('state.page'),'leadDetail');
assert.equal(run('leadState.selected'),0);assert.equal(run('leadState.returnPage'),'myLeads');
run("a.orders=[];a.students=[];state.page='myLeads';render()");
assert(page().includes('暂无报名班级记录'));assert(!page().includes('上课中</span>'));
console.log('PASS: enrolled-only columns, grouped courses and independent refund states, stable identity matching, no duplicate snapshots, retained refund history, search/detail and missing-data fallback.');
