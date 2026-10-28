// 跟班补课采用独立选班页面；确认前只修改草稿。
function makeupSource(record){
  if(!record)return null;
  const cls=record.classId?a.classes.find(c=>c.id===record.classId):a.classes[record.classIndex];
  const student=record.studentId?a.students.find(s=>s.id===record.studentId):a.students[record.studentIndex];
  return cls&&student?{record,cls,student,info:enrollmentClassInfo(cls)}:null;
}
function makeupEmptyFilters(){return {grade:'',subject:'',course:'',term:'',campus:'',teacher:'',format:'',search:''}}
function makeupOriginalFilters(source){
  return {...makeupEmptyFilters(),grade:enrollmentGradeKey(source.info.grade),subject:source.info.subject,course:source.cls.course,term:studentClassTerm(source.cls)||'',campus:source.cls.campus||'',format:String(source.info.format||'').replace(/课$/,'')};
}
function makeupPickerDraft(){return a.makeupPicker?.actor===studentTermActor()?a.makeupPicker:null}
function makeupOpenPicker(index){
  if(!permissionCanVisit('makeup'))return;
  const source=makeupSource(a.attendance[index]);if(!source||!['请假','旷课'].includes(source.record.attendance)){toast('原缺课记录已变更，请刷新后重试');return}
  a.makeupPicker={actor:studentTermActor(),source:source.record,filters:makeupOriginalFilters(source),classId:source.record.makeupPlan?.classId||'',sessionId:source.record.makeupPlan?.sessionId||'',classPage:1,lessonPage:1,lessonSearch:''};
  a.modal=null;nav('makeup');
}
function makeupCancelPicker(){a.makeupPicker=null;a.modal=null;nav('makeup')}
function makeupPickerSource(){const draft=makeupPickerDraft();return draft&&a.attendance.includes(draft.source)?makeupSource(draft.source):null}
function makeupCandidateClasses(){
  return classManagementRows().filter(cls=>courseCategory(a.courses.find(c=>c.name===cls.course)||{})==='班课');
}
function makeupFilteredClasses(){
  const f=makeupPickerDraft().filters,search=f.search.trim().toLowerCase();
  return makeupCandidateClasses().filter(cls=>['subject','course','term','campus','format'].every(key=>!f[key]||cls[key]===f[key])&&(!f.grade||enrollmentGradeKey(cls.grade)===f.grade)&&(!f.teacher||[cls.teacher,cls.academicTeacher].includes(f.teacher))&&(!search||[cls.name,cls.course].some(v=>String(v||'').toLowerCase().includes(search))));
}
function makeupFilterOptions(key){
  const map=new Map(),f=makeupPickerDraft().filters;
  for(const cls of makeupCandidateClasses()){
    if(key==='teacher'){for(const name of [cls.teacher,cls.academicTeacher])if(name)map.set(name,name)}
    else if(key==='grade'){if(cls.grade)map.set(enrollmentGradeKey(cls.grade),cls.grade)}
    else if(cls[key])map.set(cls[key],key==='term'?classManagementTermLabel(cls[key]):key==='format'?cls[key]+'课':cls[key]);
  }
  if(f[key]&&!map.has(f[key]))map.set(f[key],key==='term'?classManagementTermLabel(f[key]):f[key]);
  return [...map];
}
function makeupFilterFields(){
  const f=makeupPickerDraft().filters;
  return [['grade','年级'],['subject','科目'],['course','课程'],['term','学期'],['campus','校区'],['teacher','老师'],['format','授课形式']].map(([key,label])=>`<div class="field"><label for="makeup-picker-${key}">${label}</label><select class="select" id="makeup-picker-${key}" onchange="makeupSetFilter('${key}',this.value)"><option value="">全部${label}</option>${makeupFilterOptions(key).map(([value,text])=>`<option value="${esc(value)}"${f[key]===value?' selected':''}>${esc(text)}</option>`).join('')}</select></div>`).join('')+`<div class="field"><label for="makeup-picker-search">班级 / 课程名称</label><input class="input" id="makeup-picker-search" value="${esc(f.search)}" placeholder="搜索班级或课程名称" oninput="makeupSetFilter('search',this.value)"></div>`;
}
function makeupSetFilter(key,value){
  const draft=makeupPickerDraft();if(!draft||!Object.hasOwn(makeupEmptyFilters(),key))return;
  draft.filters[key]=value;draft.classPage=1;$('#makeup-picker-classes').innerHTML=makeupClassResults();
}
function makeupResetFilters(original=false){const draft=makeupPickerDraft(),source=makeupPickerSource();if(!draft||!source)return;draft.filters=original?makeupOriginalFilters(source):makeupEmptyFilters();draft.classPage=1;academicRender()}
function makeupPager(kind,count){
  const draft=makeupPickerDraft(),key=kind==='classes'?'classPage':'lessonPage',pages=Math.max(1,Math.ceil(count/10));draft[key]=Math.min(Math.max(draft[key],1),pages);
  return `<div class="toolbar" style="margin-top:16px"><span class="help">共 ${count} ${kind==='classes'?'个班级':'个课节'} · 每页 10 条</span><div class="toolbar-right"><button class="btn small" ${draft[key]===1?'disabled':''} onclick="makeupChangePage('${kind}',-1)">上一页</button><span>${draft[key]} / ${pages}</span><button class="btn small" ${draft[key]===pages?'disabled':''} onclick="makeupChangePage('${kind}',1)">下一页</button></div></div>`;
}
function makeupChangePage(kind,delta){
  const draft=makeupPickerDraft();if(!draft||!['classes','lessons'].includes(kind))return;
  const key=kind==='classes'?'classPage':'lessonPage';draft[key]+=delta;
  $('#makeup-picker-'+kind).innerHTML=kind==='classes'?makeupClassResults():makeupLessonResults();
}
function makeupClassResults(){
  const draft=makeupPickerDraft(),rows=makeupFilteredClasses(),pager=makeupPager('classes',rows.length),start=(draft.classPage-1)*10;
  return aTable(['班级 / 课程','年级','科目','学期','校区','授课老师','授课形式','在班人数','课节数','操作'],rows.slice(start,start+10).map(cls=>`<tr><td><strong>${esc(cls.name)}</strong><div class="help">${esc(cls.course)}</div></td><td>${esc(cls.grade||'—')}</td><td>${esc(cls.subject||'—')}</td><td>${esc(classManagementTermLabel(cls.term))}</td><td>${esc(cls.campus||'—')}</td><td>${esc(cls.teacher||'—')}</td><td>${esc(cls.format||'—')}</td><td>${esc(String(cls.students??0))} / ${esc(String(cls.capacity??'—'))}</td><td>${attendanceLessons(cls).length}</td><td><button class="btn small ${draft.classId===cls.id?'primary':''}" onclick="makeupChooseClass(${cls.index})">${draft.classId===cls.id?'已选班级':'选择课节'}</button></td></tr>`))+
    (!rows.length?'<div class="empty">没有符合条件的班级，可修改筛选条件或点击“清空筛选”。</div>':'')+pager;
}
function makeupChooseClass(index){
  const draft=makeupPickerDraft(),cls=a.classes[index];if(!draft||!cls)return;
  if(draft.classId!==cls.id){draft.classId=cls.id;draft.sessionId='';draft.lessonPage=1;draft.lessonSearch=''}
  academicRender();document.querySelector('#makeup-picker-lesson-panel')?.scrollIntoView?.({behavior:'smooth',block:'start'});
}
function makeupLessonUnavailable(cls,lesson){
  const source=makeupPickerSource();if(!source)return '原记录不可用';
  if(cls.id===source.cls.id&&(source.record.sessionId?String(source.record.sessionId)===lesson.key:source.record.date===lesson.date&&attendanceTimeKey(source.record.time)===lesson.time))return '原缺课课节';
  const start=lesson.time.match(/^(\d{2}:\d{2})-/)?.[1],timestamp=lesson.date&&start?new Date(lesson.date+'T'+start+':00').getTime():NaN;
  if(!Number.isFinite(timestamp)||!Number.isFinite(attendanceLessonEnd(lesson)))return '尚未排课';
  if(timestamp<=Date.now())return '已开始 / 已结束';
  return '';
}
function makeupSearchLessons(value){const draft=makeupPickerDraft();if(!draft)return;draft.lessonSearch=value;draft.lessonPage=1;$('#makeup-picker-lessons').innerHTML=makeupLessonResults()}
function makeupLessonResults(){
  const draft=makeupPickerDraft(),cls=a.classes.find(c=>c.id===draft.classId);if(!cls)return '<div class="empty">请先在上方选择班级。</div>';
  const search=draft.lessonSearch.trim().toLowerCase(),rows=attendanceLessons(cls).filter(lesson=>!search||[lesson.label,lesson.name,lesson.date,lesson.time].some(v=>String(v||'').toLowerCase().includes(search))),pager=makeupPager('lessons',rows.length),start=(draft.lessonPage-1)*10;
  return aTable(['选择','讲次','课节名称','上课日期','上课时间','老师 / 教室','可选状态'],rows.slice(start,start+10).map(lesson=>{
    const reason=makeupLessonUnavailable(cls,lesson);
    return `<tr><td><input type="radio" name="makeup-target-lesson" aria-label="选择${esc(lesson.label)}" ${draft.sessionId===lesson.key?'checked':''} ${reason?'disabled':''} onchange="makeupChooseLesson(${lesson.position})"></td><td>${esc(lesson.label)}</td><td>${esc(lesson.name||'—')}</td><td>${esc(lesson.date||'待排课')}</td><td>${esc(lesson.time||'待排课')}</td><td>${esc(lesson.teacher||cls.teacher||'—')} / ${esc(lesson.room||cls.room||'—')}</td><td>${reason?esc(reason):'可选择'}</td></tr>`;
  }))+(!rows.length?'<div class="empty">暂无符合条件的课节。</div>':'')+pager;
}
function makeupChooseLesson(position){
  const draft=makeupPickerDraft(),cls=draft&&a.classes.find(c=>c.id===draft.classId),lesson=cls&&attendanceLessons(cls)[position];if(!lesson)return;
  const reason=makeupLessonUnavailable(cls,lesson);if(reason){toast(reason);return}
  draft.sessionId=lesson.key;$('#makeup-picker-summary').innerHTML=makeupSelectionSummary();
}
function makeupSelectionSummary(){
  const draft=makeupPickerDraft(),cls=a.classes.find(c=>c.id===draft.classId),lesson=cls&&attendanceLessons(cls).find(s=>s.key===draft.sessionId);
  return lesson?`<strong>已选补课：</strong>${esc(cls.name)} · ${esc(lesson.label)} · ${esc(lesson.date)} ${esc(lesson.time)}`:'请选择一个班级及一个补课课节。';
}
function makeupConfirmPicker(){
  if(!permissionCanVisit('makeup'))return;
  const draft=makeupPickerDraft(),source=makeupPickerSource();
  if(!draft||!source||!['请假','旷课'].includes(source.record.attendance)){toast('原缺课记录已变更，请重新进入');return}
  const cls=a.classes.find(c=>c.id===draft.classId),lesson=cls&&attendanceLessons(cls).find(s=>s.key===draft.sessionId);
  if(!lesson){toast('请选择补课班级和课节');return}
  const reason=makeupLessonUnavailable(cls,lesson);if(reason){toast(reason+'，请重新选择课节');return}
  source.record.makeupPlan={classId:cls.id,className:cls.name,course:cls.course,sessionId:lesson.key,session:lesson.label,sessionName:lesson.name,date:lesson.date,time:lesson.time,campus:cls.campus,teacher:lesson.teacher||cls.teacher,room:lesson.room||cls.room,createdAt:new Date().toISOString()};
  source.record.makeup='已安排';makeupCancelPicker();toast('跟班补课已安排');
}
function makeupPickerPage(){
  const source=makeupPickerSource(),draft=makeupPickerDraft();
  if(!source)return `<div class="card pad"><p>原缺课记录已不存在，请返回重新选择。</p><button class="btn" onclick="makeupCancelPicker()">返回缺勤管理</button></div>`;
  const cls=a.classes.find(c=>c.id===draft.classId),tags=[source.info.grade,source.info.subject,studentClassTerm(source.cls)?studentTermLabel(studentClassTerm(source.cls)):source.info.term,source.cls.campus,source.info.format+'课'].filter(Boolean);
  return `<button class="btn back-link" onclick="makeupCancelPicker()">← 返回缺勤管理</button>`+aHeading('选择跟班补课','先选择班级，再选择具体课节；确认后保存补课安排')+
    `<section class="card pad" style="margin-bottom:20px"><h2 class="section-title">原缺课信息</h2><p><strong>${esc(source.student.name)}</strong> · ${esc(source.student.id)} · ${esc(source.record.attendance)}</p><p>${esc(source.cls.course)} / ${esc(source.cls.name)} · ${esc(source.record.session)} · ${esc(source.record.date)} ${esc(source.record.time)}</p>${tags.map(tag=>`<span class="pill">${esc(tag)}</span>`).join('')}<p class="help">已将原课节信息带入下方筛选，可重新选择；筛选调整不改变原缺课记录。</p></section>`+
    `<section class="card pad"><h2 class="section-title">选择补课班级</h2><div class="class-management-filters">${makeupFilterFields()}</div><div class="toolbar" style="margin-top:18px"><span class="help">老师支持授课老师或教务老师；班级和课节均可分页查看。</span><div class="toolbar-right"><button class="btn small" onclick="makeupResetFilters(true)">恢复原课节条件</button><button class="btn small" onclick="makeupResetFilters()">清空筛选</button></div></div><div id="makeup-picker-classes">${makeupClassResults()}</div></section>`+
    `<section class="card pad" id="makeup-picker-lesson-panel" style="margin-top:20px"><div class="toolbar"><h2 class="section-title" style="margin:0">${cls?esc(cls.name)+' · 选择课节':'选择补课课节'}</h2>${cls?`<input class="input" style="max-width:300px" aria-label="搜索课节" placeholder="搜索讲次、名称或日期" value="${esc(draft.lessonSearch)}" oninput="makeupSearchLessons(this.value)">`:''}</div><div id="makeup-picker-lessons">${makeupLessonResults()}</div><div class="enrollment-picker-footer"><span id="makeup-picker-summary">${makeupSelectionSummary()}</span><div><button class="btn" onclick="makeupCancelPicker()">取消</button> <button class="btn primary" onclick="makeupConfirmPicker()">确认补课</button></div></div></section>`;
}
// 保持管理列表入口，使用页内独立页面代替原小弹窗。
const makeupPreviousPage=makeupPage;
makeupPage=function(){
  if(makeupPickerDraft())return makeupPickerPage();
  let html=makeupPreviousPage().replace(/a\.modal='makeup:(\d+)';academicRender\(\)/g,'makeupOpenPicker($1)');
  // 展示实际选择的补课班级与课节，方便安排完成后核对。
  const records=a.attendance.filter(r=>['请假','旷课'].includes(r.attendance));let position=0;
  html=html.replace(/<td>(未补课|已安排|已补课|不补课)<\/td>/g,(match,status)=>{
    const record=records[position++],plan=record?.makeupPlan;
    return plan&&status==='已安排'?`<td>${status}<div class="help">${esc(plan.className)}<br>${esc(plan.session)} · ${esc(plan.date)} ${esc(plan.time)}</div></td>`:match;
  });
  return html;
};
function makeupCloseAbandonedPicker(){if(a.makeupPicker&&(state.page!=='makeup'||a.makeupPicker.actor!==studentTermActor()))a.makeupPicker=null}
const makeupPreviousRender=render,makeupPreviousAcademicRender=academicRender;
render=function(){makeupCloseAbandonedPicker();return makeupPreviousRender()};
academicRender=function(){makeupCloseAbandonedPicker();return makeupPreviousAcademicRender()};
