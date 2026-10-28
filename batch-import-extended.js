Object.assign(batchImportSchemas,{
 course:{title:'导入课程',headers:['课程名称','授课形式','年份','学期','学科','年级','班型','课程费','讲次名称']},
 class:{title:'批量建班',headers:['班级名称','课程名称','校区','教室','授课老师','教务账号','虚设座位','课节日期','开始时间','结束时间']},
 lead:{title:'批量导入线索',headers:['学生姓名','联系电话','就读年级','性别','招生家长','意向学科','来源渠道','分配方式','招生账号','学校学段','学校名称','入学年份','备注']}
});
function batchLeadSchema(){
  const schema=batchImportSchemas.lead;
  return leadNonSalesEntry()?{...schema,title:'批量线索登记（非招生）',headers:['学生姓名','联系电话','归属校区',...schema.headers.slice(2).filter(h=>!['分配方式','招生账号'].includes(h))]}:schema;
}
const batchExtendedAllowed=batchImportAllowed;
batchImportAllowed=function(kind){return kind==='course'?permissionCanVisit('course'):kind==='class'?permissionCanVisit('classes'):kind==='lead'?permissionCanVisit('quickRegister'):batchExtendedAllowed(kind)};
function batchExtendedPlan(kind,r,row,seen,plans){
 const fail=message=>{throw Error(message)};
 if(kind==='course'){
  if(!r.课程名称||seen.has(r.课程名称)||a.courses.some(c=>c.name===r.课程名称))fail('课程名称为空或重复');
  if(r.班型&&!courseConfiguredClassTypes().includes(r.班型))fail('班型须填写教学配置中的已启用名称，或留空');
  const fee=enrollmentAmountCents(r.课程费),names=r.讲次名称.split('|');if(!['面授','直播'].includes(r.授课形式)||!/^20\d{2}$/.test(r.年份)||!r.学期||!r.学科||!r.年级||fee===null||!names.length||names.length>500||names.some(n=>!n||n.length>100))fail('请核对授课形式、年份、学期、学科、年级、金额及讲次名称（多个用 | 分隔）');seen.add(r.课程名称);
  return {kind,row,summary:r.课程名称+' / '+names.length+'讲 / '+financeMoney(fee),data:{name:r.课程名称,courseCategory:'班课',teachingFormat:r.授课形式,year:r.年份,term:r.学期,subject:r.学科,grade:r.年级,classType:r.班型,fee:fee/100,materialFee:0,totalSessions:names.length,sessions:names.map(name=>({name})),active:true}};
 }
 if(kind==='class'){
  const course=a.courses.find(c=>c.name===r.课程名称&&c.active),campus=state.campuses.find(c=>c.name===r.校区&&c.active),room=campus?.classrooms.find(c=>c.name===r.教室),staff=classAcademicTeacherStaff().filter(s=>s.active&&(s.account||s.phone)===r.教务账号);
  if(!r.班级名称||seen.has(r.班级名称)||a.classes.some(c=>c.name===r.班级名称))fail('班级名称为空或重复');if(!course||!campus||!room||staff.length!==1||!r.授课老师||!state.staff.filter(s=>s.active).map(s=>s.name).includes(r.授课老师))fail('请选择已启用课程、校区、教室、授课老师和唯一教务账号');
  const dates=r.课节日期.split('|'),starts=r.开始时间.split('|'),ends=r.结束时间.split('|'),count=course.sessions?.length||course.totalSessions;if(!count||dates.length!==count||starts.length!==count||ends.length!==count||!/^\d+$/.test(r.虚设座位)||!Number.isSafeInteger(Number(r.虚设座位)))fail('课节日期/开始/结束时间须分别填写全部讲次，用 | 分隔；虚设座位须为非负整数');
  const sessions=dates.map((date,i)=>{if(!classScheduleDate(date)||!classScheduleSlotValid({start:starts[i],end:ends[i]}))fail('第'+(i+1)+'讲日期或时段无效');return {name:course.sessions?.[i]?.name||'第'+(i+1)+'讲',courseSessionId:course.sessions?.[i]?.id||'',number:i+1,date,start:starts[i],end:ends[i],time:starts[i]+'–'+ends[i],startsAt:date+'T'+starts[i],endsAt:date+'T'+ends[i]}});
  for(const [i,s] of sessions.entries()){if(i&&s.startsAt<sessions[i-1].endsAt)fail('讲次须按时间排序且不能重叠');for(const c of [...a.classes,...plans.filter(p=>p.kind==='class').map(p=>p.data)]){if(c.teacher!==r.授课老师&&!(c.campus===r.校区&&c.room===r.教室))continue;if(classDetailSessions(c).some(l=>{const time=attendanceTimeKey(l.time).split('-');return l.date===s.date&&time[0]<s.end&&s.start<time[1]}))fail('课节与班级“'+c.name+'”的老师或教室冲突')}}
  seen.add(r.班级名称);return {kind,row,summary:r.班级名称+' / '+r.课程名称+' / '+sessions.length+'讲',data:{name:r.班级名称,course:course.name,campus:campus.name,room:room.name,capacity:Number(room.capacity),teacher:r.授课老师,academicTeacherId:staff[0].classTeacherId,academicTeacher:staff[0].name,virtualSeats:Number(r.虚设座位),students:0,status:'未开课',date:sessions[0].date,time:sessions[0].time,sessions}};
 }
  const grade=leadConfiguredGrade(r.就读年级);
  if(!r.学生姓名||!/^1\d{10}$/.test(r.联系电话)||!grade)fail('请填写学生姓名、11位电话和教学配置中已启用的年级');
 const key=r.学生姓名+'|'+r.联系电话;if(seen.has(key)||leadState.leads.some(l=>l.name===r.学生姓名&&l.phone===r.联系电话))fail('姓名和电话与已有线索或本批记录重复');
 if(r.性别&&!['男','女'].includes(r.性别)||r.招生家长&&!['妈妈','爸爸','其他'].includes(r.招生家长))fail('请核对性别及招生家长');
 const nonSales=leadNonSalesEntry();
 if(nonSales&&!state.campuses.some(c=>c.active&&c.name===r.归属校区))fail('归属校区必填，须填写已启用的校区名称');
 if(!nonSales&&!['我自己','统一分配','指定招生岗'].includes(r.分配方式))fail('分配方式须为我自己、统一分配或指定招生岗');
 const accounts=(r.招生账号||'').split('|').filter(Boolean),people=nonSales?[]:r.分配方式==='指定招生岗'?accounts.map(account=>{const matches=leadEligibleStaff().filter(s=>(s.account||s.phone)===account);if(matches.length!==1)fail('招生账号不存在、不唯一或无招生权限');return leadStaffIdentity(matches[0])}):r.分配方式==='我自己'?[leadCurrentOperator()]:[];
 if(!nonSales&&r.分配方式==='指定招生岗'&&(!accounts.length||new Set(accounts).size!==accounts.length))fail('请填写不重复的招生账号，多个用 | 分隔');
 if(r.学校学段&&!['小学','初中','高中'].includes(r.学校学段)||r.入学年份&&!/^20\d{2}$/.test(r.入学年份))fail('请核对学校学段和四位入学年份');seen.add(key);
  return {kind,row,people,summary:r.学生姓名+' / '+r.联系电话+' / '+(nonSales?r.归属校区+'招生组长待分配':r.分配方式),data:{...(nonSales?{ownershipCampus:r.归属校区,registrationChannel:'nonSales',assignmentQueue:{campus:r.归属校区,role:'校区招生组长'}}:{}),name:r.学生姓名,phone:r.联系电话,grade,gender:r.性别,guardian:r.招生家长||'妈妈',campus:'待定',subject:r.意向学科.replaceAll('|','、')||'待定',source:r.来源渠道||'主动来电',schools:r.学校名称?[{stage:r.学校学段,name:r.学校名称,entryYear:r.入学年份}]:[],school:r.学校名称,note:r.备注}};
}
function batchExtendedCommit(p,batchId,index,at,operator){
 const id=batchId+'-'+index;
 if(p.kind==='course'){a.courses.push({...p.data,id,sessions:p.data.sessions.map((s,i)=>({...s,id:id+'-SESSION-'+i,number:i+1})),importBatchId:batchId});return}
  if(p.kind==='class'){a.classes.push({...p.data,id,status:classScheduleStatus(p.data),sessions:p.data.sessions.map((s,i)=>({...s,id:id+'-SESSION-'+i})),importBatchId:batchId});return}
 const lead={...p.data,leadId:id,createdAt:at,followupCycleAt:at,registrar:leadCurrentOperator().name,registrarAccount:leadCurrentOperator().account,registrarStaffId:leadCurrentOperator().staffId,stage:'新线索',intent:'',next:'未约定',history:[],importBatchId:batchId};leadSetOwners(lead,p.people);lead.history.push(leadHistoryEntry('建档',leadRegistrationBody(lead,p.people.length?p.people.map(leadIdentityLabel).join('、'):'统一分配'),{importBatchId:batchId}));leadState.leads.unshift(lead);
}
const batchCoursePage=coursePage,batchClassesPage=classesPage,batchLeadOpen=leadOpenForm,batchLeadTab=leadSwitchRegistration;
coursePage=function(){return batchCoursePage().replace("toast('课程导入规则待确认')","batchImportOpen('course')")};
classesPage=function(){return batchClassesPage().replace("toast('批量建班规则待确认')","batchImportOpen('class')").replace("toast('导出为原型展示')",'batchExportClasses()')};
leadOpenForm=function(mode='create',tab='single'){if(tab==='import'){batchImportOpen('lead');return}return batchLeadOpen(mode,tab)};
leadSwitchRegistration=function(tab){if(tab==='import'){batchImportOpen('lead');return}return batchLeadTab(tab)};
function batchExportClasses(){if(!permissionCanVisit('classes'))return;auditDownloadCSV('班级列表.csv',[['班级ID','班级名称','课程','校区','授课老师','教务老师','教室','人数','容量'],...classManagementFiltered().map(c=>[c.id,c.name,c.course,c.campus,c.teacher,classAcademicTeacherLabel(c),c.room,c.students,c.capacity])])}
const batchOriginalShow=batchImportShow;
batchImportShow=function(){batchOriginalShow();if(!['course','class','lead'].includes(batchImportState.kind))return;const host=document.getElementById('batch-import-host'),help=host?.querySelectorAll('.help')?.[1];if(help)help.textContent={course:'每行一门课程，讲次名称用 | 分隔。课程费仅包含学费。',class:'每行一个班级。全部讲次的日期、开始时间、结束时间各自用 | 分隔，按讲次顺序填写。自动检查老师和教室冲突。教务账号填写员工账号或手机号。',lead:(leadNonSalesEntry()?'归属校区必填，按归属校区交由管理员等待分配。同名同电话重复时不导入。':'每行一条线索。同名同电话重复时不导入；指定招生岗须填写系统内在职且有招生权限的账号。多个意向学科、招生账号用 | 分隔。就读年级填写教学配置中的已启用名称：'+(leadConfiguredGradeNames().join('、')||'暂无，请先配置年级')+'。')}[batchImportState.kind]};
