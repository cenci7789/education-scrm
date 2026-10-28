const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1500,height:1000},timezoneId:'Asia/Shanghai'}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
  await page.goto(require('node:url').pathToFileURL(path.resolve(__dirname,'../index.html')).href);
  await page.waitForFunction(()=>businessStorage.ready&&!businessStorage.busy);
  await page.evaluate(()=>{
   permissionState.identity='admin';
   a.courses=[{name:'秋季数学',year:'2026',term:'秋季',grade:'初一',subject:'数学'},{name:'春季数学',year:'2027',term:'春季',grade:'初一',subject:'数学'}];
   a.classes=a.courses.map((c,i)=>({id:'TERM-'+i,name:c.name+'班',course:c.name,campus:'测试校区',teacher:'授课老师',academicTeacher:'教务老师',year:c.year,term:c.term,date:c.year+'-10-31',time:'08:00–10:00',students:1,capacity:20,status:'未开课'}));
   a.students=a.classes.map((c,i)=>({id:'S-'+i,name:i?'春季学生':'秋季学生',phone:'13800138000',grade:'初一',status:'在读',enrollments:[{classId:c.id,academicTerm:c.year+'-'+c.term,enrollmentStatus:'上课中'}]}));
   a.orders=[];trialState.requests=[{id:900,classId:'TERM-0',studentId:'S-trial',name:'试听测试学生',phone:'13800138001',course:'秋季数学',status:'已排班',scheduledTime:'2026-10-31T08:00',scheduledEndTime:'2026-10-31T10:00',teacher:'授课老师',room:'教室01'}];nav('students');
  });
  const trigger=()=>page.getByRole('button',{name:'学期',exact:true});
  await trigger().click();const popup=()=>page.getByRole('dialog',{name:'选择学期',exact:true});
  assert(await popup().isVisible());
  await page.getByRole('button',{name:'设为默认：2026年秋季',exact:true}).click();
  assert(await popup().isVisible());assert(await page.getByRole('button',{name:'取消默认：2026年秋季',exact:true}).isVisible());
  assert.equal(await page.evaluate(()=>studentTermView().term),'','setting a default does not silently change the active filter');
  await popup().locator('[data-term="2026-秋季"] .teaching-term-option').click();
  assert.equal(await popup().count(),0);assert.equal(await page.locator('#student-term-results tbody tr').count(),1);
  assert((await page.locator('#student-term-results').innerText()).includes('秋季学生'));
  await trigger().click();
  const out=path.resolve(__dirname,'../.artifact-work/audit');fs.mkdirSync(out,{recursive:true});
  await page.screenshot({path:path.join(out,'student-term-inline-default.png')});
  await page.keyboard.press('Escape');assert.equal(await trigger().getAttribute('aria-expanded'),'false');
  await trigger().click();await page.getByRole('heading',{name:'学生管理',exact:true}).click();assert.equal(await trigger().getAttribute('aria-expanded'),'false');
  await page.waitForFunction(()=>!businessStorage.busy);await page.reload();await page.waitForFunction(()=>businessStorage.ready&&!businessStorage.busy);await page.evaluate(()=>nav('students'));
  assert.equal(await page.evaluate(()=>studentTermView().term),'2026-秋季');
  await trigger().click();await page.getByRole('button',{name:'取消默认：2026年秋季',exact:true}).click();
  assert.equal(await page.evaluate(()=>teachingDefaultTermRead('students')),null);
  assert(await page.getByRole('button',{name:'设为默认：2026年秋季',exact:true}).isVisible());
  await page.reload();await page.waitForFunction(()=>businessStorage.ready&&!businessStorage.busy);await page.evaluate(()=>nav('students'));
  assert.equal(await page.evaluate(()=>studentTermView().term),'');
  await page.evaluate(()=>nav('classes'));
  assert.equal(await page.locator('#class-management-trials,.trial-roster').count(),0);
  assert.equal(await page.getByText('试听测试学生',{exact:true}).count(),0);
  await trigger().click();await page.getByRole('button',{name:'设为默认：2027年春季',exact:true}).click();
  assert.equal(await page.evaluate(()=>teachingDefaultTermRead('classes')),'2027-春季');
  assert.equal(await page.evaluate(()=>teachingDefaultTermRead('students')),null);
  await page.evaluate(()=>{nav('students');studentTermSetTab('试听学生')});
  assert((await page.locator('#student-term-results').innerText()).includes('试听测试学生'));
  assert.deepEqual(errors,[]);
  console.log('PASS browser: per-option set/cancel default, current filtering, reload persistence/removal, outside/Escape dismissal, separate page defaults, removed class trial roster and retained trial student records.');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
