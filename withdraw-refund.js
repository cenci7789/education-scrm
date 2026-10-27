// 退费登记沿用原型的会话存储；客户退款仅登记，不触发银行付款。
let withdrawSequence=0;
function withdrawDraft(){
  const studentId=a.students[a.selectedStudent]?.id||'',actor=studentTermActor();
  if(!a.withdrawDraft||a.withdrawDraft.studentId!==studentId||a.withdrawDraft.actor!==actor)a.withdrawDraft={studentId,actor,classId:'',amount:'',method:'',card:'',holder:'',bank:'',contact:'',note:''};
  return a.withdrawDraft;
}
function withdrawBalanceCents(student){return Number.isSafeInteger(student?.accountBalanceCents)?student.accountBalanceCents:0}
function withdrawMoney(cents){return '¥'+(cents/100).toFixed(2)}
function withdrawInput(key,label,extra=''){
  return aField(label,`<input class="input" id="refund-${key}" value="${esc(withdrawDraft()[key])}" placeholder="请输入${label}" ${extra} oninput="withdrawDraft()['${key}']=this.value">`,true);
}
function withdrawSetMethod(value){
  if(!['','balance','customer'].includes(value))return;
  withdrawDraft().method=value;
  $('#refund-bank-fields').hidden=value!=='customer';
  $('#refund-method-help').textContent=value==='balance'?'确认后，实退金额将计入该学生账户余额。':value==='customer'?'请填写客户收款信息，提交后登记为待退款。':'';
}
function withdrawHistory(student){
  const records=(a.refundRecords||[]).filter(r=>r.studentId===student.id).slice().reverse();
  if(!records.length)return '';
  return `<h2 class="section-title" style="margin-top:24px">退费记录</h2>${aTable(['记录时间','课程／班级','退费方式','金额','状态'],records.map(r=>`<tr><td>${esc(studentProfileTime(r.recordedAt))}</td><td>${esc(r.className)}</td><td>${r.method==='balance'?'退回余额':'退回客户'}</td><td>${withdrawMoney(r.amountCents)}</td><td>${esc(r.status)}</td></tr>`))}`;
}
function withdrawPaymentFields(){
  const d=withdrawDraft(),student=a.students[a.selectedStudent];
  return `<section style="margin-top:24px"><h2 class="section-title">退费信息</h2>${student?`<p>账户余额：<strong>${withdrawMoney(withdrawBalanceCents(student))}</strong></p>`:''}<div class="form-grid">${withdrawInput('amount','实退金额','inputmode="decimal"')}${aField('退费方式',`<select class="select" id="refund-way" onchange="withdrawSetMethod(this.value)"><option value="">请选择退费方式</option><option value="balance" ${d.method==='balance'?'selected':''}>退回余额</option><option value="customer" ${d.method==='customer'?'selected':''}>退回客户</option></select>`,true)}</div><p class="help" id="refund-method-help">${d.method==='balance'?'确认后，实退金额将计入该学生账户余额。':d.method==='customer'?'请填写客户收款信息，提交后登记为待退款。':''}</p><div id="refund-bank-fields" ${d.method==='customer'?'':'hidden'}><div class="form-grid">${withdrawInput('card','银行卡号','inputmode="numeric" autocomplete="off" maxlength="40"')}${withdrawInput('holder','开户人','autocomplete="off" maxlength="80"')}${withdrawInput('bank','开户行','autocomplete="off" maxlength="120"')}${withdrawInput('contact','联系方式','type="tel" maxlength="30"')}</div></div>${student?withdrawHistory(student):''}</section>`;
}
function withdrawCancel(){a.withdrawDraft=null;academicRender()}
function withdrawFeeData(){
  const d=withdrawDraft(),student=a.students[a.selectedStudent],cls=a.classes.find(c=>c.id===d.classId);
  const result={original:null,discount:null,paid:null,unit:null,used:null,remaining:null,remainingFee:null};
  if(!student||!cls)return result;
  const matches=a.orders.filter(o=>o.studentId===student.id&&!['已取消','已关闭','交易关闭'].includes(o.status)).flatMap(order=>(order.items||[]).filter(item=>item.classId===cls.id).map(item=>({order,item})));
  // 多笔报名无法仅凭班级确定本次退费对应订单，不能合并成虚假的单价。
  if(matches.length!==1)return result;
  const {order,item}=matches[0],valid=value=>Number.isSafeInteger(value)&&value>=0;
  const tuition=item.tuitionCents,materials=item.materialCents,discount=item.discountCents;
  if(valid(tuition))result.original=tuition;
  if(valid(discount)&&(materials===0||discount===0))result.discount=discount;
  const orderPaid=enrollmentAmountCents(String(order.paid??'').replace(/[¥￥,\s]/g,''));
  const allDue=(order.items||[]).every(i=>valid(i.dueCents))?order.items.reduce((sum,i)=>sum+i.dueCents,0):null;
  if(valid(item.paidTuitionCents))result.paid=item.paidTuitionCents;
  else if(orderPaid!==null&&allDue!==null&&orderPaid===allDue&&valid(tuition)&&result.discount!==null)result.paid=tuition-result.discount;
  else if(order.items.length===1&&materials===0&&orderPaid!==null)result.paid=orderPaid;
  if(result.paid<0)result.paid=null;
  const total=item.sessionCount,start=item.startSession;
  if(!Number.isInteger(total)||!Number.isInteger(start)||start<1||start>total)return result;
  const purchased=total-start+1,byLesson=new Map();
  const records=(typeof businessAttendanceRecords==='function'?businessAttendanceRecords():[...a.attendance,...(a.lessonConsumptionRecords||[])]).filter(r=>(r.studentId!==undefined?r.studentId===student.id:a.students[r.studentIndex]?.id===student.id)&&(r.classId!==undefined?r.classId===cls.id:a.classes[r.classIndex]?.id===cls.id));
  let unknown=false;
  for(const r of records){
    const number=Number(String(r.session||'').match(/^第\s*(\d+)\s*讲$/)?.[1]);
    if(!number){unknown=true;continue}
    if(number>=start&&number<=total)byLesson.set(number,['出勤','迟到','早退','未出勤销课'].includes(r.attendance));
  }
  if(!unknown){
    result.used=[...byLesson.values()].filter(Boolean).length;
    if(typeof refundSelectedStop==='function'){
      const cutoff=refundSelectedStop();
      result.remaining=cutoff&&cutoff.number<=total?Array.from({length:purchased},(_,i)=>start+i).filter(n=>n>cutoff.number&&!byLesson.get(n)).length:null;
    }else result.remaining=purchased-result.used;
  }
  if(result.paid!==null){
    result.unit=result.paid/purchased;
    if(result.remaining!==null){
      const refunded=(a.refundRecords||[]).filter(r=>r.studentId===student.id&&r.classId===cls.id&&['已计入余额','待退款','已退款'].includes(r.status)).reduce((sum,r)=>sum+r.amountCents,0);
      result.remainingFee=Math.max(0,Math.round(result.paid*result.remaining/purchased)-refunded);
    }
  }
  return result;
}
function withdrawFeeSummary(){
  const data=withdrawFeeData(),money=value=>value===null?'—':withdrawMoney(value);
  return `<div class="summary-box" style="margin-top:20px">${[['原价',money(data.original)],['优惠',money(data.discount)],['实收',money(data.paid)],['课单价',data.unit===null?'—':money(data.unit)+' / 讲'],['已上讲次',data.used===null?'—':data.used+' 讲'],['剩余讲次',data.remaining===null?'—':data.remaining+' 讲'],['剩余学费',money(data.remainingFee)]].map(([label,value])=>`<div class="summary-line"><span>${label}</span><strong>${value}</strong></div>`).join('')}</div><p class="help">按报名实缴学费计算。课单价＝实收学费÷报名讲次；已上讲次含“未出勤销课”。${typeof refundSelectedStop==='function'?'剩余讲次为截止课节之后尚未销课的可退课节，剩余学费按其占报名讲次的比例计算，并扣除已退及待退金额。':'剩余学费按未销课比例计算，并扣除已退及待退金额。'}缺少明细或对应多笔报名时显示“—”。</p>`;
}
function withdrawSelectClass(value){withdrawDraft().classId=value;$('#withdraw-fee-summary').innerHTML=withdrawFeeSummary()}
const withdrawPreviousFlowPage=flowPage;
flowPage=function(type){
  if(type!=='withdraw')return withdrawPreviousFlowPage(type);
  const d=withdrawDraft();
  let html=withdrawPreviousFlowPage(type);
  html=html.replace(aSelect('flow-from',a.classes.map(c=>c.name),'请选择课程／班级'),()=>`<select class="select" id="flow-from" onchange="withdrawSelectClass(this.value)"><option value="">请选择课程／班级</option>${a.classes.map(c=>`<option value="${esc(c.id)}" ${d.classId===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select>`);
  const old=`<div class="form-grid" style="margin-top:20px">${aField('实退金额',aInput('refund-amount','请输入金额','number'),true)}${aField('退款方式',aSelect('refund-way',['现金','微信','支付宝','银行卡'],'请选择退款方式'),true)}</div>`;
  html=html.replace(old,()=>withdrawPaymentFields());
  html=html.replace(/<div class="summary-box" style="margin-top:20px">[\s\S]*?<span>预计应退<\/span><strong>[\s\S]*?<\/strong><\/div><\/div>/,()=>`<div id="withdraw-fee-summary">${withdrawFeeSummary()}</div>`);
  html=html.replace('<textarea class="textarea" maxlength="50" placeholder="请输入50字以内备注"></textarea>',()=>`<textarea class="textarea" id="refund-note" maxlength="50" placeholder="请输入50字以内备注" oninput="withdrawDraft().note=this.value">${esc(d.note)}</textarea>`);
  return html.replace("onclick=\"nav('withdraw')\"",'onclick="withdrawCancel()"');
};
const withdrawPreviousFinishFlow=finishFlow;
finishFlow=function(type){
  if(type!=='withdraw')return withdrawPreviousFinishFlow(type);
  if(state.page!=='withdraw'||!permissionCanVisit('withdraw'))return;
  const d=a.withdrawDraft,student=a.students[a.selectedStudent];
  if(!student||!d||d.studentId!==student.id||d.actor!==studentTermActor()){toast('请先选择学生');return}
  const cls=a.classes.find(c=>c.id===d.classId);if(!cls){toast('请选择课程／班级');return}
  const amount=String(d.amount).trim();
  if(!/^\d+(\.\d{1,2})?$/.test(amount)){toast('请输入有效实退金额，最多两位小数');return}
  const amountCents=Math.round(Number(amount)*100),balance=withdrawBalanceCents(student);
  if(!Number.isSafeInteger(amountCents)||amountCents<=0||!Number.isSafeInteger(balance+amountCents)){toast('请输入有效的正数金额');return}
  if(!['balance','customer'].includes(d.method)){toast('请选择退费方式');return}
  let bankDetails;
  if(d.method==='customer'){
    bankDetails={card:d.card.replace(/\s/g,''),holder:d.holder.trim(),bank:d.bank.trim(),contact:d.contact.trim()};
    if(!/^\d{8,30}$/.test(bankDetails.card)){toast('请填写有效银行卡号（8至30位数字）');return}
    if(!bankDetails.holder||!bankDetails.bank||!bankDetails.contact){toast('请完整填写开户人、开户行和联系方式');return}
    if(!/^[+\d][\d\s()+-]{5,29}$/.test(bankDetails.contact)){toast('请填写有效联系方式');return}
  }
  const record={id:'refund-'+Date.now()+'-'+(++withdrawSequence),studentId:student.id,classId:cls.id,className:cls.name,amountCents,method:d.method,note:d.note,recordedAt:new Date().toISOString(),operator:studentExamOperator(),status:d.method==='balance'?'已计入余额':'待退款',...(bankDetails?{bankDetails}:{})};
  if(d.method==='balance'){
    student.accountBalanceCents=balance+amountCents;
    (a.accountTransactions??=[]).push({id:record.id,studentId:student.id,type:'退费入账',amountCents,balanceBeforeCents:balance,balanceAfterCents:student.accountBalanceCents,refundId:record.id,recordedAt:record.recordedAt,operator:record.operator});
  }
  (a.refundRecords??=[]).push(record);
  a.withdrawDraft=null;academicRender();toast(d.method==='balance'?'退费已计入学生账户余额':'收款信息已保存，待退款');
};
const withdrawPreviousStudentCourses=studentProfileCourses;
studentProfileCourses=function(student){
  const html=withdrawPreviousStudentCourses(student);
  return `<div class="summary-box" style="margin-bottom:20px"><div class="summary-line"><span>账户余额</span><strong>${withdrawMoney(withdrawBalanceCents(student))}</strong></div></div>`+html;
};
const withdrawPreviousRender=academicRender;
academicRender=function(){
  if(a.withdrawDraft&&(state.page!=='withdraw'||a.withdrawDraft.actor!==studentTermActor()||a.withdrawDraft.studentId!==a.students[a.selectedStudent]?.id))a.withdrawDraft=null;
  return withdrawPreviousRender();
};
