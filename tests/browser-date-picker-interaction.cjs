const assert=require('node:assert/strict'),path=require('node:path');
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(require('node:url').pathToFileURL(path.resolve(__dirname,'../index.html')).href);await page.waitForFunction(()=>businessStorage.ready&&!businessStorage.busy);
 await page.evaluate(()=>{
  window.pickerCalls=[];const native=HTMLInputElement.prototype.showPicker;
  HTMLInputElement.prototype.showPicker=function(){native.call(this);pickerCalls.push({id:this.id,type:this.type})};
  permissionState.identity='admin';state.page='quickRegister';render();
 });
 // The registration page uses real date filters, including after a full render.
 const input=page.getByLabel('登记开始日期');await input.waitFor();
 for(const x of [20,55,80,125]){
  const before=await page.evaluate(()=>pickerCalls.length);await input.click({position:{x,y:20}});
  assert.equal(await page.evaluate(()=>pickerCalls.length),before+1,'year/month/day/icon opens native picker');await page.keyboard.press('Escape');
 }
 assert.equal(await input.inputValue(),'','opening does not change filter values');
 await page.evaluate(()=>render());await input.click({position:{x:20,y:20}});await page.keyboard.press('Escape');
 await input.fill('2026-10-27');assert.equal(await input.inputValue(),'2026-10-27');
 // Dynamically inserted dialog fields need no additional initialization.
 await page.evaluate(()=>{const box=document.createElement('dialog');box.id='calendar-test-dialog';box.innerHTML=['date','datetime-local','month','week'].map(type=>`<input id="test-${type}" type="${type}" style="width:260px;height:40px">`).join('<br>')+'<input id="test-readonly" type="date" readonly><input id="test-disabled" type="date" disabled><fieldset disabled><input id="test-fieldset" type="date"></fieldset><input id="test-text" type="text">';document.body.append(box);box.showModal()});
 for(const type of ['date','datetime-local','month','week']){
  const field=page.locator('#test-'+type);const before=await page.evaluate(()=>pickerCalls.length);
  await field.click({position:{x:25,y:20}});assert.equal(await page.evaluate(()=>pickerCalls.length),before+1);await page.keyboard.press('Escape');
 }
 const before=await page.evaluate(()=>pickerCalls.length);
 for(const id of ['test-readonly','test-disabled','test-fieldset','test-text'])await page.locator('#'+id).dispatchEvent('click');
 assert.equal(await page.evaluate(()=>pickerCalls.length),before,'readonly/disabled/non-date fields excluded');
 await page.locator('#test-date').focus();assert.equal(await page.evaluate(()=>pickerCalls.length),before,'keyboard focus does not force a picker');
 // Browsers that reject showPicker retain the native default interaction.
 await page.evaluate(()=>{const field=document.querySelector('#test-date');field.showPicker=()=>{throw new DOMException('Unavailable','NotAllowedError')};window.fallbackEvent=new MouseEvent('click',{bubbles:true,cancelable:true});field.dispatchEvent(fallbackEvent)});
 assert.equal(await page.evaluate(()=>fallbackEvent.defaultPrevented),false);
 assert.deepEqual(errors,[]);console.log('PASS browser: native picker from all date segments/icon, rerenders, dynamic dialogs, date-time/month/week controls, disabled/readonly exclusions and fallback.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
