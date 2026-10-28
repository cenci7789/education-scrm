const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1580,height:1000},timezoneId:'Asia/Shanghai'}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
  await page.goto(require('node:url').pathToFileURL(path.resolve(__dirname,'../index.html')).href);await page.waitForFunction(()=>businessStorage.ready&&!businessStorage.busy);
  await page.evaluate(()=>{
   permissionState.identity='admin';Date.now=()=>new Date('2026-10-27T12:00:00').getTime();
   a.courses=[{name:'秋季数学',year:'2026',term:'秋季',grade:'初一',subject:'数学',courseCategory:'班课'}];
   a.classes=[{id:'ATT-CLASS',name:'秋季数学班',course:'秋季数学',campus:'测试校区',teacher:'授课老师',academicTeacher:'教务老师',date:'2026-10-20',time:'08:00–10:00',students:1,capacity:20,sessions:[
    {id:'lesson-1',name:'第一讲内容',date:'2026-10-20',time:'08:00–10:00'},
    {id:'lesson-2',name:'第二讲内容',date:'2026-10-27',time:'08:00–10:00'},
    {id:'lesson-3',name:'第三讲内容',date:'2026-10-27',time:'11:00–13:00'},
    {id:'lesson-4',name:'第四讲内容',date:'2026-11-03',time:'08:00–10:00'}]}];
   a.students=[{id:'ATT-STUDENT',name:'考勤学生',phone:'13800138000',status:'在读',enrollments:[{classId:'ATT-CLASS',enrollmentStatus:'上课中'}]}];a.orders=[];a.attendance=[];trialState.requests=[];nav('attendance');
  });
  const results=()=>page.locator('#attendance-results'),modal=()=>page.getByRole('dialog',{name:'考勤',exact:true}),picker=()=>page.getByRole('combobox',{name:'选择考勤讲次'});
  const headers=await results().locator('th').allTextContents();assert(headers.includes('已完课节'));assert(!headers.includes('考勤课节'));assert(!headers.includes('考勤状态'));assert.equal(await results().locator('select').count(),0);
  assert((await results().innerText()).includes('第2讲'));
  await results().getByText('考勤',{exact:true}).click();assert.equal(await picker().inputValue(),'lesson-2');
  await page.locator('#attendance-lesson-student-0').selectOption('请假');await picker().selectOption('lesson-1');
  assert.equal(await page.locator('#attendance-lesson-student-0').inputValue(),'');await picker().selectOption('lesson-2');assert.equal(await page.locator('#attendance-lesson-student-0').inputValue(),'请假');
  const out=path.resolve(__dirname,'../.artifact-work/audit');fs.mkdirSync(out,{recursive:true});await page.screenshot({path:path.join(out,'attendance-modal-lesson-picker.png')});
  await modal().getByRole('button',{name:'保存考勤',exact:true}).click();
  assert.deepEqual(await page.evaluate(()=>a.attendance.map(r=>[r.sessionId,r.attendance])),[['lesson-2','请假']]);
  await results().getByText('考勤',{exact:true}).click();await picker().selectOption('lesson-1');await page.locator('#attendance-lesson-student-0').selectOption('出勤');await modal().getByRole('button',{name:'保存考勤',exact:true}).click();
  assert.equal(await page.evaluate(()=>a.attendance.length),2);assert((await results().innerText()).includes('第2讲'));
  await results().getByText('考勤',{exact:true}).click();assert.equal(await picker().inputValue(),'lesson-2');assert.equal(await page.locator('#attendance-lesson-student-0').inputValue(),'请假');await modal().getByRole('button',{name:'关闭',exact:true}).first().click();
  await page.screenshot({path:path.join(out,'attendance-completed-column.png')});
  await page.evaluate(()=>{a.classes[0].sessions=a.classes[0].sessions.filter(s=>s.id==='lesson-4');academicRender()});assert((await results().innerText()).includes('暂无已完课节'));
  await results().getByText('考勤',{exact:true}).click();assert.equal(await picker().inputValue(),'');assert.equal(await modal().getByRole('button',{name:'保存考勤',exact:true}).count(),0);
  await picker().selectOption('lesson-4');assert.equal(await picker().inputValue(),'lesson-4');await modal().getByRole('button',{name:'关闭',exact:true}).first().click();
  assert.equal(await page.evaluate(()=>a.attendance.length),2,'viewing future lesson creates no attendance');assert.deepEqual(errors,[]);
  console.log('PASS browser: completed column, header picker, nearest ended default, independent drafts/records, save/reopen, no-ended placeholder and no side effects from viewing.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
