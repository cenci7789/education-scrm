// 转课／班沿用临时调班的名称搜索组件，分别保存两种业务的草稿。
function transferDraft(){
  const studentId=a.students[a.selectedStudent]?.id||'',actor=studentTermActor();
  if(!a.transferDraft||a.transferDraft.studentId!==studentId||a.transferDraft.actor!==actor)a.transferDraft={studentId,actor,from:{id:'',query:'',session:''},to:{id:'',query:'',session:''},mode:'sessions',note:''};
  return a.transferDraft;
}
const transferPreviousSearchDraft=tempMoveDraft;
tempMoveDraft=function(){return state.page==='transfer'?transferDraft():transferPreviousSearchDraft()};
const transferPreviousMatches=tempMoveMatches;
tempMoveMatches=function(side){
  if(state.page!=='transfer')return transferPreviousMatches(side);
  const query=transferDraft()[side].query.trim().toLowerCase();
  return a.classes.map((cls,index)=>({...cls,index})).filter(cls=>!query||[cls.name,cls.course].some(value=>String(value||'').toLowerCase().includes(query)));
};
const transferPreviousPicker=tempMovePicker;
tempMovePicker=function(side){
  const html=transferPreviousPicker(side);
  return state.page==='transfer'?html.replace(/调出/g,'转出').replace(/调入/g,'转入').replace(/班级名称搜索/g,'课程或班级名称搜索').replace('输入班级名称搜索并选择','输入课程或班级名称搜索并选择'):html;
};
function transferSetMode(mode){if(['sessions','balance'].includes(mode))transferDraft().mode=mode}
function transferCancel(){a.transferDraft=null;academicRender()}
function transferModeFields(){
  const draft=transferDraft();
  return `<fieldset class="transfer-mode"><legend>转入方式</legend><label><input type="radio" name="transfer-mode" value="sessions" ${draft.mode==='sessions'?'checked':''} onchange="transferSetMode(this.value)"> 按课节转入</label><label><input type="radio" name="transfer-mode" value="balance" ${draft.mode==='balance'?'checked':''} onchange="transferSetMode(this.value)"> 按剩余费用转入</label></fieldset>`;
}
const transferPreviousFlowPage=flowPage;
flowPage=function(type){
  if(type!=='transfer')return transferPreviousFlowPage(type);
  const draft=transferDraft(),classOptions=a.classes.map(c=>c.name);
  let html=transferPreviousFlowPage(type);
  for(const [side,placeholder] of [['from','请选择转出课程／班级'],['to','请选择转入课程／班级']]){
    html=html.replace(aSelect('flow-'+side,classOptions,placeholder),()=>tempMovePicker(side));
  }
  html=html.replace(aSelect('flow-session',['第1讲','第2讲','第3讲'],'请选择讲次'),()=>`<div id="temp-move-session-to">${tempMoveSessionSelect('to')}</div>`);
  // 搜索组件更新课节控件时使用同一挂载点；转出端没有进班讲次输入。
  html=html.replace('<hr class="divider">',()=>`<div id="temp-move-session-from" hidden>${tempMoveSessionSelect('from')}</div>${transferModeFields()}<hr class="divider">`);
  html=html.replace('<h2 class="section-title">经办信息</h2>','');
  html=html.replace(aField('经办校区',aSelect('flow-campus',['城中校区','园区校区'],'请选择校区'),true),'');
  html=html.replace(aField('经办人',aSelect('flow-handler',['袁老师','陈老师'],'请选择经办人'),true),'');
  html=html.replace('<textarea class="textarea" maxlength="50" placeholder="请输入50字以内备注"></textarea>',()=>`<textarea class="textarea" id="transfer-note" maxlength="50" placeholder="请输入50字以内备注" oninput="transferDraft().note=this.value">${esc(draft.note)}</textarea>`);
  html=html.replace("onclick=\"nav('transfer')\"",'onclick="transferCancel()"');
  // 原有金额为演示数据，不能将其当作本次转课的真实结算结果。
  html=html.replace('<span>剩余学费</span>','<span>剩余学费（示例）</span>').replace('<span>已上讲次</span>','<span>已上讲次（示例）</span>').replace('<span>应收学费</span>','<span>应收学费（示例）</span>').replace('<span>预计差额</span>','<span>预计差额（示例）</span>');
  return html;
};
const transferPreviousFinishFlow=finishFlow;
finishFlow=function(type){
  if(type!=='transfer')return transferPreviousFinishFlow(type);
  if(!permissionCanVisit('transfer'))return;
  const draft=transferDraft();if(!draft.studentId){toast('请先选择学生');return}
  const from=a.classes.find(c=>c.id===draft.from.id),to=a.classes.find(c=>c.id===draft.to.id);
  if(!from||!to){toast('请搜索并选择转出、转入课程／班级');return}
  if(from.id===to.id){toast('转入班级不能与转出班级相同');return}
  const session=tempMoveSessions('to').find(s=>s.key===draft.to.session);if(!session){toast('请选择当前进入讲次');return}
  if(!['sessions','balance'].includes(draft.mode)){toast('请选择转入方式');return}
  (a.transferRecords??=[]).push({studentId:draft.studentId,fromClassId:from.id,fromClassName:from.name,toClassId:to.id,toClassName:to.name,startSessionId:session.key,startSession:session.label,mode:draft.mode,modeLabel:draft.mode==='sessions'?'按课节转入':'按剩余费用转入',note:draft.note,recordedAt:new Date().toISOString(),operator:studentExamOperator(),status:'待核算'});
  // 本页登记办理意向，不使用示例金额生成真实收费或转班结果。
  a.selectedStudent=null;a.transferDraft=null;academicRender();toast('转课办理信息已记录，待核算');
};
globalThis.addEventListener?.('click',event=>{if(state.page==='transfer'&&!event.target?.closest?.('.temp-move-picker'))for(const side of ['from','to'])tempMoveToggle(side,false)});
