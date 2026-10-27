const scheduleCalendarViews=new Map();
function scheduleDateText(date){const pad=n=>String(n).padStart(2,'0');return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`}
function scheduleDate(value){const date=new Date(value+'T00:00:00');return /^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(date.getTime())&&scheduleDateText(date)===value?date:null}
function scheduleShiftDate(value,days){const date=scheduleDate(value);date.setDate(date.getDate()+days);return scheduleDateText(date)}
function scheduleSettingsKey(){return 'crm.schedule.preferences.v1.'+encodeURIComponent(studentTermActor())}
function scheduleReadSettings(){try{const data=JSON.parse(globalThis.localStorage?.getItem(scheduleSettingsKey())||'null');return data?.version===1?{order:Array.isArray(data.order)?data.order.filter(x=>typeof x==='string'):[],campus:typeof data.campus==='string'?data.campus:''}:{order:[],campus:''}}catch{return {order:[],campus:''}}}
function scheduleView(){
  const actor=studentTermActor();if(!scheduleCalendarViews.has(actor)){const settings=scheduleReadSettings();scheduleCalendarViews.set(actor,{tab:'时间课表',date:scheduleDateText(new Date()),campus:settings.campus,order:settings.order,search:'',ordering:false})}
  const view=scheduleCalendarViews.get(actor),campuses=scheduleCampuses(view);
  if(view.campus&&!campuses.includes(view.campus))view.campus='';
  if(view.tab==='时间课表'&&!view.campus)view.campus=campuses[0]||'';
  return view;
}
function scheduleCampuses(view){
  const names=[...new Set(state.campuses.filter(c=>c.active).map(c=>c.name))];
  return [...new Set([...view.order.filter(name=>names.includes(name)),...names])];
}
function scheduleSaveSettings(){const view=scheduleView();try{if(!globalThis.localStorage)throw Error('unavailable');globalThis.localStorage.setItem(scheduleSettingsKey(),JSON.stringify({version:1,order:scheduleCampuses(view),campus:view.campus}));return true}catch{toast('本次调整已生效，浏览器未能保存课表偏好');return false}}
function scheduleSetCampus(value){const view=scheduleView();view.campus=scheduleCampuses(view).includes(value)?value:'';scheduleSaveSettings();academicRender()}
function scheduleMoveCampus(index,delta){
  const view=scheduleView(),order=scheduleCampuses(view),target=index+delta;if(!Number.isInteger(index)||index<0||index>=order.length||![1,-1].includes(delta)||target<0||target>=order.length)return;
  [order[index],order[target]]=[order[target],order[index]];view.order=order;scheduleSaveSettings();academicRender();
}
function scheduleSetDate(value){if(!scheduleDate(value))return;scheduleView().date=value;academicRender()}
function scheduleMoveDate(direction){const view=scheduleView();view.date=scheduleShiftDate(view.date,direction*(view.tab==='时间课表'?1:7));academicRender()}
function scheduleToday(){scheduleView().date=scheduleDateText(new Date());academicRender()}
scheduleTab=function(tab){if(!['时间课表','老师课表','教室课表'].includes(tab))return;const view=scheduleView();view.tab=tab;view.search='';a.scheduleTab=tab;academicRender()};
function scheduleWeekDates(value){const date=scheduleDate(value),offset=(date.getDay()+6)%7;return Array.from({length:7},(_,index)=>scheduleShiftDate(value,index-offset))}
function scheduleTimeText(date){return String(date.getHours()).padStart(2,'0')+':'+String(date.getMinutes()).padStart(2,'0')}
function scheduleLessons(){
  return a.classes.flatMap((cls,classIndex)=>{
    const info=enrollmentClassInfo(cls);
    let lessons=classDetailSessions(cls);
    if(!Array.isArray(cls.sessions)&&!lessons.length&&cls.date&&cls.time)lessons=[{id:'class-'+cls.id,number:1,name:'第1讲',date:cls.date,time:cls.time}];
    return lessons.flatMap((lesson,index)=>{
      if(lesson.cancelled||lesson.status==='已取消')return [];
      const range=attendanceTimeKey(lesson.time).match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/);
      if(!lesson.startsAt&&(!range||!scheduleDate(lesson.date)))return [];
      if(range&&(Number(range[1])>23||Number(range[3])>23||Number(range[2])>59||Number(range[4])>59))return [];
      const start=new Date(lesson.startsAt||(lesson.date+'T'+range[1].padStart(2,'0')+':'+range[2]+':00'));
      let end=lesson.endsAt?new Date(lesson.endsAt):null;
      if(!end&&range){end=new Date(start);end.setHours(Number(range[3]),Number(range[4]),0,0);if(end<=start)end.setDate(end.getDate()+1)}
      if(!Number.isFinite(start.getTime())||!end||!Number.isFinite(end.getTime())||end<=start)return [];
      return [{key:String(cls.id)+'|'+String(lesson.id||index),classIndex,classId:cls.id,className:cls.name,course:cls.course,grade:info.grade,subject:info.subject,term:studentClassTerm(cls)||info.term,format:String(info.format||'').replace(/课$/,'')+'课',campus:cls.campus||'',teacher:lesson.teacher||cls.teacher||'待安排老师',teacherId:lesson.teacherId||(!lesson.teacher||lesson.teacher===cls.teacher?cls.teacherId:'')||'',teacherAccount:lesson.teacherAccount||(!lesson.teacher||lesson.teacher===cls.teacher?cls.teacherAccount:'')||'',academicTeacher:classAcademicTeacherLabel(cls),room:lesson.room||cls.room||'待安排教室',session:lesson.name||`第${index+1}讲`,number:lesson.number||index+1,students:cls.students??0,capacity:cls.capacity??'—',start:start.getTime(),end:end.getTime(),startLabel:scheduleDateText(start)+' '+scheduleTimeText(start),endLabel:scheduleDateText(end)+' '+scheduleTimeText(end)}];
    });
  });
}
function scheduleHasConflict(event,events){return events.some(other=>other.key!==event.key&&other.start<event.end&&event.start<other.end&&((event.teacher!=='待安排老师'&&other.teacher===event.teacher)||(event.room!=='待安排教室'&&other.campus===event.campus&&other.room===event.room)))}
function scheduleVisibleLessons(){
  const view=scheduleView(),days=view.tab==='时间课表'?[view.date]:scheduleWeekDates(view.date),start=scheduleDate(days[0]).getTime(),end=scheduleDate(scheduleShiftDate(days.at(-1),1)).getTime(),search=view.search.trim().toLowerCase();
  const all=scheduleLessons();
  return all.filter(e=>(!view.campus||e.campus===view.campus)&&e.start<end&&e.end>start&&(!search||(view.tab==='老师课表'?[e.teacher]:view.tab==='教室课表'?[e.room]:[e.className,e.course,e.teacher,e.room]).some(v=>String(v).toLowerCase().includes(search)))).map(e=>({...e,conflict:scheduleHasConflict(e,all)}));
}
function scheduleRoomKey(campus,room){return JSON.stringify([campus,room])}
function scheduleResources(kind,events){
  const view=scheduleView(),map=new Map(),search=view.search.trim().toLowerCase();
  const add=(name,campus='')=>{if(!name||view.campus&&campus!==view.campus)return;const key=kind==='teacher'?name:scheduleRoomKey(campus,name);if(!map.has(key))map.set(key,{key,name,campus})};
  if(kind==='room')for(const campus of state.campuses.filter(c=>c.active))for(const room of classCampusRooms(campus.name))add(room.name,campus.name);
  else for(const staff of state.staff.filter(s=>s.active&&/教师|老师|主讲|授课/.test(s.roles)))add(staff.name,staff.campus);
  for(const cls of a.classes)add(kind==='teacher'?cls.teacher:cls.room,cls.campus);
  for(const event of events)add(kind==='teacher'?event.teacher:event.room,event.campus);
  return [...map.values()].filter(resource=>view.tab==='时间课表'||!search||resource.name.toLowerCase().includes(search));
}
function scheduleEventButton(event,style=''){
  return `<button type="button" class="schedule-event${event.conflict?' conflict':''}" ${style?`style="${style}"`:''} data-schedule-key="${esc(event.key)}" onmouseenter="scheduleShowEvent(this)" onmouseleave="scheduleHideEvent()" onfocus="scheduleShowEvent(this)" onblur="scheduleHideEvent()" onclick="scheduleShowEvent(this)" aria-describedby="schedule-event-tooltip"><span>${esc(scheduleTimeText(new Date(event.start))+'–'+scheduleTimeText(new Date(event.end)))}</span><strong>${esc(event.className)}</strong><span>${esc(event.session)} · ${esc(event.teacher)}</span>${event.conflict?'<span class="schedule-conflict-label">时间冲突</span>':''}</button>`;
}
function scheduleEventDetails(event){
  const fields=[['课程',event.course],['班级',event.className],['课节',`第${event.number}讲 · ${event.session}`],['上课时间',event.startLabel+' 至 '+event.endLabel],['学期',classManagementTermLabel(event.term)],['年级 / 科目',`${event.grade||'—'} / ${event.subject||'—'}`],['授课形式',event.format],['授课老师',event.teacher],['教务老师',event.academicTeacher||'—'],['校区 / 教室',`${event.campus} / ${event.room}`],['在班人数',`${event.students} / ${event.capacity}`]];
  return `<strong class="schedule-tooltip-title">课程信息${event.conflict?' · 时间冲突':''}</strong><dl>${fields.map(([label,value])=>`<div><dt>${label}</dt><dd>${esc(String(value||'—'))}</dd></div>`).join('')}</dl>`;
}
function scheduleShowEvent(button){
  const event=scheduleVisibleLessons().find(e=>e.key===button.dataset.scheduleKey),tooltip=$('#schedule-event-tooltip');if(!event||!tooltip)return;
  tooltip.innerHTML=scheduleEventDetails(event);tooltip.hidden=false;
  const rect=button.getBoundingClientRect(),width=Math.min(360,window.innerWidth-24),height=tooltip.offsetHeight;
  tooltip.style.width=width+'px';tooltip.style.left=Math.max(12,Math.min(rect.right+10,window.innerWidth-width-12))+'px';tooltip.style.top=Math.max(12,Math.min(rect.top,window.innerHeight-height-12))+'px';
}
function scheduleHideEvent(){const tooltip=$('#schedule-event-tooltip');if(tooltip)tooltip.hidden=true}
globalThis.addEventListener?.('scroll',scheduleHideEvent,true);
globalThis.addEventListener?.('resize',scheduleHideEvent);
globalThis.addEventListener?.('keydown',event=>{if(event.key==='Escape')scheduleHideEvent()});
function scheduleDaySegments(events,date){
  const start=scheduleDate(date).getTime(),end=scheduleDate(scheduleShiftDate(date,1)).getTime();
  return events.filter(e=>e.start<end&&e.end>start).map(event=>({...event,from:(Math.max(event.start,start)-start)/60000,to:(Math.min(event.end,end)-start)/60000}));
}
function scheduleLanes(events){
  const sorted=events.slice().sort((a,b)=>a.from-b.from||a.to-b.to);let group=[],groupEnd=-1;
  const result=[];
  const flush=()=>{const ends=[];for(const event of group){let lane=ends.findIndex(end=>end<=event.from);if(lane<0)lane=ends.length;ends[lane]=event.to;event.lane=lane}for(const event of group)result.push({...event,lanes:ends.length});group=[]};
  for(const event of sorted){if(event.from>=groupEnd&&group.length)flush();if(!group.length)groupEnd=event.to;else groupEnd=Math.max(groupEnd,event.to);group.push(event)}flush();return result;
}
function scheduleTimeCalendar(events){
  const view=scheduleView(),rooms=scheduleResources('room',events),segments=scheduleDaySegments(events,view.date);
  if(!view.campus)return '<div class="empty">暂无可用校区，请先配置校区。</div>';
  if(!rooms.length)return '<div class="empty">该校区暂无教室，请先配置教室。</div>';
  const from=Math.min(7*60,...segments.map(e=>Math.floor(e.from/60)*60)),to=Math.max(22*60,...segments.map(e=>Math.ceil(e.to/60)*60)),height=to-from;
  return `<div class="schedule-scroll" onscroll="scheduleHideEvent()"><div class="schedule-time-grid" style="grid-template-columns:72px repeat(${rooms.length},minmax(200px,1fr));min-width:${72+rooms.length*200}px"><div class="schedule-axis-heading">时间</div>${rooms.map(room=>`<div class="schedule-room-heading">${esc(room.name)}</div>`).join('')}<div class="schedule-time-axis" style="height:${height}px">${Array.from({length:(to-from)/60+1},(_,i)=>`<span style="top:${i*60}px">${String((from/60+i)%24).padStart(2,'0')}:00</span>`).join('')}</div>${rooms.map(room=>`<div class="schedule-room-track" style="height:${height}px">${scheduleLanes(segments.filter(e=>scheduleRoomKey(e.campus,e.room)===room.key)).map(event=>scheduleEventButton(event,`top:${event.from-from}px;height:${Math.max(22,event.to-event.from)}px;left:calc(${event.lane/event.lanes*100}% + 3px);width:calc(${100/event.lanes}% - 6px)`)).join('')}</div>`).join('')}</div></div>${!events.length?'<p class="help">当天暂无排课，可切换日期查看。</p>':''}`;
}
function scheduleResourceCalendar(events){
  const view=scheduleView(),teacher=view.tab==='老师课表',kind=teacher?'teacher':'room',resources=scheduleResources(kind,events),days=scheduleWeekDates(view.date);
  if(!resources.length)return '<div class="empty">暂无符合条件的老师或教室。</div>';
  return `<div class="schedule-scroll schedule-week-scroll" onscroll="scheduleHideEvent()"><table class="schedule-week-table"><thead><tr><th>${teacher?'老师':'教室'}</th>${days.map((date,index)=>`<th${date===scheduleDateText(new Date())?' class="is-today"':''}>${Number(date.slice(5,7))}月${Number(date.slice(8))}日（周${'一二三四五六日'[index]}）</th>`).join('')}</tr></thead><tbody>${resources.map(resource=>`<tr><th>${esc(resource.name)}${!view.campus&&!teacher?`<small>${esc(resource.campus)}</small>`:''}</th>${days.map(date=>{const matches=scheduleDaySegments(events,date).filter(e=>(teacher?e.teacher:scheduleRoomKey(e.campus,e.room))===resource.key).sort((a,b)=>a.start-b.start);return `<td>${matches.map(event=>scheduleEventButton(event)).join('')||'<span class="schedule-free">空闲</span>'}</td>`}).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function scheduleCalendarContent(){const events=scheduleVisibleLessons();return (scheduleView().tab==='时间课表'?scheduleTimeCalendar(events):scheduleResourceCalendar(events))+`<p class="help">当前范围 ${events.length} 个课节。悬停或聚焦课程卡片查看完整信息。</p>`}
function scheduleSearch(value){scheduleView().search=value;scheduleHideEvent();$('#schedule-calendar-content').innerHTML=scheduleCalendarContent()}
function scheduleExportCSV(){
  const rows=[['课程','班级','课节','开始时间','结束时间','校区','教室','授课老师','教务老师','年级','科目','授课形式'],...scheduleVisibleLessons().map(e=>[e.course,e.className,e.session,e.startLabel,e.endLabel,e.campus,e.room,e.teacher,e.academicTeacher,e.grade,e.subject,e.format])];
  return '\uFEFF'+rows.map(row=>row.map(value=>{let text=String(value??'');if(/^[\s]*[=+@-]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"'}).join(',')).join('\r\n');
}
function scheduleExport(){
  const url=URL.createObjectURL(new Blob([scheduleExportCSV()],{type:'text/csv;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download='课表_'+scheduleView().date+'.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function scheduleOrderPanel(){
  const view=scheduleView(),campuses=scheduleCampuses(view);if(!view.ordering)return '';
  return `<section class="subcard schedule-order"><div class="subcard-head"><h3>校区顺序</h3><button class="btn small" onclick="scheduleView().ordering=false;academicRender()">完成</button></div><p class="help">未选校区时，时间课表默认使用列表第一项；调整顺序会保留当前选择。</p>${campuses.map((name,index)=>`<div class="schedule-order-row"><span>${index+1}. ${esc(name)}${index===0?' <small class="help">默认首项</small>':''}</span><div><button class="btn small" aria-label="上移${esc(name)}" ${index===0?'disabled':''} onclick="scheduleMoveCampus(${index},-1)">上移</button> <button class="btn small" aria-label="下移${esc(name)}" ${index===campuses.length-1?'disabled':''} onclick="scheduleMoveCampus(${index},1)">下移</button></div></div>`).join('')}</section>`;
}
schedulePage=function(){
  const view=scheduleView(),day=view.tab==='时间课表',days=scheduleWeekDates(view.date),campuses=scheduleCampuses(view);a.scheduleTab=view.tab;
  return aHeading('课表','按时间、老师或教室查看实际排课')+`<div class="card">${aTabs(['时间课表','老师课表','教室课表'],view.tab,'scheduleTab')}<div class="pad"><div class="toolbar"><div class="toolbar-left"><input class="input" style="width:230px" aria-label="搜索课表" placeholder="${day?'班级、课程、老师或教室':view.tab==='老师课表'?'老师姓名':'教室名称'}" value="${esc(view.search)}" oninput="scheduleSearch(this.value)"><select class="select" id="schedule-campus" style="width:180px" aria-label="校区" onchange="scheduleSetCampus(this.value)">${day?'':'<option value="">全部校区</option>'}${campuses.map(name=>`<option value="${esc(name)}"${view.campus===name?' selected':''}>${esc(name)}</option>`).join('')}${!campuses.length&&day?'<option value="">暂无可用校区</option>':''}</select><button class="btn small" onclick="scheduleView().ordering=!scheduleView().ordering;academicRender()">校区排序</button></div><button class="btn" onclick="scheduleExport()">导出</button></div>${scheduleOrderPanel()}<div class="schedule-date-bar"><div class="toolbar-left"><button class="btn small" aria-label="${day?'前一天':'上一周'}" onclick="scheduleMoveDate(-1)">‹</button><strong>${day?view.date:days[0]+' 至 '+days[6]}</strong><button class="btn small" aria-label="${day?'后一天':'下一周'}" onclick="scheduleMoveDate(1)">›</button><button class="btn small" onclick="scheduleToday()">今天</button><input class="input" type="date" style="width:160px" aria-label="选择课表日期" value="${view.date}" onchange="scheduleSetDate(this.value)"></div><div class="schedule-legend"><span>● 已占用</span><span class="conflict">● 冲突</span><span class="muted">○ 空闲</span></div></div><div id="schedule-calendar-content">${scheduleCalendarContent()}</div></div></div><aside id="schedule-event-tooltip" class="schedule-tooltip" role="tooltip" hidden></aside>`;
};
