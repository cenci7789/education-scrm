const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
function harness(saved){
 const nodes=new Map(),storage=new Map(saved?[['crm-prototype-mall-decoration-v1',saved]]:[]),readers=[];
 const node=key=>{if(!nodes.has(key))nodes.set(key,{value:'',innerHTML:'',textContent:'',hidden:false,classList:{add(){},remove(){},toggle(){}},querySelector(){return null},setAttribute(k,v){this[k]=v}});return nodes.get(key)};
 const ctx=vm.createContext({document:{querySelector:node,querySelectorAll(){return []},getElementById:id=>node('#'+id)},URL,location:{href:'http://localhost/'},setTimeout(){},setInterval(){return 1},clearInterval(){},localStorage:{getItem:k=>storage.get(k)||null,setItem(k,v){storage.set(k,v)}},FileReader:class{constructor(){readers.push(this)}readAsDataURL(){}}});
 const run=code=>vm.runInContext(code,ctx);
 for(const match of html.matchAll(/<script(?: src="([^"]+)")?>([\s\S]*?)<\/script>/g)){if(match[1]==='mall-decor-editor.js')continue;run(match[1]?fs.readFileSync(path.join(root,match[1]),'utf8'):match[2])}
 return {run,ctx,node,storage,readers,load(){run(fs.readFileSync(path.join(root,'mall-decor-editor.js'),'utf8'))}};
}
const h=harness(),{run,node}=h;
function checkHandlers(markup){for(const match of markup.matchAll(/\bon(?:click|change|input)="([^"]*)"/g)){const code=match[1].replaceAll('&quot;','"').replaceAll('&#39;',"'").replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&amp;','&');new vm.Script('(function(){'+code+'})')}}
const pages=['mallShelf','mallGroup','mallJoint','mallCoupon','learningClasses','learningActive','learningData','withdraw','supplement'];
function outputs(){return Object.fromEntries(pages.map(route=>{run(`state.page='${route}';render()`);return [route,node('#view').innerHTML]}))}
const before=outputs(),shelfState=run('JSON.stringify([mallState.shelved,mallState.hiddenShelved,mallState.activities])');
h.load();assert.deepEqual(outputs(),before,'non-decoration page rendering unchanged by module');
run("state.page='mallDecor';render()");
assert(node('#view').innerHTML.includes('iPhone 17'));
assert(node('#view').innerHTML.includes('保存草稿'));
checkHandlers(node('#view').innerHTML);
run("decorSelect('轮播图');decorChange('title','新轮播标题');decorChange('body','新的内容');decorMove(1)");
assert.equal(run('mallState.decor.modules[1]'),'轮播图');
assert(run('decorPhone().includes("新轮播标题")'));
run("decorToggle('品牌介绍',true);decorChange('body','品牌独立文案');decorToggle('品牌介绍',false);decorToggle('品牌介绍',true)");
assert.equal(run("mallState.decor.blocks['品牌介绍'].body"),'品牌独立文案');
run("decorSelect('page');decorChange('title','测试商城');decorChange('color','#123456')");
assert.equal(run('decorSave()'),true);assert.equal(run('decorPublished'),null);
const restored=harness(h.storage.get('crm-prototype-mall-decoration-v1'));restored.load();
assert.equal(restored.run('mallState.decor.title'),'测试商城');
assert.equal(restored.run("mallState.decor.blocks['轮播图'].title"),'新轮播标题');
// Hidden courses stay out of choices; published courses are stable public-field snapshots.
run("a.courses[0].active=true;a.courses[1].active=true;mallState.shelved=[0,1];mallState.hiddenShelved=[1];decorSelect('课程展示')");
assert.equal(run('decorAvailableCourses().length'),1);
run("decorCourse(decorAvailableCourses()[0].id,false)");assert.equal(run("mallState.decor.blocks['课程展示'].courseIds.length"),0);
run("decorCourse(decorAvailableCourses()[0].id,true);a.courses[0].internalNotes='不应公开';decorSave(true)");
const published=run('JSON.stringify(decorPublished)'),publishedPhone=run('decorPhone(decorPublished)');
assert(!published.includes('不应公开'));
run("a.courses[0].name='后续课程改名';decorSelect('page');decorChange('title','新草稿');decorSave()");
assert.equal(run('JSON.stringify(decorPublished)'),published);
const normalizeClasses=s=>s.replace(/class="([^"]*)"/g,(_,v)=>`class="${v.trim().replace(/\s+/g,' ')}"`);
assert.equal(normalizeClasses(run('decorPhone(decorPublished)')),normalizeClasses(publishedPhone));
run("decorSetPreview('published')");assert(!node('#view').innerHTML.includes('onclick="decorSave('));
checkHandlers(node('#view').innerHTML);
assert(!run('decorPhone(decorPublished)').includes('onclick="decorSelect('));
run("decorChange('title','非法修改')");assert.equal(run('mallState.decor.title'),'新草稿');
run("decorSetPreview('draft');decorSelect('轮播图');decorUpload({files:[{type:'image/png',size:10}]})");
checkHandlers(node('#view').innerHTML);
const reader=h.readers.at(-1);reader.result='data:image/png;base64,YQ==';reader.onload();
assert.equal(run("mallState.decor.blocks['轮播图'].image"),reader.result);
run("decorUpload({files:[{type:'image/png',size:10}]});decorSelect('机构介绍')");
h.readers.at(-1).result='data:image/png;base64,Yg==';h.readers.at(-1).onload();
assert.equal(run("mallState.decor.blocks['轮播图'].image"),reader.result,'stale upload ignored');
const count=h.readers.length;run("decorUpload({files:[{type:'image/svg+xml',size:10}]});decorUpload({files:[{type:'image/png',size:3000000}]})");assert.equal(h.readers.length,count);
const lastPublished=run('JSON.stringify(decorPublished)');h.ctx.localStorage.setItem=()=>{throw new Error('quota')};
run("decorSelect('page');decorChange('title','未保存改动')");assert.equal(run('decorSave(true)'),false);
assert.equal(run('JSON.stringify(decorPublished)'),lastPublished);assert.equal(run('decorDirty'),true);
run("permissionState.identity='finance'");assert.equal(run('decorSave()'),false);
run("permissionState.identity='admin'");
// No shelf/marketing mutation from editor actions (undo test fixture's hidden-course change).
run('mallState.hiddenShelved=[]');assert.equal(run('JSON.stringify([mallState.shelved,mallState.hiddenShelved,mallState.activities])'),shelfState);
run("a.courses[0].name=decorPublished.courseSnapshot[0].name;delete a.courses[0].internalNotes");
assert.deepEqual(outputs(),before,'all other page output stays unchanged after decoration editing');
const persisted=JSON.parse(h.storage.get('crm-prototype-mall-decoration-v1'));
assert.equal(persisted.published.title,'测试商城');assert.equal(persisted.draft.title,'新草稿');
const invalid=harness('{bad json');invalid.load();invalid.run("state.page='mallDecor';render()");
assert(invalid.node('#view').innerHTML.includes('iPhone 17'));
console.log('PASS: isolated page rendering, module content/order/visibility, draft restore, publish snapshots, course visibility, upload validation, stale upload, storage failures, permissions.');
