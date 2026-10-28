// 学生详情以稳定学生 ID 汇总沟通、学习档案与历史课程。附件沿用会话内存储。
const studentProfileState={tab:'沟通记录',communicationType:'全部',editing:false,basicExpanded:false,archiveType:'全部',archiveDraft:null,sequence:0};
// 沿用订单模块对旧演示订单的关联迁移，随后均通过学生 ID 查询历史。
a.orders.forEach(orderPrepare);
function studentProfileCurrent(){return a.students[a.selectedStudent]||null}
function studentProfileAllowed(){return permissionCanVisit('studentDetail')}
function studentProfileLinks(s){
  const ids=new Set([s.originLeadId,...a.orders.filter(o=>o.studentId===s.id).map(o=>o.originLeadId),...trialState.requests.filter(r=>r.studentId===s.id).map(r=>r.leadId)].filter(Boolean));
  return leadState.leads.filter(l=>(l.studentId&&String(l.studentId)===String(s.id))||(l.leadId&&ids.has(l.leadId)));
}
function studentProfileInfo(s){const lead=studentProfileLinks(s)[0]||{};return {...lead,...s,schools:s.schools||lead.schools||(s.school||lead.school?[{stage:'',name:s.school||lead.school,entryYear:''}]:[])}}
function studentProfileInput(id,value='',type='text'){return `<input class="input" id="${id}" type="${type}" value="${esc(value??'')}">`}
function studentProfileSelect(id,values,current='',placeholder='请选择'){return `<select class="select" id="${id}"><option value="">${placeholder}</option>${values.map(v=>`<option value="${esc(v)}" ${v===current?'selected':''}>${esc(v)}</option>`).join('')}</select>`}
function studentProfileTime(value){if(!/^\d{4}[-/]/.test(value||''))return value||'时间未记录';const d=new Date(value);return Number.isFinite(d.getTime())?d.toLocaleString('zh-CN',{hour12:false}):value||'时间未记录'}
function studentProfileLocalTime(){const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16)}
function studentProfileTab(tab){if(!['基本信息','沟通记录','在读课程','学习档案','购课信息'].includes(tab))return;studentProfileState.editing=false;if(tab==='基本信息'){studentProfileState.basicExpanded=true;tab='学习档案'}studentProfileState.tab=tab;academicRender()}
function studentProfileBasic(s,readOnly=false){
  const d=studentProfileInfo(s),fields=[['学生姓名','name'],['联系电话','phone'],['年级','grade'],['招生家长','guardian'],['性别','gender'],['来源渠道','source'],['所属校区','campus'],['意向学科','subject']];
  if(studentProfileState.editing&&!readOnly)return `<section class="card pad page-block"><h2 class="section-title">编辑基本信息</h2><div class="form-grid">${fields.map(([label,key])=>aField(label,studentProfileInput('profile-'+key,d[key]),['name','phone'].includes(key))).join('')}<div class="field full"><label>公立学校</label><div id="profile-schools">${d.schools.map(studentProfileSchoolRow).join('')}</div><button class="btn small" onclick="studentProfileAddSchool()">+ 添加学校</button></div></div><div class="form-actions"><button class="btn" onclick="studentProfileState.editing=false;academicRender()">取消</button><button class="btn primary" onclick="studentProfileSaveBasic()">保存基本信息</button></div></section>`;
  return `<section class="card pad page-block"><div class="toolbar"><h2 class="section-title">基本信息</h2>${readOnly?'':'<button class="btn" onclick="studentProfileState.editing=true;academicRender()">编辑基本信息</button>'}</div><div class="academic-grid three">${fields.map(([label,key])=>`<div><span class="muted">${label}：</span>${esc(d[key]||'—')}</div>`).join('')}<div><span class="muted">学生ID：</span>${esc(s.id)}</div><div><span class="muted">公立学校：</span>${d.schools.map(x=>esc([x.stage,x.name,x.entryYear&&x.entryYear+'年入学'].filter(Boolean).join(' · '))).join('；')||'—'}</div></div></section>`;
}
function studentProfileSchoolRow(row={}){return `<div class="profile-school-row"><input class="input profile-school-stage" placeholder="学段" value="${esc(row.stage||'')}"><input class="input profile-school-name" placeholder="学校名称" value="${esc(row.name||'')}"><input class="input profile-school-year" placeholder="入学年份" value="${esc(row.entryYear||'')}"><button class="btn small" onclick="this.parentElement.remove()">移除</button></div>`}
function studentProfileAddSchool(){$('#profile-schools').insertAdjacentHTML('beforeend',studentProfileSchoolRow())}
function studentProfileSaveBasic(){
  const s=studentProfileCurrent();if(!s||!studentProfileAllowed())return;
  const data={};for(const key of ['name','phone','grade','guardian','gender','source','campus','subject'])data[key]=$('#profile-'+key).value.trim();
  if(!data.name||!data.phone){toast('请填写学生姓名和联系电话');return}
  if(data.phone!==studentProfileInfo(s).phone&&!/^1\d{10}$/.test(data.phone)){toast('请输入11位手机号码');return}
  data.schools=[...document.querySelectorAll('.profile-school-row')].map(row=>({stage:row.querySelector('.profile-school-stage').value.trim(),name:row.querySelector('.profile-school-name').value.trim(),entryYear:row.querySelector('.profile-school-year').value.trim()})).filter(row=>row.name||row.entryYear||row.stage);
  if(data.schools.some(row=>!row.name||(row.entryYear&&!/^\d{4}$/.test(row.entryYear)))){toast('请填写学校名称，并检查入学年份');return}
  data.school=data.schools[0]?.name||'';data.subjects=data.subject.split(/[、,，]/).map(x=>x.trim()).filter(Boolean);
  const linked=studentProfileLinks(s);Object.assign(s,data);linked.forEach(lead=>Object.assign(lead,data));
  studentProfileState.editing=false;academicRender();toast('基本信息已更新');
}
function studentProfileRecordTime(record){
  const value=record?.[3]?.communication?.occurredAt||record?.[3]?.recordedAt||record?.[1];
  return /^\d{4}[-/]/.test(value||'')?Date.parse(value):NaN;
}
function studentProfileFirstEnrollment(s,linked=studentProfileLinks(s)){
  const dates=[s.firstEnrolledAt,...a.orders.filter(o=>o.studentId===s.id&&!['已取消','已关闭','交易关闭'].includes(o.status)&&o.productCategory!=='试听课').map(o=>o.createdAt)];
  const times=dates.map(value=>/^\d{4}[-/]/.test(value||'')?Date.parse(value):NaN);
  for(const lead of linked)for(const record of lead.history||[])if(record[0]==='报名完成')times.push(studentProfileRecordTime(record));
  const valid=times.filter(Number.isFinite);return valid.length?Math.min(...valid):Infinity;
}
function studentProfileCommunications(s){
  const linked=studentProfileLinks(s),cutoff=studentProfileFirstEnrollment(s,linked);
  const rows=(s.communications||[]).map(r=>({...r}));
  const seen=new Set();
  const leadIds=new Set(linked.map(l=>l.leadId).filter(Boolean));
  const trialHistory=trialState.requests.filter(r=>r.studentId===s.id||(r.leadId&&leadIds.has(r.leadId))).map(r=>r.informationRecord).filter(Boolean);
  // 直接读取原线索历史，包括建档招生；报名完成的位置也能界定缺少年份的旧记录。
  const history=linked.flatMap(lead=>{
    const records=lead.history||[],end=records.findIndex(record=>record[0]==='报名完成');
    return records.map((record,index)=>({record,source:true,beforeMarker:end<0||index<end}));
  }).concat([...(s.history||[]),...trialHistory].map(record=>({record,source:false,beforeMarker:true})));
  for(const {record,source,beforeMarker} of history){
    const [title,time,text,meta={}]=record,timestamp=studentProfileRecordTime(record);
    const presale=beforeMarker&&title!=='报名完成'&&(!Number.isFinite(timestamp)||timestamp<cutoff);
    if(!(source&&presale)&&!meta.communication&&!/沟通|跟进|回访|信息记录|试听预约信息/.test(title))continue;
    const key=meta.id||JSON.stringify([title,time,text,meta.recordedAt,meta.operator,leadRecordFiles(meta).map(f=>f.url)]);
    if(seen.has(key))continue;seen.add(key);
    const role=meta.operator?.role||meta.communication?.role||'招生';
    const category=presale?'售前沟通':(/教务/.test(role)?'教务沟通':/教师|授课|教学/.test(role)?'教师沟通':'未分类');
    rows.push({id:meta.id,title,time:meta.communication?.occurredAt||meta.recordedAt||time,text,files:leadRecordFiles(meta),channel:meta.communication?.channel,result:meta.communication?.result,nextTime:meta.communication?.nextTime,operator:meta.operator||{name:meta.communication?.actor||'未记录'},role,category,source:source?'线索管理':'历史记录',legacy:true});
  }
  const time=r=>/^\d{4}[-/]/.test(r.time||'')?(Date.parse(r.time)||0):0;
  return rows.sort((x,y)=>time(y)-time(x));
}
const studentCommunicationTypes=['售前沟通','教务沟通','教师沟通'];

function studentCommunicationCategory(record){
  if(record.category==='未分类')return '未分类';
  if(studentCommunicationTypes.includes(record.category))return record.category;
  const role=record.role||record.operator?.role||'';
  if(/教务/.test(role))return '教务沟通';
  if(/教师|授课|教学/.test(role))return '教师沟通';
  if(/招生|销售|售前/.test(role))return '售前沟通';
  return '未分类';
}
function studentCommunicationSetType(type){
  if(!['全部',...studentCommunicationTypes,'未分类'].includes(type)||state.page!=='studentDetail')return;
  studentProfileState.communicationType=type;academicRender();
}
function studentCommunicationDock(){
  if(!permissionCanVisit('studentCommunication'))return '';
  return `<footer class="lead-detail-dock" aria-label="教务沟通操作"><div class="lead-detail-dock-inner"><button class="btn small lead-call-action" onclick="studentOpenCommunication(undefined,'电话')">☎ 话务呼叫</button><button class="btn small" onclick="studentOpenCommunication(undefined,'企微')">☏ 企微沟通</button><button class="btn small lead-upload-action" onclick="studentOpenCommunication(undefined,'其他')">↑ 上传沟通记录</button></div></footer>`;
}
const studentCommunicationSummaries=new Map();
function studentCommunicationSummaryKey(s,type){return JSON.stringify([studentTermActor(),s.id,type])}
function studentCommunicationSummaryFingerprint(rows){return JSON.stringify(rows.map(r=>[r.id,r.title,r.time,r.text,r.role,r.category,r.operator,r.nextTime,(r.files||[]).map(f=>[f.fileName,f.transcript])]))}
function studentCommunicationSummary(s,rows,type){
  const saved=studentCommunicationSummaries.get(studentCommunicationSummaryKey(s,type));
  const current=saved?.fingerprint===studentCommunicationSummaryFingerprint(rows)?saved:null;
  const title=type==='全部'?'全部沟通':type;
  const people=[...new Set(rows.map(r=>r.operator?.name).filter(name=>name&&name!=='未记录'))];
  const latest=rows[0],next=rows.find(r=>r.nextTime),attachments=rows.reduce((sum,r)=>sum+(r.files||[]).length,0);
  const content=!rows.length?'<p class="help">暂无沟通记录，记录后即可生成汇总。</p>':current?.text?`<div class="profile-text">${esc(current.text)}</div>`:`<p><strong>沟通概览：</strong>${esc(s.name)}的${esc(title)}共 ${rows.length} 条${people.length?'，记录人员：'+esc(people.join('、')):''}，附件 ${attachments} 个。</p><p><strong>最近记录：</strong>${esc(studentProfileTime(latest.time))} · ${esc(latest.text||'仅附件记录')}</p><p><strong>近期要点：</strong></p><ul>${rows.slice(0,3).map(r=>`<li>${esc(r.text||'附件记录')}</li>`).join('')}</ul><p><strong>后续安排：</strong>${next?'已记录下次沟通时间：'+esc(studentProfileTime(next.nextTime)):'当前记录未填写下次沟通时间。'}</p>`;
  return `<section class="lead-summary" style="margin:0 0 24px"><div class="lead-summary-heading"><div><h2>AI 沟通总结 · ${esc(title)}</h2><span>${current?.text?'基于当前分类全部记录生成':'基于当前记录整理 · 演示摘要'}</span></div><button class="btn small" ${!rows.length||current?.busy?'disabled':''} onclick="studentCommunicationRefreshSummary()">${current?.busy?'正在汇总…':'刷新总结'}</button></div>${type==='售前沟通'?'<p class="help">自动汇入该学生在线索管理中从建档到首次正式报名之前的完整跟进记录。</p>':''}${content}${current?.error?`<p class="help" role="status">${esc(current.error)}</p>`:''}</section>`;
}
async function studentCommunicationRefreshSummary(){
  const s=studentProfileCurrent();if(!s||!studentProfileAllowed())return;
  const type=state.page==='studentDetail'?studentProfileState.communicationType:'全部';
  const rows=studentProfileCommunications(s).filter(r=>type==='全部'||studentCommunicationCategory(r)===type);
  if(!rows.length)return;
  const key=studentCommunicationSummaryKey(s,type),fingerprint=studentCommunicationSummaryFingerprint(rows);
  if(studentCommunicationSummaries.get(key)?.busy)return;
  if(typeof globalThis.crmSummarizeCommunications!=='function'){toast('已刷新演示摘要；AI 总结服务尚未接入');if(state.page==='studentDetail')academicRender();return}
  const entry={fingerprint,busy:true};studentCommunicationSummaries.set(key,entry);
  const refresh=()=>{if(studentProfileCurrent()?.id===s.id&&state.page==='studentDetail')academicRender()};refresh();
  try{
    const result=await globalThis.crmSummarizeCommunications({student:{id:s.id,name:s.name},category:type,records:rows.map(r=>({title:r.title,time:r.time,text:r.text,role:r.role,operator:r.operator,category:studentCommunicationCategory(r),nextTime:r.nextTime,attachments:(r.files||[]).map(f=>({fileName:f.fileName,transcript:f.transcript||''}))}))});
    const text=typeof result?.text==='string'?result.text.trim():'';if(!text)throw Error('empty');entry.text=text;
  }catch{entry.error='AI 总结生成失败，可重试；原沟通记录已保留。'}
  finally{entry.busy=false;refresh()}
}
function studentProfileTimeline(s,interactive=true){
  const all=studentProfileCommunications(s),type=interactive?studentProfileState.communicationType:'全部';
  const rows=all.filter(r=>type==='全部'||studentCommunicationCategory(r)===type);
  const types=['全部',...studentCommunicationTypes,...(all.some(r=>studentCommunicationCategory(r)==='未分类')?['未分类']:[])];
  return `<div class="toolbar"><span class="muted">共 ${rows.length} 条沟通 · 按时间倒序</span></div>${interactive?`<div class="actions" role="group" aria-label="沟通分类" style="margin-bottom:20px;flex-wrap:wrap">${types.map(t=>`<button class="btn small ${t===type?'primary':''}" aria-pressed="${t===type}" onclick="studentCommunicationSetType('${t}')">${t} ${t==='全部'?all.length:all.filter(r=>studentCommunicationCategory(r)===t).length}</button>`).join('')}</div>`:''}${studentCommunicationSummary(s,rows,type)}${rows.length?`<div class="profile-timeline">${rows.map(r=>`<article class="profile-event"><div class="toolbar"><strong>${esc(studentCommunicationCategory(r))} · ${esc(r.title||r.channel||'日常沟通')}${r.result?' · '+esc(r.result):''}</strong><time>${esc(studentProfileTime(r.time))}</time></div><p class="help">岗位：${esc(r.role||'未记录')} · 人员：${esc(r.operator?.name||'未记录')}${r.contact?' · 沟通对象：'+esc(r.contact):''}</p><div class="profile-text">${esc(r.text||'')}</div>${r.nextTime?`<p class="help">下次沟通：${esc(studentProfileTime(r.nextTime))}</p>`:''}${leadRecordFilesHTML(r)}</article>`).join('')}</div>`:`<div class="empty">暂无${type==='全部'?'沟通记录，售前、教务与教师的沟通会统一展示在这里':type+'记录'}。</div>`}`;
}
function studentProfileEnrollmentTime(student,row){
  const cls=a.classes.find(c=>c.id===row.classId);
  const matches=item=>{
    const sameClass=item.classId&&row.classId?String(item.classId)===String(row.classId):Boolean(item.className&&item.className===row.className);
    const term=studentClassTerm(cls,item);
    return sameClass&&(!term||!row.term||term===row.term);
  };
  const enrollment=(student.enrollments||[]).filter(matches).at(-1);
  if(enrollment?.enrolledAt&&Number.isFinite(Date.parse(enrollment.enrolledAt)))return enrollment.enrolledAt;
  const orders=a.orders.filter(o=>String(o.studentId)===String(student.id)&&(o.items||[]).some(matches)&&Number.isFinite(Date.parse(o.createdAt)));
  orders.sort((x,y)=>Date.parse(y.createdAt)-Date.parse(x.createdAt));
  return orders[0]?.createdAt||'';
}
function studentProfileCourses(s){
  const rows=studentTermEnrollments().filter(r=>r.studentId===s.id),trials=studentTermTrials().filter(r=>r.studentId===s.id);
  return `<h2 class="section-title">历次报名课程</h2>${aTable(['班级 / 课程','学期','校区','授课老师 / 教务老师','当前状态','报名时间'],rows.map(r=>`<tr><td>${esc(r.className)}<div class="help">${esc(a.classes.find(c=>c.id===r.classId)?.course||'')}</div></td><td>${esc(studentTermLabel(r.term))}</td><td>${esc(r.campus||'—')}</td><td>${esc(r.teacher||'—')} / ${esc(r.academicTeacher||'—')}</td><td>${esc(r.status)}</td><td>${esc(studentProfileEnrollmentTime(s,r)?studentProfileTime(studentProfileEnrollmentTime(s,r)):'未记录')}</td></tr>`))}${!rows.length?'<div class="empty">暂无正式报名课程</div>':''}${trials.length?`<hr class="divider"><h2 class="section-title">试听课程</h2>${aTable(['试听班级','课节','试听时间','状态'],trials.map(r=>`<tr><td>${esc(r.className)}</td><td>${esc(r.session||'—')}</td><td>${esc(r.time||'—')}</td><td>${esc(r.status)}</td></tr>`))}`:''}`;
}

studentDetail=function(){
  const s=studentProfileCurrent();if(!s)return aHeading('学生详情','未找到学生')+'<button class="btn" onclick="nav(\'students\')">返回学生管理</button>';
  const tab=studentProfileState.tab==='基本信息'?'学习档案':studentProfileState.tab,title=tab==='沟通记录'?'沟通记录':'学生档案';
  $('#crumb').textContent='教务 / 教学管理 / 学生管理 / '+title;
  const tabs=tab==='沟通记录'?'':`<div class="tabs" role="tablist" aria-label="学生档案">${[['在读课程','在读课程'],['学习档案','学习档案'],['购课信息','购课记录']].map(([key,label])=>`<button class="tab ${tab===key?'active':''}" role="tab" aria-selected="${tab===key}" onclick="studentProfileTab('${key}')">${label}</button>`).join('')}</div>`;
  const basic=`<details class="card page-block student-profile-basic" ${studentProfileState.basicExpanded||studentProfileState.editing?'open':''} ontoggle="studentProfileState.basicExpanded=this.open"><summary style="padding:18px 24px;cursor:pointer;font-weight:600">基本信息</summary><div class="pad" style="padding-top:0">${studentProfileBasic(s)}</div></details>`;
  return `<a class="back-link" onclick="studentProfileState.editing=false;nav('students')">← 返回学生管理</a>`+aHeading(title,s.name+' · '+s.id)+(tab==='沟通记录'?studentProfileBasic(s)+`<section class="card pad">${studentProfileTimeline(s)}</section><div style="height:80px" aria-hidden="true"></div>`+studentCommunicationDock():basic+`<section class="card">${tabs}<div class="pad">${tab==='在读课程'?studentProfileCurrentCourses(s):tab==='学习档案'?studentProfileArchive(s):studentProfileCourses(s)}</div></section>`);
};
function studentProfileOperatorSelect(){
  const user=state.currentUser;return user?.name?`<p>记录人：${esc(user.name)} · ${esc(user.role||permissionRole(user.roleId)?.name||permissionRole()?.name||'未配置岗位')}</p>`:aField('记录人员',`<select class="select" id="profile-recorder"><option value="">请选择本次记录人员</option>${state.staff.map((p,i)=>p.active?`<option value="${i}">${esc(p.name)} · ${esc(permissionRole(p.roleId)?.name||'未配置岗位')}</option>`:'').join('')}</select>`,true);
}
function studentProfileOperator(){
  const selected=$('#profile-recorder').value,user=state.currentUser|| (selected!==''?state.staff[Number(selected)]:null);
  if(!user?.name||user.active===false){toast('请选择记录人员');return null}
  return {name:user.name,account:user.account||user.id||user.phone||'',role:user.role||permissionRole(user.roleId)?.name||permissionRole()?.name||'未配置岗位'};
}
function studentOpenCommunication(id,channel='其他'){
  if(!permissionCanVisit('studentCommunication'))return;
  if(id!==undefined){const index=a.students.findIndex(s=>String(s.id)===String(id));if(index<0)return;a.selectedStudent=index}
  const s=studentProfileCurrent();if(!s)return;
  leadDisposeRecord();leadRecordDraft=leadCreateRecordDraft('studentCommunication');leadRecordDraft.studentId=s.id;leadRecordDraft.actorId=studentTermActor();leadRecordDraft.saveId='student-communication-save';leadRecordDraft.channel=['电话','企微','其他'].includes(channel)?channel:'其他';nav('studentCommunication');
}
function studentCommunicationPage(){
  const s=studentProfileCurrent();if(!s)return '<div class="empty">未找到学生</div>';
  if(leadRecordDraft?.context!=='studentCommunication'||leadRecordDraft.studentId!==s.id){leadDisposeRecord();leadRecordDraft=leadCreateRecordDraft('studentCommunication');leadRecordDraft.studentId=s.id;leadRecordDraft.actorId=studentTermActor();leadRecordDraft.saveId='student-communication-save'}
  return `<a class="back-link" onclick="studentCommunicationCancel()">← 返回沟通记录</a>`+aHeading('记录沟通',s.name+' · '+s.id)+`<section class="card pad"><p class="help">本页面保存的记录统一归为教务沟通，汇入学生沟通时间线。</p>${leadRecordDraft.channel==='电话'||leadRecordDraft.channel==='企微'?'<p class="notice">话务与企微服务尚未接入，请完成外部交流后在此填写结果、上传截图或语音。</p>':''}<div class="form-grid">${aField('沟通分类','<span class="badge">教务沟通</span>')}${aField('沟通时间',studentProfileInput('student-communication-time',studentProfileLocalTime(),'datetime-local'),true)}${aField('沟通方式',studentProfileSelect('student-communication-channel',['电话','企微','微信','面谈','其他'],leadRecordDraft.channel||'其他'),true)}${aField('沟通对象',studentProfileInput('student-communication-contact',studentProfileInfo(s).guardian||'家长'),true)}${aField('沟通结果',studentProfileSelect('student-communication-result',leadCommunicationResults,'有效沟通'),true)}${studentProfileOperatorSelect()}${aField('下次沟通时间',studentProfileInput('student-communication-next','','datetime-local'))}</div>${leadRecordEditor('沟通内容（必填）')}<div class="form-actions"><button class="btn" onclick="studentCommunicationCancel()">取消</button><button class="btn primary" id="student-communication-save" onclick="studentCommunicationSave()">保存沟通记录</button></div></section><section class="card pad page-block" style="margin-top:20px"><h2 class="section-title">沟通记录</h2>${studentProfileTimeline(s,false)}</section>`;
}
function studentCommunicationCancel(){leadDisposeRecord();studentProfileState.tab='沟通记录';nav('studentDetail')}
function studentCommunicationSave(){
  const s=studentProfileCurrent(),draft=leadRecordDraft;if(!s||!permissionCanVisit('studentCommunication')||draft?.context!=='studentCommunication'||draft.studentId!==s.id||draft.actorId!==studentTermActor()||!leadRecordReadyToSave())return;
  const time=$('#student-communication-time').value,channel=$('#student-communication-channel').value,contact=$('#student-communication-contact').value.trim(),result=$('#student-communication-result').value,nextTime=$('#student-communication-next').value,text=$('#'+draft.noteId).value.trim();
  if(!Number.isFinite(Date.parse(time))||Date.parse(time)>Date.now()){toast('请填写有效的沟通时间，不能晚于当前时间');return}
  if(!contact||!text||!['电话','企微','微信','面谈','其他'].includes(channel)||!leadCommunicationResults.includes(result)){toast('请完整填写沟通对象、方式、结果和内容');return}
  if(nextTime&&(!Number.isFinite(Date.parse(nextTime))||Date.parse(nextTime)<=Date.now())){toast('下次沟通时间应晚于当前时间');return}
  const category=typeof learningScopedProfile==='function'&&learningScopedProfile()?'教师沟通':'教务沟通';
  const operator=studentProfileOperator();if(!operator)return;
  const files=draft.items.map(item=>({fileName:item.file.name,url:item.url,size:item.file.size,kind:item.kind,transcript:item.transcript||''}));
  (s.communications??=[]).push({id:'student-communication-'+Date.now()+'-'+(++studentProfileState.sequence),time:new Date(time).toISOString(),recordedAt:new Date().toISOString(),channel,contact,result,nextTime,text,operator,role:operator.role,category,files});
  draft.items=[];studentProfileState.communicationType=category;studentCommunicationCancel();toast('沟通已记录到学生时间线');
}
const studentArchiveTypes=['考试成绩','试卷作业','学习事件'];
function studentProfileArchive(s){
  if(studentProfileState.archiveDraft?.studentId===s.id)return studentArchiveForm();
  const records=(s.learningRecords||[]).filter(r=>studentProfileState.archiveType==='全部'||r.type===studentProfileState.archiveType).slice().sort((x,y)=>y.date.localeCompare(x.date));
  return `<div class="toolbar"><div class="actions">${['全部',...studentArchiveTypes].map(type=>`<button class="btn ${type===studentProfileState.archiveType?'primary':''}" onclick="studentProfileState.archiveType='${type}';academicRender()">${type}</button>`).join('')}</div><button class="btn primary" onclick="studentArchiveOpen()">+ 新增学习档案</button></div><p class="help">记录成绩与分析、试卷作业、学习表现或获奖等事件。家长日常交流可通过“沟通记录”页面底部的沟通操作记录。</p>${records.map(r=>`<article class="profile-learning-card"><div class="toolbar"><strong>${esc(r.title)}</strong><span class="badge">${esc(r.type)}</span></div><p class="help">${esc(r.date)} · ${esc(r.subject||'未指定科目')}${r.className?' · '+esc(r.className):''} · ${esc(r.operator.role)} / ${esc(r.operator.name)}</p>${r.type==='考试成绩'?`<p class="profile-score">${esc(r.score)} <span class="muted">/ ${esc(r.total)} 分</span>${r.rank?'　排名：'+esc(r.rank):''}</p>`:''}<div class="profile-text">${esc(r.description)}</div>${leadRecordFilesHTML(r)}</article>`).join('')||'<div class="empty">暂无学习档案，添加第一条成绩、试卷或学习事件。</div>'}`;
}
function studentArchiveOpen(){const s=studentProfileCurrent();if(!s||!studentProfileAllowed())return;studentProfileState.archiveDraft={studentId:s.id,type:'考试成绩',files:[],actorId:studentTermActor()};academicRender()}
function studentArchiveForm(){const d=studentProfileState.archiveDraft;return `<h2 class="section-title">新增学习档案</h2><div class="form-grid">${aField('档案类型',`<select class="select" id="archive-type" onchange="studentArchiveChangeType(this.value)">${studentArchiveTypes.map(t=>`<option ${t===d.type?'selected':''}>${t}</option>`).join('')}</select>`,true)}${aField('发生日期',studentProfileInput('archive-date',studentProfileLocalTime().slice(0,10),'date'),true)}${aField('标题',studentProfileInput('archive-title'),true)}${aField('科目',studentProfileInput('archive-subject'))}${aField('关联班级',studentProfileSelect('archive-class',[...new Set([...studentTermEnrollments(),...studentTermTrials()].filter(r=>r.studentId===d.studentId).map(r=>r.className))]))}${studentProfileOperatorSelect()}</div><div class="form-grid" id="archive-score-fields">${aField('成绩',studentProfileInput('archive-score','','number'),true)}${aField('满分',studentProfileInput('archive-total','100','number'),true)}${aField('排名（选填）',studentProfileInput('archive-rank'))}</div><div class="field"><label>分析 / 说明</label><textarea class="textarea" id="archive-description" placeholder="记录薄弱知识点、改进建议，或学习事件的具体情况"></textarea></div><div class="field"><label>附件（试卷、作业图片或 PDF）</label><input type="file" accept=".png,.jpg,.jpeg,.webp,.pdf" multiple onchange="studentArchiveAddFiles(this.files);this.value=''"><p class="help">最多10个附件，单个不超过30 MB；保存后，附件随记录保存在本机浏览器中。</p><div id="archive-files"></div></div><div class="form-actions"><button class="btn" onclick="studentArchiveCancel()">取消</button><button class="btn primary" onclick="studentArchiveSave()">保存学习档案</button></div>`}
function studentArchiveChangeType(type){if(!studentArchiveTypes.includes(type))return;studentProfileState.archiveDraft.type=type;$('#archive-score-fields').hidden=type!=='考试成绩'}
function studentArchiveAddFiles(files){const d=studentProfileState.archiveDraft;if(!d)return;for(const file of Array.from(files)){if(!/\.(png|jpe?g|webp|pdf)$/i.test(file.name)||!file.size||file.size>30*1024*1024||d.files.length>=10){toast('请上传有效的图片或 PDF，单个不超过30 MB，最多10个');continue}d.files.push({fileName:file.name,size:file.size,kind:/\.pdf$/i.test(file.name)?'document':'image',url:URL.createObjectURL(file)})}studentArchiveRefreshFiles()}
function studentArchiveRefreshFiles(){$('#archive-files').innerHTML=(studentProfileState.archiveDraft?.files||[]).map((file,i)=>`<p>${esc(file.fileName)} <button class="btn small" onclick="studentArchiveRemoveFile(${i})">移除</button></p>`).join('')}
function studentArchiveRemoveFile(index){const d=studentProfileState.archiveDraft;if(!d?.files[index])return;URL.revokeObjectURL(d.files[index].url);d.files.splice(index,1);studentArchiveRefreshFiles()}
function studentArchiveCancel(){studentProfileState.archiveDraft?.files.forEach(file=>URL.revokeObjectURL(file.url));studentProfileState.archiveDraft=null;academicRender()}
function studentArchiveSave(){
  const s=studentProfileCurrent(),d=studentProfileState.archiveDraft;if(!s||!d||d.studentId!==s.id||d.actorId!==studentTermActor()||!studentProfileAllowed())return;
  const type=d.type,title=$('#archive-title').value.trim(),date=$('#archive-date').value,subject=$('#archive-subject').value.trim(),className=$('#archive-class').value,description=$('#archive-description').value.trim(),score=$('#archive-score').value,total=$('#archive-total').value,rank=$('#archive-rank').value.trim();
  if(!title||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||date>studentProfileLocalTime().slice(0,10)){toast('请填写标题和有效的发生日期');return}
  if(type==='考试成绩'&&(!subject||score===''||total===''||!Number.isFinite(Number(score))||!Number.isFinite(Number(total))||Number(score)<0||Number(total)<=0||Number(score)>Number(total))){toast('请填写科目，成绩须在0分与满分之间');return}
  if(type==='试卷作业'&&!d.files.length){toast('请上传试卷或作业附件');return}
  if(type==='学习事件'&&!description){toast('请填写学习事件说明');return}
  const operator=studentProfileOperator();if(!operator)return;
  (s.learningRecords??=[]).push({id:'learning-'+Date.now()+'-'+(++studentProfileState.sequence),type,title,date,subject,className,description,...(type==='考试成绩'?{score:Number(score),total:Number(total),rank}:{}),operator,files:d.files,recordedAt:new Date().toISOString()});
  d.files=[];studentProfileState.archiveDraft=null;academicRender();toast('学习档案已保存');
}
// nav() 会直接调用 academicRender，因此在此处也清理离开的录音与未保存附件。
const studentProfilePreviousAcademicRender=academicRender;
let studentProfileLastStudent=null;
academicRender=function(){
  leadCleanClosedRecord();
  const s=studentProfileCurrent(),d=studentProfileState.archiveDraft;
  if(d&&(state.page!=='studentDetail'||studentProfileState.tab!=='学习档案'||d.studentId!==s?.id||d.actorId!==studentTermActor()||!studentProfileAllowed())){d.files.forEach(file=>URL.revokeObjectURL(file.url));studentProfileState.archiveDraft=null}
  if(state.page==='studentDetail'&&s?.id!==studentProfileLastStudent){studentProfileState.editing=false;studentProfileState.basicExpanded=false;studentProfileState.tab='沟通记录';studentProfileState.communicationType='全部';studentProfileLastStudent=s?.id}
  if(state.page==='studentDetail'&&studentProfileState.requestedSection){studentProfileState.tab=studentProfileState.requestedSection;studentProfileState.requestedSection=null}
  if(state.page==='studentDetail'&&studentProfileState.requestedCommunicationType){studentProfileState.communicationType=studentProfileState.requestedCommunicationType;studentProfileState.requestedCommunicationType=null}
  return studentProfilePreviousAcademicRender();
};
