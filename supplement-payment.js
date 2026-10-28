// 补费关联原报名订单；金额与收款记录沿用原型会话数据。
let supplementSequence=0;
function supplementDraft(){
  const studentId=a.students[a.selectedStudent]?.id||'',actor=studentTermActor();
  if(!a.supplementDraft||a.supplementDraft.studentId!==studentId||a.supplementDraft.actor!==actor){supplementDisposeProofs();a.supplementDraft={studentId,actor,classId:'',mode:'手动录入',receipts:[{channel:'现金',amount:''}],note:'',snapshot:''}};
  return a.supplementDraft;
}
function supplementClasses(){
  const studentId=a.students[a.selectedStudent]?.id;
  const ids=new Set(studentTermEnrollments().filter(r=>r.studentId===studentId&&!['已退班','已退费','已取消','已转班'].includes(r.status)).map(r=>r.classId));
  // Transfer does not forgive the source class debt; it remains payable on its original order.
  for(const order of a.orders.filter(o=>o.studentId===studentId&&!['已取消','已关闭','交易关闭'].includes(o.status)))for(const item of order.items||[])if(item.enrollmentStatus==='已转班'&&Number.isSafeInteger(item.paidTuitionCents)&&item.dueCents>item.paidTuitionCents)ids.add(item.classId);
  return a.classes.filter(c=>ids.has(c.id));
}
function supplementFeeData(){
  const d=supplementDraft(),valid=n=>Number.isSafeInteger(n)&&n>=0;
  const result={tuitionDue:null,tuitionPaid:null,materialDue:null,materialPaid:null,due:null,paid:null,debt:null,purchased:null,used:null,error:''};
  if(!supplementClasses().some(c=>c.id===d.classId))return {...result,error:'请选择学生已报名的课程／班级'};
  const matches=a.orders.filter(o=>o.studentId===d.studentId&&!['已取消','已关闭','交易关闭'].includes(o.status)).flatMap(order=>(order.items||[]).filter(item=>item.classId===d.classId).map(item=>({order,item})));
  if(matches.length!==1)return {...result,error:matches.length?'该班级对应多笔报名，请先核对收费订单。':'暂无完整报名收费明细，补齐后可办理补费。'};
  const {order,item}=matches[0];Object.assign(result,{order,item});
  if((item.materialCents||0)!==0){result.error='该历史订单含已停用费项，请先核对原订单；本页仅办理学费补收。';return result}
  const tuition=item.tuitionCents,material=item.materialCents,discount=item.discountCents;
  result.tuitionDue=valid(item.dueTuitionCents)?item.dueTuitionCents:valid(tuition)&&valid(discount)&&(material===0||discount===0)&&tuition>=discount?tuition-discount:null;
  result.materialDue=valid(item.dueMaterialCents)?item.dueMaterialCents:valid(material)&&discount===0?material:material===0?0:null;
  result.due=valid(item.dueCents)?item.dueCents:null;
  const orderPaid=enrollmentAmountCents(String(order.paid??'').replace(/[¥￥,\s]/g,''));
  const orderDue=(order.items||[]).every(i=>valid(i.dueCents))?order.items.reduce((sum,i)=>sum+i.dueCents,0):null;
  result.orderPaid=orderPaid;result.orderDue=orderDue;
  result.paid=valid(item.paidCents)?item.paidCents:valid(item.paidTuitionCents)&&valid(item.paidMaterialCents)?item.paidTuitionCents+item.paidMaterialCents:orderPaid===0?0:orderDue!==null&&orderPaid===orderDue?result.due:order.items.length===1?orderPaid:null;
  if(!valid(result.due)||!valid(result.paid)||result.paid>result.due||!valid(orderPaid)||!valid(orderDue)||orderPaid>orderDue||result.paid>orderPaid){result.error='收费明细不完整或尚未分配到该班级，请先核对原订单。';return result}
  result.debt=result.due-result.paid;
  if(result.tuitionDue!==null&&result.materialDue!==null&&result.tuitionDue+result.materialDue===result.due){
    const pt=item.paidTuitionCents,pm=item.paidMaterialCents;
    if(valid(pt)&&valid(pm)&&pt+pm===result.paid&&pt<=result.tuitionDue&&pm<=result.materialDue){result.tuitionPaid=pt;result.materialPaid=pm}
    else if(result.paid===result.due){result.tuitionPaid=result.tuitionDue;result.materialPaid=result.materialDue}
    else if(result.paid===0){result.tuitionPaid=0;result.materialPaid=0}
    else if(result.materialDue===0){result.tuitionPaid=result.paid;result.materialPaid=0}
    else if(result.tuitionDue===0){result.tuitionPaid=0;result.materialPaid=result.paid}
  }
  if(result.debt>0&&(result.tuitionPaid===null||result.materialPaid===null))result.error='历史收费明细不完整，请先核对原订单后补费。';
  if(Number.isInteger(item.sessionCount)&&Number.isInteger(item.startSession)&&item.startSession>0&&item.startSession<=item.sessionCount)result.purchased=item.sessionCount-item.startSession+1;
  const lessons=new Map();
  for(const row of (typeof businessAttendanceRecords==='function'?businessAttendanceRecords():[...a.attendance,...(a.lessonConsumptionRecords||[])] )){
    if((row.studentId??a.students[row.studentIndex]?.id)!==d.studentId||(row.classId??a.classes[row.classIndex]?.id)!==d.classId)continue;
    const number=Number(String(row.session||'').match(/^第\s*(\d+)\s*讲$/)?.[1]);
    if(number&&number>=item.startSession&&number<=item.sessionCount)lessons.set(number,['出勤','迟到','早退','未出勤销课'].includes(row.attendance));
  }
  result.used=result.purchased===null?null:[...lessons.values()].filter(Boolean).length;
  return result;
}
function supplementSnapshot(data){return JSON.stringify({order:data.order?.id,studentId:supplementDraft().studentId,classId:supplementDraft().classId,item:data.item,paid:data.order?.paid,status:data.order?.status})}
function supplementSelectClass(value){
  const d=supplementDraft();supplementDisposeProofs();d.mode='手动录入';d.classId=supplementClasses().some(c=>c.id===value)?value:'';d.receipts=[{channel:'现金',amount:''}];d.note='';d.snapshot=supplementSnapshot(supplementFeeData());academicRender();
}
function supplementReceiptField(index,key,value){
  const d=supplementDraft();if(!d.receipts[index]||!['channel','amount'].includes(key))return;
  d.receipts[index][key]=value;supplementRefreshTotals();
}
function supplementPaidInput(){if(supplementDraft().mode!=='手动录入')return 0;return supplementDraft().receipts.reduce((sum,r)=>sum+(enrollmentAmountCents(r.amount)??0),0)}
function supplementRefreshTotals(){
  const data=supplementFeeData(),paid=supplementPaidInput();
  const total=$('#supplement-paid'),remaining=$('#supplement-debt');
  if(total)total.textContent=withdrawMoney(paid);
  if(remaining)remaining.textContent=data.debt===null?'—':withdrawMoney(Math.max(0,data.debt-paid));
}
function supplementAddReceipt(){supplementDraft().receipts.push({channel:'现金',amount:''});academicRender()}
function supplementRemoveReceipt(index){const d=supplementDraft();if(d.receipts.length>1){for(const proof of d.receipts[index]?.proofs||[])URL.revokeObjectURL(proof.url);d.receipts.splice(index,1)}academicRender()}
function supplementChangePayMode(mode){if(['手动录入','商城支付'].includes(mode)){supplementDraft().mode=mode;academicRender()}}
function supplementAddProofs(index,files){
  const receipt=supplementDraft().receipts[index];if(!receipt)return;
  const errors=enrollmentAppendProofs(receipt,files);academicRender();
  if(errors.length)toast([...new Set(errors)].join('；'));
}
function supplementRemoveProof(index,proofIndex){
  const removed=supplementDraft().receipts[index]?.proofs?.splice(proofIndex,1)[0];
  if(removed)URL.revokeObjectURL(removed.url);academicRender();
}
function supplementDisposeProofs(){
  for(const receipt of a.supplementDraft?.receipts||[])for(const proof of receipt.proofs||[])URL.revokeObjectURL(proof.url);
}
function supplementPendingNotice(data){
  const pending=(data.order?.supplementPaymentRequests||[]).filter(row=>row.classId===supplementDraft().classId&&row.status==='等待付款');
  return pending.length?'<p class="checkout-payment-notice">已生成待付款补费单；尚未收款，原订单实收及欠费未变。</p>':'';
}
function supplementCreatePending(data,d,student){
  const requests=data.order.supplementPaymentRequests||[];
  if(requests.some(row=>row.classId===d.classId&&row.status==='等待付款')){toast('该班级已有待付款补费单，请勿重复提交');return}
  (data.order.supplementPaymentRequests??=[]).push({id:'BFP'+Date.now()+'-'+(++supplementSequence),studentId:student.id,classId:d.classId,orderId:data.order.id,amountCents:data.debt,paidCents:0,status:'等待付款',mode:'商城支付',note:d.note,operator:studentExamOperator(),recordedAt:new Date().toISOString()});
  d.snapshot=supplementSnapshot(supplementFeeData());academicRender();toast('已生成待付款补费单，商城支付服务待接入');
}
function supplementCancel(){supplementDisposeProofs();a.supplementDraft=null;a.selectedStudent=null;academicRender()}
function supplementFeeSection(title,note,due,paid,extra='',paidExtra=''){
  const money=n=>n===null?'—':withdrawMoney(n);
  return `<section class="supplement-box"><h2>${title} <span class="help">${note}</span></h2><div class="summary-line"><span>应收</span><span>${money(due)}${extra}</span></div><div class="summary-line"><span>已缴费</span><span>${money(paid)}${paidExtra}</span></div><div class="summary-line supplement-owing"><span>欠费</span><strong>${due===null||paid===null?'—':money(due-paid)}</strong></div></section>`;
}
function supplementPage(){
  const d=supplementDraft(),student=a.students[a.selectedStudent],classes=supplementClasses(),data=supplementFeeData(),money=n=>n===null?'—':withdrawMoney(n),selected=classes.some(c=>c.id===d.classId);
  return aHeading('学生补费','为已报名课程或班级补收费用')+`<section class="card pad"><div class="supplement-form">${student?`<div class="supplement-student"><div><strong>${esc(student.name)}</strong><span>${esc(student.phone)}</span><span>${classes.length} 个已报名课程／班级</span><p class="help">${esc(student.campus||'')}</p></div><button class="btn small" onclick="a.modal='selectStudent';academicRender()">重新选择</button></div>`:flowStudentSummary(null)}${aField('选择课程／班级',`<select class="select" id="flow-from" ${student?'':'disabled'} onchange="supplementSelectClass(this.value)"><option value="">${student?'请选择已报名课程／班级':'请先选择学生'}</option>${classes.map(c=>`<option value="${esc(c.id)}" ${d.classId===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select>`,true)}${student&&!classes.length?'<p class="help">该学生暂无可补费的已报名班级。</p>':''}${selected?`
    ${supplementFeeSection('学费','（退费说明：根据未上讲次退）',data.tuitionDue,data.tuitionPaid,data.purchased===null?'':` <small>（已报${data.purchased}讲次）</small>`,data.used===null?'':` <small>（已上${data.used}讲次）</small>`)}
    ${data.error?`<p class="help" role="status">${esc(data.error)}</p>`:data.tuitionPaid===null||data.materialPaid===null?'<p class="help">历史收费明细不完整，分项已缴及欠费显示“—”；请核对原订单。</p>':''}
    <div class="enrollment-checkout supplement-checkout"><section><h2 class="section-title">费用结算</h2>
    <div class="checkout-field"><label>本次待补</label><strong>${money(data.debt)}</strong></div>
    <div class="checkout-field"><label>实收合计</label><strong id="supplement-paid">${withdrawMoney(supplementPaidInput())}</strong></div>
    <div class="checkout-field"><label>补费后欠费</label><strong id="supplement-debt">${data.debt===null?'—':money(Math.max(0,data.debt-supplementPaidInput()))}</strong></div>
    <p class="help">本次补费仅抵扣所选班级的学费欠费。</p></section>
    <section><h2 class="section-title">收款</h2><div class="checkout-field"><label class="required">支付方式</label><div class="lead-radio">${['手动录入','商城支付'].map(mode=>`<label><input type="radio" name="supplement-mode" value="${mode}" ${d.mode===mode?'checked':''} onclick="supplementChangePayMode(this.value)"> ${mode}</label>`).join('')}</div></div>${enrollmentReceiptFields('supplement')}${supplementPendingNotice(data)}</section>
    <section><h2 class="section-title">其他信息</h2><div class="checkout-field"><label class="required">经办人</label><strong>${esc(leadIdentityLabel(leadCurrentOperator()))}</strong></div>
    <div class="checkout-field"><label for="supplement-note">备注</label><textarea class="textarea" id="supplement-note" maxlength="50" placeholder="请输入50字以内备注内容（非必填）" oninput="supplementDraft().note=this.value">${esc(d.note)}</textarea></div></section></div>`:''}
    <div class="form-actions"><button class="btn" onclick="supplementCancel()">取消</button><button class="btn primary" ${!selected||data.error||!data.debt?'disabled':''} onclick="finishFlow('supplement')">确定</button></div></div></section>`;
}
function supplementSubmit(){
  if(state.page!=='supplement'||!permissionCanVisit('supplement'))return;
  const d=a.supplementDraft,student=a.students[a.selectedStudent];
  if(!d||!student||d.studentId!==student.id||d.actor!==studentTermActor())return;
  const data=supplementFeeData();if(data.error||!data.debt){toast(data.error||'该班级没有待补费用');return}
  if(d.snapshot!==supplementSnapshot(data)){d.snapshot=supplementSnapshot(data);academicRender();toast('收费明细已更新，请重新核对金额后提交');return}
  if(d.note.length>50){toast('备注不能超过50字');return}
  if(!['手动录入','商城支付'].includes(d.mode)){toast('请选择支付方式');return}
  if(d.mode==='商城支付'){supplementCreatePending(data,d,student);return}
  const receipts=[];
  for(const row of d.receipts){const amountCents=enrollmentAmountCents(row.amount);if(!enrollmentManualChannels.includes(row.channel)||amountCents===null||amountCents<=0){toast('请选择每笔缴费方式并填写有效正数金额（最多两位小数）');return}if(!row.proofs?.length){toast('请为每笔手动收款上传凭证');return}receipts.push({channel:row.channel,amountCents,proofs:row.proofs.map(proof=>({...proof}))})}
  const amount=receipts.reduce((sum,r)=>sum+r.amountCents,0);
  if(!Number.isSafeInteger(amount)||amount>data.debt||data.orderPaid+amount>data.orderDue){toast('实付金额不能超过欠费金额');return}
  const allocation=supplementAllocation(data,amount),record={id:'BF'+Date.now()+'-'+(++supplementSequence),studentId:student.id,classId:d.classId,orderId:data.order.id,amountCents:amount,mode:d.mode,receipts,note:d.note,operator:studentExamOperator(),recordedAt:new Date().toISOString(),paidBeforeCents:data.paid,paidAfterCents:data.paid+amount,...allocation};
  data.item.paidCents=record.paidAfterCents;
  if(allocation.tuitionCents!==null){data.item.paidTuitionCents=data.tuitionPaid+allocation.tuitionCents;data.item.paidMaterialCents=data.materialPaid+allocation.materialCents}
  data.order.paid=withdrawMoney(data.orderPaid+amount);data.order.status=data.orderPaid+amount===data.orderDue?'交易成功':'等待付款';
  (data.order.receipts??=[]).push(...receipts.map(r=>({...r,type:'补费',classId:d.classId,supplementId:record.id,recordedAt:record.recordedAt,operator:{...record.operator}})));
  data.order.payChannel=[...new Set((data.order.receipts||[]).map(r=>r.channel))].join('、');
  // 刷新后订单与档案不再共享对象引用，显式同步该笔报名的实缴分配。
  for(const item of student.enrollments||[])if(item.classId===d.classId&&(item.orderId===data.order.id||!item.orderId)){
    item.paidCents=data.item.paidCents;item.paidTuitionCents=data.item.paidTuitionCents;item.paidMaterialCents=data.item.paidMaterialCents;
  }
  (a.supplementRecords??=[]).push(record);
  // A later manual payment supersedes a pending checkout for the old debt amount.
  for(const request of data.order.supplementPaymentRequests||[])if(request.classId===d.classId&&request.status==='等待付款'){request.status='已关闭';request.closedAt=record.recordedAt;request.closedReason='已办理手动补费'}
  d.receipts=[{channel:'现金',amount:''}];d.note='';d.snapshot=supplementSnapshot(supplementFeeData());academicRender();toast('补费已记录，欠费与原订单实收已更新（原型演示）');
}
function supplementAllocation(data,amount){
  if(data.tuitionPaid===null||data.materialPaid===null)return {tuitionCents:null,materialCents:null};
  const tuitionCents=Math.min(amount,data.tuitionDue-data.tuitionPaid);
  return {tuitionCents,materialCents:amount-tuitionCents};
}
const supplementPreviousFlow=flowPage;
flowPage=function(type){return type==='supplement'?supplementPage():supplementPreviousFlow(type)};
const supplementPreviousFinish=finishFlow;
finishFlow=function(type){return type==='supplement'?supplementSubmit():supplementPreviousFinish(type)};
const supplementPreviousRender=academicRender;
academicRender=function(){if(a.supplementDraft&&(state.page!=='supplement'||a.supplementDraft.actor!==studentTermActor()||a.supplementDraft.studentId!==a.students[a.selectedStudent]?.id)){supplementDisposeProofs();a.supplementDraft=null}return supplementPreviousRender()};
