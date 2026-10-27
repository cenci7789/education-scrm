// Replace only the three untouched, incomplete legacy demo orders. Never rewrite user-created orders.
function demoUpgradeLedger(){
 const definitions=[['COMB117268540979','12562728','5683440',100000],['COMB117268521922','12562704','5683393',40000],['COMB117268237024','12065996','5683391',100000]];
 for(const [id,studentId,classId,paid] of definitions){
  const order=a.orders.find(o=>o.id===id);if(!order||order.demoLedgerVersion||order.receipts?.length||order.items?.some(i=>Number.isSafeInteger(i.dueCents)))continue;
  const student=a.students.find(s=>s.id===studentId),cls=a.classes.find(c=>c.id===classId),course=cls&&a.courses.find(c=>c.name===cls.course);if(!student||!cls||!course)continue;
  // Explicit illustrative charges, not a claim about any historical real payment.
  const due=100000,total=10,createdAt='2026-09-01T09:00:00+08:00',operator={name:'演示数据初始化',account:'demo'};
  const item={classId,className:cls.name,course:cls.course,campus:cls.campus,teacher:cls.teacher,academicTerm:studentClassTerm(cls),enrollmentStatus:'上课中',signupType:'新签',sessionCount:total,startSession:1,tuitionCents:due,materialCents:0,discountCents:0,dueCents:due,dueTuitionCents:due,dueMaterialCents:0,paidCents:paid,paidTuitionCents:paid,paidMaterialCents:0};
  Object.assign(order,{studentId,student:student.name,studentPhone:student.phone,product:cls.name,items:[item],amount:financeMoney(due),originalAmount:financeMoney(due),paid:financeMoney(paid),status:paid===due?'交易成功':'等待付款',createdAt,operator,receipts:[{channel:'现金',amountCents:paid,recordedAt:createdAt,operator,reference:id+'-DEMO'}],payChannel:'现金',payMode:'线下收款',demo:true,note:'完整演示数据：学费1000元，10讲；演示实收'+financeMoney(paid)+'，不代表真实收款。',demoLedgerVersion:1});
  student.enrollments??=[];if(!student.enrollments.some(e=>e.classId===classId))student.enrollments.push({...item});student.status='在读';student.classNames??=[cls.name];
  if(!Array.isArray(cls.sessions)){const start=new Date(cls.date+'T00:00:00'),time=cls.time;cls.sessions=Array.from({length:total},(_,i)=>{const date=new Date(start);date.setDate(date.getDate()+7*i);return {id:'DEMO-'+classId+'-'+(i+1),name:'第'+(i+1)+'讲',number:i+1,date:date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0'),time,teacher:cls.teacher,room:cls.room}})}
  for(const record of a.attendance.filter(r=>r.studentId===studentId&&r.classId===classId)){const n=Number(String(record.session).match(/\d+/)?.[0])||1,lesson=cls.sessions[n-1];if(lesson)Object.assign(record,{sessionId:lesson.id,date:lesson.date,time:lesson.time});if(['出勤','迟到','早退','未出勤销课'].includes(record.attendance))record.consumptionCents=Math.round(paid/total)}
  cls.students=classDetailStudentRows(cls).filter(s=>s.kind==='在班学生').length;
 }
}
demoUpgradeLedger();
