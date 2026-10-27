// Independent copy of the group activity editor for joint enrollment.
const jointFormBase={form:mallFormPage,new:mallNew,edit:mallEdit,next:mallNext,save:mallSave};
function jointAllowed(){return state.page==='mallForm'&&mallState.formType==='joint'&&(typeof permissionCanVisit!=='function'||permissionCanVisit('mallJoint'))}
const jointParticipantTypes=['在读学员','非在读学员','历史学员','从未报名过课程的学员'];
function jointDefaultRules(){return [1,2,3].map(quantity=>({quantity:String(quantity),mode:'reduction',value:''}))}
function jointDraft(){return mallState.jointDraft??={name:'',start:'',end:'',rules:jointDefaultRules(),products:[],participants:[],stackCoupon:false,picker:null}}
function jointRules(){return jointDraft().rules}
function jointDecimal(value){const text=String(value).trim();if(!/^\d+(\.\d{1,2})?$/.test(text))return null;const [whole,fraction='']=text.split('.'),number=Number(whole)*100+Number(fraction.padEnd(2,'0'));return Number.isSafeInteger(number)?number:null}
function jointRuleDescription(rule){return '报名班级数量≥'+rule.quantity+' · '+(rule.mode==='discount'?'总价'+rule.value+'折':'总价立减'+jointMoney(rule.value))}
// Apply only the highest matching threshold to the combined tuition total.
function jointTotalPrice(total,quantity,rules=jointRules()){
 const cents=jointDecimal(total);if(cents===null||!Number.isSafeInteger(quantity)||quantity<0)return null;
 const rule=rules.filter(r=>Number(r.quantity)<=quantity).sort((a,b)=>Number(b.quantity)-Number(a.quantity))[0];
 if(!rule)return cents/100;const value=jointDecimal(rule.value);if(value===null||value<=0)return null;
 if(rule.mode==='reduction')return Math.max(0,cents-value)/100;
 if(rule.mode!=='discount'||value>1000)return null;
 return Math.round(cents*value/1000)/100;
}
function jointRulePreview(){return jointRules().map(r=>'<div class="joint-rule-preview">'+esc(r.value?jointRuleDescription(r):'报名班级数量≥'+r.quantity+' · 待设置优惠')+'</div>').join('')}
function jointRuleFields(){
 const rules=jointRules(),maximum=Math.max(20,...rules.map(r=>Number(r.quantity)+1),jointDraft().products.reduce((n,p)=>n+p.classes.length,0));
 const rows=rules.map((r,i)=>`<tr><td><label class="joint-rule-count">数量≥ <select class="select" aria-label="第${i+1}条报名班级数量" onchange="jointSetRule(${i},'quantity',this.value)">${Array.from({length:maximum},(_,n)=>`<option value="${n+1}" ${Number(r.quantity)===n+1?'selected':''}>${n+1}</option>`).join('')}</select></label></td><td><div class="joint-rule-discount"><select class="select" aria-label="第${i+1}条优惠方式" onchange="jointSetRule(${i},'mode',this.value)"><option value="reduction" ${r.mode==='reduction'?'selected':''}>总价立减</option><option value="discount" ${r.mode==='discount'?'selected':''}>总价折扣</option></select><input class="input" type="number" min="0.01" ${r.mode==='discount'?'max="10"':''} step="0.01" placeholder="请输入" aria-label="第${i+1}条优惠${r.mode==='discount'?'折扣':'金额'}" value="${esc(r.value)}" oninput="jointSetRule(${i},'value',this.value)"><span>${r.mode==='discount'?'折':'元'}</span></div></td><td><button class="joint-text-button" ${rules.length===1?'disabled':''} onclick="jointRemoveRule(${i})">删除</button></td></tr>`).join('');
 return `<div id="joint-rule-editor"><div class="joint-rule-scroll"><table class="joint-rule-table"><thead><tr><th>报名班级数量</th><th>单班优惠 <span title="优惠按本次符合活动条件的报名班级学费总价计算。">ⓘ</span></th><th>操作</th></tr></thead><tbody>${rows}</tbody></table></div><button class="joint-text-button joint-rule-add" onclick="jointAddRule()">＋ 添加</button>${jointDraft().legacyRuleNotice?'<p class="help">原活动使用成团规则，请重新设置报名班级数量与总价优惠。</p>':''}</div>`;
}

function jointSetRule(index,key,value){
 if(!jointAllowed()||!['quantity','mode','value'].includes(key)||!jointRules()[index])return;
 if(key==='mode'&&!['reduction','discount'].includes(value))return;
 const rule=jointRules()[index];if(key==='mode'&&rule.mode!==value)rule.value='';rule[key]=value;
 if(key==='mode')$('#joint-rule-editor').outerHTML=jointRuleFields();
 $('#joint-products').innerHTML=jointProductTable();
}
function jointAddRule(){if(!jointAllowed())return;const next=Math.max(0,...jointRules().map(r=>Number(r.quantity)||0))+1;jointRules().push({quantity:String(next),mode:'reduction',value:''});mallRender()}
function jointRemoveRule(index){if(!jointAllowed()||jointRules().length<=1||!Number.isInteger(index)||index<0||index>=jointRules().length)return;jointRules().splice(index,1);mallRender()}
function jointValidateRules(){
 const rules=jointRules();if(!rules.length)return '请至少设置一条活动规则';let previous=0;
 for(const [index,r] of rules.entries()){
  const count=Number(r.quantity);if(!Number.isSafeInteger(count)||count<1)return '第'+(index+1)+'条报名班级数量须为至少1的整数';
  if(count<=previous)return '报名班级数量须从小到大设置，且不能重复';previous=count;
  const value=jointDecimal(r.value);if(value===null||value<=0)return '请填写第'+(index+1)+'条有效的优惠金额或折扣，最多两位小数';
  if(!['reduction','discount'].includes(r.mode))return '请选择有效的优惠方式';
  if(r.mode==='discount'&&value>1000)return '折扣须大于0且不超过10折';
 }
 return '';
}
function jointParticipantFields(){const d=jointDraft();return `<div id="joint-participant-options" class="joint-participants"><label class="joint-participant-all"><input type="checkbox" aria-label="全选参与用户类型" ${jointParticipantTypes.every(n=>d.participants.includes(n))?'checked':''} onchange="jointSelectAllParticipants(this.checked)"> 全选</label>${jointParticipantTypes.map(name=>`<label><input type="checkbox" ${d.participants.includes(name)?'checked':''} onchange="jointParticipants('${name}',this.checked)"> ${name}</label>`).join('')}</div>`}
function jointParticipants(name,on){if(!jointAllowed()||!jointParticipantTypes.includes(name))return;const d=jointDraft();d.participants=on?[...new Set([...d.participants,name])]:d.participants.filter(p=>p!==name);$('#joint-participant-options').outerHTML=jointParticipantFields()}
function jointSelectAllParticipants(on){if(!jointAllowed())return;jointDraft().participants=on?[...jointParticipantTypes]:[];$('#joint-participant-options').outerHTML=jointParticipantFields()}

function jointKey(courseIndex,classId){return `${courseIndex}:${classId}`}
function jointDate(value){const time=new Date(value).getTime();return value&&Number.isFinite(time)?time:null}
function jointSessionStart(session){
 if(session.startsAt)return jointDate(session.startsAt)===null?'':session.startsAt;
 const time=session.start||String(session.time||'').match(/\d{2}:\d{2}/)?.[0];
 const value=session.date&&time?session.date+'T'+time:'';return jointDate(value)===null?'':value;
}
function jointProducts(){
 return mallCourses().filter(course=>course.active!==false&&mallState.shelved.includes(course.index)).map(course=>{
  const offered=mallShelfOffered(course.index);
  const classes=mallShelfClasses(course.index).map(cls=>{
   const hasSessions=Array.isArray(cls.sessions)&&cls.sessions.length>0;
   const sessions=(hasSessions?cls.sessions:[cls]).filter(s=>!s.cancelled&&s.status!=='已取消');
   const starts=sessions.map(jointSessionStart).filter(Boolean).sort();
   const ends=sessions.map(s=>s.endsAt||(s.date&&s.end?s.date+'T'+s.end:'')).filter(Boolean).sort();
   return {id:cls.id,name:cls.name,start:starts[0]||'',sessionStarts:starts,end:ends.at(-1)||cls.endDate||'',teacher:cls.teacher||'',academicTeacher:cls.academicTeacher||'',format:cls.format||'面授',students:cls.students,capacity:cls.capacity,offered:offered.includes(cls.id),status:cls.status||'',tags:[cls.term,cls.grade,cls.subject,cls.classType,cls.campus,...cls.tags].filter(Boolean)};
  });
  const sum=key=>classes.every(c=>c[key]!=null&&Number.isFinite(Number(c[key])))?classes.reduce((s,c)=>s+Number(c[key]),0):null;
  const names=key=>[...new Set(classes.map(c=>c[key]).filter(Boolean))].join('、');
  return {key:'course:'+course.index,courseIndex:course.index,name:course.name,subject:course.subject||'',materialFee:0,price:course.fee,classes,start:classes.map(c=>c.start).filter(Boolean).sort()[0]||'',end:classes.length&&classes.every(c=>c.end)?classes.map(c=>c.end).sort().at(-1):'',students:sum('students'),capacity:sum('capacity'),format:names('format'),teacher:names('teacher'),academicTeacher:names('academicTeacher'),tags:[...new Set(classes.flatMap(c=>c.tags))]};
 });
}
function jointUnstartedSessions(cls){const start=jointDate(jointDraft().start);return start===null?[]:(cls?.sessionStarts||[]).filter(value=>jointDate(value)!==null&&jointDate(value)>start)}
function jointClassEligible(cls){return jointUnstartedSessions(cls).length>0}
function jointEligible(course){return !!course?.classes?.some(jointClassEligible)}
function jointClassReason(cls){if(jointClassEligible(cls))return '可参与（'+jointUnstartedSessions(cls).length+'节未开课）';return cls.sessionStarts?.length?'不可参与：活动开始时所有课节均已开课':'不可参与：暂无有效课节时间'}
function jointSelectionError(course){if(!course?.classes?.length)return '暂无班级';return '暂无在活动开始时仍有未开课课节的班级'}
function jointParticipatingCourse(course){
 const classes=course.classes.filter(jointClassEligible),sum=key=>classes.length&&classes.every(c=>c[key]!=null&&Number.isFinite(Number(c[key])))?classes.reduce((s,c)=>s+Number(c[key]),0):null;
 const names=key=>[...new Set(classes.map(c=>c[key]).filter(Boolean))].join('、');
 return {...course,totalClassCount:course.classes.length,classes,start:classes.map(c=>c.start).filter(Boolean).sort()[0]||'',end:classes.length&&classes.every(c=>c.end)?classes.map(c=>c.end).sort().at(-1):'',students:sum('students'),capacity:sum('capacity'),teacher:names('teacher'),academicTeacher:names('academicTeacher'),format:names('format'),tags:[...new Set(classes.flatMap(c=>c.tags))]};
}
function jointRefreshSelected(){const available=jointProducts();jointDraft().products=jointDraft().products.map(p=>{const live=available.find(c=>c.key===p.key);return {...(live?jointParticipatingCourse(live):{...p,classes:[]}),jointPrice:p.jointPrice}})}
function jointRestoreCourses(items){
 const jointed=new Map();for(const item of items||[]){if(!jointed.has(item.courseIndex))jointed.set(item.courseIndex,[]);jointed.get(item.courseIndex).push(item)}
 return [...jointed].map(([index,items])=>{
  if(items.length===1&&items[0].classes)return JSON.parse(JSON.stringify(items[0]));
  const live=jointProducts().find(p=>p.courseIndex===index),prices=[...new Set(items.map(p=>String(p.jointPrice??'')))];
  return {...(live||{key:'course:'+index,courseIndex:index,name:items[0].name,classes:[],tags:[],price:items[0].price,materialFee:items[0].materialFee}),jointPrice:prices.length===1?prices[0]:''};
 });
}
function jointMoney(value){return value==null||value===''||!Number.isFinite(Number(value))?'—':'¥'+Number(value).toFixed(2)}
function jointTime(value){return value?String(value).replace('T',' '):'—'}
function jointRow(label,content,required=false){return `<div class="joint-row"><div class="joint-label ${required?'required':''}">${label}</div><div class="joint-control">${content}</div></div>`}
function jointSet(key,value){
 if(!jointAllowed()||!['name','start','end','stackCoupon'].includes(key))return;const d=jointDraft();d[key]=value;
 if(key==='name')$('#joint-name-count').textContent=Array.from(value).length+'/20';
 if(key==='start'){jointRefreshSelected();$('#joint-products').innerHTML=jointProductTable()}
}
function jointRemove(key){if(!jointAllowed())return;jointDraft().products=jointDraft().products.filter(p=>p.key!==key);$('#joint-products').innerHTML=jointProductTable()}
function jointProductTable(readonly=false){
 const d=jointDraft(),available=jointProducts();
 return aTable(['序号','课程名称','标签','课程原价','联报优惠 ⓘ','已招 / 预招','开课时间','结课时间',...(readonly?[]:['操作'])],d.products.map((selected,i)=>{
  const live=available.find(p=>p.key===selected.key),p=live?jointParticipatingCourse(live):selected,valid=live&&jointEligible(live),key=esc(JSON.stringify(selected.key));
  return `<tr><td>${i+1}</td><td>${esc(p.name)}<small class="joint-class-name">${p.classes.length} 个可参与班级 / 共 ${p.totalClassCount??p.classes.length} 个班级</small>${valid?'':`<small class="joint-error">${live?esc(jointSelectionError(live)):'课程已下架或班级已移除'}</small>`}</td><td><div class="joint-tags">${p.tags.map(t=>`<span>${esc(t)}</span>`).join('')}</div></td><td>${jointMoney(p.price)}</td><td>${jointRulePreview()}</td><td>${esc(p.students??'—')} / ${esc(p.capacity??'—')}</td><td>${esc(jointTime(p.start))}</td><td>${esc(jointTime(p.end))}</td>${readonly?'':`<td><button class="joint-text-button" onclick="jointRemove(${key})">移除</button></td>`}</tr>`;
 }))+(!d.products.length?'<div class="joint-empty">暂无数据</div>':'');
}
function jointActivityFields(){const d=jointDraft();return `<div class="mall-form-section">活动设置</div>`+
 jointRow('活动名称',`<div class="joint-name"><input class="input" aria-label="活动名称" maxlength="20" value="${esc(d.name)}" oninput="jointSet('name',this.value)"><span id="joint-name-count">${Array.from(d.name).length}/20</span></div>`,true)+
 jointRow('活动时间',`<div class="joint-inline"><input class="input" type="datetime-local" aria-label="活动开始时间" value="${esc(d.start)}" onchange="jointSet('start',this.value)"><span>→</span><input class="input" type="datetime-local" aria-label="活动结束时间" value="${esc(d.end)}" onchange="jointSet('end',this.value)"><span class="muted">用于控制活动内课程可发起联报的时间范围</span></div>`,true)+
 jointRow('选择课程',`<div id="joint-products">${jointProductTable()}</div><div class="joint-product-footer"><button class="joint-text-button" onclick="jointOpenPicker()">+选择课程</button><span class="muted">至多可添加20门课程；活动开始时仍有未开课课节的班级可参与，勾选课程将纳入旗下所有符合条件的班级</span></div>`,true)+
 jointRow('活动规则 <span title="按报名班级数量匹配最高档规则，总价优惠不叠加。">ⓘ</span>',jointRuleFields())+
 jointRow('优惠券叠加',`<label class="joint-coupon-option"><input type="checkbox" ${d.stackCoupon?'checked':''} onchange="jointSet('stackCoupon',this.checked)"> 允许学生参与活动的同时也可使用优惠券</label>`)+
 jointRow('参与用户类型',jointParticipantFields(),true);
}
function jointReviewFields(){const d=jointDraft();return '<div class="mall-form-section">确认活动与参与规则</div><div class="joint-review"><strong>'+esc(d.name)+'</strong><p>'+esc(jointTime(d.start))+' → '+esc(jointTime(d.end))+'</p>'+jointRules().map(r=>'<p>'+esc(jointRuleDescription(r))+'</p>').join('')+'<p>优惠券叠加：'+(d.stackCoupon?'允许':'不允许')+'</p><p>参与用户类型：'+d.participants.map(esc).join('、')+'</p></div>'+jointProductTable(true)}

mallFormPage=function(){
 if(mallState.formType!=='joint')return jointFormBase.form();
 return heading((mallState.editIndex==null?'新建':'编辑')+'联报',`第 ${mallState.formStep} 步 / 2 · ${mallState.formStep===1?'设置联报活动':'确认活动与参与规则'}`)+`<section class="mall-joint-form"><div class="card pad">${mallState.formStep===1?jointActivityFields():jointReviewFields()}<div class="joint-footer"><button class="btn" onclick="mallNav('mallJoint')">取消</button>${mallState.formStep===2?'<button class="btn" onclick="jointPrevious()">上一步</button>':''}<button class="btn primary" onclick="${mallState.formStep===1?'mallNext()':'mallSave()'}">${mallState.formStep===1?'下一步':'保存'}</button></div></div>${jointDraft().picker?jointPickerPage():''}</section>`;
};
mallNew=function(type){if(type==='joint')mallState.jointDraft=null;return jointFormBase.new(type)};
mallEdit=function(type,index){
 if(type!=='joint')return jointFormBase.edit(type,index);
 const old=mallState.activities.joint[index];if(!old)return;
 mallState.jointDraft={name:old.name||'',start:old.start?.length===10?old.start+'T00:00':old.start||'',end:old.end?.length===10?old.end+'T23:59':old.end||'',rules:old.rules?.length?old.rules.map(r=>({quantity:String(r.quantity),mode:r.mode,value:String(r.value)})):jointDefaultRules(),legacyRuleNotice:!old.rules?.length,products:jointRestoreCourses(old.jointProducts),participants:(old.participants||[]).filter(p=>jointParticipantTypes.includes(p)),stackCoupon:!!old.stackCoupon,picker:null};
 // Legacy group-style rules must be explicitly replaced, never reinterpreted as total reductions.
 jointRefreshSelected();jointFormBase.edit(type,index);
};
function jointOpenPicker(){if(!jointAllowed())return;if(jointDate(jointDraft().start)===null){toast('请先填写活动开始时间');return}jointDraft().picker={keys:jointDraft().products.map(p=>p.key),search:'',subject:'',page:1,detail:null};mallRender()}
function jointPickerCourses(){return jointProducts().filter(jointEligible)}
function jointPickerRows(){const p=jointDraft().picker,query=p?.search.trim().toLowerCase()||'';return jointPickerCourses().filter(c=>(!query||c.name.toLowerCase().includes(query))&&(!p?.subject||c.subject===p.subject))}
function jointPickerPageRows(){const p=jointDraft().picker,rows=jointPickerRows();p.page=Math.max(1,Math.min(p.page,Math.ceil(rows.length/10)||1));return rows.slice((p.page-1)*10,p.page*10)}
function jointPickerResults(){
 const d=jointDraft(),rows=jointPickerPageRows(),all=rows.filter(jointEligible),checked=all.length&&all.every(p=>d.picker.keys.includes(p.key));
 return aTable(['<label class="joint-course-check"><input type="checkbox" aria-label="选择本页全部课程" '+(checked?'checked':'')+' onchange="jointPickerSelectPage(this.checked)">课程名称</label>','可参与 / 全部班级','开课时间','结课时间','授课方式','主讲','辅导','学科','课程费','已购 / 预招人数','操作'],rows.map(p=>{
 const enabled=jointEligible(p),key=esc(JSON.stringify(p.key));
 return '<tr><td><label class="joint-course-check"><input type="checkbox" aria-label="选择'+esc(p.name)+'及全部可参与班级" '+(d.picker.keys.includes(p.key)?'checked':'')+' '+(!enabled&&!d.picker.keys.includes(p.key)?'disabled':'')+' onchange="jointPickerSelect('+key+',this.checked)"><span>'+esc(p.name)+'</span></label>'+(!enabled?'<small class="joint-error">'+esc(jointSelectionError(p))+'</small>':'')+'</td><td>'+p.classes.filter(jointClassEligible).length+' / '+p.classes.length+'</td><td>'+esc(jointTime(p.start))+'</td><td>'+esc(jointTime(p.end))+'</td><td>'+esc(p.format||'—')+'</td><td>'+esc(p.teacher||'—')+'</td><td>'+esc(p.academicTeacher||'—')+'</td><td>'+esc(p.subject||'—')+'</td><td>'+jointMoney(p.price)+'</td><td>'+esc(p.students??'—')+' / '+esc(p.capacity??'—')+'</td><td><button class="joint-text-button" onclick="jointPickerDetail('+key+')">详情</button></td></tr>';
 }))+(!rows.length?'<div class="joint-empty">暂无符合条件的课程</div>':'')+jointPickerPagination();
}
function jointPickerPagination(){const p=jointDraft().picker,total=jointPickerRows().length,pages=Math.ceil(total/10)||1;return '<div class="joint-pagination"><span>共 '+total+' 门课程</span><button class="btn small" '+(p.page===1?'disabled':'')+' onclick="jointPickerPageChange(-1)">上一页</button><span>'+p.page+' / '+pages+'</span><button class="btn small" '+(p.page===pages?'disabled':'')+' onclick="jointPickerPageChange(1)">下一页</button></div>'}
function jointPickerDetails(){
 const p=jointProducts().find(c=>c.key===jointDraft().picker.detail);if(!p)return '<div class="joint-empty">课程已下架</div>';
 const selected=jointDraft().picker.keys.includes(p.key),eligible=p.classes.filter(jointClassEligible).length;
 return '<div class="joint-detail-heading"><button class="btn small" onclick="jointPickerDetail(null)">← 返回课程列表</button><strong>'+esc(p.name)+' · 全部 '+p.classes.length+' 个班级 · 可参与 '+eligible+' 个</strong></div><p class="help">参与班级随课程勾选；不符合条件的班级不会被选中。</p>'+aTable(['参与','班级名称','标签','主讲','辅导','开课时间','结课时间','已购 / 预招人数','参与条件'],p.classes.map(c=>'<tr class="'+(jointClassEligible(c)?'':'joint-ineligible')+'"><td><input type="checkbox" disabled aria-label="'+esc(c.name)+'参与状态" '+(selected&&jointClassEligible(c)?'checked':'')+'></td><td>'+esc(c.name)+'</td><td>'+esc(c.tags.join(' / '))+'</td><td>'+esc(c.teacher||'—')+'</td><td>'+esc(c.academicTeacher||'—')+'</td><td>'+esc(jointTime(c.start))+'</td><td>'+esc(jointTime(c.end))+'</td><td>'+esc(c.students??'—')+' / '+esc(c.capacity??'—')+'</td><td>'+esc(jointClassReason(c))+'</td></tr>'));
}
function jointPickerPage(){
 const d=jointDraft(),p=d.picker;
 return '<div class="modal-backdrop"><div class="modal joint-picker" role="dialog" aria-modal="true" aria-label="选择课程"><div class="modal-head"><h2>选择课程</h2><button class="btn small" aria-label="关闭选择课程" onclick="jointClosePicker()">✕</button></div><div class="joint-picker-layout"><aside>课程（已选 <span id="joint-picker-side-count">'+p.keys.length+'</span> 门）</aside><main><p class="notice">活动开始时，只要班级仍有未开课课节即可参与。课程下至少有一个符合条件的班级即可选择；勾选课程仅纳入所有可参与班级。</p>'+(p.detail?jointPickerDetails():'<div class="joint-picker-filters"><input class="input" aria-label="搜索课程名称" placeholder="课程名称" value="'+esc(p.search)+'" oninput="jointPickerSearch(this.value)"><select class="select" aria-label="筛选学科" onchange="jointPickerSubject(this.value)"><option value="">全部学科</option>'+[...new Set(jointPickerCourses().map(c=>c.subject).filter(Boolean))].map(s=>'<option value="'+esc(s)+'" '+(s===p.subject?'selected':'')+'>'+esc(s)+'</option>').join('')+'</select><button class="btn small" onclick="jointPickerReset()">清除筛选条件</button></div><div id="joint-picker-results">'+jointPickerResults()+'</div>')+'</main></div><div class="modal-actions joint-picker-footer"><span id="joint-picker-count">已选 '+p.keys.length+' / 20 门课程</span><button class="btn" onclick="jointClosePicker()">取消</button><button class="btn primary" onclick="jointConfirmPicker()">确认</button></div></div></div>';
}
function jointPickerSearch(value){if(!jointAllowed()||!jointDraft().picker)return;const p=jointDraft().picker;p.search=value;p.page=1;$('#joint-picker-results').innerHTML=jointPickerResults()}
function jointPickerSubject(value){if(!jointAllowed()||!jointDraft().picker)return;const p=jointDraft().picker;p.subject=value;p.page=1;$('#joint-picker-results').innerHTML=jointPickerResults()}
function jointPickerReset(){if(!jointAllowed()||!jointDraft().picker)return;Object.assign(jointDraft().picker,{search:'',subject:'',page:1});mallRender()}
function jointPickerPageChange(delta){if(!jointAllowed()||!jointDraft().picker||![-1,1].includes(delta))return;jointDraft().picker.page+=delta;$('#joint-picker-results').innerHTML=jointPickerResults()}
function jointPickerDetail(key){if(!jointAllowed()||!jointDraft().picker)return;if(key!==null&&!jointProducts().some(c=>c.key===key))return;jointDraft().picker.detail=key;mallRender()}
function jointPickerUpdate(){const p=jointDraft().picker;$('#joint-picker-count').textContent='已选 '+p.keys.length+' / 20 门课程';$('#joint-picker-side-count').textContent=p.keys.length;$('#joint-picker-results').innerHTML=jointPickerResults()}
function jointPickerSelect(key,on){if(!jointAllowed()||!jointDraft().picker)return;const d=jointDraft(),course=jointProducts().find(p=>p.key===key);if(on&&(!course||!jointEligible(course)))return;if(on&&!d.picker.keys.includes(key)&&d.picker.keys.length>=20){toast('最多选择20门课程');jointPickerUpdate();return}d.picker.keys=on?[...new Set([...d.picker.keys,key])]:d.picker.keys.filter(k=>k!==key);jointPickerUpdate()}
function jointPickerSelectPage(on){if(!jointAllowed()||!jointDraft().picker)return;const p=jointDraft().picker,rows=jointPickerPageRows(),keys=rows.filter(jointEligible).map(c=>c.key),next=on?[...new Set([...p.keys,...keys])]:p.keys.filter(key=>!rows.some(c=>c.key===key));if(next.length>20){toast('最多选择20门课程，请减少选择');jointPickerUpdate();return}p.keys=next;jointPickerUpdate()}
function jointClosePicker(){jointDraft().picker=null;mallRender()}
function jointConfirmPicker(){if(!jointAllowed()||!jointDraft().picker)return;const d=jointDraft(),courses=jointProducts(),chosen=d.picker.keys.map(key=>courses.find(p=>p.key===key));if(chosen.length>20||chosen.some(p=>!p||!jointEligible(p))){toast('部分课程已不可选，请调整选择');return}d.products=chosen.map(p=>({...jointParticipatingCourse(p),jointPrice:d.products.find(old=>old.key===p.key)?.jointPrice??''}));d.picker=null;mallRender()}
function jointValidate(){
 const d=jointDraft();if(!d.name.trim()||Array.from(d.name.trim()).length>20)return '请填写20字以内的活动名称';
 const start=jointDate(d.start),end=jointDate(d.end);if(start===null||end===null||start>=end)return '请填写有效的活动时间，结束时间须晚于开始时间';
 const ruleError=jointValidateRules();if(ruleError)return ruleError;
 if(!d.participants.length||d.participants.some(p=>!jointParticipantTypes.includes(p)))return '请至少选择一种有效的参与用户类型';
 if(!d.products.length||d.products.length>20||new Set(d.products.map(p=>p.key)).size!==d.products.length)return '请选择1～20门不同的课程';
 const available=jointProducts();for(const p of d.products){const live=available.find(x=>x.key===p.key);if(!live||!jointEligible(live))return '所选课程须至少有一个在活动开始时仍有未开课课节的班级'}
 return '';
}
mallNext=function(){if(mallState.formType!=='joint')return jointFormBase.next();if(!jointAllowed())return;const error=jointValidate();if(error){toast(error);return}jointRefreshSelected();mallState.formStep=2;mallRender()};
function jointPrevious(){if(!jointAllowed())return;mallState.formStep=1;mallRender()}
mallSave=function(){
 if(mallState.formType!=='joint')return jointFormBase.save();if(!jointAllowed()||mallState.formStep!==2)return;
 const d=jointDraft(),error=jointValidate();if(error){toast(error);return}if(!d.participants.length){toast('请至少选择一种参与用户类型');return}
 const available=jointProducts(),old=mallState.editIndex==null?null:mallState.activities.joint[mallState.editIndex];
 const rules=jointRules().map(r=>({quantity:Number(r.quantity),mode:r.mode,value:Number(r.value)}));
 const products=d.products.map(p=>jointParticipatingCourse(available.find(x=>x.key===p.key)));
 const entry={...old,name:d.name.trim(),start:d.start,end:d.end,status:old?.status||'未开始',products:products.map(p=>p.name),jointProducts:products,rules,discount:rules.map(jointRuleDescription).join(' / '),participants:[...d.participants],stackCoupon:!!d.stackCoupon};
 for(const key of ['validHours','people','tiers','limit','virtualJoint'])delete entry[key];
 if(mallState.editIndex==null)mallState.activities.joint.unshift(entry);else mallState.activities.joint[mallState.editIndex]=entry;
 mallState.jointDraft=null;mallNav('mallJoint');toast('联报活动已保存（原型演示）');
};

const jointBaseActivityPage=mallActivityPage;
mallActivityPage=function(type){return type==='joint'?jointBaseActivityPage(type).replace('活动商品数','活动课程数'):jointBaseActivityPage(type)};
