const moveRecordFlow=finishFlow;
finishFlow=function(type){
 if(type!=='tempMove')return moveRecordFlow(type);
 if(state.page!=='tempMove'||!permissionCanVisit('tempMove'))return;
 const d=tempMoveDraft(),s=a.students.find(s=>s.id===d.studentId),from=a.classes.find(c=>c.id===d.from.id),to=a.classes.find(c=>c.id===d.to.id),source=tempMoveSessions('from').find(l=>l.key===d.from.session),target=tempMoveSessions('to').find(l=>l.key===d.to.session);
 if(!s||!from||!to||!source||!target){toast('请选择学生、调出和调入班级及对应讲次');return}
 if(!transferActiveClasses(s.id).has(from.id)){toast('学生未在所选调出班级就读');return}
 if(from.id===to.id&&source.key===target.key){toast('不能调入同一班级的同一课节');return}
 if([from,to].some(c=>enrollmentClassInfo(c).format!=='面授')){toast('当前仅支持面授班级临时调班');return}
 if((a.tempMoveRecords||[]).some(r=>r.studentId===s.id&&r.fromClassId===from.id&&r.fromSessionId===source.key&&r.status!=='已取消')){toast('该学生的原课节已经办理临时调班');return}
 if(attendanceLessonRecords(from,source).some(r=>(r.studentId||a.students[r.studentIndex]?.id)===s.id&&['出勤','迟到','早退','未出勤销课'].includes(r.attendance))){toast('原课节已经销课，不能再临时调班');return}
 if(attendanceLessonStudents(to,target).some(e=>e.student.id===s.id)){toast('该学生已经在调入课节名单中');return}
 const guests=(a.tempMoveRecords||[]).filter(r=>r.toClassId===to.id&&r.toSessionId===target.key&&r.status!=='已取消').length;if(Number(to.students||0)+guests>=Number(to.capacity)+Number(to.virtualSeats||0)){toast('调入课节已满员');return}
 const record={id:'MOVE-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),studentId:s.id,studentName:s.name,fromClassId:from.id,fromClassName:from.name,fromSessionId:source.key,fromSession:source.label,toClassId:to.id,toClassName:to.name,toSessionId:target.key,toSession:target.label,note:d.note,recordedAt:new Date().toISOString(),operator:studentExamOperator(),status:'已安排'};
 (a.tempMoveRecords??=[]).push(record);s.history??=[];s.history.push(leadHistoryEntry('临时调班',from.name+' '+source.label+' → '+to.name+' '+target.label));
 a.tempMoveDraft=null;a.selectedStudent=null;academicRender();toast('临时调班已保存，对应课节考勤名单已更新');
};
const moveRecordStudents=attendanceLessonStudents;
attendanceLessonStudents=function(cls,lesson){
 const records=(a.tempMoveRecords||[]).filter(r=>r.status!=='已取消'),out=new Set(records.filter(r=>r.fromClassId===cls.id&&r.fromSessionId===lesson.key).map(r=>r.studentId));
 const rows=moveRecordStudents(cls,lesson).filter(e=>!out.has(e.student.id));
 for(const r of records.filter(r=>r.toClassId===cls.id&&r.toSessionId===lesson.key)){const student=a.students.find(s=>s.id===r.studentId);if(student&&!rows.some(e=>e.student.id===student.id))rows.push({student,record:attendanceLessonRecords(cls,lesson).find(e=>(e.studentId||a.students[e.studentIndex]?.id)===student.id),tempMoveId:r.id})}
 return rows;
};
const moveRecordPage=flowPage;
flowPage=function(type){const html=moveRecordPage(type);if(type!=='tempMove')return html;return html+`<div class="card pad" style="margin-top:20px"><h2 class="section-title">临时调班记录</h2>${aTable(['学生','调出课节','调入课节','办理时间','状态'],(a.tempMoveRecords||[]).slice().reverse().map(r=>`<tr><td>${esc(r.studentName)}</td><td>${esc(r.fromClassName)} · ${esc(r.fromSession)}</td><td>${esc(r.toClassName)} · ${esc(r.toSession)}</td><td>${esc(studentProfileTime(r.recordedAt))}</td><td>${esc(r.status)}</td></tr>`))}${(a.tempMoveRecords||[]).length?'':'<div class="empty">暂无临时调班记录</div>'}</div>`};

// A moved lesson consumes the original purchased lesson, while attendance stays at the actual class.
function businessAttendanceRecords(){return [...a.attendance,...(a.lessonConsumptionRecords||[])].map(r=>r.billingClassId?{...r,classId:r.billingClassId,sessionId:r.billingSessionId,session:r.billingSession}:r)}
function businessStampAttendance(record){
 const move=(a.tempMoveRecords||[]).find(m=>m.status!=='已取消'&&m.studentId===record.studentId&&m.toClassId===record.classId&&m.toSessionId===record.sessionId);
 if(move)Object.assign(record,{tempMoveId:move.id,billingClassId:move.fromClassId,billingSessionId:move.fromSessionId,billingSession:move.fromSession});
 const classId=record.billingClassId||record.classId,number=Number(String(record.billingSession||record.session).match(/\d+/)?.[0]),matches=a.orders.filter(o=>o.studentId===record.studentId&&!['已取消','已关闭','交易关闭'].includes(o.status)).flatMap(o=>(o.items||[]).filter(i=>i.classId===classId));
 if(['出勤','迟到','早退','未出勤销课'].includes(record.attendance)&&matches.length===1){const item=matches[0],count=item.sessionCount-item.startSession+1,paid=item.paidTuitionCents;if(Number.isSafeInteger(paid)&&count>0&&number>=item.startSession&&number<=item.sessionCount){const n=number-item.startSession;record.consumptionCents=Math.round(paid*(n+1)/count)-Math.round(paid*n/count)}}
 if(record.makeupResolution)Object.assign(record.makeupResolution,{tempMoveId:record.tempMoveId,billingClassId:record.billingClassId,billingSessionId:record.billingSessionId,billingSession:record.billingSession,consumptionCents:record.consumptionCents});
 if(move)move.status=['出勤','迟到','早退','未出勤销课'].includes(record.attendance)?'已上课':'已安排';
}
const businessSaveAttendance=attendanceSaveLesson;
attendanceSaveLesson=function(){const context=attendanceLessonContext(),result=businessSaveAttendance();if(context&&a.modal!=='attendanceLesson')for(const r of attendanceLessonRecords(context.cls,context.lesson))businessStampAttendance(r);return result};
const businessMakeupResolution=makeupCommitResolution;
makeupCommitResolution=function(source,...args){const result=businessMakeupResolution(source,...args);if(result)businessStampAttendance(source.record);return result};
