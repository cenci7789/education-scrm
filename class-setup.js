// Classroom capacities are shared by campus configuration and class creation.
for(const campus of state.campuses){
  if(Array.isArray(campus.classrooms))continue;
  campus.classrooms=[];
  for(const cls of a.classes.filter(c=>c.campus===campus.name)){
    if(!campus.classrooms.some(r=>r.name===cls.room))campus.classrooms.push({name:cls.room,capacity:cls.capacity,address:'',note:''});
  }
}
function classCampusRooms(name){return state.campuses.find(c=>c.name===name)?.classrooms||[]}
function classRoomCapacity(campus,room){return classCampusRooms(campus).find(r=>r.name===room)?.capacity}
let classTeacherSequence=0;
function classAcademicTeacherStaff(){
  for(const person of state.staff)person.classTeacherId??=`class-teacher-${Date.now()}-${++classTeacherSequence}`;
  return state.staff;
}
function classAcademicTeacherLabel(cls){return classAcademicTeacherStaff().find(p=>p.classTeacherId===cls.academicTeacherId)?.name||cls.academicTeacher||''}
function classAcademicTeacherSelect(cls){
  const staff=classAcademicTeacherStaff(),selected=cls?.academicTeacherId||'';
  const options=staff.filter(p=>p.active||p.classTeacherId===selected);
  return `<select class="select" id="class-academic-teacher" required aria-label="教务老师"><option value="">请选择教务老师</option>${selected&&!staff.some(p=>p.classTeacherId===selected)?`<option value="${esc(selected)}" selected disabled>${esc(cls.academicTeacher||'原教务老师')}（已移除）</option>`:''}${options.map(p=>`<option value="${esc(p.classTeacherId)}"${p.classTeacherId===selected?' selected':''}${p.active?'':' disabled'}>${esc(p.name)}${p.campus?' · '+esc(p.campus):''}${p.active?'':'（已停用）'}</option>`).join('')}</select>`;
}
function classSetupSelect(id,values,placeholder,value,change=''){
  return `<select class="select" id="${id}"${change?` onchange="${change}"`:''}><option value="">${placeholder}</option>${values.map(v=>`<option value="${esc(v)}"${v===value?' selected':''}>${esc(v)}</option>`).join('')}</select>`;
}
function classOpenCreate(courseIndex=null){a.selectedClass=null;a.classCreationCourse=courseIndex;nav('classForm')}
const classSetupOriginalForm=classForm;
classForm=function(){
  const cls=a.selectedClass===null?null:a.classes[a.selectedClass];
  const course=cls?.course||a.courses[a.classCreationCourse]?.name||'';
  a.classCreationCourse=null;
  let html=classSetupOriginalForm();
  const selects={
    'class-course':classSetupSelect('class-course',a.courses.map(c=>c.name),'请选择课程',course,'classCourseChanged()'),
    'class-campus-form':classSetupSelect('class-campus-form',state.campuses.filter(c=>c.active||c.name===cls?.campus).map(c=>c.name),'请选择校区',cls?.campus,'classCampusChanged()'),
    'class-room':classSetupSelect('class-room',classCampusRooms(cls?.campus).map(r=>r.name),'请选择教室',cls?.room,'classRoomChanged()'),
    'class-teacher-form':classSetupSelect('class-teacher-form',[...new Set([...state.staff.filter(s=>s.active).map(s=>s.name),cls?.teacher].filter(Boolean))],'请选择老师',cls?.teacher)
  };
  for(const [id,markup] of Object.entries(selects))html=html.replace(new RegExp(`<select[^>]*id="${id}"[^>]*>[\\s\\S]*?</select>`),markup);
  html=html.replace(/<input[^>]*id="class-name"[^>]*>/,()=>`<input class="input" id="class-name" placeholder="请输入班级名称" value="${esc(cls?.name||course)}" data-course-name="${esc(course)}">`);
  html=html.replace(/<input[^>]*id="class-capacity"[^>]*>/,()=>`<input class="input" id="class-capacity" type="number" value="${esc(classRoomCapacity(cls?.campus,cls?.room)??'')}" placeholder="选择教室后自动带入" readonly aria-readonly="true"><div class="help">由所选教室的容量自动带入</div>`);
  html=html.replace('调课虚位','虚设座位').replace(/<input[^>]*id="class-extra"[^>]*>/,()=>`<input class="input" id="class-extra" type="number" min="0" step="1" value="${esc(cls?.virtualSeats??5)}">`);
  html=html.replace('<div class="field"><label class="required">时间冲突</label>',()=>aField('教务老师',classAcademicTeacherSelect(cls),true)+'<div class="field"><label class="required">时间冲突</label>');
  return html;
};
function classCourseChanged(){
  const input=$('#class-name'),course=$('#class-course').value;
  if(!input.value.trim()||input.value===input.dataset.courseName)input.value=course;
  input.dataset.courseName=course;
}
function classCampusChanged(){
  const select=$('#class-room');
  select.innerHTML='<option value="">请选择教室</option>'+classCampusRooms($('#class-campus-form').value).map(r=>`<option value="${esc(r.name)}">${esc(r.name)}</option>`).join('');
  select.value='';classRoomChanged();
}
function classRoomChanged(){$('#class-capacity').value=classRoomCapacity($('#class-campus-form').value,$('#class-room').value)??''}
saveClass=function(){
  const name=$('#class-name').value.trim(),course=$('#class-course').value,campus=$('#class-campus-form').value,room=$('#class-room').value;
  const capacity=Number(classRoomCapacity(campus,room)),extra=$('#class-extra').value.trim(),virtualSeats=Number(extra);
  if(!name){toast('请输入班级名称');return}
  if(!a.courses.some(c=>c.name===course)){toast('请选择课程');return}
  if(!Number.isInteger(capacity)||capacity<1){toast('请选择已设置容量的教室');return}
  if(extra===''||!Number.isInteger(virtualSeats)||virtualSeats<0){toast('虚设座位请输入大于等于0的整数');return}
  const academicTeacher=classAcademicTeacherStaff().find(p=>p.classTeacherId===$('#class-academic-teacher').value&&p.active);
  if(!academicTeacher){toast('请选择已启用的教务老师');return}
  const teacher=$('#class-teacher-form').value;
  if(!teacher||!state.staff.some(s=>s.active&&s.name===teacher)){toast('请选择已启用的授课老师');return}
  const schedule=classSchedulePayload();if(!schedule)return;
  const existing=a.selectedClass===null?null:a.classes[a.selectedClass];
  const cls={...existing,id:existing?.id||String(Date.now()).slice(-7),name,course,campus,room,capacity,virtualSeats,
    academicTeacherId:academicTeacher.classTeacherId,academicTeacher:academicTeacher.name,
    teacher:$('#class-teacher-form').value||existing?.teacher||'',students:existing?.students||0,status:existing?.status||'未开课',
    ...schedule};
  cls.status=classScheduleStatus(cls);
  if(existing)a.classes[a.selectedClass]=cls;else a.classes.unshift(cls);
  a.selectedClass=null;nav('classes');toast('班级已保存');
};

// Retain legacy campus totals; only known classroom records are editable.
function campusRoomFields(room={}){
  return `<div class="subcard room"><div class="subcard-head"><h3>${esc(room.name||'新教室')}</h3><button class="btn small danger" onclick="this.closest('.room').remove()">移除</button></div><div class="form-grid"><div class="field"><label class="required">教室名称</label><input class="input room-name" value="${esc(room.name||'')}" placeholder="例如：A101"></div><div class="field"><label class="required">教室限额</label><input class="input room-capacity" type="number" min="1" step="1" value="${esc(room.capacity??'')}" placeholder="可容纳人数"></div><div class="field full"><label>教室地址</label><input class="input room-address" value="${esc(room.address||'')}" placeholder="默认同校区地址，可修改"></div><div class="field full"><label>备注</label><textarea class="textarea room-note">${esc(room.note||'')}</textarea></div></div></div>`;
}
const classSetupCampusForm=campusForm;
campusForm=function(){
  const campus=state.campusEdit===null?null:state.campuses[state.campusEdit];
  let html=classSetupCampusForm();
  if(campus?.classrooms?.length)html=html.replace(`<div class="pill">现有教室 ${campus.rooms} 间，坐席 ${campus.seats} 个</div>`,()=>`<div class="pill">现有教室 ${campus.rooms} 间，坐席 ${campus.seats} 个</div>${campus.classrooms.map(campusRoomFields).join('')}`);
  return html;
};
let campusRoomDialogContext=null;
addRoom=function(){
  if(state.page!=='campus'||state.mode!=='form'||!permissionCanVisit('campus')||$('#campus-room-dialog'))return;
  const campus=state.campusEdit===null?null:state.campuses[state.campusEdit],list=$('#room-list');
  if(!list)return;
  campusRoomDialogContext={campus,index:state.campusEdit,list,actor:permissionState.identity,trigger:document.activeElement};
  $('#view').insertAdjacentHTML('beforeend',`<div class="modal-backdrop" id="campus-room-dialog" style="z-index:1000"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="campus-room-title" style="width:min(520px,95vw)"><div class="modal-head"><h2 id="campus-room-title">添加教室</h2><button type="button" class="btn small" aria-label="关闭添加教室" onclick="campusRoomClose()">×</button></div><form onsubmit="event.preventDefault();campusRoomSave()" novalidate><div class="field"><label class="required" for="campus-room-name">教室名称</label><input class="input" id="campus-room-name" placeholder="请输入教室名称" required></div><div class="field" style="margin-top:18px"><label class="required" for="campus-room-capacity">教室限额</label><input class="input" id="campus-room-capacity" type="number" min="1" step="1" placeholder="请输入可容纳人数" required></div><div class="field" style="margin-top:18px"><label for="campus-room-note">备注信息</label><textarea class="textarea" id="campus-room-note" placeholder="选填"></textarea></div>${campus?'':'<p class="help">新校区的教室将在创建校区时一并保存。</p>'}<p id="campus-room-error" role="alert" style="color:#d84b56;margin-bottom:0"></p><div class="modal-actions" style="justify-content:flex-end"><button type="button" class="btn" onclick="campusRoomClose()">取消</button><button type="submit" class="btn primary">保存</button></div></form></section></div>`);
  $('#campus-room-dialog').addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();campusRoomClose()}else if(event.key==='Tab'){const controls=[...$('#campus-room-dialog').querySelectorAll('button,input,textarea')],first=controls[0],last=controls.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}}});
  $('#campus-room-dialog').addEventListener('input',()=>{$('#campus-room-error').textContent=''});
  $('#campus-room-name').focus();
};
function campusRoomClose(){const trigger=campusRoomDialogContext?.trigger;$('#campus-room-dialog')?.remove();campusRoomDialogContext=null;if(trigger?.isConnected)trigger.focus()}
function campusRoomSave(){
  const ctx=campusRoomDialogContext;
  if(!ctx||!$('#campus-room-dialog'))return;
  if(state.page!=='campus'||state.mode!=='form'||!permissionCanVisit('campus')||ctx.actor!==permissionState.identity||ctx.index!==state.campusEdit||ctx.campus!==(state.campusEdit===null?null:state.campuses[state.campusEdit])||!ctx.list.isConnected){campusRoomClose();return}
  const name=$('#campus-room-name').value.trim(),raw=$('#campus-room-capacity').value,capacity=Number(raw),note=$('#campus-room-note').value.trim();
  const error=(message,id)=>{$('#campus-room-error').textContent=message;$(id).focus()};
  if(!name)return error('请填写教室名称','#campus-room-name');
  if(!raw||!Number.isSafeInteger(capacity)||capacity<1)return error('教室限额请输入大于0的整数','#campus-room-capacity');
  if([...ctx.list.querySelectorAll('.room-name')].some(el=>el.value.trim()===name)||ctx.campus?.classrooms?.some(room=>room.name===name))return error('同一校区的教室名称不能重复','#campus-room-name');
  const room={name,capacity,note,address:''};
  if(ctx.campus){ctx.campus.classrooms=[...(ctx.campus.classrooms||[]),room];ctx.campus.rooms=Number(ctx.campus.rooms||0)+1;ctx.campus.seats=Number(ctx.campus.seats||0)+capacity;const totals=ctx.list.querySelector('.pill');if(totals)totals.textContent=`现有教室 ${ctx.campus.rooms} 间，坐席 ${ctx.campus.seats} 个`}
  ctx.list.querySelector('.empty')?.remove();ctx.list.insertAdjacentHTML('beforeend',campusRoomFields(room));
  campusRoomClose();toast(ctx.campus?'教室已保存':'教室已添加，创建校区时一并保存');
}
saveCampus=function(){
  const name=$('#campus-name').value.trim(),address=$('#campus-address').value.trim();
  if(!name||!address){toast('请填写校区名称和详细地址');return}
  const existing=state.campusEdit===null?null:state.campuses[state.campusEdit];
  if(state.campuses.some(c=>c!==existing&&c.name===name)){toast('校区名称已存在');return}
  const classrooms=Array.from(document.querySelectorAll('.room'),r=>({name:r.querySelector('.room-name').value.trim(),capacity:Number(r.querySelector('.room-capacity').value),address:r.querySelector('.room-address').value.trim(),note:r.querySelector('.room-note').value.trim()}));
  if(classrooms.some(r=>!r.name||!Number.isInteger(r.capacity)||r.capacity<1)){toast('请填写教室名称和大于0的整数容量');return}
  if(new Set(classrooms.map(r=>r.name)).size!==classrooms.length){toast('同一校区的教室名称不能重复');return}
  const previous=existing?.classrooms||[],previousSeats=previous.reduce((n,r)=>n+Number(r.capacity),0);
  const campus={...existing,name,active:existing?.active??true,address:'江苏省 苏州市 姑苏区 '+address,merchant:$('#campus-merchant').value,classrooms,
    rooms:Math.max(0,(existing?.rooms||0)-previous.length)+classrooms.length,
    seats:Math.max(0,(existing?.seats||0)-previousSeats)+classrooms.reduce((n,r)=>n+r.capacity,0)};
  if(existing){state.campuses[state.campusEdit]=campus;for(const cls of a.classes)if(cls.campus===existing.name)cls.campus=name}
  else state.campuses.push(campus);
  state.mode='list';render();toast('校区已保存');
};
