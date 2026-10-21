// 补全旧演示订单中能明确关联的资料；没有记录的日期保持为空。
function orderPrepare(order){
  if(order.searchPrepared)return order;
  const students=a.students.filter(s=>order.studentId?String(s.id)===String(order.studentId):s.name===order.student);
  if(students.length===1){
    order.studentId??=students[0].id;
    order.studentPhone??=students[0].phone;
  }
  if(!order.items){
    const classes=a.classes.filter(c=>c.name===order.product||c.course===order.product);
    order.items=classes.length===1?[{classId:classes[0].id,className:classes[0].name,course:classes[0].course}]:[];
  }
  for(const item of order.items){
    const related=a.classes.find(c=>c.id===item.classId);
    if(!related)continue;
    const info=enrollmentClassInfo(related);
    for(const key of ['term','grade','subject','campus','format'])item[key]??=info[key];
  }
  order.searchPrepared=true;
  return order;
}
function orderFilters(){return a.orderFilters||(a.orderFilters={})}
function orderCreatedDate(order){
  if(!order.createdAt)return '';
  const date=new Date(order.createdAt);if(Number.isNaN(date.getTime()))return '';
  return [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
}
function orderDateError(){
  const f=orderFilters();
  return f.dateFrom&&f.dateTo&&f.dateFrom>f.dateTo?'开始日期不能晚于结束日期。':'';
}
function orderFilteredRows(){
  const f=orderFilters(),query=String(f.student||'').trim().toLowerCase(),classQuery=String(f.className||'').trim().toLowerCase();
  if(orderDateError())return [];
  return a.orders.map(orderPrepare).filter(order=>{
    if(a.orderTab==='等待买家付款'&&order.status!=='等待付款')return false;
    if(a.orderTab==='成功的订单'&&order.status!=='交易成功')return false;
    const date=orderCreatedDate(order);
    if((f.dateFrom||f.dateTo)&&(!date||(f.dateFrom&&date<f.dateFrom)||(f.dateTo&&date>f.dateTo)))return false;
    if(query&&![order.studentId,order.student,order.studentPhone].some(value=>String(value||'').toLowerCase().includes(query)))return false;
    // 多班级订单须有同一班级满足所有班级条件，避免跨班级拼凑匹配。
    const itemFilters=['term','grade','subject','campus','format'];
    if(!classQuery&&!itemFilters.some(key=>f[key]))return true;
    return order.items.some(item=>itemFilters.every(key=>!f[key]||(key==='grade'?enrollmentGradeKey(item.grade||'')===f[key]:item[key]===f[key]))&&
      (!classQuery||String(item.className||'').toLowerCase().includes(classQuery)));
  });
}
function orderSetFilter(key,value){
  if(!['term','grade','subject','campus','format','dateFrom','dateTo','className','student'].includes(key))return;
  orderFilters()[key]=value;
  $('#order-results').innerHTML=orderResults();
}
function orderResetFilters(){a.orderFilters={};academicRender()}
function orderFilterFields(){
  const f=orderFilters(),items=a.orders.map(orderPrepare).flatMap(order=>order.items);
  return [['term','学期'],['grade','年级'],['subject','科目'],['campus','校区'],['format','授课形式']].map(([key,label])=>{
    const values=key==='format'?['面授','直播']:items.map(item=>item[key]).filter(Boolean);
    const options=new Map(values.map(value=>[key==='grade'?enrollmentGradeKey(value):value,value]));
    return `<div class="field"><label for="order-filter-${key}">${label}</label><select class="select" id="order-filter-${key}" onchange="orderSetFilter('${key}',this.value)"><option value="">全部${label}</option>${[...options].map(([value,text])=>`<option value="${esc(value)}" ${f[key]===value?'selected':''}>${esc(text)}</option>`).join('')}</select></div>`;
  }).join('')+
    `<div class="field"><label for="order-filter-dateFrom">日期（订单创建日期）</label><div class="order-date-range"><input class="input" type="date" id="order-filter-dateFrom" aria-label="订单开始日期" value="${esc(f.dateFrom||'')}" onchange="orderSetFilter('dateFrom',this.value)"><span>至</span><input class="input" type="date" id="order-filter-dateTo" aria-label="订单结束日期" value="${esc(f.dateTo||'')}" onchange="orderSetFilter('dateTo',this.value)"></div></div>
    <div class="field"><label for="order-filter-className">班级名称</label><input class="input" id="order-filter-className" placeholder="搜索班级名称" value="${esc(f.className||'')}" oninput="orderSetFilter('className',this.value)"></div>
    <div class="field"><label for="order-filter-student">学生信息</label><input class="input" id="order-filter-student" placeholder="搜索学生ID、姓名、联系电话" value="${esc(f.student||'')}" oninput="orderSetFilter('student',this.value)"></div>`;
}
function orderResults(){
  const rows=orderFilteredRows(),error=orderDateError();
  return (error?`<p class="checkout-error" role="alert">${error}</p>`:'')+
    aTable(['商品名称','价格','实收','收款主体','学生信息','交易状态'],rows.map(o=>`<tr><td><strong>${esc(o.product)}</strong><br><span class="quiet">订单编号：${esc(o.id)}</span><br><span class="quiet">创建日期：${esc(orderCreatedDate(o)||'未记录')}</span></td><td>${esc(o.amount)}</td><td>${esc(o.paid)}</td><td>苏州思跃教育科技有限公司</td><td>${esc(o.student)}<div class="quiet">ID：${esc(o.studentId||'未记录')}</div><div class="quiet">${esc(o.studentPhone||'联系电话未记录')}</div>${enrollmentOrderProofsHTML(o)}</td><td><span class="badge ${o.status==='交易成功'?'':'off'}">${esc(o.status)}</span></td></tr>`))+
    (!rows.length&&!error?'<div class="empty">没有符合条件的订单，请调整筛选条件。</div>':'')+
    `<div class="data-bar" role="status">共 ${rows.length} 条订单</div>`;
}
ordersPage=function(){
  return aHeading('收费订单','查看报名与补费产生的订单')+
    `<div class="card">${aTabs(['全部订单','等待买家付款','成功的订单'],a.orderTab,'ordersTab')}<div class="pad"><div class="order-filters">${orderFilterFields()}</div><div class="toolbar order-filter-actions"><button class="btn" onclick="orderResetFilters()">重置筛选</button><button class="btn" onclick="toast('导出为原型展示')">导出</button></div><div id="order-results">${orderResults()}</div></div></div>`;
};
