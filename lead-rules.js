// 原型在页面运行期间检查规则；完整时间戳参与计算，历史缺失年份的展示文本不猜测日期。
const leadRuleHour=60*60*1000,leadRuleDay=24*leadRuleHour;
function leadRuleTime(value){
  if(typeof value==='number')return Number.isFinite(value)?value:NaN;
  const text=String(value||'');
  return /^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(text)?new Date(text).getTime():NaN;
}
function leadResetFollowupCycle(lead,now=Date.now()){
  lead.followupCycleAt=new Date(now).toISOString();lead.assignedAt=lead.followupCycleAt;
  lead.lastCommunicationAt='';lead.lastEffectiveCommunicationAt='';lead.followupDeadlineAt='';lead.next='未约定';
  lead.warningReasons=[];lead.warningAt='';
}
function leadRuleMetrics(lead,now=Date.now()){
  const history=lead.history||[];
  const cycle=leadRuleTime(lead.followupCycleAt||lead.assignedAt||lead.createdAt);
  const effective=history.filter(e=>e[3]?.communication?.result==='有效沟通').map(e=>leadRuleTime(e[3]?.recordedAt||e[1]));
  const candidates=[cycle,leadRuleTime(lead.lastEffectiveCommunicationAt),...effective].filter(t=>Number.isFinite(t)&&t<=now);
  const lastEffective=candidates.length?Math.max(...candidates):leadRuleTime(lead.ruleTrackedAt)||now;
  const due=leadRuleTime(lead.followupDeadlineAt===undefined?lead.next:lead.followupDeadlineAt);
  // 分配/再次激活的计时起点不是有效沟通，不能据此把新周期内的约定时间算作已完成。
  const realEffective=[leadRuleTime(lead.lastEffectiveCommunicationAt),...effective].filter(t=>Number.isFinite(t)&&(!Number.isFinite(cycle)||t>=cycle)&&t<=now);
  const latestReal=realEffective.length?Math.max(...realEffective):-Infinity;
  return {lastEffective,due,idle:now-lastEffective,overdue:Number.isFinite(due)&&(!Number.isFinite(cycle)||due>=cycle)&&latestReal<due?Math.max(0,now-due):0};
}
function leadRecycle(lead,reasons,now=Date.now(),system=true){
  if(lead.status==='recycle')return false;
  lead.previousOwner=lead.owner;lead.recycledAt=new Date(now).toISOString();lead.recycleReasons=[...reasons];
  lead.recycledFollowupAt=lead.followupDeadlineAt||lead.next;
  lead.owner='未分配';lead.assignees=[];lead.status='recycle';lead.stage='新线索';lead.next='未约定';lead.followupDeadlineAt='';lead.warningReasons=[];
  // 重新分配后以新周期跟进，原试听仍保留在档案中。
  myTrialRequests(lead).forEach(r=>{r.salesReturnedAt=lead.recycledAt;r.salesReturnReason='线索进入回收池'});
  if(system)lead.history.push(leadSystemHistoryEntry('自动回收',`${reasons.join('；')}。原负责人：${lead.previousOwner}；进入回收池等待重新分配。`));
  return true;
}
function leadEvaluateRules(now=Date.now()){
  let changed=false;
  for(const lead of leadState.leads){
    if(!['mine','assigned','warning'].includes(lead.status)||!lead.owner||lead.owner==='未分配'||lead.stage==='已报名')continue;
    if(!lead.ruleTrackedAt)lead.ruleTrackedAt=new Date(now).toISOString();
    const m=leadRuleMetrics(lead,now),recycle=[],warning=[];
    if(m.idle>=20*leadRuleDay)recycle.push('20天无有效沟通');
    if(m.overdue>72*leadRuleHour)recycle.push('超过约定跟进时间72小时未有效跟进');
    if(recycle.length){changed=leadRecycle(lead,recycle,now)||changed;continue}
    if(m.idle>15*leadRuleDay)warning.push('超过15天未有效沟通');
    if(m.overdue>24*leadRuleHour)warning.push('超过约定跟进时间24小时未有效跟进');
    if(warning.length){
      if(lead.status!=='warning'||JSON.stringify(lead.warningReasons)!==JSON.stringify(warning)){
        lead.status='warning';lead.warningReasons=warning;lead.warningAt=new Date(now).toISOString();
        lead.history.push(leadSystemHistoryEntry('跟进预警',warning.join('；')));changed=true;
      }
    }else if(lead.status==='warning'&&(lead.warningReasons?.length||lead.lastEffectiveCommunicationAt)){
      lead.status=leadHasOwner(lead)?'mine':'assigned';lead.warningReasons=[];lead.warningAt='';
      lead.history.push(leadSystemHistoryEntry('解除预警','已完成有效沟通，当前不满足预警条件。'));changed=true;
    }
  }
  return changed;
}
function leadRulesHTML(){
  return '<div class="academic-grid"><div class="lead-tip"><strong>预警规则</strong><p>① 超过15天未有效沟通；② 超过约定跟进时间24小时未有效跟进。</p></div><div class="lead-tip"><strong>回收池规则</strong><p>① 20天无有效沟通；② 超过约定跟进时间72小时未有效跟进；③ 销售主动选择“回公海”。</p></div></div><p class="help">未接通、暂不方便、无有效回复不重置有效沟通计时。达到回收条件后优先进入回收池；重新分配后重新计时，保留完整档案和跟进历史。</p>';
}
function leadRemindWarnings(){
  if(!permissionCanVisit('leadManage'))return;
  const rows=leadState.leads.filter(l=>l.status==='warning');
  rows.forEach(l=>l.history.push(leadHistoryEntry('提醒',`已记录提醒${l.owner}及时有效跟进。`)));
  toast(`已记录 ${rows.length} 条提醒（原型演示）`);
}
const leadRulesPreviousManagePage=leadManagePage;
leadManagePage=function(){
  const tab=leadState.manageTab;
  if(!['预警中','回收池'].includes(tab))return leadRulesPreviousManagePage();
  const warning=tab==='预警中',status=warning?'warning':'recycle';
  const rows=leadState.leads.map((l,index)=>({...l,index})).filter(l=>l.status===status);
  const tabs=[['新线索',countLead('new')],['回收池',countLead('recycle')],['预警中',countLead('warning')],['冷宫池',countLead('cold')],['已分配',countLead('mine')+countLead('assigned')]];
  return heading('线索管理','新线索、回收、预警、归档与已分配线索的管理入口')+`<div class="card pad">${leadSegments(tabs,tab,'setManageTab')}${leadRulesHTML()}<div class="lead-tip gold">${warning?'以下线索尚未达到回收条件，请及时有效跟进。 <button class="btn small right" onclick="leadRemindWarnings()">全部一键提醒</button>':'以下线索等待重新分配，交接时保留原有记录。'}</div>`+
    aTable(warning?['学生 / 家长','年级 · 学科','归属招生','约定跟进','预警原因','最近有效沟通 / 计时起点','操作']:['学生 / 家长','年级','意向学科','原负责人','回收原因','详情','分配'],rows.map(l=>{
      const m=leadRuleMetrics(l),reason=(warning?l.warningReasons:l.recycleReasons)||[];
      return warning?`<tr><td>${leadPerson(l)}</td><td>${esc(l.grade)} · ${esc(l.subject)}</td><td>${esc(l.owner)}</td><td>${esc(l.followupDeadlineAt?l.followupDeadlineAt.replace('T',' '):l.next||'未约定')}</td><td>${esc(reason.join('；')||'历史预警（时间待补充）')}${m.overdue?`<div class="help">约定已超时 ${Math.floor(m.overdue/leadRuleHour)} 小时</div>`:''}</td><td>${esc(new Date(m.lastEffective).toLocaleString('zh-CN'))}</td><td><button class="btn small" onclick="leadDetail(${l.index},'leadManage')">详情</button> <button class="btn small" onclick="remindLead(${l.index})">一键提醒</button></td></tr>`:
        `<tr><td>${leadPerson(l)}</td><td>${esc(l.grade)}</td><td>${esc(l.subject)}</td><td>${esc(l.previousOwner||'未记录')}</td><td>${esc(reason.join('；')||'历史回收记录')}</td><td><button class="btn small" onclick="leadDetail(${l.index},'leadManage')">详情</button></td><td><button class="btn small primary" onclick="leadState.selected=${l.index};leadState.modal='assign';leadRender()">分配</button></td></tr>`;
    }))+(!rows.length?'<div class="empty">暂无符合条件的线索</div>':'')+`<div class="data-bar">共 ${rows.length} 条线索</div></div>`;
};
const leadRulesPreviousRender=leadRender;
leadRender=function(){leadEvaluateRules();return leadRulesPreviousRender()};
setInterval(()=>{
  if(leadState.modal||leadState.trialAction)return;
  if(leadEvaluateRules()&&['myLeads','leadManage','leadTodo'].includes(state.page))render();
},60000);
