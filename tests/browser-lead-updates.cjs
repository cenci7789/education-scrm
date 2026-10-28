const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1600,height:1100},timezoneId:'Asia/Shanghai'}),page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(10000);
  await page.clock.setFixedTime(new Date('2026-10-27T12:00:00+08:00'));
  await page.goto(require('node:url').pathToFileURL(path.resolve(__dirname,'../index.html')).href);
  await page.waitForFunction(()=>businessStorage.ready&&!businessStorage.busy);
  await page.evaluate(()=>{
   state.campuses=[{name:'甲校区',active:true},{name:'乙校区',active:true}];
   leadState.leads=['recycle','warning','cold'].flatMap(status=>['甲','乙'].map((x,i)=>({leadId:status+x,name:status+x,phone:'13888880001',grade:'小一',subject:'数学',guardian:'妈妈',owner:status==='recycle'?'未分配':x+'招生',previousOwner:x+'招生',ownershipCampus:x+'校区',status,stage:'新线索',next:'未约定',history:[]})));
   const owner=leadCurrentOperator().name;
   leadState.leads.push(...['今天学生','昨天学生','旧报名新续报','日期缺失'].map((name,i)=>({leadId:'E'+i,studentId:'S'+i,name,phone:'13888880002',grade:'小一',subject:'数学',guardian:'妈妈',owner,ownershipCampus:'甲校区',status:'mine',stage:'已报名',next:'未约定',history:[]})));
   a.students=[];a.classes=[];a.orders=[
    {id:'O1',studentId:'S0',createdAt:'2026-10-27T00:00:00+08:00',status:'等待付款'},
    {id:'O2',studentId:'S1',createdAt:'2026-10-26T23:59:59+08:00',status:'交易成功'},
    {id:'O3',studentId:'S2',createdAt:'2026-07-01T12:00:00+08:00',status:'交易成功'},
    {id:'O4',studentId:'S2',createdAt:'2026-10-27T23:59:59+08:00',status:'交易成功'}
   ];state.page='leadManage';leadState.manageTab='回收池';render();
  });
  for(const [tab,status] of [['回收池','recycle'],['预警中','warning'],['冷宫池','cold']]){
   await page.getByRole('button',{name:new RegExp('^'+tab+' ')}).click();
   await page.getByRole('combobox',{name:'校区',exact:true}).selectOption('甲校区');
   await page.getByRole('combobox',{name:'招生人员',exact:true}).selectOption('甲招生');
   assert((await page.locator('#view tbody').innerText()).includes(status+'甲'));
   assert(!(await page.locator('#view tbody').innerText()).includes(status+'乙'));
   await page.getByRole('button',{name:'重置筛选',exact:true}).click();
   await page.getByRole('combobox',{name:'校区',exact:true}).selectOption('');
   assert((await page.locator('#view tbody').innerText()).includes(status+'乙'));
  }
  for(const scope of ['leadManage','myLeads']){
   await page.evaluate(scope=>{state.page=scope;render()},scope);
   await page.getByRole('button',{name:/^已报名 /}).click();
   assert.equal(await page.getByLabel('报名开始日期').inputValue(),'');
   for(const [preset,from,to,count] of [['今天','2026-10-27','2026-10-27',2],['昨天','2026-10-26','2026-10-26',1],['近7天','2026-10-21','2026-10-27',3],['近30天','2026-09-28','2026-10-27',3],['近90天','2026-07-30','2026-10-27',3]]){
    await page.getByRole('button',{name:preset,exact:true}).click();
    assert.equal(await page.getByLabel('报名开始日期').inputValue(),from);assert.equal(await page.getByLabel('报名结束日期').inputValue(),to);
    assert.equal(await page.locator('#view tbody tr').count(),count);
   }
   await page.getByLabel('报名开始日期').fill('2026-07-01');await page.getByLabel('报名结束日期').fill('2026-07-01');
   assert.equal(await page.locator('#view tbody tr').count(),1);assert((await page.locator('#view tbody').innerText()).includes('旧报名新续报'));
   await page.getByLabel('报名开始日期').fill('2026-07-02');assert(await page.getByRole('alert').isVisible());
   await page.getByRole('button',{name:'重置日期',exact:true}).click();assert.equal(await page.locator('#view tbody tr').count(),4);
  }
  const out=path.resolve(__dirname,'../.artifact-work/audit');fs.mkdirSync(out,{recursive:true});
  await page.getByRole('button',{name:'近7天',exact:true}).click();await page.screenshot({path:path.join(out,'lead-enrolled-date-filter.png'),fullPage:true});
  assert.deepEqual(errors,[]);
  console.log('PASS browser: three pool filters/reset; both enrolled tabs, calendar range, five presets, repeat enrollment, partial payment, invalid range and missing dates.');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
