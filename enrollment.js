// 报名学生信息草稿跨步骤保存，确认报名后才写入学生档案。
function enrollmentActive(){return ['enroll','quickEnroll'].includes(state.page)}
function enrollmentEnsure(){
  if(a.enrollment)return a.enrollment;
  const student=a.students[a.selectedStudent],lead=leadState.leads.find(l=>l.leadId===a.enrollingLeadId);
  const source=lead||student||{};
  const data={name:source.name||'',phone:source.phone||'',grade:source.grade||'',subjects:[],schools:(source.schools?.length?source.schools:[{stage:'小学',name:source.school||'',entryYear:''}]).map(s=>({...s})),gender:source.gender||'',guardian:source.guardian||'',source:source.source||'',note:''};
  a.enrollment={data,optionalOpen:false,classes:[],classPicker:null};
  leadDisposeRecord();
  leadRecordDraft=leadCreateRecordDraft('enrollment');
  leadRecordDraft.noteId='enroll-note';leadRecordDraft.saveId='enroll-next';
  return a.enrollment;
}
function enrollmentSelect(id,values,value,placeholder){
  const options=[...new Set([...values,...(value?[value]:[])])];
  return `<select class="select" id="${id}"><option value="">${placeholder}</option>${options.map(x=>`<option value="${esc(x)}" ${x===value?'selected':''}>${esc(x)}</option>`).join('')}</select>`;
}
function enrollmentSchoolRow(s={},removable=false){
  return `<div class="lead-school-row enrollment-school-row"><select class="select enrollment-school-stage">${['小学','初中','高中'].map(x=>`<option ${x===s.stage?'selected':''}>${x}</option>`).join('')}</select><input class="input enrollment-school-name" value="${esc(s.name||'')}" placeholder="例如：城东实验小学"><select class="select enrollment-school-year">${leadSchoolYearOptions(s.entryYear)}</select>${removable?'<button type="button" class="btn small" onclick="this.closest(\'.enrollment-school-row\').remove()">移除</button>':'<button type="button" class="btn small" onclick="enrollmentAddSchool()">+ 添加</button>'}</div>`;
}
function enrollmentAddSchool(){$('#enroll-schools').insertAdjacentHTML('beforeend',enrollmentSchoolRow({},true))}
enrollStudent=function(){
  const draft=enrollmentEnsure(),d=draft.data;
  return `<div class="toolbar"><div class="toolbar-left"><button class="btn primary" onclick="enrollmentChooseStudent()">选择已有学生</button><button class="btn" onclick="enrollmentClearStudent()">清空已选学生</button></div></div>
    <div class="lead-form-grid enrollment-required">
      ${aField('学生姓名',aInput('enroll-name','请输入学生姓名','text',d.name),true)}
      ${aField('联系电话',aInput('enroll-phone','请输入联系电话','tel',d.phone),true)}
      ${aField('就读年级',enrollmentSelect('enroll-grade',leadGradeNames,d.grade,'请选择年级'),true)}
    </div>
    <details class="enrollment-optional" ${draft.optionalOpen?'open':''} ontoggle="if(a.enrollment)a.enrollment.optionalOpen=this.open">
      <summary aria-controls="enrollment-more-fields"><span class="enrollment-expand-label">展开更多</span><span class="enrollment-collapse-label">收起更多</span><span class="enrollment-chevron" aria-hidden="true"></span></summary>
      <div class="lead-form-grid" id="enrollment-more-fields">
        <div class="field full"><label>公立学校</label><div id="enroll-schools">${d.schools.map((s,i)=>enrollmentSchoolRow(s,i>0)).join('')}</div></div>
        ${aField('学生性别',`<div class="lead-radio"><label><input type="radio" name="enroll-gender" value="" ${!d.gender?'checked':''}> 未填写</label>${['男','女'].map(x=>`<label><input type="radio" name="enroll-gender" value="${x}" ${x===d.gender?'checked':''}> ${x}</label>`).join('')}</div>`)}
        ${aField('咨询家长',enrollmentSelect('enroll-guardian',['妈妈','爸爸','其他'],d.guardian,'请选择关系'))}
        ${aField('来源渠道',enrollmentSelect('enroll-source',['主动来电','家长上门','转介绍','地推扫码','公众号','活动报名','宣传物料扫码'],d.source,'请选择来源'))}
        <div class="field full">${leadRecordEditor('信息记录')}</div>
      </div>
    </details>
    <div class="form-actions"><button class="btn primary" id="enroll-next" onclick="enrollmentNext()">下一步</button></div>`;
};
function enrollmentCapture(){
  const draft=enrollmentEnsure(),d=draft.data;
  for(const key of ['name','phone','grade','guardian','source','note'])d[key]=$('#enroll-'+key).value.trim();
  d.gender=document.querySelector('input[name="enroll-gender"]:checked')?.value||'';
  d.schools=[...document.querySelectorAll('.enrollment-school-row')].map(row=>({stage:row.querySelector('.enrollment-school-stage').value,name:row.querySelector('.enrollment-school-name').value.trim(),entryYear:row.querySelector('.enrollment-school-year').value})).filter(s=>s.name||s.entryYear);
  if(!d.schools.length)d.schools=[{stage:'小学',name:'',entryYear:''}];
  draft.optionalOpen=$('.enrollment-optional').open;
  if(leadRecordDraft?.context==='enrollment')leadRecordDraft.note=d.note;
  return d;
}
function enrollmentValidate(d){
  if(!d?.name){toast('请填写学生姓名');return false}
  if(!d.phone){toast('请填写联系电话');return false}
  if(!d.grade){toast('请选择就读年级');return false}
  return true;
}
function enrollmentNext(){
  if(!leadRecordReadyToSave())return;
  const d=enrollmentCapture();if(!enrollmentValidate(d))return;
  a.enrollStep=2;academicRender();
}
function enrollmentChooseStudent(){
  if(!leadRecordReadyToSave())return;
  enrollmentCapture();a.modal='selectStudent';academicRender();
}
function enrollmentClearStudent(){
  enrollmentDisposeProofs();
  leadDisposeRecord();a.enrollment=null;a.enrollingLeadId=null;a.selectedStudent=null;a.selectedClass=null;
  academicRender();
}
const enrollmentPreviousSelectStudent=selectModalStudent;
selectModalStudent=function(){
  if(enrollmentActive()&&document.querySelector('input[name="modal-student"]:checked')){
    enrollmentDisposeProofs();
    leadDisposeRecord();a.enrollment=null;a.enrollingLeadId=null;a.selectedClass=null;
  }
  enrollmentPreviousSelectStudent();
};
const enrollmentPreviousPayment=enrollPayment;
enrollPayment=function(){
  const html=enrollmentPreviousPayment(),d=a.enrollment?.data;
  if(!d)return html;
  return html.replace(/<p>[\s\S]*?<\/p>/,`<p>${esc(d.name)}　${esc(d.grade)} · ${esc(d.subjects.join('、'))}　${esc(a.classes[a.selectedClass]?.name||'')}</p>`);
};
finishEnroll=function(){
  const d=a.enrollment?.data;
  if(!enrollmentValidate(d)||!leadRecordReadyToSave())return;
  if(!enrollmentValidClasses())return;
  enrollmentSyncSubjects();
  const payment=enrollmentValidateCheckout();if(!payment)return;
  const course=enrollmentSelectedClasses()[0].class;
  const files=(leadRecordDraft?.context==='enrollment'?leadRecordDraft.items:[]).map(item=>({fileName:item.file.name,url:item.url,size:item.file.size,kind:item.kind,transcript:item.transcript||''}));
  const info={name:d.name,phone:d.phone,grade:d.grade,subjects:[...d.subjects],subject:d.subjects.join('、'),schools:d.schools.map(s=>({...s})),school:d.schools[0]?.name||'',gender:d.gender,guardian:d.guardian,source:d.source,campus:course.campus};
  let student=a.students[a.selectedStudent];
  if(student)Object.assign(student,info);
  else{student={...info,id:String(Date.now()),status:'在读',follow:'已签约',className:course.name};a.students.unshift(student);a.selectedStudent=0}
  if(d.note||files.length){
    const entry=leadHistoryEntry('报名信息记录',d.note||'添加了报名沟通附件',{files});
    student.history=[...(student.history||[]),entry];
    const lead=leadState.leads.find(l=>l.leadId===a.enrollingLeadId);
    if(lead)lead.history.push(entry);
  }
  if(leadRecordDraft?.context==='enrollment')leadRecordDraft.items=[];
  enrollmentCompleteOrder(student,payment);
  leadDisposeRecord();a.enrollment=null;
};
function enrollmentCleanup(){
  if(!enrollmentActive()&&a.enrollment){
    enrollmentDisposeProofs();
    if(leadRecordDraft?.context==='enrollment')leadDisposeRecord();
    a.enrollment=null;a.enrollStep=1;a.selectedClass=null;
  }
}
const enrollmentPreviousRender=render,enrollmentPreviousAcademicRender=academicRender;
render=function(){enrollmentCleanup();return enrollmentPreviousRender()};
academicRender=function(){enrollmentCleanup();return enrollmentPreviousAcademicRender()};
