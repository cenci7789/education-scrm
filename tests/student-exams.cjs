const assert=require('node:assert/strict');
const {run,node,page,context}=require('./lead-registration.cjs');
const set=(id,value)=>node('#'+id).value=value;
run(`permissionChangeIdentity('academic');state.currentUser={id:'exam-user',name:'自动记录老师',role:'教务岗'};
a.students=[{id:'exam-student',name:'成绩学生',grade:'小五',phone:'13812345678'},{id:'another-student',name:'另一学生',learningRecords:[{type:'考试成绩',title:'别人的成绩',score:99,total:100,date:'2026-01-01'}]}];a.orders=[];trialState.requests=[];
studentTermOpenStudent('exam-student');studentProfileTab('学习档案');studentProfileState.archiveType='考试成绩';academicRender();studentArchiveOpen();`);
for(const text of ['年级','学期','科目','考试类型','得分','满分','市排','区排','校排','班排','上传试卷','上传答题卡','保存时自动记录时间','自动记录老师'])assert(page().includes(text));
assert(page().includes('id="archive-manual-recorder" hidden'));
function fill(){for(const [id,value] of Object.entries({'archive-date':'2026-01-02','archive-grade':'小五','archive-term':'2025-秋季','archive-subject':'数学','archive-exam-type':'期末考试','archive-score':'89.5','archive-total':'120','archive-rank-scope':'校排','archive-rank':'12','archive-class':'','archive-description':'函数薄弱，需复习\n老师说：“认真审题”','archive-exam-custom':'','profile-recorder':'999'}))set(id,value)}
fill();set('archive-grade','');run('studentArchiveSave()');assert.equal(run('a.students[0].learningRecords?.length||0'),0);
fill();set('archive-date','2026-02-30');run('studentArchiveSave()');assert.equal(run('a.students[0].learningRecords?.length||0'),0);
fill();set('archive-score','121');run('studentArchiveSave()');assert.equal(run('a.students[0].learningRecords?.length||0'),0);
fill();set('archive-rank','1.5');run('studentArchiveSave()');assert.equal(run('a.students[0].learningRecords?.length||0'),0);
fill();set('archive-rank-scope','');run('studentArchiveSave()');assert.equal(run('a.students[0].learningRecords?.length||0'),0);
fill();run("studentArchiveAddFiles([{name:'期末试卷.pdf',size:100,type:'application/pdf'}],'试卷');studentArchiveAddFiles([{name:'答题卡.png',size:100,type:'image/png'}],'答题卡')");
assert(node('#archive-files').innerHTML.includes('试卷：期末试卷.pdf'));assert(node('#archive-files').innerHTML.includes('答题卡：答题卡.png'));
const before=Date.now();run('studentArchiveSave()');const r=JSON.parse(run('JSON.stringify(a.students[0].learningRecords[0])'));
assert.equal(r.score,89.5);assert.equal(r.total,120);assert.equal(r.rankScope,'校排');assert.equal(r.rankValue,12);assert.equal(r.operator.name,'自动记录老师');assert.equal(r.operator.account,'exam-user');assert(Date.parse(r.recordedAt)>=before);
for(const text of ['<th>年级·学期</th>','<th>记录时间</th>','<th>记录人</th>','小五 · 2025年秋季','89.5 / 120','校排 第12名','download="期末试卷.pdf"','download="答题卡.png"','整表导出'])assert(page().includes(text));
assert(!page().includes('别人的成绩'));
run("state.currentUser.name='后来更名';a.students[0].grade='初一';academicRender()");assert(page().includes('自动记录老师'));assert(page().includes('小五 · 2025年秋季'),'historical grade and author are snapshots');
run('studentArchiveOpen()');fill();set('archive-exam-type','其他');set('archive-exam-custom','竞赛测评');set('archive-rank-scope','');set('archive-rank','');set('archive-score','0');run('studentArchiveSave()');assert.equal(run('a.students[0].learningRecords[1].examType'),'竞赛测评');assert.equal(run('a.students[0].learningRecords[1].score'),0);
run("a.students[0].learningRecords.push({type:'考试成绩',title:'旧成绩',score:80,total:100,rank:'3/30',description:'=SUM(A1:A2)',date:'2025-01-02'});academicRender()");assert(page().includes('旧成绩'));assert(page().includes('3/30'));assert(page().includes('未记录'));
let downloaded,clicked=false,blob;
context.Blob=Blob;context.URL.createObjectURL=value=>{blob=value;return 'blob:exam-export'};
context.document.createElement=()=>downloaded={click(){clicked=true},remove(){}};
context.document.body={appendChild(){}};
run('studentExamExport()');assert(clicked);assert.equal(downloaded.download,'成绩学生_exam-student_考试成绩.csv');
async function verify(){
 const csv=await blob.text();assert(csv.includes('记录时间'));assert(csv.includes('记录人'));assert(csv.includes('自动记录老师'));assert(csv.includes('期末试卷.pdf'));assert(csv.includes('答题卡.png'));assert(csv.includes("'=SUM(A1:A2)"));assert(!csv.includes('blob:'));assert(!csv.includes('别人的成绩'));
 assert.equal(run('studentExamExportRows(a.students[0]).length'),3);assert.equal(run('studentExamExportRows(a.students[0])[0].length'),9);
 run("studentProfileState.archiveType='学习事件';studentArchiveOpen()");assert.equal(run('studentProfileState.archiveDraft.type'),'学习事件');assert(page().includes('id="archive-score-fields" hidden'));assert(page().includes('id="archive-auto-recorder" hidden'));
 console.log('PASS: exam fields and validation, table/downloads, automatic author/time snapshots, legacy rows, full CSV export and other archive categories.');
}
verify().catch(error=>{console.error(error);process.exitCode=1});
