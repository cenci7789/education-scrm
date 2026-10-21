// 当前原型沿用固定登录人；保存姓名与账号快照，后续改派不影响历史操作人。
const leadDemoOperator={name:shortcutUser,account:'wangmin'};
function leadCurrentOperator(){return {...leadDemoOperator}}
function leadStaffIdentity(staff){
  return {name:staff.name,account:staff.account||staff.phone||''};
}
function leadIdentityLabel(person){
  return person?person.name+'-'+(person.account||'账号未记录'):'未记录';
}
function leadHistoryEntry(title,text,attachment={},when=new Date().toLocaleString('zh-CN')){
  return [title,when,text,{...attachment,recordedAt:new Date().toISOString(),operator:leadCurrentOperator()}];
}
function leadSystemHistoryEntry(title,text){
  return [title,new Date().toLocaleString('zh-CN'),text,{recordedAt:new Date().toISOString(),operator:{name:'系统',account:'system'}}];
}
function leadHistoryOperatorHTML(attachment){
  const person=attachment?.operator;
  const fallback=attachment?.communication?.actor;
  const label=person?leadIdentityLabel(person):fallback?leadIdentityLabel({name:fallback,account:attachment.communication.actorAccount||''}):'未记录';
  return `<span class="lead-event-operator">操作人：${esc(label)}</span>`;
}
function leadRegistrationBody(lead,assignment){
  return `就读年级：${lead.grade||'未填'}，意向校区：${lead.campus||'待定'}，意向学科：${lead.subject||'待定'}\n分配咨询：${assignment}${lead.note?'\n'+lead.note:''}`;
}
function leadRegistrationAssignment(mode,assignee){
  return mode==='uniform'?'统一分配':mode==='specific'?(Array.isArray(assignee)?assignee:[assignee]).map(person=>leadIdentityLabel(leadStaffIdentity(person))).join('、'):leadIdentityLabel(leadCurrentOperator());
}

// 原型已有建档示例同步展示格式；无法确认的历史操作人保留“未记录”。
for(const lead of leadState.leads){
  for(const record of lead.history){
    if(record[0]!=='建档')continue;
    const owner=lead.owner===shortcutUser?leadCurrentOperator():state.staff.find(person=>person.name===lead.owner);
    const assignment=lead.owner==='未分配'?'统一分配':leadIdentityLabel(owner?leadStaffIdentity(owner):{name:lead.owner,account:''});
    record[2]=leadRegistrationBody({...lead,note:lead.note||record[2]},assignment);
    record[3]={...record[3],operator:lead.registrar===shortcutUser?leadCurrentOperator():null};
  }
}
