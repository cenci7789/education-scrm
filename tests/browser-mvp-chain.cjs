const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  // 独立浏览器上下文，只写测试沙箱的 IndexedDB，不连接用户正在使用的浏览器。
  const context=await browser.newContext({viewport:{width:1600,height:1100},timezoneId:'Asia/Shanghai'}),page=await context.newPage(),errors=[];
  page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.clock.setFixedTime(new Date('2026-10-26T12:00:00+08:00'));
  await page.goto(require('node:url').pathToFileURL(path.resolve(__dirname,'../index.html')).href);
  const ready=()=>page.waitForFunction(()=>businessStorage.ready&&!businessStorage.busy);
  const go=route=>page.evaluate(route=>{state.page=route;state.mode='list';render()},route);
  await ready();
  const grade=await page.evaluate(()=>{
   const grade=leadConfiguredGradeNames()[2];
   state.campuses=[{name:'验收校区',active:true,rooms:1,seats:20,classrooms:[{name:'教室一',capacity:20}]}];
   state.staff=[{name:'验收教师',account:'test-teacher',phone:'13877770001',roleId:'teacher',classTeacherId:'T',active:true},{name:'验收教务',account:'test-advisor',phone:'13877770002',roleId:'academic',classTeacherId:'A',active:true}];
   a.courses=[{id:'COURSE-OLD',name:'验收秋季数学',year:2026,term:'秋季',grade,subject:'数学',classType:'S班',active:true,fee:1000,sessions:[{id:'C1',name:'基础模型'},{id:'C2',name:'进阶模型'}]},
    {id:'COURSE-NEW',name:'验收春季数学',year:2027,term:'春季',grade,subject:'数学',classType:'S班',active:true,fee:1200,sessions:[{id:'D1',name:'春季第一讲'},{id:'D2',name:'春季第二讲'}]}];
   a.classes=a.courses.map((c,i)=>({id:i?'CLASS-NEW':'CLASS-OLD',name:c.name+'班',course:c.name,teacher:'验收教师',academicTeacherId:'A',academicTeacher:'验收教务',campus:'验收校区',room:'教室一',students:0,capacity:20,virtualSeats:0,date:i?'2027-03-06':'2026-10-31',time:'08:00–10:00',sessions:c.sessions.map((s,j)=>{const date=(i?['2027-03-06','2027-03-13']:['2026-10-31','2026-11-07'])[j];return {id:(i?'NEW-':'OLD-')+j,number:j+1,name:s.name,date,time:'08:00–10:00',startsAt:date+'T08:00',endsAt:date+'T10:00'}})}));
   state.page='quickRegister';render();return grade;
  });
  console.log('Browser MVP: register lead');
  await page.getByRole('button',{name:'+ 单个登记',exact:true}).click();
  await page.locator('#lead-name').fill('MVP验收学生');await page.locator('#lead-phone').fill('13888881111');await page.locator('#lead-grade').selectOption(grade);await page.locator('#lead-campus').selectOption('验收校区');await page.getByRole('button',{name:'保存登记',exact:true}).click();
  await go('myLeads');await page.getByRole('button',{name:'详情',exact:true}).click();
  console.log('Browser MVP: trial appointment and confirmation');
  await page.getByRole('button',{name:'约试听',exact:true}).click();await page.getByRole('button',{name:'下一步',exact:true}).click();
  await page.locator('button[data-class-id="CLASS-OLD"]').click();
  const picker=page.getByRole('dialog',{name:'选择课节',exact:true});await picker.getByRole('radio').first().check();await picker.getByRole('button',{name:'确认课节',exact:true}).click();
  await page.getByRole('button',{name:'下一步',exact:true}).click();await page.getByRole('button',{name:'提交预约',exact:true}).click();await page.getByRole('button',{name:'查看试听管理',exact:true}).click();await page.locator('#trial-management-results').getByRole('button',{name:'详情',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'确认排班',exact:true}).click();
  assert.equal(await page.evaluate(()=>a.students.length),1);const studentId=await page.evaluate(()=>a.students[0].id);
  console.log('Browser MVP: cancellation, reuse and partial payment');
  await go('myLeads');await page.getByRole('button',{name:/约试听/}).first().click();await page.getByRole('button',{name:'跟进',exact:true}).click();await page.getByRole('button',{name:'去报名',exact:true}).click();
  await go('myLeads');await page.getByRole('button',{name:'跟进',exact:true}).click();await page.getByRole('button',{name:'去报名',exact:true}).click();assert.equal(await page.evaluate(()=>a.students.length),1);
  await page.getByRole('button',{name:'下一步',exact:true}).click();await page.getByRole('button',{name:'选择班级',exact:true}).click();await page.getByRole('checkbox',{name:'选择验收秋季数学班',exact:true}).check();await page.getByRole('button',{name:'确认选择',exact:true}).click();await page.getByRole('button',{name:'下一步',exact:true}).click();
  const pay=async amount=>{await page.locator('#pay-channel').selectOption('现金');await page.locator('#pay-amount').fill(amount);await page.locator('#pay-proof-0').setInputFiles({name:'验收收款凭证.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\nMVP isolated receipt')});await page.getByRole('button',{name:'立即报名',exact:true}).click()};
  await pay('400');assert.equal(await page.evaluate(()=>a.students.length),1);assert.equal(await page.evaluate(()=>a.orders[0].studentId),studentId);assert.equal(await page.evaluate(()=>a.orders[0].status),'等待付款');assert.equal(await page.evaluate(()=>shortcutConvertedLeadIds().size),0);
  await page.evaluate(()=>businessSave());await ready();await page.reload();await ready();
  console.log('Browser MVP: supplement after reload');
  await go('supplement');await page.getByRole('button',{name:'选择学生',exact:true}).click();await page.locator('input[name="modal-student"]').check();await page.locator('.modal-backdrop').getByRole('button',{name:'确定',exact:true}).click();await page.locator('#flow-from').selectOption('CLASS-OLD');await page.getByRole('combobox',{name:'第1笔缴费方式',exact:true}).selectOption('POS刷卡');await page.getByRole('textbox',{name:'第1笔缴费金额',exact:true}).fill('600');await page.getByRole('button',{name:'确定',exact:true}).click();
  assert.equal(await page.evaluate(()=>shortcutConvertedLeadIds().size),1);
  console.log('Browser MVP: attendance and lesson consumption');
  await page.clock.setFixedTime(new Date('2026-10-31T12:00:00+08:00'));await go('attendance');await page.locator('#attendance-results tbody tr').filter({hasText:'验收秋季数学班'}).locator('a').click();await page.locator('#attendance-lesson-student-0').selectOption('出勤');await page.getByRole('button',{name:'保存考勤',exact:true}).click();
  assert.equal(await page.evaluate(()=>financeConsumptionRows().filter(r=>r.student==='MVP验收学生').length),1);
  await go('trialManage');await page.getByRole('button',{name:/^已排班/}).click();await page.getByRole('button',{name:'已试听',exact:true}).click();assert.equal(await page.evaluate(()=>trialState.requests[0].attendance),'已试听');
  console.log('Browser MVP: class-linked service');
  await go('students');await page.getByRole('button',{name:'购课记录',exact:true}).click();await page.getByRole('button',{name:'记录沟通',exact:true}).click();await page.locator('#profile-recorder').selectOption('1');await page.locator('#student-communication-contact').fill('妈妈');await page.locator('#student-communication-next').fill('2026-11-02T10:00');await page.locator('.record-textarea').fill('反馈本班学习情况，约定回访。');await page.getByRole('button',{name:'保存沟通记录',exact:true}).click();assert.equal(await page.evaluate(()=>a.students[0].communications[0].classId),'CLASS-OLD');
  console.log('Browser MVP: source-term renewal period');
  await page.locator('[data-page="system"]').click();await page.getByRole('tab',{name:'续报配置',exact:true}).click();await page.getByRole('button',{name:'+ 设置续报期',exact:true}).click();
  await page.getByRole('combobox',{name:'续报适用方式',exact:true}).selectOption('course');
  const courseSelect=page.getByRole('combobox',{name:'适用课程',exact:true});
  assert.equal(await courseSelect.inputValue(),'');
  assert.equal(await courseSelect.locator('option:checked').innerText(),'全部课程');
  await courseSelect.selectOption('COURSE-OLD');
  assert.deepEqual(await page.evaluate(()=>renewalPeriodDraft.selected),['COURSE-OLD']);
  await courseSelect.selectOption('');
  assert.equal(await page.evaluate(()=>renewalPeriodDraft.all),true);
  await page.getByRole('combobox',{name:'续报适用方式',exact:true}).selectOption('grade');
  await page.getByRole('textbox',{name:'续报开始时间',exact:true}).fill('2026-10-24T09:00');await page.getByRole('textbox',{name:'续报结束时间',exact:true}).fill('2026-10-31T18:00');await page.getByRole('button',{name:'保存续报期',exact:true}).click();assert.equal(await page.evaluate(()=>a.renewalPeriods.length),1);
  console.log('Browser MVP: original-class renewal into existing enrollment');
  await go('learningActive');await page.getByRole('button',{name:'购课记录',exact:true}).click();await page.getByRole('button',{name:'续报',exact:true}).click();await page.getByRole('button',{name:'选择班级',exact:true}).click();assert.equal(await page.getByRole('checkbox',{name:'选择验收秋季数学班',exact:true}).count(),0);await page.getByRole('checkbox',{name:'选择验收春季数学班',exact:true}).check();await page.getByRole('button',{name:'确认选择',exact:true}).click();await page.getByRole('button',{name:'下一步',exact:true}).click();await pay('1200');
  assert.equal(await page.evaluate(()=>a.orders.length),2);assert.equal(await page.evaluate(()=>a.students.length),1);assert.equal(await page.evaluate(()=>a.orders[0].items[0].renewalFrom.classId),'CLASS-OLD');
  await page.evaluate(()=>businessSave());await ready();await page.reload();await ready();await go('students');await page.getByRole('button',{name:'购课记录',exact:true}).first().click();
  assert((await page.locator('#view').innerText()).includes('续报成功'));assert.equal(await page.evaluate(()=>a.renewalPeriods.length),1);assert.equal(await page.evaluate(()=>a.students[0].communications[0].classId),'CLASS-OLD');assert.equal(await page.evaluate(()=>a.orders.length),2);
  const out=path.resolve(__dirname,'../.artifact-work/audit');fs.mkdirSync(out,{recursive:true});await page.screenshot({path:path.join(out,'mvp-student-lifecycle.png'),fullPage:true});assert.deepEqual(errors,[]);
  console.log('PASS browser MVP: register → trial → reuse/partial enrollment → reload → supplement → attendance/consumption → service → renewal period → teacher renewal → reload.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
