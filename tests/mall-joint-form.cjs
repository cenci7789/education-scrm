const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),nodes=new Map();
const node=k=>{if(!nodes.has(k))nodes.set(k,{value:'',innerHTML:'',textContent:'',classList:{add(){},remove(){},toggle(){}},querySelector(){return null},setAttribute(k,v){this[k]=v}});return nodes.get(k)};
const ctx=vm.createContext({document:{querySelector:node,querySelectorAll(){return []},getElementById:id=>node('#'+id)},setTimeout(){},setInterval(){},clearInterval(){},URL,location:{href:'http://localhost/'}}),run=s=>vm.runInContext(s,ctx),json=s=>JSON.parse(run('JSON.stringify('+s+')'));
for(const m of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script(?: src="([^"]+)")?>([\s\S]*?)<\/script>/g))run(m[1]?fs.readFileSync(path.join(root,m[1]),'utf8'):m[2]);
run("mallNew('joint')");
const page=node('#view').innerHTML;
for(const label of ['活动规则','报名班级数量','单班优惠','总价立减','总价折扣','优惠券叠加','全选','在读学员','非在读学员','历史学员','从未报名过课程的学员'])assert(page.includes(label),label);
for(const label of ['联报有效期','虚拟成团','成团人数','阶梯联报','课程联报价'])assert(!page.includes(label),label+' removed');
assert.deepEqual(json('jointRules().map(r=>r.quantity)'),['1','2','3']);
// Validate generated event code, then run participant selection through actual emitted handlers.
for(const m of page.matchAll(/\bon(?:click|change|input)="([^"]*)"/g))new vm.Script('(function(){'+m[1].replaceAll('&quot;','"').replaceAll('&#39;',"'").replaceAll('&amp;','&')+'})');
run('jointSelectAllParticipants(true)');assert.equal(run('jointDraft().participants.length'),4);
run("jointParticipants('历史学员',false)");assert.equal(run('jointDraft().participants.length'),3);
assert(!run('jointParticipantFields()').includes('aria-label="全选参与用户类型" checked'));
run('jointSelectAllParticipants(false)');assert.equal(run('jointDraft().participants.length'),0);
run("jointParticipants('未知',true)");assert.equal(run('jointDraft().participants.length'),0);
run("jointParticipants('在读学员',true);jointParticipants('从未报名过课程的学员',true);jointSet('stackCoupon',true)");
run("jointSetRule(0,'value','100');jointSetRule(1,'mode','discount');jointSetRule(1,'value','8.5');jointSetRule(2,'value','500')");
assert.equal(run('jointValidateRules()'),'');
assert.equal(run('jointTotalPrice(3000,0)'),3000);
assert.equal(run('jointTotalPrice(3000,1)'),2900);
assert.equal(run('jointTotalPrice(3000,2)'),2550,'discount applies once to total');
assert.equal(run('jointTotalPrice(3000,3)'),2500,'highest threshold only, reductions do not stack');
assert.equal(run('jointTotalPrice(300,3)'),0,'total cannot become negative');
assert.equal(run('jointTotalPrice(99.99,2)'),84.99);
run('jointAddRule()');assert.equal(run('jointRules().length'),4,'rules are no longer limited to group tiers');
run('jointRemoveRule(3)');assert.equal(run('jointRules().length'),3);
run("jointSetRule(1,'quantity','1')");assert(run('jointValidateRules()').includes('不能重复'));
run("jointSetRule(1,'quantity','2');jointSetRule(1,'value','10.01')");assert(run('jointValidateRules()').includes('10折'));
run("jointSetRule(1,'value','0')");assert(run('jointValidateRules()').includes('有效'));
run("jointSetRule(1,'value','8.555')");assert(run('jointValidateRules()').includes('两位小数'));
run("jointSetRule(1,'value','8.5')");
// A course may contain eligible and ineligible classes. Selection still includes only future lessons.
run(`a.classes=a.classes.filter(c=>c.course!==a.courses[0].name&&c.course!==a.courses[1].name);
 const fixture=(id,course,sessions)=>({id,name:id,course,sessions,students:2,capacity:10});
 a.classes.push(fixture('ongoing',a.courses[0].name,[{startsAt:'2030-08-01T09:00'},{startsAt:'2030-09-10T09:00'}]),
 fixture('future',a.courses[0].name,[{startsAt:'2030-11-01T09:00'}]),
 fixture('finished',a.courses[0].name,[{startsAt:'2030-08-01T09:00'}]),
 fixture('exact',a.courses[0].name,[{startsAt:'2030-09-01T09:00'}]),
 fixture('cancelled',a.courses[0].name,[{startsAt:'2030-12-01T09:00',cancelled:true}]),
 fixture('finished-course',a.courses[1].name,[{startsAt:'2030-08-01T09:00'}]));
 jointSet('name','联报新规则');jointSet('start','2030-09-01T09:00');jointSet('end','2030-10-01T09:00');jointOpenPicker();`);
assert.equal(run('jointPickerRows().length'),1);
run("jointPickerSelect('course:0',true);jointClosePicker()");assert.equal(run('jointDraft().products.length'),0,'cancel discards selection');
run("jointOpenPicker();jointPickerSelect('course:0',true);jointPickerDetail('course:0')");assert(node('#view').innerHTML.includes('全部 5 个班级 · 可参与 2 个'));
run('jointConfirmPicker()');assert.deepEqual(json('jointDraft().products[0].classes.map(c=>c.id)'),['ongoing','future']);
assert.equal(run('jointValidate()'),'');
run('jointSelectAllParticipants(false);mallNext()');assert.equal(run('mallState.formStep'),1,'participants required before next');
run("jointParticipants('非在读学员',true);mallNext()");assert.equal(run('mallState.formStep'),2);
assert(node('#view').innerHTML.includes('总价立减¥100.00'));
assert(!node('#view').innerHTML.includes('成团'));
const count=run('mallState.activities.joint.length');
run('mallSave();mallSave()');assert.equal(run('mallState.activities.joint.length'),count+1);
const saved=json('mallState.activities.joint[0]');
assert.deepEqual(saved.rules,[{quantity:1,mode:'reduction',value:100},{quantity:2,mode:'discount',value:8.5},{quantity:3,mode:'reduction',value:500}]);
assert.equal(saved.stackCoupon,true);assert.deepEqual(saved.participants,['非在读学员']);
for(const key of ['validHours','people','tiers','limit','virtualJoint'])assert(!(key in saved),key+' must not persist');
assert(!('jointPrice' in saved.jointProducts[0]));assert(!('tierPrices' in saved.jointProducts[0]));
run("mallEdit('joint',0)");assert.deepEqual(json('jointRules().map(r=>r.quantity)'),['1','2','3']);
assert.equal(run('jointDraft().stackCoupon'),true);
run("jointSetRule(1,'mode','reduction')");assert.equal(run('jointRules()[1].value'),'','changing units clears old value');
run("jointSetRule(1,'value','200');mallNext();a.classes.find(c=>c.id==='future').sessions=[{startsAt:'2030-01-01T09:00'}];mallSave()");
assert.deepEqual(json('mallState.activities.joint[0].jointProducts[0].classes.map(c=>c.id)'),['ongoing']);
run("mallEdit('joint',0);jointRemoveRule(2);jointRemoveRule(1);jointRemoveRule(0)");assert.equal(run('jointRules().length'),1);
run("permissionState.identity='finance';jointAddRule();jointSetRule(0,'value','1');jointSelectAllParticipants(true)");
assert.equal(run('jointRules().length'),1);assert.equal(run('jointRules()[0].value'),'100');assert.deepEqual(json('jointDraft().participants'),['非在读学员']);
// Old per-person/per-course prices must not silently become total-price reductions.
run("permissionState.identity='admin';mallState.activities.joint[0].rules=undefined;mallState.activities.joint[0].tiers=[{people:2,mode:'price',value:900}];mallEdit('joint',0)");
assert.equal(run('jointRules()[0].value'),'');assert(run('jointRuleFields()').includes('请重新设置'));
console.log('PASS: quantity rule table, total reduction/discount calculation, add/delete, validation, four participant types/all, coupon option, course eligibility, save/edit, legacy reset and permissions.');
