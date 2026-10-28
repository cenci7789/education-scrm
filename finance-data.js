// 财务页面只读取业务单据；缺失来源或金额时明确显示，不制造收费明细。
function financeStudent(id,name){return a.students.find(s=>s.id===id)||(!id&&a.students.filter(s=>s.name===name).length===1?a.students.find(s=>s.name===name):null)}
function financeMoney(cents){return Number.isSafeInteger(cents)?withdrawMoney(cents):'待核对'}
function financeAmount(value){return enrollmentAmountCents(String(value??'').replace(/[¥￥,\s]/g,''))}
function financeRefundRows(){
 const done=a.refundRecords||[],applications=a.refundApplications||[];
 const rows=applications.map(r=>{const settled=done.find(d=>d.applicationId===r.id);return {id:r.id,studentId:r.studentId,student:r.studentName,type:r.transferId?'转课差额退费':'退课 / 退班',from:r.className,to:'—',amount:settled?.amountCents??r.approvedCents??r.amountCents,time:settled?.recordedAt||r.createdAt,status:settled?.status||r.closed||refundSteps[r.step]||'待核对',refundId:r.id,source:'退费申请'}});
 for(const r of done)if(!applications.some(x=>x.id===r.applicationId))rows.push({id:r.id,studentId:r.studentId,student:financeStudent(r.studentId)?.name||'学生未关联',type:'退费',from:r.className,to:'—',amount:r.amountCents,time:r.recordedAt,status:r.status,source:'历史退费记录'});
 for(const [i,r] of (a.transferRecords||[]).entries())rows.push({id:r.id||'历史转课-'+(i+1),studentId:r.studentId,student:financeStudent(r.studentId)?.name||'学生未关联',type:'转课 / 转班',from:r.fromClassName,to:r.toClassName,amount:r.appliedCents??r.creditCents??null,time:r.recordedAt,status:r.status,source:'转课记录（金额为抵扣学费）'});
 return rows.sort((x,y)=>String(y.time).localeCompare(String(x.time)));
}
financeRefundsPage=function(){const rows=financeRefundRows();return heading('退转记录','同步退费申请、财务退款及转课结算，金额以原始业务记录为准')+`<div class="card pad">${aTable(['业务单号','学生','业务类型','原课程 / 班级','目标课程 / 班级','金额','办理时间','状态','数据来源'],rows.map(r=>`<tr><td>${esc(r.id)}</td><td>${esc(r.student)}</td><td>${esc(r.type)}</td><td>${esc(r.from)}</td><td>${esc(r.to)}</td><td>${financeMoney(r.amount)}</td><td>${esc(studentProfileTime(r.time))}</td><td>${esc(r.status)}</td><td>${esc(r.source)}${r.refundId&&permissionCanVisit('withdraw')?`<br><button class="btn small" onclick="financeOpenRefund('${encodeURIComponent(r.refundId)}')">查看申请</button>`:''}</td></tr>`))}${!rows.length?'<div class="empty">暂无退费或转课业务记录</div>':''}<div class="data-bar">共 ${rows.length} 条业务记录</div></div>`};
function financeOpenRefund(id){if(!permissionCanVisit('withdraw'))return;state.page='withdraw';refundOpen(decodeURIComponent(id));render()}
function financeConsumptionRows(){
 const entries=new Map();
 for(const r of (typeof businessAttendanceRecords==='function'?businessAttendanceRecords():[...a.attendance,...(a.lessonConsumptionRecords||[])] )){
  const student=financeStudent(r.studentId)||(!r.studentId?a.students[r.studentIndex]:null),cls=a.classes.find(c=>c.id===r.classId)||(!r.classId?a.classes[r.classIndex]:null);
  const key=JSON.stringify([r.studentId||student?.id,r.classId||cls?.id,r.sessionId||r.session,r.date,attendanceTimeKey(r.time)]);
  if(!['出勤','迟到','早退','未出勤销课'].includes(r.attendance)){entries.delete(key);continue}
  if(r.status&&r.status!=='已考勤')continue;
  entries.set(key,{student:student?.name||r.studentName||'学生未关联',className:cls?.name||r.className||'班级未关联',session:r.session,time:r.recordedAt||[r.date,r.time].filter(Boolean).join(' '),units:r.units??1,amount:r.consumptionCents??r.amountCents??null,status:r.attendance,source:r.sourceKey?'销课台账':'课节考勤'});
 }
 return [...entries.values()];
}
financeConsumptionPage=function(){const rows=financeConsumptionRows();return heading('课消记录','统一汇总正常考勤、补课考勤和未出勤销课记录')+`<div class="card pad"><p class="help">课消数量来自实际考勤或销课台账；历史记录未保存课消金额时显示“待核对”，不按当前课程价格回算。</p>${aTable(['学生','课程 / 班级','讲次','课消时间','课消数量','课消金额','状态','数据来源'],rows.map(r=>`<tr><td>${esc(r.student)}</td><td>${esc(r.className)}</td><td>${esc(r.session)}</td><td>${esc(r.time)}</td><td>${esc(r.units)}</td><td>${financeMoney(r.amount)}</td><td>${esc(r.status)}</td><td>${esc(r.source)}</td></tr>`))}${!rows.length?'<div class="empty">暂无已确认课消记录</div>':''}<div class="data-bar">共 ${rows.length} 条，${rows.reduce((n,r)=>n+Number(r.units||0),0)} 次</div></div>`};
function financeArrearsRows(){return a.orders.filter(o=>!['已取消','已关闭','交易关闭'].includes(o.status)).flatMap(o=>{const due=financeAmount(o.amount),paid=financeAmount(o.paid);return due!==null&&paid!==null&&due>paid?[{order:o,due,paid,debt:due-paid}]:[]})}
financeArrearsPage=function(){const rows=financeArrearsRows();return heading('欠费记录','与收费订单及补费记录同步')+`<div class="structure-summary"><div class="card"><strong>${rows.length}</strong><span>欠费订单</span></div><div class="card"><strong>${financeMoney(rows.reduce((n,r)=>n+r.debt,0))}</strong><span>待收金额</span></div></div><div class="card pad">${aTable(['订单编号','学生','课程','订单金额','已收金额','待收金额','订单状态','数据关联'],rows.map(({order:o,due,paid,debt})=>`<tr><td>${esc(o.id)}</td><td>${esc(o.student)}</td><td>${esc(o.product)}</td><td>${financeMoney(due)}</td><td>${financeMoney(paid)}</td><td>${financeMoney(debt)}</td><td>${esc(o.status)}</td><td>${o.studentId&&o.items?.length?'已关联报名明细':'历史记录缺少学生ID或班级收费明细'}</td></tr>`))}<div class="data-bar">共 ${rows.length} 条欠费订单</div></div>`};
// 旧演示考勤使用数组位置关联；在新增学生/班级前固化身份，避免 unshift 导致串人。
function financeNormalizeLegacyLinks(){for(const r of a.attendance){if(!r.studentId&&a.students[r.studentIndex])r.studentId=a.students[r.studentIndex].id;if(!r.classId&&a.classes[r.classIndex])r.classId=a.classes[r.classIndex].id}}
financeNormalizeLegacyLinks();
