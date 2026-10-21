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
    'class-teacher-form':classSetupSelect('class-teacher-form',[...new Set(['袁老师','陈老师',cls?.teacher].filter(Boolean))],'请选择老师',cls?.teacher)
  };
  for(const [id,markup] of Object.entries(selects))html=html.replace(new RegExp(`<select[^>]*id="${id}"[^>]*>[\\s\\S]*?</select>`),markup);
  html=html.replace(/<input[^>]*id="class-name"[^>]*>/,()=>`<input class="input" id="class-name" placeholder="请输入班级名称" value="${esc(cls?.name||course)}" data-course-name="${esc(course)}">`);
  html=html.replace(/<input[^>]*id="class-capacity"[^>]*>/,()=>`<input class="input" id="class-capacity" type="number" value="${esc(classRoomCapacity(cls?.campus,cls?.room)??'')}" placeholder="选择教室后自动带入" readonly aria-readonly="true"><div class="help">由所选教室的容量自动带入</div>`);
  html=html.replace('调课虚位','虚设座位').replace(/<input[^>]*id="class-extra"[^>]*>/,()=>`<input class="input" id="class-extra" type="number" min="0" step="1" value="${esc(cls?.virtualSeats??5)}">`);
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
  const schedule=classSchedulePayload();if(!schedule)return;
  const existing=a.selectedClass===null?null:a.classes[a.selectedClass];
  const cls={...existing,id:existing?.id||String(Date.now()).slice(-7),name,course,campus,room,capacity,virtualSeats,
    teacher:$('#class-teacher-form').value||existing?.teacher||'袁老师',students:existing?.students||0,status:existing?.status||'未开课',
    ...schedule};
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
addRoom=function(){const list=$('#room-list');if(list.querySelector('.empty'))list.innerHTML='';list.insertAdjacentHTML('beforeend',campusRoomFields())};
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
