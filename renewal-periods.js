// 续报期属于原班所在学期；只配置适用范围和时间，不自动创建活动或优惠。
let systemConfigTab='分校信息';
let renewalPeriodDraft=null,renewalCourseSequence=0;
function renewalCourseId(course){return course.id??=(globalThis.crypto?.randomUUID?.()||'renewal-course-'+Date.now()+'-'+(++renewalCourseSequence))}
function renewalPeriodRows(){return a.renewalPeriods??=[]}
function renewalPeriodDateTime(value,end=false){
  return /^\d{4}-\d{2}-\d{2}$/.test(value)?value+(end?'T23:59':'T00:00'):String(value||'');
}
function renewalPeriodTime(value,end=false){
  const text=renewalPeriodDateTime(value,end),match=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(text);
  if(!match)return NaN;
  const [,year,month,day,hour,minute]=match.map(Number),date=new Date(year,month-1,day,hour,minute);
  if(date.getFullYear()!==year||date.getMonth()!==month-1||date.getDate()!==day||date.getHours()!==hour||date.getMinutes()!==minute)return NaN;
  return date.getTime()+(end?59999:0);
}
function renewalPeriodTimeLabel(value,end=false){return renewalPeriodDateTime(value,end).replace('T',' ')}
function renewalPeriodDefault(){
  const now=new Date(),month=now.getMonth()+1;
  return {year:now.getFullYear(),term:month<=2?'寒假':month<=6?'春季':month<=8?'暑期':'秋季',start:'',end:'',scopeType:'grade',all:true,selected:[],active:true};
}
function renewalPeriodOptions(d=renewalPeriodDraft){
  if(d.scopeType==='grade')return leadConfiguredGradeNames().map(name=>[leadGradeKey(name),name]);
  return a.courses.filter(c=>String(c.year)===String(d.year)&&studentTermSeason(c.term)===d.term).map(c=>[renewalCourseId(c),c.name]);
}
function renewalPeriodCourseSelect(d){
  const multiple=!d.all&&d.selected.length!==1;
  return `<select class="select" id="renewal-course-filter" aria-label="适用课程" onchange="renewalPeriodSelectCourse(this.value)"><option value="" ${d.all?'selected':''}>全部课程</option>${multiple?`<option value="__custom__" selected disabled>${d.selected.length?'已选 '+d.selected.length+' 门课程':'请选择课程'}</option>`:''}${renewalPeriodOptions(d).map(([id,name])=>`<option value="${esc(id)}" ${!d.all&&d.selected.length===1&&d.selected[0]===id?'selected':''}>${esc(name)}</option>`).join('')}</select>`;
}
function renewalPeriodSelectCourse(id){
  const d=renewalPeriodDraft;if(!d||d.scopeType!=='course')return;
  if(id&&!renewalPeriodOptions(d).some(([key])=>key===id))return;
  d.all=id==='';d.selected=id?[id]:[];render();
}
function renewalPeriodEdit(id){
  if(state.page!=='system'||!permissionCanVisit('system'))return;
  const row=renewalPeriodRows().find(r=>r.id===id);
  if(id&&!row)return;
  renewalPeriodDraft=row?{...row,start:renewalPeriodDateTime(row.start),end:renewalPeriodDateTime(row.end,true),selected:[...row.selected]}:renewalPeriodDefault();render();
}
function renewalPeriodChange(key,value){
  if(!renewalPeriodDraft)return;
  renewalPeriodDraft[key]=value;
  if(key==='all'){renewalPeriodDraft.selected=[];return}
  if(['scopeType','year','term'].includes(key)){renewalPeriodDraft.selected=[];renewalPeriodDraft.all=true;render()}
}
function renewalPeriodToggle(id,checked){
  const d=renewalPeriodDraft;if(!d)return;
  const ids=renewalPeriodOptions(d).map(([key])=>key);if(!ids.includes(id))return;
  const selected=d.all?ids:d.selected;
  d.selected=checked?[...new Set([...selected,id])]:selected.filter(key=>key!==id);
  d.all=ids.length>0&&ids.every(key=>d.selected.includes(key));
  if(d.all)d.selected=[];
  render();
}
function renewalPeriodMatches(period,row){
  if(!period.active||studentTermKey(period.year,period.term)!==row.term)return false;
  if(period.all)return true;
  if(period.scopeType==='grade')return period.selected.includes(leadGradeKey(row.grade));
  const cls=a.classes.find(c=>c.id===row.classId),course=cls&&a.courses.find(c=>c.name===cls.course);
  return !!course&&period.selected.includes(renewalCourseId(course));
}
function renewalPeriodStatus(period,now=new Date()){
  if(!period.active)return '已停用';
  const time=typeof now==='string'?renewalPeriodTime(now):Number(now);
  return time<renewalPeriodTime(period.start)?'未开始':time>renewalPeriodTime(period.end,true)?'已结束':'续报期内';
}
function renewalPeriodFor(row){
  return renewalPeriodRows().filter(p=>renewalPeriodMatches(p,row)).sort((x,y)=>(renewalPeriodStatus(x)==='续报期内'?-1:0)-(renewalPeriodStatus(y)==='续报期内'?-1:0)||y.start.localeCompare(x.start))[0];
}
function renewalPeriodScopeOverlap(x,y){
  if(x.all||y.all)return true;
  if(x.scopeType===y.scopeType)return x.selected.some(key=>y.selected.includes(key));
  const grades=x.scopeType==='grade'?x:y,courses=x.scopeType==='course'?x:y;
  return a.courses.some(c=>courses.selected.includes(renewalCourseId(c))&&grades.selected.includes(leadGradeKey(c.grade)));
}
function renewalPeriodSave(){
  if(state.page!=='system'||!permissionCanVisit('system'))return;
  const d=renewalPeriodDraft;if(!d)return;
  const start=renewalPeriodTime(d.start),end=renewalPeriodTime(d.end,true);
  if(!Number.isInteger(Number(d.year))||Number(d.year)<2000||Number(d.year)>2100||!studentTermSeasons.includes(d.term)){toast('请选择有效年份和学期');return}
  if(!Number.isFinite(start)||!Number.isFinite(end)||start>end){toast('请填写有效的起止日期和时间，结束时间不能早于开始时间');return}
  if(!d.all&&(!d.selected.length||d.selected.some(key=>!renewalPeriodOptions(d).some(([id])=>id===key)))){toast('请至少选择一个有效的适用年级或课程');return}
  if(d.active&&renewalPeriodRows().some(p=>p.id!==d.id&&p.active&&String(p.year)===String(d.year)&&p.term===d.term&&renewalPeriodTime(p.start)<=end&&renewalPeriodTime(p.end,true)>=start&&renewalPeriodScopeOverlap(p,d))){toast('所选范围在这段时间已有续报期，请编辑原配置或调整时间、范围');return}
  const row={...d,start:renewalPeriodDateTime(d.start),end:renewalPeriodDateTime(d.end,true),year:Number(d.year),selected:d.all?[]:[...d.selected],id:d.id||'RP-'+Date.now()+'-'+Math.random().toString(36).slice(2,8),updatedAt:new Date().toISOString()};
  const index=renewalPeriodRows().findIndex(p=>p.id===row.id);
  if(index<0)a.renewalPeriods.push(row);else a.renewalPeriods[index]=row;
  renewalPeriodDraft=null;render();toast('续报期已保存');
}
function renewalPeriodScopeText(row){
  if(row.all)return row.scopeType==='grade'?'全部年级':'全部课程';
  return row.selected.map(id=>row.scopeType==='grade'?renewalPeriodOptions({...row,scopeType:'grade'}).find(([key])=>key===id)?.[1]||id:a.courses.find(c=>c.id===id)?.name||'已移除课程').join('、');
}
function renewalPeriodsPage(embedded=false){
  const d=renewalPeriodDraft;
  if(d){
    const options=renewalPeriodOptions(d);
    return (embedded?'':aHeading(d.id?'编辑续报期':'设置续报期','按学生当前就读的年份、学期设置，精确设置续报开始和结束时间'))+`<section class="${embedded?'pad':'card pad'}"><div class="form-grid">${aField('原班年份',`<input class="input" aria-label="原班年份" type="number" min="2000" max="2100" value="${esc(d.year)}" onchange="renewalPeriodChange('year',this.value)">`,true)}${aField('原班学期',`<select class="select" aria-label="原班学期" onchange="renewalPeriodChange('term',this.value)">${studentTermSeasons.map(term=>`<option ${d.term===term?'selected':''}>${term}</option>`).join('')}</select>`,true)}${aField('开始时间',`<input class="input" aria-label="续报开始时间" type="datetime-local" step="60" value="${esc(d.start)}" onchange="renewalPeriodChange('start',this.value)">`,true)}${aField('结束时间',`<input class="input" aria-label="续报结束时间" type="datetime-local" step="60" value="${esc(d.end)}" onchange="renewalPeriodChange('end',this.value)">`,true)}${aField('适用方式',`<select class="select" aria-label="续报适用方式" onchange="renewalPeriodChange('scopeType',this.value)"><option value="grade" ${d.scopeType==='grade'?'selected':''}>按年级</option><option value="course" ${d.scopeType==='course'?'selected':''}>按课程</option></select>`,true)}${d.scopeType==='course'?aField('课程',renewalPeriodCourseSelect(d),true):''}${aField('状态',`<label><input type="checkbox" ${d.active?'checked':''} onchange="renewalPeriodChange('active',this.checked)"> 启用</label>`)}</div><hr class="divider"><label><input type="checkbox" aria-label="适用全部" ${d.all?'checked':''} onchange="renewalPeriodChange('all',this.checked);render()"> ${d.scopeType==='grade'?'全部年级':'全部课程'}</label>${`<div class="form-grid" style="margin-top:18px">${options.map(([id,label])=>`<label><input type="checkbox" aria-label="适用${esc(label)}" ${d.all||d.selected.includes(id)?'checked':''} onchange="renewalPeriodToggle(${studentLifecycleArg(id)},this.checked)"> ${esc(label)}</label>`).join('')||'<p class="help">暂无可选项，请先在教学配置中设置年级，或创建对应年份、学期的课程。</p>'}</div>`}<p class="help">例如：2026秋季学生在此期间续报2027春季，配置在2026秋季下。选择全部时，后续新增的对应年级或课程也适用。优惠金额在报名时按已配置的优惠录入。</p><div class="form-actions"><button class="btn" onclick="renewalPeriodDraft=null;render()">取消</button><button class="btn primary" onclick="renewalPeriodSave()">保存续报期</button></div></section>`;
  }
  const rows=renewalPeriodRows().slice().sort((x,y)=>y.year-x.year||y.start.localeCompare(x.start));
  return (embedded?'':aHeading('续报配置','配置原班学期的续报日期；教师推动，教务协同'))+`<section class="${embedded?'pad':'card pad'}"><div class="toolbar"><span class="help">不会自动沿用上一年的日期，请按每个学期设置。</span><button class="btn primary" onclick="renewalPeriodEdit()">+ 设置续报期</button></div>${aTable(['原班年份 / 学期','续报时间','适用范围','状态','适用学生','操作'],rows.map(row=>`<tr><td>${esc(row.year)}年${esc(row.term)}</td><td>${esc(renewalPeriodTimeLabel(row.start))} 至 ${esc(renewalPeriodTimeLabel(row.end,true))}</td><td>${esc(renewalPeriodScopeText(row))}</td><td>${renewalPeriodStatus(row)}</td><td>${new Set(studentTermEnrollments().filter(r=>!['已退费','已退班','已转班','已取消'].includes(r.status)&&renewalPeriodMatches(row,r)).map(r=>r.studentId)).size} 人</td><td><button class="btn small" onclick="renewalPeriodEdit(${studentLifecycleArg(row.id)})">编辑</button></td></tr>`))}${rows.length?'':'<div class="empty">尚未设置续报期。设置后，学生购课记录将显示原班对应的续报时间。</div>'}</section>`;
}
function systemConfigSelect(tab){
  if(!['分校信息','续报配置'].includes(tab)||!permissionCanVisit('system'))return;
  renewalPeriodDraft=null;systemConfigTab=tab;render();
}
const renewalPeriodSystemPage=systemPage;
systemPage=function(){
  const tabs=`<div class="tabs" role="tablist" aria-label="分校配置">${['分校信息','续报配置'].map(tab=>`<button class="tab ${systemConfigTab===tab?'active':''}" role="tab" aria-selected="${systemConfigTab===tab}" onclick="systemConfigSelect('${tab}')">${tab}</button>`).join('')}${['考勤配置','调课配置','转班配置','进班配置'].map(tab=>`<button class="tab" role="tab" disabled title="功能清单标注为暂未开发">${tab}</button>`).join('')}</div>`;
  if(systemConfigTab==='续报配置')return heading('分校配置','配置分校资料及业务规则')+`<div class="card">${tabs}${renewalPeriodsPage(true)}</div>`;
  return renewalPeriodSystemPage().replace(/<div class="tabs">[\s\S]*?<\/div>/,tabs).replace('文档注明其余配置标签暂未开发，原型中以禁用状态展示。','考勤、调课、转班、进班配置暂未开发，以禁用状态展示。');
};
const renewalPeriodPreviousRender=render;
render=function(){
  // 兼容旧入口，配置与权限统一归属分校配置。
  if(state.page==='renewalPeriods'){state.page='system';systemConfigTab='续报配置'}
  if(state.page!=='system'){renewalPeriodDraft=null;systemConfigTab='分校信息'}
  return renewalPeriodPreviousRender();
};
