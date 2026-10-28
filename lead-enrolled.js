// 两处已报名列表共用日期规则；日期来自报名记录，不以缴清、补费或转课时间替代。
function leadEnrollmentDate(value){
  if(!/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(String(value||'')))return '';
  const date=new Date(value);if(!Number.isFinite(date.getTime()))return '';
  return [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
}
function leadEnrollmentDates(lead){
  const same=(left,right)=>left!==undefined&&left!==null&&left!==''&&right!==undefined&&right!==null&&right!==''&&String(left)===String(right);
  const linkedOrders=a.orders.filter(o=>same(o.originLeadId,lead.leadId));
  const students=a.students.filter(s=>same(s.id,lead.studentId)||same(s.originLeadId,lead.leadId)||linkedOrders.some(o=>same(o.studentId,s.id)));
  const orders=a.orders.filter(o=>linkedOrders.includes(o)||same(o.studentId,lead.studentId)||students.some(s=>same(s.id,o.studentId)));
  const registrations=orders.filter(o=>!o.transferId&&o.payMode!=='转课抵扣'&&!['已取消','已关闭','交易关闭'].includes(o.status)&&!['试听课','活动课','体验课'].includes(o.productCategory));
  const dates=registrations.map(o=>o.createdAt);
  students.forEach(s=>{
    dates.push(s.firstEnrolledAt);
    (s.enrollments||[]).filter(e=>!e.orderId||!orders.some(o=>same(o.id,e.orderId))).forEach(e=>dates.push(e.enrolledAt));
  });
  // 旧档案的完整报名历史可追溯；仅有月日的文本不补猜年份。
  (lead.history||[]).filter(e=>e[0]==='报名完成').forEach(e=>dates.push(e[3]?.recordedAt||e[1]));
  return [...new Set(dates.map(leadEnrollmentDate).filter(Boolean))].sort();
}
function leadEnrolledFilters(scope=state.page){
  if(leadState.enrolledFilterIdentity!==permissionState.identity){leadState.enrolledFilterIdentity=permissionState.identity;leadState.enrolledFilters={}}
  return (leadState.enrolledFilters??={})[scope]??={from:'',to:'',preset:''};
}
function leadEnrolledDateError(scope=state.page){
  const f=leadEnrolledFilters(scope);
  return f.from&&f.to&&f.from>f.to?'开始日期不能晚于结束日期。':'';
}
function leadEnrolledMatchingDates(lead,scope=state.page){
  const f=leadEnrolledFilters(scope);
  return leadEnrollmentDates(lead).filter(date=>(!f.from||date>=f.from)&&(!f.to||date<=f.to));
}
function leadEnrolledMatches(lead,scope=state.page){
  const f=leadEnrolledFilters(scope);
  return !leadEnrolledDateError(scope)&&(!f.from&&!f.to||leadEnrolledMatchingDates(lead,scope).length>0);
}
function leadEnrolledSetDate(scope,key,value){
  if(!['myLeads','leadManage'].includes(scope)||!['from','to'].includes(key))return;
  if(value&&(!/^\d{4}-\d{2}-\d{2}$/.test(value)||leadEnrollmentDate(value+'T00:00:00')!==value))return;
  const f=leadEnrolledFilters(scope);f[key]=value;f.preset='';leadRender();
}
function leadEnrolledQuickDate(scope,preset){
  if(!['myLeads','leadManage'].includes(scope)||!['今天','昨天','近7天','近30天','近90天','全部'].includes(preset))return;
  const f=leadEnrolledFilters(scope);
  if(preset==='全部'){Object.assign(f,{from:'',to:'',preset:''});leadRender();return}
  const end=new Date(),start=new Date();
  if(preset==='昨天'){start.setDate(start.getDate()-1);end.setDate(end.getDate()-1)}
  else start.setDate(start.getDate()-({'今天':1,'近7天':7,'近30天':30,'近90天':90}[preset]-1));
  Object.assign(f,{from:leadEnrollmentDate(start.toISOString()),to:leadEnrollmentDate(end.toISOString()),preset});leadRender();
}
function leadEnrolledDateHTML(scope){
  const f=leadEnrolledFilters(scope),error=leadEnrolledDateError(scope);
  return `<div class="lead-enrolled-date-filter"><span>报名日期</span><input class="input" type="date" aria-label="报名开始日期" value="${esc(f.from)}" onchange="leadEnrolledSetDate('${scope}','from',this.value)"><span>至</span><input class="input" type="date" aria-label="报名结束日期" value="${esc(f.to)}" onchange="leadEnrolledSetDate('${scope}','to',this.value)">${['今天','昨天','近7天','近30天','近90天'].map(p=>`<button class="btn small ${f.preset===p?'primary':''}" aria-pressed="${f.preset===p}" onclick="leadEnrolledQuickDate('${scope}','${p}')">${p}</button>`).join('')}<button class="btn small" onclick="leadEnrolledQuickDate('${scope}','全部')">重置日期</button></div>${error?`<p class="checkout-error" role="alert">${error}</p>`:''}<p class="help">任一次报名落在所选日期内即显示该学生，含未缴清的报名；列表保留其全部已报班级。近7/30/90天包含今天。未记录报名时间的历史线索仅在不限日期时显示。</p>`;
}
function leadManageEnrolledRows(){
  return leadManagePoolRows('已报名').filter(lead=>leadEnrolledMatches(lead,'leadManage'));
}
function leadManageEnrolledPage(){
  return leadManageHeading('新线索、回收、预警、归档、已分配与已报名线索的管理入口')+`<div class="card pad">${leadSegments(leadManageTabs(),'已报名','setManageTab')}${leadManagePoolFilterHTML('已报名')}${leadEnrolledDateHTML('leadManage')}${myEnrolledResults(leadManageEnrolledRows(),'leadManage')}</div>`;
}
