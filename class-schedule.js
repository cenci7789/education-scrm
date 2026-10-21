const classWeekdays=['周日','周一','周二','周三','周四','周五','周六'];
let classScheduleSequence=0;
function classScheduleDate(value){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return null;
  const date=new Date(value+'T12:00:00');
  return Number.isFinite(date.getTime())&&classScheduleDateText(date)===value?date:null;
}
function classScheduleDateText(date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`}
function classScheduleTime(value){return /^([01]\d|2[0-3]):[0-5]\d$/.test(value||'')}
function classScheduleSlotValid(slot){return classScheduleTime(slot.start)&&classScheduleTime(slot.end)&&slot.end>slot.start}
function classScheduleCourseRows(course){
  return (a.courses.find(c=>c.name===course)?.sessions||[]).map((s,i)=>({id:`scheduled-${Date.now()}-${++classScheduleSequence}`,courseSessionId:typeof s==='string'?'':s.id||'',name:typeof s==='string'?s:s.name||`第${i+1}讲`,date:'',start:'',end:''}));
}
function classScheduleInit(course,cls){
  const settings=cls?.scheduleSettings;
  const rows=cls?.sessions?.length?cls.sessions.map((s,i)=>{
    const times=(s.time||'').match(/(\d{2}:\d{2})\s*[–—-]\s*(\d{2}:\d{2})/);
    return {...s,id:s.id||`scheduled-${Date.now()}-${++classScheduleSequence}`,name:s.name||s.session||`第${i+1}讲`,date:s.date||s.startsAt?.slice(0,10)||'',start:s.startsAt?.slice(11,16)||times?.[1]||'',end:s.endsAt?.slice(11,16)||times?.[2]||''};
  }):classScheduleCourseRows(course);
  const startDate=settings?.startDate||cls?.date||'',weekday=classScheduleDate(startDate)?.getDay();
  const days=settings?.days?.slice()||(weekday!==undefined?[weekday]:[]);
  const slots=settings?JSON.parse(JSON.stringify(settings.slots)):{};
  for(const day of days)if(!slots[day]){
    const time=(cls?.time||'').match(/(\d{2}:\d{2})\s*[–—-]\s*(\d{2}:\d{2})/);
    slots[day]=[{start:time?.[1]||'',end:time?.[2]||''}];
  }
  a.classScheduleDraft={course,startDate,days,slots,rows,skipHolidays:settings?.skipHolidays??true,holidays:settings?.holidays?.slice()||[],manualFrequency:!!settings,holidayDraft:null};
  if(!cls?.sessions?.length)classScheduleGenerate();
}
function classScheduleGenerate(){
  const d=a.classScheduleDraft;
  d.rows.forEach(r=>{r.date='';r.start='';r.end=''});
  const date=classScheduleDate(d.startDate);
  if(!date||!d.days.length)return;
  let i=0;
  // A bounded search protects the form from invalid or pathological input.
  for(let offset=0;offset<36600&&i<d.rows.length;offset++,date.setDate(date.getDate()+1)){
    const day=date.getDay(),dateText=classScheduleDateText(date);
    if(!d.days.includes(day)||(d.skipHolidays&&d.holidays.includes(dateText)))continue;
    const slots=(d.slots[day]||[{start:'',end:''}]).slice().sort((x,y)=>x.start.localeCompare(y.start));
    for(const slot of slots){
      if(i>=d.rows.length)break;
      Object.assign(d.rows[i++],{date:dateText,start:classScheduleSlotValid(slot)?slot.start:'',end:classScheduleSlotValid(slot)?slot.end:''});
    }
  }
}
function classScheduleSlotsHTML(){
  const d=a.classScheduleDraft;
  return d.days.length?d.days.slice().sort((x,y)=>x-y).map(day=>(d.slots[day]||[]).map((slot,i)=>`<div class="class-time-slot"><strong>${classWeekdays[day]}</strong><input class="input" type="time" aria-label="${classWeekdays[day]}第${i+1}个时段开始时间" value="${esc(slot.start)}" onchange="classScheduleSetSlot(${day},${i},'start',this.value)"><span>至</span><input class="input" type="time" aria-label="${classWeekdays[day]}第${i+1}个时段结束时间" value="${esc(slot.end)}" onchange="classScheduleSetSlot(${day},${i},'end',this.value)"><button type="button" class="btn small" onclick="classScheduleCopySlots(${day})">复制到其他星期</button><button type="button" class="btn small" aria-label="为${classWeekdays[day]}添加时段" onclick="classScheduleAddSlot(${day})">＋</button>${d.slots[day].length>1?`<button type="button" class="btn small danger" onclick="classScheduleRemoveSlot(${day},${i})">移除</button>`:''}</div>`).join('')).join(''):'<div class="help">请先选择上课频率</div>';
}
function classScheduleChoices(row){
  const d=a.classScheduleDraft,day=classScheduleDate(row.date)?.getDay();
  const slots=d.days.includes(day)?d.slots[day]||[]:d.days.flatMap(day=>d.slots[day]||[]);
  const choices=slots.filter(classScheduleSlotValid).map(s=>s.start+'–'+s.end);
  if(row.start&&row.end)choices.push(row.start+'–'+row.end);
  return [...new Set(choices)].sort();
}
function classScheduleRowsHTML(){
  const d=a.classScheduleDraft;
  if(!d.rows.length)return `<div class="empty">${d.course?'该课程尚未设置讲次，请先在课程管理中添加讲次。':'请选择课程，自动带入讲次信息。'}</div>`;
  return aTable(['讲次','讲次名称','上课日期 / 时间段'],d.rows.map((row,i)=>`<tr><td style="width:90px">第${i+1}讲</td><td>${esc(row.name)}</td><td style="width:360px"><div class="class-lesson-time"><input class="input" type="date" aria-label="第${i+1}讲上课日期" value="${esc(row.date)}" onchange="classScheduleEditRow(${i},'date',this.value)"><select class="select" aria-label="第${i+1}讲时间段" onchange="classScheduleEditRow(${i},'time',this.value)"><option value="">请选择时间段</option>${classScheduleChoices(row).map(time=>`<option value="${time}"${time===row.start+'–'+row.end?' selected':''}>${time}</option>`).join('')}</select></div></td></tr>`));
}
function classScheduleHTML(){
  const d=a.classScheduleDraft;
  return `<section id="class-schedule"><h2 class="section-title">讲次信息</h2><p class="academic-note">重要提醒：修改上课日期、频率、时间段将重置课表的日期及时间，请谨慎操作。</p><div class="class-schedule-line"><label class="required" for="class-date">开始上课日期</label><input class="input" type="date" id="class-date" value="${esc(d.startDate)}" onchange="classScheduleSetDate(this.value)"><label><input type="checkbox"${d.skipHolidays?' checked':''} onchange="classScheduleSkipHolidays(this.checked)"> 跳过停课日</label><button type="button" class="btn small" onclick="classScheduleOpenHolidays()">设置停课日<span id="class-holiday-count">${d.holidays.length?`（${d.holidays.length}天）`:''}</span></button></div><div class="class-schedule-line"><span class="required">频率</span><div class="checkrow" id="class-schedule-days">${classScheduleDaysHTML()}</div></div><div class="class-schedule-line class-slots-line"><span class="required">时间段</span><div id="class-schedule-slots">${classScheduleSlotsHTML()}</div></div><div id="class-schedule-rows">${classScheduleRowsHTML()}</div><div id="class-holiday-modal"></div></section>`;
}
function classScheduleDaysHTML(){return classWeekdays.map((label,day)=>`<label><input type="checkbox"${a.classScheduleDraft.days.includes(day)?' checked':''} onchange="classScheduleToggleDay(${day},this.checked)"> ${label}</label>`).join('')}
function classScheduleRefresh(slots=false){
  if(slots)$('#class-schedule-slots').innerHTML=classScheduleSlotsHTML();
  $('#class-schedule-rows').innerHTML=classScheduleRowsHTML();
}
function classScheduleSetDate(value){
  const d=a.classScheduleDraft;d.startDate=value;
  if(!d.manualFrequency){const day=classScheduleDate(value)?.getDay();d.days=day===undefined?[]:[day];if(day!==undefined&&!d.slots[day])d.slots[day]=[{start:'',end:''}];}
  classScheduleGenerate();$('#class-schedule-days').innerHTML=classScheduleDaysHTML();classScheduleRefresh(true);
}
function classScheduleToggleDay(day,checked){
  const d=a.classScheduleDraft;d.manualFrequency=true;d.days=d.days.filter(x=>x!==day);if(checked)d.days.push(day);
  if(!d.slots[day])d.slots[day]=[{start:'',end:''}];classScheduleGenerate();classScheduleRefresh(true);
}
function classScheduleSetSlot(day,index,key,value){
  a.classScheduleDraft.slots[day][index][key]=value;classScheduleGenerate();classScheduleRefresh();
}
function classScheduleAddSlot(day){a.classScheduleDraft.slots[day].push({start:'',end:''});classScheduleGenerate();classScheduleRefresh(true)}
function classScheduleRemoveSlot(day,index){a.classScheduleDraft.slots[day].splice(index,1);classScheduleGenerate();classScheduleRefresh(true)}
function classScheduleCopySlots(day){
  const d=a.classScheduleDraft;for(const target of d.days)if(target!==day)d.slots[target]=d.slots[day].map(s=>({...s}));classScheduleGenerate();classScheduleRefresh(true);
}
function classScheduleEditRow(index,key,value){
  const row=a.classScheduleDraft.rows[index];
  if(key==='date'){row.date=value;row.start='';row.end='';}
  else{const [start,end]=(value||'').split('–');row.start=start||'';row.end=end||'';}
  classScheduleRefresh();
}
function classScheduleSkipHolidays(checked){a.classScheduleDraft.skipHolidays=checked;classScheduleGenerate();classScheduleRefresh()}
function classScheduleOpenHolidays(){a.classScheduleDraft.holidayDraft=a.classScheduleDraft.holidays.slice();classScheduleHolidayModal()}
function classScheduleHolidayModal(){
  const days=a.classScheduleDraft.holidayDraft;
  $('#class-holiday-modal').innerHTML=`<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="class-holiday-title"><div class="modal-head"><h2 id="class-holiday-title">设置停课日</h2><button class="btn small" onclick="classScheduleCloseHolidays()" aria-label="关闭">×</button></div><p class="help">勾选“跳过停课日”后，讲次会自动顺延至下一个上课日期。</p><div class="class-schedule-line"><input class="input" id="class-holiday-date" type="date" aria-label="停课日期"><button class="btn" onclick="classScheduleAddHoliday()">添加</button></div><div style="max-height:260px;overflow:auto">${days.length?days.map((day,i)=>`<div class="class-schedule-line">${day}（${classWeekdays[classScheduleDate(day).getDay()]}）<button class="btn small danger" onclick="classScheduleRemoveHoliday(${i})">移除</button></div>`).join(''):'<div class="empty">尚未设置停课日</div>'}</div><div class="modal-actions"><button class="btn" onclick="classScheduleCloseHolidays()">取消</button><button class="btn primary" onclick="classScheduleConfirmHolidays()">确认</button></div></section></div>`;
}
function classScheduleAddHoliday(){
  const date=$('#class-holiday-date').value,days=a.classScheduleDraft.holidayDraft;
  if(!classScheduleDate(date)){toast('请选择有效的停课日期');return}
  if(!days.includes(date))days.push(date);days.sort();classScheduleHolidayModal();
}
function classScheduleRemoveHoliday(index){a.classScheduleDraft.holidayDraft.splice(index,1);classScheduleHolidayModal()}
function classScheduleCloseHolidays(){a.classScheduleDraft.holidayDraft=null;$('#class-holiday-modal').innerHTML=''}
function classScheduleConfirmHolidays(){
  const d=a.classScheduleDraft;d.holidays=d.holidayDraft.slice();classScheduleCloseHolidays();classScheduleGenerate();classScheduleRefresh();$('#class-holiday-count').textContent=d.holidays.length?`（${d.holidays.length}天）`:'';
}
function classSchedulePayload(){
  const d=a.classScheduleDraft;
  if(!d||d.course!==$('#class-course').value){toast('请重新选择课程并设置讲次');return null}
  if(!d.rows.length){toast('该课程尚未设置讲次，请先在课程管理中添加');return null}
  if(!classScheduleDate(d.startDate)||!d.days.length){toast('请选择开始上课日期和频率');return null}
  for(const day of d.days){
    const slots=d.slots[day].slice().sort((x,y)=>x.start.localeCompare(y.start));
    if(slots.some(s=>!classScheduleSlotValid(s))){toast('请完善时间段，结束时间须晚于开始时间');return null}
    if(slots.some((s,i)=>i>0&&s.start<slots[i-1].end)){toast(`${classWeekdays[day]}的时间段不能重叠`);return null}
  }
  let previousEnd='';
  for(const row of d.rows){
    if(!classScheduleDate(row.date)||row.date<d.startDate||!classScheduleSlotValid(row)){toast('请完善每讲的日期和时间，日期不能早于开始上课日期');return null}
    if(d.skipHolidays&&d.holidays.includes(row.date)){toast('讲次日期不能安排在停课日');return null}
    if(row.date+'T'+row.start<previousEnd){toast('讲次需按时间顺序排列，且不能重叠');return null}
    previousEnd=row.date+'T'+row.end;
  }
  return {date:d.rows[0].date,time:d.rows[0].start+'–'+d.rows[0].end,
    sessions:d.rows.map((r,i)=>({...r,number:i+1,startsAt:r.date+'T'+r.start,endsAt:r.date+'T'+r.end,time:r.start+'–'+r.end})),
    scheduleSettings:{startDate:d.startDate,days:d.days.slice(),slots:JSON.parse(JSON.stringify(d.slots)),skipHolidays:d.skipHolidays,holidays:d.holidays.slice()}};
}
const classScheduleBaseForm=classForm;
classForm=function(){
  const cls=a.selectedClass===null?null:a.classes[a.selectedClass];
  const course=cls?.course||a.courses[a.classCreationCourse]?.name||'';
  classScheduleInit(course,cls);
  return classScheduleBaseForm().replace(/<h2 class="section-title">讲次信息<\/h2>[\s\S]*?(?=<hr class="divider"><h2 class="section-title">售卖信息)/,()=>classScheduleHTML())
    .replace(/<hr class="divider"><h2 class="section-title">售卖信息<\/h2><div class="form-grid">[\s\S]*?<\/div>(?=<div class="form-actions">)/,'');
};
const classScheduleCourseChanged=classCourseChanged;
classCourseChanged=function(){
  classScheduleCourseChanged();
  const d=a.classScheduleDraft;d.course=$('#class-course').value;d.rows=classScheduleCourseRows(d.course);classScheduleGenerate();classScheduleRefresh();
};
