// 两个列表分别保存当前账号的默认学期；不会随系统日期自动切换学期。
function teachingDefaultTermKey(page){return 'crm.teaching.default-term.v1.'+encodeURIComponent(studentTermActor())+'.'+page}
function teachingDefaultTermRead(page){
  try{const value=JSON.parse(globalThis.localStorage?.getItem(teachingDefaultTermKey(page))||'null');return value?.version===1&&typeof value.term==='string'&&value.term!=='__unknown'?value.term:null}catch{return null}
}
function teachingDefaultTermFilters(page){return page==='students'?studentTermView():classManagementFilters()}
function teachingDefaultTermControls(page){
  const selected=teachingDefaultTermFilters(page).term,saved=teachingDefaultTermRead(page),same=saved!==null&&saved===selected;
  return `<button type="button" class="btn small term-default-button" ${same||selected==='__unknown'?'disabled':''} onclick="teachingDefaultTermSave('${page}')">${same?'已设为默认':'设为默认'}</button>${saved!==null?`<span class="help term-default-note">默认：${esc(saved?classManagementTermLabel(saved):'全部学期')}</span>`:''}`;
}
function teachingDefaultTermSave(page){
  if(!['students','classes'].includes(page)||!permissionCanVisit(page))return;
  const term=teachingDefaultTermFilters(page).term;
  if(term==='__unknown'){toast('请先选择一个学期或全部学期');return}
  try{
    if(!globalThis.localStorage)throw Error('storage unavailable');
    globalThis.localStorage.setItem(teachingDefaultTermKey(page),JSON.stringify({version:1,term}));
  }catch{toast('浏览器未能保存默认学期，请检查本地存储设置后重试');return}
  teachingDefaultTermRefresh(page);toast('默认学期已保存，下次打开时自动应用');
}
function teachingDefaultTermRefresh(page){const el=$('#term-default-'+page);if(el)el.innerHTML=teachingDefaultTermControls(page)}
function teachingDefaultTermApply(page){
  const term=teachingDefaultTermRead(page);if(term===null)return;
  Object.assign(teachingDefaultTermFilters(page),page==='students'?studentTermEmptyFilters():classManagementEmptyFilters(),{term});
}
const teachingClassFilterViews=new Map();
classManagementFilters=function(){
  const actor=studentTermActor();
  if(!teachingClassFilterViews.has(actor))teachingClassFilterViews.set(actor,{...classManagementEmptyFilters(),term:teachingDefaultTermRead('classes')??''});
  a.classManagementFilters=teachingClassFilterViews.get(actor);return a.classManagementFilters;
};
classManagementResetFilters=function(){Object.assign(classManagementFilters(),classManagementEmptyFilters(),{term:teachingDefaultTermRead('classes')??''});academicRender()};
studentTermResetFilters=function(){Object.assign(studentTermView(),studentTermEmptyFilters(),{term:teachingDefaultTermRead('students')??''});academicRender()};
const teachingPreviousStudentView=studentTermView;
studentTermView=function(){const isNew=!studentTermViews.has(studentTermActor()),view=teachingPreviousStudentView();if(isNew)view.term=teachingDefaultTermRead('students')??'';return view};
const teachingPreviousStudentOptions=studentTermFilterOptions,teachingPreviousClassOptions=classManagementOptions;
function teachingDefaultTermOptions(page,options){
  // 即便该学期暂无数据，也保留筛选选项，避免选框显示全部而结果实际按学期过滤。
  const values=[teachingDefaultTermFilters(page).term,teachingDefaultTermRead(page)];
  for(const term of values)if(term&&!options.some(([value])=>value===term))options.push([term,classManagementTermLabel(term)]);
  return options;
}
studentTermFilterOptions=function(key,rows){const options=teachingPreviousStudentOptions(key,rows);return key==='term'?teachingDefaultTermOptions('students',options):options};
classManagementOptions=function(key){const options=teachingPreviousClassOptions(key);return key==='term'?teachingDefaultTermOptions('classes',options):options};
const teachingPreviousStudentFields=studentTermFiltersHTML,teachingPreviousClassFields=classManagementFilterFields;
function teachingDefaultTermHeading(page,id){return `<div class="term-default-heading"><label for="${id}">学期</label><span id="term-default-${page}" class="term-default-controls">${teachingDefaultTermControls(page)}</span></div>`}
studentTermFiltersHTML=function(rows){return teachingPreviousStudentFields(rows).replace('<label for="student-filter-term">学期</label>',teachingDefaultTermHeading('students','student-filter-term'))};
classManagementFilterFields=function(){return teachingPreviousClassFields().replace('<label for="class-management-term">学期</label>',teachingDefaultTermHeading('classes','class-management-term'))};
const teachingPreviousStudentSetFilter=studentTermSetFilter,teachingPreviousClassSetFilter=classManagementSetFilter;
studentTermSetFilter=function(key,value){teachingPreviousStudentSetFilter(key,value);if(key==='term')teachingDefaultTermRefresh('students')};
classManagementSetFilter=function(key,value){teachingPreviousClassSetFilter(key,value);if(key==='term')teachingDefaultTermRefresh('classes')};
let teachingDefaultTermLastView='';
function teachingDefaultTermEnter(){
  const key=studentTermActor()+'|'+state.page;
  if(key!==teachingDefaultTermLastView){teachingDefaultTermLastView=key;if(['students','classes'].includes(state.page)&&permissionCanVisit(state.page))teachingDefaultTermApply(state.page)}
}
// 菜单直接调用 render，详情返回调用 academicRender；两条入口均应用默认值。
const teachingDefaultPreviousRender=render,teachingDefaultPreviousAcademicRender=academicRender;
render=function(){teachingDefaultTermEnter();return teachingDefaultPreviousRender()};
academicRender=function(){teachingDefaultTermEnter();return teachingDefaultPreviousAcademicRender()};
