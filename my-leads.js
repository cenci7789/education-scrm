const myLeadCategories=['可跟进','约试听','已报名','冷宫池'];
function leadHasNextFollowup(lead){
  return /\d{1,2}:\d{2}/.test(String(lead.next||''))&&!['未约定','已归档'].includes(lead.next);
}
function leadMyCategory(lead){
  if(!leadHasOwner(lead)||['new','recycle'].includes(lead.status))return '';
  if(lead.status==='cold')return '冷宫池';
  if(lead.stage==='已报名')return '已报名';
  const requests=lead.leadId?trialState.requests.filter(r=>r.leadId===lead.leadId):[];
  if(requests.some(myTrialActive)||(!requests.length&&lead.stage==='约试听'))return '约试听';
  return '可跟进';
}
function leadMyStage(lead){
  const category=leadMyCategory(lead);
  return category==='可跟进'?(leadHasNextFollowup(lead)?'跟进中':'新线索'):category;
}
function myLeadRows(){
  const search=String(leadState.mineSearch||'').trim().toLowerCase();
  return leadState.leads.map((lead,index)=>({...lead,index})).filter(lead=>
    leadMyCategory(lead)===leadState.mineTab&&(!search||[lead.name,lead.phone].some(value=>String(value||'').toLowerCase().includes(search))));
}
function myLeadResults(){
  const list=myLeadRows();
  if(leadState.mineTab==='约试听')return myTrialResults(list);
  if(leadState.mineTab==='已报名')return myEnrolledResults(list);
  return aTable(['学生 / 家长','年级','意向学科','阶段','意向度','下次跟进时间','操作'],list.map(l=>
    `<tr><td>${leadPerson(l)}</td><td>${esc(l.grade)}</td><td>${esc(l.subject)}</td><td>${leadPill(leadMyStage(l))}</td><td>${leadPill(leadIntentLabel(l))}</td><td>${esc(l.next||'未约定')}</td><td><button class="btn small" onclick="leadDetail(${l.index},'myLeads')">详情</button>${leadState.mineTab==='冷宫池'?` <button class="btn small" onclick="myLeadReactivate(${l.index})">再次激活</button>`:''}</td></tr>`))+
    (!list.length?'<div class="empty">暂无符合条件的线索</div>':'')+`<div class="data-bar" role="status">共 ${list.length} 条线索</div>`;
}
function myLeadSearch(value){leadState.mineSearch=value;$('#my-lead-results').innerHTML=myLeadResults()}
function myLeadReactivate(index){
  const lead=leadState.leads[index];
  if(!lead||leadMyCategory(lead)!=='冷宫池'||!permissionCanVisit('myLeads'))return;
  const now=new Date().toISOString(),operator=leadCurrentOperator();
  // 旧试听保留为历史记录，避免再次激活时被旧预约归回约试听。
  myTrialRequests(lead).forEach(r=>{r.salesReturnedAt=now;r.salesReturnedBy=operator;r.salesReturnReason='冷宫池再次激活'});
  lead.status='mine';lead.stage='新线索';lead.next='未约定';
  leadResetFollowupCycle(lead);
  lead.history.push(leadHistoryEntry('再次激活','从冷宫池返回可跟进列表，归类为新线索，保留当前负责人。'));
  leadState.modal=null;leadState.trialAction=null;leadState.mineTab='可跟进';leadState.mineSearch='';state.page='myLeads';render();
  toast('已激活，返回可跟进列表');
}
myLeadsPage=function(){
  if(!myLeadCategories.includes(leadState.mineTab))leadState.mineTab='可跟进';
  const tabs=myLeadCategories.map(category=>[category,leadState.leads.filter(lead=>leadMyCategory(lead)===category).length]);
  const help={
    可跟进:'新线索：新登记或新分配给我的线索；跟进中：已经约定下次跟进时间的线索。',
    约试听:'按学生展示已预约课节；课节结束后登记已试听或未出勤。放回线索时须约定下次跟进时间。',
    已报名:'按学生展示已报课程（班级）及当前状态；同一学生的多个班级分别列示。',
    冷宫池:'已归档的线索，保留原有信息和跟进记录。'
  };
  return heading('我的线索','查看本人负责的线索、下一次跟进时间和沟通记录')+
    `<div class="card pad"><div class="toolbar"><div class="toolbar-left">${leadSegments(tabs,leadState.mineTab,'setMineTab')}<input class="input" style="width:230px" placeholder="搜索姓名或电话" value="${esc(leadState.mineSearch||'')}" oninput="myLeadSearch(this.value)"></div><div class="toolbar-right"><button class="btn" onclick="leadOpenForm('create','import')">批量导入</button><button class="btn primary" onclick="leadOpenForm()">+ 线索登记</button></div></div><div id="my-lead-results">${myLeadResults()}</div><p class="help">${help[leadState.mineTab]}</p></div>`+myTrialActionModal();
};
function myEnrolledCourses(lead){
  const linkedOrders=a.orders.filter(o=>lead.leadId&&o.originLeadId===lead.leadId);
  const studentIds=new Set([lead.studentId,...linkedOrders.map(o=>o.studentId),...a.students.filter(s=>lead.leadId&&s.originLeadId===lead.leadId).map(s=>s.id)].filter(Boolean));
  const orders=a.orders.filter(o=>linkedOrders.includes(o)||(o.studentId&&studentIds.has(o.studentId)));
  const rows=[],seen=new Set(),orderedClasses=new Set();
  const add=(item,order={})=>{
    const c=a.classes.find(c=>c.id===item.classId);
    const name=item.className||c?.name||item.course;if(!name)return;
    const refunded=['已退费','已退款','退款成功'];
    const status=[item.enrollmentStatus,item.status,order.enrollmentStatus,order.status].some(value=>refunded.includes(value))?'已退费':'上课中';
    const key=(item.classId||name)+'|'+status;if(seen.has(key))return;
    seen.add(key);rows.push({name,course:item.course||c?.course||'',status});
  };
  orders.forEach(order=>{
    (order.items||[]).forEach(item=>{orderedClasses.add(item.classId||item.className);add(item,order)});
  });
  a.students.filter(s=>studentIds.has(s.id)).forEach(student=>{
    (student.enrollments||[]).forEach(item=>{if(!orderedClasses.has(item.classId||item.className))add(item)});
    if(!student.enrollments?.length&&!orders.some(o=>o.studentId===student.id&&o.items?.length)){
      (student.classNames||(student.className&&student.className!=='—'?[student.className]:[])).forEach(name=>add({className:name,enrollmentStatus:student.status}));
    }
  });
  return rows;
}
function myEnrolledResults(list){
  return aTable(['学生 / 家长','年级','已报课程（班级）','当前状态','操作'],list.flatMap(l=>{
    const courses=myEnrolledCourses(l),rows=courses.length?courses:[null];
    return rows.map((item,i)=>`<tr>${i?'':`<td rowspan="${rows.length}">${leadPerson(l)}</td><td rowspan="${rows.length}">${esc(l.grade)}</td>`}<td>${item?`<strong>${esc(item.name)}</strong>${item.course&&item.course!==item.name?`<div class="help">${esc(item.course)}</div>`:''}`:'<span class="help">暂无报名班级记录</span>'}</td><td>${item?`<span class="badge ${item.status==='已退费'?'off':''}">${item.status}</span>`:'—'}</td>${i?'':`<td rowspan="${rows.length}"><button class="btn small" onclick="leadDetail(${l.index},'myLeads')">详情</button></td>`}</tr>`);
  }))+(!list.length?'<div class="empty">暂无符合条件的已报名学生</div>':'')+`<div class="data-bar" role="status">共 ${list.length} 位学生</div>`;
}
function myTrialActive(r){return ['待排班','已排班'].includes(r.status)&&!r.salesReturnedAt&&!r.supersededBy}
function myTrialRequests(lead){return lead.leadId?trialState.requests.filter(r=>r.leadId===lead.leadId&&myTrialActive(r)):[]}
function myTrialTiming(r){
  const confirmed=r.status==='已排班',c=a.classes.find(c=>c.id===(confirmed?r.classId:r.requestedClassId));
  const start=confirmed?r.scheduledTime:r.preferredTime;
  const session=c&&trialClassSessions(c).find(s=>new Date(s.startsAt).getTime()===new Date(start).getTime()&&(confirmed||!r.requestedSessionId||s.id===r.requestedSessionId));
  return {className:confirmed?c?.name||r.requestedClassName:r.requestedClassName||c?.name,
    name:(confirmed?r.scheduledSessionName:r.requestedSessionName)||session?.name||'讲次待确认',
    start:start||'',end:(confirmed?r.scheduledEndTime:r.requestedEndTime)||(session?trialSessionEndTime(session):'')};
}
function myTrialTimeText(t){
  const start=new Date(t.start),end=new Date(t.end),pad=n=>String(n).padStart(2,'0');
  if(!Number.isFinite(start.getTime()))return '待确认时间';
  const date=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`,time=d=>`${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return `${date(start)} ${time(start)}${Number.isFinite(end.getTime())?`–${date(end)!==date(start)?date(end)+' ':''}${time(end)}`:'（结束时间待确认）'}`;
}
function myTrialStatus(r,now=Date.now()){
  if(r.attendance)return r.attendance;
  const t=myTrialTiming(r),start=new Date(t.start).getTime(),end=new Date(t.end).getTime();
  if(!Number.isFinite(start))return '待确认时间';
  if(now<start)return '待试听';
  if(!Number.isFinite(end))return '结束时间待确认';
  return now<end?'试听中':'待确认出勤';
}
function myTrialResults(list){
  return aTable(['学生 / 家长','年级','约课信息','试听时间','状态','操作'],list.flatMap(l=>{
    const requests=myTrialRequests(l),rows=requests.length?requests:[null];
    return rows.map((r,i)=>{
      const t=r?myTrialTiming(r):null,status=r?myTrialStatus(r):'待确认课节';
      const action=r&&Number.isFinite(r.id)?`<button class="btn small" onclick="myTrialMark(${r.id},'已试听')">已试听</button> <button class="btn small" onclick="myTrialMark(${r.id},'未出勤')">未出勤</button>`:'';
      return `<tr>${i?'':`<td rowspan="${rows.length}">${leadPerson(l)}</td><td rowspan="${rows.length}">${esc(l.grade)}</td>`}<td>${t?`${esc(t.className||r.course||'班级待确认')}-${esc(t.name)}（${esc(myTrialTimeText(t))}）`:'暂无课节信息'}${r?.status==='待排班'?'<div class="help">待教务确认排班</div>':''}</td><td>${t?esc(myTrialTimeText(t)):'—'}</td><td>${status==='待确认出勤'?action:trialBadge(status)}${status==='未出勤'&&Number.isFinite(r?.id)?` <button class="btn small" onclick="myTrialAskRebook(${r.id})">再次约课</button>`:''}</td>${i?'':`<td rowspan="${rows.length}"><div class="my-trial-actions"><button class="btn small" onclick="leadDetail(${l.index},'myLeads')">跟进</button><button class="btn small" onclick="myTrialOpenReturn(${l.index})">放回线索</button></div></td>`}</tr>`;
    });
  }))+(!list.length?'<div class="empty">暂无符合条件的试听学生</div>':'')+`<div class="data-bar" role="status">共 ${list.length} 位学生</div>`;
}
function myTrialOwnedRequest(id){
  const r=trialState.requests.find(r=>r.id===id),l=r&&leadState.leads.find(l=>l.leadId===r.leadId);
  return r&&l&&myTrialActive(r)&&leadMyCategory(l)==='约试听'&&permissionCanVisit('myLeads')?r:null;
}
function myTrialMark(id,status){
  const r=myTrialOwnedRequest(id);
  if(!r||!['已试听','未出勤'].includes(status)||myTrialStatus(r)!=='待确认出勤')return;
  Object.assign(r,{attendance:status,attendanceAt:new Date().toISOString(),attendanceOperator:leadCurrentOperator()});
  trialLog(r,'试听出勤',`${myTrialTiming(r).className} · ${myTrialTiming(r).name} · ${myTrialTimeText(myTrialTiming(r))}，登记为${status}。`);
  if(status==='未出勤')myTrialAskRebook(id);else render();
}
function myTrialAskRebook(id){
  const r=myTrialOwnedRequest(id);if(!r||r.attendance!=='未出勤')return;
  leadState.trialAction={type:'rebook',requestId:id};render();
}
function myTrialCloseAction(){leadState.trialAction=null;render()}
function myTrialRebook(){
  const r=myTrialOwnedRequest(leadState.trialAction?.requestId);if(!r||r.attendance!=='未出勤'||!trialAllowed('quickTrial'))return;
  const l=leadState.leads.find(l=>l.leadId===r.leadId);
  leadState.trialAction=null;trialStart(l);trialState.draft.rebookRequestId=r.id;trialState.step=2;render();
}
function myTrialOpenReturn(index){
  const l=leadState.leads[index];if(!l||leadMyCategory(l)!=='约试听'||!permissionCanVisit('myLeads'))return;
  leadState.selected=index;leadState.trialAction={type:'return',leadId:l.leadId,requestIds:myTrialRequests(l).map(r=>r.id)};render();
}
function myTrialActionModal(){
  const action=leadState.trialAction;if(!action)return '';
  const rebook=action.type==='rebook';
  return `<div class="modal-backdrop"><section class="modal lead-modal" role="dialog" aria-modal="true" aria-labelledby="my-trial-action-title"><div class="modal-head"><h2 id="my-trial-action-title">${rebook?'是否再次约课？':'下次跟进'}</h2><button class="btn small" aria-label="关闭" onclick="myTrialCloseAction()">×</button></div>${rebook?'<p>本次已记录为未出勤。再次约课将带入学生信息，重新选择班级和课节。</p>':leadCommunicationFields('其他',false,true)+'<p class="help">放回线索须填写下次跟进时间；原试听记录保留。</p><div class="field"><label class="required" for="follow-note">沟通说明</label><textarea class="textarea" id="follow-note" placeholder="记录家长反馈及下一步跟进安排"></textarea></div>'}<div class="modal-actions"><button class="btn" onclick="myTrialCloseAction()">${rebook?'暂不约课':'取消'}</button><button class="btn primary" onclick="${rebook?'myTrialRebook()':'myTrialConfirmReturn()'}">${rebook?'再次约课':'确认放回线索'}</button></div></section></div>`;
}
function myTrialConfirmReturn(){
  const action=leadState.trialAction,l=leadState.leads[leadState.selected];
  if(action?.type!=='return'||!l||l.leadId!==action.leadId||leadMyCategory(l)!=='约试听'||!permissionCanVisit('myLeads'))return;
  if(!$('#follow-time').value){toast('请填写下次跟进时间');return}
  const note=$('#follow-note').value.trim(),data=leadReadCommunication(note);if(!data)return;
  const requests=myTrialRequests(l);
  if(requests.some(r=>!action.requestIds.includes(r.id))){toast('试听预约已变更，请关闭弹窗后重新操作');return}
  leadAppendCommunication(l,note,[],data,'试听后放回线索');
  requests.forEach(r=>{r.salesReturnedAt=new Date().toISOString();r.salesReturnedBy=leadCurrentOperator()});
  l.stage='跟进中';leadState.trialAction=null;leadState.mineTab='可跟进';render();toast('已放回可跟进列表，并保存下次跟进时间');
}
setInterval(()=>{
  if(state.page==='myLeads'&&leadState.mineTab==='约试听'&&!leadState.modal&&!leadState.trialAction&&permissionCanVisit('myLeads')){
    const box=$('#my-lead-results');if(box)box.innerHTML=myLeadResults();
  }
},30000);
