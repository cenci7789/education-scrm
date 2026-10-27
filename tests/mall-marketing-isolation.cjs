const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),nodes=new Map(),storage=new Map();
function node(key){if(!nodes.has(key))nodes.set(key,{value:'',innerHTML:'',textContent:'',classList:{add(){},remove(){},toggle(){}},querySelector(){return null},setAttribute(){}});return nodes.get(key)}
const ctx=vm.createContext({document:{querySelector:node,querySelectorAll:()=>[],getElementById:id=>node('#'+id)},setTimeout(){},setInterval(){},clearInterval(){},URL,URLSearchParams,btoa,atob,crypto:require('node:crypto').webcrypto,location:{href:'http://localhost/index.html'},localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)}});
const run=code=>vm.runInContext(code,ctx),snapshot=expr=>run(`JSON.stringify(${expr})`);
// Use the actual production script order, including both editor/share wrappers.
for(const script of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script(?: src="([^"]+)")?>([\s\S]*?)<\/script>/g))run(script[1]?fs.readFileSync(path.join(root,script[1]),'utf8'):script[2]);
run("a.classes[0].sessions=[{startsAt:'2030-10-01T09:00'}];mallNew('group');groupSet('name','拼团草稿')");
const groupDraft=snapshot('mallState.groupDraft'),coupons=snapshot('mallState.activities.coupon');
function saveActivity(type,name,value){run(`mallNew('${type}');${type}Set('name','${name}');${type}Set('start','2030-09-01T09:00');${type}Set('end','2030-09-30T23:59');${type}OpenPicker();${type}PickerSelect('course:0',true);${type}ConfirmPicker();`);run(type==='joint'?`jointRemoveRule(2);jointRemoveRule(1);jointSetRule(0,'value','${value}');jointParticipants('在读学员',true)`:`groupSetTier(0,'value','${value}')`);run('mallNext();mallSave()')}
saveActivity('joint','联报独立活动',800);
assert.equal(run('state.page'),'mallJoint');
assert.equal(snapshot('mallState.groupDraft'),groupDraft,'joint creation must not alter the group draft');
assert(node('#view').innerHTML.includes('报名班级数量≥1 · 总价立减¥800.00'),'joint list displays the quantity rule');
const joint=snapshot('mallState.activities.joint');
saveActivity('group','拼团独立活动',900);
assert.equal(snapshot('mallState.activities.joint'),joint);
const group=snapshot('mallState.activities.group');
run("mallEdit('joint',0);jointSetRule(0,'value','700');mallNext();mallSave()");
assert.equal(run('mallState.activities.joint[0].rules[0].value'),700);
assert.equal(snapshot('mallState.activities.group'),group);
run('jointShareOpen(0)');
assert(run('jointShareState.current.original').includes('/joint-share.html#data='));
assert.equal(run('groupShareState.current'),null);
assert.equal(run('JointShareCodec.resolve(jointShareState.current.original,localStorage).rules[0].value'),700);
run("jointShareClose();mallNav('mallGroup');groupShareOpen(0)");
assert(run('groupShareState.current.original').includes('/group-share.html#data='));
assert.equal(run('GroupShareCodec.resolve(groupShareState.current.original,localStorage).tiers[0].value'),900);
assert([...storage.keys()].some(key=>key.startsWith('crm-joint-share:')));
assert([...storage.keys()].some(key=>key.startsWith('crm-group-share:')));
run("groupShareClose();mallNav('mallJoint');mallEnd('joint',0)");
assert.equal(run('mallState.activities.joint[0].status'),'已结束');
assert.equal(snapshot('mallState.activities.group'),group);
assert.equal(snapshot('mallState.activities.coupon'),coupons);
console.log('PASS: production script order, independent drafts/activities/edit/end, joint list tier rules, share routes and storage namespaces, unchanged group and coupon data.');
