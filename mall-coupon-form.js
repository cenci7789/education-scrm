// Coupon configuration is independent of group and joint enrollment activities.
const couponBase={form:mallFormPage,new:mallNew,edit:mallEdit,save:mallSave,list:mallActivityPage};
const couponUserTypes=['在读学员','潜在学员','历史学员'],couponChannels=['网校','APP','管理平台'];
const couponListState={kind:'',search:''};
function couponIsInvitation(){return state.page==='mallInvite'||(state.page==='mallForm'&&mallState.formType==='invite')}
function couponPermission(page=couponIsInvitation()?'mallInvite':'mallCoupon'){return typeof permissionCanVisit!=='function'||permissionCanVisit(page)}
function couponAllowed(){return couponPermission()&&state.page==='mallForm'&&['coupon','invite'].includes(mallState.formType)}
function couponCollection(){return mallState.activities[couponIsInvitation()?'invite':'coupon']}
function couponCurrentUsers(){return couponIsInvitation()&&couponDraft().purpose==='new'?['潜在学员','历史学员']:couponUserTypes}
function couponDefaults(kind='reduction'){return {kind,name:'',thresholdMode:'minimum',threshold:'',minimumValue:'',unconditionalValue:'',capEnabled:false,cap:'',total:'',scope:'specific',courseRestriction:'any',courses:[],timeMode:'fixed',start:'',end:'',days:'7',claimMode:'unlimited',perUser:'',users:[],stackCoupon:false,disallowShare:false,channels:[],description:'',picker:null,error:''}}
function couponDraft(){return couponIsInvitation()?(mallState.inviteDraft??=invitationDefaults()):(mallState.couponDraft??=couponDefaults())}
function couponMoney(value){return '¥'+Number(value).toFixed(2)}
function couponCents(value){const text=String(value??'').trim();if(!/^\d+(\.\d{1,2})?$/.test(text))return null;const [whole,fraction='']=text.split('.'),n=Number(whole)*100+Number(fraction.padEnd(2,'0'));return Number.isSafeInteger(n)?n:null}
function couponKindLabel(kind){return kind==='discount'?'满折优惠券':'满减优惠券'}
function couponNormalize(old){
 const d=couponDefaults(old.couponType||(/折/.test(old.kind)?'discount':'reduction'));
 if(old.config){Object.assign(d,JSON.parse(JSON.stringify(old.config)));d.kind=old.couponType||d.kind}
 else{
  const threshold=String(old.offer||'').match(/满([\d.]+)/),value=String(old.offer||'').match(/(?:减|打)([\d.]+)/);
  Object.assign(d,{name:old.name||'',thresholdMode:threshold?'minimum':'none',threshold:threshold?.[1]||'',minimumValue:value?.[1]||'',unconditionalValue:value?.[1]||'',total:String(old.total??''),start:old.start?.length===10?old.start+'T00:00':old.start||'',end:old.end?.length===10?old.end+'T23:59':old.end||''});
 }
 couponSpecifyCourses(d);d.picker=null;d.error='';return d;
}
function couponOffer(d){const value=d.thresholdMode==='minimum'?d.minimumValue:d.unconditionalValue;return (d.thresholdMode==='minimum'?'满'+d.threshold+'元':'无门槛')+(d.kind==='discount'?'，打'+value+'折':'，减'+value+'元')+(d.kind==='discount'&&d.capEnabled?'（最多优惠'+d.cap+'元）':'')}
function couponDiscountAmount(total,d){
 const cents=couponCents(total),threshold=d.thresholdMode==='minimum'?couponCents(d.threshold):0,value=couponCents(d.thresholdMode==='minimum'?d.minimumValue:d.unconditionalValue);
 if(cents===null||threshold===null||value===null||value<=0)return null;if(cents<threshold)return 0;
 let reduction;if(d.kind==='reduction')reduction=value;else if(d.kind==='discount'&&value<=1000)reduction=cents-Math.round(cents*value/1000);else return null;
 if(d.kind==='discount'&&d.capEnabled){const cap=couponCents(d.cap);if(cap===null||cap<=0)return null;reduction=Math.min(reduction,cap)}
 return Math.min(cents,reduction)/100;
}
function couponValidity(d,claimedAt){if(d.timeMode==='fixed')return {start:d.start,end:d.end};const start=new Date(claimedAt),days=Number(d.days);if(!Number.isFinite(start.getTime())||!Number.isSafeInteger(days)||days<1)return null;return {start:start.toISOString(),end:new Date(start.getTime()+days*86400000).toISOString()}}
function couponSet(key,value){
 if(!couponAllowed())return;
 const enums={kind:['reduction','discount'],purpose:['new','returning'],thresholdMode:['minimum','none'],scope:['specific'],courseRestriction:['any'],timeMode:['fixed','relative'],claimMode:['unlimited','limited']};
 const booleans=['capEnabled','stackCoupon','disallowShare'],texts=['name','threshold','minimumValue','unconditionalValue','cap','total','start','end','days','perUser','description'];
 if(enums[key]&&!enums[key].includes(value))return;if(!enums[key]&&!booleans.includes(key)&&!texts.includes(key))return;
 const d=couponDraft();if(couponIsInvitation()&&['kind','timeMode','claimMode','perUser','disallowShare'].includes(key))return;if(!couponIsInvitation()&&key==='purpose')return;
 if(key==='purpose'){if(['邀请有礼-新生领券','邀请有礼-老生返券'].includes(d.name))d.name=value==='new'?'邀请有礼-新生领券':'邀请有礼-老生返券';if(value==='new')d.users=d.users.filter(x=>x!=='在读学员')}
 d[key]=booleans.includes(key)?!!value:value;d.error='';
 if(key==='kind'){d.minimumValue='';d.unconditionalValue=''}
 if(enums[key]||key==='capEnabled')mallRender();
 if(key==='name'||key==='description'){const counter=document.getElementById('coupon-'+key+'-count');if(counter)counter.textContent=Array.from(value).length+'/'+(key==='name'?15:500)}
}
function couponToggle(key,name,on){if(!couponAllowed()||(couponIsInvitation()&&key==='channels'))return;const options=key==='users'?couponCurrentUsers():key==='channels'?couponChannels:null;if(!options||!options.includes(name))return;const d=couponDraft();d[key]=on?[...new Set([...d[key],name])]:d[key].filter(x=>x!==name);$('#coupon-'+key).innerHTML=couponChecks(key,options)}
function couponToggleAll(key,on){if(!couponAllowed()||!['users','channels'].includes(key)||(couponIsInvitation()&&key==='channels'))return;couponDraft()[key]=on?[...(key==='users'?couponCurrentUsers():couponChannels)]:[];$('#coupon-'+key).innerHTML=couponChecks(key,key==='users'?couponCurrentUsers():couponChannels)}
function couponChecks(key,options){const selected=couponDraft()[key];return `<label><input type="checkbox" ${options.every(x=>selected.includes(x))?'checked':''} onchange="couponToggleAll('${key}',this.checked)"> 全选</label>${options.map(name=>`<label><input type="checkbox" ${selected.includes(name)?'checked':''} onchange="couponToggle('${key}','${name}',this.checked)"> ${name}</label>`).join('')}`}
function couponRow(label,content,required=false){return `<div class="coupon-row"><div class="coupon-label ${required?'required':''}">${label}</div><div class="coupon-control">${content}</div></div>`}
function couponInput(key,placeholder='输入金额',disabled=false,extra=''){const integer=['total','days','perUser'].includes(key);return `<input class="input coupon-number" type="number" min="${integer?1:0.01}" step="${integer?1:0.01}" aria-label="${placeholder}" placeholder="${placeholder}" value="${esc(couponDraft()[key])}" ${disabled?'disabled':''} ${extra.replace(/(?:min|step)="[^"]*"/g,'')} oninput="couponSet('${key}',this.value)">`}
function couponRadio(key,value,label){return `<label><input type="radio" name="coupon-${key}" ${couponDraft()[key]===value?'checked':''} onchange="couponSet('${key}','${value}')"> ${label}</label>`}
function couponForm(){
 const d=couponDraft(),discount=d.kind==='discount',verb=discount?'打':'减',unit=discount?'折':'元',valueLabel=discount?'输入折扣':'输入优惠金额';
 return heading((mallState.editIndex==null?'新建':'编辑')+couponKindLabel(d.kind),'设置优惠内容、适用范围与领取规则')+`<section class="mall-coupon-form"><div class="card pad"><div class="mall-tabs">${['reduction','discount'].map(kind=>`<button class="${d.kind===kind?'active':''}" onclick="couponSet('kind','${kind}')">${couponKindLabel(kind)}</button>`).join('')}</div>`+
 couponRow('优惠券名称',`<div class="coupon-inline"><div class="coupon-name"><input class="input" aria-label="优惠券名称" maxlength="15" placeholder="请输入" value="${esc(d.name)}" oninput="couponSet('name',this.value)"><span id="coupon-name-count">${Array.from(d.name).length}/15</span></div><span class="muted">优惠券名称会对用户可见</span></div>`,true)+
 couponRow('优惠内容',`<div class="coupon-options"><div class="coupon-inline">${couponRadio('thresholdMode','minimum','满')}${couponInput('threshold','输入门槛金额',d.thresholdMode!=='minimum')}<span>元，${verb}</span>${couponInput('minimumValue',valueLabel,d.thresholdMode!=='minimum',discount?'max="10"':'')}<span>${unit}</span></div><div class="coupon-inline">${couponRadio('thresholdMode','none','无门槛使用，'+verb)}${couponInput('unconditionalValue',valueLabel,d.thresholdMode!=='none',discount?'max="10"':'')}<span>${unit}</span></div></div>`,true)+
 (discount?couponRow('优惠上限',`<div class="coupon-inline"><label><input type="checkbox" ${d.capEnabled?'checked':''} onchange="couponSet('capEnabled',this.checked)"> 最多优惠</label>${couponInput('cap','输入优惠上限',!d.capEnabled)}<span>元</span></div>`):'')+
 couponRow('发行量',`<div class="coupon-inline">${couponInput('total','输入发行量',false,'min="1" step="1"')}<span>张</span></div>`,true)+
 couponRow('适用课程',couponCourseSelection(d),true)+
 couponRow('使用时间',`<div class="coupon-options"><div class="coupon-inline">${couponRadio('timeMode','fixed','固定时间')}<input class="input coupon-datetime" type="datetime-local" aria-label="使用开始时间" value="${esc(d.start)}" ${d.timeMode!=='fixed'?'disabled':''} onchange="couponSet('start',this.value)"><span>—</span><input class="input coupon-datetime" type="datetime-local" aria-label="使用结束时间" value="${esc(d.end)}" ${d.timeMode!=='fixed'?'disabled':''} onchange="couponSet('end',this.value)"></div><div class="coupon-inline">${couponRadio('timeMode','relative','自领取后')}${couponInput('days','有效天数',d.timeMode!=='relative','min="1" step="1"')}<span>天内可用</span></div></div>`,true)+
 `</div><div class="card pad"><div class="mall-form-section">领取和使用</div>`+
 couponRow('领取次数限制',`<div class="coupon-inline">${couponRadio('claimMode','unlimited','每人领取次数不限')}${couponRadio('claimMode','limited','每人最多领取')}${couponInput('perUser','领取张数',d.claimMode!=='limited','min="1" step="1"')}<span>张</span></div>`,true)+
 couponRow('领取用户限制',`<div class="coupon-checks" id="coupon-users">${couponChecks('users',couponUserTypes)}</div>`,true)+
 (!discount?couponRow('优惠券叠加',`<label><input type="checkbox" ${d.stackCoupon?'checked':''} onchange="couponSet('stackCoupon',this.checked)"> 允许和其他优惠券一起叠加</label>`):'')+
 couponRow('分享设置',`<label><input type="checkbox" ${d.disallowShare?'checked':''} onchange="couponSet('disallowShare',this.checked)"> 不允许用户分享给好友</label>`)+
 couponRow('适用渠道',`<div class="coupon-checks" id="coupon-channels">${couponChecks('channels',couponChannels)}</div>`,true)+
 couponRow('使用说明',`<div class="coupon-description"><textarea class="textarea" aria-label="使用说明" maxlength="500" placeholder="请输入…" oninput="couponSet('description',this.value)">${esc(d.description)}</textarea><span id="coupon-description-count">${Array.from(d.description).length}/500</span></div>`)+
 `<p class="coupon-error" role="alert">${esc(d.error)}</p><div class="coupon-footer"><button class="btn" onclick="mallNav('mallCoupon')">取消</button><button class="btn primary" onclick="mallSave()">保存</button></div></div>${d.picker?couponPicker():''}</section>`;
}
function couponCourses(){return mallCourses().filter(c=>c.active!==false&&mallState.shelved.includes(c.index))}
function couponOpenPicker(){if(!couponAllowed())return;couponDraft().picker={selected:JSON.parse(JSON.stringify(couponDraft().courses)),search:''};mallRender()}
function couponPickerRows(){const p=couponDraft().picker;return couponCourses().filter(c=>c.name.toLowerCase().includes(p.search.trim().toLowerCase()))}
function couponPickerTable(){const p=couponDraft().picker,rows=couponPickerRows();return aTable(['<input type="checkbox" aria-label="选择当前筛选的全部课程" '+(rows.length&&rows.every(c=>p.selected.some(x=>x.index===c.index&&x.name===c.name))?'checked':'')+' onchange="couponPickAll(this.checked)">','课程名称','学科','课程费'],rows.map(c=>`<tr><td><input type="checkbox" aria-label="选择${esc(c.name)}" ${p.selected.some(x=>x.index===c.index&&x.name===c.name)?'checked':''} onchange="couponPick(${c.index},this.checked)"></td><td>${esc(c.name)}</td><td>${esc(c.subject||'—')}</td><td>${couponMoney(c.fee)}</td></tr>`))+(!rows.length?'<div class="empty">暂无可选课程</div>':'')}
function couponPicker(){const p=couponDraft().picker;return `<div class="modal-backdrop"><div class="modal coupon-picker" role="dialog" aria-modal="true" aria-label="选择课程"><div class="modal-head"><h2>选择课程</h2><button class="btn small" onclick="couponClosePicker()">✕</button></div><input class="input" placeholder="搜索课程名称" aria-label="搜索课程名称" value="${esc(p.search)}" oninput="couponSearchCourses(this.value)"><div id="coupon-picker-table">${couponPickerTable()}</div><div class="modal-actions"><span id="coupon-picker-count">已选 ${p.selected.length} 门课程</span><button class="btn" onclick="couponClosePicker()">取消</button><button class="btn primary" onclick="couponConfirmPicker()">确认</button></div></div></div>`}
function couponSearchCourses(value){if(!couponAllowed()||!couponDraft().picker)return;couponDraft().picker.search=value;$('#coupon-picker-table').innerHTML=couponPickerTable()}
function couponPick(index,on){if(!couponAllowed()||!couponDraft().picker)return;const p=couponDraft().picker,c=couponCourses().find(c=>c.index===index);if(!c)return;p.selected=p.selected.filter(x=>x.index!==index);if(on)p.selected.push({index:c.index,name:c.name});couponPickerUpdate()}
function couponPickAll(on){if(!couponAllowed()||!couponDraft().picker)return;const p=couponDraft().picker,rows=couponPickerRows();p.selected=p.selected.filter(c=>!rows.some(r=>r.index===c.index));if(on)p.selected.push(...rows.map(c=>({index:c.index,name:c.name})));couponPickerUpdate()}
function couponPickerUpdate(){$('#coupon-picker-table').innerHTML=couponPickerTable();$('#coupon-picker-count').textContent='已选 '+couponDraft().picker.selected.length+' 门课程'}
function couponClosePicker(){if(!couponAllowed())return;couponDraft().picker=null;mallRender()}
function couponConfirmPicker(){if(!couponAllowed()||!couponDraft().picker)return;const d=couponDraft(),live=couponCourses();if(d.picker.selected.some(c=>!live.some(x=>x.index===c.index&&x.name===c.name))){toast('部分课程已下架或变更，请重新选择');return}d.courses=d.picker.selected;d.picker=null;mallRender()}
function couponRemoveCourse(index){if(!couponAllowed()||!Number.isInteger(index))return;couponDraft().courses.splice(index,1);mallRender()}
function couponValidate(){
 const d=couponDraft(),positiveInt=value=>/^\d+$/.test(String(value))&&Number.isSafeInteger(Number(value))&&Number(value)>0;
 if(!d.name.trim()||Array.from(d.name.trim()).length>15)return '请填写15字以内的优惠券名称';
 if(!['reduction','discount'].includes(d.kind)||!['minimum','none'].includes(d.thresholdMode))return '请选择有效的优惠券类型和使用门槛';
 const threshold=couponCents(d.threshold),value=couponCents(d.thresholdMode==='minimum'?d.minimumValue:d.unconditionalValue);
 if(d.thresholdMode==='minimum'&&(threshold===null||threshold<=0))return '请填写大于0的门槛金额，最多两位小数';
 if(value===null||value<=0)return '请填写大于0的优惠金额或折扣，最多两位小数';
 if(d.kind==='discount'&&value>1000)return '折扣须大于0且不超过10折';
 if(d.kind==='reduction'&&d.thresholdMode==='minimum'&&value>threshold)return '减免金额不能超过门槛金额';
 if(d.kind==='discount'&&d.capEnabled&&(couponCents(d.cap)===null||couponCents(d.cap)<=0))return '请填写有效的最多优惠金额';
 if(!positiveInt(d.total))return '发行量须为正整数';
 const old=mallState.editIndex==null?null:couponCollection()[mallState.editIndex];if(old&&Number(d.total)<Number(old.claimed||0))return '发行量不能少于已领取数量';
 if(d.scope!=='specific'||d.courseRestriction!=='any')return '请选择有效的适用课程范围';
 if(d.scope==='specific'){const live=couponCourses();if(!d.courses.length)return '请选择适用课程';if(d.courses.some(c=>!live.some(x=>x.index===c.index&&x.name===c.name)))return '所选课程已下架或变更，请重新选择'}
 if(d.timeMode==='fixed'){const start=new Date(d.start).getTime(),end=new Date(d.end).getTime();if(!d.start||!d.end||!Number.isFinite(start)||!Number.isFinite(end)||start>=end)return '请填写有效的使用时间，结束时间须晚于开始时间'}else if(d.timeMode!=='relative'||!positiveInt(d.days)||Number(d.days)>100000)return '请填写有效的领取后可用天数';
 if(!['unlimited','limited'].includes(d.claimMode)||(d.claimMode==='limited'&&!positiveInt(d.perUser)))return '每人领取上限须为正整数';
 if(!d.users.length||d.users.some(x=>!couponCurrentUsers().includes(x)))return '请至少选择一种领取用户类型';
 if(!d.channels.length||d.channels.some(x=>!couponChannels.includes(x)))return '请至少选择一个适用渠道';
 if(couponIsInvitation()&&(!['new','returning'].includes(d.purpose)||d.kind!=='reduction'||d.timeMode!=='relative'||d.claimMode!=='limited'||Number(d.perUser)!==1||!couponChannels.every(x=>d.channels.includes(x))))return '邀请有礼须使用领取后有效期、每人限领1张和全部使用渠道';
 if(Array.from(d.description).length>500)return '使用说明不能超过500字';return '';
}
function couponNew(kind){if(!couponPermission()||!['reduction','discount'].includes(kind))return;mallNew('coupon');couponDraft().kind=kind;mallRender()}
mallNew=function(type){if(!['coupon','invite'].includes(type))return couponBase.new(type);if(!couponPermission(type==='invite'?'mallInvite':'mallCoupon'))return;if(type==='invite')mallState.inviteDraft=invitationDefaults();else mallState.couponDraft=couponDefaults();return couponBase.new(type)};
mallEdit=function(type,index){if(!['coupon','invite'].includes(type))return couponBase.edit(type,index);if(!couponPermission(type==='invite'?'mallInvite':'mallCoupon')||!mallState.activities[type][index])return;mallState[type==='invite'?'inviteDraft':'couponDraft']=couponNormalize(mallState.activities[type][index]);return couponBase.edit(type,index)};
mallFormPage=function(){return mallState.formType==='invite'?invitationForm():mallState.formType==='coupon'?couponForm():couponBase.form()};
mallSave=function(){
 if(!['coupon','invite'].includes(mallState.formType))return couponBase.save();if(!couponAllowed())return;
 const d=couponDraft(),error=couponValidate();if(error){d.error=error;mallRender();toast(error);return}
 const invite=couponIsInvitation(),items=couponCollection(),old=mallState.editIndex==null?null:items[mallState.editIndex];
 const config=JSON.parse(JSON.stringify(d));delete config.error;delete config.picker;
 config.name=config.name.trim();if(config.thresholdMode==='none'){config.threshold='';config.minimumValue=''}else config.unconditionalValue='';
 if(config.kind!=='discount'){config.capEnabled=false;config.cap=''}else config.stackCoupon=false;
 if(!config.capEnabled)config.cap='';config.scope='specific';config.courseRestriction='any';
 if(config.timeMode==='relative'){config.start='';config.end=''}else config.days='';if(config.claimMode==='unlimited')config.perUser='';
 const entry={...old,name:config.name,couponType:config.kind,kind:couponKindLabel(config.kind),offer:couponOffer(config),config,total:Number(config.total),claimed:old?.claimed||0,used:old?.used||0,start:config.start,end:config.end,status:old?.status||'未开始'};
 if(mallState.editIndex==null)items.unshift(entry);else items[mallState.editIndex]=entry;
 mallState[invite?'inviteDraft':'couponDraft']=null;mallNav(invite?'mallInvite':'mallCoupon');toast((invite?'邀请有礼':'优惠券')+'已保存（原型演示）');
};
function couponScopeLabel(d){return couponSpecifyCourses(d).courses.map(c=>c.name).join('、')||'待选择课程'}
function couponListFilter(key,value){if(!couponPermission()||state.page!=='mallCoupon'||!['kind','search'].includes(key))return;couponListState[key]=value;if(key==='search')$('#coupon-list-results').innerHTML=couponListTable();else mallRender()}
function couponListTable(){const rows=mallState.activities.coupon.map((item,index)=>({item,index,d:couponNormalize(item)})).filter(({item,d})=>(!couponListState.kind||d.kind===couponListState.kind)&&item.name.toLowerCase().includes(couponListState.search.trim().toLowerCase()));return aTable(['优惠券名称','券类型','优惠内容','适用课程','使用时间','状态','已领取 / 总量','已使用','操作'],rows.map(({item,index,d})=>`<tr><td>${esc(item.name)}</td><td>${couponKindLabel(d.kind)}</td><td>${esc(couponOffer(d))}</td><td>${esc(couponScopeLabel(d))}</td><td>${esc(d.timeMode==='relative'?'自领取后'+d.days+'天内可用':d.start.replace('T',' ')+' 至 '+d.end.replace('T',' '))}</td><td>${mallStatus(item.status)}</td><td>${item.claimed||0} / ${item.total}</td><td>${item.used||0}</td><td><div class="mall-actions"><button onclick="mallEdit('coupon',${index})">编辑</button><button onclick="couponEnd(${index})">结束</button></div></td></tr>`))+(!rows.length?'<div class="empty">暂无优惠券</div>':'')+`<div class="data-bar">共 ${rows.length} 张优惠券</div>`}
function couponEnd(index){if(!couponPermission()||state.page!=='mallCoupon'||!mallState.activities.coupon[index])return;mallEnd('coupon',index)}
mallActivityPage=function(type){if(type!=='coupon')return couponBase.list(type);return heading('优惠券','满减优惠券与满折优惠券')+mallStats(mallState.activities.coupon)+`<div class="card pad"><div class="mall-tabs">${[['','全部'],['reduction','满减优惠券'],['discount','满折优惠券']].map(([kind,label])=>`<button class="${couponListState.kind===kind?'active':''}" onclick="couponListFilter('kind','${kind}')">${label}</button>`).join('')}</div><div class="toolbar"><input class="input" style="max-width:240px" placeholder="搜索优惠券名称" value="${esc(couponListState.search)}" oninput="couponListFilter('search',this.value)"><div class="toolbar-right"><button class="btn" onclick="couponNew('reduction')">＋ 满减优惠券</button><button class="btn primary" onclick="couponNew('discount')">＋ 满折优惠券</button></div></div><div id="coupon-list-results">${couponListTable()}</div></div>`};

// Convert legacy automatic scopes once to an explicit course snapshot without broadening them.
function couponSpecifyCourses(d){if(d.scope==='all'){d.courses=a.courses.map((c,index)=>({...c,index})).filter(c=>d.courseRestriction!=='long'||c.type==='长期班').map(c=>({index:c.index,name:c.name,courseId:c.id}));d.scope='specific'}d.courseRestriction='any';return d}
function couponCourseSelection(d){return `<div class="coupon-selected"><button class="btn small" onclick="couponOpenPicker()">＋ 选择课程</button><span class="muted">已选 ${d.courses.length} 门</span>${d.courses.map((c,i)=>`<span class="coupon-course-chip">${esc(c.name)}<button aria-label="移除${esc(c.name)}" onclick="couponRemoveCourse(${i})">×</button></span>`).join('')}</div>`}
