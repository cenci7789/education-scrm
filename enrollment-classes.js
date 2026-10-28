// 选班草稿与已确认报名班级分开，取消选班不会覆盖原有选择。
function enrollmentClassInfo(c){
  const course=a.courses.find(x=>x.name===c.course)||{};
  return {...c,grade:c.grade||course.grade||'',subject:c.subject||course.subject||'',classType:c.classType||course.classType||'',term:c.term||course.term||'',format:c.teachingFormat||course.teachingFormat||'面授'};
}
function enrollmentGradeKey(value){
  const labels=['小一','小二','小三','小四','小五','小六','初一','初二','初三','高一','高二','高三'];
  const index=labels.indexOf(value);if(index>=0)return String(index+1);
  return String(value).replace(/年级$/,'');
}
function enrollmentTimeBand(time){
  const match=String(time||'').trim().match(/^(\d{1,2}):(\d{2})/);
  if(!match)return '';
  const hour=Number(match[1]),minute=Number(match[2]);if(hour>23||minute>59)return '';
  const start=hour*60+minute;
  return start>=360&&start<720?'上午':start>=720&&start<1080?'下午':start>=1080&&start<1320?'晚上':'';
}
function enrollmentSelectedClasses(){
  return (a.enrollment?.classes||[]).map(item=>({...item,class:a.classes.find(c=>c.id===item.classId)}));
}
function enrollmentSyncSubjects(){
  a.enrollment.data.subjects=[...new Set(enrollmentSelectedClasses().filter(item=>item.class).map(item=>enrollmentClassInfo(item.class).subject).filter(Boolean))];
}
function enrollmentOpenClasses(){
  const draft=enrollmentEnsure();
  draft.classPicker={ids:(draft.classes||[]).map(x=>x.classId),filters:draft.renewalFrom?{subject:draft.renewalFrom.subject}:{grade:draft.data.grade||''}};
  a.modal=null;academicRender();
}
function enrollmentCancelClasses(){a.enrollment.classPicker=null;academicRender()}
function enrollmentFilteredClasses(){
  const filters=a.enrollment.classPicker.filters;
  return a.classes.map(enrollmentClassInfo).filter(c=>
    ['grade','subject','classType','campus','term','teacher','format'].every(key=>!filters[key]||(state.page==='studentRenewal'&&key==='term'?studentClassTerm(c)===filters[key]:key==='grade'?(state.page==='studentRenewal'?leadGradeKey(c[key])===leadGradeKey(filters[key]):enrollmentGradeKey(c[key])===enrollmentGradeKey(filters[key])):c[key]===filters[key]))&&
    (!filters.time||enrollmentTimeBand(c.time)===filters.time)&&
    (!filters.search||c.name.toLowerCase().includes(filters.search.trim().toLowerCase())));
}
function enrollmentClassFilters(){
  const filters=a.enrollment.classPicker.filters,classes=a.classes.map(enrollmentClassInfo);
  return [['grade','年级'],['subject','科目'],['classType','班型'],['campus','校区'],['term','学期'],['teacher','老师'],['time','时间'],['format','授课形式']].map(([key,label])=>{
    const options=key==='time'?['上午','下午','晚上']:[...new Set([filters[key],...(key==='grade'?[a.enrollment.data.grade]:[]),...(key==='format'?['面授','直播']:[]),...classes.map(c=>state.page==='studentRenewal'&&key==='term'?studentClassTerm(c):c[key])].filter(Boolean))];
    const names={上午:'上午 6:00–12:00',下午:'下午 12:00–18:00',晚上:'晚上 18:00–22:00'};
    return `<div class="field"><label for="class-filter-${key}">${label}</label><select class="select" id="class-filter-${key}" onchange="enrollmentSetClassFilter('${key}',this.value)"><option value="">全部${label}</option>${options.map(value=>`<option value="${esc(value)}" ${filters[key]===value?'selected':''}>${esc(key==='time'?names[value]:state.page==='studentRenewal'&&key==='term'?studentTermLabel(value):value)}</option>`).join('')}</select></div>`;
  }).join('')+`<div class="field enrollment-class-search"><label for="class-filter-search">搜索班级名称</label><input class="input" id="class-filter-search" placeholder="请输入班级名称" value="${esc(filters.search||'')}" oninput="enrollmentSetClassFilter('search',this.value)"></div>`;
}
function enrollmentSetClassFilter(key,value){
  a.enrollment.classPicker.filters[key]=value;
  $('#enrollment-class-results').innerHTML=enrollmentClassResults();
}
function enrollmentResetClassFilters(){a.enrollment.classPicker.filters={};academicRender()}
function enrollmentClassResults(){
  const rows=enrollmentFilteredClasses(),ids=a.enrollment.classPicker.ids;
  return aTable(['选择','班级名称','年级','科目','班型','校区','学期','老师','上课时间','授课形式','在班人数'],rows.map(c=>
    `<tr><td><input type="checkbox" aria-label="选择${esc(c.name)}" ${ids.includes(c.id)?'checked':''} onchange="enrollmentToggleClass(decodeURIComponent('${encodeURIComponent(c.id).replace(/'/g,'%27')}'),this.checked)"></td><td><strong>${esc(c.name)}</strong><div class="help">${esc(c.course)}</div></td><td>${esc(c.grade||'—')}</td><td>${esc(c.subject||'—')}</td><td>${esc(c.classType||'—')}</td><td>${esc(c.campus)}</td><td>${esc(c.term||'—')}</td><td>${esc(c.teacher)}</td><td>${esc(c.date)}<br>${esc(c.time)}</td><td>${esc(c.format)}</td><td>${c.students}/${c.capacity}</td></tr>`))+
    `<p class="help">${rows.length?'共 '+rows.length+' 个班级':'没有符合筛选条件的班级，请调整筛选条件。'}</p>`;
}
function enrollmentToggleClass(id,checked){
  const picker=a.enrollment.classPicker;
  if(!a.classes.some(c=>c.id===id))return;
  picker.ids=checked?[...new Set([...picker.ids,id])]:picker.ids.filter(x=>x!==id);
  $('#enrollment-selection-count').textContent=String(picker.ids.length);
}
function enrollmentConfirmClasses(){
  const draft=a.enrollment,ids=draft.classPicker.ids;
  if(!ids.length){toast('请至少选择一个班级');return}
  if(ids.some(id=>!a.classes.some(c=>c.id===id))){toast('部分班级已不存在，请重新选择');return}
  draft.classes=ids.map(classId=>(draft.classes||[]).find(x=>x.classId===classId)||{classId,startSession:1,signupType:'新签'});
  enrollmentSyncSubjects();
  draft.classPicker=null;a.selectedClass=a.classes.findIndex(c=>c.id===ids[0]);academicRender();
}
function enrollmentClassPickerPage(){
  return `<button class="btn back-link" onclick="enrollmentCancelClasses()">← 返回单个报名</button>`+aHeading('选择报名班级','支持多选；时间筛选仅按上课开始时间计算')+
    `<div class="card pad"><div class="enrollment-class-filters">${enrollmentClassFilters()}</div><div class="toolbar"><p class="help">时段边界：12:00 归入下午，18:00 归入晚上；22:00 不包含在晚上时段。</p><button class="btn small" onclick="enrollmentResetClassFilters()">重置筛选</button></div><div id="enrollment-class-results">${enrollmentClassResults()}</div><div class="enrollment-picker-footer"><span>已选择 <strong id="enrollment-selection-count">${a.enrollment.classPicker.ids.length}</strong> 个班级（含筛选后隐藏的班级）</span><div><button class="btn" onclick="enrollmentCancelClasses()">取消</button> <button class="btn primary" onclick="enrollmentConfirmClasses()">确认选择</button></div></div></div>`;
}
const enrollmentClassPreviousPage=enrollPage;
enrollPage=function(){
  if(a.enrollment?.classPicker)return enrollmentClassPickerPage();
  const html=enrollmentClassPreviousPage();
  if(a.enrollStep===3)return html.replace(aTabs(['单个报名','批量报名'],'单个报名','enrollTab'),'');
  if(a.enrollStep!==2)return html;
  return html.replace(aTabs(['单个报名','批量报名'],'单个报名','enrollTab'),'<div class="enrollment-class-header"><button class="btn primary" onclick="enrollmentOpenClasses()">选择班级</button></div>');
};
function enrollmentClassPrice(item){
  const c=item.class||a.classes.find(c=>c.id===item.classId);
  if(!c)return null;
  const course=a.courses.find(course=>course.name===c.course);
  if(!course||course.fee===null||course.fee===undefined||course.fee==='')return null;
  const sessions=Number(Array.isArray(course.sessions)?course.sessions.length:course.totalSessions||0),tuition=Number(course.fee),materials=0;
  const start=Number(item.startSession);
  if(!Number.isInteger(sessions)||sessions<1||!Number.isInteger(start)||start<1||start>sessions||!Number.isFinite(tuition)||tuition<0||!Number.isFinite(materials)||materials<0)return null;
  const fullCents=Math.round(tuition*100),materialCents=Math.round(materials*100),tuitionCents=Math.round(fullCents*(sessions-start+1)/sessions);
  return {sessions,fullCents,materialCents,tuitionCents,totalCents:tuitionCents+materialCents};
}
function enrollmentMoney(cents){return (cents/100).toFixed(2)}
function enrollmentTotal(){return enrollmentSelectedClasses().reduce((sum,item)=>sum+(enrollmentClassPrice(item)?.totalCents||0),0)}
function enrollmentRemoveClass(index){
  a.enrollment.classes.splice(index,1);
  enrollmentSyncSubjects();
  a.selectedClass=a.enrollment.classes.length?a.classes.findIndex(c=>c.id===a.enrollment.classes[0].classId):null;
  academicRender();
}
function enrollmentChangeClass(index,key,value){
  if(!['startSession','signupType'].includes(key))return;
  a.enrollment.classes[index][key]=key==='startSession'?Number(value):value;academicRender();
}
enrollClass=function(){
  const items=enrollmentSelectedClasses();
  return `<div class="toolbar"><h2 class="section-title">已选班级</h2></div>`+
    (items.length?`<div class="table-wrap"><table class="table enrollment-selected-table"><thead><tr>${['操作 / 签约类型','项目名称','全价（元）','进班首讲','退费说明','原价金额（元）'].map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${items.map((item,index)=>{
      const c=item.class,p=enrollmentClassPrice(item);if(!c||!p)return `<tr><td><button class="btn small" onclick="enrollmentRemoveClass(${index})">移除</button></td><td colspan="5">班级不存在或收费配置有误，请重新选择。</td></tr>`;
      return `<tr><td><div class="enrollment-item-actions"><button class="btn small" aria-label="移除${esc(c.name)}" onclick="enrollmentRemoveClass(${index})">移除</button><select class="select" aria-label="${esc(c.name)}签约类型" onchange="enrollmentChangeClass(${index},'signupType',this.value)">${['新签','续费'].map(x=>`<option ${item.signupType===x?'selected':''}>${x}</option>`).join('')}</select></div>${typeof enrollmentRenewalField==='function'?enrollmentRenewalField(item,index):''}</td><td><strong>${esc(c.name)}</strong><div class="help">${esc(c.campus)} · ${esc(c.teacher)}</div></td><td>${enrollmentMoney(p.fullCents)}</td><td><select class="select" aria-label="${esc(c.name)}进班首讲" onchange="enrollmentChangeClass(${index},'startSession',this.value)">${Array.from({length:p.sessions},(_,i)=>`<option value="${i+1}" ${item.startSession===i+1?'selected':''}>第${i+1}讲</option>`).join('')}</select></td><td>根据未上讲次退费</td><td>${enrollmentMoney(p.totalCents)}</td></tr>`;
    }).join('')}</tbody></table></div><div class="enrollment-total">合计：<strong>¥${enrollmentMoney(enrollmentTotal())}</strong></div><p class="help">课程费按进班首讲起的剩余讲次计算。</p>`:'<div class="empty">尚未选择报名班级</div>')+
    `<div class="form-actions"><button class="btn" onclick="a.enrollStep=1;academicRender()">上一步</button><button class="btn primary" onclick="enrollmentClassesNext()">下一步</button></div>`;
};
function enrollmentValidClasses(){
  const items=enrollmentSelectedClasses();
  if(!items.length){toast('请至少选择一个报名班级');return false}
  if(items.some(item=>!enrollmentClassPrice(item))){toast('请检查班级及进班首讲配置');return false}
  return true;
}
function enrollmentClassesNext(){if(!enrollmentValidClasses())return;enrollmentSyncSubjects();a.enrollStep=3;academicRender()}
enrollPayment=function(){
  const d=a.enrollment.data;
  return `<h2 class="section-title">订单确认</h2><p>${esc(d.name)}　${esc(d.grade)} · ${esc(d.subjects.join('、'))}</p>`+
    aTable(['报名班级','签约类型','进班首讲','课程费（元）','应收金额（元）'],enrollmentSelectedClasses().map(item=>{
      const p=enrollmentClassPrice(item);return p?`<tr><td>${esc(item.class.name)}</td><td>${esc(item.signupType)}</td><td>第${item.startSession}讲</td><td>${enrollmentMoney(p.tuitionCents)}</td><td>${enrollmentMoney(p.totalCents)}</td></tr>`:'';
    }))+`<div class="enrollment-total">应收合计：<strong>¥${enrollmentMoney(enrollmentTotal())}</strong></div><h2 class="section-title">收款</h2><div class="form-grid">${aField('支付方式',aSelect('pay-channel',['现金','POS刷卡'],'请选择支付方式'),true)}${aField('实收金额',aInput('pay-amount','请输入金额','number'),true)}</div><div class="form-actions"><button class="btn" onclick="a.enrollStep=2;academicRender()">上一步</button><button class="btn primary" onclick="finishEnroll()">确认报名</button></div>`;
};
function enrollmentCompleteOrder(student,payment){
  const selected=enrollmentSelectedClasses(),leadId=a.enrollingLeadId,total=enrollmentTotal(),orderId='COMB'+Date.now()+'-'+Math.random().toString(36).slice(2,10);
  student.firstEnrolledAt??=new Date().toISOString();
  if(leadId)student.originLeadId??=leadId;
  const items=selected.map((item,index)=>{
    const p=enrollmentClassPrice(item),info=enrollmentClassInfo(item.class);
    return {classId:item.classId,className:item.class.name,teacher:item.class.teacher||'',teacherId:item.class.teacherId||'',teacherAccount:item.class.teacherAccount||'',course:item.class.course,enrollmentStatus:'上课中',campus:item.class.campus,academicTerm:studentClassTerm(item.class),term:info.term,grade:info.grade,subject:info.subject,format:info.format,signupType:item.signupType,startSession:item.startSession,tuitionCents:p.tuitionCents,materialCents:p.materialCents,totalCents:p.totalCents,discount:{...payment.items[index].discount},discountCents:payment.items[index].discountCents,dueCents:payment.items[index].dueCents};
  });
  // 保留报名时总讲次，后续修改课程配置不会改变这笔报名的课单价。
  items.forEach((item,index)=>{item.orderId=orderId;item.sessionCount=enrollmentClassPrice(selected[index]).sessions;item.academicTeacherId=selected[index].class.academicTeacherId||'';item.academicTeacher=selected[index].class.academicTeacher||''});
  items.forEach((item,index)=>{const source=a.enrollment?.renewalFrom||selected[index].renewalFrom;if(item.signupType==='续费'&&source)item.renewalFrom={...source}});
  // 部分付款按选班顺序分配，保存到每个班级，供补费和退费追溯。
  let unallocated=payment.paidCents;
  items.forEach(item=>{item.dueTuitionCents=item.dueCents;item.dueMaterialCents=0;item.paidCents=Math.min(item.dueCents,unallocated);item.paidTuitionCents=item.paidCents;item.paidMaterialCents=0;unallocated-=item.paidCents});
  const previousClasses=student.classNames||(student.className&&student.className!=='—'?[student.className]:[]);
  student.classNames=[...new Set([...previousClasses,...items.map(item=>item.className)])];student.className=student.classNames.join('、');
  student.enrollments=[...(student.enrollments||[]),...items];
  student.status='在读';
  selected.forEach(item=>{item.class.students=(Number(item.class.students)||0)+1});
  a.orders.unshift({id:orderId,createdAt:new Date().toISOString(),product:items.map(item=>item.className).join('、'),student:student.name,studentId:student.id,studentPhone:student.phone,items,originalAmount:'¥'+enrollmentMoney(total),discountCents:payment.discountCents,amount:'¥'+enrollmentMoney(payment.dueCents),paid:'¥'+enrollmentMoney(payment.paidCents),status:payment.paidCents>=payment.dueCents?'交易成功':'等待付款',originLeadId:leadId||undefined,productCategory:'正价课',payMode:payment.mode,payChannel:payment.receipts.map(x=>x.channel).join('、'),receipts:payment.receipts,operator:payment.operator,note:payment.note});
  const lead=leadState.leads.find(l=>l.leadId===leadId);
  if(lead){lead.studentId=student.id;lead.stage='已报名';lead.status='mine';lead.history.push(leadHistoryEntry('报名完成','已报名'+items.map(item=>item.className).join('、')+'。'))}
  enrollmentDisposeProofs(payment.receipts.flatMap(receipt=>(receipt.proofs||[]).map(proof=>proof.url)));
  const returnPage=state.page==='studentRenewal'?studentRenewalReturnPage():'orders';
  a.enrollingLeadId=null;a.enrollStep=1;a.selectedClass=null;nav(returnPage);toast('报名订单已生成（原型演示）');
}
