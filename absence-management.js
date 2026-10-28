// 缺勤、补课和挂起均引用原考勤记录，避免生成重复课时。
const absenceViews=new Map();
function absenceView(){const actor=studentTermActor();if(!absenceViews.has(actor))absenceViews.set(actor,{tab:'缺勤记录'});return absenceViews.get(actor)}
function absenceRows(){
  return a.attendance.flatMap((record,index)=>{
    const source=makeupSource(record);if(!source)return [];
    const resolution=makeupExistingResolution(source),original=resolution?.originalAttendance||record.attendance;
    if(!['请假','旷课'].includes(original))return [];
    return [{...source,index,resolution,original,plan:record.makeupPlan}];
  });
}
const absenceTabs=['缺勤记录','补课记录','课消记录','课时挂起'];
function absenceTabRows(tab){
  return absenceRows().filter(row=>{
    if(tab==='缺勤记录')return !row.plan&&!row.resolution;
    if(tab==='补课记录')return Boolean(row.plan);
    if(tab==='课消记录')return row.resolution?.type==='consume';
    if(tab==='课时挂起')return row.resolution?.type==='balance'&&Number(row.resolution.remainingUnits)>0;
    return false;
  });
}
function absenceSetTab(tab){if(!absenceTabs.includes(tab))return;absenceView().tab=tab;makeupListFilters().status='';academicRender()}
function absenceStatus(row){return row.resolution?.type==='consume'?'已销课':row.resolution?.type==='balance'?'课时挂起':row.plan?(row.record.makeup||'已安排'):'待处理'}
makeupPage=function(){
  if(makeupPickerDraft())return makeupPickerPage();
  const f=makeupListFilters(),tab=absenceView().tab,campuses=[...new Set(absenceRows().map(row=>row.cls.campus).filter(Boolean))];
  return aHeading('缺勤管理','缺勤记录仅显示待处理项，处理后进入对应记录')+`<section class="card"><div class="tabs">${absenceTabs.map(name=>`<button class="tab${name===tab?' active':''}" onclick="absenceSetTab('${name}')">${name} ${absenceTabRows(name).length}</button>`).join('')}</div><div class="pad"><div class="toolbar"><div class="filters" style="margin-bottom:0"><input class="input" aria-label="搜索缺勤学生" placeholder="学生姓名、电话或ID" value="${esc(f.student)}" oninput="makeupSetListFilter('student',this.value)"><input class="input" aria-label="搜索缺勤课程或班级" placeholder="课程或班级名称" value="${esc(f.course)}" oninput="makeupSetListFilter('course',this.value)"><select class="select" aria-label="缺勤校区" onchange="makeupSetListFilter('campus',this.value)"><option value="">全部校区</option>${campuses.map(name=>`<option${f.campus===name?' selected':''}>${esc(name)}</option>`).join('')}</select><button class="btn small" onclick="Object.assign(makeupListFilters(),{student:'',course:'',campus:'',status:''});academicRender()">重置筛选</button></div></div><div id="makeup-list-results">${makeupListResults()}</div></div></section>`;
};
makeupListResults=function(){
  const tab=absenceView().tab,f=makeupListFilters(),contains=(values,query)=>!query.trim()||values.some(value=>String(value||'').toLowerCase().includes(query.trim().toLowerCase()));
  const rows=absenceTabRows(tab).filter(row=>contains([row.student.id,row.student.name,row.student.phone],f.student)&&contains([row.cls.name,row.cls.course],f.course)&&(!f.campus||row.cls.campus===f.campus));
  const detailTitle=tab==='补课记录'?'补课安排':tab==='课时挂起'?'挂起课时':tab==='课消记录'?'课消信息':'处理状态';
  return aTable(['学生 / 联系电话','课程 / 原班级','校区','缺勤课节','缺勤情况',detailTitle,'操作'],rows.map(row=>{
    const {record,student,cls,index,original,plan,resolution}=row;
    const detail=tab==='补课记录'?`<strong>${plan.type==='individual'?'单独补课':'跟班补课'}</strong> <span class="pill">${esc(record.makeup||'已安排')}</span><div>${esc(plan.className||cls.course)}</div><div class="help">${esc(plan.session||'')} · ${esc(plan.date)} ${esc(plan.time)}<br>${esc(plan.teacher||'—')} / ${esc(plan.campus||'—')} / ${esc(plan.room||'—')}</div>`:tab==='课时挂起'?`<strong>${Number(resolution.remainingUnits)||0} 次</strong><div class="help">${esc(studentProfileTime(resolution.recordedAt))}</div>`:tab==='课消记录'?`<strong>${Number(resolution.units)||1} 次 · 按出勤核销</strong><div class="help">${esc(studentProfileTime(resolution.recordedAt))}<br>${esc(resolution.operator?.name||'—')}</div>`:`${absenceStatus(row)}${plan?`<div class="help">${plan.type==='individual'?'单独补课':'跟班补课'} · ${esc(plan.date)}</div>`:''}`;
    return `<tr><td><strong>${esc(student.name)}</strong><div class="help">${esc(student.id)} · ${esc(student.phone||'—')}</div></td><td>${esc(cls.course)}<div class="help">${esc(cls.name)}</div></td><td>${esc(cls.campus||'—')}</td><td>${esc(record.session)}<div class="help">${esc(record.date)} ${esc(record.time)}</div></td><td>${esc(original)}</td><td>${detail}</td><td><div class="actions">${absenceActions(row,tab)}</div></td></tr>`;
  }))+(!rows.length?`<div class="empty">暂无符合条件的${tab}</div>`:'')+`<div class="data-bar">共 ${rows.length} 条记录</div>`;
};
function absenceActions(row,tab){
  if(row.resolution?.type==='balance'&&Number(row.resolution.remainingUnits)>0)return `<a onclick="absenceMakeupOpen(${row.index})">补课</a><a onclick="absenceHoldConsumeOpen(${row.index})">销课</a><a onclick="makeupResolutionShow(${row.index})">处理记录</a>`;
  if(row.plan)return `<a onclick="absencePlanShow(${row.index})">补课详情</a><a onclick="absenceAttendanceOpen(${row.index})">${row.record.makeup==='已补课'?'考勤记录':'考勤'}</a>`;
  if(row.resolution)return `<a onclick="makeupResolutionShow(${row.index})">处理记录</a>`;
  return `<a onclick="absenceMakeupOpen(${row.index})">补课</a><a onclick="makeupResolutionOpen(${row.index})">不补课</a>`;
}
function absenceMakeupOpen(index){
  if(!permissionCanVisit('makeup'))return;
  const source=makeupSource(a.attendance[index]);if(!absenceCanArrange(source)){toast('缺勤记录已处理，请刷新后查看');return}
  a.absenceDraft={source:source.record,sourceKey:makeupResolutionKey(source),holdId:makeupExistingResolution(source)?.id||'',actor:studentTermActor(),mode:'choose'};a.modal='absenceMakeup';academicRender();
}
function absenceDraftSource(){
  const draft=a.absenceDraft;if(!draft||draft.actor!==studentTermActor()||state.page!=='makeup'||!permissionCanVisit('makeup')||!a.attendance.includes(draft.source))return null;
  const source=makeupSource(draft.source);return source&&makeupResolutionKey(source)===draft.sourceKey?source:null;
}
function absenceCancel(){a.absenceDraft=null;a.modal=null;academicRender()}
function absenceCanArrange(source){
  if(!source||!['请假','旷课'].includes(source.record.attendance)||source.record.makeupPlan)return false;
  const resolution=makeupExistingResolution(source);return !resolution||(resolution.type==='balance'&&Number(resolution.remainingUnits)>0);
}
function absenceReleaseHold(source,destination){
  const entry=makeupExistingResolution(source);if(!entry)return true;
  if(entry.type!=='balance'||Number(entry.remainingUnits)<=0)return false;
  const patch={remainingUnits:0,releasedAt:new Date().toISOString(),releaseDestination:destination,releaseOperator:studentExamOperator()};
  for(const item of a.lessonBalanceRecords.filter(row=>row.id===entry.id))Object.assign(item,patch);
  Object.assign(entry,patch);source.record.makeupResolutionHistory??=[];source.record.makeupResolutionHistory.push({...entry});delete source.record.makeupResolution;return true;
}
function absenceCommitPlan(source,plan){
  if(!absenceCanArrange(source)||!absenceReleaseHold(source,'补课')){toast('本课节已处理，请刷新后查看');return false}
  source.record.makeupPlan={...plan,id:'makeup-plan-'+crypto.randomUUID(),sourceKey:makeupResolutionKey(source),createdAt:new Date().toISOString(),operator:studentExamOperator()};source.record.makeup='已安排';return true;
}
makeupOpenPicker=function(index){
  const source=makeupSource(a.attendance[index]);if(!permissionCanVisit('makeup')||!absenceCanArrange(source)){toast('本课节已处理，不可重复安排补课');return}
  // The base picker keeps the hold untouched until a valid lesson is confirmed.
  makeupResolutionPreviousOpen(index);
  if(makeupPickerDraft())makeupPickerDraft().holdId=makeupExistingResolution(source)?.id||'';
};
makeupConfirmPicker=function(){
  if(!permissionCanVisit('makeup'))return;
  const draft=makeupPickerDraft(),source=makeupPickerSource();if(!draft||!absenceCanArrange(source)){toast('原缺勤记录已变更，请重新进入');return}
  if((makeupExistingResolution(source)?.id||'')!==draft.holdId){toast('挂起记录已变更，请重新进入');return}
  const cls=a.classes.find(c=>c.id===draft.classId),lesson=cls&&attendanceLessons(cls).find(s=>s.key===draft.sessionId);
  if(!lesson){toast('请选择补课班级和课节');return}
  const reason=makeupLessonUnavailable(cls,lesson);if(reason){toast(reason+'，请重新选择课节');return}
  const plan={type:'follow',classId:cls.id,className:cls.name,course:cls.course,sessionId:lesson.key,session:lesson.label,sessionName:lesson.name,date:lesson.date,time:lesson.time,campus:cls.campus,teacher:lesson.teacher||cls.teacher,room:lesson.room||cls.room};
  if(!absenceCommitPlan(source,plan))return;
  absenceView().tab='补课记录';makeupCancelPicker();toast('跟班补课已安排');
};
function absenceTeacherOptions(campus){
  return [...new Set([...state.staff.filter(s=>s.active!==false&&(s.roleId==='teacher'||/教师|老师|主讲|授课/.test(s.roles||''))&&(!campus||staffCampusNames(s).includes(campus))).map(s=>s.name),...a.classes.filter(c=>!campus||c.campus===campus).map(c=>c.teacher)].filter(Boolean))];
}
function absenceChooseIndividual(){
  const source=absenceDraftSource();if(!absenceCanArrange(source))return;
  const campus=state.campuses.some(c=>c.active&&c.name===source.cls.campus)?source.cls.campus:state.campuses.find(c=>c.active)?.name||'';
  Object.assign(a.absenceDraft,{mode:'individual',campus,teacher:absenceTeacherOptions(campus).includes(source.cls.teacher)?source.cls.teacher:'',room:classCampusRooms(campus).some(r=>r.name===source.cls.room)?source.cls.room:'',date:'',start:'',end:''});academicRender();
}
function absenceIndividualChange(key,value){
  const source=absenceDraftSource(),draft=a.absenceDraft;if(!source||draft.mode!=='individual'||!['campus','teacher','room','date','start','end'].includes(key))return;
  draft[key]=value;if(key==='campus'){draft.teacher='';draft.room='';academicRender()}
}
function absenceIndividualModal(source){
  const draft=a.absenceDraft,select=(key,label,options)=>aField(label,`<select class="select" aria-label="${label}" onchange="absenceIndividualChange('${key}',this.value)"><option value="">请选择${label}</option>${options.map(value=>`<option${draft[key]===value?' selected':''}>${esc(value)}</option>`).join('')}</select>`,true);
  return `<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="absence-individual-title"><div class="modal-head"><h2 id="absence-individual-title">单独补课</h2><button class="btn small" aria-label="关闭" onclick="absenceCancel()">×</button></div><p><strong>${esc(source.student.name)}</strong> · ${esc(source.cls.course)} · 原${esc(source.record.session)}</p><div class="form-grid">${select('campus','补课校区',state.campuses.filter(c=>c.active).map(c=>c.name))}${select('teacher','补课教师',absenceTeacherOptions(draft.campus))}${select('room','补课教室',classCampusRooms(draft.campus).map(r=>r.name))}${[['date','补课日期','date'],['start','开始时间','time'],['end','结束时间','time']].map(([key,label,type])=>aField(label,`<input class="input" aria-label="${label}" type="${type}" value="${esc(draft[key])}" ${type==='date'?`min="${scheduleDateText(new Date())}"`:''} onchange="absenceIndividualChange('${key}',this.value)">`,true)).join('')}</div><p class="help">确认后在“补课记录”中生成一个补课课节，并在该记录上考勤。</p><div class="modal-actions"><button class="btn" onclick="absenceCancel()">取消</button><button class="btn primary" onclick="absenceIndividualSave()">确认补课</button></div></section></div>`;
}
function absenceIndividualSave(){
  const source=absenceDraftSource(),draft=a.absenceDraft;if(a.modal!=='absenceMakeup'||draft?.mode!=='individual'||!absenceCanArrange(source))return;
  if((makeupExistingResolution(source)?.id||'')!==draft.holdId){toast('挂起记录已变更，请重新打开');return}
  if(!state.campuses.some(c=>c.active&&c.name===draft.campus)||!absenceTeacherOptions(draft.campus).includes(draft.teacher)||!classCampusRooms(draft.campus).some(r=>r.name===draft.room)){toast('请选择有效的校区、教师和教室');return}
  if(!scheduleDate(draft.date)||![draft.start,draft.end].every(time=>/^([01]\d|2[0-3]):[0-5]\d$/.test(time))){toast('请填写完整的补课日期和时间');return}
  const start=Date.parse(draft.date+'T'+draft.start),end=Date.parse(draft.date+'T'+draft.end);
  if(start<=Date.now()||end<=start){toast('请选择尚未开始的时间，结束时间须晚于开始时间');return}
  const conflicts=[...scheduleLessons(),...absenceRows().filter(row=>row.plan?.type==='individual').map(row=>({teacher:row.plan.teacher,campus:row.plan.campus,room:row.plan.room,start:Date.parse(row.plan.date+'T'+attendanceTimeKey(row.plan.time).slice(0,5)),end:Date.parse(row.plan.date+'T'+attendanceTimeKey(row.plan.time).slice(-5))}))];
  if(conflicts.some(event=>event.start<end&&start<event.end&&(event.teacher===draft.teacher||(event.campus===draft.campus&&event.room===draft.room)))){toast('教师或教室在该时段已有排课，请调整补课时间');return}
  if(!absenceCommitPlan(source,{type:'individual',className:'单独补课',course:source.cls.course,session:'补课第1讲',date:draft.date,time:draft.start+'–'+draft.end,campus:draft.campus,teacher:draft.teacher,room:draft.room}))return;
  absenceView().tab='补课记录';absenceCancel();toast('单独补课已安排');
}
function absenceHoldConsumeOpen(index){
  if(!permissionCanVisit('makeup'))return;const source=makeupSource(a.attendance[index]),entry=source&&makeupExistingResolution(source);
  if(entry?.type!=='balance'||Number(entry.remainingUnits)<=0)return;
  a.absenceDraft={source:source.record,sourceKey:makeupResolutionKey(source),actor:studentTermActor(),holdId:entry.id,mode:'consumeHold'};a.modal='absenceMakeup';academicRender();
}
function absenceHoldConsumeModal(source){return `<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-label="挂起课时销课"><h2>挂起课时销课</h2><p>${esc(source.student.name)} · ${esc(source.cls.course)} · ${esc(source.record.session)}</p><p>确认将该挂起课时销课？确认后挂起课时减少 1 次，原课节记为“未出勤销课”。</p><div class="modal-actions"><button class="btn" onclick="absenceCancel()">取消</button><button class="btn primary" onclick="absenceHoldConsumeSave()">确认销课</button></div></section></div>`}
function absenceHoldConsumeSave(){
  const source=absenceDraftSource(),draft=a.absenceDraft,entry=source&&makeupExistingResolution(source);
  if(a.modal!=='absenceMakeup'||draft?.mode!=='consumeHold'||entry?.type!=='balance'||entry.id!==draft.holdId||Number(entry.remainingUnits)<=0)return;
  if(!absenceReleaseHold(source,'销课'))return;
  makeupCommitResolution(source,'consume');absenceCancel();toast('挂起课时已销课');
}
function absenceChooseFollow(){
  const source=absenceDraftSource();if(!absenceCanArrange(source))return;
  const index=a.attendance.indexOf(source.record);a.absenceDraft=null;a.modal=null;makeupOpenPicker(index);
}
function absenceMakeupModal(){
  const source=absenceDraftSource();if(!source)return `<div class="modal-backdrop"><section class="modal"><p>记录已变更，请重新打开。</p><button class="btn" onclick="absenceCancel()">关闭</button></section></div>`;
  if(a.absenceDraft.mode==='individual')return absenceIndividualModal(source);
  if(a.absenceDraft.mode==='consumeHold')return absenceHoldConsumeModal(source);
  return `<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="absence-makeup-title"><div class="modal-head"><h2 id="absence-makeup-title">补课 · 选择补课方式</h2><button class="btn small" aria-label="关闭" onclick="absenceCancel()">×</button></div><p><strong>${esc(source.student.name)}</strong> · ${esc(source.cls.course)} · ${esc(source.record.session)}</p><div class="form-actions"><button class="btn primary" onclick="absenceChooseFollow()">跟班补课</button><button class="btn" onclick="absenceChooseIndividual()">单独补课</button></div><p class="help">跟班补课：选择已有班级的课节。单独补课：为该学生单独安排补课时间。</p></section></div>`;
}
function absencePlanShow(index){
  if(!permissionCanVisit('makeup'))return;const record=a.attendance[index];if(!record?.makeupPlan)return;
  a.absencePlanView={source:record,actor:studentTermActor()};a.modal='absencePlan';academicRender();
}
function absencePlanModal(){
  const view=a.absencePlanView,source=view?.actor===studentTermActor()&&a.attendance.includes(view.source)?makeupSource(view.source):null,plan=source?.record.makeupPlan;
  const close='<button class="btn" onclick="a.modal=null;a.absencePlanView=null;academicRender()">关闭</button>';
  if(!plan)return `<div class="modal-backdrop"><section class="modal"><p>补课记录已变更。</p>${close}</section></div>`;
  return `<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="absence-plan-title"><div class="modal-head"><h2 id="absence-plan-title">补课详情 · ${esc(source.student.name)}</h2>${close}</div><p>补课方式：${plan.type==='individual'?'单独补课':'跟班补课'}</p><p>课程 / 班级：${esc(plan.course||source.cls.course)} / ${esc(plan.className||'单独补课')}</p><p>课节：${esc(plan.session||'—')}</p><p>上课时间：${esc(plan.date)} ${esc(plan.time)}</p><p>授课教师：${esc(plan.teacher||'—')}</p><p>校区 / 教室：${esc(plan.campus||'—')} / ${esc(plan.room||'—')}</p><p>状态：${esc(source.record.makeup)}</p></section></div>`;
}
function absenceAttendanceOpen(index){
  if(!permissionCanVisit('makeup'))return;const record=a.attendance[index];if(!record?.makeupPlan)return;
  a.absenceAttendanceDraft={source:record,planId:record.makeupPlan.id||record.makeupPlan.createdAt,actor:studentTermActor()};a.modal='absenceAttendance';academicRender();
}
function absenceAttendanceContext(){
  const draft=a.absenceAttendanceDraft;if(!draft||draft.actor!==studentTermActor()||!permissionCanVisit('makeup')||state.page!=='makeup'||!a.attendance.includes(draft.source))return null;
  const source=makeupSource(draft.source),plan=source?.record.makeupPlan;return plan&&(plan.id||plan.createdAt)===draft.planId?{...source,plan}:null;
}
function absenceAttendanceModal(){
  const source=absenceAttendanceContext(),close='<button class="btn" onclick="a.modal=null;a.absenceAttendanceDraft=null;academicRender()">关闭</button>';
  if(!source)return `<div class="modal-backdrop"><section class="modal"><p>补课记录已变更，请重新打开。</p>${close}</section></div>`;
  const {student,plan,record}=source,done=record.makeup==='已补课',ended=Date.parse(plan.date+'T'+attendanceTimeKey(plan.time).slice(-5))<=Date.now();
  return `<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="absence-attendance-title"><div class="modal-head"><h2 id="absence-attendance-title">补课考勤 · ${esc(student.name)}</h2>${close}</div><p>${plan.type==='individual'?'单独补课':'跟班补课'} · ${esc(plan.session)} · ${esc(plan.date)} ${esc(plan.time)}</p>${aTable(['学生','出勤情况'],[`<tr><td>${esc(student.name)}<div class="help">${esc(student.id)}</div></td><td>${done?esc(plan.attendance):`<select class="select" id="absence-attendance-choice" aria-label="补课出勤情况" ${ended?'':'disabled'}><option value="">请选择出勤情况</option>${['出勤','迟到','早退','请假','旷课'].map(value=>`<option${plan.attendance===value?' selected':''}>${value}</option>`).join('')}</select>`}</td></tr>`])}<p class="help">${done?'已完成补课并记录课时处理结果。':ended?'补课出勤后仅核销原缺勤课节 1 次；请假或旷课不销课。':'本补课课节尚未结束，结束后可登记考勤。'}</p>${plan.attendanceAt?`<p class="help">记录时间：${esc(studentProfileTime(plan.attendanceAt))} · ${esc(plan.attendanceOperator?.name||'—')}</p>`:''}<div class="modal-actions">${close}${!done&&ended?'<button class="btn primary" onclick="absenceAttendanceSave()">保存考勤</button>':''}</div></section></div>`;
}
function absenceAttendanceSave(){
  const source=absenceAttendanceContext();if(a.modal!=='absenceAttendance'||!source||source.record.makeup==='已补课')return;
  const {record,plan}=source,value=$('#absence-attendance-choice').value,end=Date.parse(plan.date+'T'+attendanceTimeKey(plan.time).slice(-5));
  if(!Number.isFinite(end)||end>Date.now()){toast('补课课节结束后才能登记考勤');return}
  if(!['出勤','迟到','早退','请假','旷课'].includes(value)){toast('请选择出勤情况');return}
  if(makeupExistingResolution(source)){toast('本课节已经处理，请勿重复操作');return}
  const attended=['出勤','迟到','早退'].includes(value),at=new Date().toISOString(),operator=studentExamOperator();
  Object.assign(plan,{attendance:value,attendanceAt:at,attendanceOperator:operator});record.makeup=attended?'已补课':'补课未出勤';
  if(attended&&!record.trialRequestId){
    const entry={id:'makeup-consumption-'+crypto.randomUUID(),sourceKey:makeupResolutionKey(source),type:'makeup',origin:'makeupAttendance',studentId:source.student.id,studentName:source.student.name,classId:source.cls.id,className:source.cls.name,course:source.cls.course,sessionId:record.sessionId||'',session:record.session,date:record.date,time:record.time,originalAttendance:record.attendance,attendance:value,units:1,recordedAt:at,operator,makeupPlanId:plan.id};
    businessStampAttendance(entry);a.lessonConsumptionRecords.push(entry);record.makeupResolution=entry;
  }
  a.modal=null;a.absenceAttendanceDraft=null;academicRender();toast(attended?'补课考勤已保存，原缺勤课节已核销':'补课考勤已保存，本次未销课');
}
const absencePreviousAttendanceChoice=attendanceLessonChoiceHTML;
attendanceLessonChoiceHTML=function(record,index){
  if(record?.makeupPlan)return `<select class="select" id="attendance-lesson-student-${index}" disabled><option selected>${esc(record.attendance)}</option></select><div class="help">已安排补课，请在补课记录中考勤。</div>`;
  return absencePreviousAttendanceChoice(record,index);
};
const absencePreviousAttendanceSave=attendanceSaveLesson;
attendanceSaveLesson=function(){
  const context=attendanceLessonContext();if(context&&context.entries.some((entry,index)=>entry.record?.makeupPlan&&$('#attendance-lesson-student-'+index).value!==entry.record.attendance)){toast('已安排补课的原缺勤记录不可修改');return}
  return absencePreviousAttendanceSave();
};
const absencePreviousLegacyAttendanceSave=saveAttendance;
saveAttendance=function(index){if(a.attendance[index]?.makeupPlan){toast('已安排补课，请在补课记录中考勤');return}return absencePreviousLegacyAttendanceSave(index)};
const absencePreviousModal=modalPage;
modalPage=function(){if(a.modal==='absenceMakeup')return absenceMakeupModal();if(a.modal==='absencePlan')return absencePlanModal();if(a.modal==='absenceAttendance')return absenceAttendanceModal();return absencePreviousModal()};
function absenceCleanup(){
  if(a.absenceDraft&&(state.page!=='makeup'||a.absenceDraft.actor!==studentTermActor())){a.absenceDraft=null;if(a.modal==='absenceMakeup')a.modal=null}
  if(a.absencePlanView&&(state.page!=='makeup'||a.absencePlanView.actor!==studentTermActor())){a.absencePlanView=null;if(a.modal==='absencePlan')a.modal=null}
  if(a.absenceAttendanceDraft&&(state.page!=='makeup'||a.absenceAttendanceDraft.actor!==studentTermActor())){a.absenceAttendanceDraft=null;if(a.modal==='absenceAttendance')a.modal=null}
}
const absencePreviousRender=render,absencePreviousAcademicRender=academicRender;
render=function(){absenceCleanup();return absencePreviousRender()};
academicRender=function(){absenceCleanup();return absencePreviousAcademicRender()};
