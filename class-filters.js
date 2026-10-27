function classManagementEmptyFilters(){return {term:'',course:'',grade:'',subject:'',campus:'',teacher:'',status:'',format:'',search:''}}
function classManagementFilters(){return a.classManagementFilters??=classManagementEmptyFilters()}
function classManagementRows(){
  return a.classes.map((cls,index)=>{
    const info=enrollmentClassInfo(cls);
    return {...cls,index,status:classScheduleStatus(cls),term:studentClassTerm(cls)||info.term||'__unknown',grade:info.grade,subject:info.subject,format:String(info.format||'').replace(/课$/,''),academicTeacher:classAcademicTeacherLabel(cls)};
  });
}
function classManagementFiltered(){
  const f=classManagementFilters(),search=f.search.trim().toLowerCase();
  return classManagementRows().filter(c=>['term','course','subject','campus','status','format'].every(key=>!f[key]||c[key]===f[key])&&
    (!f.grade||enrollmentGradeKey(c.grade)===f.grade)&&(!f.teacher||c.teacher===f.teacher||c.academicTeacher===f.teacher)&&(!search||String(c.name||'').toLowerCase().includes(search)));
}
function classManagementTermLabel(term){return term==='__unknown'?'待补学期':studentTermParts(term)?studentTermLabel(term):term}
function classManagementOptions(key){
  const options=new Map();
  for(const c of classManagementRows()){
    if(key==='teacher'){for(const name of [c.teacher,c.academicTeacher])if(name)options.set(name,name)}
    else if(key==='grade'){if(c.grade)options.set(enrollmentGradeKey(c.grade),c.grade)}
    else if(c[key])options.set(c[key],key==='term'?classManagementTermLabel(c[key]):key==='format'?c[key]+'课':c[key]);
  }
  return [...options];
}
function classManagementFilterFields(){
  const f=classManagementFilters();
  return [['term','学期'],['course','课程'],['grade','年级'],['subject','科目'],['campus','校区'],['teacher','老师'],['status','状态'],['format','授课形式']].map(([key,label])=>
    `<div class="field"><label for="class-management-${key}">${label}</label><select class="select" id="class-management-${key}" onchange="classManagementSetFilter('${key}',this.value)"><option value="">全部${label}</option>${classManagementOptions(key).map(([value,text])=>`<option value="${esc(value)}"${f[key]===value?' selected':''}>${esc(text)}</option>`).join('')}</select></div>`).join('')+
    `<div class="field class-management-search"><label for="class-management-search">班级名称</label><input class="input" id="class-management-search" placeholder="请输入班级名称" value="${esc(f.search)}" oninput="classManagementSetFilter('search',this.value)"></div>`;
}
function classManagementResults(){
  const rows=classManagementFiltered();
  return aTable(['班级ID','班级名称','授课形式','课程名称','授课老师','上课时间','在班人数','状态','操作'],rows.map(c=>`<tr><td>${esc(c.id)}</td><td><a onclick="classOpenDetail(${c.index})">${esc(c.name)}</a></td><td>${esc(c.format||'—')}</td><td>${esc(c.course||'—')}</td><td>${esc(c.teacher||'—')}</td><td>${esc(c.date||'—')} ${esc(c.time||'')}</td><td>${c.students??0}/${c.capacity??'—'}</td><td><span class="badge ${c.status==='开课中'?'':'off'}">${esc(c.status||'—')}</span></td><td><div class="actions"><a onclick="classOpenDetail(${c.index})">详情</a><a onclick="a.selectedClass=${c.index};nav('classForm')">编辑</a><a onclick="a.selectedClass=${c.index};a.modal='addStudent';academicRender()">添加学生</a></div></td></tr>`))+
    (!rows.length?'<div class="empty">暂无符合条件的班级，请调整筛选条件。</div>':'')+`<div class="data-bar">共 ${rows.length} 条班级 · 在班合计 ${rows.reduce((sum,c)=>sum+(Number(c.students)||0),0)} 人次</div>`;
}
function classManagementTrialRoster(){const ids=new Set(classManagementFiltered().map(c=>c.id));return trialRosterHTML(trialState.requests.filter(r=>r.status==='已排班'&&ids.has(r.classId)))}
function classManagementSetFilter(key,value){
  if(!Object.hasOwn(classManagementEmptyFilters(),key))return;
  classManagementFilters()[key]=value;$('#class-management-results').innerHTML=classManagementResults();$('#class-management-trials').innerHTML=classManagementTrialRoster();
}
function classManagementResetFilters(){a.classManagementFilters=classManagementEmptyFilters();academicRender()}
classesPage=function(){
  return aHeading('班级管理','创建班级、排课并管理在班学生')+`<div class="card pad"><div class="class-management-filters">${classManagementFilterFields()}</div><div class="toolbar class-management-filter-actions"><span class="help">老师可筛选授课老师或教务老师。</span><button class="btn small" onclick="classManagementResetFilters()">重置筛选</button></div><div class="toolbar"><div class="toolbar-left"><button class="btn primary" onclick="classOpenCreate()">+ 创建班级</button><button class="btn" onclick="toast('批量建班规则待确认')">批量建班</button><button class="btn" onclick="toast('导出为原型展示')">导出班级列表</button></div></div><div id="class-management-results">${classManagementResults()}</div></div><div id="class-management-trials">${classManagementTrialRoster()}</div>`;
};
