const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1600,height:1100},timezoneId:'Asia/Shanghai'}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.clock.setFixedTime(new Date('2026-10-27T12:00:00+08:00'));
  await page.goto(require('node:url').pathToFileURL(path.resolve(__dirname,'../index.html')).href);
  const ready=()=>page.waitForFunction(()=>businessStorage.ready&&!businessStorage.busy);
  const open=async()=>{await page.locator('[data-page="system"]').click();await page.getByRole('tab',{name:'续报配置',exact:true}).click()};
  await ready();
  await page.evaluate(()=>{
   a.courses=[{id:'MATH',name:'秋季数学',year:2026,term:'秋季',grade:leadConfiguredGradeNames()[0],subject:'数学'},{id:'CHINESE',name:'秋季语文',year:2026,term:'秋季',grade:leadConfiguredGradeNames()[1],subject:'语文'}];
  });
  await open();await page.getByRole('button',{name:'+ 设置续报周期',exact:true}).click();
  await page.getByRole('textbox',{name:'续报开始时间',exact:true}).fill('2026-10-24T09:00');await page.getByRole('textbox',{name:'续报结束时间',exact:true}).fill('2026-10-31T18:00');await page.getByRole('button',{name:'保存',exact:true}).click();
  await page.getByRole('tab',{name:'续报优惠',exact:true}).click();assert.equal(await page.evaluate(()=>a.renewalPeriods.length),1);
  await page.getByRole('button',{name:'+ 设置续报优惠',exact:true}).click();
  await page.getByRole('textbox',{name:'续报开始时间',exact:true}).fill('2026-10-24T09:00');await page.getByRole('textbox',{name:'续报结束时间',exact:true}).fill('2026-10-31T18:00');
  await page.getByRole('spinbutton',{name:'续报优惠数值',exact:true}).fill('100');await page.getByRole('button',{name:'保存',exact:true}).click();
  assert((await page.locator('#view').innerText()).includes('减免 100 元'));
  await page.getByRole('button',{name:'编辑',exact:true}).click();
  await page.getByRole('combobox',{name:'续报优惠方式',exact:true}).selectOption('percent');assert.equal(await page.getByRole('spinbutton',{name:'续报优惠数值',exact:true}).inputValue(),'');
  await page.getByRole('spinbutton',{name:'续报优惠数值',exact:true}).fill('8.5');await page.getByRole('combobox',{name:'续报适用方式',exact:true}).selectOption('course');
  assert.equal(await page.locator('#renewal-course-course, #renewal-course-status').count(),0);
  await page.getByRole('checkbox',{name:'适用全部',exact:true}).uncheck();await page.getByRole('textbox',{name:'课程名称',exact:true}).fill('数学');await page.getByRole('checkbox',{name:'选择课程秋季数学',exact:true}).check();
  await page.getByRole('button',{name:'保存',exact:true}).click();assert((await page.locator('#view').innerText()).includes('打 8.5 折'));
  await page.evaluate(()=>businessSave());await ready();await page.reload();await ready();await open();
  await page.getByRole('tab',{name:'续报优惠',exact:true}).click();await page.getByRole('button',{name:'编辑',exact:true}).click();
  assert.equal(await page.getByRole('combobox',{name:'续报优惠方式',exact:true}).inputValue(),'percent');assert.equal(await page.getByRole('spinbutton',{name:'续报优惠数值',exact:true}).inputValue(),'8.5');assert(await page.getByRole('checkbox',{name:'选择课程秋季数学',exact:true}).isChecked());assert.equal(await page.getByRole('checkbox',{name:'选择课程秋季语文',exact:true}).isChecked(),false);
  const out=path.resolve(__dirname,'../.artifact-work/audit');fs.mkdirSync(out,{recursive:true});await page.screenshot({path:path.join(out,'renewal-discount-config.png'),fullPage:true});
  await page.getByRole('tab',{name:'续报周期',exact:true}).click();assert((await page.locator('#view').innerText()).includes('2026-10-24 09:00'));assert.equal(await page.evaluate(()=>a.renewalPeriods.length),1);assert.equal(await page.evaluate(()=>a.renewalDiscounts.length),1);assert.deepEqual(errors,[]);
  console.log('PASS browser renewal configuration: period/discount tabs, reduction/rate units, course search and selection, editing, persistence, original periods retained.');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
