const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {run,node,page,context}=require('./lead-registration.cjs');
for(const file of ['structure.js','attendance-filters.js','schedule-calendar.js','withdraw-refund.js','refund-workflow.js','refund-call-flow.js','teacher-portal.js'])run(fs.readFileSync(path.join(__dirname,'..',file),'utf8'));
run(`state.currentUser={id:'teacher-a',account:'teacher-a-account',name:'授课甲',roleId:'teacher',active:true};permissionState.identity='teacher';
a.classes=[{id:'class-a',name:'甲班',teacher:'授课甲',teacherId:'teacher-a',course:a.courses[0].name,campus:'城中校区',room:'教室01',status:'开课中',sessions:[{id:'mon',name:'周一课程',date:'2026-10-19',time:'08:00–10:00'},{id:'wed',name:'周三课程',date:'2026-10-21',time:'09:00–11:00'},{id:'night',name:'跨日课程',startsAt:'2026-10-25T23:00',endsAt:'2026-10-26T01:00'},{id:'cancel',name:'已取消课程',date:'2026-10-21',time:'12:00–13:00',cancelled:true},{id:'sub',name:'其他老师代课',teacher:'授课乙',teacherId:'teacher-b',date:'2026-10-20',time:'14:00–15:00'},{id:'future',name:'未来课程',date:'2099-01-01',time:'09:00–10:00'}]},
{id:'class-b',name:'乙班',teacher:'授课乙',teacherId:'teacher-b',course:a.courses[1].name,campus:'园区校区',room:'教室02',status:'开课中',sessions:[{id:'other',name:'乙的课程',date:'2026-10-21',time:'08:00–09:00'},{id:'future-b',date:'2099-01-01',time:'09:00–10:00'}]},
{id:'class-old',name:'历史甲班',teacher:'授课乙',teacherId:'teacher-b',course:a.courses[0].name,status:'已结课',sessions:[]}];
a.orders=[];a.students=[{id:'s-a',name:'甲的学生',phone:'13811111111',status:'在读',enrollments:[{classId:'class-a',enrollmentStatus:'上课中'}]},
{id:'s-b',name:'乙的学生',phone:'13822222222',status:'在读',enrollments:[{classId:'class-b',enrollmentStatus:'上课中'}]},
{id:'s-old',name:'历史学生甲',phone:'13833333333',status:'在读',enrollments:[{classId:'class-old',enrollmentStatus:'已结课',teacher:'授课甲',teacherId:'teacher-a'}]}];nav('learningActive')`);
assert(page().includes('甲的学生'));assert(!page().includes('乙的学生'));assert(!page().includes('历史学生甲'));assert(!page().includes('演示授课老师'));
for(const text of ['学期','班级','年级','科目','校区','老师','授课形式','学生信息','沟通','课程','学生档案'])assert(page().includes(text),text);
assert(!run("permissionCanVisit('students')"),'teacher does not gain organization-wide student access');
run("studentTermSetFilter('search','未匹配')");assert(node('#student-term-results').innerHTML.includes('暂无符合条件'));run('studentTermResetFilters()');
run("learningOpenStudent('s-b','沟通')");assert.equal(run('state.page'),'learningActive','foreign student rejected');
run("learningOpenStudent('s-a','沟通')");assert.equal(run('state.page'),'studentDetail');assert(page().includes('返回学生'));assert(page().includes('话务呼叫'));assert.equal(node('#crumb').textContent,'教学 / 学生 / 沟通记录');assert.equal(run('studentProfileState.communicationType'),'教师沟通');
run("studentOpenCommunication('s-b','电话')");assert.equal(run('state.page'),'studentDetail');
run("studentOpenCommunication(undefined,'电话')");assert(page().includes('教师沟通'));assert(!page().includes('统一归为教务沟通'));
node('#student-communication-time').value='2026-01-01T09:00';node('#student-communication-channel').value='电话';node('#student-communication-contact').value='妈妈';node('#student-communication-result').value='有效沟通';node('#student-communication-next').value='';node('#lead-record-note').value='本周学习反馈';
run('studentCommunicationSave()');assert.equal(run('a.students[0].communications[0].category'),'教师沟通');assert.equal(run('a.students[0].communications[0].operator.account'),'teacher-a-account');
assert.equal(run('state.page'),'studentDetail');run('learningBack()');assert.equal(run('state.page'),'learningActive');
run("nav('learningHistory')");assert(page().includes('无权限'));assert(!page().includes('历史学生甲'));
run("nav('learningClasses')");assert(page().includes('甲班'));assert(!page().includes('乙班'));assert(!page().includes('历史甲班'));assert(!page().includes('创建班级'));assert(!run("permissionCanVisit('classes')"));
run("learningSetClassFilter('search','找不到')");assert(node('#learning-class-results').innerHTML.includes('暂无符合条件'));
run('learningResetClassFilters()');assert(page().includes('甲班'));
run("a.selectedStudent=1;nav('studentDetail')");assert(page().includes('无权限'));assert(!page().includes('乙的学生'));
run("nav('learningData')");assert.equal(run('learningCalendarView().date'),run('scheduleDateText(new Date())'));
run("learningSetDate('2026-10-21')");
for(const text of ['value="2026-10-19"','value="2026-10-25"','周一','周日','时间','周一课程','周三课程','跨日课程'])assert(page().includes(text),text);
assert(!page().includes('其他老师代课'));assert(!page().includes('乙的课程'));assert(!page().includes('已取消课程'));assert(!page().includes('未来课程'));assert(page().includes('top:120px;height:120px'));
run('learningMoveWeek(1)');assert(page().includes('value="2026-10-26"')&&page().includes('value="2026-11-01"'));assert(page().includes('跨日课程'));assert(page().includes('top:0px;height:60px'));
run("learningSetDate('2026-02-30')");assert.equal(run('learningCalendarView().date'),'2026-10-28');
run("learningSetDate('2026-10-21')");context.window={innerWidth:1000,innerHeight:800};node('#schedule-event-tooltip').style={};node('#schedule-event-tooltip').offsetHeight=300;
context.hoverButton={dataset:{scheduleKey:run('learningWeekLessons()[0].key')},getBoundingClientRect:()=>({right:500,top:200})};run('scheduleShowEvent(hoverButton)');assert(node('#schedule-event-tooltip').innerHTML.includes('甲班'));
run("state.currentUser={id:'teacher-b',account:'teacher-b-account',name:'授课乙',roleId:'teacher',active:true};nav('learningActive')");assert(page().includes('乙的学生'));assert(!page().includes('甲的学生'));run("nav('learningData');learningSetDate('2026-10-21')");assert(page().includes('乙的课程'));assert(page().includes('其他老师代课'));assert(!page().includes('周一课程'));
run("state.currentUser={id:'unassigned',name:'授课甲',roleId:'teacher',active:true};nav('learningActive')");assert(!page().includes('甲的学生'),'IDs take priority over matching names');
run("state.currentUser=null;permissionChangeIdentity('admin');nav('students')");assert(page().includes('甲的学生'));assert(page().includes('乙的学生'),'academic student list remains unchanged');
// Validate production script order and both sidebar-render / nav entry paths.
const vm=require('node:vm'),root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const shell=vm.createContext({document:context.document,URL,location:{href:'https://prototype.example.test/'},setTimeout(){},setInterval(){return 1},clearInterval(){}});
for(const match of html.matchAll(/<script(?: src="([^"]+)")?>([\s\S]*?)<\/script>/g))vm.runInContext(match[1]?fs.readFileSync(path.join(root,match[1]),'utf8'):match[2],shell);
for(const [route,title] of [['learningClasses','班级'],['learningActive','学生'],['learningData','课表']]){
  vm.runInContext(`permissionState.identity='teacher';state.page='${route}';render()`,shell);assert(page().includes(title));assert(!page().includes('无权限'));
  vm.runInContext(`nav('${route}')`,shell);assert(page().includes(title));
}
assert(html.includes('data-page="learningData">课表'));
assert(!html.includes('data-page="learningHistory"'));
assert(html.indexOf('data-page="learningClasses"')<html.indexOf('data-page="learningActive"'));
vm.runInContext("permissionRole('teacher').grants=['learningActive','learningHistory','learningData'];delete permissionRole('teacher').teachingMenuVersion;learningUpgradePermissions()",shell);
assert(vm.runInContext("permissionRole('teacher').grants.includes('learningClasses')",shell));
assert(!vm.runInContext("permissionRole('teacher').grants.includes('learningHistory')",shell));
vm.runInContext("permissionState.identity='academic';permissionRole('academic').grants.push('learningClasses')",shell);
assert(!vm.runInContext("permissionCanVisit('learningClasses')",shell));
vm.runInContext("permissionState.identity='teacher';permissionRole('teacher').grants=permissionRole('teacher').grants.filter(p=>p!=='learningClasses');learningUpgradePermissions()",shell);
assert(!vm.runInContext("permissionCanVisit('learningClasses')",shell),'later migration preserves revoked grants');
console.log('PASS: shared student UI, teacher class listing, current student ownership and removed history route, direct access guards, teacher communication attribution, return links, weekly time grid, substitutions, overnight events and identity isolation.');
