const assert=require('node:assert/strict');
const {run,node,page,context}=require('./lead-registration.cjs');
const set=(id,value)=>node('#'+id).value=value;
run(`permissionChangeIdentity('academic');
a.students=[{id:'linked',name:'统一档案',phone:'13812345678',originLeadId:'source',communications:[{id:'teacher',time:'2026-02-03T10:00',text:'教师学习反馈',role:'授课教师',operator:{name:'授课老师'},category:'教师沟通'}]},{id:'unlinked',name:'统一档案',phone:'13812345678'}];
leadState.leads=[{leadId:'source',history:[
 ['建档','01-01 10:00','家长建档时的招生内容',{operator:{name:'招生甲'},files:[{fileName:'招生.png',kind:'image',url:'blob:source-image'}]}],
 ['分配','01-02 09:00','分配至招生老师'],
 ['电话招生','2026-01-03 10:00','正式报名之前的招生',{recordedAt:'2026-01-03T10:00',operator:{name:'招生甲'}}],
 ['报名完成','2026-02-01 10:00','完成首次正式报名',{recordedAt:'2026-02-01T10:00'}],
 ['电话沟通','02-02 10:00','报名之后的招生联系'],
 ['面谈','2026-02-03 10:00','教务后续交流',{recordedAt:'2026-02-03T10:00',operator:{name:'教务乙',role:'教务岗'},communication:{channel:'面谈',result:'有效沟通'}}]
 ]},{leadId:'wrong',name:'统一档案',phone:'13812345678',history:[['建档','01-01','不应关联的同名记录']]}];
a.orders=[{studentId:'linked',createdAt:'2026-02-01T10:00',productCategory:'正价课',status:'交易成功',items:[]},{studentId:'linked',createdAt:'2026-03-01T10:00',productCategory:'正价课',status:'交易成功',items:[]}];trialState.requests=[];
a.students[0].history=[leadState.leads[0].history[0]];
studentTermOpenStudent('linked');studentCommunicationSetType('售前沟通');`);
for(const text of ['家长建档时的招生内容','正式报名之前的招生','分配至招生老师','招生.png','AI 沟通总结 · 售前沟通','话务呼叫','企微沟通','上传沟通记录'])assert(page().includes(text));
for(const text of ['报名之后的招生联系','教师学习反馈','教务后续交流','不应关联的同名记录'])assert(!page().includes(text));
assert.equal(run("studentProfileCommunications(a.students[0]).filter(r=>r.category==='售前沟通').length"),3,'all source entries before first enrollment, deduplicated');
assert.equal(run('studentProfileCommunications(a.students[1]).length'),0);
const original=run('JSON.stringify(leadState.leads[0].history)');
run("leadState.leads[0].history.splice(3,0,['企微招生','2026-01-20 10:00','补充的售前招生',{recordedAt:'2026-01-20T10:00'}]);academicRender()");assert(page().includes('补充的售前招生'),'live source updates without a copied history');
run("studentCommunicationSetType('教务沟通')");assert(page().includes('教务后续交流'));assert(page().includes('AI 沟通总结 · 教务沟通'));assert(!page().includes('正式报名之前的招生'));
run("studentCommunicationSetType('教师沟通')");assert(page().includes('教师学习反馈'));assert(page().includes('AI 沟通总结 · 教师沟通'));assert(!page().includes('教务后续交流'));
run("studentOpenCommunication(undefined,'电话')");assert(page().includes('value="电话" selected'));assert(page().includes('尚未接入'));assert(!page().includes('id="student-communication-category"'));
run("studentCommunicationCancel();studentOpenCommunication(undefined,'企微')");assert(page().includes('value="企微" selected'));
run("studentCommunicationCancel();studentOpenCommunication(undefined,'其他')");assert(page().includes('上传图片'));assert(page().includes('上传语音'));
run("state.currentUser={id:'academic-user',name:'教务丙',role:'教务岗'};leadRecordDraft.actorId=studentTermActor()");
for(const [id,value] of Object.entries({'student-communication-time':'2026-02-04T10:00','student-communication-channel':'企微','student-communication-contact':'妈妈','student-communication-result':'有效沟通','student-communication-next':'','lead-record-note':'来自教务入口的新记录','student-communication-category':'教师沟通'}))set(id,value);
run('studentCommunicationSave()');assert.equal(run('a.students[0].communications.at(-1).category'),'教务沟通','category follows entry context, not user-controlled field or selected tab');assert(page().includes('来自教务入口的新记录'));
assert.equal(run('leadState.leads[0].history.length'),JSON.parse(original).length+1,'academic save does not duplicate or rewrite lead history');
async function verifySummary(){
  await run('studentCommunicationRefreshSummary()');assert(page().includes('演示摘要'));
  let payload;context.crmSummarizeCommunications=async request=>{payload=request;return {text:'完整教务沟通的测试总结'}};
  await run('studentCommunicationRefreshSummary()');assert(page().includes('完整教务沟通的测试总结'));assert.equal(payload.category,'教务沟通');assert.equal(payload.records.length,2);assert(payload.records.every(r=>r.category==='教务沟通'));
  run("studentCommunicationSetType('教师沟通')");assert(!page().includes('完整教务沟通的测试总结'));await run('studentCommunicationRefreshSummary()');assert.equal(payload.records.length,1);assert.equal(payload.records[0].text,'教师学习反馈');
  run("studentCommunicationSetType('教务沟通');a.students[0].communications.push({id:'new-record',category:'教务沟通',text:'新记录使总结失效',time:'2026-02-05T10:00',operator:{name:'教务丙'}});academicRender()");assert(!page().includes('完整教务沟通的测试总结'),'stale summary invalidated when source changes');
  context.crmSummarizeCommunications=async()=>{throw Error('offline')};await run('studentCommunicationRefreshSummary()');assert(page().includes('生成失败'));assert(page().includes('新记录使总结失效'));
  console.log('PASS: live presale history, registration cutoff and dedupe, fixed academic channels, shared summary layout, AI adapter scoping, invalidation and failure fallback.');
}
verifySummary().catch(error=>{console.error(error);process.exitCode=1});
