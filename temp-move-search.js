// 临时调班单独使用可搜索班级选择器，其余业务表单保持原样。
function flowStudentSummary(student){
  const select="a.modal='selectStudent';academicRender()";
  if(!student)return `<div class="toolbar"><button class="btn primary" onclick="${select}">选择学生</button></div>`;
  const enrollments=typeof studentTermEnrollments==='function'?studentTermEnrollments().filter(row=>row.studentId===student.id&&!['已退班','已退费','已取消','已转班','已结课'].includes(row.status)):[];
  const count=new Set(enrollments.map(row=>row.classId||row.className).filter(Boolean)).size;
  const campus=student.campus||[...new Set(enrollments.map(row=>row.campus).filter(Boolean))].join('、')||'未设置校区';
  return `<div class="flow-student-summary"><div class="flow-student-main"><div class="flow-student-line"><strong>${esc(student.name)}</strong><span>${esc(student.phone||'未填写联系电话')}</span><span>${count} 个已报名课程 / 班级</span></div><div class="flow-student-campus">${esc(campus)}</div></div><button class="btn small" onclick="${select}">重新选择</button></div>`;
}
function tempMoveDraft(){
  const studentId=a.students[a.selectedStudent]?.id||'',actor=studentTermActor();
  if(!a.tempMoveDraft||a.tempMoveDraft.studentId!==studentId||a.tempMoveDraft.actor!==actor)a.tempMoveDraft={studentId,actor,from:{id:'',query:'',session:''},to:{id:'',query:'',session:''},note:''};
  return a.tempMoveDraft;
}
function tempMoveMatches(side){const query=tempMoveDraft()[side].query.trim().toLowerCase();return a.classes.map((cls,index)=>({...cls,index})).filter(cls=>!query||String(cls.name).toLowerCase().includes(query))}
function tempMoveOptions(side){
  const rows=tempMoveMatches(side);
  return rows.map(cls=>`<button type="button" role="option" aria-selected="${tempMoveDraft()[side].id===cls.id}" class="temp-move-option" onclick="tempMoveChoose('${side}',${cls.index})"><strong>${esc(cls.name)}</strong><small>${esc(cls.campus||'—')} · ${esc(cls.teacher||'—')} · 班级ID：${esc(cls.id)}</small></button>`).join('')||'<div class="temp-move-no-results">暂无匹配班级，请修改名称重新搜索。</div>';
}
function tempMovePicker(side){
  const selected=tempMoveDraft()[side];
  return `<div class="temp-move-picker"><input type="hidden" id="flow-${side}" value="${esc(selected.id)}"><div class="temp-move-search-row"><input class="input" id="temp-move-search-${side}" role="combobox" aria-label="${side==='from'?'调出':'调入'}班级名称搜索" aria-autocomplete="list" aria-expanded="false" aria-controls="temp-move-options-${side}" placeholder="输入班级名称搜索并选择" autocomplete="off" value="${esc(selected.query)}" oninput="tempMoveSearch('${side}',this.value)" onfocus="tempMoveToggle('${side}',true)" onkeydown="tempMoveKey('${side}',event)"><button type="button" class="temp-move-toggle" aria-label="展开${side==='from'?'调出':'调入'}班级选项" onclick="tempMoveToggle('${side}')">⌄</button></div><div class="temp-move-options" id="temp-move-options-${side}" role="listbox" aria-label="${side==='from'?'调出':'调入'}班级备选项" hidden>${tempMoveOptions(side)}</div></div>`;
}
function tempMoveToggle(side,open){
  if(!['from','to'].includes(side))return;
  const panel=$('#temp-move-options-'+side);if(!panel)return;
  const show=open??panel.hidden;
  for(const key of ['from','to']){const options=$('#temp-move-options-'+key),input=$('#temp-move-search-'+key);if(options)options.hidden=key===side?!show:true;input?.setAttribute('aria-expanded',String(key===side&&show))}
}
function tempMoveSearch(side,value){
  if(!['from','to'].includes(side))return;
  Object.assign(tempMoveDraft()[side],{query:value,id:'',session:''});$('#flow-'+side).value='';
  $('#temp-move-options-'+side).innerHTML=tempMoveOptions(side);$('#temp-move-session-'+side).innerHTML=tempMoveSessionSelect(side);tempMoveToggle(side,true);
}
function tempMoveChoose(side,index){
  if(!['from','to'].includes(side))return;
  const cls=a.classes[index];if(!cls)return;
  Object.assign(tempMoveDraft()[side],{id:cls.id,query:cls.name,session:''});$('#flow-'+side).value=cls.id;$('#temp-move-search-'+side).value=cls.name;
  $('#temp-move-session-'+side).innerHTML=tempMoveSessionSelect(side);$('#temp-move-options-'+side).innerHTML=tempMoveOptions(side);tempMoveToggle(side,false);
}
function tempMoveKey(side,event){
  if(event.key==='Escape'){tempMoveToggle(side,false);return}
  if(event.key==='ArrowDown'){event.preventDefault();tempMoveToggle(side,true);$('#temp-move-options-'+side)?.querySelector('button')?.focus();return}
  if(event.key==='Enter'){event.preventDefault();const first=tempMoveMatches(side)[0];if(first)tempMoveChoose(side,first.index)}
}
function tempMoveSessions(side){const cls=a.classes.find(c=>c.id===tempMoveDraft()[side].id);return cls?attendanceLessons(cls):[]}
function tempMoveSessionSelect(side){
  const d=tempMoveDraft()[side],sessions=tempMoveSessions(side);
  return `<select class="select" id="flow-${side}-session" ${!d.id||!sessions.length?'disabled':''} onchange="tempMoveDraft()['${side}'].session=this.value"><option value="">${!d.id?'请先选择班级':sessions.length?'请选择讲次':'该班级暂无课节'}</option>${sessions.map(s=>`<option value="${esc(s.key)}"${d.session===s.key?' selected':''}>${esc(s.label)} · ${esc(s.name||'')} · ${esc(s.date||'待排课')} ${esc(s.time)}</option>`).join('')}</select>`;
}
function tempMoveCancel(){a.tempMoveDraft=null;academicRender()}
const tempMovePreviousFlowPage=flowPage;
flowPage=function(type){
  if(type!=='tempMove')return tempMovePreviousFlowPage(type);
  const draft=tempMoveDraft(),student=a.students[a.selectedStudent];
  return aHeading('临时调班','为学生调整指定讲次的班级')+`<div class="card pad">${flowStudentSummary(student)}<p class="academic-note">直播、录播和磨励课程暂不支持临时调班。</p><div class="flow-layout">${['from','to'].map((side,index)=>`${index?'<div class="flow-arrow">→</div>':''}<div class="flow-card"><h2 class="section-title">${side==='from'?'调出信息':'调入信息'}</h2>${aField('选择班级',tempMovePicker(side),true)}<div style="margin-top:16px">${aField('选择讲次',`<div id="temp-move-session-${side}">${tempMoveSessionSelect(side)}</div>`,true)}</div></div>`).join('')}</div><hr class="divider"><div class="form-grid"><div class="field full"><label for="temp-move-note">备注</label><textarea class="textarea" id="temp-move-note" maxlength="50" placeholder="请输入50字以内备注" oninput="tempMoveDraft().note=this.value">${esc(draft.note)}</textarea></div></div><div class="form-actions"><button class="btn" onclick="tempMoveCancel()">取消</button><button class="btn primary" onclick="finishFlow('tempMove')">确定</button></div></div>`;
};
const tempMovePreviousFinishFlow=finishFlow;
finishFlow=function(type){
  if(type!=='tempMove')return tempMovePreviousFinishFlow(type);
  if(!permissionCanVisit('tempMove'))return;
  const draft=tempMoveDraft();if(!draft.studentId){toast('请先选择学生');return}
  for(const side of ['from','to']){
    if(!a.classes.some(c=>c.id===draft[side].id)){toast(`请搜索并选择${side==='from'?'调出':'调入'}班级`);return}
    if(!tempMoveSessions(side).some(s=>s.key===draft[side].session)){toast(`请选择${side==='from'?'调出':'调入'}讲次`);return}
  }
  tempMovePreviousFinishFlow(type);
};
globalThis.addEventListener?.('click',event=>{if(state.page==='tempMove'&&!event.target?.closest?.('.temp-move-picker'))for(const side of ['from','to'])tempMoveToggle(side,false)});
