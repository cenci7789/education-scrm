// Storefront class selection is independent from academic class records.
const mallShelfState={search:'',subject:'',format:'',choices:{},offered:{},modal:null,confirmation:null};
const mallShelfFilterFields=[['term','学期'],['grade','年级'],['subject','学科'],['classType','班型'],['campus','校区'],['teacher','授课老师'],['status','班级状态'],['format','授课方式'],['tag','班级标签']];
function mallShelfAllowed(){return state.page==='mallShelf'&&(typeof permissionCanVisit!=='function'||permissionCanVisit('mallShelf'))}
function mallShelfClasses(index){
 const course=a.courses[index];if(!course)return [];
 return a.classes.filter(c=>c.courseId!=null&&course.id!=null?c.courseId===course.id:c.course===course.name).map(c=>{
  const info=typeof enrollmentClassInfo==='function'?enrollmentClassInfo(c):c;
  const tags=Array.isArray(c.tags)?c.tags:Array.isArray(c.labels)?c.labels:[];
  return {...info,id:String(c.id),tags:tags.map(t=>typeof t==='string'?t:t?.name||t?.label||'').filter(Boolean)};
 });
}
function mallShelfIds(index,source){const available=mallShelfClasses(index).map(c=>c.id);return source===undefined?available:available.filter(id=>source.includes(id))}
function mallShelfOffered(index){return mallState.shelved.includes(index)?mallShelfIds(index,mallShelfState.offered[index]):[]}
function mallShelfEligible(index,active=mallState.shelfTab==='未上架课程'){const offered=mallShelfOffered(index);return mallShelfClasses(index).filter(c=>active?!offered.includes(c.id):offered.includes(c.id))}
function mallShelfChoice(index,active=mallState.shelfTab==='未上架课程'){const ids=mallShelfState.choices[index];return mallShelfEligible(index,active).map(c=>c.id).filter(id=>ids===undefined||ids.includes(id))}
function mallShelfRows(){return mallCourses().filter(c=>(mallState.shelfTab==='已上架课程'?mallShelfOffered(c.index).length>0:mallShelfEligible(c.index,true).length>0||!mallState.shelved.includes(c.index))&&(!mallShelfState.search||c.name.toLowerCase().includes(mallShelfState.search.trim().toLowerCase()))&&(!mallShelfState.subject||c.subject===mallShelfState.subject)&&(!mallShelfState.format||(c.teachingFormat||'面授')===mallShelfState.format))}
function mallShelfFilter(key,value){if(!mallShelfAllowed()||!['search','subject','format'].includes(key))return;mallShelfState[key]=value;$('#mall-shelf-results').innerHTML=mallShelfResults()}
function mallShelfTab(tab){if(!mallShelfAllowed()||!['已上架课程','未上架课程'].includes(tab))return;mallState.shelfTab=tab;mallState.selected=[];mallShelfState.choices={};mallShelfState.modal=null;mallRender()}
function mallShelfCourseFilter(key,label,values){return `<select class="select" aria-label="${label}" onchange="mallShelfFilter('${key}',this.value)"><option value="">全部${label}</option>${[...new Set(values.filter(Boolean))].map(v=>`<option value="${esc(v)}" ${mallShelfState[key]===v?'selected':''}>${esc(v)}</option>`).join('')}</select>`}
function mallShelfResults(){
 const rows=mallShelfRows(),all=rows.length&&rows.every(c=>mallState.selected.includes(c.index));
 return `<div class="data-bar">共 ${rows.length} 门 · 已选 ${mallState.selected.length} 门课程</div>`+aTable([
 `<input type="checkbox" aria-label="选择当前筛选的全部课程" ${all?'checked':''} onchange="mallSelectAll(this.checked)">`,'课程名称','授课方式','学期','学科','年级','班型','课程费','状态','操作'
 ],rows.map(c=>{
  const classes=mallShelfEligible(c.index),selected=mallState.selected.includes(c.index),active=mallState.shelfTab==='已上架课程',hidden=mallState.hiddenShelved.includes(c.index),count=mallShelfChoice(c.index).length;
  return `<tr><td><input type="checkbox" aria-label="选择${esc(c.name)}及全部${active?'已上架':'未上架'}班级" ${selected?'checked':''} onchange="mallSelect(${c.index},this.checked)"></td><td><a onclick="mallProductDetail(${c.index})">${esc(c.name)}</a><small class="shelf-class-count">${selected?'已选 '+count+' / '+classes.length+' 个班级':active?'已上架 '+classes.length+' 个班级':'待上架 '+classes.length+' 个班级'}</small></td><td>${esc(c.teachingFormat||'面授')}</td><td>${esc(c.term||'—')}</td><td>${esc(c.subject||'—')}</td><td>${esc(c.grade||'—')}</td><td>${esc(c.classType||'—')}</td><td>${c.fee==null?'—':'¥'+Number(c.fee).toFixed(2)}</td><td><span class="badge ${active?'':'off'}">${active?hidden?'隐身上架':'已上架':'未上架'}</span></td><td><div class="mall-actions"><button onclick="mallProductDetail(${c.index})">详情</button><button onclick="mallSetShelf(${c.index},${!active})">${active?'下架':'上架'}</button></div></td></tr>`;
 }))+(!rows.length?'<div class="empty">暂无符合条件的课程</div>':'');
}
mallShelfPage=function(){
 const active=mallState.shelfTab==='已上架课程';
 return heading('课程上架','管理网校中展示和可购买的课程')+`<section class="mall-shelf-page"><div class="card pad"><div class="mall-tabs">${['已上架课程','未上架课程'].map(tab=>`<button class="${tab===mallState.shelfTab?'active':''}" onclick="mallShelfTab('${tab}')">${tab}</button>`).join('')}</div><div class="toolbar"><div class="toolbar-left shelf-filters"><input class="input" aria-label="搜索课程名称" placeholder="请输入课程名称" value="${esc(mallShelfState.search)}" oninput="mallShelfFilter('search',this.value)">${mallShelfCourseFilter('format','授课方式',a.courses.map(c=>c.teachingFormat||'面授'))}${mallShelfCourseFilter('subject','学科',a.courses.map(c=>c.subject))}</div><div class="toolbar-right"><button class="btn primary" onclick="mallBatchShelf(${!active})">${active?'下架':'上架'}</button>${active?'':'<button class="btn" onclick="mallBatchHidden()">隐身上架</button>'}</div></div><div id="mall-shelf-results">${mallShelfResults()}</div><p class="help">勾选课程默认选择旗下全部${active?'已上架':'未上架'}班级；点击“详情”可筛选并调整${active?'下架':'上架'}范围。部分上架的课程会分别显示在两个页签中。</p></div>${mallShelfState.confirmation?mallShelfConfirmation():mallShelfState.modal?mallShelfModal():''}</section>`;
};
mallSelect=function(index,checked){
 if(!mallShelfAllowed()||!a.courses[index])return;
 if(checked){const ids=mallShelfEligible(index).map(c=>c.id);if(!ids.length){toast('该课程暂无可操作的班级');mallRender();return}mallShelfState.choices[index]=ids;mallState.selected=[...new Set([...mallState.selected,index])];}
 else{mallState.selected=mallState.selected.filter(i=>i!==index);delete mallShelfState.choices[index]}
 mallRender();
};
mallSelectAll=function(checked){
 if(!mallShelfAllowed())return;
 for(const c of mallShelfRows()){
  if(checked){const ids=mallShelfEligible(c.index).map(cls=>cls.id);if(!ids.length)continue;mallShelfState.choices[c.index]=ids;mallState.selected=[...new Set([...mallState.selected,c.index])];}
  else{mallState.selected=mallState.selected.filter(i=>i!==c.index);delete mallShelfState.choices[c.index]}
 }mallRender();
};
mallProductDetail=function(index){
 if(!mallShelfAllowed()||!a.courses[index])return;
 mallShelfState.modal={index,active:mallState.shelfTab==='未上架课程',ids:mallShelfChoice(index),filters:{},search:''};mallRender();
};
function mallShelfModalRows(){
 const m=mallShelfState.modal;if(!m)return [];
 return mallShelfEligible(m.index,m.active).filter(c=>(!m.search||c.name.toLowerCase().includes(m.search.trim().toLowerCase()))&&mallShelfFilterFields.every(([key])=>!m.filters[key]||(key==='tag'?c.tags.includes(m.filters[key]):String(c[key]||'')===m.filters[key])));
}
function mallShelfModalFilter(key,value){if(!mallShelfAllowed()||!mallShelfState.modal)return;const m=mallShelfState.modal;if(key==='search')m.search=value;else if(mallShelfFilterFields.some(([k])=>key===k))m.filters[key]=value;$('#mall-shelf-class-results').innerHTML=mallShelfClassResults()}
function mallShelfClassResults(){
 const m=mallShelfState.modal,rows=mallShelfModalRows(),count=mallShelfEligible(m.index,m.active).filter(c=>m.ids.includes(c.id)).length,all=rows.length&&rows.every(c=>m.ids.includes(c.id));
 return `<div class="shelf-class-summary">当前显示 ${rows.length} 个班级 · 已选 ${count} / ${mallShelfEligible(m.index,m.active).length} 个${m.active?'待上架':'已上架'}班级 <span class="muted">（筛选不改变已有选择）</span></div>`+aTable([
 `<input type="checkbox" aria-label="选择当前筛选的全部班级" ${all?'checked':''} onchange="mallShelfClassSelectAll(this.checked)">`,'班级名称','班级标签','授课老师','上课时间','在班人数','状态'
 ],rows.map(c=>`<tr><td><input type="checkbox" aria-label="选择${esc(c.name)}" ${m.ids.includes(c.id)?'checked':''} onchange="mallShelfClassSelect(${esc(JSON.stringify(c.id))},this.checked)"></td><td>${esc(c.name)}</td><td><div class="shelf-tags">${[c.term,c.grade,c.subject,c.classType,c.campus,c.format,...c.tags].filter(Boolean).map(v=>`<span>${esc(v)}</span>`).join('')}</div></td><td>${esc(c.teacher||'—')}</td><td>${esc(c.date||'—')}<br>${esc(c.time||'—')}</td><td>${esc(c.students??0)} / ${esc(c.capacity??'—')}</td><td>${esc(c.status||'—')}</td></tr>`))+(!rows.length?'<div class="empty">暂无符合条件的班级</div>':'');
}
function mallShelfModal(){
 const m=mallShelfState.modal,course=a.courses[m.index],classes=mallShelfEligible(m.index,m.active);
 return `<div class="modal-backdrop"><div class="modal shelf-class-modal" role="dialog" aria-modal="true" aria-label="选择${m.active?'上架':'下架'}班级"><div class="modal-head"><div><h2>${esc(course.name)}</h2><p class="help">选择本次需要${m.active?'上架':'下架'}的班级；确定选择后，点击${m.active?'上架':'下架'}并确认才会生效</p></div><button class="btn small" aria-label="关闭班级选择" onclick="mallShelfCloseModal()">✕</button></div><div class="shelf-class-filters"><label>班级名称<input class="input" placeholder="搜索班级名称" value="${esc(m.search)}" oninput="mallShelfModalFilter('search',this.value)"></label>${mallShelfFilterFields.map(([key,label])=>{
 const values=[...new Set(classes.flatMap(c=>key==='tag'?c.tags:[c[key]]).filter(Boolean).map(String))];
 return `<label>${label}<select class="select" onchange="mallShelfModalFilter('${key}',this.value)"><option value="">全部${label}</option>${values.map(v=>`<option value="${esc(v)}" ${m.filters[key]===v?'selected':''}>${esc(v)}</option>`).join('')}</select></label>`;
 }).join('')}</div><div class="shelf-class-tools"><button class="btn small" onclick="mallShelfResetFilters()">重置筛选</button><button class="btn small" onclick="mallShelfClassSelectAll(true)">全选筛选结果</button><button class="btn small" onclick="mallShelfClassSelectAll(false)">取消筛选结果选择</button></div><div id="mall-shelf-class-results">${mallShelfClassResults()}</div><div class="modal-actions"><button class="btn" onclick="mallShelfCloseModal()">取消</button><button class="btn primary" onclick="mallShelfConfirmClasses()">确定选择</button></div></div></div>`;
}
function mallShelfCloseModal(){mallShelfState.modal=null;mallRender()}
function mallShelfResetFilters(){if(!mallShelfAllowed()||!mallShelfState.modal)return;mallShelfState.modal.filters={};mallShelfState.modal.search='';mallRender()}
function mallShelfClassSelect(id,checked){if(!mallShelfAllowed()||!mallShelfState.modal)return;const m=mallShelfState.modal;if(!mallShelfEligible(m.index,m.active).some(c=>c.id===id))return;m.ids=checked?[...new Set([...m.ids,id])]:m.ids.filter(x=>x!==id);$('#mall-shelf-class-results').innerHTML=mallShelfClassResults()}
function mallShelfClassSelectAll(checked){if(!mallShelfAllowed()||!mallShelfState.modal)return;const m=mallShelfState.modal,ids=mallShelfModalRows().map(c=>c.id);m.ids=checked?[...new Set([...m.ids,...ids])]:m.ids.filter(id=>!ids.includes(id));$('#mall-shelf-class-results').innerHTML=mallShelfClassResults()}
function mallShelfConfirmClasses(){
 if(!mallShelfAllowed()||!mallShelfState.modal)return;
 const m=mallShelfState.modal,ids=mallShelfEligible(m.index,m.active).map(c=>c.id).filter(id=>m.ids.includes(id));
 mallShelfState.choices[m.index]=ids;
 mallState.selected=ids.length?[...new Set([...mallState.selected,m.index])]:mallState.selected.filter(i=>i!==m.index);
 mallShelfState.modal=null;mallRender();toast('已保存本次选择，确认操作后生效');
}
function mallShelfCommit(indices,active,hidden=false){
 if(!mallShelfAllowed())return false;
 const valid=[...new Set(indices)].filter(i=>a.courses[i]);if(!valid.length){toast('请先选择课程');return false}
 const selections=valid.map(i=>({index:i,ids:mallShelfChoice(i,active),name:a.courses[i].name,offered:mallShelfOffered(i),wasHidden:mallState.hiddenShelved.includes(i)}));
 if(selections.some(row=>!row.ids.length)){toast('请为每门课程至少选择一个'+(active?'上架':'下架')+'班级');return false}
 const classes=selections.map(row=>({index:row.index,items:mallShelfEligible(row.index,active).filter(c=>row.ids.includes(c.id)).map(c=>({id:c.id,name:c.name}))}));
 mallShelfState.confirmation={active,hidden,selections,classes,identity:typeof permissionState==='undefined'?null:permissionState.identity};mallRender();return true;
}
function mallShelfCancelConfirmation(){mallShelfState.confirmation=null;mallRender()}
function mallShelfConfirmation(){
 const pending=mallShelfState.confirmation,label=pending.active?pending.hidden?'隐身上架':'上架':'下架',count=pending.selections.reduce((sum,row)=>sum+row.ids.length,0);
 return '<div class="modal-backdrop"><div class="modal shelf-confirm-modal" role="dialog" aria-modal="true" aria-label="确认'+label+'"><div class="modal-head"><h2>确认'+label+'</h2><button class="btn small" aria-label="关闭确认弹窗" onclick="mallShelfCancelConfirmation()">✕</button></div><p>即将'+label+' '+pending.selections.length+' 门课程中的 '+count+' 个班级，请确认。</p><div class="shelf-confirm-items">'+pending.selections.map(row=>'<div class="subcard"><strong>'+esc(row.name)+'</strong><ul>'+pending.classes.find(c=>c.index===row.index).items.map(c=>'<li>'+esc(c.name)+'</li>').join('')+'</ul></div>').join('')+'</div><p class="help">'+(pending.active?pending.hidden?'所选班级将隐身上架，课程不在商城公开列表展示。':'所选班级将上架到商城。':'仅下架上述班级，其余已上架班级保持原状态。')+'</p><div class="modal-actions"><button class="btn" onclick="mallShelfCancelConfirmation()">取消</button><button class="btn primary" onclick="mallShelfConfirmOperation()">确认'+label+'</button></div></div></div>';
}
function mallShelfConfirmOperation(){
 const pending=mallShelfState.confirmation;if(!pending||!mallShelfAllowed())return false;
 if(typeof permissionState!=='undefined'&&pending.identity!==permissionState.identity){mallShelfState.confirmation=null;mallRender();toast('操作账号已切换，请重新选择并确认');return false}
 const {active,hidden,selections,classes}=pending;
 const stale=selections.some(row=>!a.courses[row.index]||a.courses[row.index].name!==row.name||JSON.stringify(mallShelfOffered(row.index))!==JSON.stringify(row.offered)||mallState.hiddenShelved.includes(row.index)!==row.wasHidden||JSON.stringify(mallShelfChoice(row.index,active))!==JSON.stringify(row.ids)||JSON.stringify(mallShelfEligible(row.index,active).filter(c=>row.ids.includes(c.id)).map(c=>({id:c.id,name:c.name})))!==JSON.stringify(classes.find(c=>c.index===row.index).items));
 if(stale){mallShelfState.confirmation=null;mallRender();toast('课程或班级范围已变化，请重新选择并确认');return false}
 for(const row of selections){
  const i=row.index,remaining=active?[...new Set([...row.offered,...row.ids])]:row.offered.filter(id=>!row.ids.includes(id));
  mallState.shelved=remaining.length?[...new Set([...mallState.shelved,i])]:mallState.shelved.filter(x=>x!==i);
  if(active)mallState.hiddenShelved=hidden?[...new Set([...mallState.hiddenShelved,i])]:mallState.hiddenShelved.filter(x=>x!==i);
  else if(!remaining.length)mallState.hiddenShelved=mallState.hiddenShelved.filter(x=>x!==i);
  mallShelfState.offered[i]=remaining;
 }
 mallShelfState.confirmation=null;mallState.selected=[];mallShelfState.choices={};mallShelfState.modal=null;mallRender();toast(active?hidden?'已按所选班级隐身上架':'已按所选班级上架':'已下架所选班级，其余班级保持原状态');return true;
}
mallSetShelf=function(index,active){return mallShelfCommit([index],active)};
mallBatchShelf=function(active){return mallShelfCommit(mallState.selected,active)};
mallBatchHidden=function(){return mallShelfCommit(mallState.selected,true,true)};
