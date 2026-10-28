const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000},timezoneId:'Asia/Shanghai'}),page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(10000);
  await page.goto(require('node:url').pathToFileURL(path.resolve(__dirname,'../index.html')).href);
  await page.waitForFunction(()=>businessStorage.ready&&!businessStorage.busy);
  await page.evaluate(()=>{
   permissionState.identity='admin';
   state.campuses=[{name:'甲校区',active:true},{name:'乙校区',active:true}];
   state.staff=[{name:'测试招生',account:'test-sales',phone:'13800138000',active:true,campus:'甲校区',roleId:'sales'}];
   leadState.leads=[{leadId:'POOL-BROWSER',name:'测试学生',phone:'13800138001',grade:'初一',subject:'数学',guardian:'妈妈',campus:'待定',ownershipCampus:'甲校区',owner:'测试招生',assignees:[{name:'测试招生',account:'test-sales'}],status:'assigned',stage:'跟进中',next:'未约定',history:[],createdAt:new Date().toISOString(),followupCycleAt:new Date().toISOString()}];
   permissionChangeIdentity('staff:'+leadStaffAccessId(state.staff[0]));leadDetail(0,'myLeads');
  });
  assert.equal(await page.locator('.lead-detail-dock').getByRole('button',{name:'转同事',exact:true}).count(),0);
  await page.getByRole('button',{name:'回公海',exact:true}).click();
  assert.equal(await page.getByLabel('选择校区',{exact:true}).inputValue(),'甲校区');
  await page.getByLabel('选择校区',{exact:true}).selectOption('乙校区');
  await page.getByRole('button',{name:'取消',exact:true}).click();
  assert.equal(await page.evaluate(()=>leadState.leads[0].ownershipCampus),'甲校区');
  await page.getByRole('button',{name:'回公海',exact:true}).click();
  assert.equal(await page.getByLabel('选择校区',{exact:true}).inputValue(),'甲校区');
  await page.getByLabel('选择校区',{exact:true}).selectOption('乙校区');
  await page.getByLabel('回公海原因',{exact:true}).fill('转入乙校区重新分配');
  const out=path.resolve(__dirname,'../.artifact-work/audit');fs.mkdirSync(out,{recursive:true});
  await page.screenshot({path:path.join(out,'lead-public-pool-campus.png'),fullPage:true});
  await page.getByRole('button',{name:'确认回公海',exact:true}).click();
  assert.equal(await page.evaluate(()=>state.page),'myLeads');
  await page.waitForFunction(()=>!businessStorage.busy);
  await page.reload();await page.waitForFunction(()=>businessStorage.ready&&!businessStorage.busy);
  const saved=await page.evaluate(()=>leadState.leads.find(l=>l.leadId==='POOL-BROWSER'));
  assert.equal(saved.ownershipCampus,'乙校区');assert.equal(saved.status,'recycle');assert.equal(saved.owner,'未分配');
  assert.equal(saved.previousOwner,'测试招生');assert.equal(saved.history.at(-1)[3].previousCampus,'甲校区');
  await page.evaluate(()=>{permissionChangeIdentity('admin');leadState.manageTab='回收池';leadNav('leadManage')});
  await page.getByRole('combobox',{name:'校区',exact:true}).selectOption('乙校区');
  assert((await page.locator('#view tbody').innerText()).includes('测试学生'));
  await page.getByRole('combobox',{name:'校区',exact:true}).selectOption('甲校区');
  assert(!(await page.locator('#view tbody').innerText()).includes('测试学生'));
  assert.deepEqual(errors,[]);
  console.log('PASS browser: no colleague button, staff campus default, cancel, cross-campus return, safe navigation, persisted ownership and pool filtering.');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
