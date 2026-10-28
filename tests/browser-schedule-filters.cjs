const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({viewport:{width:1550,height:1000},timezoneId:'Asia/Shanghai'}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
 await page.goto(require('node:url').pathToFileURL(path.resolve(__dirname,'../index.html')).href);await page.waitForFunction(()=>businessStorage.ready&&!businessStorage.busy);
 await page.evaluate(()=>{
  permissionState.identity='admin';state.campuses=[{name:'测试校区',active:true,rooms:[{name:'101',capacity:20},{name:'102',capacity:20}]}];
  a.courses=[{name:'秋季数学',subject:'数学',grade:'初一',term:'秋季',year:'2026'},{name:'秋季英语',subject:'英语',grade:'初二',term:'秋季',year:'2026'}];
  const date=scheduleDateText(new Date());a.classes=a.courses.map((c,i)=>({id:'SCH-'+i,name:c.name+'班',course:c.name,campus:'测试校区',teacher:i?'英语教师':'数学教师',academicTeacher:i?'教务乙':'教务甲',room:i?'102':'101',sessions:[{id:'s'+i,date,time:'08:00–10:00'}]}));a.attendance=[];trialState.requests=[];nav('schedule');
 });
 assert.equal(await page.locator('.schedule-heading-campus #schedule-campus').count(),1);assert.equal(await page.locator('.schedule-heading-campus').getByRole('button',{name:'校区排序',exact:true}).count(),1);
 const events=()=>page.locator('#schedule-calendar-content .schedule-event');assert.equal(await events().count(),2);
 async function choose(label,query,value){await page.getByRole('button',{name:label,exact:true}).click();const popup=page.getByRole('dialog',{name:'选择'+label,exact:true});await popup.getByRole('textbox').fill(query);await popup.getByRole('option',{name:value,exact:true}).click()}
 await page.getByLabel('年级',{exact:true}).selectOption('7');assert.equal(await events().count(),1);
 await page.getByLabel('科目',{exact:true}).selectOption('数学');await choose('教师','数学','数学教师');await choose('教务','甲','教务甲');
 await choose('课程名称','数学','秋季数学');assert.equal(await events().count(),1);
 await choose('教务','乙','教务乙');assert.equal(await events().count(),0);
 await page.getByRole('button',{name:'重置筛选',exact:true}).click();assert.equal(await events().count(),2);
 await page.getByRole('button',{name:'课程名称',exact:true}).click();const coursePicker=page.getByRole('dialog',{name:'选择课程名称',exact:true});await coursePicker.getByRole('textbox').fill('不存在的课程');await coursePicker.getByRole('textbox').press('Enter');assert.equal(await events().count(),2);assert.equal(await coursePicker.getByRole('option').count(),1);await page.keyboard.press('Escape');assert(!(await coursePicker.isVisible()));
 await page.getByRole('button',{name:'教师',exact:true}).click();await page.getByRole('heading',{name:'课表',exact:true}).click();assert(!(await page.getByRole('dialog',{name:'选择教师',exact:true}).isVisible()));
 const dates=await page.evaluate(()=>{const today=scheduleDateText(new Date()),week=scheduleWeekDates(today);return {今天:today,昨天:scheduleShiftDate(today,-1),明天:scheduleShiftDate(today,1),本周六:week[5],本周日:week[6]}});
 await page.getByLabel('选择课表日期',{exact:true}).fill('2020-01-01');
 for(const [label,date] of Object.entries(dates)){await page.getByRole('button',{name:label,exact:true}).click();assert.equal(await page.getByLabel('选择课表日期',{exact:true}).inputValue(),date)}
 assert.deepEqual(await page.locator('.schedule-date-bar .toolbar-left').evaluate(e=>Array.from(e.children).map(n=>n.tagName==='INPUT'?'日历':n.textContent)),['日历','今天','昨天','明天','本周六','本周日','重置筛选']);
 assert.equal(await page.getByRole('button',{name:'导出',exact:true}).count(),0);
 await page.getByRole('button',{name:'今天',exact:true}).click();
 const out=path.resolve(__dirname,'../.artifact-work/audit');fs.mkdirSync(out,{recursive:true});await page.screenshot({path:path.join(out,'schedule-time-filters.png')});
 await page.getByRole('button',{name:'老师课表',exact:true}).click();assert.equal(await page.locator('#schedule-filter-grade').count(),0);
 assert.equal(await page.locator('.schedule-date-bar').count(),0);
 const range=page.locator('.schedule-teacher-controls');assert(await range.getByRole('button',{name:'教师姓名',exact:true}).isVisible());
 for(const [label,offset] of [['上周',-1],['本周',0],['下周',1]]){
  await range.getByRole('button',{name:label,exact:true}).click();const expected=await page.evaluate(offset=>scheduleWeekDates(scheduleShiftDate(scheduleDateText(new Date()),offset*7)),offset);
  assert.equal(await page.getByLabel('老师课表开始日期').inputValue(),expected[0]);assert.equal(await page.getByLabel('老师课表结束日期').inputValue(),expected[6]);
 }
 await range.getByRole('button',{name:'本周',exact:true}).click();
 const rangeEnd=await page.evaluate(()=>scheduleShiftDate(scheduleDateText(new Date()),2));
 await page.getByLabel('老师课表结束日期').fill(rangeEnd);await page.getByLabel('老师课表开始日期').fill(dates.今天);
 assert.equal(await page.locator('.schedule-week-table thead th').count(),4);
 await choose('教师姓名','数学','数学教师');assert.equal(await page.locator('.schedule-week-table tbody tr').count(),1);
 await range.getByRole('button',{name:'教师姓名',exact:true}).click();const teacherPicker=page.getByRole('dialog',{name:'选择教师姓名',exact:true});await teacherPicker.getByRole('textbox').fill('不存在的教师');await teacherPicker.getByRole('textbox').press('Enter');assert.equal(await page.locator('.schedule-week-table tbody tr').count(),1);await page.keyboard.press('Escape');
 await range.getByRole('button',{name:'本周',exact:true}).click();await choose('教师姓名','','全部教师');
 await page.screenshot({path:path.join(out,'schedule-teacher-range.png')});
 const boxes=await Promise.all([range.getByRole('button',{name:'教师姓名',exact:true}).boundingBox(),page.getByLabel('老师课表开始日期').boundingBox(),page.getByLabel('老师课表结束日期').boundingBox()]);assert(Math.max(...boxes.map(b=>b.y))-Math.min(...boxes.map(b=>b.y))<10,'desktop controls share one line');
 for(const tab of ['老师课表','教室课表']){
  await page.getByRole('button',{name:tab,exact:true}).click();await page.getByRole('button',{name:'本周',exact:true}).click();
  const start=page.getByLabel(tab+'开始日期'),end=page.getByLabel(tab+'结束日期'),original=await end.inputValue();
  const invalid=await page.evaluate(()=>scheduleShiftDate(scheduleDisplayDates()[0],7));
  await end.fill(invalid);assert.equal(await end.inputValue(),original,'invalid eight-day range rejected');
  assert.equal(await end.getAttribute('max'),original);assert.equal(await start.getAttribute('min'),await start.inputValue());
 }
 await page.getByLabel('教室',{exact:true}).selectOption({label:'101'});assert.equal(await page.locator('.schedule-week-table tbody tr').count(),1);assert.equal(await events().count(),1);
 for(const [label,offset] of [['上周',-1],['本周',0],['下周',1]]){
  await page.getByRole('button',{name:label,exact:true}).click();const expected=await page.evaluate(offset=>scheduleWeekDates(scheduleShiftDate(scheduleDateText(new Date()),offset*7)),offset);
  assert.equal(await page.getByLabel('教室课表开始日期').inputValue(),expected[0]);assert.equal(await page.getByLabel('教室课表结束日期').inputValue(),expected[6]);
 }
 await page.getByRole('button',{name:'本周',exact:true}).click();await page.getByLabel('教室',{exact:true}).selectOption('');assert.equal(await page.locator('.schedule-week-table tbody tr').count(),2);
 assert.equal(await page.locator('.schedule-date-bar').count(),0);
 const roomBoxes=await Promise.all([page.getByLabel('教室',{exact:true}).boundingBox(),page.getByLabel('教室课表开始日期').boundingBox(),page.getByLabel('教室课表结束日期').boundingBox()]);assert(Math.max(...roomBoxes.map(b=>b.y))-Math.min(...roomBoxes.map(b=>b.y))<10);
 await page.screenshot({path:path.join(out,'schedule-room-range.png')});
 await page.getByRole('button',{name:'时间课表',exact:true}).click();await page.getByRole('button',{name:'今天',exact:true}).click();
 assert.equal(await events().count(),2);assert.deepEqual(errors,[]);
 console.log('PASS browser: header campus/order, five filters and reset, calendar-first shortcuts, current-week anchors, weekly-tab isolation and no runtime errors.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
