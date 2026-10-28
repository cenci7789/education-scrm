const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1600,height:1000},timezoneId:'Asia/Shanghai'}),page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(10000);
  await page.goto(require('node:url').pathToFileURL(path.resolve(__dirname,'../index.html')).href);
  await page.waitForFunction(()=>businessStorage.ready&&!businessStorage.busy);
  await page.evaluate(()=>{
   permissionState.identity='admin';state.campuses=[{name:'甲校区',active:true},{name:'乙校区',active:true}];
   leadState.leads=[
    {name:'甲跟进学生',owner:'甲招生',ownershipCampus:'甲校区',stage:'新分配'},
    {name:'甲试听学生',owner:'甲招生',ownershipCampus:'甲校区',stage:'约试听'},
    {name:'乙跟进学生',owner:'乙招生',ownershipCampus:'乙校区',stage:'跟进中'},
    {name:'甲报名学生',owner:'甲招生',ownershipCampus:'甲校区',stage:'已报名'},
    {name:'乙报名学生',owner:'乙招生',ownershipCampus:'乙校区',stage:'已报名'}
   ].map((l,i)=>({leadId:'FILTER-'+i,status:'assigned',phone:'13800138000',guardian:'妈妈',grade:'初一',subject:'数学',source:'主动来电',next:'未约定',history:[],createdAt:new Date().toISOString(),followupCycleAt:new Date().toISOString(),...l}));
   trialState.requests=[];a.students=[];a.orders=[{id:'O1',originLeadId:'FILTER-3',createdAt:'2026-08-01T10:00:00',status:'交易成功'},{id:'O2',originLeadId:'FILTER-3',createdAt:'2026-10-27T10:00:00',status:'等待付款'},{id:'O3',originLeadId:'FILTER-4',createdAt:'2026-10-27T10:00:00',status:'交易成功'}];
   state.page='leadManage';leadState.manageTab='已分配';render();
  });
  const table=()=>page.locator('#view tbody').innerText();
  assert.equal(await page.locator('#view tbody tr').count(),3);
  assert.deepEqual(await page.getByRole('combobox',{name:'状态',exact:true}).locator('option').allTextContents(),['全部状态','跟进中','约试听']);
  await page.getByLabel('校区',{exact:true}).selectOption('甲校区');
  await page.getByLabel('招生人员',{exact:true}).selectOption('甲招生');
  await page.getByLabel('状态',{exact:true}).selectOption('跟进中');
  assert((await table()).includes('甲跟进学生'));assert(!(await table()).includes('甲试听学生'));
  await page.getByLabel('状态',{exact:true}).selectOption('约试听');
  assert((await table()).includes('甲试听学生'));assert(!(await table()).includes('甲跟进学生'));
  const out=path.resolve(__dirname,'../.artifact-work/audit');fs.mkdirSync(out,{recursive:true});
  await page.screenshot({path:path.join(out,'lead-assigned-filters.png'),fullPage:true});
  await page.getByRole('button',{name:'改派',exact:true}).click();
  assert((await page.getByRole('dialog').innerText()).includes('甲试听学生'));
  await page.getByRole('button',{name:'取消',exact:true}).click();
  await page.getByRole('button',{name:'重置筛选',exact:true}).click();await page.getByLabel('校区',{exact:true}).selectOption('');assert.equal(await page.locator('#view tbody tr').count(),3);
  await page.getByRole('button',{name:/^已报名 /}).click();
  assert.equal(await page.getByLabel('状态',{exact:true}).count(),0);
  await page.getByLabel('校区',{exact:true}).selectOption('甲校区');await page.getByLabel('招生人员',{exact:true}).selectOption('甲招生');
  await page.getByLabel('报名开始日期').fill('2026-10-27');await page.getByLabel('报名结束日期').fill('2026-10-27');
  assert((await table()).includes('甲报名学生'));assert(!(await table()).includes('乙报名学生'));
  await page.screenshot({path:path.join(out,'lead-enrolled-campus-filters.png'),fullPage:true});
  await page.getByLabel('校区',{exact:true}).selectOption('乙校区');assert.equal(await page.getByLabel('招生人员',{exact:true}).inputValue(),'');
  assert((await table()).includes('乙报名学生'));assert(!(await table()).includes('甲报名学生'));
  await page.getByRole('button',{name:/^已分配 /}).click();assert.equal(await page.getByLabel('校区',{exact:true}).inputValue(),'乙校区');
  assert.deepEqual(errors,[]);
  console.log('PASS browser: assigned campus/owner/status filters, original action target, reset, enrolled campus/owner/date intersection and independent tab state.');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
