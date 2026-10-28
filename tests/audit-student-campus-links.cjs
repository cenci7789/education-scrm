const assert=require('node:assert/strict');const {run}=require('./prototype-runtime.cjs')();
run(`a.orders=[];a.courses=[{name:'数学',year:2099,term:'春季'}];
a.classes=[{id:'C',name:'数学班',course:'数学',campus:'新校区名',sessions:[{id:'S',date:'2099-03-01',time:'08:00–10:00'}]}];
a.students=[{id:'S',name:'在读学生',enrollments:[{classId:'C',campus:'旧校区名',enrollmentStatus:'上课中'}]}];`);
assert.equal(run('studentTermEnrollments()[0].campus'),'新校区名','active roster uses the current class campus after a rename');
run("a.students[0].enrollments[0].enrollmentStatus='已退班'");
assert.equal(run('studentTermEnrollments()[0].campus'),'旧校区名','ended enrollment retains its historical campus snapshot');
console.log('PASS current campus filtering stays linked to the class; ended enrollment keeps historical campus.');
