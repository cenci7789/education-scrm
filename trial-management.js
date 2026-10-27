// 教务试听管理与“我的线索—约试听”共用课节时间和出勤状态口径。
function trialManagementRows(){
  const search=String(trialState.managementSearch||'').trim().toLowerCase();
  return trialState.requests.filter(r=>(trialState.filter==='全部'||r.status===trialState.filter)&&(!search||[r.name,r.guardian,r.phone].some(v=>String(v||'').toLowerCase().includes(search))));
}
function trialManagementGroups(list){
  const groups=new Map();
  for(const r of list){
    const linked= r.leadId&&leadState.leads.find(l=>l.leadId===r.leadId);
    const studentId=r.studentId||linked?.studentId||trialState.requests.find(other=>r.leadId&&other.leadId===r.leadId&&other.studentId)?.studentId;
    // 不根据同名或打码电话合并学生；未建档预约按预约编号单列。
    const key=studentId?'student:'+studentId:r.leadId?'lead:'+r.leadId:'request:'+r.id;
    if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);
  }
  return [...groups.values()];
}
function trialManagementStatusHTML(r){
  if(r.status==='已取消')return trialBadge('已取消');
  if(r.supersededBy)return trialBadge('已重新约课');
  if(r.salesReturnedAt)return trialBadge('已放回线索');
  const status=myTrialStatus(r);
  if(r.status==='已排班'&&status==='待确认出勤')return `<div class="my-trial-actions"><button class="btn small" onclick="trialManagementMark(${r.id},'已试听')">已试听</button><button class="btn small" onclick="trialManagementMark(${r.id},'未出勤')">未出勤</button></div>`;
  return trialBadge(status);
}
function trialManagementMark(id,status){
  if(!permissionCanVisit('trialManage'))return;
  const r=trialState.requests.find(r=>r.id===id);
  if(!r||r.status!=='已排班'||!myTrialActive(r)||myTrialStatus(r)!=='待确认出勤'||!['已试听','未出勤'].includes(status))return;
  Object.assign(r,{attendance:status,attendanceAt:new Date().toISOString(),attendanceOperator:trialActor().name});
  trialLog(r,'试听出勤',`${myTrialTiming(r).className} · ${myTrialTiming(r).name} · ${myTrialTimeText(myTrialTiming(r))}，登记为${status}。`);
  render();toast('试听出勤已记录');
}
function trialManagementConfirm(id){
  if(!permissionCanVisit('trialManage'))return;
  const r=trialState.requests.find(r=>r.id===id);
  if(!r||r.status!=='待排班'||!myTrialActive(r)){toast('该预约已处理，请查看最新状态');return}
  trialOpenReview(id);
}
function trialManagementResults(){
  const list=trialManagementRows(),groups=trialManagementGroups(list);
  return aTable(['学生 / 家长','年级','约课信息','试听时间','状态','操作'],groups.flatMap(requests=>requests.map((r,index)=>{
    const t=myTrialTiming(r),canConfirm=r.status==='待排班'&&myTrialActive(r);
    return `<tr>${index?'':`<td rowspan="${requests.length}"><div class="lead-name">${esc(r.name)}</div><div class="lead-secondary">${esc(r.guardian||'家长未填写')} · ${esc(leadDetailPhone(r.phone))}</div></td><td rowspan="${requests.length}">${esc(r.grade||'—')}</td>`}<td>${esc(t.className||r.course||'班级待确认')}-${esc(t.name)}（${esc(myTrialTimeText(t))}）${canConfirm?'<div class="help">待教务确认排班</div>':''}</td><td>${esc(myTrialTimeText(t))}</td><td>${trialManagementStatusHTML(r)}</td><td><div class="my-trial-actions">${canConfirm?`<button class="btn small primary" onclick="trialManagementConfirm(${r.id})">详情</button>`:`<button class="btn small" onclick="trialOpenReview(${r.id})">详情</button>`}</div></td></tr>`;
  })))+(!groups.length?'<div class="empty">暂无符合条件的试听学生</div>':'')+`<div class="data-bar" role="status">共 ${groups.length} 位学生 · ${list.length} 条预约</div>`;
}
function trialManagementSearch(value){trialState.managementSearch=value;$('#trial-management-results').innerHTML=trialManagementResults()}
function trialManagementSetFilter(value){if(!['待排班','已排班','已取消','全部'].includes(value))return;trialState.filter=value;trialState.modalId=null;render()}
trialManagementPage=function(){
  const tabs=['待排班','已排班','已取消','全部'];
  if(!tabs.includes(trialState.filter))trialState.filter='待排班';
  return heading('试听管理','查看已预约学生与课节，确认班级及实际试听时间')+`<div class="card"><div class="tabs">${tabs.map(t=>`<button class="tab ${trialState.filter===t?'active':''}" onclick="trialManagementSetFilter('${t}')">${t}（${trialState.requests.filter(r=>t==='全部'||r.status===t).length}）</button>`).join('')}</div><div class="pad"><div class="toolbar"><input class="input" style="width:260px;max-width:100%" placeholder="搜索学生、家长或电话" value="${esc(trialState.managementSearch||'')}" oninput="trialManagementSearch(this.value)"></div><div id="trial-management-results">${trialManagementResults()}</div><p class="help">按学生展示已预约课节；点击详情查看预约信息并确认排班后安排进班试听，课节结束后登记已试听或未出勤。</p></div></div>`+(trialState.modalId?trialReviewModal():'');
};
setInterval(()=>{
  if(state.page==='trialManage'&&!trialState.modalId&&permissionCanVisit('trialManage')){const box=$('#trial-management-results');if(box)box.innerHTML=trialManagementResults()}
},30000);
