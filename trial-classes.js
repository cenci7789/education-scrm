function trialAvailableClass(c){
  return ['未开课','开课中'].includes(classScheduleStatus(c))&&a.courses.some(x=>x.active&&x.name===c.course)&&state.campuses.some(x=>x.active&&x.name===c.campus);
}
function trialCaptureIntention(){
  const d=trialState.draft,note=$('#trial-note');
  if(note)d.note=note.value.trim();
}
function trialClassFilters(){
  const d=trialState.draft;
  if(!d.classFilters||d.classFilterGrade!==d.grade){
    d.classFilters={...(d.classFilters||{}),grade:d.grade||''};
    d.classFilterGrade=d.grade;
  }
  return d.classFilters;
}
function trialFilteredClasses(){
  const f=trialClassFilters(),now=Date.now();
  return a.classes.filter(trialAvailableClass).map(c=>({...enrollmentClassInfo(c),nextSession:trialUpcomingSessions(c,now).find(s=>!s.cancelled)})).filter(c=>
    ['grade','subject','classType','campus','term','teacher','format'].every(key=>!f[key]||(key==='grade'?enrollmentGradeKey(c[key])===enrollmentGradeKey(f[key]):c[key]===f[key]))&&
    (!f.time||c.nextSession&&enrollmentTimeBand(trialSessionDisplay(c.nextSession).startTime)===f.time)&&(!f.search||c.name.toLowerCase().includes(f.search.trim().toLowerCase())))
    .sort((left,right)=>(left.nextSession?new Date(left.nextSession.startsAt).getTime():Infinity)-(right.nextSession?new Date(right.nextSession.startsAt).getTime():Infinity));
}
function trialClassFilterFields(){
  const f=trialClassFilters(),classes=a.classes.filter(trialAvailableClass).map(enrollmentClassInfo);
  return [['grade','年级'],['subject','科目'],['classType','班型'],['campus','校区'],['term','学期'],['teacher','老师'],['time','时间'],['format','授课形式']].map(([key,label])=>{
    const values=key==='time'?['上午','下午','晚上']:key==='format'?['面授','直播']:[...new Set([...(key==='grade'?[trialState.draft.grade]:[]),...classes.map(c=>c[key])].filter(Boolean))];
    const names={上午:'上午 6:00–12:00',下午:'下午 12:00–18:00',晚上:'晚上 18:00–22:00'};
    return `<div class="field"><label for="trial-filter-${key}">${label}</label><select class="select" id="trial-filter-${key}" onchange="trialSetClassFilter('${key}',this.value)"><option value="">全部${label}</option>${values.map(value=>`<option value="${esc(value)}" ${f[key]===value?'selected':''}>${esc(key==='time'?names[value]:value)}</option>`).join('')}</select></div>`;
  }).join('')+`<div class="field enrollment-class-search"><label for="trial-filter-search">搜索班级名称</label><input class="input" id="trial-filter-search" placeholder="请输入班级名称" value="${esc(f.search||'')}" oninput="trialSetClassFilter('search',this.value)"></div>`;
}
function trialSetClassFilter(key,value){
  trialClassFilters()[key]=value;
  $('#trial-class-results').innerHTML=trialClassResults();
}
function trialResetClassFilters(){trialCaptureIntention();trialState.draft.classFilters={};render()}
function trialClassResults(){
  const rows=trialFilteredClasses(),ids=trialState.draft.classes.map(item=>item.classId);
  return aTable(['班级名称','年级','科目','班型','校区','学期','老师','下节课上课时间','授课形式','在班人数','操作'],rows.map(c=>{
    const next=c.nextSession?trialSessionDisplay(c.nextSession):null;
    return `<tr><td><strong>${esc(c.name)}</strong><div class="help">${esc(c.course)}</div></td><td>${esc(c.grade||'—')}</td><td>${esc(c.subject||'—')}</td><td>${esc(c.classType||'—')}</td><td>${esc(c.campus)}</td><td>${esc(c.term||'—')}</td><td>${esc(c.teacher)}</td><td>${next?`${trialSessionDateHtml(next)}<br>${esc(next.time)}`:'<span class="help">暂无后续课节</span>'}</td><td>${esc(c.format)}</td><td>${c.students}/${c.capacity}</td><td><button class="btn small" data-class-id="${esc(c.id)}" onclick="trialOpenSessions(this.dataset.classId)">${ids.includes(c.id)?'更换课节':'选择课节'}</button></td></tr>`;
  }))+
    `<p class="help">${rows.length?'共 '+rows.length+' 个班级':'没有符合筛选条件的班级，请调整筛选条件。'}</p>`;
}
function trialToggleClass(id,checked){
  if(checked&&!a.classes.some(c=>c.id===id&&trialAvailableClass(c)))return;
  trialCaptureIntention();
  const d=trialState.draft;
  if(checked){if(!d.classes.some(item=>item.classId===id))d.classes.push({classId:id,preferredTime:''})}
  else d.classes=d.classes.filter(item=>item.classId!==id);
  $('#trial-class-count').textContent=String(d.classes.length);
  $('#trial-selected-settings').innerHTML=d.classes.length?trialSelectedTable(d):'';
  $('#trial-class-results').innerHTML=trialClassResults();
}
function trialIntentionItems(d){
  return d.classes.map(item=>{
    const c=a.classes.find(c=>c.id===item.classId);
    const session=c&&trialClassSessions(c).find(s=>s.id===item.sessionId);
    return {requestedClassId:item.classId,requestedClassName:c?.name||'班级已移除',requestedSessionId:item.sessionId||'',requestedSessionName:item.sessionName||'',requestedEndTime:session?trialSessionEndTime(session):'',course:c?.course||'',campus:c?.campus||'',preferredTime:item.preferredTime||''};
  });
}
function trialValidateClasses(d){
  if(!d.classes.length){toast('请至少选择一个试听班级');return false}
  if(new Set(d.classes.map(item=>item.classId)).size!==d.classes.length){toast('请勿重复选择班级');return false}
  if(d.classes.some(item=>!a.classes.some(c=>c.id===item.classId&&trialAvailableClass(c)))){toast('部分班级已不可预约，请重新选择');return false}
  if(d.classes.some(item=>!item.sessionId||!item.preferredTime)){toast('请为每个班级选择实际试听课节');return false}
  if(d.classes.some(item=>item.sessionId&&!trialClassSessions(a.classes.find(c=>c.id===item.classId)).some(s=>s.id===item.sessionId&&!s.cancelled&&s.startsAt===item.preferredTime&&trialFuture(s.startsAt)))){toast('所选课节已变更或不可预约，请重新选择课节');return false}
  if(d.classes.some(item=>item.preferredTime&&!trialFuture(item.preferredTime))){toast('试听时间须晚于当前时间，请重新选择课节');return false}
  return true;
}
function trialRemoveClass(index){const item=trialState.draft.classes[index];if(item)trialToggleClass(item.classId,false)}
function trialSelectedTable(d,editable=true){
  if(!d.classes.length)return '<div class="empty">尚未选择试听班级</div>';
  return aTable(['预约班级','科目 / 年级','校区','老师 / 授课形式','试听时间',...(editable?['操作']:[])],d.classes.map((item,index)=>{
    const raw=a.classes.find(c=>c.id===item.classId),c=raw?enrollmentClassInfo(raw):{};
    return `<tr><td><strong>${esc(c.name||'班级已移除')}</strong><div class="help">${esc(c.term||'')} · ${esc(c.classType||'')}</div></td><td>${esc(c.subject||'—')} / ${esc(c.grade||'—')}</td><td>${esc(c.campus||'—')}</td><td>${esc(c.teacher||'—')} / ${esc(c.format||'—')}</td><td>${esc(item.preferredTime?item.preferredTime.replace('T',' '):'待教务安排')}<div class="help">${esc(item.sessionName||'')}</div></td>${editable?`<td><button class="btn small" onclick="trialRemoveClass(${index})">移除</button></td>`:''}</tr>`;
  }));
}
function trialSelectedClassesForm(){
  const d=trialState.draft;
  return `<section class="card pad trial-class-module"><h2 class="section-title">筛选班级</h2><div class="enrollment-class-filters">${trialClassFilterFields()}</div>
    <div class="toolbar"><p class="help">时间按下节课开始时间筛选：12:00 归入下午，18:00 归入晚上；22:00 不包含在晚上时段。</p><button class="btn small" onclick="trialResetClassFilters()">重置筛选</button></div>
    <div id="trial-class-results">${trialClassResults()}</div></section>
    <section class="card pad trial-booking-module"><h2 class="section-title">预约信息</h2><p class="help" role="status">已选择 <strong id="trial-class-count">${d.classes.length}</strong> 个班级（含筛选后隐藏的班级）。选择课节后自动带入试听时间，提交后直接入班试听。</p>
    <div id="trial-selected-settings">${trialSelectedTable(d)}</div>
    <div class="field"><label for="trial-note">预约备注</label><textarea class="textarea" id="trial-note" maxlength="1000" placeholder="学生情况、试听目标、方便上课的时间等" oninput="trialState.draft.note=this.value">${esc(d.note)}</textarea></div></section>${d.sessionPicker?trialSessionModal():''}`;
}
function trialClassSessions(c){
  const records=Array.isArray(c.sessions)?c.sessions:a.attendance.filter(row=>a.classes[row.classIndex]?.id===c.id);
  const rows=records.length?records:c.date&&c.time?[{session:'第1讲',date:c.date,time:c.time}]:[];
  const seen=new Set();
  return rows.flatMap((row,index)=>{
    const start=String(row.time||'').match(/^(\d{1,2}):(\d{2})/);
    const at=row.startsAt||(row.date&&start?`${row.date}T${start[1].padStart(2,'0')}:${start[2]}`:'');
    const id=String(row.id||`${c.id}:${row.session||index+1}:${at}`);
    if(seen.has(id))return [];seen.add(id);
    const number=Number(row.number)||Number(String(row.session||row.name||'').match(/^第\s*(\d+)\s*讲/)?.[1])||index+1;
    return [{id,number,name:row.name||row.session||`第${number}讲`,startsAt:at,endsAt:row.endsAt||'',time:row.time||'',teacher:row.teacher||c.teacher,room:row.room||c.room,cancelled:row.cancelled===true||row.status==='已取消'}];
  }).sort((x,y)=>x.startsAt.localeCompare(y.startsAt));
}
function trialOpenSessions(id){
  const c=a.classes.find(c=>c.id===id&&trialAvailableClass(c));if(!c)return;
  trialCaptureIntention();
  trialState.draft.sessionPicker={classId:id,selected:trialState.draft.classes.find(item=>item.classId===id)?.sessionId||''};
  render();
}
function trialCloseSessions(){trialState.draft.sessionPicker=null;render()}
function trialUpcomingSessions(c,now=Date.now()){
  return trialClassSessions(c).filter(s=>new Date(s.startsAt).getTime()>now).sort((x,y)=>new Date(x.startsAt)-new Date(y.startsAt));
}
function trialSessionEndTime(session){
  const start=new Date(session.startsAt),explicit=new Date(session.endsAt);
  if(Number.isFinite(explicit.getTime())&&explicit>start)return explicit.toISOString();
  const match=String(session.time||'').match(/[–—~～至-]\s*(\d{1,2}):(\d{2})\s*$/);
  if(!Number.isFinite(start.getTime())||!match||Number(match[1])>23||Number(match[2])>59)return '';
  const end=new Date(start);end.setHours(Number(match[1]),Number(match[2]),0,0);
  if(end<=start)end.setDate(end.getDate()+1);
  return end.toISOString();
}
function trialSessionDisplay(session){
  const date=new Date(session.startsAt),pad=n=>String(n).padStart(2,'0');
  const weekday=['周日','周一','周二','周三','周四','周五','周六'][date.getDay()];
  const startTime=`${pad(date.getHours())}:${pad(date.getMinutes())}`;
  const dateText=`${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
  return {date:`${dateText}（${weekday}）`,dateText,weekday,startTime,time:session.time||startTime};
}
function trialSessionDateHtml(display){
  return `<span class="trial-session-date">${esc(display.dateText)}<span class="trial-session-weekday">（${esc(display.weekday)}）</span></span>`;
}
function trialSessionNameHTML(session){
  const name=session.name||'',number=session.number;
  return number&&!/^第\s*\d+\s*讲(?:\s|[：:、.．-]|$)/.test(name)?`<span class="help" style="margin-right:8px">第${number}讲</span>${esc(name)}`:esc(name);
}
function trialSessionModal(){
  const picker=trialState.draft.sessionPicker,c=a.classes.find(c=>c.id===picker.classId);
  if(!c)return '';
  const sessions=trialUpcomingSessions(c),available=sessions.filter(s=>!s.cancelled);
  return `<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="trial-session-title"><div class="modal-head"><h2 id="trial-session-title">选择课节</h2><button class="btn small" aria-label="关闭" onclick="trialCloseSessions()">×</button></div><p>${esc(c.name)}</p>
    ${aTable(['选择','课节','上课日期','上课时间'],sessions.map(s=>{
      const usable=!s.cancelled,display=trialSessionDisplay(s);
      return `<tr><td><input type="radio" name="trial-session" value="${esc(s.id)}" ${picker.selected===s.id?'checked':''} ${usable?'':'disabled'} onchange="trialState.draft.sessionPicker.selected=this.value"></td><td>${trialSessionNameHTML(s)}</td><td>${trialSessionDateHtml(display)}</td><td>${esc(display.time)}</td></tr>`;
    }))}
    ${available.length?'':'<p class="notice">暂无可预约课节，请教务补充后续排课后再预约。</p>'}<div class="modal-actions"><button class="btn" onclick="trialCloseSessions()">取消</button><button class="btn primary" onclick="trialConfirmSession()" ${available.length?'':'disabled'}>确认课节</button></div></section></div>`;
}
function trialConfirmSession(){
  const d=trialState.draft,picker=d.sessionPicker;if(!picker)return;
  const c=a.classes.find(c=>c.id===picker.classId&&trialAvailableClass(c));
  const session=c&&trialClassSessions(c).find(s=>s.id===picker.selected&&!s.cancelled&&trialFuture(s.startsAt));
  if(!session){toast('请选择可预约的课节');return}
  const item={classId:c.id,sessionId:session.id,sessionName:session.name,preferredTime:session.startsAt};
  const index=d.classes.findIndex(x=>x.classId===c.id);
  if(index<0)d.classes.push(item);else d.classes[index]=item;
  d.sessionPicker=null;render();
}
