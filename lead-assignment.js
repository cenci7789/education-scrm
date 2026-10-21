// 同一线索可分配给多位招生人员，保留一份档案与沟通历史。
// 既有线索使用固定演示登录人王敏，补齐其员工条目，使改派时能回显当前负责人。
if(!state.staff.some(p=>p.account===leadDemoOperator.account)){
  state.staff.push({...leadDemoOperator,phone:'',gender:'',campus:'',roleId:'sales',active:true,pendingLeads:leadState.leads.filter(l=>l.owner===leadDemoOperator.name&&l.status==='mine').length});
}
function leadOwnerNames(lead){return String(lead.owner||'').split('、').filter(name=>name&&name!=='未分配')}
function leadHasOwner(lead,person=leadCurrentOperator()){
  if(lead.assignees?.length&&lead.assignees.map(p=>p.name).join('、')===lead.owner){
    return lead.assignees.some(p=>p.account&&person.account?p.account===person.account:p.name===person.name);
  }
  return leadOwnerNames(lead).includes(person.name);
}
function leadSetOwners(lead,people){
  lead.assignees=people.map(leadStaffIdentity);
  lead.owner=lead.assignees.map(p=>p.name).join('、')||'未分配';
  lead.status=people.length?(leadHasOwner(lead)?'mine':'assigned'):'new';
}
function leadAssignmentIds(){return leadState.modal==='assign'?(leadState.assignmentDraft?.ids||[]):(leadState.assigneeIds||[])}
function leadAssignmentPeople(){
  const ids=leadAssignmentIds(),eligible=leadEligibleStaff();
  return ids.map(index=>eligible.find(p=>p.index===index)).filter(Boolean);
}
function leadAssignmentCandidates(query='',sort=leadState.candidateSort||'conversion'){
  const key=query.trim().toLowerCase();
  const people=leadEligibleStaff().filter(p=>!key||[p.name,p.account,p.phone].some(value=>String(value||'').toLowerCase().includes(key))).sort((a,b)=>sort==='capacity'?(a.pendingLeads??99)-(b.pendingLeads??99)||(b.conversionRate??0)-(a.conversionRate??0):(b.conversionRate??0)-(a.conversionRate??0)||(a.pendingLeads??99)-(b.pendingLeads??99));
  return key?people:people.slice(0,5);
}
function leadMultiCandidateRows(query=''){
  const ids=leadAssignmentIds(),people=leadAssignmentCandidates(query);
  return people.length?people.map(p=>`<label class="lead-candidate lead-multi-candidate ${ids.includes(p.index)?'selected':''}"><span class="lead-multi-person"><input type="checkbox" aria-label="选择${esc(p.name)}" ${ids.includes(p.index)?'checked':''} onchange="leadSelectAssignee(${p.index})"><span><strong>${esc(p.name)}</strong><small>${esc(p.campus||'未设置校区')} · 招生岗 · ${esc(p.account||p.phone||'')}</small></span></span><span><b>转化率 ${p.conversionRate??'—'}%</b> · 待跟进 ${p.pendingLeads??'—'}</span></label>`).join(''):'<p class="help">未找到在职且具有招生权限的同事</p>';
}
function leadAssignmentSelection(){
  const ids=leadAssignmentIds();
  return `<span>已选择 ${ids.length} 人</span>${ids.map(index=>{const p=state.staff[index];return `<button type="button" class="btn small" onclick="leadRemoveAssignee(${index})">${esc(p?.name||'人员已移除')} · ${esc(p?.account||p?.phone||'')} ×</button>`}).join('')}`;
}
function leadAssignmentPicker(){
  return `<input class="input" id="lead-assignee-search" aria-label="搜索招生人员姓名或账号" placeholder="搜索具有「招生岗」权限的同事姓名/账号" autocomplete="off" oninput="leadSearchAssignee()"><div id="lead-assignee-options"><div class="lead-recommend"><span>推荐5人 ·</span><button type="button" class="${leadState.candidateSort==='capacity'?'':'active'}" data-lead-sort="conversion" onclick="leadSetCandidateSort('conversion')">转化率优先</button><button type="button" class="${leadState.candidateSort==='capacity'?'active':''}" data-lead-sort="capacity" onclick="leadSetCandidateSort('capacity')">可用资源最少</button></div><div id="lead-candidates">${leadMultiCandidateRows()}</div><p class="help">仅显示在职且具有招生权限的人员；推荐顺序基于原型演示数据。支持多选，搜索或切换排序会保留已选人员。</p></div><div class="lead-multi-selection" id="lead-assignment-selection">${leadAssignmentSelection()}</div>`;
}
function leadRefreshAssignmentSelection(){
  leadRenderCandidates();const box=$('#lead-assignment-selection');if(box)box.innerHTML=leadAssignmentSelection();
}
function leadRemoveAssignee(index){
  if(leadState.modal==='assign')leadState.assignmentDraft.ids=leadAssignmentIds().filter(id=>id!==index);
  else{leadState.assigneeIds=leadAssignmentIds().filter(id=>id!==index);leadState.assigneeId=leadState.assigneeIds[0]??-1}
  leadRefreshAssignmentSelection();
}
const leadSingleCandidateRows=leadCandidateRows,leadSingleSelectAssignee=leadSelectAssignee,leadSingleSearchAssignee=leadSearchAssignee;
leadCandidateRows=function(){return leadState.modal==='colleague'?leadSingleCandidateRows():leadMultiCandidateRows($('#lead-assignee-search')?.value||'')};
leadSelectAssignee=function(index){
  if(leadState.modal==='colleague')return leadSingleSelectAssignee(index);
  if(!leadEligibleStaff().some(p=>p.index===index)){toast('请选择在职且具有招生权限的同事');return}
  const ids=leadAssignmentIds();
  if(ids.includes(index)){leadRemoveAssignee(index);return}
  if(leadState.modal==='assign')leadState.assignmentDraft.ids=[...ids,index];
  else{leadState.assigneeIds=[...ids,index];leadState.assigneeId=leadState.assigneeIds[0]}
  leadRefreshAssignmentSelection();
};
leadSearchAssignee=function(){if(leadState.modal==='colleague')return leadSingleSearchAssignee();leadOpenAssigneeOptions()};
leadToggleAssignment=function(){
  const specific=document.querySelector('input[name="lead-assign"]:checked')?.value==='specific';
  $('#lead-assignee-panel').hidden=!specific;if(specific)leadOpenAssigneeOptions();
};
function leadCloseAssignment(){leadState.assignmentDraft=null;leadState.modal=null;leadRender()}
const leadAssignmentPreviousModal=leadModalPage;
leadModalPage=function(){
  if(leadState.modal!=='assign')return leadAssignmentPreviousModal();
  const lead=leadState.leads[leadState.selected];if(!lead)return '';
  if(!leadState.assignmentDraft||leadState.assignmentDraft.lead!==lead){
    leadState.assignmentDraft={lead,ids:['new','recycle'].includes(lead.status)?[]:state.staff.map((p,index)=>({...p,index})).filter(p=>leadHasOwner(lead,leadStaffIdentity(p))).map(p=>p.index)};leadState.candidateSort='conversion';
  }
  const reassign=!['new','recycle'].includes(lead.status);
  return `<div class="modal-backdrop"><section class="modal lead-modal" role="dialog" aria-modal="true" aria-labelledby="lead-assign-title"><div class="modal-head"><h2 id="lead-assign-title">${reassign?'改派线索':'分配线索'}</h2><button class="btn small" aria-label="关闭" onclick="leadCloseAssignment()">×</button></div><p>${esc(lead.name)} · ${esc(lead.grade)} · ${esc(lead.subject)}</p>${leadAssignmentPicker()}<p class="help">所选人员共同负责该线索，保留完整跟进档案。</p><div class="modal-actions"><button class="btn" onclick="leadCloseAssignment()">取消</button><button class="btn primary" onclick="assignLead()">${reassign?'确认改派':'确认分配'}</button></div></section></div>`;
};
assignLead=function(){
  if(!leadRequireFollow()||!permissionCanVisit('leadManage')||leadState.modal!=='assign')return;
  const lead=leadState.leads[leadState.selected],draft=leadState.assignmentDraft;
  if(!lead||draft?.lead!==lead)return;
  const people=leadAssignmentPeople();
  if(!draft.ids.length){toast('请至少选择一位招生人员');return}
  if(people.length!==draft.ids.length){toast('部分已选人员已离职或不再具有招生权限，请移除后重新选择');return}
  const old=lead.owner,reassign=!['new','recycle'].includes(lead.status);
  if(reassign&&people.length===leadOwnerNames(lead).length&&people.every(p=>leadHasOwner(lead,leadStaffIdentity(p)))){leadCloseAssignment();toast('负责人员未变更');return}
  leadSetOwners(lead,people);if(lead.stage!=='已报名')lead.stage='新分配';leadResetFollowupCycle(lead);
  lead.history.push(leadHistoryEntry(reassign?'改派':'分配',`${reassign?'原负责人：'+old+'；':''}线索分配给${people.map(p=>leadIdentityLabel(leadStaffIdentity(p))).join('、')}。保留完整跟进档案。`,{assignees:lead.assignees.map(p=>({...p}))}));
  leadState.assignmentDraft=null;leadState.modal=null;leadRender();toast(reassign?'线索已改派':'线索已分配');
};
const leadAssignmentPreviousRender=leadRender;
leadRender=function(){if(leadState.modal!=='assign')leadState.assignmentDraft=null;return leadAssignmentPreviousRender()};
