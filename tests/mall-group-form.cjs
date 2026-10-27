const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),nodes=new Map();
const node=k=>{if(!nodes.has(k))nodes.set(k,{value:'',innerHTML:'',textContent:'',classList:{add(){},remove(){},toggle(){}},querySelector(){return null},setAttribute(k,v){this[k]=v}});return nodes.get(k)};
const ctx=vm.createContext({document:{querySelector:node,querySelectorAll(){return []},getElementById:id=>node('#'+id)},setTimeout(){},setInterval(){},clearInterval(){},URL,location:{href:'http://localhost/'}}),run=s=>vm.runInContext(s,ctx);
for(const m of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script(?: src="([^"]+)")?>([\s\S]*?)<\/script>/g)){if(m[1]==='mall-group-form.js')continue;run(m[1]?fs.readFileSync(path.join(root,m[1]),'utf8'):m[2])}
const other={};for(const type of ['joint','coupon']){run(`mallNew('${type}')`);other[type]=node('#view').innerHTML}
run(fs.readFileSync(path.join(root,'mall-group-form.js'),'utf8'));
for(const type of ['joint','coupon']){run(`mallNew('${type}')`);assert.equal(node('#view').innerHTML,other[type])}
run("a.classes[0].date='2030-10-01';a.classes[0].time='09:00–10:00';a.classes[0].sessions=[{startsAt:'2030-10-01T09:00',endsAt:'2030-10-01T10:00'},{startsAt:'2030-12-01T09:00',endsAt:'2030-12-01T10:00'}];a.classes.push({...a.classes[0],id:'group-second-class',name:'同课程第二班'});mallNew('group')");
assert(node('#view').innerHTML.includes('课程拼团价'));assert(node('#view').innerHTML.includes('虚拟成团'));assert(node('#view').innerHTML.includes('0/20'));
run('groupOpenPicker()');assert.equal(run('groupDraft().picker'),null);
run("groupSet('name','秋季拼团');groupSet('start','2030-09-01T09:00');groupSet('end','2030-09-30T23:59');groupOpenPicker()");
assert(node('#view').innerHTML.includes('课程名称'));assert(!node('#view').innerHTML.includes('商品'));
assert.equal(run('groupPickerRows().length'),1,'only eligible courses appear, with one row per course');
const key=run('groupProducts()[0].key');const literal=JSON.stringify(key);
run(`groupPickerDetail(${literal})`);assert(node('#view').innerHTML.includes('同课程第二班'));assert(node('#view').innerHTML.includes('全部 2 个班级'));run('groupPickerDetail(null)');
run("groupPickerSubject('数学')");assert.equal(run('groupPickerRows().length'),0);run('groupPickerReset()');run("groupPickerSearch('语文')");assert.equal(run('groupPickerRows().length'),1);run('groupPickerReset()');
run(`groupPickerSelect(${literal},true);groupClosePicker()`);assert.equal(run('groupDraft().products.length'),0,'cancel picker discards provisional selections');
run(`groupOpenPicker();groupPickerSelect(${literal},true);groupConfirmPicker()`);assert.equal(run('groupDraft().products.length'),1);
assert.equal(run('groupDraft().products[0].classes.length'),2,'select course includes every class');
assert(node('#view').innerHTML.includes('2030-12-01 10:00'));
run('mallNext()');assert.equal(run('mallState.formStep'),1,'price required');
run(`groupSetTier(0,'value','1000.001');mallNext()`);assert.equal(run('mallState.formStep'),1);
run(`groupSetTier(0,'value','1200');mallNext()`);assert.equal(run('mallState.formStep'),1);
run(`groupSetTier(0,'value','800.50');groupSet('people','1');mallNext()`);assert.equal(run('mallState.formStep'),1);
run("groupSet('people','3');groupSet('virtual',false);groupSet('validHours','48');mallNext()");assert.equal(run('mallState.formStep'),2);
run('groupPrevious()');assert.equal(run('groupTiers()[0].value'),'800.50');assert.equal(run('groupDraft().virtual'),false);
run("groupSet('end','2030-10-02T00:00');mallNext()");assert.equal(run('mallState.formStep'),2,'activity end does not determine eligibility');
run("groupPrevious();groupSet('start','2030-12-02T00:00');groupSet('end','2030-12-31T00:00');mallNext()");assert.equal(run('mallState.formStep'),1,'all lesson starts before activity start cannot participate');
assert.equal(run('groupDraft().products[0].classes.length'),0,'changing activity start refreshes participant scope');
run("groupSet('start','2030-09-01T09:00');groupSet('end','2030-09-30T23:59');mallNext();groupParticipants('历史学员',true);groupSet('stackCoupon',true)");
const count=run('mallState.activities.group.length');run('mallSave();mallSave()');assert.equal(run('mallState.activities.group.length'),count+1);
assert.equal(run('mallState.activities.group[0].people'),3);assert.equal(run('mallState.activities.group[0].validHours'),48);assert.equal(run('mallState.activities.group[0].virtualGroup'),false);assert.equal(run('mallState.activities.group[0].groupProducts[0].groupPrice'),800.5);
assert.equal(run('mallState.activities.group[0].groupProducts[0].classes.length'),2);assert(node('#view').innerHTML.includes('活动课程数'));assert(!node('#view').innerHTML.includes('商品'));
run("mallEdit('group',0)");assert.equal(run('groupDraft().products.length'),1);assert.equal(run('groupDraft().people'),'3');assert.equal(run('groupDraft().virtual'),false);assert.equal(run('groupDraft().stackCoupon'),true);
// Fresh validation at save prevents stale shelf availability from being committed.
run('mallNext();mallState.shelved=[];mallSave()');assert.equal(run('state.page'),'mallForm');assert.equal(run('mallState.activities.group.length'),count+1);
run("mallState.shelved=[0,1];mallNew('group');groupSet('name','限制验证');groupSet('start','2030-09-01T00:00');groupSet('end','2030-09-30T23:59');for(let i=0;i<22;i++){const index=a.courses.length,name='测试课程'+i;a.courses.push({...a.courses[0],name});a.classes.push({...a.classes[0],id:'group-'+i,name:'班级'+i,course:name});mallState.shelved.push(index)}groupOpenPicker()");
assert.equal(run('groupPickerPageRows().length'),10);run('groupPickerSelectPage(true)');const firstPageCount=run('groupDraft().picker.keys.length');run('groupPickerPageChange(1)');assert.equal(run('groupDraft().picker.page'),2);assert.equal(run('groupDraft().picker.keys.length'),firstPageCount,'pagination preserves selection');
run('groupProducts().filter(groupEligible).forEach(p=>groupPickerSelect(p.key,true))');assert.equal(run('groupDraft().picker.keys.length'),20);
run('groupConfirmPicker()');assert.equal(run('groupDraft().products.length'),20);
assert(run('groupDraft().products.reduce((n,p)=>n+p.classes.length,0)>20'),'limit counts courses, not classes');
run("groupSet('name','超过二十字的活动名称超过二十字的活动名称超过二十字');mallNext()");assert.equal(run('mallState.formStep'),1);
// All emitted inline handlers remain compilable, including encoded product IDs.
for(const m of node('#view').innerHTML.matchAll(/\bon(?:click|change|input)="([^"]*)"/g)){new vm.Script('(function(){'+m[1].replaceAll('&quot;','"').replaceAll('&#39;',"'").replaceAll('&amp;','&')+'})')}
const before=run('JSON.stringify(mallState.activities.group)');run("permissionState.identity='finance';mallSave()");assert.equal(run('JSON.stringify(mallState.activities.group)'),before);
console.log('PASS: group layout, product selection/cancel/limit, class dates, per-product prices, people validation, next/back, virtual flag, save/edit round trip, stale availability, permission and other-form isolation.');

// One mixed course: already started, finished, starts exactly at the cutoff,
// future, cancelled future and missing timetable. Only future lesson starts count.
run(`permissionState.identity='admin';mallState.shelved=[0,1];
 a.classes=a.classes.filter(c=>c.course!==a.courses[0].name&&c.course!==a.courses[1].name);
 const fixture=(id,sessions)=>({id,name:id,course:a.courses[0].name,date:'2029-01-01',time:'09:00–10:00',sessions,students:2,capacity:10});
 a.classes.push(fixture('ongoing',[{startsAt:'2030-08-01T09:00'},{startsAt:'2030-09-10T09:00'}]),
 fixture('finished',[{startsAt:'2030-09-01T08:00',endsAt:'2030-09-01T12:00'}]),
 fixture('exact',[{startsAt:'2030-09-01T09:00'}]),
 fixture('future',[{date:'2030-11-01',time:'09:00–10:00'}]),
 fixture('cancelled',[{startsAt:'2030-12-01T09:00',cancelled:true}]),
 fixture('unknown',[{name:'未排课'}]),
 {...fixture('all-finished',[{startsAt:'2030-08-01T09:00'}]),course:a.courses[1].name});
 mallNew('group');groupSet('name','未开课课节规则');groupSet('start','2030-09-01T09:00');groupSet('end','2030-10-01T09:00');groupOpenPicker();`);
assert.equal(run('groupEligible(groupProducts()[0])'),true,'one qualifying class is sufficient');
assert.equal(run('groupEligible(groupProducts()[1])'),false);
assert.equal(run('groupPickerRows().length'),1,'course with no eligible classes is hidden');
assert(node('#view').innerHTML.includes('共 1 门课程'));
assert(!node('#view').innerHTML.includes('<option value="数学"'),'subjects only include eligible courses');
run("groupPickerSelect('course:1',true)");assert.equal(run('groupDraft().picker.keys.length'),0,'ineligible course cannot be selected');
run("groupPickerSelect('course:0',true);groupPickerDetail('course:0')");
assert(node('#view').innerHTML.includes('全部 6 个班级 · 可参与 2 个'));
assert(node('#view').innerHTML.includes('活动开始时所有课节均已开课'));
const detail=node('#view').innerHTML;
assert(detail.includes('aria-label="ongoing参与状态" checked'));
assert(!detail.includes('aria-label="finished参与状态" checked'));
assert(!detail.includes('aria-label="exact参与状态" checked'));
assert(!detail.includes('aria-label="cancelled参与状态" checked'));
run('groupConfirmPicker()');assert.deepEqual(JSON.parse(run('JSON.stringify(groupDraft().products[0].classes.map(c=>c.id))')),['ongoing','future']);
assert.equal(run('groupDraft().products[0].students'),4,'summary counts only participating classes');
run("groupSetTier(0,'value','800');groupSet('end','2031-01-01T00:00')");assert.equal(run('groupDraft().products[0].classes.length'),2,'end time does not affect selection');
run("groupSet('start','2030-09-15T00:00')");assert.deepEqual(JSON.parse(run('JSON.stringify(groupDraft().products[0].classes.map(c=>c.id))')),['future']);
run("groupSet('start','2030-09-01T09:00');mallNext();a.classes.find(c=>c.id==='future').sessions=[{startsAt:'2030-01-01T09:00'}];mallSave()");
assert.deepEqual(JSON.parse(run('JSON.stringify(mallState.activities.group[0].groupProducts[0].classes.map(c=>c.id))')),['ongoing'],'save revalidates and excludes newly ineligible classes');
run("mallEdit('group',0)");assert.equal(run('groupDraft().products[0].classes.length'),1);
run("groupSet('start','2032-01-01T00:00');groupSet('end','2032-02-01T00:00');mallNext()");assert.equal(run('mallState.formStep'),1);
assert.equal(run('groupDraft().products[0].classes.length'),0);
run('groupOpenPicker()');assert.equal(run('groupPickerRows().length'),0);
assert(node('#view').innerHTML.includes('暂无符合条件的课程'));
assert(node('#view').innerHTML.includes('共 0 门课程'));
console.log('PASS: activity-start cutoff, any future lesson, mixed eligible classes, automatic exclusion, cancelled/missing schedules, selection refresh and persisted participant scope.');

// Three independent tiers, no business cap on participant count, and per-course discount calculations.
run(`a.classes.find(c=>c.id==='all-finished').sessions=[{startsAt:'2030-09-20T09:00'}];a.courses[1].fee=2000;
 mallNew('group');groupSet('name','三阶拼团');groupSet('start','2030-09-01T09:00');groupSet('end','2031-01-01T00:00');
 groupOpenPicker();groupPickerSelect('course:0',true);groupPickerSelect('course:1',true);groupConfirmPicker();
 groupSetTier(0,'value','900');groupAddTier();groupSetTier(1,'people','1000');groupSetTier(1,'mode','discount');groupSetTier(1,'value','8.5');
 groupAddTier();groupSetTier(2,'people','5000');groupSetTier(2,'value','700');groupAddTier();`);
assert.equal(run('groupTiers().length'),3,'cannot add a fourth tier');
assert.equal(run('groupValidate()'),'');
assert.equal(run('groupTierPrice(groupProducts()[0],groupTiers()[1])'),850);
assert.equal(run('groupTierPrice(groupProducts()[1],groupTiers()[1])'),1700);
assert.equal(run("groupTierPrice({price:99.99},{mode:'discount',value:'8.5'})"),84.99,'round discounted price to cents');
assert(!run('groupActivityFields()').includes('max="8"'));
assert(!run('groupActivityFields()').includes('2～8'));
assert(run('groupProductTable()').includes('¥1700.00'));
run("groupSetTier(2,'people','1000')");assert(run('groupValidate()').includes('不能重复'));
run("groupSetTier(2,'people','5000');groupSetTier(1,'value','10.01')");assert(run('groupValidate()').includes('10折'));
run("groupSetTier(1,'value','0')");assert(run('groupValidate()').includes('有效价格或折扣'));
run("groupSetTier(1,'value','8.555')");assert(run('groupValidate()').includes('两位小数'));
run("groupSetTier(1,'value','8.5');groupSetTier(0,'value','1001')");assert(run('groupValidate()').includes('课程原价'));
run("groupSetTier(0,'value','900');mallNext()");assert.equal(run('mallState.formStep'),2);
assert(node('#view').innerHTML.includes('1000人成团 · 8.5折'));
run('groupPrevious()');assert.equal(run('groupTiers()[1].value'),'8.5');run('mallNext();mallSave()');
const savedTiers=JSON.parse(run('JSON.stringify(mallState.activities.group[0].tiers)'));
assert.deepEqual(savedTiers,[{people:2,mode:'price',value:900},{people:1000,mode:'discount',value:8.5},{people:5000,mode:'price',value:700}]);
assert.deepEqual(JSON.parse(run('JSON.stringify(mallState.activities.group[0].groupProducts.map(p=>p.tierPrices.map(t=>t.price)))')),[[900,850,700],[900,1700,700]]);
run("mallEdit('group',0)");assert.equal(run('groupTiers().length'),3);assert.equal(run('groupTiers()[1].mode'),'discount');assert.equal(run('groupTiers()[2].people'),'5000');
run('groupRemoveTier(1)');assert.equal(run('groupTiers().length'),2);assert.equal(run('groupTiers()[1].value'),'700');
run("groupSetTier(1,'mode','discount')");assert.equal(run('groupTiers()[1].value'),'','changing units requires entering a new value');
run('groupRemoveTier(1);groupRemoveTier(0)');assert.equal(run('groupTiers().length'),1,'at least one tier remains');
run("permissionState.identity='finance';groupAddTier();groupSetTier(0,'value','1')");assert.equal(run('groupTiers().length'),1);assert.equal(run('groupTiers()[0].value'),'900');
run("permissionState.identity='admin';mallState.activities.group[0].tiers=undefined;mallState.activities.group[0].people=12;mallEdit('group',0)");
assert.equal(run('groupTiers()[0].people'),'12');assert.equal(run('groupTiers()[0].value'),'900','legacy single tier price restored');
console.log('PASS: max three tiers, ascending participant thresholds without eight-person cap, fixed/discount mixed tiers, cents rounding, validation, save/edit, deletion, permissions and legacy migration.');
