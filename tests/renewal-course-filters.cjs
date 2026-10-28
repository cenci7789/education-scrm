const assert=require('node:assert/strict');
const {run,json,node,handlers}=require('./prototype-runtime.cjs')();
run(`permissionChangeIdentity('admin');state.page='system';render();systemConfigSelect('续报配置');
 a.courses=[{id:'M',name:'数学课',year:2026,term:'秋季',subject:'数学',grade:'3年级',teachingFormat:'面授'},
 {id:'C',name:'语文课',year:2026,term:'秋季',subject:'语文',grade:'4年级',teachingFormat:'直播'},
 {id:'N',name:'未建班课程',year:2026,term:'秋季',subject:'英语',grade:'3年级',teachingFormat:'面授'}];
 a.classes=[{id:'A',name:'数学周六班',course:'数学课',campus:'甲校区',teacher:'教师甲',academicTeacher:'教务甲',date:'2099-01-01',time:'08:00–10:00'},
 {id:'B',name:'数学周日班',course:'数学课',campus:'乙校区',teacher:'教师乙',academicTeacher:'教务乙',date:'2099-01-02',time:'08:00–10:00'},
 {id:'C',name:'语文周六班',course:'语文课',campus:'甲校区',teacher:'教师丙',date:'2099-01-03',time:'08:00–10:00'}];
 renewalPeriodEdit();Object.assign(renewalPeriodDraft,{year:2026,term:'秋季',scopeType:'course'});render();`);
const ids=()=>json('renewalCourseFiltered().map(row=>row.id)');
assert.deepEqual(ids(),['M','C','N']);handlers();
run("renewalCourseSetFilter('grade',enrollmentGradeKey('3年级'))");assert.deepEqual(ids(),['M','N']);
run("renewalCourseSetFilter('subject','数学')");assert.deepEqual(ids(),['M']);
run("renewalCourseResetFilters();renewalCourseSetFilter('campus','甲校区');renewalCourseSetFilter('teacher','教师乙')");
assert.deepEqual(ids(),[],'filters cannot combine attributes of two different classes');
run("renewalCourseSetFilter('teacher','教务甲')");assert.deepEqual(ids(),['M']);
run("renewalCourseSetFilter('search','周日')");assert.deepEqual(ids(),[]);
run("renewalCourseSetFilter('search','数学')");assert.deepEqual(ids(),['M']);
run("renewalCourseResetFilters();renewalCourseSetFilter('search','未建班')");assert.deepEqual(ids(),['N']);
run("renewalCourseResetFilters();renewalCourseSetFilter('format','直播')");assert.deepEqual(ids(),['C']);
run("renewalPeriodChange('all',false);renewalCourseToggleVisible(true)");assert.deepEqual(json('renewalPeriodDraft.selected'),['C']);
run("renewalCourseSetFilter('format','面授');renewalPeriodToggle('M',true)");assert.deepEqual(json('renewalPeriodDraft.selected'),['C','M']);
run("renewalCourseSetFilter('search','无此班级');renewalCourseToggleVisible(true)");assert.deepEqual(json('renewalPeriodDraft.selected'),['C','M']);
assert(node('#renewal-course-results').innerHTML.includes('暂无符合条件'));
run("renewalCourseResetFilters();renewalPeriodChange('year',2027)");assert.deepEqual(ids(),[]);
assert.equal(run('renewalPeriodDraft.all'),true);
assert(json('Object.values(renewalCourseFilters)').every(value=>value===''));
console.log('PASS renewal course filters: course-name search and remaining filters, same-class combinations, empty results, unseen selections and multi-selection.');
