const assert=require('node:assert/strict');
const {run,node,page,context}=require('./lead-registration.cjs');
context.URL={createObjectURL:()=> 'blob:communication',revokeObjectURL(){}};
run("permissionChangeIdentity('sales');leadDetail(0,'myLeads')");
const snapshot=()=>run('JSON.stringify(leadState.leads[0])');
const history=()=>run('leadState.leads[0].history.length');
const intent=()=>run('leadState.leads[0].intent');
function fill({channel='电话',result='有效沟通',decision='',reason='',note='家长反馈本周暂不方便到校',time=''}={}){
  node('#follow-channel').value=channel;
  node('#communication-result').value=result;
  node('#communication-intent').value=decision;
  node('#communication-reason').value=reason;
  node('#lead-record-note').value=note;
  node('#follow-time').value=time;
}
assert.equal(intent(),'','new registration starts unassessed');
assert(page().includes('待判断'));
assert.deepEqual(JSON.parse(run('JSON.stringify(leadIntentOptions)')),['高意向','中意向','低意向','无意向']);

// External channels lead to the same manual confirmation; opening/cancelling has no effects.
for(const channel of ['电话','企微']){
  const before=snapshot();
  run(`leadStartCommunication('${channel}')`);
  assert.equal(run('leadState.modal'),'communicationSession');
  assert(page().includes('尚未接入'));
  assert(page().includes(channel==='电话'?'完成沟通':'完成本次跟进'));
  run('leadCompleteCommunication()');
  assert.equal(run('leadRecordDraft.channel'),channel);
  assert(page().includes(`<option selected>${channel}</option>`));
  assert(page().includes('本次意向'));
  fill({channel,decision:'高意向',reason:'希望立即报名'});
  run('leadCloseUpload()');
  assert.equal(snapshot(),before);
}

run("leadOpenUpload('电话')");
let before=snapshot();
fill({result:''});run('leadSaveUpload()');assert.equal(snapshot(),before,'outcome required');
fill({});run('leadSaveUpload()');assert.equal(snapshot(),before,'effective call requires a choice');
fill({decision:'keep'});run('leadSaveUpload()');assert.equal(snapshot(),before,'cannot keep an unassigned level');
fill({decision:'高意向'});run('leadChangeCommunicationIntent()');
assert.equal(node('#communication-reason-field').hidden,false);
run('leadSaveUpload()');assert.equal(snapshot(),before,'change reason required');
fill({decision:'高意向',reason:'计划报名',note:'  '});
run('leadSaveUpload()');assert.equal(snapshot(),before,'explanation required');
fill({decision:'高意向',reason:'计划报名',time:'2020-01-01T10:00'});
run('leadSaveUpload()');assert.equal(snapshot(),before,'past follow-up blocked');
fill({decision:'高意向',reason:'计划报名',time:'invalid'});
run('leadSaveUpload()');assert.equal(snapshot(),before,'invalid follow-up blocked');

// Every supported level updates list/profile/history with human-entered rationale.
for(const level of ['高意向','中意向','低意向','无意向']){
  run("leadOpenUpload('企微')");
  const old=intent(),n=history(),stage=run('leadState.leads[0].status');
  fill({channel:'企微',decision:level,reason:'家长反馈 <明确> & 已核实',note:'本轮企微交流已结束'});
  run('leadSaveUpload()');
  assert.equal(intent(),level);assert.equal(history(),n+1);
  assert.equal(run('leadState.leads[0].status'),stage,'no-intent does not automatically archive');
  assert.equal(run('leadState.leads[0].history.at(-1)[3].communication.previousIntent'),old);
  assert.equal(run('leadState.leads[0].history.at(-1)[3].communication.actor'),'王敏');
  assert.equal(run('leadState.leads[0].history.at(-1)[3].communication.channel'),'企微');
  assert(page().includes('家长反馈 &lt;明确&gt; &amp; 已核实'));
  assert(page().includes('本轮企微交流已结束'));
  assert(run('myLeadsPage()').includes(level));
  assert.equal(run('shortcutIntent(leadState.leads[0])'),level);
  run('leadSaveUpload()');assert.equal(history(),n+1,'repeat submission does not duplicate');
}

// Ineffective outcomes and explicit inability to judge always preserve prior intention.
for(const result of ['未接通','暂不方便','无有效回复']){
  run("leadOpenUpload('电话')");const old=intent(),n=history(),next=run('leadState.leads[0].next');
  fill({result,decision:'高意向',reason:'不应采用'});run('leadChangeCommunicationResult()');
  assert.equal(node('#communication-intent').disabled,true);
  assert.equal(node('#communication-reason-field').hidden,true);
  run('leadSaveUpload()');assert.equal(intent(),old);assert.equal(history(),n+1);
  assert.equal(run('leadState.leads[0].next'),next);
  assert.equal(run('leadState.leads[0].history.at(-1)[3].communication.reason'),'');
}
for(const decision of ['unknown','keep']){
  run('leadOpenUpload()');fill({decision});run('leadChangeCommunicationResult()');
  assert.equal(node('#communication-intent').disabled,false);
  const old=intent();run('leadSaveUpload()');assert.equal(intent(),old);
}
run("leadState.leads[0].intent='';leadOpenUpload()");
fill({decision:'unknown'});run('leadSaveUpload()');
assert.equal(intent(),'');assert(page().includes('待判断'));

// Optional next contact time, dedicated follow-up entry, and protected business stages.
const future=new Date(Date.now()+7*86400000).toISOString().slice(0,16);
run("leadState.modal='follow';leadRender()");
fill({decision:'中意向',reason:'已认可课程，但时间待定',time:future});
node('#follow-note').value='电话沟通后约定下周回访';
let n=history();run('saveFollow()');
assert.equal(history(),n+1);assert.equal(intent(),'中意向');
assert.equal(run('leadState.leads[0].next'),future.replace('T',' '));
assert.equal(run('leadState.leads[0].stage'),'跟进中');
run('saveFollow()');assert.equal(history(),n+1);
for(const [stage,status] of [['已报名','mine'],['冷宫池','cold']]){
  run(`leadState.leads[0].stage='${stage}';leadState.leads[0].status='${status}';leadOpenUpload()`);
  fill({decision:'keep'});run('leadSaveUpload()');
  assert.equal(run('leadState.leads[0].stage'),stage);
}
assert.equal(run('shortcutIntent({...leadState.leads[0],stage:"已报名"})'),'中意向','enrollment and intention stay separate');

// Basic information and its optional record save atomically after validation.
run("leadOpenForm('edit')");
node('#lead-name').value='不可提前保存的姓名';node('#lead-phone').value='13812345678';
node('#lead-edit-note').value='补充沟通记录';
fill({decision:'高意向',reason:''});
before=snapshot();run('saveLead()');assert.equal(snapshot(),before);
node('#communication-reason').value='已确定报名时间';
run('saveLead()');assert.equal(intent(),'高意向');
assert.equal(run('leadState.leads[0].name'),'不可提前保存的姓名');
assert.equal(run('leadState.leads[0].history.at(-1)[0]'),'信息记录');
run("leadOpenForm('edit')");
node('#lead-edit-note').value='';
fill({decision:'低意向',reason:'时间无法匹配'});
before=snapshot();run('saveLead()');
assert.equal(snapshot(),before,'choosing an intention without an explanation cannot silently save');
assert.equal(run('leadState.modal'),'form');
run('leadCloseForm()');

// Public registration entrance cannot open or submit follow-up, even for a sales role.
run("leadDetail(0,'quickRegister')");
before=snapshot();
for(const action of ["leadStartCommunication('电话')","leadStartCommunication('企微')","leadCompleteCommunication()","leadOpenUpload()","saveFollow()"]){
  run(action);assert.equal(snapshot(),before);
}
assert(!page().includes('lead-detail-dock'));
assert(!page().includes('communication-fields'));
console.log('PASS: four manual intention levels; phone/WeCom completion; required outcome/explanation/change reason; preserved intent on ineffective/unjudged contact; history/audit/list sync; cancel/duplicate safety; follow-up time; stage protection; atomic basic edit; shortcut restrictions.');
