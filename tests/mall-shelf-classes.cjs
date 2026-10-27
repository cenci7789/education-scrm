const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),nodes=new Map();
const node=k=>{if(!nodes.has(k))nodes.set(k,{value:'',innerHTML:'',textContent:'',classList:{add(){},remove(){},toggle(){}},querySelector(){return null},setAttribute(k,v){this[k]=v}});return nodes.get(k)};
const ctx=vm.createContext({document:{querySelector:node,querySelectorAll(){return []},getElementById:id=>node('#'+id)},setTimeout(){},setInterval(){},clearInterval(){},URL,location:{href:'http://localhost/'}}),run=s=>vm.runInContext(s,ctx);
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const m of html.matchAll(/<script(?: src="([^"]+)")?>([\s\S]*?)<\/script>/g)){if(m[1]==='mall-shelf-classes.js')continue;run(m[1]?fs.readFileSync(path.join(root,m[1]),'utf8'):m[2])}
run("state.page='mallDecor';render()");const decor=node('#view').innerHTML;
run(fs.readFileSync(path.join(root,'mall-shelf-classes.js'),'utf8'));
run("state.page='mallDecor';render()");assert.equal(node('#view').innerHTML,decor,'decoration page unchanged');
run(`a.classes.push({...a.classes[2],id:'shelf-class-b',name:'第二个测试班',campus:'另一校区',tags:['周末','提高']},{...a.classes[2],id:'shelf-class-c',name:'第三个测试班',tags:['平日']});state.page='mallShelf';mallShelfTab('未上架课程')`);
const academic=run('JSON.stringify([a.classes,a.courses])'),activities=run('JSON.stringify(mallState.activities)');
assert(node('#view').innerHTML.includes('课程名称'));assert(!node('#view').innerHTML.includes('主讲老师'));assert(!node('#view').innerHTML.includes('商品名称'));
run('mallSelect(2,true)');assert.equal(run('mallShelfState.choices[2].length'),3);
run('mallProductDetail(2)');assert.equal(run('mallShelfState.modal.ids.length'),3);assert(node('#view').innerHTML.includes('周末'));
run("mallShelfModalFilter('tag','周末')");assert.equal(run('mallShelfModalRows().length'),1);
run('mallShelfClassSelectAll(false)');assert.equal(run('mallShelfState.modal.ids.length'),2);
run("mallShelfModalFilter('tag','平日')");assert.equal(run('mallShelfModalRows().length'),1);assert.equal(run('mallShelfState.modal.ids.length'),2);
run('mallShelfCloseModal()');assert.equal(run('mallShelfState.choices[2].length'),3,'cancel does not save modal edits');
run("mallProductDetail(2);mallShelfModalFilter('campus','另一校区');mallShelfClassSelectAll(false);mallShelfConfirmClasses()");
assert.equal(run('mallShelfState.choices[2].length'),2);
const shelfSnapshot=()=>run('JSON.stringify([mallState.shelved,mallState.hiddenShelved,mallShelfState.offered])');
const originalShelf=shelfSnapshot();
run('mallBatchShelf(true)');assert.equal(shelfSnapshot(),originalShelf,'request must not change shelving');
assert(node('#view').innerHTML.includes('确认上架'));assert.equal(run('mallShelfState.confirmation.selections[0].ids.length'),2);
run('mallShelfCancelConfirmation()');assert.equal(shelfSnapshot(),originalShelf);assert.equal(run('mallShelfState.choices[2].length'),2);
run('mallBatchShelf(true);mallShelfConfirmOperation()');assert.equal(run('mallShelfState.offered[2].length'),2);assert(run('mallState.shelved.includes(2)'));
assert.equal(run('mallShelfConfirmOperation()'),false,'duplicate confirmation ignored');
// Partial shelving appears in both tabs, and each exposes only eligible classes.
assert(run('mallShelfRows().some(c=>c.index===2)'));
run("mallShelfTab('已上架课程');mallSelect(2,true);mallProductDetail(2)");assert.equal(run('mallShelfState.modal.ids.length'),2);assert.equal(run('mallShelfModalRows().length'),2);
run("mallShelfClassSelect('shelf-class-c',false);mallShelfConfirmClasses()");
assert.equal(run('mallShelfState.choices[2].length'),1);assert.equal(run('mallShelfState.offered[2].length'),2,'selection only, no immediate mutation');
const beforeDown=shelfSnapshot();run('mallBatchShelf(false)');assert.equal(shelfSnapshot(),beforeDown);assert(node('#view').innerHTML.includes('确认下架'));
run('mallShelfCancelConfirmation()');assert.equal(shelfSnapshot(),beforeDown);
run('mallBatchShelf(false);mallShelfConfirmOperation()');assert.equal(run('mallShelfState.offered[2].length'),1);assert.equal(run('mallShelfState.offered[2][0]'),'shelf-class-c');assert(run('mallState.shelved.includes(2)'));
run("mallShelfTab('未上架课程');mallProductDetail(2)");assert.equal(run('mallShelfModalRows().length'),2);assert(!run("mallShelfModalRows().some(c=>c.id==='shelf-class-c')"));
run('mallShelfConfirmClasses();mallSetShelf(2,true)');assert.equal(run('mallShelfState.offered[2].length'),1);assert.equal(run('mallShelfState.confirmation.selections[0].ids.length'),2);
run('mallShelfConfirmOperation()');assert.equal(run('mallShelfState.offered[2].length'),3,'re-list adds to existing subset');
run("mallShelfTab('已上架课程');mallSelect(2,true);mallProductDetail(2);mallShelfClassSelectAll(false);mallShelfConfirmClasses()");
assert.equal(run('mallState.selected.includes(2)'),false);assert.equal(run('mallShelfState.offered[2].length'),3);assert.equal(run('mallSetShelf(2,false)'),false,'empty selection cannot remove classes');
run('mallSelect(2,true);mallSetShelf(2,false)');assert.equal(run('mallShelfState.offered[2].length'),3);run('mallShelfConfirmOperation()');assert(!run('mallState.shelved.includes(2)'));
// Batch hidden shelving also needs explicit confirmation; partial removal preserves hidden status.
run("mallShelfTab('未上架课程');mallSelect(2,true);mallBatchHidden()");assert(!run('mallState.shelved.includes(2)'));assert(node('#view').innerHTML.includes('确认隐身上架'));
run('mallShelfCancelConfirmation();mallBatchHidden();mallShelfConfirmOperation()');assert(run('mallState.shelved.includes(2)&&mallState.hiddenShelved.includes(2)'));
run("mallShelfTab('已上架课程');mallProductDetail(2);mallShelfClassSelect('shelf-class-b',false);mallShelfConfirmClasses();mallBatchShelf(false);mallShelfConfirmOperation()");
assert.equal(run('mallShelfState.offered[2].length'),1);assert(run('mallState.hiddenShelved.includes(2)'));
run('mallSetShelf(2,false);mallShelfConfirmOperation()');assert(!run('mallState.shelved.includes(2)||mallState.hiddenShelved.includes(2)'));
run("mallShelfTab('未上架课程');mallSelect(2,true);mallShelfFilter('subject','语文');mallSelectAll(false)");assert(run('mallState.selected.includes(2)'));
run("mallShelfFilter('subject','数学');mallSelectAll(false)");assert(!run('mallState.selected.includes(2)'));
run("a.courses.push({name:'无班级课程',subject:'数学',fee:100});mallSetShelf(3,true)");assert(!run('mallState.shelved.includes(3)'));assert.equal(run('mallShelfState.confirmation'),null);run('a.courses.pop()');
// Changed selection or class removal invalidates an open confirmation.
run('mallSelect(2,true);mallSetShelf(2,true)');const beforeStale=shelfSnapshot();run("mallShelfState.choices[2]=['shelf-class-b']");assert.equal(run('mallShelfConfirmOperation()'),false);assert.equal(shelfSnapshot(),beforeStale);
run('mallSelect(2,true);mallSetShelf(2,true)');const oldName=run('a.classes[2].name');run("a.classes[2].name='新班名'");assert.equal(run('mallShelfConfirmOperation()'),false);run('a.classes[2].name='+JSON.stringify(oldName));
run('mallSetShelf(2,true)');for(const m of node('#view').innerHTML.matchAll(/\bon(?:click|change|input)="([^"]*)"/g)){new vm.Script('(function(){'+m[1].replaceAll('&quot;','"').replaceAll('&#39;',"'").replaceAll('&amp;','&')+'})')}
run("permissionState.identity='finance'");assert.equal(run('mallShelfConfirmOperation()'),false);assert.equal(shelfSnapshot(),beforeStale);
assert.equal(run('JSON.stringify([a.classes,a.courses])'),academic,'academic data unchanged');assert.equal(run('JSON.stringify(mallState.activities)'),activities);
console.log('PASS: symmetric class-level shelving/removal, subset restoration, all/filtered choices, confirmation for row/batch/hidden actions, cancellation, duplicate and stale guards, permissions, page isolation.');
