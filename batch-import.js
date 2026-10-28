const batchImportState={kind:null,text:'',preview:null,actor:'',page:'',generation:0};
const batchImportSchemas={
 enroll:{title:'批量报名',headers:['学生ID','学生姓名','联系电话','就读年级','班级ID','进班首讲','签约类型','实收金额','收款方式','学生性别','招生家长','来源渠道','备注','凭证文件名']},
 trial:{title:'批量试听预约',headers:['学生ID','学生姓名','联系电话','就读年级','班级ID','课节ID','学生性别','招生家长','来源渠道','备注']},
 staff:{title:'导入员工',headers:['姓名','联系电话','性别','所属校区','所属职位','状态']}
};
function batchImportSchema(kind){return kind==='lead'&&typeof batchLeadSchema==='function'?batchLeadSchema():batchImportSchemas[kind]}
function batchImportAllowed(kind){return kind==='staff'?permissionState.identity==='admin':kind==='trial'?permissionCanVisit('quickTrial'):kind==='enroll'&&(permissionCanVisit('enroll')||permissionCanVisit('quickEnroll'))}
function batchImportOpen(kind){if(!batchImportSchemas[kind]||!batchImportAllowed(kind))return;batchImportClose();Object.assign(batchImportState,{kind,text:'',preview:null,actor:permissionState.identity,page:state.page,files:[],generation:batchImportState.generation+1});batchImportShow()}
function batchImportClose(keep=false){if(!keep)for(const file of batchImportState.files||[])URL.revokeObjectURL(file.url);batchImportState.files=[];batchImportState.kind=null;document.getElementById('batch-import-host')?.remove()}
function batchImportShow(){const d=batchImportState,s=batchImportSchema(d.kind);if(!s)return;let host=document.getElementById('batch-import-host');if(!host){host=document.createElement('div');host.id='batch-import-host';document.body.appendChild(host)}host.innerHTML=`<div class="modal-backdrop" style="z-index:150"><section class="modal" style="width:min(1150px,94vw);max-width:1150px;max-height:90vh;overflow:auto" role="dialog" aria-modal="true" aria-labelledby="batch-import-title"><div class="modal-head"><h2 id="batch-import-title">${s.title}</h2><button class="btn" onclick="batchImportClose()" aria-label="关闭">×</button></div><p class="help">支持 UTF-8 CSV，或从表格复制包含表头的内容；每批最多200行、1MB。全部行校验通过后一次确认，错误行不会部分写入。</p><p class="help">${d.kind==='staff'?'所属职位须填写已启用的名称；所属校区留空或填写分校时归属分校，选择校区须填写已启用名称，多个校区用 | 分隔；状态填写已启用或已禁用。':'已有学生填写学生ID并保持姓名、电话一致；新学生留空ID，填写姓名、11位手机和年级。班级用ID匹配。'}${d.kind==='enroll'?' 多班ID用 | 分隔，首讲与签约类型按相同顺序填写；实收优先抵扣第一个班级，剩余作为欠费。无优惠，费用按当前课程和首讲计算。':d.kind==='trial'?' 每行一个班级；课节ID必填，须为该班后续课节。导入后直接排班入班试听。':''}</p><div class="toolbar"><button class="btn" onclick="batchImportTemplate()">下载CSV模板</button>${d.kind==='staff'?'':'<button class="btn" onclick="batchImportReferences()">下载班级及课节对照表</button>'}<label class="btn">上传CSV<input type="file" accept=".csv,.tsv,.txt" hidden onchange="batchImportRead(this.files[0]);this.value=''" /></label></div>${d.kind==='enroll'?`<div class="field"><label>报名收款凭证（实收大于0时必填）<input type="file" multiple accept=".png,.jpg,.jpeg,.webp,.pdf,.doc,.docx,.xls,.xlsx" onchange="batchImportProofs(this.files);this.value=''"></label><p class="help">CSV“凭证文件名”须与上传文件名完全一致，多个用 | 分隔。每份不超过20MB，最多200份。已上传：${esc((d.files||[]).map(f=>f.fileName).join('、')||'无')}</p></div>`:''}<textarea class="textarea" id="batch-import-text" rows="8" placeholder="粘贴含表头的数据" oninput="batchImportState.text=this.value;batchImportState.preview=null;document.getElementById('batch-import-preview').innerHTML='内容已变更，请重新校验';document.getElementById('batch-import-confirm').disabled=true">${esc(d.text)}</textarea><div class="form-actions"><button class="btn" onclick="batchImportPreview()">校验并预览</button></div><div id="batch-import-preview">${batchImportPreviewHTML()}</div><div class="modal-actions"><button class="btn" onclick="batchImportClose()">取消</button><button class="btn primary" id="batch-import-confirm" ${!d.preview||d.preview.errors.length?'disabled':''} onclick="batchImportCommit()">确认导入</button></div></section></div>`}
function batchImportTemplate(){const s=batchImportSchema(batchImportState.kind);if(s)auditDownloadCSV(s.title+'模板.csv',[s.headers])}
function batchImportReferences(){auditDownloadCSV('班级及课节对照表.csv',[['班级ID','班级名称','课程','校区','年级','课节ID','课节名称','日期','时间'],...a.classes.flatMap(c=>trialClassSessions(c).map(l=>[c.id,c.name,c.course,c.campus,enrollmentClassInfo(c).grade,l.id,l.name,l.startsAt,l.time]))])}
async function batchImportRead(file){const kind=batchImportState.kind,generation=batchImportState.generation;if(!file)return;if(file.size>1024*1024||!/\.(csv|tsv|txt)$/i.test(file.name)){toast('请选择不超过1MB的CSV、TSV或TXT文件');return}try{const text=await file.text();if(batchImportState.kind!==kind||batchImportState.generation!==generation)return;batchImportState.text=text;batchImportState.preview=null;batchImportShow()}catch{toast('文件读取失败，请重试')}}
function batchParse(text){
 if(text.length>1024*1024)throw Error('内容超过1MB');text=text.replace(/^\uFEFF/,'');const sep=text.split(/\r?\n/)[0].includes('\t')?'\t':',';const rows=[];let row=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++}else if(quoted)quoted=false;else if(!cell)quoted=true;else throw Error('引号格式错误')}else if(!quoted&&(c===sep||c==='\n'||c==='\r')){row.push(cell.trim());cell='';if(c!==sep){if(c==='\r'&&text[i+1]==='\n')i++;if(row.some(Boolean))rows.push(row);row=[]}}else cell+=c}
 if(quoted)throw Error('引号未闭合');row.push(cell.trim());if(row.some(Boolean))rows.push(row);if(rows.length<2)throw Error('请提供表头和至少一行数据');if(rows.length>201)throw Error('每批最多200行');return rows;
}
function batchImportPlan(kind,text){
 const errors=[],plans=[],schema=batchImportSchema(kind),seen=new Set(),capacity=new Map();let rows;
 try{rows=batchParse(text)}catch(e){return {errors:[e.message],plans:[]}}
 const headers=rows.shift();if(headers.length!==new Set(headers).size||schema.headers.some(h=>!headers.includes(h))||headers.some(h=>!schema.headers.includes(h)))return {errors:['表头须与下载模板一致，不可缺少、重复或增加列'],plans:[]};
 rows.forEach((values,index)=>{try{
  if(values.length!==headers.length)throw Error('列数与表头不一致');const r=Object.fromEntries(headers.map((h,i)=>[h,values[i]]));
  const fail=message=>{throw Error(message)};if(Object.entries(r).some(([key,v])=>v.length>(['讲次名称','课节日期','开始时间','结束时间','凭证文件名'].includes(key)?65536:500)))fail('字段内容过长');
  if(['course','class','lead'].includes(kind)){plans.push(batchExtendedPlan(kind,r,index+2,seen,plans));return}
  if(kind==='staff'){
   const role=permissionState.roles.find(x=>x.name===r.所属职位&&x.active),campuses=!r.所属校区||r.所属校区==='分校'?[]:[...new Set(r.所属校区.split('|').map(name=>name.trim()))];
   if(!r.姓名||!/^1\d{10}$/.test(r.联系电话)||!['男','女'].includes(r.性别)||!role||campuses.some(name=>!state.campuses.some(c=>c.active&&c.name===name))||!['已启用','已禁用'].includes(r.状态))fail('请核对姓名、11位手机、性别、启用的校区/职位及状态；多个校区用 | 分隔，留空归属分校');
   if(role.id!=='salesSupervisor'&&role.id!=='sales'&&role.grants.includes('leadManage')&&!campuses.length)fail('校区招生组长须指定至少一个已启用校区');
   if(state.staff.some(s=>s.phone===r.联系电话)||seen.has(r.联系电话))fail('手机号与现有员工或本批记录重复');seen.add(r.联系电话);
   plans.push({row:index+2,kind,data:{name:r.姓名,phone:r.联系电话,gender:r.性别,campus:campuses[0]||'分校',campuses,roleId:role.id,active:r.状态==='已启用'},summary:r.姓名+' / '+(campuses.join('、')||'分校')+' / '+role.name});return;
  }
  let student=r.学生ID?a.students.find(s=>s.id===r.学生ID):null;
  if(r.学生ID&&!student)fail('学生ID不存在');if(student&&(student.name!==r.学生姓名||student.phone!==r.联系电话))fail('姓名或电话与学生ID不一致');
  if(!student){const matches=a.students.filter(s=>s.name===r.学生姓名&&s.phone===r.联系电话);if(matches.length>1)fail('同名同电话学生不唯一，请填写学生ID');student=matches[0]}
  if(!r.学生姓名||(!student&&!/^1\d{10}$/.test(r.联系电话))||!leadGradeNames.includes(r.就读年级))fail('请填写姓名、有效电话及系统中的年级');
  if(r.学生性别&&!['男','女'].includes(r.学生性别))fail('性别仅支持男/女');if(r.招生家长&&!['妈妈','爸爸','其他'].includes(r.招生家长))fail('招生家长仅支持妈妈/爸爸/其他');if(r.备注.length>50)fail('备注最多50字');
  const person=student?.id||r.学生姓名+'|'+r.联系电话,data={name:r.学生姓名,phone:r.联系电话,grade:r.就读年级,gender:r.学生性别,guardian:r.招生家长,source:r.来源渠道,note:r.备注,schools:[]};
  const ids=r.班级ID.split('|'),classes=ids.map(id=>a.classes.find(c=>c.id===id));if(new Set(ids).size!==ids.length||classes.some(c=>!c||!trialAvailableClass(c)))fail('班级不存在、重复、已停用或不可报名');
  if(kind==='trial'){
   if(classes.length!==1)fail('试听每行只能填写一个班级');const cls=classes[0],session=r.课节ID?trialClassSessions(cls).find(s=>s.id===r.课节ID&&!s.cancelled&&trialFuture(s.startsAt)):null;
   if(!session)fail('课节ID必填，须为该班级未取消的未来课节');const key=person+'|'+cls.id;if(seen.has(key)||trialState.requests.some(x=>x.status==='待排班'&&!x.salesReturnedAt&&!x.supersededBy&&trialSamePerson(x,{...data,studentId:student?.id||''})&&x.requestedClassId===cls.id))fail('存在重复待排班预约');
   const request={...data,studentId:student?.id||'',requestedClassId:cls.id,requestedSessionId:session.id,preferredTime:session.startsAt,requestedEndTime:trialSessionEndTime(session)};
   const planned=plans.filter(p=>p.kind==='trial').map(p=>({...p.data,studentId:p.studentId,requestedClassId:p.classId,requestedSessionId:p.session.id,preferredTime:p.session.startsAt,requestedEndTime:p.session.endsAt}));
   const error=trialPlacementError(request,planned);if(error)fail(error);seen.add(key);
   plans.push({row:index+2,kind,data,studentId:student?.id||'',classId:cls.id,session:{id:session.id,name:session.name,startsAt:session.startsAt,endsAt:trialSessionEndTime(session)},summary:data.name+' / '+cls.name+' / '+session.name+' / 直接入班试听'});return;
  }
  const starts=r.进班首讲.split('|'),signups=r.签约类型.split('|');if(starts.length!==ids.length||signups.length!==ids.length)fail('进班首讲、签约类型必须与班级ID数量相同');
  const items=classes.map((cls,i)=>{const key=person+'|'+cls.id;if(seen.has(key)||(student&&transferActiveClasses(student.id).has(cls.id)))fail('该学生已报名或本批重复报名该班');seen.add(key);
   const count=(capacity.get(cls.id)||0)+1;capacity.set(cls.id,count);if(Number(cls.students||0)+count>Number(cls.capacity)+Number(cls.virtualSeats||0))fail('班级剩余名额不足');
   if(!/^\d+$/.test(starts[i])||!['新签','续费'].includes(signups[i]))fail('请核对进班首讲及新签/续费');const price=enrollmentClassPrice({class:cls,startSession:Number(starts[i])});if(!price)fail('课程收费或讲次配置不完整');
   let renewalFrom;
   if(signups[i]==='续费'){
    const sources=student?studentTermEnrollments().filter(row=>row.studentId===student.id&&enrollmentRenewalSource(student.id,row.classId)&&enrollmentRenewalTarget(cls,enrollmentRenewalSnapshot(row))):[];
    if(sources.length!==1)fail('续费须匹配唯一的同学科原班；暂无原班请用新签，多原班请通过单个报名选择原班');
    const {initiatedAt,...source}=enrollmentRenewalSnapshot(sources[0]);renewalFrom=source;
   }
   return {classId:cls.id,startSession:Number(starts[i]),signupType:signups[i],price,...(renewalFrom?{renewalFrom}:{})};
  });
  const due=items.reduce((sum,i)=>sum+i.price.tuitionCents,0),paid=enrollmentAmountCents(r.实收金额);if(paid===null||paid>due||!enrollmentManualChannels.includes(r.收款方式))fail('实收须为不超过应收的非负金额（最多两位小数），收款方式仅支持现金或POS刷卡');
  const names=(r.凭证文件名||'').split('|').filter(Boolean),proofs=names.map(name=>(batchImportState.files||[]).find(f=>f.fileName===name));if(paid>0&&(!names.length||proofs.some(f=>!f)))fail('实收大于0时须上传匹配文件名的收款凭证');
  plans.push({row:index+2,kind,data,studentId:student?.id||'',items,due,paid,proofs,channel:r.收款方式,summary:data.name+' / '+classes.map(c=>c.name).join('、')+' / 应收 '+financeMoney(due)+' / 实收 '+financeMoney(paid)});
 }catch(e){errors.push('第'+(index+2)+'行：'+e.message)}});
 return {errors,plans};
}
function batchImportPreview(){const d=batchImportState;if(!d.kind)return;d.text=$('#batch-import-text').value;d.preview=batchImportPlan(d.kind,d.text);batchImportShow()}
function batchImportPreviewHTML(){const p=batchImportState.preview;if(!p)return '<p class="help">校验后显示逐行预览。</p>';return (p.errors.length?`<div role="alert" style="color:#c33">${p.errors.map(e=>`<p>${esc(e)}</p>`).join('')}</div>`:'<p class="help">校验通过；确认后写入以下记录。</p>')+aTable(['行号','导入内容'],p.plans.map(r=>`<tr><td>${r.row}</td><td>${esc(r.summary)}</td></tr>`))}
function batchImportCommit(){
 const d=batchImportState;if(!d.kind||!d.preview||!batchImportAllowed(d.kind)||d.actor!==permissionState.identity||d.page!==state.page)return;
 const current=batchImportPlan(d.kind,d.text);if(current.errors.length||JSON.stringify(current)!==JSON.stringify(d.preview)){d.preview=current;batchImportShow();toast('资料已变化，请重新核对预览后确认');return}
 const batchId='IMPORT-'+Date.now()+'-'+Math.random().toString(36).slice(2,8),at=new Date().toISOString(),operator=studentExamOperator(),kind=d.kind;
 for(const [index,p] of current.plans.entries()){
  if(['course','class','lead'].includes(kind)){batchExtendedCommit(p,batchId,index,at,operator);continue}
  if(kind==='staff'){state.staff.push({...p.data,importBatchId:batchId,createdAt:at,operator});continue}
  if(kind==='trial'){const cls=a.classes.find(c=>c.id===p.classId),student=a.students.find(s=>s.id===p.studentId);const request={...trialBlank(),...p.data,studentId:p.studentId,leadId:student?.originLeadId||'',requestedClassId:cls.id,requestedClassName:cls.name,requestedSessionId:p.session.id,requestedSessionName:p.session.name,requestedEndTime:p.session.endsAt,preferredTime:p.session.startsAt,course:cls.course,campus:cls.campus,academicTerm:studentClassTerm(cls),id:++trialState.sequence,status:'待排班',actorId:trialActor().id,actor:trialActor().name,submittedAt:at,files:[],importBatchId:batchId};trialState.requests.unshift(request);trialPlaceRequest(request);continue}
  let student=a.students.find(s=>p.studentId?s.id===p.studentId:s.name===p.data.name&&s.phone===p.data.phone);if(!student){student={...p.data,id:batchId+'-STUDENT-'+index,status:'在读',follow:'已签约',enrollments:[],classNames:[],history:[],campus:a.classes.find(c=>c.id===p.items[0].classId).campus};a.students.push(student)}
  let remaining=p.paid;const items=p.items.map(i=>{const cls=a.classes.find(c=>c.id===i.classId),paid=Math.min(remaining,i.price.tuitionCents);remaining-=paid;cls.students=Number(cls.students||0)+1;return {classId:cls.id,className:cls.name,course:cls.course,campus:cls.campus,teacher:cls.teacher,academicTerm:studentClassTerm(cls),enrollmentStatus:'上课中',signupType:i.signupType,startSession:i.startSession,sessionCount:i.price.sessions,tuitionCents:i.price.tuitionCents,materialCents:0,totalCents:i.price.tuitionCents,discountCents:0,dueCents:i.price.tuitionCents,dueTuitionCents:i.price.tuitionCents,dueMaterialCents:0,paidCents:paid,paidTuitionCents:paid,paidMaterialCents:0}});
  student.enrollments??=[];student.enrollments.push(...items);student.classNames=[...new Set([...(student.classNames||String(student.className||'').split('、')).filter(n=>n&&n!=='—'),...items.map(i=>i.className)])];student.className=student.classNames.join('、');student.status='在读';student.firstEnrolledAt??=at;
  const id=batchId+'-ORDER-'+index;
  items.forEach((item,i)=>{const cls=a.classes.find(c=>c.id===item.classId);Object.assign(item,{orderId:id,teacherId:cls.teacherId||'',teacherAccount:cls.teacherAccount||'',academicTeacherId:cls.academicTeacherId||'',academicTeacher:cls.academicTeacher||''});if(p.items[i].renewalFrom)item.renewalFrom={...p.items[i].renewalFrom,initiatedAt:at}});
  a.orders.unshift({id,studentId:student.id,student:student.name,studentPhone:student.phone,product:items.map(i=>i.className).join('、'),items,amount:financeMoney(p.due),originalAmount:financeMoney(p.due),paid:financeMoney(p.paid),discountCents:0,status:p.paid===p.due?'交易成功':'等待付款',receipts:p.paid?[{channel:p.channel,amountCents:p.paid,recordedAt:at,operator,proofs:p.proofs}]:[],payMode:'手动录入',payChannel:p.channel,createdAt:at,operator,note:p.data.note,importBatchId:batchId});
  (student.history??=[]).push(leadHistoryEntry('批量报名','订单 '+id+'；'+items.map(i=>i.className).join('、')));
 }
 (state.importHistory??=[]).push({id:batchId,kind,count:current.plans.length,recordedAt:at,operator});batchImportClose(true);render();toast('已导入'+current.plans.length+'行，记录已关联业务数据');
}
const batchEnrollmentTab=enrollTab,batchTrialTab=trialBookingTab,batchStaffPage=permissionStaffPage;
enrollTab=function(tab){return tab==='批量报名'?batchImportOpen('enroll'):batchEnrollmentTab(tab)};
trialBookingTab=function(tab){return tab==='批量预约'?batchImportOpen('trial'):batchTrialTab(tab)};
permissionStaffPage=function(){return batchStaffPage().replace("toast('导入模板待业务确认')","batchImportOpen('staff')")};

function batchImportProofs(files){if(batchImportState.kind!=='enroll')return;batchImportState.files??=[];for(const file of files){if(!/\.(png|jpe?g|webp|pdf|docx?|xlsx?)$/i.test(file.name)||!file.size||file.size>20*1024*1024){toast('凭证格式无效或超过20MB');continue}if(batchImportState.files.some(f=>f.fileName===file.name)){toast('文件名重复：'+file.name);continue}if(batchImportState.files.length>=200){toast('每批最多200份凭证');break}batchImportState.files.push({fileName:file.name,size:file.size,type:file.type,url:URL.createObjectURL(file)})}batchImportState.preview=null;batchImportShow()}
