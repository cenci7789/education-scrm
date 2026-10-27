function transferActiveClasses(studentId){return new Set(studentTermEnrollments().filter(r=>r.studentId===studentId&&!['已退班','已退费','已取消','已转班','已结课'].includes(r.status)).map(r=>r.classId))}
const settlementMatches=tempMoveMatches;
tempMoveMatches=function(side){const rows=settlementMatches(side);if(!['transfer','tempMove'].includes(state.page)||side!=='from')return rows;const id=a.students[a.selectedStudent]?.id;return rows.filter(c=>transferActiveClasses(id).has(c.id))};
function transferQuote(){
 const d=transferDraft(),student=a.students.find(s=>s.id===d.studentId),from=a.classes.find(c=>c.id===d.from.id),to=a.classes.find(c=>c.id===d.to.id),error=message=>({error:message});
 if(!student||!from||!to)return error('请选择学生、已报名的转出班级和转入班级');
 if(from.id===to.id)return error('转入班级不能与转出班级相同');
 if(!transferActiveClasses(student.id).has(from.id))return error('学生未在所选转出班级就读');
 if(transferActiveClasses(student.id).has(to.id))return error('学生已在所选转入班级就读');
 if([from,to].some(c=>enrollmentClassInfo(c).format==='直播'))return error('直播课程暂不支持转课');
 if((a.refundApplications||[]).some(r=>r.studentId===student.id&&r.classId===from.id&&!r.closed&&r.step<6))return error('原班有办理中的退费申请，请先处理');
 if(Number(to.students)>=Number(to.capacity)+Number(to.virtualSeats||0))return error('转入班级已满员');
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
 const lesson=tempMoveSessions('to').find(s=>s.key===d.to.session);if(!lesson)return error('请选择转入班级的进入讲次');
 const number=lesson.number||lesson.position+1,price=enrollmentClassPrice({class:to,startSession:number});if(!price)return error('转入课程价格或讲次不完整');
  return {student,from,to,order,item,lesson,startSession:number,price,paid,sourceDebtCents:item.dueCents-paid,used:consumed.size,purchased,remaining,creditCents:credit,dueCents:price.tuitionCents,appliedCents:Math.min(credit,price.tuitionCents),topupCents:Math.max(0,price.tuitionCents-credit),refundCents:Math.max(0,credit-price.tuitionCents)};
}
function transferQuoteHTML(){const q=transferQuote();if(q.error)return `<p class="help" role="status">${esc(q.error)}</p>`;return `<div class="summary-box">${[['原班实缴学费',financeMoney(q.paid)],['原班欠费（保留在原订单）',financeMoney(q.sourceDebtCents)],['已消耗 / 已报讲次',q.used+' / '+q.purchased],['可转学费',financeMoney(q.creditCents)],['新班应收学费',financeMoney(q.dueCents)],['本次抵扣',financeMoney(q.appliedCents)],['待补费用',financeMoney(q.topupCents)],['待退差额',financeMoney(q.refundCents)]].map(([k,v])=>`<div class="summary-line"><span>${k}</span><strong>${v}</strong></div>`).join('')}</div>`}
function transferRefreshQuote(){const el=$('#transfer-quote');if(el)el.innerHTML=transferQuoteHTML()}
const settlementChoose=tempMoveChoose,settlementSearch=tempMoveSearch,settlementSession=tempMoveSessionSelect;
tempMoveChoose=function(side,index){const result=settlementChoose(side,index);if(state.page==='transfer')transferRefreshQuote();return result};
tempMoveSearch=function(side,value){const result=settlementSearch(side,value);if(state.page==='transfer')transferRefreshQuote();return result};
tempMoveSessionSelect=function(side){return settlementSession(side).replace('session=this.value"','session=this.value;'+(state.page==='transfer'?'transferRefreshQuote()':'')+'"')};
const settlementFlowPage=flowPage;
flowPage=function(type){if(type!=='transfer')return settlementFlowPage(type);const d=transferDraft(),s=a.students[a.selectedStudent];return aHeading('学生转课／班','原班未消耗的实缴学费抵扣新班学费，差额补收或退费')+`<div class="card pad"><div class="toolbar"><button class="btn primary" onclick="a.modal='selectStudent';academicRender()">${s?'重新选择学生':'选择学生'}</button>${s?`<strong>${esc(s.name)} · ${esc(s.phone)}</strong>`:''}</div><div class="flow-layout">${['from','to'].map(side=>`<section class="flow-card"><h2 class="section-title">${side==='from'?'转出':'转入'}信息</h2>${aField('课程 / 班级',tempMovePicker(side),true)}<div id="temp-move-session-${side}" ${side==='from'?'hidden':''}>${tempMoveSessionSelect(side)}</div></section>`).join('<div class="flow-arrow">→</div>')}</div><div id="transfer-quote">${transferQuoteHTML()}</div><p class="help">确认后更新班级归属，并生成关联收费订单；应补金额进入补费，应退差额进入退费审批，不直接执行对外付款。</p><label>备注<textarea class="textarea" maxlength="50" oninput="transferDraft().note=this.value">${esc(d.note)}</textarea></label><div class="form-actions"><button class="btn" onclick="transferCancel()">取消</button><button class="btn primary" onclick="finishFlow('transfer')">确认转课</button></div></div>`};
function transferFingerprint(q){return JSON.stringify(q)}
let transferPending=null;
const settlementFinish=finishFlow;
finishFlow=function(type){if(type!=='transfer')return settlementFinish(type);if(!permissionCanVisit('transfer'))return;const q=transferQuote();if(q.error){toast(q.error);return}transferPending=transferFingerprint(q);a.modal='transferConfirm';academicRender()};
const settlementModal=modalPage;
modalPage=function(){if(a.modal!=='transferConfirm')return settlementModal();return `<div class="modal-backdrop"><section class="modal"><h2>确认转课结算</h2>${transferQuoteHTML()}<div class="modal-actions"><button class="btn" onclick="a.modal=null;transferPending=null;academicRender()">取消</button><button class="btn primary" onclick="transferCommit()">确认办理</button></div></section></div>`};
function transferCommit(){
 if(!permissionCanVisit('transfer')||state.page!=='transfer'||a.modal!=='transferConfirm')return;
 const q=transferQuote();if(q.error||transferFingerprint(q)!==transferPending){toast(q.error||'收费或班级资料已变化，请重新核对');a.modal=null;transferPending=null;academicRender();return}
 const id='TRANSFER-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),at=new Date().toISOString(),operator=studentExamOperator(),d=transferDraft(),s=q.student;
 const record={id,studentId:s.id,fromClassId:q.from.id,fromClassName:q.from.name,toClassId:q.to.id,toClassName:q.to.name,startSessionId:q.lesson.key,startSession:q.lesson.label,sourceOrderId:q.order.id,sourceDebtCents:q.sourceDebtCents,creditCents:q.creditCents,appliedCents:q.appliedCents,topupCents:q.topupCents,refundCents:q.refundCents,note:d.note,recordedAt:at,operator,status:q.topupCents?'已转班，待补费':q.refundCents?'已转班，待退费':'已完成'};
 const item={classId:q.to.id,className:q.to.name,course:q.to.course,teacher:q.to.teacher,campus:q.to.campus,academicTerm:studentClassTerm(q.to),format:enrollmentClassInfo(q.to).format,sessionCount:q.price.sessions,startSession:q.startSession,enrollmentStatus:'上课中',tuitionCents:q.dueCents,materialCents:0,discountCents:0,dueCents:q.dueCents,dueTuitionCents:q.dueCents,dueMaterialCents:0,paidCents:q.appliedCents,paidTuitionCents:q.appliedCents,paidMaterialCents:0,transferId:id};
 s.enrollments??=[];const original=s.enrollments.filter(e=>e.classId===q.from.id);if(original.length)original.forEach(e=>{e.enrollmentStatus='已转班';e.transferId=id});else s.enrollments.push({classId:q.from.id,className:q.from.name,course:q.from.course,enrollmentStatus:'已转班',transferId:id});
 q.item.enrollmentStatus='已转班';q.item.transferredCents=q.creditCents;s.enrollments.push(item);s.classNames=[...new Set([...(s.classNames||String(s.className||'').split('、')).filter(n=>n&&n!=='—'&&n!==q.from.name),q.to.name])];s.className=s.classNames.join('、');s.status='在读';q.from.students=Math.max(0,Number(q.from.students||0)-1);q.to.students=Number(q.to.students||0)+1;
 const order={id:id+'-ORDER',studentId:s.id,student:s.name,studentPhone:s.phone,product:q.to.name,items:[item],amount:financeMoney(q.dueCents),paid:financeMoney(q.appliedCents),status:q.topupCents?'等待付款':'交易成功',createdAt:at,payMode:'转课抵扣',payChannel:'原班学费抵扣',transferId:id,receipts:[],creditCents:q.appliedCents,operator,note:d.note};a.orders.unshift(order);record.targetOrderId=order.id;
 if(q.refundCents){const r={id:id+'-REFUND',transferId:id,studentId:s.id,studentName:s.name,classId:q.from.id,className:q.from.name,course:q.from.course,reason:'转课差额退费：'+q.from.name+' → '+q.to.name,amountCents:q.refundCents,requestedAmountCents:q.refundCents,maximumCents:q.refundCents,fees:{original:q.paid,discount:0,paid:q.paid,unit:q.paid/q.purchased,used:q.used,remaining:q.remaining,remainingFee:q.refundCents},step:1,createdAt:at,calls:[],audit:[],revision:0};refundAudit(r,'转课生成差额退费申请',financeMoney(q.refundCents));refundParentRecord(r);a.refundApplications.push(r);record.refundId=r.id}
 (a.transferRecords??=[]).push(record);s.history??=[];s.history.push(leadHistoryEntry('转课完成',q.from.name+' → '+q.to.name+'；抵扣 '+financeMoney(q.appliedCents)+'；待补 '+financeMoney(q.topupCents)+'；待退 '+financeMoney(q.refundCents)));
 a.modal=null;transferPending=null;a.transferDraft=null;a.selectedStudent=null;academicRender();toast('转课已完成，关联订单和差额处理记录已生成');
}
const settlementRefundDetail=refundDetail;
refundDetail=function(r){return settlementRefundDetail(r).replace(r.transferId?'申请截止课节：未记录截止课节':'__no_match__',r.transferId?'来源：转课差额结算':'__no_match__')};
const settlementRefundDecision=refundDecision;
refundDecision=function(approve){const r=refundCurrent();if(approve&&r?.transferId&&refundConfirmedAmount(r)>r.maximumCents){toast('批准金额不能超过本次转课待退差额');return}return settlementRefundDecision(approve)};

const settlementRefundTask=refundTask;
refundTask=function(r){const html=settlementRefundTask(r);return r.transferId?html.replaceAll('并退班','').replaceAll('，并完成退班',''):html};
function transferRefreshStatuses(){for(const r of a.transferRecords||[]){if(!r.targetOrderId)continue;const order=a.orders.find(o=>o.id===r.targetOrderId),refund=(a.refundApplications||[]).find(x=>x.id===r.refundId);const debt=order?financeAmount(order.amount)-financeAmount(order.paid):null;r.status=debt>0?'已转班，待补费':refund&&refund.step!==6?'已转班，待退费':'已完成'}}
const settlementSupplement=supplementSubmit,settlementFinance=refundFinanceComplete;
supplementSubmit=function(){const result=settlementSupplement();transferRefreshStatuses();return result};
refundFinanceComplete=function(){const result=settlementFinance();transferRefreshStatuses();return result};
