function transferActiveClasses(studentId){return new Set(studentTermEnrollments().filter(r=>r.studentId===studentId&&!['已退班','已退费','已取消','已转班','已结课'].includes(r.status)).map(r=>r.classId))}
const settlementMatches=tempMoveMatches;
tempMoveMatches=function(side){const rows=settlementMatches(side);if(!['transfer','tempMove'].includes(state.page)||side!=='from')return rows;const id=a.students[a.selectedStudent]?.id;return rows.filter(c=>transferActiveClasses(id).has(c.id))};
function transferSourceQuote(){
 const d=transferDraft(),student=a.students.find(s=>s.id===d.studentId),from=a.classes.find(c=>c.id===d.from.id),error=message=>({error:message});
 if(!student||!from)return error('请选择学生及已报名的转出课程／班级');
 if(!transferActiveClasses(student.id).has(from.id))return error('学生未在所选转出班级就读');
 if(enrollmentClassInfo(from).format==='直播')return error('直播课程暂不支持转课');
 if((a.refundApplications||[]).some(r=>r.studentId===student.id&&r.classId===from.id&&!r.closed&&r.step<6))return error('原班有办理中的退费申请，请先处理');
 const matches=a.orders.filter(o=>o.studentId===student.id&&!['已取消','交易关闭','已关闭'].includes(o.status)).flatMap(order=>(order.items||[]).filter(item=>item.classId===from.id).map(item=>({order,item})));
 if(matches.length!==1)return error('原班报名收费明细缺失或存在多笔报名，请先核对原订单');
 const {order,item}=matches[0],total=item.sessionCount,start=item.startSession,valid=n=>Number.isSafeInteger(n)&&n>=0;
 if(!Number.isInteger(total)||!Number.isInteger(start)||start<1||start>total)return error('原班报名讲次记录不完整');
 if((item.materialCents||0)>0)return error('原订单含已停用费项，请先核对历史收费');
 const paid=valid(item.paidTuitionCents)?item.paidTuitionCents:order.items.length===1?financeAmount(order.paid):null;
 if(!valid(paid)||!valid(item.dueCents)||paid>item.dueCents)return error('原班实缴学费未分配到班级，请先核对原订单');
 const consumed=new Set();for(const r of (typeof businessAttendanceRecords==='function'?businessAttendanceRecords():[...a.attendance,...(a.lessonConsumptionRecords||[])] )){
  if((r.studentId||a.students[r.studentIndex]?.id)!==student.id||(r.classId||a.classes[r.classIndex]?.id)!==from.id||!['出勤','迟到','早退','未出勤销课'].includes(r.attendance))continue;
  const n=Number(String(r.session||'').match(/^第\s*(\d+)\s*讲$/)?.[1]);if(!n)return error('原班存在无法对应讲次的课消记录');if(n>=start&&n<=total)consumed.add(n);
 }
 const refunded=(a.refundRecords||[]).filter(r=>r.studentId===student.id&&r.classId===from.id).reduce((n,r)=>n+(r.amountCents||0),0),purchased=total-start+1,remaining=purchased-consumed.size;
 const credit=Math.max(0,Math.round(paid*remaining/purchased)-refunded);
 return {student,from,order,item,paid,sourceDebtCents:item.dueCents-paid,used:consumed.size,purchased,remaining,creditCents:credit};
}
function transferTargetQuote(){
 const d=transferDraft(),to=a.classes.find(c=>c.id===d.to.id);
 if(!to)return {error:'请选择转入课程／班级'};
 const fullPrice=enrollmentClassPrice({class:to,startSession:1});
 if(!fullPrice)return {error:'转入课程价格或讲次不完整'};
 const lesson=tempMoveSessions('to').find(s=>s.key===d.to.session),number=lesson&&(lesson.number||lesson.position+1);
 return {to,fullPrice,lesson,startSession:number,price:lesson?enrollmentClassPrice({class:to,startSession:number}):null};
}
function transferDiscountQuote(originalCents){
 const d=transferDraft(),type=d.discountType||'none',value=d.discountValue||'';
 let discountCents=0;
 if(type==='amount'){
  discountCents=enrollmentAmountCents(String(value));
  if(discountCents===null||discountCents<0||discountCents>originalCents)return {error:'减免金额须在 0 元至转入应收学费之间，最多两位小数'};
 }else if(type==='rate'){
  if(!/^(?:[0-9](?:\.\d{1,2})?|10(?:\.0{1,2})?)$/.test(String(value)))return {error:'请输入 0 至 10 折，最多两位小数'};
  discountCents=originalCents-Math.round(originalCents*Number(value)/10);
 }else if(type!=='none')return {error:'请选择有效的优惠方式'};
 return {discount:{type,value:type==='none'?'':String(value)},discountCents,dueCents:originalCents-discountCents};
}
function transferQuote(){
 const source=transferSourceQuote();if(source.error)return source;
 const target=transferTargetQuote();if(target.error)return target;
 const {student,from}=source,{to,lesson,price}=target;
 if(from.id===to.id)return {error:'转入班级不能与转出班级相同'};
 if(transferActiveClasses(student.id).has(to.id))return {error:'学生已在所选转入班级就读'};
 if(enrollmentClassInfo(to).format==='直播')return {error:'直播课程暂不支持转课'};
 if(Number(to.students)>=Number(to.capacity)+Number(to.virtualSeats||0))return {error:'转入班级已满员'};
 if(!lesson)return {error:'请选择转入班级的进入讲次'};
 if(!price)return {error:'转入课程价格或讲次不完整'};
 const discount=transferDiscountQuote(price.tuitionCents);if(discount.error)return discount;
 const differenceCents=source.creditCents-discount.dueCents,balanceCreditCents=Math.max(0,differenceCents),balanceBeforeCents=student.accountBalanceCents??0;
 if(!Number.isSafeInteger(balanceBeforeCents)||balanceBeforeCents<0||!Number.isSafeInteger(balanceBeforeCents+balanceCreditCents))return {error:'学生账户余额异常，请先核对'};
 return {...source,...target,...discount,originalCents:price.tuitionCents,differenceCents,balanceBeforeCents,balanceCreditCents,appliedCents:Math.min(source.creditCents,discount.dueCents),topupCents:Math.max(0,-differenceCents),refundCents:0};
}
function transferMoney(cents){return Number.isSafeInteger(cents)?enrollmentMoney(cents)+' 元':'待核对'}
function transferFeeLine(label,value){return `<div class="transfer-fee-line"><span>${label}</span><span class="transfer-money">${value}</span></div>`}
function transferSourceHTML(){
 const q=transferSourceQuote();if(q.error)return `<p class="help" role="status">${esc(q.error)}</p>`;
 return `<div class="transfer-fee-box"><div class="toolbar"><strong>总剩余学费</strong><button class="btn small" onclick="transferAttendanceOpen()">考勤明细</button></div>${transferFeeLine('原价',transferMoney(q.item.tuitionCents??q.item.dueCents)+` <small>（已报 ${q.purchased} 讲次）</small>`)}${transferFeeLine('实收',transferMoney(q.paid))}${transferFeeLine('已消耗 / 剩余讲次',q.used+' / '+q.remaining)}${transferFeeLine('剩余学费',transferMoney(q.creditCents))}${q.sourceDebtCents?transferFeeLine('原订单待补费',transferMoney(q.sourceDebtCents)):''}</div>`;
}
function transferTargetHTML(){
 const q=transferTargetQuote();
 return `<div class="transfer-fee-box"><strong>学费</strong><div class="transfer-fee-line"><label for="flow-to-session">当前进入</label><div id="temp-move-session-to">${tempMoveSessionSelect('to')}</div></div>${q.error?`<p class="help">${esc(q.error)}</p>`:transferFeeLine('总学费',transferMoney(q.fullPrice.fullCents)+` <small>（共 ${q.fullPrice.sessions} 讲次${q.price?'，剩余 '+(q.price.sessions-q.startSession+1)+' 讲次':''}）</small>`)+transferFeeLine('应收学费',q.price?transferMoney(q.price.tuitionCents):'请选择进入讲次')}</div>`;
}
function transferDiscountControls(){
 const d=transferDraft(),type=d.discountType||'none';
 return `<select class="select" aria-label="转课优惠方式" onchange="transferSetDiscount('type',this.value)">${[['none','不优惠'],['amount','减免'],['rate','打折']].map(([value,label])=>`<option value="${value}" ${type===value?'selected':''}>${label}</option>`).join('')}</select><input class="input" aria-label="转课优惠数值" inputmode="decimal" placeholder="${type==='rate'?'请输入折扣':'请输入金额'}" value="${esc(d.discountValue||'')}" ${type==='none'?'disabled':''} oninput="transferSetDiscount('value',this.value)">${type!=='none'?`<span>${type==='rate'?'折':'元'}</span>`:''}`;
}
function transferSetDiscount(key,value){
 if(state.page!=='transfer'||!permissionCanVisit('transfer')||a.modal==='transferConfirm')return;
 const d=transferDraft();
 if(key==='type'){if(!['none','amount','rate'].includes(value))return;d.discountType=value;d.discountValue='';$('#transfer-discount-controls').innerHTML=transferDiscountControls()}
 else if(key==='value')d.discountValue=value;else return;
 transferRefreshQuote();
}
function transferQuoteHTML(){
 const q=transferQuote();if(q.error)return `<p class="help" role="status">${esc(q.error)}</p>`;
 const difference=(q.differenceCents>0?'+':q.differenceCents<0?'−':'')+transferMoney(Math.abs(q.differenceCents));
 return `<section class="transfer-payment"><h2 class="section-title">支付信息</h2><div class="transfer-fee-box">${transferFeeLine('总价',transferMoney(q.originalCents))}${transferFeeLine('优惠',transferMoney(q.discountCents))}${transferFeeLine('应收',transferMoney(q.dueCents))}${transferFeeLine('转出剩余学费',transferMoney(q.creditCents))}<div class="transfer-fee-line transfer-difference"><strong>差额</strong><div><strong>${difference}</strong><div class="help">${q.topupCents?'补费 '+transferMoney(q.topupCents):q.balanceCreditCents?'存余额 '+transferMoney(q.balanceCreditCents):'无需补费或存余额'}</div></div></div></div><p class="help">差额＝转出剩余学费－转入应收。负数补费，正数存入学生余额。${q.sourceDebtCents?'原订单欠费 '+transferMoney(q.sourceDebtCents)+' 仍需单独补缴。':''}</p></section>`;
}
function transferRefreshQuote(){
 const from=$('#transfer-source-fees'),to=$('#transfer-target-fees'),el=$('#transfer-quote');
 if(from)from.innerHTML=transferSourceHTML();if(to)to.innerHTML=transferTargetHTML();if(el)el.innerHTML=transferQuoteHTML();
 const quote=transferQuote(),amount=$('#transfer-discount-due');if(amount)amount.textContent=quote.error?'—':transferMoney(quote.dueCents);
}
const settlementChoose=tempMoveChoose,settlementSearch=tempMoveSearch,settlementSession=tempMoveSessionSelect;
tempMoveChoose=function(side,index){const result=settlementChoose(side,index);if(state.page==='transfer')transferRefreshQuote();return result};
tempMoveSearch=function(side,value){const result=settlementSearch(side,value);if(state.page==='transfer')transferRefreshQuote();return result};
tempMoveSessionSelect=function(side){return settlementSession(side).replace('session=this.value"','session=this.value;'+(state.page==='transfer'?'transferRefreshQuote()':'')+'"')};
const settlementFlowPage=flowPage;
flowPage=function(type){
 if(type!=='transfer')return settlementFlowPage(type);
 const d=transferDraft(),s=a.students[a.selectedStudent],q=transferQuote();
 return aHeading('学生转课／班','核对转出、转入课程及学费，差额补费或存余额')+`<div class="card pad">${flowStudentSummary(s)}<div class="flow-layout transfer-information"><section class="flow-card"><h2 class="section-title">转出信息</h2>${aField('选择课程／班级',tempMovePicker('from'),true)}<div id="temp-move-session-from" hidden>${tempMoveSessionSelect('from')}</div><div id="transfer-source-fees">${transferSourceHTML()}</div></section><div class="flow-arrow">→</div><section class="flow-card"><h2 class="section-title">转入信息</h2>${aField('选择课程／班级',tempMovePicker('to'),true)}<div id="transfer-target-fees">${transferTargetHTML()}</div></section></div><section class="transfer-fee-box transfer-discount"><div class="transfer-fee-line"><label>优惠</label><div class="transfer-discount-controls" id="transfer-discount-controls">${transferDiscountControls()}</div></div><div class="transfer-fee-line"><span>应收</span><strong id="transfer-discount-due">${q.error?'—':transferMoney(q.dueCents)}</strong></div></section><div id="transfer-quote">${transferQuoteHTML()}</div><p class="help">确认后更新班级归属并生成关联订单；待补金额进入补费，剩余差额存入学生余额。</p><label>备注<textarea class="textarea" maxlength="50" oninput="transferDraft().note=this.value">${esc(d.note)}</textarea></label><div class="form-actions"><button class="btn" onclick="transferCancel()">取消</button><button class="btn primary" onclick="finishFlow('transfer')">确认转课</button></div></div>`;
};
function transferAttendanceOpen(){if(state.page!=='transfer'||!permissionCanVisit('transfer')||transferSourceQuote().error)return;a.modal='transferAttendance';academicRender()}
function transferAttendanceModal(){
 const q=transferSourceQuote(),close='<button class="btn" onclick="a.modal=null;academicRender()">关闭</button>';
 if(state.page!=='transfer'||!permissionCanVisit('transfer')||q.error)return `<div class="modal-backdrop"><section class="modal"><p>转出信息已变更，请重新选择。</p>${close}</section></div>`;
 const rows=studentCourseAttendanceRows({kind:'enrollment',studentId:q.student.id,classId:q.from.id,startSession:q.item.startSession});
 return `<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-label="转出课程考勤明细"><div class="modal-head"><h2>考勤明细</h2>${close}</div><p>${esc(q.student.name)} · ${esc(q.from.name)}</p>${aTable(['讲次','上课日期','上课时间','考勤状态','出勤情况'],rows.map(({lesson,records})=>`<tr><td>${esc(lesson.label)}</td><td>${esc(lesson.date||'待排课')}</td><td>${esc(lesson.time||'待排课')}</td><td>${esc(records.length?[...new Set(records.map(r=>r.status||'已考勤'))].join('、'):'未考勤')}</td><td>${esc(records.length?[...new Set(records.map(r=>r.attendance||'未记录'))].join('、'):'—')}</td></tr>`))}${rows.length?'':'<div class="empty">暂无课节考勤记录</div>'}</section></div>`;
}

function transferFingerprint(q){return JSON.stringify(q)}
let transferPending=null;
const settlementFinish=finishFlow;
finishFlow=function(type){if(type!=='transfer')return settlementFinish(type);if(!permissionCanVisit('transfer'))return;const q=transferQuote();if(q.error){toast(q.error);return}transferPending=transferFingerprint(q);a.modal='transferConfirm';academicRender()};
const settlementModal=modalPage;
modalPage=function(){if(a.modal==='transferAttendance')return transferAttendanceModal();if(a.modal!=='transferConfirm')return settlementModal();return `<div class="modal-backdrop"><section class="modal"><h2>确认转课结算</h2>${transferQuoteHTML()}<div class="modal-actions"><button class="btn" onclick="a.modal=null;transferPending=null;academicRender()">取消</button><button class="btn primary" onclick="transferCommit()">确认办理</button></div></section></div>`};
function transferCommit(){
 if(!permissionCanVisit('transfer')||state.page!=='transfer'||a.modal!=='transferConfirm')return;
 const q=transferQuote();if(q.error||transferFingerprint(q)!==transferPending){toast(q.error||'收费或班级资料已变化，请重新核对');a.modal=null;transferPending=null;academicRender();return}
 const id='TRANSFER-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),at=new Date().toISOString(),operator=studentExamOperator(),d=transferDraft(),s=q.student;
 const record={id,studentId:s.id,fromClassId:q.from.id,fromClassName:q.from.name,toClassId:q.to.id,toClassName:q.to.name,startSessionId:q.lesson.key,startSession:q.lesson.label,sourceOrderId:q.order.id,sourceDebtCents:q.sourceDebtCents,creditCents:q.creditCents,appliedCents:q.appliedCents,topupCents:q.topupCents,refundCents:0,balanceCreditCents:q.balanceCreditCents,originalCents:q.originalCents,discountCents:q.discountCents,discount:{...q.discount},differenceCents:q.differenceCents,note:d.note,recordedAt:at,operator,status:q.topupCents?'已转班，待补费':q.balanceCreditCents?'已转班，差额已存余额':'已完成'};
 const item={classId:q.to.id,className:q.to.name,course:q.to.course,teacher:q.to.teacher,campus:q.to.campus,academicTerm:studentClassTerm(q.to),format:enrollmentClassInfo(q.to).format,sessionCount:q.price.sessions,startSession:q.startSession,enrollmentStatus:'上课中',tuitionCents:q.originalCents,materialCents:0,discount:{...q.discount},discountCents:q.discountCents,dueCents:q.dueCents,dueTuitionCents:q.dueCents,dueMaterialCents:0,paidCents:q.appliedCents,paidTuitionCents:q.appliedCents,paidMaterialCents:0,transferId:id};
 s.enrollments??=[];const original=s.enrollments.filter(e=>e.classId===q.from.id);if(original.length)original.forEach(e=>{e.enrollmentStatus='已转班';e.transferId=id});else s.enrollments.push({classId:q.from.id,className:q.from.name,course:q.from.course,enrollmentStatus:'已转班',transferId:id});
 q.item.enrollmentStatus='已转班';q.item.transferredCents=q.creditCents;s.enrollments.push(item);s.classNames=[...new Set([...(s.classNames||String(s.className||'').split('、')).filter(n=>n&&n!=='—'&&n!==q.from.name),q.to.name])];s.className=s.classNames.join('、');s.status='在读';q.from.students=Math.max(0,Number(q.from.students||0)-1);q.to.students=Number(q.to.students||0)+1;
 const order={id:id+'-ORDER',studentId:s.id,student:s.name,studentPhone:s.phone,product:q.to.name,items:[item],originalAmount:financeMoney(q.originalCents),discountCents:q.discountCents,amount:financeMoney(q.dueCents),paid:financeMoney(q.appliedCents),status:q.topupCents?'等待付款':'交易成功',createdAt:at,payMode:'转课抵扣',payChannel:'原班学费抵扣',transferId:id,receipts:[],creditCents:q.appliedCents,operator,note:d.note};a.orders.unshift(order);record.targetOrderId=order.id;
 if(q.balanceCreditCents){const before=q.balanceBeforeCents,after=before+q.balanceCreditCents;s.accountBalanceCents=after;const transaction={id:id+'-BALANCE',transferId:id,studentId:s.id,type:'转课差额存余额',amountCents:q.balanceCreditCents,balanceBeforeCents:before,balanceAfterCents:after,recordedAt:at,operator};(a.accountTransactions??=[]).push(transaction);record.balanceTransactionId=transaction.id}

 (a.transferRecords??=[]).push(record);s.history??=[];s.history.push(leadHistoryEntry('转课完成',q.from.name+' → '+q.to.name+'；抵扣 '+financeMoney(q.appliedCents)+'；待补 '+financeMoney(q.topupCents)+'；存余额 '+financeMoney(q.balanceCreditCents)));
 a.modal=null;transferPending=null;a.transferDraft=null;a.selectedStudent=null;academicRender();toast('转课已完成，关联订单和差额处理记录已生成');
}
const settlementRefundDetail=refundDetail;
refundDetail=function(r){return settlementRefundDetail(r).replace(r.transferId?'申请截止课节：未记录截止课节':'__no_match__',r.transferId?'来源：转课差额结算':'__no_match__')};
const settlementRefundDecision=refundDecision;
refundDecision=function(approve){const r=refundCurrent();if(approve&&r?.transferId&&refundConfirmedAmount(r)>r.maximumCents){toast('批准金额不能超过本次转课待退差额');return}return settlementRefundDecision(approve)};

const settlementRefundTask=refundTask;
refundTask=function(r){const html=settlementRefundTask(r);return r.transferId?html.replaceAll('并退班','').replaceAll('，并完成退班',''):html};
function transferRefreshStatuses(){for(const r of a.transferRecords||[]){if(!r.targetOrderId)continue;const order=a.orders.find(o=>o.id===r.targetOrderId),refund=(a.refundApplications||[]).find(x=>x.id===r.refundId);const debt=order?financeAmount(order.amount)-financeAmount(order.paid):null;r.status=debt>0?'已转班，待补费':refund&&refund.step!==6?'已转班，待退费':r.balanceCreditCents?'已转班，差额已存余额':'已完成'}}
const settlementSupplement=supplementSubmit,settlementFinance=refundFinanceComplete;
supplementSubmit=function(){const result=settlementSupplement();transferRefreshStatuses();return result};
refundFinanceComplete=function(){const result=settlementFinance();transferRefreshStatuses();return result};
