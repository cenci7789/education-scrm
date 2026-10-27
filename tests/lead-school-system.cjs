const assert=require('node:assert/strict'),{run}=require('./prototype-runtime.cjs')();
for(const [system,stage,year,date,grade] of [
 ['63','小学',2020,'2026-08-31T12:00:00','小六'],['63','小学',2020,'2026-09-01T12:00:00','初一'],
 ['54','小学',2020,'2025-09-01T12:00:00','初一'],['54','小学',2020,'2028-09-01T12:00:00','初四'],
 ['54','小学',2020,'2029-09-01T12:00:00','高一'],['63','小学',2020,'2029-09-01T12:00:00','高一'],
 ['54','初中',2025,'2028-10-01T12:00:00','初四'],['63','初中',2026,'2028-10-01T12:00:00','初三'],
 ['54','高中',2029,'2032-09-01T12:00:00','已毕业'],['63','小学',2027,'2026-09-01T12:00:00','未入学']
])assert.equal(run(`leadSchoolGrade('${stage}',${year},new Date('${date}'),'${system}')`),grade);
assert.equal(run("leadSchoolGrade('小学','')"),null);
assert(run("leadSchoolYearOptions(2045).includes('value=\"2045\" selected')"));
run("state.config.年级.push(['初三',true,'初三',true],['初四',true,'初四',true]);leadState.leads[0].schoolSystem='54';leadState.leads[0].schools=[{stage:'小学',entryYear:new Date().getFullYear()-8}];leadRefreshSchoolGrades()");
assert.equal(run('leadState.leads[0].grade'),new Date().getMonth()<8?'初三':'初四');
run('a.enrollment=null;a.selectedStudent=-1;a.enrollingLeadId=leadState.leads[0].leadId;enrollmentEnsure()');
assert.equal(run('a.enrollment.data.schoolSystem'),'54');
assert.equal(run('trialStudentData(leadState.leads[0]).schoolSystem'),'54');
console.log('PASS: 63/54 grade progression, September boundaries, future entry, graduation and enrollment/trial system preservation.');
