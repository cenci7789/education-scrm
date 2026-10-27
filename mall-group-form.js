// Group activity editor. Other marketing forms continue using their existing implementation.
const groupFormBase={form:mallFormPage,new:mallNew,edit:mallEdit,next:mallNext,save:mallSave};
function groupAllowed(){return state.page==='mallForm'&&mallState.formType==='group'&&(typeof permissionCanVisit!=='function'||permissionCanVisit('mallGroup'))}
function groupDraft(){return mallState.groupDraft??={name:'',start:'',end:'',validHours:'24',people:'2',tiers:[{people:'2',mode:'price',value:''}],virtual:true,products:[],participants:['在读学员','潜在学员'],stackCoupon:false,picker:null}}
function groupTiers(){return groupDraft().tiers??=[{people:String(groupDraft().people||2),mode:'price',value:''}]}
function groupDecimal(value){const text=String(value).trim();if(!/^\d+(\.\d{1,2})?$/.test(text))return null;const [whole,fraction='']=text.split('.'),number=Number(whole)*100+Number(fraction.padEnd(2,'0'));return Number.isSafeInteger(number)?number:null}
function groupTierPrice(course,tier){
 const value=groupDecimal(tier.value),base=groupDecimal(course.price);
 if(value===null||value<=0||base===null||base<=0)return null;
 if(tier.mode==='price')return value<=base?value/100:null;
 if(tier.mode!=='discount'||value>1000)return null;
 const price=Math.round(base*value/1000);return price>0?price/100:null;
}
function groupTierDescription(tier){return tier.people+'人成团 · '+(tier.mode==='discount'?tier.value+'折':groupMoney(tier.value))}
function groupTierPreview(course){return groupTiers().map((tier,i)=>'<div class="group-tier-preview"><span>第'+(i+1)+'阶 · '+esc(tier.people||'—')+'人</span><strong>'+groupMoney(groupTierPrice(course,tier))+'</strong>'+(tier.mode==='discount'?'<small>'+esc(tier.value||'—')+'折</small>':'')+'</div>').join('')}
function groupTierFields(){const tiers=groupTiers();return '<div id="group-tier-editor">'+tiers.map((tier,i)=>`<div class="group-tier-row"><strong>第${i+1}阶</strong><label>成团人数<input class="input" type="number" min="2" step="1" aria-label="第${i+1}阶成团人数" value="${esc(tier.people)}" oninput="groupSetTier(${i},'people',this.value)"></label><label>优惠方式<select class="select" aria-label="第${i+1}阶优惠方式" onchange="groupSetTier(${i},'mode',this.value)"><option value="price" ${tier.mode==='price'?'selected':''}>拼团价格</option><option value="discount" ${tier.mode==='discount'?'selected':''}>折扣</option></select></label><label>${tier.mode==='discount'?'折扣':'拼团价格'}<input class="input" type="number" min="0.01" ${tier.mode==='discount'?'max="10"':''} step="0.01" aria-label="第${i+1}阶${tier.mode==='discount'?'折扣':'拼团价格'}" placeholder="请输入" value="${esc(tier.value)}" oninput="groupSetTier(${i},'value',this.value)"></label><span>${tier.mode==='discount'?'折':'元'}</span>${tiers.length>1?`<button class="group-text-button" aria-label="删除第${i+1}阶" onclick="groupRemoveTier(${i})">删除</button>`:''}${i===tiers.length-1&&tiers.length<3?'<button class="btn small" aria-label="添加阶梯" onclick="groupAddTier()">＋ 添加阶梯</button>':''}</div>`).join('')+'<p class="help">最多3阶，人数从小到大设置，每阶至少2人、不设上限。拼团价格为课程学费成交价；如填8.5折，按各课程原价的85%计算。</p></div>'}
function groupSetTier(index,key,value){
 if(!groupAllowed()||!['people','mode','value'].includes(key)||!groupTiers()[index])return;
 if(key==='mode'&&!['price','discount'].includes(value))return;
 const tier=groupTiers()[index];if(key==='mode'&&tier.mode!==value)tier.value='';tier[key]=value;
 groupDraft().people=groupTiers()[0].people;
 if(key==='mode')$('#group-tier-editor').outerHTML=groupTierFields();
 $('#group-products').innerHTML=groupProductTable();
}
function groupAddTier(){if(!groupAllowed()||groupTiers().length>=3)return;const previous=Number(groupTiers().at(-1).people);groupTiers().push({people:Number.isSafeInteger(previous)&&previous>=2?String(previous+1):'',mode:'price',value:''});mallRender()}
function groupRemoveTier(index){if(!groupAllowed()||groupTiers().length<=1||!Number.isInteger(index)||index<0||index>=groupTiers().length)return;groupTiers().splice(index,1);groupDraft().people=groupTiers()[0].people;mallRender()}
function groupRestoreTiers(old){
 if(Array.isArray(old.tiers)&&old.tiers.length)return old.tiers.map(t=>({people:String(t.people),mode:t.mode,value:String(t.value)}));
 const prices=[...new Set((old.groupProducts||[]).map(p=>p.groupPrice).filter(v=>v!=null&&v!==''))];
 return [{people:String(old.people||parseInt(old.limit)||2),mode:'price',value:prices.length===1?String(prices[0]):''}];
}
function groupValidateTiers(){
 const tiers=groupTiers();if(!tiers.length||tiers.length>3)return '请设置1～3阶拼团规则';let previous=1;
 for(const [index,tier] of tiers.entries()){
  const people=Number(tier.people);if(!Number.isSafeInteger(people)||people<2)return '第'+(index+1)+'阶成团人数须为至少2人的整数';
  if(people<=previous)return '各阶成团人数须从小到大且不能重复';previous=people;
  const value=groupDecimal(tier.value);if(value===null||value<=0)return '请填写第'+(index+1)+'阶的有效价格或折扣，最多两位小数';
  if(!['price','discount'].includes(tier.mode))return '请选择有效的优惠方式';
  if(tier.mode==='discount'&&value>1000)return '折扣须大于0且不超过10折';
 }
 return '';
}
function groupKey(courseIndex,classId){return `${courseIndex}:${classId}`}
function groupDate(value){const time=new Date(value).getTime();return value&&Number.isFinite(time)?time:null}
function groupSessionStart(session){
 if(session.startsAt)return groupDate(session.startsAt)===null?'':session.startsAt;
 const time=session.start||String(session.time||'').match(/\d{2}:\d{2}/)?.[0];
 const value=session.date&&time?session.date+'T'+time:'';return groupDate(value)===null?'':value;
}
function groupProducts(){
 return mallCourses().filter(course=>course.active!==false&&mallState.shelved.includes(course.index)).map(course=>{
  const offered=mallShelfOffered(course.index);
  const classes=mallShelfClasses(course.index).map(cls=>{
   const hasSessions=Array.isArray(cls.sessions)&&cls.sessions.length>0;
   const sessions=(hasSessions?cls.sessions:[cls]).filter(s=>!s.cancelled&&s.status!=='已取消');
   const starts=sessions.map(groupSessionStart).filter(Boolean).sort();
   const ends=sessions.map(s=>s.endsAt||(s.date&&s.end?s.date+'T'+s.end:'')).filter(Boolean).sort();
   return {id:cls.id,name:cls.name,start:starts[0]||'',sessionStarts:starts,end:ends.at(-1)||cls.endDate||'',teacher:cls.teacher||'',academicTeacher:cls.academicTeacher||'',format:cls.format||'面授',students:cls.students,capacity:cls.capacity,offered:offered.includes(cls.id),status:cls.status||'',tags:[cls.term,cls.grade,cls.subject,cls.classType,cls.campus,...cls.tags].filter(Boolean)};
  });
  const sum=key=>classes.every(c=>c[key]!=null&&Number.isFinite(Number(c[key])))?classes.reduce((s,c)=>s+Number(c[key]),0):null;
  const names=key=>[...new Set(classes.map(c=>c[key]).filter(Boolean))].join('、');
  return {key:'course:'+course.index,courseIndex:course.index,name:course.name,subject:course.subject||'',materialFee:0,price:course.fee,classes,start:classes.map(c=>c.start).filter(Boolean).sort()[0]||'',end:classes.length&&classes.every(c=>c.end)?classes.map(c=>c.end).sort().at(-1):'',students:sum('students'),capacity:sum('capacity'),format:names('format'),teacher:names('teacher'),academicTeacher:names('academicTeacher'),tags:[...new Set(classes.flatMap(c=>c.tags))]};
 });
}
function groupUnstartedSessions(cls){const start=groupDate(groupDraft().start);return start===null?[]:(cls?.sessionStarts||[]).filter(value=>groupDate(value)!==null&&groupDate(value)>start)}
function groupClassEligible(cls){return groupUnstartedSessions(cls).length>0}
function groupEligible(course){return !!course?.classes?.some(groupClassEligible)}
function groupClassReason(cls){if(groupClassEligible(cls))return '可参与（'+groupUnstartedSessions(cls).length+'节未开课）';return cls.sessionStarts?.length?'不可参与：活动开始时所有课节均已开课':'不可参与：暂无有效课节时间'}
function groupSelectionError(course){if(!course?.classes?.length)return '暂无班级';return '暂无在活动开始时仍有未开课课节的班级'}
function groupParticipatingCourse(course){
 const classes=course.classes.filter(groupClassEligible),sum=key=>classes.length&&classes.every(c=>c[key]!=null&&Number.isFinite(Number(c[key])))?classes.reduce((s,c)=>s+Number(c[key]),0):null;
 const names=key=>[...new Set(classes.map(c=>c[key]).filter(Boolean))].join('、');
 return {...course,totalClassCount:course.classes.length,classes,start:classes.map(c=>c.start).filter(Boolean).sort()[0]||'',end:classes.length&&classes.every(c=>c.end)?classes.map(c=>c.end).sort().at(-1):'',students:sum('students'),capacity:sum('capacity'),teacher:names('teacher'),academicTeacher:names('academicTeacher'),format:names('format'),tags:[...new Set(classes.flatMap(c=>c.tags))]};
}
function groupRefreshSelected(){const available=groupProducts();groupDraft().products=groupDraft().products.map(p=>{const live=available.find(c=>c.key===p.key);return {...(live?groupParticipatingCourse(live):{...p,classes:[]}),groupPrice:p.groupPrice}})}
function groupRestoreCourses(items){
 const grouped=new Map();for(const item of items||[]){if(!grouped.has(item.courseIndex))grouped.set(item.courseIndex,[]);grouped.get(item.courseIndex).push(item)}
 return [...grouped].map(([index,items])=>{
  if(items.length===1&&items[0].classes)return JSON.parse(JSON.stringify(items[0]));
  const live=groupProducts().find(p=>p.courseIndex===index),prices=[...new Set(items.map(p=>String(p.groupPrice??'')))];
  return {...(live||{key:'course:'+index,courseIndex:index,name:items[0].name,classes:[],tags:[],price:items[0].price,materialFee:items[0].materialFee}),groupPrice:prices.length===1?prices[0]:''};
 });
}
function groupMoney(value){return value==null||value===''||!Number.isFinite(Number(value))?'—':'¥'+Number(value).toFixed(2)}
function groupTime(value){return value?String(value).replace('T',' '):'—'}
function groupRow(label,content,required=false){return `<div class="group-row"><div class="group-label ${required?'required':''}">${label}</div><div class="group-control">${content}</div></div>`}
function groupSet(key,value){
 if(!groupAllowed())return;const d=groupDraft();if(!['name','start','end','validHours','people','virtual','stackCoupon'].includes(key))return;
 if(key==='people'){groupSetTier(0,'people',value);return}d[key]=value;if(key==='name'){$('#group-name-count').textContent=Array.from(value).length+'/20'}
 if(key==='start'){groupRefreshSelected();$('#group-products').innerHTML=groupProductTable()}
}
function groupRemove(key){if(!groupAllowed())return;groupDraft().products=groupDraft().products.filter(p=>p.key!==key);$('#group-products').innerHTML=groupProductTable()}
function groupProductTable(readonly=false){
 const d=groupDraft(),available=groupProducts();
 return aTable(['序号','课程名称','标签','课程原价','课程拼团价 ⓘ','已招 / 预招','开课时间','结课时间',...(readonly?[]:['操作'])],d.products.map((selected,i)=>{
  const live=available.find(p=>p.key===selected.key),p=live?groupParticipatingCourse(live):selected,valid=live&&groupEligible(live),key=esc(JSON.stringify(selected.key));
  return `<tr><td>${i+1}</td><td>${esc(p.name)}<small class="group-class-name">${p.classes.length} 个可参与班级 / 共 ${p.totalClassCount??p.classes.length} 个班级</small>${valid?'':`<small class="group-error">${live?esc(groupSelectionError(live)):'课程已下架或班级已移除'}</small>`}</td><td><div class="group-tags">${p.tags.map(t=>`<span>${esc(t)}</span>`).join('')}</div></td><td>${groupMoney(p.price)}</td><td>${groupTierPreview(p)}</td><td>${esc(p.students??'—')} / ${esc(p.capacity??'—')}</td><td>${esc(groupTime(p.start))}</td><td>${esc(groupTime(p.end))}</td>${readonly?'':`<td><button class="group-text-button" onclick="groupRemove(${key})">移除</button></td>`}</tr>`;
 }))+(!d.products.length?'<div class="group-empty">暂无数据</div>':'');
}
function groupActivityFields(){const d=groupDraft();return `<div class="mall-form-section">活动设置</div>`+
 groupRow('活动名称',`<div class="group-name"><input class="input" aria-label="活动名称" maxlength="20" value="${esc(d.name)}" oninput="groupSet('name',this.value)"><span id="group-name-count">${Array.from(d.name).length}/20</span></div>`,true)+
 groupRow('活动时间',`<div class="group-inline"><input class="input" type="datetime-local" aria-label="活动开始时间" value="${esc(d.start)}" onchange="groupSet('start',this.value)"><span>→</span><input class="input" type="datetime-local" aria-label="活动结束时间" value="${esc(d.end)}" onchange="groupSet('end',this.value)"><span class="muted">用于控制活动内课程可发起拼团的时间范围</span></div>`,true)+
 groupRow('选择课程',`<div id="group-products">${groupProductTable()}</div><div class="group-product-footer"><button class="group-text-button" onclick="groupOpenPicker()">+选择课程</button><span class="muted">至多可添加20门课程；活动开始时仍有未开课课节的班级可参与，勾选课程将纳入旗下所有符合条件的班级</span></div>`,true)+
 groupRow('拼团有效期',`<div class="group-inline"><select class="select group-hours" aria-label="拼团有效期" onchange="groupSet('validHours',this.value)">${[6,12,24,48,72].map(n=>`<option value="${n}" ${Number(d.validHours)===n?'selected':''}>${n}</option>`).join('')}</select><span>小时</span><span class="muted">发起拼团的用户需在有效期内达到成团人数</span></div>`,true)+
 groupRow('阶梯拼团',groupTierFields(),true)+
 groupRow('虚拟成团',`<div class="group-inline"><label class="switch"><input type="checkbox" aria-label="虚拟成团" ${d.virtual?'checked':''} onchange="groupSet('virtual',this.checked)"><span></span></label><span class="muted">开启后，活动到期或结束仍未成团时，以虚拟名额补齐成团人数</span></div>`);
}
function groupParticipants(name,on){if(!groupAllowed()||!['在读学员','潜在学员','历史学员'].includes(name))return;const d=groupDraft();d.participants=on?[...new Set([...d.participants,name])]:d.participants.filter(p=>p!==name)}
function groupReviewFields(){const d=groupDraft();return `<div class="mall-form-section">确认活动与参与规则</div><div class="group-review"><strong>${esc(d.name)}</strong><p>${esc(groupTime(d.start))} → ${esc(groupTime(d.end))}</p><p>${groupTiers().map(t=>esc(groupTierDescription(t))).join('；')} · ${esc(d.validHours)} 小时有效 · 虚拟成团${d.virtual?'开启':'关闭'}</p></div>${groupProductTable(true)}`+groupRow('参与用户',`<div class="checkrow">${['在读学员','潜在学员','历史学员'].map(name=>`<label><input type="checkbox" ${d.participants.includes(name)?'checked':''} onchange="groupParticipants('${name}',this.checked)">${name}</label>`).join('')}</div>`,true)+groupRow('优惠叠加',`<label><input type="checkbox" ${d.stackCoupon?'checked':''} onchange="groupSet('stackCoupon',this.checked)"> 允许叠加优惠券</label>`)}
mallFormPage=function(){
 if(mallState.formType!=='group')return groupFormBase.form();
 return heading((mallState.editIndex==null?'新建':'编辑')+'拼团',`第 ${mallState.formStep} 步 / 2 · ${mallState.formStep===1?'设置拼团活动':'确认活动与参与规则'}`)+`<section class="mall-group-form"><div class="card pad">${mallState.formStep===1?groupActivityFields():groupReviewFields()}<div class="group-footer"><button class="btn" onclick="mallNav('mallGroup')">取消</button>${mallState.formStep===2?'<button class="btn" onclick="groupPrevious()">上一步</button>':''}<button class="btn primary" onclick="${mallState.formStep===1?'mallNext()':'mallSave()'}">${mallState.formStep===1?'下一步':'保存'}</button></div></div>${groupDraft().picker?groupPickerPage():''}</section>`;
};
mallNew=function(type){if(type==='group')mallState.groupDraft=null;return groupFormBase.new(type)};
mallEdit=function(type,index){
 if(type!=='group')return groupFormBase.edit(type,index);
 const old=mallState.activities.group[index];if(!old)return;
 mallState.groupDraft={name:old.name||'',start:old.start?.length===10?old.start+'T00:00':old.start||'',end:old.end?.length===10?old.end+'T23:59':old.end||'',validHours:String(old.validHours||24),people:String(old.people||parseInt(old.limit)||2),tiers:groupRestoreTiers(old),virtual:old.virtualGroup??false,products:groupRestoreCourses(old.groupProducts),participants:old.participants?.slice()||['在读学员','潜在学员'],stackCoupon:!!old.stackCoupon,picker:null};
 // Legacy course-name-only activities need explicit class selection and per-product prices.
 groupRefreshSelected();groupFormBase.edit(type,index);
};
function groupOpenPicker(){if(!groupAllowed())return;if(groupDate(groupDraft().start)===null){toast('请先填写活动开始时间');return}groupDraft().picker={keys:groupDraft().products.map(p=>p.key),search:'',subject:'',page:1,detail:null};mallRender()}
function groupPickerCourses(){return groupProducts().filter(groupEligible)}
function groupPickerRows(){const p=groupDraft().picker,query=p?.search.trim().toLowerCase()||'';return groupPickerCourses().filter(c=>(!query||c.name.toLowerCase().includes(query))&&(!p?.subject||c.subject===p.subject))}
function groupPickerPageRows(){const p=groupDraft().picker,rows=groupPickerRows();p.page=Math.max(1,Math.min(p.page,Math.ceil(rows.length/10)||1));return rows.slice((p.page-1)*10,p.page*10)}
function groupPickerResults(){
 const d=groupDraft(),rows=groupPickerPageRows(),all=rows.filter(groupEligible),checked=all.length&&all.every(p=>d.picker.keys.includes(p.key));
 return aTable(['<label class="group-course-check"><input type="checkbox" aria-label="选择本页全部课程" '+(checked?'checked':'')+' onchange="groupPickerSelectPage(this.checked)">课程名称</label>','可参与 / 全部班级','开课时间','结课时间','授课方式','主讲','辅导','学科','课程费','已购 / 预招人数','操作'],rows.map(p=>{
 const enabled=groupEligible(p),key=esc(JSON.stringify(p.key));
 return '<tr><td><label class="group-course-check"><input type="checkbox" aria-label="选择'+esc(p.name)+'及全部可参与班级" '+(d.picker.keys.includes(p.key)?'checked':'')+' '+(!enabled&&!d.picker.keys.includes(p.key)?'disabled':'')+' onchange="groupPickerSelect('+key+',this.checked)"><span>'+esc(p.name)+'</span></label>'+(!enabled?'<small class="group-error">'+esc(groupSelectionError(p))+'</small>':'')+'</td><td>'+p.classes.filter(groupClassEligible).length+' / '+p.classes.length+'</td><td>'+esc(groupTime(p.start))+'</td><td>'+esc(groupTime(p.end))+'</td><td>'+esc(p.format||'—')+'</td><td>'+esc(p.teacher||'—')+'</td><td>'+esc(p.academicTeacher||'—')+'</td><td>'+esc(p.subject||'—')+'</td><td>'+groupMoney(p.price)+'</td><td>'+esc(p.students??'—')+' / '+esc(p.capacity??'—')+'</td><td><button class="group-text-button" onclick="groupPickerDetail('+key+')">详情</button></td></tr>';
 }))+(!rows.length?'<div class="group-empty">暂无符合条件的课程</div>':'')+groupPickerPagination();
}
function groupPickerPagination(){const p=groupDraft().picker,total=groupPickerRows().length,pages=Math.ceil(total/10)||1;return '<div class="group-pagination"><span>共 '+total+' 门课程</span><button class="btn small" '+(p.page===1?'disabled':'')+' onclick="groupPickerPageChange(-1)">上一页</button><span>'+p.page+' / '+pages+'</span><button class="btn small" '+(p.page===pages?'disabled':'')+' onclick="groupPickerPageChange(1)">下一页</button></div>'}
function groupPickerDetails(){
 const p=groupProducts().find(c=>c.key===groupDraft().picker.detail);if(!p)return '<div class="group-empty">课程已下架</div>';
 const selected=groupDraft().picker.keys.includes(p.key),eligible=p.classes.filter(groupClassEligible).length;
 return '<div class="group-detail-heading"><button class="btn small" onclick="groupPickerDetail(null)">← 返回课程列表</button><strong>'+esc(p.name)+' · 全部 '+p.classes.length+' 个班级 · 可参与 '+eligible+' 个</strong></div><p class="help">参与班级随课程勾选；不符合条件的班级不会被选中。</p>'+aTable(['参与','班级名称','标签','主讲','辅导','开课时间','结课时间','已购 / 预招人数','参与条件'],p.classes.map(c=>'<tr class="'+(groupClassEligible(c)?'':'group-ineligible')+'"><td><input type="checkbox" disabled aria-label="'+esc(c.name)+'参与状态" '+(selected&&groupClassEligible(c)?'checked':'')+'></td><td>'+esc(c.name)+'</td><td>'+esc(c.tags.join(' / '))+'</td><td>'+esc(c.teacher||'—')+'</td><td>'+esc(c.academicTeacher||'—')+'</td><td>'+esc(groupTime(c.start))+'</td><td>'+esc(groupTime(c.end))+'</td><td>'+esc(c.students??'—')+' / '+esc(c.capacity??'—')+'</td><td>'+esc(groupClassReason(c))+'</td></tr>'));
}
function groupPickerPage(){
 const d=groupDraft(),p=d.picker;
 return '<div class="modal-backdrop"><div class="modal group-picker" role="dialog" aria-modal="true" aria-label="选择课程"><div class="modal-head"><h2>选择课程</h2><button class="btn small" aria-label="关闭选择课程" onclick="groupClosePicker()">✕</button></div><div class="group-picker-layout"><aside>课程（已选 <span id="group-picker-side-count">'+p.keys.length+'</span> 门）</aside><main><p class="notice">活动开始时，只要班级仍有未开课课节即可参与。课程下至少有一个符合条件的班级即可选择；勾选课程仅纳入所有可参与班级。</p>'+(p.detail?groupPickerDetails():'<div class="group-picker-filters"><input class="input" aria-label="搜索课程名称" placeholder="课程名称" value="'+esc(p.search)+'" oninput="groupPickerSearch(this.value)"><select class="select" aria-label="筛选学科" onchange="groupPickerSubject(this.value)"><option value="">全部学科</option>'+[...new Set(groupPickerCourses().map(c=>c.subject).filter(Boolean))].map(s=>'<option value="'+esc(s)+'" '+(s===p.subject?'selected':'')+'>'+esc(s)+'</option>').join('')+'</select><button class="btn small" onclick="groupPickerReset()">清除筛选条件</button></div><div id="group-picker-results">'+groupPickerResults()+'</div>')+'</main></div><div class="modal-actions group-picker-footer"><span id="group-picker-count">已选 '+p.keys.length+' / 20 门课程</span><button class="btn" onclick="groupClosePicker()">取消</button><button class="btn primary" onclick="groupConfirmPicker()">确认</button></div></div></div>';
}
function groupPickerSearch(value){if(!groupAllowed()||!groupDraft().picker)return;const p=groupDraft().picker;p.search=value;p.page=1;$('#group-picker-results').innerHTML=groupPickerResults()}
function groupPickerSubject(value){if(!groupAllowed()||!groupDraft().picker)return;const p=groupDraft().picker;p.subject=value;p.page=1;$('#group-picker-results').innerHTML=groupPickerResults()}
function groupPickerReset(){if(!groupAllowed()||!groupDraft().picker)return;Object.assign(groupDraft().picker,{search:'',subject:'',page:1});mallRender()}
function groupPickerPageChange(delta){if(!groupAllowed()||!groupDraft().picker||![-1,1].includes(delta))return;groupDraft().picker.page+=delta;$('#group-picker-results').innerHTML=groupPickerResults()}
function groupPickerDetail(key){if(!groupAllowed()||!groupDraft().picker)return;if(key!==null&&!groupProducts().some(c=>c.key===key))return;groupDraft().picker.detail=key;mallRender()}
function groupPickerUpdate(){const p=groupDraft().picker;$('#group-picker-count').textContent='已选 '+p.keys.length+' / 20 门课程';$('#group-picker-side-count').textContent=p.keys.length;$('#group-picker-results').innerHTML=groupPickerResults()}
function groupPickerSelect(key,on){if(!groupAllowed()||!groupDraft().picker)return;const d=groupDraft(),course=groupProducts().find(p=>p.key===key);if(on&&(!course||!groupEligible(course)))return;if(on&&!d.picker.keys.includes(key)&&d.picker.keys.length>=20){toast('最多选择20门课程');groupPickerUpdate();return}d.picker.keys=on?[...new Set([...d.picker.keys,key])]:d.picker.keys.filter(k=>k!==key);groupPickerUpdate()}
function groupPickerSelectPage(on){if(!groupAllowed()||!groupDraft().picker)return;const p=groupDraft().picker,rows=groupPickerPageRows(),keys=rows.filter(groupEligible).map(c=>c.key),next=on?[...new Set([...p.keys,...keys])]:p.keys.filter(key=>!rows.some(c=>c.key===key));if(next.length>20){toast('最多选择20门课程，请减少选择');groupPickerUpdate();return}p.keys=next;groupPickerUpdate()}
function groupClosePicker(){groupDraft().picker=null;mallRender()}
function groupConfirmPicker(){if(!groupAllowed()||!groupDraft().picker)return;const d=groupDraft(),courses=groupProducts(),chosen=d.picker.keys.map(key=>courses.find(p=>p.key===key));if(chosen.length>20||chosen.some(p=>!p||!groupEligible(p))){toast('部分课程已不可选，请调整选择');return}d.products=chosen.map(p=>({...groupParticipatingCourse(p),groupPrice:d.products.find(old=>old.key===p.key)?.groupPrice??''}));d.picker=null;mallRender()}
function groupValidate(){
 const d=groupDraft();if(!d.name.trim()||Array.from(d.name.trim()).length>20)return '请填写20字以内的活动名称';
 const start=groupDate(d.start),end=groupDate(d.end);if(start===null||end===null||start>=end)return '请填写有效的活动时间，结束时间须晚于开始时间';
 if(![6,12,24,48,72].includes(Number(d.validHours)))return '请选择有效的拼团有效期';
 const tierError=groupValidateTiers();if(tierError)return tierError;
 if(!d.products.length||d.products.length>20||new Set(d.products.map(p=>p.key)).size!==d.products.length)return '请选择1～20门不同的课程';
 const available=groupProducts();for(const p of d.products){const live=available.find(x=>x.key===p.key);if(!live||!groupEligible(live))return '所选课程须至少有一个在活动开始时仍有未开课课节的班级';for(const [index,tier] of groupTiers().entries())if(groupTierPrice(live,tier)===null)return '第'+(index+1)+'阶价格须大于0且不高于所选课程原价；折扣按各课程原价计算'}
 return '';
}
mallNext=function(){if(mallState.formType!=='group')return groupFormBase.next();if(!groupAllowed())return;const error=groupValidate();if(error){toast(error);return}groupRefreshSelected();mallState.formStep=2;mallRender()};
function groupPrevious(){if(!groupAllowed())return;mallState.formStep=1;mallRender()}
mallSave=function(){
 if(mallState.formType!=='group')return groupFormBase.save();if(!groupAllowed()||mallState.formStep!==2)return;
 const d=groupDraft(),error=groupValidate();if(error){toast(error);return}if(!d.participants.length){toast('请至少选择一种参与用户类型');return}
 const available=groupProducts(),old=mallState.editIndex==null?null:mallState.activities.group[mallState.editIndex];
 const tiers=groupTiers().map(t=>({people:Number(t.people),mode:t.mode,value:Number(t.value)}));
 const products=d.products.map(p=>{const course=groupParticipatingCourse(available.find(x=>x.key===p.key)),tierPrices=tiers.map(t=>({...t,price:groupTierPrice(course,t)}));return {...course,tierPrices,groupPrice:tierPrices[0].price}});
 const entry={...old,name:d.name.trim(),start:d.start,end:d.end,status:old?.status||'未开始',products:products.map(p=>p.name),groupProducts:products,validHours:Number(d.validHours),people:tiers[0].people,tiers,limit:tiers.map(t=>groupTierDescription(t)).join(' / '),virtualGroup:!!d.virtual,participants:[...d.participants],stackCoupon:!!d.stackCoupon};
 if(mallState.editIndex==null)mallState.activities.group.unshift(entry);else mallState.activities.group[mallState.editIndex]=entry;
 mallState.groupDraft=null;mallNav('mallGroup');toast('拼团活动已保存（原型演示）');
};

const groupBaseActivityPage=mallActivityPage;
mallActivityPage=function(type){return type==='group'?groupBaseActivityPage(type).replace('活动商品数','活动课程数'):groupBaseActivityPage(type)};
