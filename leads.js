// 线索模块：与教务原型共享页面外壳及视觉样式，数据仅供演示。
const leadPages={leadTodo:'今日待办',myLeads:'我的线索',leadManage:'线索管理',leadDetail:'线索详情',leadForm:'线索登记'};
state.leads={mineTab:'可跟进',manageTab:'新线索',modal:null,selected:0,returnPage:'myLeads',formMode:'create',leads:[
  {name:'唐同学',guardian:'妈妈',phone:'131****6688',grade:'小三',subject:'数学',stage:'新线索',intent:'中意向',next:'未约定',source:'宣传物料扫码',campus:'城东校区',owner:'王敏',status:'mine',gender:'男',school:'城东实验小学',note:'家长希望了解数学提升课程。',history:[['建档','09-12 10:30','扫码登记，意向学科数学。']]},
  {name:'孙同学',guardian:'爸爸',phone:'187****8829',grade:'初一',subject:'数学',stage:'新分配',intent:'中意向',next:'未约定',source:'转介绍',campus:'城东校区',owner:'王敏',status:'mine',gender:'男',school:'',note:'希望周末方便沟通。',history:[['分配','今天 09:12','统一分配至王敏。']]},
  {name:'李同学',guardian:'爸爸',phone:'139****2210',grade:'高二',subject:'数学',stage:'跟进中',intent:'低意向',next:'已超时 · 08-29 20:00',source:'主动来电',campus:'城东校区',owner:'王敏',status:'mine',gender:'女',school:'',note:'预算待确认。',history:[['电话沟通','08-27 18:00','了解课程及预算，约定回访。']]},
  {name:'郑同学',guardian:'爸爸',phone:'133****7182',grade:'高二',subject:'英语',stage:'跟进中',intent:'高意向',next:'今天 19:00（试听反馈回访）',source:'活动报名',campus:'城东校区',owner:'王敏',status:'mine',gender:'女',school:'',note:'试听后需反馈。',history:[['试听完成','昨天 19:00','约定今日回访试听反馈。']]},
  {name:'张同学',guardian:'妈妈',phone:'138****6621',grade:'初二',subject:'数学',stage:'跟进中',intent:'高意向',next:'09-24 18:30',source:'地推扫码',campus:'城东校区',owner:'王敏',status:'mine',gender:'男',school:'',note:'关注秋季班名额。',history:[['企微沟通','09-18 15:20','发送秋季班资料。']]},
  {name:'王同学',guardian:'妈妈',phone:'136****3358',grade:'小五',subject:'英语',stage:'跟进中',intent:'高意向',next:'09-25 17:30',source:'活动报名',campus:'城东校区',owner:'王敏',status:'mine',gender:'男',school:'',note:'准备报名试听。',history:[['建档','09-17 11:20','活动报名。']]},
  {name:'罗同学',guardian:'爸爸',phone:'137****7711',grade:'初三',subject:'英语',stage:'新线索',intent:'中意向',next:'未约定',source:'活动报名',campus:'城东校区',owner:'未分配',status:'new',gender:'男',school:'',note:'活动表单报名。',history:[['建档','今天 08:40','活动报名自动入池。']]},
  {name:'钱同学',guardian:'妈妈',phone:'139****7788',grade:'小五',subject:'英语',stage:'新线索',intent:'中意向',next:'未约定',source:'转介绍',campus:'城东校区',owner:'未分配',status:'new',gender:'女',school:'',note:'朋友介绍。',history:[['建档','今天 08:30','转介绍登记。']]},
  {name:'何同学',guardian:'妈妈',phone:'138****1122',grade:'小四',subject:'数学',stage:'回收池',intent:'低意向',next:'未约定',source:'地推扫码',campus:'城东校区',owner:'李强',status:'recycle',gender:'女',school:'',note:'20天未有效沟通，待重新分配。',history:[['系统回收','昨天','超过20天无有效沟通。']]},
  {name:'周同学',guardian:'妈妈',phone:'150****3317',grade:'高一',subject:'化学',stage:'预警中',intent:'中意向',next:'昨天 14:00',source:'公众号',campus:'城东校区',owner:'李强',status:'warning',gender:'男',school:'',note:'跟进超时。',history:[['系统预警','今天','超过约定时间24小时。']]},
  {name:'高同学',guardian:'妈妈',phone:'136****5559',grade:'初一',subject:'数学',stage:'冷宫池',intent:'低意向',next:'已归档',source:'美团投放',campus:'城东校区',owner:'王敏',status:'cold',gender:'女',school:'',note:'已报名竞对全年班。',history:[['归档','08-26','明确拒绝：已报名竞对全年班。']]},
  {name:'赵同学',guardian:'妈妈',phone:'137****9904',grade:'小六',subject:'语文',stage:'跟进中',intent:'中意向',next:'09-27 19:00',source:'地推扫码',campus:'滨江校区',owner:'陈静',status:'assigned',gender:'男',school:'',note:'家长考虑周末试听。',history:[['电话沟通','09-19 10:10','约定下一次联系。']]}
]};
const leadState=state.leads, leadPreviousRender=render;
render=function(){if(leadPages[state.page])leadRender();else{document.querySelector('[data-nav-toggle="leads"]').classList.remove('active-parent');leadPreviousRender()}};
function leadIsRegistrationDetail(){return state.page==='leadDetail'&&leadState.returnPage==='quickRegister'}
function leadRequireFollow(){
  if(leadIsRegistrationDetail()){toast('此入口仅用于查看登记线索，请由销售岗位跟进沟通');return false}
  return true;
}
function leadNav(page){state.page=page;leadState.modal=null;render()}
function leadRender(){
  if(state.page==='leadForm'){leadRenderForm();return}
  if(leadIsRegistrationDetail()&&leadState.modal!=='form'){leadState.modal=null;leadDisposeRecord()}
  leadRefreshSchoolGrades();const p=state.page,active=p==='leadDetail'?leadState.returnPage:p;
  document.querySelectorAll('.menu-item').forEach(e=>e.classList.toggle('active',e.dataset.page===active));
  document.querySelectorAll('[data-nav-toggle]').forEach(e=>e.classList.remove('active-parent'));
  document.querySelector('[data-nav-toggle="'+(leadIsRegistrationDetail()?'shortcuts':'leads')+'"]').classList.add('active-parent');
  $('#crumb').textContent=(leadIsRegistrationDetail()?'快捷入口 / 线索登记（非招生） / ':'线索 / ')+leadPages[p];
  $('#view').innerHTML=({leadTodo:leadTodoPage,myLeads:myLeadsPage,leadManage:leadManagePage,leadDetail:leadDetailPage})[p]()+ (leadState.modal?leadModalPage():'');
  if(leadState.modal==='form'&&leadState.formMode==='edit')leadFillBasicInfo();
}
function leadNonSalesEntry(){return state.page==='quickRegister'||(state.page==='leadForm'&&leadState.formReturnPage==='quickRegister')}
function leadCampusQueueLabel(lead){return lead.ownershipCampus&&lead.status==='new'?lead.ownershipCampus+'招生组长（待分配）':lead.owner}
function leadRouteToCampus(lead,campus){
  lead.ownershipCampus=campus;lead.registrationChannel='nonSales';
  lead.assignmentQueue={campus,role:'校区招生组长'};
  leadSetOwners(lead,[]);
}
function leadOpenForm(mode='create',tab='single'){
  if(state.page==='leadForm'){leadSwitchRegistration(tab);return}
  leadDisposeRecord();
  leadState.formReturnPage=state.page;
  leadState.formMode=mode;leadState.registrationTab=tab;leadState.modal=null;
  if(mode==='edit'){leadState.modal='form';render();return}
  state.page='leadForm';render();
}
function leadCloseForm(){
  leadDisposeRecord();
  if(state.page==='leadForm')leadNav(leadState.formReturnPage||'myLeads');
  else{leadState.modal=null;leadRender()}
}
function leadRenderForm(){
  const origin=leadState.formReturnPage||'myLeads',active=origin==='leadDetail'?leadState.returnPage:origin;
  const group=active==='quickRegister'?'shortcuts':'leads';
  document.querySelectorAll('.menu-item').forEach(e=>e.classList.toggle('active',e.dataset.page===active));
  document.querySelectorAll('[data-nav-toggle]').forEach(e=>e.classList.remove('active-parent'));
  document.querySelector('[data-nav-toggle="'+group+'"]').classList.add('active-parent');
  const title=group==='shortcuts'?'线索登记（非招生）':'线索登记';
  $('#crumb').textContent=(group==='shortcuts'?'快捷入口':'线索')+' / '+title;
  $('#view').innerHTML='<button class="btn back-link" onclick="leadCloseForm()">← 返回'+esc(leadPages[origin]||'列表')+'</button>'+heading(title,group==='shortcuts'?'填写学生信息，提交至归属校区招生组长等待分配':'填写学生信息并分配负责招生人员')+
    '<div class="card pad lead-registration-page"><div class="lead-segments"><button data-registration-tab="single" onclick="leadSwitchRegistration(\'single\')">单条登记</button><button data-registration-tab="import" onclick="leadSwitchRegistration(\'import\')">批量导入</button></div><div id="lead-registration-single">'+leadFormContent(true)+'</div><div id="lead-registration-import"><p class="muted">下载 Excel 模板，按表头填写学生、家长、来源和分配信息，每行填写一名学生。</p><div class="empty"><a class="btn primary lead-import-download" href="templates/lead-import-template.xlsx" download="线索导入模板.xlsx">下载导入模板</a><p class="help">Excel（.xlsx） · 含空白填写表与字段说明</p></div><p class="help">当前可下载模板，文件上传导入功能待接入。</p><div class="form-actions"><button class="btn" onclick="leadCloseForm()">返回列表</button></div></div></div>';
  leadSwitchRegistration(leadState.registrationTab||'single');
}
function leadFillBasicInfo(){
  const lead=leadState.leads[leadState.selected];
  ['grade','source','guardian'].forEach(key=>{
    const select=$('#lead-'+key),value=key==='grade'?(leadConfiguredGrade(lead.grade)||lead.grade||''):lead[key]||'';
    if(value&&select.options&&![...select.options].some(option=>option.value===value))select.insertAdjacentHTML('beforeend',`<option value="${esc(value)}" ${key==='grade'?'disabled':''}>${esc(value)}${key==='grade'?'（历史年级）':''}</option>`);
    select.value=value;
  });
}
function leadSwitchRegistration(tab){
  if(leadState.formMode==='edit')return;
  if(tab==='import'&&leadRecordDraft?.context==='registration'&&leadRecordDraft.phase!=='idle'){leadRecordNotice('请先结束录音，再切换登记方式。');return}
  leadState.registrationTab=tab;
  $('#lead-registration-single').hidden=tab!=='single';
  $('#lead-registration-import').hidden=tab!=='import';
  document.querySelectorAll('[data-registration-tab]').forEach(button=>button.classList.toggle('active',button.dataset.registrationTab===tab));
}
function leadDetail(index,from){
  const origin=from||state.page;
  if(origin==='quickRegister'&&!shortcutOwnLead(leadState.leads[index])){toast('只能查看本人登记的线索');return}
  leadState.selected=index;leadState.returnPage=origin;leadNav('leadDetail');
}
function leadPill(value){let cls=value==='高意向'?'hot':value==='中意向'?'warm':value==='低意向'?'cold':value==='无意向'?'none':value.includes('冷')?'cold':value.includes('新')?'new':value.includes('超时')?'overdue':value.includes('分配')?'assigned':'';return `<span class="lead-pill ${cls}">${esc(value)}</span>`}
function leadPerson(l){return `<div class="lead-name">${esc(l.name)}</div><div class="lead-secondary">${esc(l.name)}${esc(l.guardian)} · ${l.phone}</div>`}
function leadSegments(items,current,fn){return `<div class="lead-segments">${items.map(([label,count])=>`<button class="${current===label?'active':''}" onclick="${fn}('${label}')">${label} <small>${count}</small></button>`).join('')}</div>`}
function leadTodoPage(){let list=leadState.leads.map((l,i)=>({...l,index:i})).filter(l=>leadHasOwner(l)&&(l.stage.includes('新')||l.next.startsWith('今天'))).sort((x,y)=>(x.stage.includes('新')?0:1)-(y.stage.includes('新')?0:1));return heading('今日待办','先处理新线索，再跟进今天约定沟通的家长')+`<div class="lead-stats"><div class="lead-stat"><span>我的线索</span><strong>${leadState.leads.filter(l=>leadHasOwner(l)&&l.status==='mine').length}</strong></div><div class="lead-stat"><span>新线索</span><strong>${list.filter(l=>l.stage.includes('新')).length}</strong></div><div class="lead-stat"><span>今日待沟通</span><strong>${list.filter(l=>l.next.startsWith('今天')).length}</strong></div></div><div class="card pad"><div class="toolbar"><h2 class="section-title" style="margin:0">待办列表</h2><button class="btn" onclick="leadNav('myLeads')">查看我的线索</button></div>${aTable(['学生 / 家长','年级 · 意向学科','阶段','下次跟进','操作'],list.map(l=>`<tr><td>${leadPerson(l)}</td><td>${l.grade} · ${l.subject}</td><td>${leadPill(l.stage)}</td><td>${esc(l.next)}</td><td><button class="btn small" onclick="leadDetail(${l.index},'leadTodo')">查看并跟进</button></td></tr>`))}</div>`}
function myLeadsPage(){let tabs=[['可跟进',leadState.leads.filter(l=>l.status==='mine'&&l.stage!=='已报名'&&l.status!=='cold').length],['已报名',leadState.leads.filter(l=>l.stage==='已报名').length],['冷宫池',leadState.leads.filter(l=>l.status==='cold'&&leadHasOwner(l)).length]];let list=leadState.leads.map((l,i)=>({...l,index:i})).filter(l=>leadState.mineTab==='可跟进'?l.status==='mine':leadState.mineTab==='已报名'?l.stage==='已报名':l.status==='cold'&&leadHasOwner(l));return heading('我的线索','查看本人负责的线索、下一次跟进时间和沟通记录')+`<div class="card pad"><div class="toolbar"><div class="toolbar-left">${leadSegments(tabs,leadState.mineTab,'setMineTab')}<input class="input" style="width:230px" placeholder="搜索姓名或电话" oninput="filterRows(this.value)"></div><div class="toolbar-right"><button class="btn" onclick="leadOpenForm('create','import')">批量导入</button><button class="btn primary" onclick="leadOpenForm()">+ 线索登记</button></div></div>${aTable(['学生 / 家长','年级','意向学科','阶段','意向度','下次跟进时间','操作'],list.map(l=>`<tr><td>${leadPerson(l)}</td><td>${l.grade}</td><td>${l.subject}</td><td>${leadPill(l.stage)}</td><td>${leadPill(leadIntentLabel(l))}</td><td>${esc(l.next)}</td><td><button class="btn small" onclick="leadDetail(${l.index},'myLeads')">详情</button></td></tr>`))}<div class="data-bar">共 ${list.length} 条线索</div><p class="help">可跟进阶段：新线索 → 新分配 → 跟进中。到期的下次跟进时间会排在前面。</p></div>`}
function setMineTab(t){leadState.trialAction=null;leadState.mineTab=t;leadRender()}
function leadManageTabs(){return [['新线索',countLead('new')],['回收池',countLead('recycle')],['预警中',countLead('warning')],['冷宫池',countLead('cold')],['已分配',leadManagePoolRows('已分配',false).length],['已报名',leadState.leads.filter(l=>l.stage==='已报名'&&leadManagementVisible(l)).length]]}
function leadManagePage(){if(leadState.manageTab==='已报名')return leadManageEnrolledPage();let tabs=leadManageTabs();let t=leadState.manageTab;let list=leadState.leads.map((l,i)=>({...l,index:i})).filter(leadManagementVisible).filter(l=>t==='新线索'?l.status==='new':t==='回收池'?l.status==='recycle':t==='预警中'?l.status==='warning':t==='冷宫池'?l.status==='cold':!!leadAssignedCategory(l)).filter(l=>!['冷宫池','已分配'].includes(t)||leadManagePoolMatches(l,t));let intro={'新线索':'统一分配或手工登记时未指定招生岗的线索，可查看档案并分配。','回收池':'长期未有效沟通的线索在这里等待重新分配；交接时保留全部跟进记录。','预警中':'超过约定跟进时间仍无新跟进记录的线索，需要联系负责招生人员。','冷宫池':'已归档的拒绝或无效线索，可在时机合适时重新激活。','已分配':'已归属招生人员且未报名的线索，可按校区、招生人员和状态筛选，并由主管改派。跟进中对应我的线索中的可跟进。'}[t];let headers=t==='预警中'?['学生 / 家长','年级 · 学科','归属招生','约定跟进','已超时','最近一次跟进','操作']:t==='冷宫池'?['学生 / 家长','年级 · 学科','原归属招生','类型','关闭原因','归档时间','操作']:t==='已分配'?['学生 / 家长','年级 · 学科','来源','归属招生','阶段','跟进状态','意向','操作']:['学生 / 家长','年级','意向学科','详情','分配'];let rows=list.map(l=>t==='预警中'?`<tr><td>${leadPerson(l)}</td><td>${l.grade} · ${l.subject}</td><td>${l.owner}<div class="lead-secondary">${l.campus}</div></td><td>${esc(l.next)}</td><td>${leadPill('26小时')}</td><td>${esc(l.history.at(-1)?.[2]||'—')}</td><td><button class="btn small" onclick="remindLead(${l.index})">一键提醒</button></td></tr>`:t==='冷宫池'?`<tr><td>${leadPerson(l)}</td><td>${l.grade} · ${l.subject}</td><td>${l.owner}</td><td>${leadPill('明确拒绝')}</td><td>${esc(l.closeReason||l.note)}${l.closeDetails?`<div class="lead-secondary" style="white-space:pre-wrap;overflow-wrap:anywhere">${esc(l.closeDetails)}</div>`:''}</td><td>${esc(l.closedAt||'08-26')}</td><td><button class="btn small" onclick="reactivateLead(${l.index})">重新激活</button></td></tr>`:t==='已分配'?`<tr><td><a onclick="leadDetail(${l.index},'leadManage')">${esc(l.name)}</a><div class="lead-secondary">${esc(l.name)}${esc(l.guardian)}</div></td><td>${l.grade} · ${l.subject}</td><td>${esc(l.source)}</td><td>${esc(l.owner)}<div class="lead-secondary">${esc(l.ownershipCampus||'未记录校区')}</div></td><td>${leadPill(leadAssignedCategory(l))}</td><td>${esc(l.next)}</td><td>${leadPill(leadIntentLabel(l))}</td><td><button class="btn small" onclick="leadState.selected=${l.index};leadState.modal='assign';leadRender()">改派</button></td></tr>`:`<tr><td>${leadPerson(l)}</td><td>${l.grade}</td><td>${l.subject}</td><td><button class="btn small" onclick="leadDetail(${l.index},'leadManage')">详情</button></td><td><button class="btn small primary" onclick="leadState.selected=${l.index};leadState.modal='assign';leadRender()">分配</button></td></tr>`);return leadManageHeading('新线索、回收、预警、归档与已分配线索的管理入口')+`<div class="card pad">${leadSegments(tabs,t,'setManageTab')}${t==='回收池'?`<div class="academic-grid"><div class="lead-tip"><strong>回收与预警规则</strong><p>15 天无新沟通记录进入预警；20 天无有效沟通进入回收池；约定时间超时 24 小时进入预警中。</p></div><div class="lead-tip"><strong>重新分配与交接</strong><p>保留原有跟进记录，新负责人可查看完整档案与沟通摘要。</p></div></div>`:''}<div class="lead-tip ${t==='回收池'||t==='预警中'||t==='冷宫池'?'gold':''}">${intro}${t==='预警中'?` <button class="btn small right" onclick="toast('已向负责招生人员发送演示提醒')">全部一键提醒</button>`:''}</div>${t==='已分配'?leadManagePoolFilterHTML(t):''}${t==='冷宫池'?leadManagePoolFilterHTML(t):''}${aTable(headers,rows)}<div class="data-bar">共 ${list.length} 条线索</div></div>`}
function leadManagePoolFilters(tab=leadState.manageTab){
  const identity=typeof permissionState==='undefined'?'admin':permissionState.identity;
  if(leadState.poolFilterIdentity!==identity){leadState.poolFilterIdentity=identity;leadState.poolFilters={}}
  return (leadState.poolFilters??={})[tab]??=( {campus:'',owner:'',stage:''} );
}
function leadManagePoolOwners(lead,tab=leadState.manageTab){
  const owner=tab==='回收池'?lead.previousOwner:lead.owner&&lead.owner!=='未分配'?lead.owner:lead.previousOwner;
  return [...new Set(String(owner||'').split('、').filter(name=>name&&name!=='未分配'))];
}
function leadManagePoolMatches(lead,tab=leadState.manageTab){
  const f=leadManagePoolFilters(tab),owners=leadManagePoolOwners(lead,tab);
  return leadManagementVisible(lead)&&(!f.owner||(f.owner==='__unrecorded__'?!owners.length:owners.includes(f.owner)))&&(tab!=='已分配'||!f.stage||leadAssignedCategory(lead)===f.stage);
}
function leadAssignedCategory(lead){
  const category=leadWorkflowCategory(lead);
  return category==='可跟进'?'跟进中':category==='约试听'?'约试听':'';
}
function leadManagePoolRows(tab=leadState.manageTab,filtered=true){
  const status=({'回收池':'recycle','预警中':'warning','冷宫池':'cold'})[tab];
  return leadState.leads.map((lead,index)=>({...lead,index})).filter(lead=>(tab==='已分配'?!!leadAssignedCategory(lead):tab==='已报名'?lead.stage==='已报名':lead.status===status)&&leadManagementVisible(lead)&&(!filtered||leadManagePoolMatches(lead,tab)));
}
function leadManagePoolFilterHTML(tab=leadState.manageTab){
  const f=leadManagePoolFilters(tab),rows=leadManagePoolRows(tab,false);
  const owners=[...new Set(rows.flatMap(l=>leadManagePoolOwners(l,tab)))];
  const unknownOwner=rows.some(l=>!leadManagePoolOwners(l,tab).length);
  return `<div class="toolbar lead-pool-filters"><div class="toolbar-left"><div class="field"><label for="lead-pool-owner">招生人员</label><select class="select" id="lead-pool-owner" onchange="leadManagePoolSetFilter('owner',this.value)"><option value="">全部招生人员</option>${owners.map(name=>`<option value="${esc(name)}" ${f.owner===name?'selected':''}>${esc(name)}</option>`).join('')}${unknownOwner?`<option value="__unrecorded__" ${f.owner==='__unrecorded__'?'selected':''}>未记录招生人员</option>`:''}</select></div>${tab==='已分配'?`<div class="field"><label for="lead-pool-stage">状态</label><select class="select" id="lead-pool-stage" onchange="leadManagePoolSetFilter('stage',this.value)"><option value="">全部状态</option>${['跟进中','约试听'].map(stage=>`<option value="${stage}" ${f.stage===stage?'selected':''}>${stage}</option>`).join('')}</select></div>`:''}</div><button class="btn small" onclick="leadManagePoolResetFilters()">重置筛选</button></div>`;
}
function leadManagePoolSetFilter(key,value){
  if(!['campus','owner','stage'].includes(key)||!['回收池','预警中','冷宫池','已分配','已报名'].includes(leadState.manageTab))return;
  if(key==='stage'&&(leadState.manageTab!=='已分配'||!['','跟进中','约试听'].includes(value)))return;
  if(key==='campus'){leadSetManagementCampus(value);return}
  const f=leadManagePoolFilters();f[key]=value;leadRender();
}
function leadManagePoolResetFilters(){const f=leadManagePoolFilters();f.campus='';f.owner='';f.stage='';leadRender()}
function leadManagementSelectedCampus(){return typeof leadCampusSelection==='function'?leadCampusSelection():leadState.managementCampus||''}
function leadManagementVisible(lead){
  const campus=leadManagementSelectedCampus();
  return (typeof leadCanManage!=='function'||leadCanManage(lead))&&(!campus||(lead.ownershipCampus||'__unrecorded__')===campus);
}
function leadSetManagementCampus(value){
  if(!permissionCanVisit('leadManage'))return;
  const all=typeof leadAllCampusAccess!=='function'||leadAllCampusAccess();
  const rows=leadState.leads.filter(l=>typeof leadCanManage!=='function'||leadCanManage(l));
  const options=typeof leadManageCampusOptions==='function'?leadManageCampusOptions(rows):[...new Set(rows.map(l=>l.ownershipCampus).filter(Boolean))];
  if(!options.includes(value)&&!(all&&(!value||value==='__unrecorded__'&&rows.some(l=>!l.ownershipCampus))))return;
  leadManagementSelectedCampus();leadState.managementCampus=value;leadState.queueCampus='';
  for(const filters of Object.values(leadState.poolFilters||{})){filters.campus='';filters.owner=''}
  leadState.modal=null;leadState.assignmentDraft=null;leadRender();
}
function leadManageHeading(subtitle){
  const campus=leadManagementSelectedCampus(),all=typeof leadAllCampusAccess!=='function'||leadAllCampusAccess();
  const rows=leadState.leads.filter(l=>typeof leadCanManage!=='function'||leadCanManage(l));
  const options=typeof leadManageCampusOptions==='function'?leadManageCampusOptions(rows):[...new Set(rows.map(l=>l.ownershipCampus).filter(Boolean))];
  const control=all||options.length>1?`<select class="select" id="lead-management-campus" onchange="leadSetManagementCampus(this.value)">${all?'<option value="">全部校区</option>':''}${options.map(name=>`<option value="${esc(name)}" ${campus===name?'selected':''}>${esc(name)}</option>`).join('')}${all&&rows.some(l=>!l.ownershipCampus)?`<option value="__unrecorded__" ${campus==='__unrecorded__'?'selected':''}>未记录校区</option>`:''}</select>`:`<span id="lead-management-campus" class="lead-fixed-campus">${esc(campus||'未配置有效校区')}</span>`;
  return `<div class="heading lead-management-heading"><div><div class="lead-management-title"><h1>线索管理</h1><div class="lead-management-campus"><label for="lead-management-campus">校区</label>${control}</div></div><p class="subtitle">${subtitle}</p></div></div>`;
}
function countLead(status){return leadState.leads.filter(l=>l.status===status&&leadManagementVisible(l)).length}
function setManageTab(t){leadState.manageTab=t;leadRender()}
function leadDetailPhone(phone){return String(phone||'').replace(/^(\d{3})\d{4}(\d{4})$/,'$1****$2')}
function leadDetailPage(){
  const l=leadState.leads[leadState.selected],history=l.history||[],latest=history.at(-1),registrationOnly=leadIsRegistrationDetail();
  const suggestions=[
    '了解'+(l.subject&&l.subject!=='待定'?l.subject:'意向学科')+'的学习情况和目标，准备匹配的课程与试听安排。',
    '确认家长关注的问题、报名决策人及方便沟通的时间。',
    l.next&&l.next!=='未约定'&&l.next!=='已归档'?'按约定跟进：'+l.next+'，沟通后及时补充记录。':'与家长约定下次跟进时间，记录明确的下一步安排。'
  ];
  return `<div class="lead-detail-wrap ${registrationOnly?'lead-registration-detail':''}">
    <button class="btn small lead-detail-close" onclick="leadNav('${leadState.returnPage}')">× 关闭</button>
    <section class="card lead-profile-card"><div class="lead-detail-top"><div class="lead-profile-main"><div class="lead-profile-title"><h1>${esc(l.name)}</h1>${leadPill(leadIntentLabel(l))}${leadPill(l.grade+' · '+l.subject)}${leadPill(l.stage)}</div><p class="lead-profile-meta">${esc(l.name)}${esc(l.guardian)} · ${esc(leadDetailPhone(l.phone))} · ${esc(l.source)} · 意向校区：${esc(l.campus)}${l.ownershipCampus?' · 归属校区：'+esc(l.ownershipCampus):''} · 负责人：${esc(leadCampusQueueLabel(l))}</p></div><button class="btn small" onclick="leadOpenForm('edit')">✎ 修改</button></div></section>
    <section class="lead-summary"><div class="lead-summary-heading"><div><h2>AI 学员简报</h2><span>基于当前跟进记录整理 · 演示摘要</span></div><button class="btn small" onclick="leadRefreshSummary()">▣ 刷新</button></div>
      <p><strong>学员简报：</strong>${esc(l.grade)}，意向学科${esc(l.subject)}${l.school?'，就读'+esc(l.school):''}，通过${esc(l.source)}建档，当前${esc(l.stage)}。累计跟进记录 ${history.length} 条。${l.note?'档案备注：'+esc(l.note)+'。':''}${latest?'最近沟通记录：'+esc(latest[2]):''}</p>
      <p><strong>综合分析：</strong>${esc(leadSummaryInsight(l))}</p>
      <h3>跟进建议：</h3><ol>${suggestions.map(text=>`<li>${esc(text)}</li>`).join('')}</ol>
    </section>
    <section class="lead-history-section"><div class="lead-history-heading"><h2>跟进记录</h2><span>${history.length} 条 · 从建档到最新 · 电话 / 企微 / 面谈等渠道汇入</span></div>
      <div class="lead-timeline">${history.map(([title,when,body,attachment],index)=>`<article class="lead-event ${index===history.length-1?'latest':''}"><h3>${esc(title)}<time>${esc(when)}</time>${leadHistoryOperatorHTML(attachment)}</h3><div class="body">${esc(body)}${leadCommunicationMetadataHTML(attachment)}${leadRecordFilesHTML(attachment)}</div></article>`).join('')||(registrationOnly?'<div class="empty">暂无跟进记录</div>':'<div class="empty">暂无跟进记录，可从下方上传记录。</div>')}</div>
    </section>
    ${registrationOnly?'':leadFollowDock()}
  </div>`;
}
function leadSummaryInsight(lead){
  const history=lead.history||[];
  if(!history.length)return '暂无跟进记录，建议先确认学习需求和联系时间。';
  const types=[...new Set(history.map(record=>record[0]))].join('、');
  const files=history.flatMap(record=>leadRecordFiles(record[3])),attachments=files.length;
  const pending=files.filter(file=>!file.transcript).length;
  const next=lead.status==='cold'?'当前线索已归档，重新跟进前可回顾此前沟通及归档原因。':lead.stage==='已报名'?'当前线索已报名，后续可围绕入班和学习安排继续沟通。':lead.next&&lead.next!=='未约定'?'已记录下次跟进安排，可结合完整沟通记录确认家长关注的问题。':'尚未约定下次跟进时间，建议结合已有记录确认需求和下一步安排。';
  return '现有记录涵盖'+types+'，已统一归入当前档案。'+next+(attachments?'已归集 '+attachments+' 份附件。'+(pending?'其中 '+pending+' 份附件尚未转文字，可结合记录说明补充沟通要点。':'附件转写文字已并入沟通记录。'):'');
}
function leadRefreshSummary(){leadRender();toast('已根据当前记录刷新演示摘要')}
function leadOpenAction(action){
  if(!leadRequireFollow())return;

  if(action==='trial'){trialStart(leadState.leads[leadState.selected]);return}
  leadState.modal=action;
  if(action==='colleague'){leadState.assigneeId=-1;leadState.candidateSort='conversion'}
  leadRender();
  if(action==='colleague')leadRenderCandidates();
}
function leadPublicPoolDefaultCampus(lead){
  const staff=state.staff.filter(person=>person.active&&leadHasOwner(lead,leadStaffIdentity(person)));
  const operator=leadCurrentOperator();
  const current=staff.filter(person=>operator.account&&(person.account||person.phone)===operator.account);
  const candidates=current.length===1?current:staff;
  const campuses=[...new Set(candidates.flatMap(person=>staffCampusNames(person).length?staffCampusNames(person):['']))];
  if(current.length===1&&campuses.includes(lead.ownershipCampus)&&state.campuses.some(c=>c.active&&c.name===lead.ownershipCampus))return lead.ownershipCampus;
  return campuses.length===1&&state.campuses.some(c=>c.active&&c.name===campuses[0])?campuses[0]:'';
}
function leadPublicPoolCampusField(lead){
  const selected=leadPublicPoolDefaultCampus(lead),campuses=state.campuses.filter(c=>c.active);
  return `<div class="field"><label class="required" for="lead-public-campus">选择校区</label><select class="select" id="lead-public-campus" required aria-required="true"><option value="">请选择校区</option>${campuses.map(c=>`<option value="${esc(c.name)}" ${c.name===selected?'selected':''}>${esc(c.name)}</option>`).join('')}</select>${selected?'':'<p class="help">未能确定招生人员的所属校区，请选择接收线索的校区。</p>'}</div>`;
}
function leadActionModalPage(){
  const action=leadState.modal,lead=leadState.leads[leadState.selected];
  const title={colleague:'转同事',publicPool:'回公海'}[action];
  const cancel=`<button class="btn" onclick="leadState.modal=null;leadRender()">取消</button>`;
  let content='';
  if(action==='colleague')content=`<div class="lead-assignee-panel"><input class="input" id="lead-assignee-search" aria-label="搜索招生同事" placeholder="搜索具有「招生岗」权限的同事姓名/账号" oninput="leadRenderCandidates()"><div class="lead-recommend"><span>推荐5人 ·</span><button type="button" class="active" data-lead-sort="conversion" onclick="leadSetCandidateSort('conversion')">转化率优先</button><button type="button" data-lead-sort="capacity" onclick="leadSetCandidateSort('capacity')">可用资源最少</button></div><div id="lead-candidates"></div><p class="help">仅显示在职且所属职位具有线索或登记权限的员工；推荐顺序基于原型演示数据。</p></div><p id="lead-transfer-selection" class="help" aria-live="polite">请选择接收线索的同事</p><div class="modal-actions">${cancel}<button class="btn primary" onclick="leadTransferColleague()">确认转交</button></div>`;
  if(action==='publicPool')content=`<p>将 ${esc(lead.name)} 放回公海，交由团队重新分配？</p><p class="muted">当前负责人将清空，已有档案与跟进记录保留。回公海后进入所选校区的“线索管理 → 回收池”，等待重新分配。</p>${leadPublicPoolCampusField(lead)}<div class="field"><label for="lead-public-reason">回公海原因</label><textarea class="textarea" id="lead-public-reason" placeholder="选填，说明交回原因"></textarea></div><div class="modal-actions">${cancel}<button class="btn primary" onclick="leadReturnPublicPool()">确认回公海</button></div>`;
  return `<div class="modal-backdrop"><div class="modal lead-modal" role="dialog" aria-modal="true" aria-labelledby="lead-action-title"><div class="modal-head"><h2 id="lead-action-title">${title}</h2><button class="btn small" aria-label="关闭" onclick="leadState.modal=null;leadRender()">✕</button></div>${content}</div></div>`;
}
function leadTransferColleague(){
  if(!leadRequireFollow())return;

  const lead=leadState.leads[leadState.selected],person=leadEligibleStaff().find(s=>s.index===leadState.assigneeId);
  if(!person||person.name===lead.owner){toast('请选择其他在职且具有招生权限的同事');return}
  const previous=lead.owner;
  leadSetOwners(lead,[person]);
  leadResetFollowupCycle(lead);
  if(lead.stage!=='已报名')lead.stage='新分配';
  lead.history.push(leadHistoryEntry('转同事',`由${previous}转交给${person.name}，原有档案和跟进记录已保留。`,{},new Date().toLocaleString('zh-CN')));
  leadState.modal=null;leadRender();toast('线索已转交给'+person.name);
}
function leadReturnPublicPool(){
  if(leadState.modal!=='publicPool'||!leadRequireFollow())return;

  const lead=leadState.leads[leadState.selected],previous=lead.owner,reason=$('#lead-public-reason').value.trim();
  if(['new','recycle','cold'].includes(lead.status)||lead.stage==='已报名'){toast('当前线索不可回公海');return}
  const campus=$('#lead-public-campus').value,previousCampus=lead.ownershipCampus||'';
  if(!state.campuses.some(c=>c.active&&c.name===campus)){toast('请选择已启用的校区');return}
  leadRecycle(lead,['销售主动回公海'],Date.now(),false);
  lead.ownershipCampus=campus;
  lead.history.push(leadHistoryEntry('回公海',`由${previous}交回${campus}公海，等待重新分配。${reason?'原因：'+reason:''}`,{previousOwner:previous,previousCampus,ownershipCampus:campus},new Date().toLocaleString('zh-CN')));
  leadState.modal=null;leadState.manageTab='回收池';
  if(state.page==='leadDetail'&&typeof leadCampusCanRead==='function'&&!leadCampusCanRead(lead,leadState.returnPage))leadNav(leadState.returnPage||'myLeads');
  else leadRender();
  toast('已回公海，进入'+campus+'回收池等待重新分配');
}
function leadToEnrollment(){
  if(!leadRequireFollow())return;
  const lead=leadState.leads[leadState.selected];
  if(!lead)return;
  if(lead.stage==='已报名'){toast('该线索已转报名，请从学生档案继续报名或续报');return}
  enrollmentStartFromLead(lead);
}
const leadGradeNames=['小一','小二','小三','小四','小五','小六','初一','初二','初三','初四','高一','高二','高三'];
// 内部登记使用年级名称；“对外展示内容”和是否对外展示不影响内部可选范围。
function leadConfiguredGradeNames(){return [...new Set((state.config?.年级||[]).filter(row=>row[3]!==false).map(row=>row[0]).filter(Boolean))]}
function leadGradeKey(value){
  const text=String(value||'').trim(),digits={'一':'1','二':'2','三':'3','四':'4','五':'5','六':'6'};
  const primary=text.match(/^(?:小学|小)?([一二三四五六1-6])(?:年级)?$/);
  if(primary)return '小学'+(digits[primary[1]]||primary[1]);
  const secondary=text.match(/^(初中|初|高中|高)([一二三四1-4])(?:年级)?$/);
  return secondary?(secondary[1].startsWith('初')?'初中':'高中')+(digits[secondary[2]]||secondary[2]):text;
}
function leadConfiguredGrade(value){
  if(!value)return '';
  const rows=state.config?.年级||[],exact=rows.find(row=>row[0]===value);
  if(exact)return exact[3]!==false?exact[0]:'';
  const matches=leadConfiguredGradeNames().filter(name=>leadGradeKey(name)===leadGradeKey(value));
  return matches.length===1?matches[0]:'';
}
function leadGradeSelect(){
  const names=leadConfiguredGradeNames();
  return aSelect('lead-grade',names,names.length?'请选择年级':'请先在教学配置中启用年级')+'<div class="help">选项来自教学配置中的已启用年级。</div>';
}
function leadSchoolOffsets(system='63'){return {小学:0,初中:system==='54'?5:6,高中:9}}
function leadSchoolGrade(stage,entryYear,now=new Date(),system='63'){
  const start=leadSchoolOffsets(system)[stage];
  if(start===undefined||!entryYear||!Number.isInteger(Number(entryYear)))return null;
  const schoolYear=now.getFullYear()-(now.getMonth()<8?1:0);
  const index=start+schoolYear-Number(entryYear);
  const grades=system==='54'?['小一','小二','小三','小四','小五','初一','初二','初三','初四','高一','高二','高三']:leadGradeNames.filter(x=>x!=='初四');
  return index<0?'未入学':grades[index]||'已毕业';
}
function leadRefreshSchoolGrades(){
  leadState.leads.forEach(l=>{
    const school=l.schools?.find(x=>x.entryYear);
    if(!school)return;
    const grade=leadSchoolGrade(school.stage,school.entryYear,new Date(),l.schoolSystem);
    if(grade){const configured=leadConfiguredGrade(grade);if(configured)l.grade=configured;l.currentSchoolStage=grade.startsWith('小')?'小学':grade.startsWith('初')?'初中':grade.startsWith('高')?'高中':grade;}
  });
}
function leadSchoolYearOptions(selected=''){
  const year=new Date().getFullYear();
  const years=[...new Set([...Array.from({length:31},(_,i)=>year+12-i),...(selected?[Number(selected)]:[])])].sort((a,b)=>b-a);
  return `<option value="">入学年份</option>`+years.map(y=>`<option value="${y}" ${Number(selected)===y?'selected':''}>${y}年9月</option>`).join('');
}
function leadSchoolRow(school={},removable=false){
  return `<div class="lead-school-row"><select class="select lead-school-stage" aria-label="学校学段" onchange="leadSchoolStageChanged(this)">${['小学','初中','高中'].map(x=>`<option ${school.stage===x?'selected':''}>${x}</option>`).join('')}</select><input class="input lead-school-name" aria-label="学校名称" placeholder="请输入学校名称" value="${esc(school.name||'')}"><select class="select lead-school-year" aria-label="入学年份" onchange="leadSyncSchoolYears(this.closest('.lead-school-row'))">${leadSchoolYearOptions(school.entryYear)}</select>${removable?`<button class="btn small" type="button" onclick="this.closest('.lead-school-row').remove();leadSyncGradeFromSchool()">移除</button>`:'<button class="btn small" type="button" onclick="leadAddSchool()">+ 添加</button>'}</div>`;
}
function leadAddSchool(){
  const used=[...document.querySelectorAll('.lead-school-stage')].map(el=>el.value),stage=['小学','初中','高中'].find(x=>!used.includes(x))||'小学';
  document.querySelector('#lead-school-rows').insertAdjacentHTML('beforeend',leadSchoolRow({stage},true));
  leadSyncSchoolYears();
}
function leadSchoolSystem(){return document.querySelector('input[name="lead-school-system"]:checked')?.value==='54'?'54':'63'}
function leadSchoolStageChanged(select){
  const row=select.closest('.lead-school-row'),other=[...document.querySelectorAll('.lead-school-row')].find(x=>x!==row&&x.querySelector('.lead-school-year').value);
  leadSyncSchoolYears(other||row);
}
function leadSyncSchoolYears(anchor){
  const rows=[...document.querySelectorAll('.lead-school-row')];
  anchor=anchor||rows.find(row=>row.dataset.schoolAnchor==='true'&&row.querySelector('.lead-school-year').value)||rows.find(row=>row.querySelector('.lead-school-year').value);
  if(anchor&&anchor.querySelector('.lead-school-year').value){
    const offsets=leadSchoolOffsets(leadSchoolSystem()),base=Number(anchor.querySelector('.lead-school-year').value)-offsets[anchor.querySelector('.lead-school-stage').value];
    rows.forEach(row=>{row.dataset.schoolAnchor=String(row===anchor);const year=base+offsets[row.querySelector('.lead-school-stage').value];row.querySelector('.lead-school-year').innerHTML=leadSchoolYearOptions(year)});
  }
  leadSyncGradeFromSchool();
}
function leadSyncGradeFromSchool(){
  const row=[...document.querySelectorAll('.lead-school-row')].find(x=>x.querySelector('.lead-school-year').value);
  if(!row){$('#lead-school-grade-result').textContent='';return}
  const grade=leadSchoolGrade(row.querySelector('.lead-school-stage').value,row.querySelector('.lead-school-year').value,new Date(),leadSchoolSystem());
  const configured=leadConfiguredGrade(grade);
  const select=$('#lead-grade');
  if(configured){select.value=configured;select.dataset.schoolGrade=configured}
  else if(select.dataset.schoolGrade){if(select.value===select.dataset.schoolGrade)select.value='';delete select.dataset.schoolGrade}
  $('#lead-school-grade-result').textContent=grade?`当前推算：${configured||grade}。${configured?'':'未匹配到已启用的年级，请手动选择或在教学配置中补充。'}`:'';
}
function leadEligibleStaff(){
  return (state.staff||[]).map((staff,index)=>({...staff,index})).filter(staff=>{
    if(!staff.active)return false;
    const role=typeof permissionRole==='function'?permissionRole(staff.roleId):null;
    return !!(role?.active&&role.grants?.some(x=>['quickRegister','leadTodo','myLeads','leadManage'].includes(x))) || (!role&&String(staff.roles||'').includes('招生'));
  });
}
function leadCandidates(query='',sort='conversion'){
  const key=query.trim().toLowerCase();
  return leadEligibleStaff().filter(x=>leadState.modal!=='colleague'||x.name!==leadState.leads[leadState.selected].owner).filter(x=>!key||[x.name,x.account,x.phone].some(v=>String(v||'').toLowerCase().includes(key))).sort((a,b)=>sort==='capacity'?(a.pendingLeads??99)-(b.pendingLeads??99)|| (b.conversionRate??0)-(a.conversionRate??0):(b.conversionRate??0)-(a.conversionRate??0)||(a.pendingLeads??99)-(b.pendingLeads??99)).slice(0,5);
}
function leadCandidateRows(){
  const value=$('#lead-assignee-search')?.value||'';
  const query=leadState.modal!=='colleague'&&state.staff[leadState.assigneeId]?.name===value?'':value;
  const people=leadCandidates(query,leadState.candidateSort||'conversion');
  return people.length?people.map(x=>`<button type="button" class="lead-candidate ${leadState.assigneeId===x.index?'selected':''}" onclick="leadSelectAssignee(${x.index})"><span><strong>${esc(x.name)}</strong><small>${esc(x.campus||'未设置校区')} · 招生岗 · ${esc(x.account||x.phone||'')}</small></span><span><b>转化率 ${x.conversionRate??'—'}%</b> · 待跟进 ${x.pendingLeads??'—'}</span></button>`).join(''):'<p class="help">未找到具备招生权限的同事</p>';
}
function leadRenderCandidates(){const box=$('#lead-candidates');if(box)box.innerHTML=leadCandidateRows()}
function leadSetCandidateSort(sort){leadState.candidateSort=sort;document.querySelectorAll('[data-lead-sort]').forEach(b=>b.classList.toggle('active',b.dataset.leadSort===sort));leadRenderCandidates()}
function leadSelectAssignee(index){
  const person=leadEligibleStaff().find(staff=>staff.index===index);
  if(!person){toast('请选择在职且具有招生权限的同事');return}
  leadState.assigneeId=index;
  if(leadState.modal==='colleague'){
    leadRenderCandidates();const selection=$('#lead-transfer-selection');if(selection)selection.textContent='已选择：'+person.name;
  }else{
    $('#lead-assignee-search').value=person.name;
    leadCloseAssigneeOptions();
  }
}
function leadOpenAssigneeOptions(){
  const options=$('#lead-assignee-options');if(!options)return;
  options.hidden=false;$('#lead-assignee-search').setAttribute('aria-expanded','true');leadRenderCandidates();
}
function leadCloseAssigneeOptions(){
  const options=$('#lead-assignee-options');if(!options)return;
  options.hidden=true;$('#lead-assignee-search').setAttribute('aria-expanded','false');
}
function leadSearchAssignee(){leadState.assigneeId=-1;leadOpenAssigneeOptions()}
function leadToggleAssignment(){
  const selected=document.querySelector('input[name="lead-assign"]:checked')?.value;
  $('#lead-assignee-panel').hidden=selected!=='specific';
  if(selected==='specific'&&leadState.assigneeId<0)leadOpenAssigneeOptions();else leadCloseAssigneeOptions();
}
function leadFormContent(standalone=false){
  const edit=leadState.formMode==='edit',l=edit?leadState.leads[leadState.selected]:null;
  const nonSales=!edit&&leadNonSalesEntry();
  leadState.candidateSort='conversion';leadState.assigneeId=edit?state.staff.findIndex(s=>s.name===l?.owner):-1;
  leadState.assigneeIds=[];
  const schools=l?.schools?.length?l.schools:[{stage:'小学',name:l?.school||'',entryYear:''}];
  const assign=edit&&l.owner==='未分配'?'uniform':edit&&l.owner!=='王敏'?'specific':'self';
  return `${standalone||edit?'':`<div class="lead-segments"><button class="active">单条登记</button><button onclick="leadOpenForm('create','import')">批量导入</button></div>`}${edit?'':'<div class="lead-tip">适用于主动来电、家长上门和转介绍等手动录入场景。扫码表单和活动报名的线索通常会自动入池。</div>'}<div class="lead-form-grid">
    ${aField('学生姓名',aInput('lead-name','例如：王小明','text',l?.name||''),true)}
    ${aField('联系电话',aInput('lead-phone','录入后自动脱敏显示','tel',l?.phone||''),true)}
    ${nonSales?`<div class="field full"><label class="required" for="lead-ownership-campus">归属校区</label><select class="select" id="lead-ownership-campus" required aria-required="true"><option value="">请选择归属校区</option>${state.campuses.filter(c=>c.active).map(c=>`<option value="${esc(c.name)}">${esc(c.name)}</option>`).join('')}</select><p class="help">提交后由对应校区招生组长统一分配。</p></div>`:edit&&l.ownershipCampus?`<div class="field full"><label>归属校区</label><div>${esc(l.ownershipCampus)}</div></div>`:''}
    ${aField('就读年级',leadGradeSelect())}
    ${aField('来源渠道',aSelect('lead-source',['主动来电','家长上门','转介绍','地推扫码','公众号','活动报名','宣传物料扫码'],'请选择来源'))}
    <div class="field full"><div class="lead-school-heading"><span>公立学校</span><div class="lead-radio" role="radiogroup" aria-label="学制"><label><input type="radio" name="lead-school-system" value="63" ${l?.schoolSystem==='54'?'':'checked'} onchange="leadSyncSchoolYears()"> 六三制</label><label><input type="radio" name="lead-school-system" value="54" ${l?.schoolSystem==='54'?'checked':''} onchange="leadSyncSchoolYears()"> 五四制</label></div></div><div id="lead-school-rows">${schools.map((x,i)=>leadSchoolRow(x,i>0)).join('')}</div><p class="help"><span id="lead-school-grade-result"></span>填写任一学段的入学年份，其他学段自动推算；六三制为小学6年、初中3年，五四制为小学5年、初中4年，高中均为3年，每年9月升年级。</p></div>
    ${aField('学生性别',`<div class="lead-radio"><label><input type="radio" name="lead-gender" ${l?.gender==='女'?'':'checked'}> 男</label><label><input type="radio" name="lead-gender" ${l?.gender==='女'?'checked':''}> 女</label></div>`)}
    ${aField('招生家长',aSelect('lead-guardian',['妈妈','爸爸','其他'],'请选择关系'))}
    <div class="field full"><label>意向学科</label><div class="checkrow">${['语文','数学','英语','物理','化学'].map(x=>`<label><input type="checkbox" name="lead-subject" value="${x}" ${l?.subject?.includes(x)?'checked':''}> ${x}</label>`).join('')}</div></div>
    ${edit||nonSales?'':`<div class="field full"><label>分配招生</label><div class="lead-radio"><label><input type="radio" name="lead-assign" value="self" ${assign==='self'?'checked':''} onchange="leadToggleAssignment()"> 我自己</label><label><input type="radio" name="lead-assign" value="uniform" ${assign==='uniform'?'checked':''} onchange="leadToggleAssignment()"> 统一分配</label><label><input type="radio" name="lead-assign" value="specific" ${assign==='specific'?'checked':''} onchange="leadToggleAssignment()"> 指定招生岗（搜索选择）</label></div>
      <div id="lead-assignee-panel" class="lead-assignee-panel" ${assign==='specific'?'':'hidden'}>${leadAssignmentPicker()}</div>
    </div>`}${edit&&leadIsRegistrationDetail()?'':`<div class="field full lead-registration-record">${edit?leadBasicRecordForm(l):leadRegistrationRecordForm(l)}</div>`}
  </div><div class="modal-actions"><button class="btn" onclick="leadCloseForm()">取消</button><button class="btn primary" id="lead-registration-save" onclick="saveLead()">${edit?'保存修改':'保存登记'}</button></div>`;
}
function saveLead(){
  const edit=leadState.formMode==='edit',old=edit?leadState.leads[leadState.selected]:null;
  const nonSales=!edit&&leadNonSalesEntry(),ownershipCampus=nonSales?$('#lead-ownership-campus')?.value:'';
  if(edit&&!old){toast('未找到要修改的线索');return}
  if(edit&&leadIsRegistrationDetail()&&!shortcutOwnLead(old)){toast('只能修改本人登记的线索');return}
  if(!leadRecordReadyToSave())return;
  const name=$('#lead-name').value.trim(),phone=$('#lead-phone').value.trim();
  if(!name||!phone){toast('请填写学生姓名和联系电话');return}
  if(nonSales&&!state.campuses.some(c=>c.active&&c.name===ownershipCampus)){toast('请选择已启用的归属校区');return}
  const schools=[...document.querySelectorAll('.lead-school-row')].map(row=>({stage:row.querySelector('.lead-school-stage').value,name:row.querySelector('.lead-school-name').value.trim(),entryYear:row.querySelector('.lead-school-year').value})).filter(x=>x.name||x.entryYear);
  const primary=schools.find(x=>x.entryYear);
  const schoolSystem=leadSchoolSystem(),derived=primary?leadSchoolGrade(primary.stage,primary.entryYear,new Date(),schoolSystem):null;
  const selectedGrade=$('#lead-grade').value,grade=leadConfiguredGrade(derived)||leadConfiguredGrade(selectedGrade);
  if(selectedGrade&&!grade&&selectedGrade!==old?.grade){toast('所选年级未启用，请在教学配置中启用后重新选择');return}
  const basic={name,phone,guardian:$('#lead-guardian').value||'妈妈',grade:grade||selectedGrade||'未填',subject:[...document.querySelectorAll('input[name="lead-subject"]:checked')].map(x=>x.value).join('、')||'待定',source:$('#lead-source').value||'主动来电',campus:old?.campus||'待定',gender:document.querySelectorAll('input[name="lead-gender"]')[1]?.checked?'女':'男',school:schools[0]?.name||'',schools};
  if(primary&&derived)basic.currentSchoolStage=derived.startsWith('小')?'小学':derived.startsWith('初')?'初中':derived.startsWith('高')?'高中':derived;
  basic.schoolSystem=schoolSystem;
  if(edit){
    // 保留负责人、流转状态与原记录，将本次补充内容追加到跟进记录。
    const communication=leadIsRegistrationDetail()?null:leadPrepareBasicCommunication();
    if(communication===false)return;
    Object.assign(old,basic);
    if(!leadIsRegistrationDetail())leadCommitBasicRecord(old,communication);
  }else{
    const assign=nonSales?'uniform':document.querySelector('input[name="lead-assign"]:checked')?.value||'self';
    const assignees=assign==='specific'?leadAssignmentPeople():assign==='self'?[leadCurrentOperator()]:[];
    if(assign==='specific'&&(!assignees.length||assignees.length!==leadAssignmentIds().length)){toast('请选择在职且具有招生权限的同事');return}
    const owner=assign==='uniform'?'未分配':assignees.map(p=>p.name).join('、');
    const record={...basic,createdAt:new Date().toISOString(),followupCycleAt:new Date().toISOString(),stage:'新线索',intent:'',next:'未约定',owner,status:assign==='uniform'?'new':owner===leadCurrentOperator().name?'mine':'assigned',note:$('#lead-note').value.trim(),history:[]};
    leadSetOwners(record,assignees);
    if(nonSales)leadRouteToCampus(record,ownershipCampus);
    leadCommitRegistrationRecord(record,leadRegistrationAssignment(assign,assignees));
    leadState.leads.unshift(record);
  }
  leadDisposeRecord();
  const destination=edit?(leadState.formReturnPage||state.page):state.page==='leadForm'?leadState.formReturnPage:'myLeads';
  leadState.modal=null;leadNav(destination||'myLeads');toast(edit?'基本信息已修改':'线索已保存');
}
function leadModalPage(){if(leadState.modal==='communicationChoice')return leadCommunicationChoicePage();if(leadState.modal==='communicationSession')return leadCommunicationSessionPage();if(['colleague','publicPool'].includes(leadState.modal))return leadActionModalPage();let m=leadState.modal,l=leadState.leads[leadState.selected],title='',content='';if(m==='form'){title=leadState.formMode==='edit'?'修改基本信息':'线索登记';content=leadFormContent()}else if(m==='import'){title='批量导入线索';content=`<p class="muted">下载 Excel 模板，按表头填写学生、家长、来源和分配信息，每行填写一名学生。</p><div class="empty"><a class="btn primary lead-import-download" href="templates/lead-import-template.xlsx" download="线索导入模板.xlsx">下载导入模板</a><p class="help">Excel（.xlsx） · 含空白填写表与字段说明</p></div><p class="help">当前可下载模板，文件上传导入功能待接入。</p><div class="modal-actions"><button class="btn" onclick="leadState.modal=null;leadRender()">关闭</button></div>`}else if(m==='upload'){title=leadRecordDraft?.completion||['电话','企微'].includes(leadRecordDraft?.channel)?'完成沟通':'上传沟通记录';content=leadUploadRecordForm()}else if(m==='assign'){title='分配线索';content=`<p>${esc(l.name)} · ${l.grade} · ${l.subject}</p>${aField('招生人员',aSelect('assign-owner',['王敏','李强','陈静'],'请选择招生人员'),true)}<p class="help">重新分配时保留完整跟进档案。</p><div class="modal-actions"><button class="btn" onclick="leadState.modal=null;leadRender()">取消</button><button class="btn primary" onclick="assignLead()">确认分配</button></div>`}else if(m==='follow'||m==='record'){title=m==='follow'?'记录沟通与安排跟进':'完成沟通';content=leadFollowCommunicationForm()}else{title='移入冷宫池';content=`<p>将 ${esc(l.name)} 的线索归档后，仍可在冷宫池查看并重新激活。</p>${aField('关闭原因',aSelect('cold-reason',['已报名其他机构','价格超出预算','暂不需要','电话空号','其他'],'请选择原因'),true)}<div class="field" style="margin-top:18px"><label class="required" for="cold-detail">详情说明</label><textarea class="textarea" id="cold-detail" required aria-required="true" placeholder="请详细说明归档情况、家长反馈等"></textarea></div><div class="modal-actions"><button class="btn" onclick="leadState.modal=null;leadRender()">取消</button><button class="btn primary" onclick="archiveLead()">确认归档</button></div>`}return `<div class="modal-backdrop"><div class="modal lead-modal"><div class="modal-head"><h2>${title}</h2><button class="btn small" aria-label="关闭" onclick="${m==='upload'?'leadCloseUpload()':'leadState.modal=null;leadRender()'}">✕</button></div>${content}</div></div>`}
function assignLead(){
  if(!leadRequireFollow())return;
let owner=$('#assign-owner').value;if(!owner){toast('请选择招生人员');return}let l=leadState.leads[leadState.selected];l.owner=owner;l.status=owner==='王敏'?'mine':'assigned';l.stage='新分配';leadResetFollowupCycle(l);l.history.push(leadHistoryEntry('分配',`线索分配给${owner}。`,{},'今天'));leadState.modal=null;leadRender();toast('线索已分配')}
function saveFollow(){
  if(!leadRequireFollow())return;
  if(!['follow','record'].includes(leadState.modal))return;
  const note=$('#follow-note').value.trim(),data=leadReadCommunication(note);
  if(!data)return;
  leadAppendCommunication(leadState.leads[leadState.selected],note,[],data);
  leadState.modal=null;leadRender();toast('跟进记录与意向已保存');
}
function archiveLead(){
  if(!leadRequireFollow())return;

  const reason=$('#cold-reason').value,detail=$('#cold-detail').value.trim();
  if(!reason){toast('请选择关闭原因');return}
  if(!detail){toast('请填写详情说明');return}
  const l=leadState.leads[leadState.selected],when=new Date().toLocaleString('zh-CN');
  l.status='cold';l.stage='冷宫池';l.closeReason=reason;l.closeDetails=detail;l.closedAt=when;l.next='已归档';
  l.history.push(leadHistoryEntry('归档',`关闭原因：${reason}\n详情说明：${detail}`,{},when));
  leadState.modal=null;leadState.manageTab='冷宫池';leadNav('leadManage');toast('线索已归档');
}
function reactivateLead(i){let l=leadState.leads[i];l.status='new';l.stage='新线索';l.next='未约定';l.owner='未分配';l.history.push(leadHistoryEntry('重新激活','从冷宫池回到新线索。',{},'今天'));leadState.manageTab='新线索';leadRender();toast('线索已重新激活')}
function remindLead(i){let l=leadState.leads[i];l.history.push(leadHistoryEntry('提醒',`已提醒${l.owner}及时跟进。`,{},'今天'));toast('已记录提醒（原型演示）')}
render();
