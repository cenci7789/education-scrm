const assert=require('node:assert/strict'),path=require('node:path');
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(require('node:url').pathToFileURL(path.resolve(__dirname,'../index.html')).href);await page.waitForFunction(()=>businessStorage.ready&&!businessStorage.busy);
 await page.locator('[data-page="staff"]').click();await page.getByRole('button',{name:'+ 创建员工',exact:true}).click();
 assert.equal(await page.locator('#staff-campus').inputValue(),'');assert.equal(await page.locator('#staff-campus').evaluate(el=>el.closest('.field').querySelector('label').classList.contains('required')),false);
 await page.locator('#staff-name').fill('分校测试员工');await page.locator('#staff-phone').fill('13845670123');await page.locator('#staff-role').selectOption('sales');await page.getByRole('button',{name:'创建',exact:true}).click();assert.equal(await page.getByRole('cell',{name:'分校',exact:true}).count(),1);
 await page.evaluate(()=>{state.campuses.push({name:'测试校区',active:true,rooms:0,seats:0,classrooms:[]})});
 await page.getByText('详情 / 编辑',{exact:true}).click();assert.equal(await page.locator('#staff-campus').inputValue(),'');await page.locator('#staff-campus').selectOption('测试校区');await page.getByRole('button',{name:'保存',exact:true}).click();assert.equal(await page.getByRole('cell',{name:'测试校区',exact:true}).count(),1);
 await page.getByText('详情 / 编辑',{exact:true}).click();await page.locator('#staff-campus').selectOption('');await page.getByRole('button',{name:'保存',exact:true}).click();assert.equal(await page.getByRole('cell',{name:'分校',exact:true}).count(),1);
 await page.evaluate(()=>businessSave());await page.waitForFunction(()=>!businessStorage.busy);await page.reload();await page.waitForFunction(()=>businessStorage.ready&&!businessStorage.busy);await page.locator('[data-page="staff"]').click();assert.equal(await page.getByRole('cell',{name:'分校',exact:true}).count(),1);await page.getByText('详情 / 编辑',{exact:true}).click();assert.equal(await page.locator('#staff-campus').inputValue(),'');assert.deepEqual(errors,[]);
 console.log('PASS browser: optional campus, no-campus creation, branch list label, campus reassignment/clear, reload and edit persistence.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
