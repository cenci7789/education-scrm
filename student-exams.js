// 成绩使用独立的考试快照，不随学生当前年级、班级或学期变化。
const studentExamTypes=['单元测试','月考','期中考试','期末考试','模拟考试','入学测评','其他'];
const studentExamRanks=['市排','区排','校排','班排'];
const studentExamHeaders=['年级·学期','科目','考试类型','分数（得分/满分）','排名','试卷/答题卡','分析/说明','记录时间','记录人'];
function studentExamOperator(){
  const user=state.currentUser;
  if(user?.name)return {name:user.name,account:user.account||user.id||'',role:user.role||permissionRole(user.roleId)?.name||permissionRole()?.name||'未配置岗位'};
  const role=permissionRole()?.name||'当前账号';
  return {name:permissionState.identity==='admin'?'管理员':role+'（演示账号）',account:permissionState.identity,role};
}
function studentExamRows(s){return (s.learningRecords||[]).filter(r=>r.type==='考试成绩').slice().sort((x,y)=>String(y.date||'').localeCompare(String(x.date||'')))}
function studentExamRank(r){return r.rankScope&&r.rankValue?`${r.rankScope} 第${r.rankValue}名`:r.rank||'—'}
function studentExamTermOptions(s){
  const values=new Set([...studentTermEnrollments(),...studentTermTrials()].filter(r=>r.studentId===s.id).map(r=>r.term).filter(Boolean));
  const year=new Date().getFullYear();for(let y=year-6;y<=year+2;y++)for(const season of studentTermSeasons)values.add(studentTermKey(y,season));
  const saved=teachingDefaultTermRead('students');if(studentTermParts(saved))values.add(saved);
  return [...values].sort((a,b)=>{const x=studentTermParts(a),y=studentTermParts(b);return y.year-x.year||studentTermSeasons.indexOf(y.season)-studentTermSeasons.indexOf(x.season)});
}
function studentExamFileLinks(r){
  return (r.files||[]).map(file=>file.url?.startsWith('blob:')?`<div><a href="${esc(file.url)}" download="${esc(file.fileName)}">${esc(file.documentType||'附件')}：${esc(file.fileName)}（下载）</a></div>`:`<div>${esc(file.fileName)}（文件不可用）</div>`).join('')||'—';
}
function studentPaperRows(s){return (s.learningRecords||[]).filter(r=>r.type==='试卷作业').slice().sort((x,y)=>String(y.recordedAt||y.date||'').localeCompare(String(x.recordedAt||x.date||'')))}
function studentPaperFileLinks(r){
  return (r.files||[]).map(file=>file.url?.startsWith('blob:')?`<div style="margin-bottom:8px"><span>${esc(file.fileName)}</span><div class="actions"><a href="${esc(file.url)}" target="_blank" rel="noopener" aria-label="预览${esc(file.fileName)}">预览</a><a href="${esc(file.url)}" download="${esc(file.fileName)}" aria-label="下载${esc(file.fileName)}">下载</a></div></div>`:`<div>${esc(file.fileName)}（文件不可用）</div>`).join('')||'—';
}
function studentPaperTable(s){
  const rows=studentPaperRows(s);
  return `<section style="margin-top:20px"><h2 class="section-title">试卷作业</h2>${aTable(['标题','年级','学期','科目','分析/说明','文件（预览/下载）'],rows.map(r=>`<tr><td><strong>${esc(r.title||'未记录')}</strong></td><td>${esc(r.grade||'未记录')}</td><td>${esc(r.term?studentTermLabel(r.term):'未记录')}</td><td>${esc(r.subject||'—')}</td><td><div class="profile-text" style="min-width:180px;max-width:360px">${esc(r.description||'—')}</div></td><td>${studentPaperFileLinks(r)}</td></tr>`))}${!rows.length?'<div class="empty">暂无试卷作业，请上传文件并填写说明。</div>':''}<div class="data-bar">共 ${rows.length} 条试卷作业</div></section>`;
}
function studentExamTable(s){const rows=studentExamRows(s);return `<section><div class="toolbar"><h2 class="section-title">考试成绩</h2><button class="btn" ${rows.length?'':'disabled'} onclick="studentExamExport()">整表导出</button></div><p class="help">导出当前学生的全部考试成绩（CSV，可用 Excel 打开）；试卷与答题卡通过表格中的链接单独下载。</p>${aTable(studentExamHeaders.map(h=>h==='试卷/答题卡'?'试卷/答题卡（下载）':h),rows.map(r=>`<tr><td>${esc(r.grade||'未记录')} · ${esc(r.term?studentTermLabel(r.term):'学期未记录')}</td><td>${esc(r.subject||'—')}</td><td>${esc(r.examType||r.title||'未记录')}<div class="help">${esc(r.date||'')}</div></td><td>${esc(r.score??'—')} / ${esc(r.total??'—')}</td><td>${esc(studentExamRank(r))}</td><td>${studentExamFileLinks(r)}</td><td><div class="profile-text" style="min-width:180px;max-width:360px">${esc(r.description||'—')}</div></td><td>${esc(r.recordedAt?studentProfileTime(r.recordedAt):'未记录')}</td><td>${esc(r.operator?.name||'未记录')}</td></tr>`))}${!rows.length?'<div class="empty">暂无考试成绩，请添加考试记录。</div>':''}<div class="data-bar">共 ${rows.length} 条考试成绩</div></section>`}
const studentExamPreviousArchive=studentProfileArchive;
studentProfileArchive=function(s){
  if(studentProfileState.archiveDraft?.studentId===s.id)return studentArchiveForm();
  // 复用分类栏与学习事件卡片，考试和试卷分别通过表格展示。
  const html=studentExamPreviousArchive({...s,learningRecords:(s.learningRecords||[]).filter(r=>!['考试成绩','试卷作业'].includes(r.type))});
  const type=studentProfileState.archiveType;
  if(!['全部','考试成绩','试卷作业'].includes(type))return html;
  const empty='<div class="empty">暂无学习档案，添加第一条成绩、试卷或学习事件。</div>';
  const introEnd=html.indexOf('</p>')+4;
  return html.slice(0,introEnd)+(type==='全部'||type==='考试成绩'?studentExamTable(s):'')+(type==='全部'||type==='试卷作业'?studentPaperTable(s):'')+html.slice(introEnd).replace(empty,'');
};
const studentExamPreviousOpen=studentArchiveOpen;
studentArchiveOpen=function(){
  studentExamPreviousOpen();
  if(studentProfileState.archiveDraft&&studentArchiveTypes.includes(studentProfileState.archiveType)&&studentProfileState.archiveType!=='考试成绩'){
    studentProfileState.archiveDraft.type=studentProfileState.archiveType;academicRender();
  }
};
studentArchiveForm=function(){
  const d=studentProfileState.archiveDraft,s=studentProfileCurrent(),exam=d.type==='考试成绩',paper=d.type==='试卷作业',info=studentProfileInfo(s);
  const terms=studentExamTermOptions(s),defaultTerm=teachingDefaultTermRead('students')||'';
  return `<h2 class="section-title">新增学习档案</h2><div class="form-grid">${aField('档案类型',`<select class="select" id="archive-type" onchange="studentArchiveChangeType(this.value)">${studentArchiveTypes.map(t=>`<option ${t===d.type?'selected':''}>${t}</option>`).join('')}</select>`,true)}<div id="archive-date-field" ${paper?'hidden':''}>${aField('考试 / 发生日期',studentProfileInput('archive-date',studentProfileLocalTime().slice(0,10),'date'),true)}</div><div class="field" id="archive-title-field" ${exam?'hidden':''}><label class="required">标题</label>${studentProfileInput('archive-title')}</div>${aField('科目',studentProfileInput('archive-subject'),true)}<div id="archive-class-field" ${paper?'hidden':''}>${aField('关联班级',studentProfileSelect('archive-class',[...new Set([...studentTermEnrollments(),...studentTermTrials()].filter(r=>r.studentId===d.studentId).map(r=>r.className))]))}</div><div id="archive-manual-recorder" ${exam||paper?'hidden':''}>${studentProfileOperatorSelect()}</div><div class="field" id="archive-auto-recorder" ${exam||paper?'':'hidden'}><label>记录人 / 记录时间</label><p>${esc(studentExamOperator().name)} · 保存时自动记录时间</p></div></div>
    <div class="form-grid" id="archive-academic-fields" ${exam||paper?'':'hidden'}>${aField('年级',studentProfileSelect('archive-grade',[...new Set([...leadGradeNames,...(info.grade?[info.grade]:[])])],info.grade||''),true)}${aField('学期',`<select class="select" id="archive-term"><option value="">请选择学期</option>${terms.map(t=>`<option value="${t}" ${t===defaultTerm?'selected':''}>${studentTermLabel(t)}</option>`).join('')}</select>`,true)}</div><div class="form-grid" id="archive-score-fields" ${exam?'':'hidden'}>${aField('考试类型',`<select class="select" id="archive-exam-type" onchange="studentExamChangeType(this.value)"><option value="">请选择考试类型</option>${studentExamTypes.map(t=>`<option>${t}</option>`).join('')}</select>`,true)}<div class="field" id="archive-exam-custom-field" hidden><label class="required">其他考试类型</label>${studentProfileInput('archive-exam-custom')}</div>${aField('得分',studentProfileInput('archive-score','','number'),true)}${aField('满分',studentProfileInput('archive-total','100','number'),true)}${aField('排名范围（选填）',studentProfileSelect('archive-rank-scope',studentExamRanks,'','不填写排名'))}${aField('排名名次',studentProfileInput('archive-rank','','number'))}</div>
    <div class="field"><label>分析 / 说明</label><textarea class="textarea" id="archive-description" placeholder="记录薄弱知识点、失分原因及改进建议"></textarea></div>
    <div class="field"><div id="archive-exam-uploads" ${exam?'':'hidden'}><label>试卷 / 答题卡上传</label><div class="actions"><label class="btn">上传试卷<input type="file" accept=".png,.jpg,.jpeg,.webp,.pdf" multiple hidden onchange="studentArchiveAddFiles(this.files,'试卷');this.value=''"></label><label class="btn">上传答题卡<input type="file" accept=".png,.jpg,.jpeg,.webp,.pdf" multiple hidden onchange="studentArchiveAddFiles(this.files,'答题卡');this.value=''"></label></div></div><div id="archive-other-uploads" ${exam?'hidden':''}><label>文件上传（图片或 PDF）</label><input type="file" accept=".png,.jpg,.jpeg,.webp,.pdf" multiple onchange="studentArchiveAddFiles(this.files);this.value=''"></div><p class="help">支持图片和 PDF，共最多10个附件，单个不超过30 MB；附件仅保留在当前页面会话中。</p><div id="archive-files">${studentExamDraftFiles()}</div></div>
    <div class="form-actions"><button class="btn" onclick="studentArchiveCancel()">取消</button><button class="btn primary" onclick="studentArchiveSave()">保存学习档案</button></div>`;
};
function studentExamChangeType(type){$('#archive-exam-custom-field').hidden=type!=='其他'}
studentArchiveChangeType=function(type){
  if(!studentArchiveTypes.includes(type))return;studentProfileState.archiveDraft.type=type;const exam=type==='考试成绩',paper=type==='试卷作业';
  $('#archive-score-fields').hidden=!exam;$('#archive-academic-fields').hidden=!(exam||paper);$('#archive-title-field').hidden=exam;$('#archive-exam-uploads').hidden=!exam;$('#archive-other-uploads').hidden=exam;$('#archive-manual-recorder').hidden=exam||paper;$('#archive-auto-recorder').hidden=!(exam||paper);$('#archive-date-field').hidden=paper;$('#archive-class-field').hidden=paper;
};
const studentExamPreviousAddFiles=studentArchiveAddFiles;
studentArchiveAddFiles=function(files,documentType='附件'){
  const d=studentProfileState.archiveDraft;if(!d)return;const count=d.files.length;
  const safe=Array.from(files).filter(file=>{
    const expected=/\.pdf$/i.test(file.name)?'application/pdf':/\.png$/i.test(file.name)?'image/png':/\.jpe?g$/i.test(file.name)?'image/jpeg':/\.webp$/i.test(file.name)?'image/webp':'';
    if(file.type&&file.type!==expected){toast('文件类型与扩展名不符，请上传图片或 PDF');return false}return true;
  });
  studentExamPreviousAddFiles(safe);
  d.files.slice(count).forEach(file=>file.documentType=['试卷','答题卡'].includes(documentType)?documentType:'附件');studentArchiveRefreshFiles();
};
function studentExamDraftFiles(){return (studentProfileState.archiveDraft?.files||[]).map((file,i)=>`<p>${esc(file.documentType||'附件')}：${esc(file.fileName)} <button class="btn small" onclick="studentArchiveRemoveFile(${i})">移除</button></p>`).join('')}
studentArchiveRefreshFiles=function(){$('#archive-files').innerHTML=studentExamDraftFiles()};
const studentExamPreviousSave=studentArchiveSave;
studentArchiveSave=function(){
  const d=studentProfileState.archiveDraft,s=studentProfileCurrent();
  if(d?.type==='试卷作业')return studentPaperSave();
  if(d?.type!=='考试成绩')return studentExamPreviousSave();
  if(!s||d.studentId!==s.id||d.actorId!==studentTermActor()||!studentProfileAllowed())return;
  const value=id=>$('#archive-'+id).value.trim();
  const grade=value('grade'),term=value('term'),subject=value('subject'),date=value('date'),examChoice=value('exam-type'),examType=examChoice==='其他'?value('exam-custom'):examChoice;
  const score=value('score'),total=value('total'),rankScope=value('rank-scope'),rank=value('rank'),description=value('description'),className=value('class');
  if(!grade||!studentTermParts(term)||!subject||!studentExamTypes.includes(examChoice)||!examType){toast('请填写年级、学期、科目和考试类型');return}
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date||date>studentProfileLocalTime().slice(0,10)){toast('请填写有效的考试日期');return}
  if(score===''||total===''||!Number.isFinite(Number(score))||!Number.isFinite(Number(total))||Number(score)<0||Number(total)<=0||Number(score)>Number(total)){toast('得分须在0分与满分之间，满分须大于0');return}
  if((rankScope||rank)&&(!studentExamRanks.includes(rankScope)||!/^\d+$/.test(rank)||!Number.isSafeInteger(Number(rank))||Number(rank)<1)){toast('请同时选择排名范围并填写大于0的整数名次');return}
  const operator=studentExamOperator();
  (s.learningRecords??=[]).push({id:'learning-'+Date.now()+'-'+(++studentProfileState.sequence),type:'考试成绩',title:examType,grade,term,subject,examType,date,score:Number(score),total:Number(total),rankScope,rankValue:rank?Number(rank):null,description,className,operator,files:d.files,recordedAt:new Date().toISOString()});
  d.files=[];studentProfileState.archiveDraft=null;studentProfileState.archiveType='考试成绩';academicRender();toast('考试成绩已保存');
};
function studentPaperSave(){
  const d=studentProfileState.archiveDraft,s=studentProfileCurrent();
  if(!s||d?.type!=='试卷作业'||d.studentId!==s.id||d.actorId!==studentTermActor()||!studentProfileAllowed())return;
  const value=id=>$('#archive-'+id).value.trim();
  const title=value('title'),grade=value('grade'),term=value('term'),subject=value('subject'),description=value('description');
  if(!title||!grade||!studentTermParts(term)||!subject){toast('请填写标题、年级、学期和科目');return}
  if(!d.files.length){toast('请上传试卷或作业文件');return}
  const recordedAt=new Date().toISOString();
  (s.learningRecords??=[]).push({id:'learning-'+Date.now()+'-'+(++studentProfileState.sequence),type:'试卷作业',title,grade,term,subject,description,files:d.files,operator:studentExamOperator(),recordedAt,date:studentProfileLocalTime().slice(0,10)});
  d.files=[];studentProfileState.archiveDraft=null;studentProfileState.archiveType='试卷作业';academicRender();toast('试卷作业已保存');
}
function studentExamExportRows(s){return studentExamRows(s).map(r=>[
  `${r.grade||'未记录'} · ${r.term?studentTermLabel(r.term):'学期未记录'}`,r.subject||'—',`${r.examType||r.title||'未记录'}${r.date?'（'+r.date+'）':''}`,`${r.score??'—'} / ${r.total??'—'}`,studentExamRank(r),(r.files||[]).map(f=>`${f.documentType||'附件'}：${f.fileName}`).join('；')||'—',r.description||'—',r.recordedAt?studentProfileTime(r.recordedAt):'未记录',r.operator?.name||'未记录'
])}
function studentExamCSV(s){
  // CSV 中保留附件名称，不导出刷新后会失效的会话 blob 链接。
  const cell=value=>{let text=String(value??'');if(/^[\s]*[=+@-]/.test(text)||/^[\t\r\n]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"'};
  return '\uFEFF'+[studentExamHeaders,...studentExamExportRows(s)].map(row=>row.map(cell).join(',')).join('\r\n');
}
function studentExamExport(){
  const s=studentProfileCurrent();if(!s||!studentProfileAllowed()||!studentExamRows(s).length)return;
  const url=URL.createObjectURL(new Blob([studentExamCSV(s)],{type:'text/csv;charset=utf-8;'}));
  const link=document.createElement('a');link.href=url;link.download=`${s.name}_${s.id}_考试成绩.csv`.replace(/[\\/:*?"<>|]/g,'_');document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
