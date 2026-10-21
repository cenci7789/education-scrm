// 试听与报名共用表单样式、学校行和沟通记录编辑器，分别保存业务草稿。
function trialStudentData(source){
  return {name:source.name||'',phone:source.phone||'',grade:source.grade||'',guardian:source.guardian||'',gender:source.gender||'',source:source.source||'',
    schools:(source.schools?.length?source.schools:[{stage:'小学',name:source.school||'',entryYear:''}]).map(s=>({...s}))};
}
function trialEnsureRecord(){
  const d=trialState.draft;
  if(leadRecordDraft?.context==='trial'&&leadRecordDraft.trial===d)return;
  leadDisposeRecord();leadRecordDraft=leadCreateRecordDraft('trial',null,d.information||'');
  leadRecordDraft.trial=d;leadRecordDraft.noteId='trial-information';leadRecordDraft.saveId='trial-next';
}
function trialSchoolRow(s,removable=false){
  return enrollmentSchoolRow(s,removable).replaceAll('enrollment-school-','trial-school-').replaceAll('enrollmentAddSchool()','trialAddSchool()');
}
function trialAddSchool(){$('#trial-schools').insertAdjacentHTML('beforeend',trialSchoolRow({},true))}
function trialStudentForm(){
  trialEnsureRecord();
  const d=trialState.draft,locked=!!d.studentId||!!d.leadId;
  return `<div class="toolbar"><div class="toolbar-left"><button class="btn primary" onclick="trialChooseStudent()" ${d.leadId?'disabled':''}>选择已有学生</button><button class="btn" onclick="trialClearStudent()">清空已选学生</button></div></div>
    ${d.leadId?'<p class="notice">已带入线索信息，本次预约及排班结果将同步到该线索。</p>':''}
    <div class="lead-form-grid enrollment-required">
      ${aField('学生姓名',`<input class="input" id="trial-name" placeholder="请输入学生姓名" value="${esc(d.name)}" ${locked?'readonly':''}>`,true)}
      ${aField('联系电话',`<input class="input" id="trial-phone" type="tel" placeholder="请输入联系电话" value="${esc(d.phone)}" ${locked?'readonly':''}>`,true)}
      ${aField('就读年级',enrollmentSelect('trial-grade',leadGradeNames,d.grade,'请选择年级'),true)}
    </div>
    <details class="enrollment-optional" id="trial-optional" ${d.optionalOpen?'open':''} ontoggle="if(trialState.draft)trialState.draft.optionalOpen=this.open">
      <summary aria-controls="trial-more-fields"><span class="enrollment-expand-label">展开更多</span><span class="enrollment-collapse-label">收起更多</span><span class="enrollment-chevron" aria-hidden="true"></span></summary>
      <div class="lead-form-grid" id="trial-more-fields">
        <div class="field full"><label>公立学校</label><div id="trial-schools">${d.schools.map((s,i)=>trialSchoolRow(s,i>0)).join('')}</div></div>
        ${aField('学生性别',`<div class="lead-radio"><label><input type="radio" name="trial-gender" value="" ${!d.gender?'checked':''}> 未填写</label>${['男','女'].map(g=>`<label><input type="radio" name="trial-gender" value="${g}" ${d.gender===g?'checked':''}> ${g}</label>`).join('')}</div>`)}
        ${aField('咨询家长',enrollmentSelect('trial-guardian',['妈妈','爸爸','其他'],d.guardian,'请选择关系'))}
        ${aField('来源渠道',enrollmentSelect('trial-source',['主动来电','家长上门','转介绍','地推扫码','公众号','活动报名','宣传物料扫码'],d.source,'请选择来源'))}
        <div class="field full">${leadRecordEditor('信息记录')}</div>
      </div>
    </details>`;
}
function trialReadStudent(){
  const d=trialState.draft;
  for(const key of ['name','phone','grade','guardian','source','information'])d[key]=$('#trial-'+key).value.trim();
  d.gender=document.querySelector('input[name="trial-gender"]:checked')?.value||'';
  d.schools=[...document.querySelectorAll('.trial-school-row')].map(row=>({stage:row.querySelector('.trial-school-stage').value,name:row.querySelector('.trial-school-name').value.trim(),entryYear:row.querySelector('.trial-school-year').value})).filter(s=>s.name||s.entryYear);
  if(!d.schools.length)d.schools=[{stage:'小学',name:'',entryYear:''}];
  d.optionalOpen=$('#trial-optional').open;
  if(leadRecordDraft?.context==='trial')leadRecordDraft.note=d.information;
}
function trialBookingTab(tab){
  if(tab==='批量预约')toast('批量预约的导入规则和页面细节待补充');
}
function trialChooseStudent(){
  if(!leadRecordReadyToSave()||trialState.draft.leadId)return;
  trialReadStudent();trialState.draft.studentPicker={query:'',selected:trialState.draft.studentId};render();
}
function trialCloseStudent(){trialState.draft.studentPicker=null;render()}
function trialClearStudent(){
  if(leadRecordDraft?.context==='trial')leadDisposeRecord();
  trialState.draft=trialBlank();trialState.step=1;
  render();
}
function trialStudentResults(){
  const picker=trialState.draft.studentPicker,q=picker.query.trim().toLowerCase();
  const list=a.students.filter(s=>!q||[s.id,s.name,s.phone].some(v=>String(v||'').toLowerCase().includes(q)));
  return aTable(['选择','学生ID','学生姓名','联系电话','所属校区'],list.map(s=>`<tr><td><input type="radio" name="trial-student-choice" value="${esc(s.id)}" aria-label="选择${esc(s.name)}" ${picker.selected===s.id?'checked':''} onchange="trialState.draft.studentPicker.selected=this.value"></td><td>${esc(s.id)}</td><td>${esc(s.name)}</td><td>${esc(leadDetailPhone(s.phone))}</td><td>${esc(s.campus||'—')}</td></tr>`))+
    (!list.length?'<div class="empty">没有找到学生，请调整搜索条件。</div>':'');
}
function trialSearchStudent(value){trialState.draft.studentPicker.query=value;$('#trial-student-results').innerHTML=trialStudentResults()}
function trialConfirmStudent(){
  const id=trialState.draft.studentPicker?.selected;
  if(!a.students.some(s=>s.id===id)){toast('请选择一位学生');return}
  trialPickStudent(id);
}
function trialStudentPicker(){
  return `<div class="modal-backdrop"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="trial-student-title"><div class="modal-head"><h2 id="trial-student-title">选择已有学生</h2><button class="btn small" aria-label="关闭" onclick="trialCloseStudent()">×</button></div>
    <div class="toolbar"><input class="input" aria-label="搜索已有学生" placeholder="搜索姓名、电话或ID" value="${esc(trialState.draft.studentPicker.query)}" oninput="trialSearchStudent(this.value)"></div>
    <div id="trial-student-results">${trialStudentResults()}</div><div class="modal-actions"><button class="btn" onclick="trialCloseStudent()">取消</button><button class="btn primary" onclick="trialConfirmStudent()">确定</button></div></div></div>`;
}
const trialStudentPreviousAcademicRender=academicRender;
academicRender=function(){
  if(leadRecordDraft?.context==='trial')leadCleanClosedRecord();
  return trialStudentPreviousAcademicRender();
};
