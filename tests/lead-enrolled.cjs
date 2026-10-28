const assert=require('node:assert/strict');
const {run,json,node,handlers}=require('./prototype-runtime.cjs')();
run(`
const ActualDate=Date;Date=class extends ActualDate{constructor(...args){super(...(args.length?args:['2026-10-27T12:00:00']))}static now(){return new ActualDate('2026-10-27T12:00:00').getTime()}};
permissionChangeIdentity('admin');
const owner=leadCurrentOperator().name;
leadState.leads=[
 {leadId:'multi',studentId:'S1',name:'多次报名',ownershipCampus:'甲校区',owner},
 {leadId:'yesterday',studentId:'S2',name:'昨日报名',ownershipCampus:'甲校区',owner},
 {leadId:'unknown',name:'日期缺失',ownershipCampus:'甲校区',owner},
 {leadId:'other',name:'他人报名',ownershipCampus:'乙校区',owner:'其他招生'}
].map(l=>({...l,status:'mine',stage:'已报名',guardian:'妈妈',phone:'13900000000',grade:'小一',subject:'数学',history:[]}));
a.students=[];a.classes=[];
a.orders=[
 {id:'O1',originLeadId:'multi',studentId:'S1',createdAt:'2026-08-01T00:00:00',status:'交易成功'},
 {id:'O2',studentId:'S1',createdAt:'2026-10-27T23:59:59',status:'等待付款'},
 {id:'O3',originLeadId:'yesterday',studentId:'S2',createdAt:'2026-10-26T00:00:00',status:'交易成功'},
 {id:'O4',originLeadId:'other',createdAt:'2026-10-27T08:00:00',status:'交易成功'},
 {id:'O5',studentId:'S2',createdAt:'2026-10-27T09:00:00',transferId:'TRANSFER',status:'交易成功'},
 {id:'O6',studentId:'S2',createdAt:'2026-10-27T10:00:00',status:'已取消'}
];state.page='leadManage';leadState.manageTab='已报名';render();
`);
assert.equal(run('leadManageEnrolledRows().length'),4);handlers();
assert.deepEqual(json('leadEnrollmentDates(leadState.leads[1])'),['2026-10-26']);
for(const [preset,from,to,count] of [['今天','2026-10-27','2026-10-27',2],['昨天','2026-10-26','2026-10-26',1],['近7天','2026-10-21','2026-10-27',3],['近30天','2026-09-28','2026-10-27',3],['近90天','2026-07-30','2026-10-27',3]]){
 run(`leadEnrolledQuickDate('leadManage','${preset}')`);
 assert.deepEqual(json("leadEnrolledFilters('leadManage')"),{from,to,preset});
 assert.equal(run('leadManageEnrolledRows().length'),count);handlers();
}
run("leadEnrolledSetDate('leadManage','from','2026-08-01');leadEnrolledSetDate('leadManage','to','2026-08-01')");
assert.deepEqual(json('leadManageEnrolledRows().map(l=>l.name)'),['多次报名']);
run("leadEnrolledSetDate('leadManage','from','2026-08-02')");
assert.equal(run('leadManageEnrolledRows().length'),0);assert(node('#view').innerHTML.includes('开始日期不能晚于结束日期'));
run("leadEnrolledQuickDate('leadManage','全部');state.page='myLeads';leadState.mineTab='已报名';render()");
assert.equal(run('myLeadRows().length'),3);
run("leadEnrolledQuickDate('myLeads','今天')");assert.deepEqual(json('myLeadRows().map(l=>l.name)'),['多次报名']);
assert(node('#view').innerHTML.includes('2026-10-27'));
run("myLeadSearch('不匹配')");assert.equal(run('myLeadRows().length'),0);
run("myLeadSearch('');leadEnrolledQuickDate('myLeads','全部')");assert.equal(run('myLeadRows().length'),3);
assert.equal(run("leadEnrolledFilters('leadManage').from"),'');
// Every management tab exposes the new entry; history dates never invent a year.
for(const tab of ['新线索','回收池','预警中','冷宫池','已分配','已报名']){run(`state.page='leadManage';leadState.manageTab='${tab}';render()`);assert(node('#view').innerHTML.includes("setManageTab('已报名')"));handlers()}
run("leadState.leads[2].history=[['报名完成','10-27','历史记录']]");assert.deepEqual(json('leadEnrollmentDates(leadState.leads[2])'),[]);
run("state.staff=[{name:'甲管理员',campus:'甲校区',active:true,phone:'13800000001',roleId:'campusAdmin'}];state.campuses=[{name:'甲校区',active:true}];permissionChangeIdentity('staff:'+leadStaffAccessId(state.staff[0]));leadState.manageTab='已报名';render()");
assert.equal(run('leadManageEnrolledRows().length'),3);assert(!node('#view').innerHTML.includes('他人报名'));
console.log('PASS: enrollment dates from any linked registration, partial payment, date boundaries/presets, reset/search, missing dates, all navigation tabs and campus/owner scope.');
