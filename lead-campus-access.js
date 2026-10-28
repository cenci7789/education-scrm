// 原型的员工身份与线索数据范围。正式应用必须由服务端按登录账号重复鉴权。
function leadEnsureCampusAdminRole(){
  if(!permissionState.roles.some(r=>r.id==='campusAdmin'))permissionState.roles.push({id:'campusAdmin',name:'校区招生组长',active:true,grants:['leadManage']});
  const leader=permissionState.roles.find(r=>r.id==='campusAdmin');
  if(leader.name==='校区管理员')leader.name='校区招生组长';
  if(!permissionState.roles.some(r=>r.id==='salesSupervisor'))permissionState.roles.push({id:'salesSupervisor',name:'招生主管',active:true,grants:['leadManage','leadTodo','myLeads','quickRegister']});
  const sales=permissionState.roles.find(r=>r.id==='sales');
  if(sales)sales.grants=sales.grants.filter(key=>key!=='leadManage');
}
leadEnsureCampusAdminRole();
function leadStaffAccessId(staff){return staff.leadAccessId||(staff.leadAccessId=globalThis.crypto?.randomUUID?.()||'employee-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2))}
function leadAccessStaff(){
  const id=String(permissionState.identity);
  return id.startsWith('staff:')?state.staff.find(s=>s.leadAccessId===id.slice(6)):null;
}
const campusPermissionRole=permissionRole;
permissionRole=function(id=permissionState.identity){
  if(String(id).startsWith('staff:')){
    const staff=state.staff.find(s=>s.leadAccessId===String(id).slice(6));
    return staff?.active?campusPermissionRole(staff.roleId):undefined;
  }
  return campusPermissionRole(id);
};
function leadAllCampusAccess(){return permissionState.identity==='admin'||permissionRole()?.id==='salesSupervisor'&&permissionRole()?.active&&permissionRole().grants.includes('leadManage')}
function leadStaffCampuses(staff){return staffCampusNames(staff)}
function leadActiveStaffCampuses(staff){return leadStaffCampuses(staff).filter(name=>state.campuses.some(c=>c.active&&c.name===name))}
function leadCampusSelection(){
  if(leadState.managementCampusIdentity!==permissionState.identity){leadState.managementCampusIdentity=permissionState.identity;leadState.managementCampus=''}
  const options=leadManageCampusOptions(leadState.leads.filter(leadCanManage));
  if(leadAllCampusAccess()){
    if(leadState.managementCampus&&!options.includes(leadState.managementCampus)&&!(leadState.managementCampus==='__unrecorded__'&&leadState.leads.some(l=>!l.ownershipCampus)))leadState.managementCampus='';
  }else if(!options.includes(leadState.managementCampus))leadState.managementCampus=options[0]||'';
  return leadState.managementCampus;
}
function leadManagedCampus(){return leadAllCampusAccess()?'':leadCampusSelection()}
function leadCanManage(lead){
  if(!lead)return false;
  if(leadAllCampusAccess())return true;
  const staff=leadAccessStaff(),role=permissionRole();
  return !!(staff?.active&&role?.active&&role.id!=='sales'&&role.grants.includes('leadManage')&&leadActiveStaffCampuses(staff).includes(lead.ownershipCampus));
}
function leadManageCampusOptions(rows){
  if(!leadAllCampusAccess()){
    const staff=leadAccessStaff(),role=permissionRole();
    return staff?.active&&role?.active&&role.id!=='sales'&&role.grants.includes('leadManage')?leadActiveStaffCampuses(staff):[];
  }
  return [...new Set([...state.campuses.filter(c=>c.active).map(c=>c.name),...rows.map(l=>l.ownershipCampus).filter(Boolean)])];
}
// 职位演示没有具体校区，不授予线索数据权限；须选择具体员工身份。
const campusCanVisit=permissionCanVisit;
permissionCanVisit=function(page){
  if(!campusCanVisit(page))return false;
  if(permissionState.identity==='admin')return true;
  if(page==='leadManage')return leadAllCampusAccess()||leadManageCampusOptions([]).length>0;
  if(page==='leadDetail')return leadCampusCanRead(leadState.leads[leadState.selected],leadState.returnPage);
  return true;
};
function leadCampusCanRead(lead,origin){
  if(!lead)return false;
  if(leadAllCampusAccess())return true;
  if(origin==='quickRegister')return permissionCanVisit('quickRegister')&&shortcutOwnLead(lead);
  if(origin==='leadManage')return permissionCanVisit('leadManage')&&leadCanManage(lead);
  if(leadAccessStaff()&&permissionRole()?.grants.includes('leadManage'))return leadCanManage(lead);
  return (permissionCanVisit('myLeads')||permissionCanVisit('leadTodo'))&&leadHasOwner(lead);
}
function leadCampusReject(){toast('无权管理该线索，请核对员工所属校区和职位权限');return false}
const campusCurrentOperator=leadCurrentOperator;
leadCurrentOperator=function(){const staff=leadAccessStaff();return staff?{...leadStaffIdentity(staff),staffId:leadStaffAccessId(staff)}:campusCurrentOperator()};
const campusOwnRegistration=shortcutOwnLead;
shortcutOwnLead=function(lead){
  if(!lead)return false;
  const operator=leadCurrentOperator();
  if(lead.registrarStaffId)return lead.registrarStaffId===operator.staffId;
  if(lead.registrarAccount)return lead.registrarAccount===operator.account;
  if(leadAccessStaff())return !!operator.account&&lead.history?.find(e=>e[0]==='建档')?.[3]?.operator?.account===operator.account;
  return campusOwnRegistration(lead);
};
const campusRefreshNavigation=permissionRefreshNavigation;
permissionRefreshNavigation=function(){
  campusRefreshNavigation();
  const select=$('#demo-role');if(!select)return;
  select.innerHTML+=state.staff.filter(s=>s.active&&campusPermissionRole(s.roleId)?.active).map(s=>`<option value="staff:${esc(leadStaffAccessId(s))}">${esc(s.name)} · ${esc(permissionRoleName(s.roleId))} · ${esc(staffCampusNames(s).join('、')||'分校')}</option>`).join('');
  select.value=permissionState.identity;
};
const campusChangeIdentity=permissionChangeIdentity;
permissionChangeIdentity=function(id){
  // 旧身份的表单、已选人员和弹窗不能带到新身份下继续提交。
  if(!permissionState.dirty){leadState.modal=null;leadState.assignmentDraft=null;leadState.queueCampus='';leadState.managementCampusIdentity=null;leadDisposeRecord()}
  return campusChangeIdentity(id);
};
const campusStaffForm=permissionStaffForm;
permissionStaffForm=function(){
  return campusStaffForm().replace('员工权限由所属职位统一决定。','员工权限由所属职位统一决定。招生主管可管理全部校区；校区招生组长只能管理所属校区的线索，须指定至少一个已启用校区。招生人员仅使用我的线索。');
};
const campusSaveStaff=permissionSaveStaff;
permissionSaveStaff=function(){
  if(permissionState.identity!=='admin')return;
  const role=permissionRole($('#staff-role').value),campuses=staffSelectedCampuses();
  if(role?.id!=='salesSupervisor'&&role?.id!=='sales'&&role?.grants.includes('leadManage')&&(!campuses.length||campuses.some(name=>!state.campuses.some(c=>c.active&&c.name===name)))){toast('具有线索管理权限的员工必须选择已启用的所属校区');return}
  return campusSaveStaff();
};
const campusManagePage=leadManagePage;
leadManagePage=function(){
  if(!permissionCanVisit('leadManage'))return heading('线索管理','请由主管理员配置员工的所属校区与线索管理权限，并选择具体员工身份。');
  const campus=leadCampusSelection();
  return `<div class="lead-tip">${leadAllCampusAccess()?'主管理员 / 招生主管：可筛选全部校区，包括未记录归属校区的历史线索。':'管理范围：'+esc(campus||'未配置有效校区')+'。仅展示当前所属校区的线索。'}</div>`+campusManagePage();
};
const campusDetail=leadDetail;
leadDetail=function(index,from){
  if(!leadCampusCanRead(leadState.leads[index],from||state.page))return leadCampusReject();
  return campusDetail(index,from);
};
const campusDetailPage=leadDetailPage;
leadDetailPage=function(){return leadCampusCanRead(leadState.leads[leadState.selected],leadState.returnPage)?campusDetailPage():'<div class="empty">无权查看该校区线索</div>'};
const campusRequireFollow=leadRequireFollow;
leadRequireFollow=function(){
  if(!leadCampusCanRead(leadState.leads[leadState.selected],state.page==='leadManage'?'leadManage':leadState.returnPage))return leadCampusReject();
  return campusRequireFollow();
};
const campusOpenForm=leadOpenForm,campusSaveLead=saveLead;
leadOpenForm=function(mode,...args){
  if(mode==='edit'&&!leadCampusCanRead(leadState.leads[leadState.selected],leadState.returnPage))return leadCampusReject();
  return campusOpenForm(mode,...args);
};
saveLead=function(...args){
  if(leadState.formMode==='edit'&&!leadCampusCanRead(leadState.leads[leadState.selected],leadState.returnPage))return leadCampusReject();
  return campusSaveLead(...args);
};
const campusModalPage=leadModalPage;
leadModalPage=function(){
  if(state.page==='leadDetail'&&!leadCampusCanRead(leadState.leads[leadState.selected],leadState.returnPage))return '';
  if(leadState.modal==='assign'&&(!permissionCanVisit('leadManage')||!leadCanManage(leadState.leads[leadState.selected])))return '';
  if(leadState.modal==='form'&&leadState.formMode==='edit'&&!leadCampusCanRead(leadState.leads[leadState.selected],leadState.returnPage))return '';
  return campusModalPage();
};
const campusAssignLead=assignLead;
assignLead=function(){
  if(!permissionCanVisit('leadManage')||!leadCanManage(leadState.leads[leadState.selected]))return leadCampusReject();
  return campusAssignLead();
};
const campusEligibleStaff=leadEligibleStaff;
leadEligibleStaff=function(){
  const staff=campusEligibleStaff().filter(s=>!['campusAdmin','salesSupervisor'].includes(s.roleId));
  // 校区管理员只向本校区招生人员分配，提交时同样调用此过滤。
  if(!leadAllCampusAccess()&&['assign','colleague'].includes(leadState.modal)&&(leadAccessStaff()||leadState.modal==='assign'))return staff.filter(s=>leadActiveStaffCampuses(s).includes(leadState.leads[leadState.selected]?.ownershipCampus));
  return staff;
};
for(const name of ['remindLead','reactivateLead']){
  const previous=globalThis[name];
  globalThis[name]=function(index){if(!permissionCanVisit('leadManage')||!leadCanManage(leadState.leads[index]))return leadCampusReject();return previous(index)};
}
permissionRefreshNavigation();
