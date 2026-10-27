// Legacy marketing selections use course indices. Rebase them when a new course is inserted.
const catalogIntegritySaveCourse=saveCourse;
saveCourse=function(){
 const before=a.courses.slice(),old=a.selectedClass===null?null:a.courses[a.selectedClass];const result=catalogIntegritySaveCourse();
 if(state.page!=='course'||a.courses.length===before.length&&old===a.courses[before.indexOf(old)])return result;
 const mapping=new Map(before.map((course,index)=>[index,a.courses.findIndex(c=>c===course||(old===course&&before.length===a.courses.length&&a.courses.indexOf(c)===index))]));
 const rebase=values=>(values||[]).map(i=>mapping.get(Number(i))).filter(i=>Number.isInteger(i)&&i>=0);
 mallState.shelved=rebase(mallState.shelved);mallState.hiddenShelved=rebase(mallState.hiddenShelved);mallState.selected=[];
 const offered={};for(const [key,value] of Object.entries(mallShelfState.offered)){const index=mapping.get(Number(key));if(index>=0)offered[index]=value}mallShelfState.offered=offered;mallShelfState.choices={};mallShelfState.modal=null;mallShelfState.confirmation=null;
 for(const type of ['group','joint'])for(const activity of mallState.activities[type]||[]){const products=activity[type+'Products']||[];for(const p of products){const next=mapping.get(Number(p.courseIndex));if(next>=0){p.courseIndex=next;p.key='course:'+next;if(old&&p.name===old.name)p.name=a.courses[next].name}}}
  for(const type of ['coupon','invite'])for(const activity of mallState.activities[type]||[])for(const p of activity.config?.courses||[]){const next=mapping.get(Number(p.index));if(next>=0){p.index=next;p.name=a.courses[next].name}}
 return result;
};
const catalogIntegritySaveClass=saveClass;
saveClass=function(){const old=a.selectedClass===null?null:a.classes[a.selectedClass],id=old?.id,name=old?.name;const result=catalogIntegritySaveClass();const updated=id&&a.classes.find(c=>c.id===id);if(state.page==='classes'&&updated&&name!==updated.name){for(const s of a.students){if(Array.isArray(s.classNames))s.classNames=s.classNames.map(n=>n===name?updated.name:n);s.className=String(s.className||'').split('、').map(n=>n===name?updated.name:n).join('、')}}return result};
const catalogIntegrityValidClasses=enrollmentValidClasses;
enrollmentValidClasses=function(){if(!catalogIntegrityValidClasses())return false;const student=enrollmentStudent();if(student){const active=transferActiveClasses(student.id);if(enrollmentSelectedClasses().some(item=>active.has(item.classId))){toast('学生已在所选班级就读，请勿重复报名；欠费请办理补费');return false}}for(const item of enrollmentSelectedClasses()){if(Number(item.class.students||0)>=Number(item.class.capacity)+Number(item.class.virtualSeats||0)){toast('所选班级已满员，请重新选择');return false}}return true};
