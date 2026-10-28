const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1600,height:1000},timezoneId:'Asia/Shanghai'}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
  await page.goto(require('node:url').pathToFileURL(path.resolve(__dirname,'../index.html')).href);
  await page.waitForFunction(()=>businessStorage.ready&&!businessStorage.busy);
  await page.evaluate(()=>{
   permissionState.identity='admin';state.campuses=[{name:'甲校区',active:true},{name:'乙校区',active:true},{name:'丙校区',active:true}];
   state.staff=[{name:'单校组长',phone:'13800001001',roleId:'campusAdmin',active:true,campus:'甲校区'},{name:'招生主管',phone:'13800001002',roleId:'salesSupervisor',active:true,campus:'分校'},{name:'招生人员',phone:'13800001003',roleId:'sales',active:true,campus:'甲校区',campuses:['甲校区','乙校区']}];
   leadState.leads=['new','recycle','warning','cold','assigned','enrolled'].flatMap(status=>['甲校区','乙校区','丙校区'].map(campus=>({leadId:status+campus,name:status+campus,phone:'13900000000',grade:'初一',subject:'数学',guardian:'妈妈',source:'主动来电',ownershipCampus:campus,campus:'待定',status:status==='enrolled'?'assigned':status,stage:status==='enrolled'?'已报名':'新线索',owner:['new','recycle'].includes(status)?'未分配':'招生人员',history:[],next:'未约定',createdAt:new Date().toISOString(),followupCycleAt:new Date().toISOString()})));
   state.page='staff';state.mode='form';state.staffEdit=null;render();
  });
  await page.locator('#staff-name').fill('跨校招生组长');await page.locator('#staff-phone').fill('13800001004');
  await page.getByLabel('所属校区',{exact:true}).selectOption(['甲校区','乙校区']);await page.locator('#staff-role').selectOption('campusAdmin');
  await page.getByRole('button',{name:'创建',exact:true}).click();
  assert((await page.locator('#view tbody').innerText()).includes('甲校区、乙校区'));
  await page.waitForFunction(()=>!businessStorage.busy);await page.reload();await page.waitForFunction(()=>businessStorage.ready&&!businessStorage.busy);
  assert.deepEqual(await page.evaluate(()=>state.staff.find(s=>s.name==='跨校招生组长').campuses),['甲校区','乙校区']);
  await page.evaluate(()=>{state.page='leadManage';leadState.manageTab='新线索';render()});
  const campus=()=>page.locator('#lead-management-campus');
  await campus().selectOption('乙校区');
  for(const tab of ['新线索','回收池','预警中','冷宫池','已分配','已报名']){
   await page.getByRole('button',{name:new RegExp('^'+tab+' ')}).click();
   assert.equal(await campus().inputValue(),'乙校区');assert.equal(await page.locator('#lead-pool-campus,#lead-queue-campus').count(),0);
   const text=await page.locator('#view tbody').innerText();assert(text.includes('乙校区'));assert(!text.includes('甲校区'));assert(!text.includes('丙校区'));
  }
  const title=await page.getByRole('heading',{name:'线索管理',exact:true}).boundingBox(),selector=await campus().boundingBox();
  assert(selector.x>title.x+title.width);assert(selector.y>=title.y);
  const out=path.resolve(__dirname,'../.artifact-work/audit');fs.mkdirSync(out,{recursive:true});
  await page.screenshot({path:path.join(out,'lead-global-campus-admin.png')});
  const identity=async name=>{const id=await page.evaluate(name=>'staff:'+leadStaffAccessId(state.staff.find(s=>s.name===name)),name);await page.locator('#demo-role').selectOption(id)};
  await identity('单校组长');
  assert.equal(await page.locator('select#lead-management-campus').count(),0);assert.equal(await campus().innerText(),'甲校区');
  await page.screenshot({path:path.join(out,'lead-global-campus-single.png')});
  await identity('跨校招生组长');
  assert.deepEqual(await campus().locator('option').allTextContents(),['甲校区','乙校区']);
  await campus().selectOption('乙校区');await page.getByRole('button',{name:/^已分配 /}).click();assert.equal(await campus().inputValue(),'乙校区');
  assert(!(await page.locator('#view tbody').innerText()).includes('甲校区'));
  await page.screenshot({path:path.join(out,'lead-global-campus-multiple.png')});
  await identity('招生主管');assert.deepEqual(await campus().locator('option').allTextContents(),['全部校区','甲校区','乙校区','丙校区']);
  await identity('招生人员');
  assert.equal(await page.locator('.menu-item[data-page="leadManage"]').isVisible(),false);
  assert.equal(await page.evaluate(()=>permissionCanVisit('leadManage')),false);
  await page.evaluate(()=>leadNav('myLeads'));assert(await page.getByRole('heading',{name:'我的线索',exact:true}).isVisible());
  assert.deepEqual(errors,[]);
  console.log('PASS browser: staff multi-campus save/reload, global heading placement and all-tab filter, fixed single-campus display, assigned-campus-only switching, supervisor access and sales management denial.');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
