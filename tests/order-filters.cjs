const assert=require('node:assert/strict');
const {run,node,page}=require('./lead-registration.cjs');
run("permissionChangeIdentity('admin');state.page='orders';a.orderTab='全部订单';a.orderFilters={};render()");
for(const label of ['学期','年级','科目','校区','授课形式','日期（订单创建日期）','班级名称','搜索学生ID、姓名、联系电话','重置筛选'])assert(page().includes(label),label);
assert(!page().includes('搜索商品名称'));
// Legacy fixtures can be linked unambiguously; missing timestamps stay unknown.
assert.equal(run("orderPrepare(a.orders.find(o=>o.id==='COMB117268540979')).studentId"),'12562728');
assert.equal(run("orderCreatedDate(a.orders.find(o=>o.id==='COMB117268540979'))"),'');
run(`a.orders=[
  {id:'A',student:'张小明',studentId:'S100',studentPhone:'13912345678',createdAt:'2026-10-20T23:59:59',product:'数学班、语文班',status:'等待付款',amount:'¥2000',paid:'¥0',items:[
    {className:'秋季数学一班',term:'秋季',grade:'小二',subject:'数学',campus:'城中校区',format:'面授'},
    {className:'春季语文二班',term:'春季',grade:'4年级',subject:'语文',campus:'园区校区',format:'直播'}
  ]},
  {id:'B',student:'王小明',studentId:'S200',studentPhone:'13800001234',createdAt:'2026-10-19T00:00:00',product:'直播数学班',status:'交易成功',amount:'¥1000',paid:'¥1000',items:[
    {className:'秋季数学直播班',term:'秋季',grade:'2年级',subject:'数学',campus:'园区校区',format:'直播'}
  ]},
  {id:'C',student:'李<同学>',studentId:'S300',studentPhone:'13700005678',product:'资料不全',status:'等待付款',amount:'¥100',paid:'¥0',items:[]}
];render()`);
const ids=()=>run('orderFilteredRows().map(o=>o.id).join(",")');
function filter(values){run(`a.orderFilters=${JSON.stringify(values)}`);return ids()}
assert.equal(filter({term:'春季'}),'A');
assert.equal(filter({grade:'2'}),'A,B');
assert.equal(filter({subject:'语文'}),'A');
assert.equal(filter({campus:'城中校区'}),'A');
assert.equal(filter({format:'直播'}),'A,B');
assert.equal(filter({className:'直播班'}),'B');
for(const q of ['S100','张小明','13912345678','345678','  张小明  '])assert.equal(filter({student:q}),'A',q);
assert.equal(filter({term:'秋季',grade:'2',subject:'数学',campus:'园区校区',format:'直播'}),'B');
assert.equal(filter({subject:'数学',campus:'园区校区',className:'春季语文'}),'');
assert.equal(filter({dateFrom:'2026-10-20',dateTo:'2026-10-20'}),'A');
assert.equal(filter({dateTo:'2026-10-19'}),'B');
assert.equal(filter({dateFrom:'2026-10-21',dateTo:'2026-10-19'}),'');
assert(run('orderResults()').includes('开始日期不能晚于结束日期'));
filter({subject:'数学'});
run("ordersTab('成功的订单')");
assert.equal(ids(),'B');assert.equal(run('orderFilters().subject'),'数学');
run("ordersTab('等待买家付款')");
assert.equal(ids(),'A');
run("orderSetFilter('student','不存在')");
assert(node('#order-results').innerHTML.includes('没有符合条件的订单'));
run('orderResetFilters()');assert.equal(ids(),'A,C');
run("ordersTab('全部订单')");assert.equal(ids(),'A,B,C');
assert(page().includes('李&lt;同学&gt;'));
// Existing order snapshots do not change when class metadata changes.
run("a.orders[0].items[0].classId=a.classes[0].id;a.classes[0].campus='其他校区'");
assert.equal(filter({campus:'城中校区'}),'A');
console.log('PASS: all order filters, ID/name/phone lookup, same-item matching, inclusive creation-date range, missing dates, invalid range, status tabs, reset, empty state and historical metadata.');
