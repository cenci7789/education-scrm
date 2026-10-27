const assert=require('node:assert/strict'),{run,json}=require('./prototype-runtime.cjs')();
run(`var numberedClass={id:'numbered',sessions:[{id:'first',name:'第一课题',startsAt:'2000-01-01T08:00'},{id:'second',name:'风筝模型',startsAt:'2099-10-31T08:00'},{id:'third',name:'等角模型',startsAt:'2099-11-07T08:00'}]}`);
assert.deepEqual(json('trialUpcomingSessions(numberedClass).map(s=>[s.id,s.number,s.name])'),[['second',2,'风筝模型'],['third',3,'等角模型']]);
assert.match(run('trialSessionNameHTML(trialUpcomingSessions(numberedClass)[0])'),/第2讲<\/span>风筝模型/);
assert.equal(run("trialSessionNameHTML({number:2,name:'第2讲'})"),'第2讲');
assert.equal(run("trialClassSessions({id:'legacy',sessions:[{session:'第8讲',date:'2099-01-01',time:'08:00–10:00'}]})[0].number"),8);
assert.equal(run("trialClassSessions({id:'explicit',sessions:[{number:5,name:'题目',date:'2099-01-01',time:'08:00–10:00'}]})[0].number"),5);
assert(run("trialSessionNameHTML({number:2,name:'<img src=x>'})").includes('&lt;img'));
console.log('PASS: original lesson numbers survive past-session filtering, explicit/legacy numbers, no duplicate default labels and escaped names.');
