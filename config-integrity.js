function auditCsvText(rows){return '\ufeff'+rows.map(row=>row.map(value=>'"'+String(value??'').replace(/^[=+@-]/,"'$&").replaceAll('"','""')+'"').join(',')).join('\r\n')}
function auditDownloadCSV(name,rows){const url=URL.createObjectURL(new Blob([auditCsvText(rows)],{type:'text/csv;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function auditExportOrders(){if(!permissionCanVisit('orders'))return;auditDownloadCSV('收费订单.csv',[['订单编号','学生ID','学生','课程/班级','应收','实收','状态','创建时间'],...orderFilteredRows().map(o=>[o.id,o.studentId,o.student,o.product,o.amount,o.paid,o.status,o.createdAt])])}
function auditExportStaff(){if(permissionState.identity!=='admin')return;auditDownloadCSV('员工.csv',[['姓名','手机号','性别','校区','职位','账号','状态'],...state.staff.map(s=>[s.name,s.phone,s.gender,staffCampusNames(s).join(' | ')||'分校',permissionRoleName(s.roleId),s.account||s.phone,s.active?'启用':'停用'])])}
const auditOrdersPage=ordersPage;
ordersPage=function(){return auditOrdersPage().replace("toast('导出为原型展示')",'auditExportOrders()')};
const auditStaffPage=permissionStaffPage;
permissionStaffPage=function(){return auditStaffPage().replace("toast('导出功能待业务确认')",'auditExportStaff()')};
const auditSystemPage=systemPage;
systemPage=function(){const org=state.organization||{};return auditSystemPage().replace('id="org-name"','id="org-name" value="'+esc(org.name||'')+'"').replace('<select class="select"><option value="" selected disabled>请选择省份</option><option>江苏省</option></select>','<select class="select" id="org-province"><option value="">请选择省份</option><option '+(org.province==='江苏省'?'selected':'')+'>江苏省</option></select>').replace('<select class="select"><option value="" selected disabled>请选择城市</option><option>苏州市</option></select>','<select class="select" id="org-city"><option value="">请选择城市</option><option '+(org.city==='苏州市'?'selected':'')+'>苏州市</option></select>').replace("toast('分校信息已保存（原型演示）')",'auditSaveOrganization()')};
function auditSaveOrganization(){if(!permissionCanVisit('system'))return;const name=$('#org-name').value.trim(),province=$('#org-province').value,city=$('#org-city').value;if(!name||!province||!city){toast('请填写分校名称并选择省市');return}state.organization={name,province,city};render();toast('分校信息已保存')}
const auditStaffForm=permissionStaffForm;
permissionStaffForm=function(){
 const old=state.staffEdit===null?null:state.staff[state.staffEdit],selected=staffCampusNames(old),options=[...new Set([...state.campuses.filter(c=>c.active).map(c=>c.name),...selected])];
 return auditStaffForm().replace(/<select[^>]*id="staff-campus"[\s\S]*?<\/select>/,()=>`<select class="select" id="staff-campus" aria-label="所属校区" multiple size="${Math.min(5,Math.max(2,options.length+1))}" style="height:auto"><option value="" ${selected.length?'':'selected'}>不选择校区（归属分校）</option>${options.map(name=>`<option value="${esc(name)}" ${selected.includes(name)?'selected':''}>${esc(name)}</option>`).join('')}</select>`);
};
const auditSaveStaff=permissionSaveStaff;
permissionSaveStaff=function(){
 if(permissionState.identity!=='admin')return;
 const old=state.staffEdit===null?null:state.staff[state.staffEdit],phone=$('#staff-phone').value.trim(),campuses=staffSelectedCampuses();
 if(!/^1\d{10}$/.test(phone)&&phone!==old?.phone){toast('请输入有效的11位手机号');return}
 if(state.staff.some(s=>s!==old&&s.phone===phone)){toast('该手机号已属于其他员工');return}
 if(campuses.some(name=>!state.campuses.some(c=>c.active&&c.name===name)&&!staffCampusNames(old).includes(name))){toast('请选择已启用校区，或留空归属分校');return}
 const before=old?.name;const result=auditSaveStaff();
 if(state.mode==='list'&&old){const updated=state.staff.find(s=>s.classTeacherId===old.classTeacherId&&s.phone===phone)||state.staff[state.staffEdit];if(updated&&before!==updated.name&&state.staff.filter(s=>s.name===before).length===0){for(const c of a.classes)if(c.teacher===before)c.teacher=updated.name;for(const lead of leadState.leads){if(lead.assignees?.some(p=>p.account&&(p.account===old.account||p.account===old.phone))){lead.assignees.forEach(p=>{if(p.account&&(p.account===old.account||p.account===old.phone))p.name=updated.name});lead.owner=lead.assignees.map(p=>p.name).join('、')}}}}
 return result;
};
const auditCampusForm=campusForm;
campusForm=function(){const old=state.campusEdit===null?null:state.campuses[state.campusEdit],parts=String(old?.address||'江苏省 苏州市 姑苏区').split(' '),district=parts[2]||'姑苏区';return auditCampusForm().replace(/<div class="inline"><select[\s\S]*?<\/div>/,()=>`<div class="inline">${classSetupSelect('campus-province',['江苏省'],'请选择省份',parts[0])}${classSetupSelect('campus-city',['苏州市'],'请选择城市',parts[1])}${classSetupSelect('campus-district',[...new Set(['姑苏区','工业园区','虎丘区',district])],'请选择区县',district)}</div>`).replace(/(<input id="campus-address"[^>]*value=")[^"]*(")/,(_,left,right)=>left+esc(parts.slice(3).join(' '))+right).replace(/<select id="campus-merchant"[\s\S]*?<\/select>/,()=>classSetupSelect('campus-merchant',[...new Set(['未绑定',old?.merchant].filter(Boolean))],'请选择收款主体',old?.merchant||'未绑定'))};
const auditSaveCampus=saveCampus;
saveCampus=function(){
 if(!permissionCanVisit('campus'))return;
 const old=state.campusEdit===null?null:state.campuses[state.campusEdit],province=$('#campus-province').value,city=$('#campus-city').value,district=$('#campus-district').value,detail=$('#campus-address').value.trim();
 if(!province||!city||!district){toast('请选择完整校区地址');return}
 const rooms=Array.from(document.querySelectorAll('.room'),r=>({name:r.querySelector('.room-name').value.trim(),capacity:Number(r.querySelector('.room-capacity').value)}));
 if(old){for(const cls of a.classes.filter(c=>c.campus===old.name)){const room=rooms.find(r=>r.name===cls.room);if(!room){toast('教室“'+cls.room+'”仍被班级使用，请先调整班级教室');return}if(room.capacity<Number(cls.students||0)){toast('教室容量不能小于在班人数');return}}}
 const oldName=old?.name,index=state.campusEdit;const result=auditSaveCampus();if(state.mode==='list'){const saved=old?state.campuses[index]:state.campuses.at(-1);saved.address=[province,city,district,detail].join(' ');if(oldName&&oldName!==saved.name){for(const s of state.staff){if(s.campus===oldName)s.campus=saved.name;if(Array.isArray(s.campuses))s.campuses=s.campuses.map(name=>name===oldName?saved.name:name);}for(const l of leadState.leads){if(l.ownershipCampus===oldName)l.ownershipCampus=saved.name;if(l.assignmentQueue?.campus===oldName)l.assignmentQueue.campus=saved.name;}for(const s of a.students)if(s.campus===oldName)s.campus=saved.name}for(const c of a.classes.filter(c=>c.campus===saved.name)){const room=saved.classrooms.find(r=>r.name===c.room);if(room)c.capacity=room.capacity}}
 return result;
};
