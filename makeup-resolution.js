// 不补课结算：一条缺课记录只能销课或返还课时一次。
a.lessonConsumptionRecords??=[];
a.lessonBalanceRecords??=[];
let makeupResolutionSequence=0;
function makeupResolutionKey(source){return JSON.stringify([source.student.id,source.cls.id,source.record.date,attendanceTimeKey(source.record.time),source.record.sessionId||source.record.session])}
function makeupExistingResolution(source){
  return source.record.makeupResolution||[...a.lessonConsumptionRecords,...a.lessonBalanceRecords].find(entry=>entry.sourceKey===makeupResolutionKey(source));
}
function makeupResolutionOpen(index){
  if(!permissionCanVisit('makeup'))return;
  const source=makeupSource(a.attendance[index]);if(!source)return;
  if(makeupExistingResolution(source)){makeupResolutionShow(index);return}
  if(!['请假','旷课'].includes(source.record.attendance)){toast('该记录已不属于待处理缺课记录');return}
  a.makeupResolutionDraft={source:source.record,sourceKey:makeupResolutionKey(source),attendance:source.record.attendance,actor:studentTermActor(),choice:''};
  a.modal='makeupResolution';academicRender();
}
function makeupResolutionContext(){
  const draft=a.makeupResolutionDraft;if(!draft||draft.actor!==studentTermActor()||!permissionCanVisit('makeup')||!a.attendance.includes(draft.source))return null;
  const source=makeupSource(draft.source);return source&&makeupResolutionKey(source)===draft.sourceKey?source:null;
}
function makeupResolutionChoose(value){if(!makeupResolutionContext()||!['consume','balance'].includes(value))return;a.makeupResolutionDraft.choice=value}
function makeupResolutionCancel(){a.makeupResolutionDraft=null;a.modal=null;academicRender()}
function makeupCourseBalance(studentId,course){return a.lessonBalanceRecords.filter(entry=>entry.studentId===studentId&&(!course||entry.course===course)).reduce((sum,entry)=>sum+(Number(entry.remainingUnits)||0),0)}
function makeupCommitResolution(source,type,origin='makeup'){
  if(!['consume','balance'].includes(type)||makeupExistingResolution(source))return null;
  const entry={id:'makeup-resolution-'+Date.now()+'-'+(++makeupResolutionSequence),sourceKey:makeupResolutionKey(source),type,origin,studentId:source.student.id,studentName:source.student.name,classId:source.cls.id,className:source.cls.name,course:source.cls.course,sessionId:source.record.sessionId||'',session:source.record.session,date:source.record.date,time:source.record.time,originalAttendance:source.record.attendance||'未考勤',units:1,recordedAt:new Date().toISOString(),operator:studentExamOperator()};
  if(type==='consume'){
    entry.attendance='未出勤销课';a.lessonConsumptionRecords.push(entry);source.record.attendance='未出勤销课';
  }else{
    entry.remainingUnits=1;a.lessonBalanceRecords.push(entry);
  }
  source.record.status='已考勤';source.record.makeup=origin==='attendance'?'无需补课':'不补课';source.record.makeupResolution=entry;
  if(source.record.makeupPlan){source.record.cancelledMakeupPlan={...source.record.makeupPlan,cancelledAt:entry.recordedAt};delete source.record.makeupPlan}
  return entry;
}
function makeupResolutionSave(){
  const source=makeupResolutionContext(),draft=a.makeupResolutionDraft;if(a.modal!=='makeupResolution'||!source)return;
  if(makeupExistingResolution(source)){toast('本课节已经处理，请勿重复操作');return}
  if(source.record.attendance!==draft.attendance||!['请假','旷课'].includes(source.record.attendance)){toast('出勤情况已变更，请重新打开处理窗口');return}
  if(!['consume','balance'].includes(draft.choice)){toast('请选择是否销课');return}
  const entry=makeupCommitResolution(source,draft.choice);if(!entry)return;
  makeupResolutionCancel();toast(entry.type==='consume'?'已销课，出勤情况记为“未出勤销课”':'已保留课时，该课程可用课时余额增加 1 次');
}
function makeupResolutionModal(){
  const source=makeupResolutionContext(),draft=a.makeupResolutionDraft;
  const close='<button class="btn" onclick="makeupResolutionCancel()">取消</button>';
  if(!source)return `<div class="modal-backdrop"><section class="modal"><p>记录已变更，请关闭后重试。</p>${close}</section></div>`;
  return `<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="makeup-resolution-title"><div class="modal-head"><h2 id="makeup-resolution-title">不补课 · 是否销课？</h2><button class="btn small" aria-label="关闭" onclick="makeupResolutionCancel()">×</button></div><p><strong>${esc(source.student.name)}</strong> · ${esc(source.record.attendance)}</p><p>${esc(source.cls.course)} / ${esc(source.cls.name)} · ${esc(source.record.session)}</p><p class="help">${esc(source.record.date)} ${esc(source.record.time)}</p><label class="subcard" style="display:block;cursor:pointer"><input type="radio" name="makeup-resolution-choice" value="consume" ${draft.choice==='consume'?'checked':''} onchange="makeupResolutionChoose(this.value)"> <strong>销课</strong><p class="help">生成 1 次销课记录，出勤情况改为“未出勤销课”，不增加课时余额。</p></label><label class="subcard" style="display:block;cursor:pointer"><input type="radio" name="makeup-resolution-choice" value="balance" ${draft.choice==='balance'?'checked':''} onchange="makeupResolutionChoose(this.value)"> <strong>不销课，计入课时余额</strong><p class="help">保留原出勤情况，原课程可用课时余额增加 1 次。当前余额：${makeupCourseBalance(source.student.id,source.cls.course)} 次。</p></label>${source.record.makeupPlan?'<p class="help">确认后将取消该缺课记录已安排的补课。</p>':''}<div class="modal-actions">${close}<button class="btn primary" onclick="makeupResolutionSave()">确认处理</button></div></section></div>`;
}
function makeupResolutionShow(index){
  if(!permissionCanVisit('makeup')&&!permissionCanVisit('attendance'))return;
  const source=makeupSource(a.attendance[index]),entry=source&&makeupExistingResolution(source);if(!entry)return;
  a.makeupLedgerView={type:entry.type,id:entry.id};a.modal='makeupLedger';academicRender();
}
function makeupOpenLedger(type){if(!permissionCanVisit('makeup')||!['consume','balance'].includes(type))return;a.makeupLedgerView={type};a.modal='makeupLedger';academicRender()}
function makeupLedgerModal(){
  if(!permissionCanVisit('makeup')&&!permissionCanVisit('attendance'))return '';
  const view=a.makeupLedgerView||{},balance=view.type==='balance',entries=(balance?a.lessonBalanceRecords:a.lessonConsumptionRecords).filter(entry=>!view.id||entry.id===view.id).slice().reverse();
  return `<div class="modal-backdrop"><section class="modal" style="width:1100px;max-width:95vw;max-height:85vh;overflow:auto" role="dialog" aria-modal="true" aria-labelledby="makeup-ledger-title"><div class="modal-head"><h2 id="makeup-ledger-title">${balance?'课时余额记录':'销课记录'}</h2><button class="btn small" onclick="a.modal=null;academicRender()">关闭</button></div>${aTable(['学生','课程 / 班级','原课节','原出勤情况',balance?'增加 / 可用课时':'销课数量 / 出勤情况','记录时间','记录人'],entries.map(entry=>`<tr><td>${esc(entry.studentName)}<div class="help">${esc(entry.studentId)}</div></td><td>${esc(entry.course)}<div class="help">${esc(entry.className)}</div></td><td>${esc(entry.session)}<div class="help">${esc(entry.date)} ${esc(entry.time)}</div></td><td>${esc(entry.originalAttendance)}</td><td>${balance?`+${entry.units} 次 / ${entry.remainingUnits} 次`:`${entry.units} 次<div class="help">未出勤销课</div>`}</td><td>${esc(studentProfileTime(entry.recordedAt))}</td><td>${esc(entry.operator.name)}</td></tr>`))}${entries.length?'':'<div class="empty">暂无记录</div>'}</section></div>`;
}
const makeupResolutionPreviousModal=modalPage;
modalPage=function(){
  if(a.modal==='makeupResolution')return makeupResolutionModal();
  if(a.modal==='makeupLedger')return makeupLedgerModal();
  if(/^attendance:\d+$/.test(a.modal||'')){
    const entry=a.attendance[Number(a.modal.split(':')[1])]?.makeupResolution;
    if(entry){a.makeupLedgerView={type:entry.type,id:entry.id};return makeupLedgerModal()}
    return makeupResolutionPreviousModal().replace('</select>','<option>未出勤销课</option></select>');
  }
  return makeupResolutionPreviousModal();
};
// 未出勤销课统一进入销课记录，不进入补课名单。
const makeupListViews=new Map();
function makeupListFilters(){const actor=studentTermActor();if(!makeupListViews.has(actor))makeupListViews.set(actor,{student:'',course:'',campus:'',status:''});return makeupListViews.get(actor)}
function makeupSetListFilter(key,value){const f=makeupListFilters();if(!Object.hasOwn(f,key))return;f[key]=value;$('#makeup-list-results').innerHTML=makeupListResults()}
makeupPage=function(){
  if(makeupPickerDraft())return makeupPickerPage();
  const f=makeupListFilters(),campuses=[...new Set(a.classes.map(c=>c.campus).filter(Boolean))];
  return aHeading('补课管理','从考勤中的请假、旷课记录安排补课')+`<div class="card pad"><div class="toolbar"><div class="filters" style="margin-bottom:0"><input class="input" placeholder="学生姓名、电话或ID" value="${esc(f.student)}" oninput="makeupSetListFilter('student',this.value)"><input class="input" placeholder="课程或班级名称" value="${esc(f.course)}" oninput="makeupSetListFilter('course',this.value)">${[['campus','全部校区',campuses],['status','全部补课状态',['未补课','已安排','已补课','不补课']]].map(([key,label,options])=>`<select class="select" aria-label="${label}" onchange="makeupSetListFilter('${key}',this.value)"><option value="">${label}</option>${options.map(value=>`<option${f[key]===value?' selected':''}>${esc(value)}</option>`).join('')}</select>`).join('')}</div></div><div class="toolbar"><div class="toolbar-right"><button class="btn" onclick="makeupOpenLedger('consume')">销课记录</button><button class="btn" onclick="makeupOpenLedger('balance')">课时余额</button></div></div><div id="makeup-list-results">${makeupListResults()}</div></div>`;
};
function makeupListResults(){
  const f=makeupListFilters(),contains=(values,query)=>!query.trim()||values.some(value=>String(value||'').toLowerCase().includes(query.trim().toLowerCase()));
  const rows=a.attendance.flatMap((record,index)=>{const source=makeupSource(record);return source&&record.attendance!=='未出勤销课'&&(['请假','旷课'].includes(record.attendance)||record.makeupResolution)?[{...source,index}]:[]}).filter(({record,student,cls})=>contains([student.id,student.name,student.phone],f.student)&&contains([cls.name,cls.course],f.course)&&(!f.campus||cls.campus===f.campus)&&(!f.status||(record.makeup||'未补课')===f.status));
  return aTable(['学生ID','姓名','联系电话','所属校区','授课方式','课程名称','班级名称','讲次','上课时间','出勤情况','补课状态','操作'],rows.map(({record:r,student:s,cls:c,info,index})=>{
    const resolution=makeupExistingResolution({record:r,student:s,cls:c}),plan=r.makeupPlan;
    const detail=resolution?(resolution.type==='consume'?'已销课 · 1 次':'已计入课时余额 · +1 次'):plan?`${esc(plan.className)}<br>${esc(plan.session)} · ${esc(plan.date)} ${esc(plan.time)}`:'';
    return `<tr><td>${esc(s.id)}</td><td>${esc(s.name)}</td><td>${esc(s.phone||'—')}</td><td>${esc(c.campus||'—')}</td><td>${esc(info.format||'—')}</td><td>${esc(c.course)}</td><td>${esc(c.name)}</td><td>${esc(r.session)}</td><td>${esc(r.date)} ${esc(r.time)}</td><td>${esc(r.attendance)}</td><td>${esc(r.makeup||'未补课')}${detail?`<div class="help">${detail}</div>`:''}</td><td><div class="actions">${resolution?`<a onclick="makeupResolutionShow(${index})">处理记录</a>`:`<a onclick="makeupOpenPicker(${index})">跟班补课</a><a onclick="makeupResolutionOpen(${index})">不补课</a>`}</div></td></tr>`;
  }))+(!rows.length?'<div class="empty">暂无符合条件的补课记录</div>':'')+`<div class="data-bar">共 ${rows.length} 条记录</div>`;
}
const makeupResolutionPreviousOpen=makeupOpenPicker,makeupResolutionPreviousConfirm=makeupConfirmPicker;
makeupOpenPicker=function(index){const source=makeupSource(a.attendance[index]);if(source&&makeupExistingResolution(source)){toast('本课节已处理，不可重复安排补课');return}return makeupResolutionPreviousOpen(index)};
makeupConfirmPicker=function(){const source=makeupPickerSource();if(source&&makeupExistingResolution(source)){toast('本课节已处理，不可重复安排补课');return}return makeupResolutionPreviousConfirm()};
const makeupResolutionPreviousSaveAttendance=saveAttendance;
saveAttendance=function(index){
  if(a.attendance[index]?.makeupResolution){toast('本课节已完成销课或课时返还，不可直接修改出勤情况');return}
  if($('#attendance-choice').value==='未出勤销课'){
    if(!permissionCanVisit('attendance')||a.modal!=='attendance:'+index)return;
    const source=makeupSource(a.attendance[index]);if(!source)return;
    if(!makeupCommitResolution(source,'consume','attendance')){toast('本课节已经处理，请勿重复销课');return}
    a.modal=null;academicRender();toast('已保存未出勤销课，计入销课记录');return;
  }
  return makeupResolutionPreviousSaveAttendance(index);
};
const makeupResolutionPreviousCourses=studentProfileCourses;
studentProfileCourses=function(student){
  const html=makeupResolutionPreviousCourses(student),entries=a.lessonBalanceRecords.filter(entry=>entry.studentId===student.id);if(!entries.length)return html;
  const courses=[...new Set(entries.map(entry=>entry.course))];
  return html+`<h2 class="section-title" style="margin-top:28px">课时余额</h2>${aTable(['课程','可用课时','来源'],courses.map(course=>`<tr><td>${esc(course)}</td><td>${makeupCourseBalance(student.id,course)} 次</td><td>不补课且不销课，保留的可用课时</td></tr>`))}`;
};
function makeupResolutionCleanup(){
  const draft=a.makeupResolutionDraft;
  if(draft&&(state.page!=='makeup'||draft.actor!==studentTermActor())){a.makeupResolutionDraft=null;if(a.modal==='makeupResolution')a.modal=null}
}
const makeupResolutionPreviousRender=render,makeupResolutionPreviousAcademicRender=academicRender;
render=function(){makeupResolutionCleanup();return makeupResolutionPreviousRender()};
academicRender=function(){makeupResolutionCleanup();return makeupResolutionPreviousAcademicRender()};
