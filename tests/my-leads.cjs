const assert=require('node:assert/strict');
const {run,node,page}=require('./lead-registration.cjs');
run(`permissionChangeIdentity('sales');
  const base={name:'测试',guardian:'妈妈',phone:'13912345678',grade:'小二',subject:'数学',intent:'中意向',owner:'王敏',status:'mine',stage:'新线索',next:'未约定',history:[]};
  leadState.leads=[
    {...base,leadId:'new',name:'新分配学生',stage:'新分配'},
    {...base,leadId:'following',name:'已约跟进',next:'2027-12-01 10:00'},
    {...base,leadId:'trial',name:'试听学生'},
    {...base,leadId:'enrolled',name:'已报名学生',stage:'已报名'},
    {...base,leadId:'cold',name:'冷宫学生',status:'cold',stage:'冷宫池'},
    {...base,leadId:'other-enrolled',name:'他人的报名',owner:'陈静',status:'assigned',stage:'已报名'},
    {...base,leadId:'other-trial',name:'他人的试听',owner:'陈静',status:'assigned'},
    {...base,leadId:'pool',name:'公海学生',owner:'未分配',status:'new'},
    {...base,leadId:'contacted',name:'沟通过但未约时间',stage:'跟进中'}
  ];
  trialState.requests=[
    {leadId:'trial',status:'待排班'},{leadId:'trial',status:'已排班'},
    {leadId:'enrolled',status:'已排班'},{leadId:'cold',status:'待排班'},
    {leadId:'other-trial',status:'待排班'}
  ];
  leadState.mineTab='可跟进';leadState.mineSearch='';state.page='myLeads';render();`);
assert.deepEqual(JSON.parse(run('JSON.stringify(myLeadCategories)')),['可跟进','约试听','已报名']);
assert.equal(run('myLeadRows().length'),3);
assert.equal(run('leadMyStage(leadState.leads[0])'),'新线索');
assert.equal(run('leadMyStage(leadState.leads[1])'),'跟进中');
assert.equal(run('leadMyStage(leadState.leads[8])'),'新线索');
assert(!run('myLeadResults()').includes('试听学生'));assert(!run('myLeadResults()').includes('已报名学生'));
assert(!run('myLeadResults()').includes('新分配</span>'));
for(const [tab,count] of [['可跟进',3],['约试听',1],['已报名',1]]){
  run(`setMineTab('${tab}')`);
  assert.equal(run('myLeadRows().length'),count,tab);
  assert(page().includes(`${tab} <small>${count}</small>`));
  assert(!run('myLeadResults()').includes('他人的'));
}
run("setMineTab('冷宫池')");
assert.equal(run('leadState.mineTab'),'可跟进','old saved tab falls back to an available tab');
assert(!page().includes("setMineTab('冷宫池')"));
assert(!run('myLeadResults()').includes('冷宫学生'));
assert.equal(run('leadState.leads[4].status'),'cold','archived data retained');
run("setMineTab('可跟进');myLeadSearch('已约')");
assert.equal(run('myLeadRows().length'),1);
assert(node('#my-lead-results').innerHTML.includes('共 1 条线索'));
run("myLeadSearch('不存在')");assert(node('#my-lead-results').innerHTML.includes('暂无符合条件'));
run("myLeadSearch('');trialState.requests[0].status='已取消'");
assert.equal(run('leadMyCategory(leadState.leads[2])'),'约试听','one remaining active reservation keeps the lead in trial');
run("trialState.requests[1].status='已取消'");
assert.equal(run('leadMyCategory(leadState.leads[2])'),'可跟进');
run("leadState.leads[2].owner='陈静';leadState.leads[2].status='assigned'");
assert.equal(run('leadMyCategory(leadState.leads[2])'),'');
run(`leadAppendCommunication(leadState.leads[0],'有效沟通但未约时间',[],{result:'有效沟通',channel:'电话',intent:'中意向',nextTime:''})`);
assert.equal(run('leadState.leads[0].stage'),'新线索');
run(`leadAppendCommunication(leadState.leads[0],'约定回访',[],{result:'有效沟通',channel:'电话',intent:'中意向',nextTime:'2027-12-01T10:00'})`);
assert.equal(run('leadState.leads[0].stage'),'跟进中');
console.log('PASS: three visible owner-scoped categories, old cold-tab fallback, archived data retained, followup stages, trial counting, cancellation fallback, reassignment and search.');
