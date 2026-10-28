// 两个列表分别保存当前账号的默认学期；不会随系统日期自动切换学期。
function teachingDefaultTermKey(page){return 'crm.teaching.default-term.v1.'+encodeURIComponent(studentTermActor())+'.'+page}
function teachingDefaultTermRead(page){
  try{const value=JSON.parse(globalThis.localStorage?.getItem(teachingDefaultTermKey(page))||'null');return value?.version===1&&typeof value.term==='string'&&value.term!=='__unknown'?value.term:null}catch{return null}
}
function teachingDefaultTermFilters(page){return page==='students'?studentTermView():classManagementFilters()}
let teachingTermOpenPage='';
function teachingTermOptions(page){return [['','全部学期'],...(page==='students'?studentTermFilterOptions('term',studentTermRows()):classManagementOptions('term'))]}
function teachingDefaultTermControls(page){
  const selected=teachingDefaultTermFilters(page).term,saved=teachingDefaultTermRead(page),open=teachingTermOpenPage===page;
  const arg=value=>`decodeURIComponent('${encodeURIComponent(value).replace(/'/g,'%27')}')`;
  return `<button type="button" class="select teaching-term-trigger" id="teaching-term-trigger-${page}" aria-label="学期" aria-haspopup="dialog" aria-expanded="${open}" aria-controls="teaching-term-menu-${page}" onclick="teachingTermToggle('${page}')"><span>${esc(selected?classManagementTermLabel(selected):'全部学期')}</span><span aria-hidden="true">⌄</span></button><div class="teaching-term-menu" id="teaching-term-menu-${page}" role="dialog" aria-label="选择学期" ${open?'':'hidden'}>${teachingTermOptions(page).map(([value,label])=>`<div class="teaching-term-row ${value===selected?'selected':''}" data-term="${esc(value)}"><button type="button" class="teaching-term-option" aria-pressed="${value===selected}" onclick="teachingTermChoose('${page}',${arg(value)})">${esc(label)}${value===saved?'<span class="teaching-term-default-mark">默认</span>':''}</button>${value==='__unknown'?'':`<button type="button" class="teaching-term-default-action" aria-label="${value===saved?'取消默认':'设为默认'}：${esc(label)}" onclick="teachingTermToggleDefault('${page}',${arg(value)})">${value===saved?'取消默认':'设为默认'}</button>`}</div>`).join('')}</div>`;
}
function teachingTermToggle(page){
  if(!['students','classes'].includes(page)||!permissionCanVisit(page))return;
  const previous=teachingTermOpenPage;teachingTermOpenPage=previous===page?'':page;
  if(previous&&previous!==page)teachingDefaultTermRefresh(previous);
  teachingDefaultTermRefresh(page);
  if(teachingTermOpenPage)$('#teaching-term-menu-'+page)?.querySelector('.teaching-term-option')?.focus();
}
function teachingTermClose(focus=false){const page=teachingTermOpenPage;if(!page)return;teachingTermOpenPage='';teachingDefaultTermRefresh(page);if(focus)$('#teaching-term-trigger-'+page)?.focus()}
function teachingTermChoose(page,term){
  if(!['students','classes'].includes(page)||!permissionCanVisit(page)||!teachingTermOptions(page).some(([value])=>value===term))return;
  teachingTermOpenPage='';
  if(page==='students')studentTermSetFilter('term',term);else classManagementSetFilter('term',term);
  $('#teaching-term-trigger-'+page)?.focus();
}
function teachingTermToggleDefault(page,term){
  if(!['students','classes'].includes(page)||!permissionCanVisit(page)||term==='__unknown'||!teachingTermOptions(page).some(([value])=>value===term))return;
  if(teachingDefaultTermRead(page)!==term){teachingDefaultTermSave(page,term);return}
  try{if(!globalThis.localStorage)throw Error('storage unavailable');globalThis.localStorage.removeItem(teachingDefaultTermKey(page))}catch{toast('浏览器未能取消默认学期，请重试');return}
  teachingDefaultTermRefresh(page);toast('已取消默认学期');
}
document.addEventListener?.('click',event=>{if(teachingTermOpenPage&&!event.composedPath().some(node=>node.classList?.contains('teaching-term-picker')))teachingTermClose()});
document.addEventListener?.('keydown',event=>{if(teachingTermOpenPage&&event.key==='Escape'){event.preventDefault();teachingTermClose(true)}});
function teachingDefaultTermSave(page,term=teachingDefaultTermFilters(page).term){
  if(!['students','classes'].includes(page)||!permissionCanVisit(page))return;
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
function teachingDefaultTermPicker(page){return `<label for="teaching-term-trigger-${page}">学期</label><div id="term-default-${page}" class="teaching-term-picker">${teachingDefaultTermControls(page)}</div>`}
studentTermFiltersHTML=function(rows){return teachingPreviousStudentFields(rows).replace(/<label for="student-filter-term">学期<\/label><select[\s\S]*?<\/select>/,()=>teachingDefaultTermPicker('students'))};
classManagementFilterFields=function(){return teachingPreviousClassFields().replace(/<label for="class-management-term">学期<\/label><select[\s\S]*?<\/select>/,()=>teachingDefaultTermPicker('classes'))};
const teachingPreviousStudentSetFilter=studentTermSetFilter,teachingPreviousClassSetFilter=classManagementSetFilter;
studentTermSetFilter=function(key,value){teachingPreviousStudentSetFilter(key,value);if(key==='term')teachingDefaultTermRefresh('students')};
classManagementSetFilter=function(key,value){teachingPreviousClassSetFilter(key,value);if(key==='term')teachingDefaultTermRefresh('classes')};
let teachingDefaultTermLastView='';
function teachingDefaultTermEnter(){
  const key=studentTermActor()+'|'+state.page;
  if(key!==teachingDefaultTermLastView){teachingTermOpenPage='';teachingDefaultTermLastView=key;if(['students','classes'].includes(state.page)&&permissionCanVisit(state.page))teachingDefaultTermApply(state.page)}
}
// 菜单直接调用 render，详情返回调用 academicRender；两条入口均应用默认值。
const teachingDefaultPreviousRender=render,teachingDefaultPreviousAcademicRender=academicRender;
render=function(){teachingDefaultTermEnter();return teachingDefaultPreviousRender()};
academicRender=function(){teachingDefaultTermEnter();return teachingDefaultPreviousAcademicRender()};
