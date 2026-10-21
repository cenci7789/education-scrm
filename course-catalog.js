const courseCategories=['班课','1对1','1对N'];
academicPages.courseForm='创建课程';
function courseCategory(course){return courseCategories.includes(course.courseCategory)?course.courseCategory:'班课'}
function courseTeachingFormat(course){return ['直播','直播课'].includes(course.teachingFormat)?'直播':'面授'}
function courseCatalogRows(){
  const tab=a.courseCategory||'班课',search=String(a.courseSearch||'').trim().toLowerCase();
  return a.courses.map((course,index)=>({...course,index})).filter(c=>courseCategory(c)===tab&&(!search||c.name.toLowerCase().includes(search)));
}
function courseCatalogResults(){
  const rows=courseCatalogRows();
  return aTable(['课程名称','授课形式','学科','年级','学期','班型','状态','操作'],rows.map(c=>`<tr><td><a onclick="courseOpenForm(${c.index})">${esc(c.name)}</a></td><td>${courseTeachingFormat(c)}课</td><td>${esc(c.subject)}</td><td>${esc(c.grade)}</td><td>${esc(c.term)}</td><td>${esc(c.classType)}</td><td><span class="badge ${c.active?'':'off'}">${c.active?'已启用':'已禁用'}</span></td><td><div class="actions"><a onclick="classOpenCreate(${c.index})">创建班级</a><a onclick="courseOpenForm(${c.index})">编辑</a><a onclick="a.courses[${c.index}].active=!a.courses[${c.index}].active;academicRender()">${c.active?'禁用':'启用'}</a></div></td></tr>`))+(!rows.length?'<div class="empty">暂无符合条件的课程</div>':'')+`<div class="data-bar">共 ${rows.length} 条课程</div>`;
}
coursePage=function(){
  if(!courseCategories.includes(a.courseCategory))a.courseCategory='班课';
  return aHeading('课程管理','管理课程、授课形式、课程属性与讲次')+`<div class="card">${aTabs(courseCategories,a.courseCategory,'courseTab')}<div class="pad"><div class="toolbar"><div class="toolbar-left"><input class="input" style="width:260px" placeholder="请输入课程名称" value="${esc(a.courseSearch||'')}" oninput="courseSearch(this.value)"></div><div class="toolbar-right"><button class="btn primary" onclick="courseOpenForm(null)">+ 创建课程</button><button class="btn" onclick="toast('课程导入规则待确认')">导入课程</button></div></div><div id="course-catalog-results">${courseCatalogResults()}</div></div></div>`;
};
courseTab=function(name){if(!courseCategories.includes(name))return;a.courseCategory=name;academicRender()};
function courseSearch(value){a.courseSearch=value;$('#course-catalog-results').innerHTML=courseCatalogResults()}
function courseOpenForm(index){a.courseSessionDraft=null;a.selectedClass=index;academicPages.courseForm=index===null?'创建课程':'编辑课程';nav('courseForm')}
function courseCatalogSelect(id,options,value){
  return `<select class="select" id="${id}">${options.map(option=>{const [key,label]=Array.isArray(option)?option:[option,option];return `<option value="${esc(key)}" ${key===value?'selected':''}>${esc(label)}</option>`}).join('')}</select>`;
}
const courseCatalogOriginalForm=courseForm;
courseForm=function(){
  const c=a.selectedClass===null?null:a.courses[a.selectedClass];
  let html=courseCatalogOriginalForm().replaceAll('创建面授课程','创建课程').replaceAll('编辑面授课程','编辑课程');
  const fields=aField('课程分类',courseCatalogSelect('course-category',courseCategories,c?courseCategory(c):a.courseCategory||'班课'),true)+aField('授课形式',courseCatalogSelect('course-format',[['面授','面授课'],['直播','直播课']],c?courseTeachingFormat(c):'面授'),true);
  html=html.replace('<div class="form-grid">','<div class="form-grid">'+fields);
  html=html.replace(aField('课程类型',aSelect('course-type',['长期班','短期班','体验课'],'请选择课程类型'),true),'');
  html=html.replace(aField('收费模式',aSelect('course-charge',['整期','按课时'],'请选择收费模式'),true),'');
  html=html.replace(aField('上课时间展示',aInput('course-time-label','例如：每周日 08:00—10:00'),true),'');
  courseEnsureSessions();
  html=html.replace('<button class="btn" onclick="addSession()">+ 添加讲次</button>','<button class="btn" onclick="addSession()">+ 添加讲次</button> <button class="btn" onclick="courseOpenSessionImport()">批量导入</button>');
  html=html.replace('<div id="session-list"><div class="empty" style="margin-top:14px">尚未添加讲次</div></div>',`<div id="session-list">${courseSessionList()}</div><div id="course-session-modal"></div>`);
  if(c){
    for(const [id,key] of [['course-fee','fee'],['course-material','materialFee']])html=html.replace(new RegExp(`(<input[^>]*id="${id}"[^>]*value=")[^"]*(")`),(_,start,end)=>start+esc(c[key]??'')+end);
    for(const [id,key] of [['course-year','year'],['course-term','term'],['course-subject','subject'],['course-class-type','classType'],['course-grade','grade']]){
      html=html.replace(new RegExp(`(<select[^>]*id="${id}"[^>]*>)([\\s\\S]*?)(</select>)`),(_,open,options,close)=>open+options.replaceAll(`<option>${esc(c[key]||'')}</option>`,`<option selected>${esc(c[key]||'')}</option>`)+close);
    }
    html=html.replace('onclick="saveCourse()">创建课程','onclick="saveCourse()">保存修改');
  }
  return html;
};
saveCourse=function(){
  if(a.courseSessionDraft?.editor){toast('请先确认或取消讲次编辑');return}
  const name=$('#course-name').value.trim(),category=$('#course-category').value,format=$('#course-format').value;
  if(!name){toast('请输入课程名称');return}
  if(!courseCategories.includes(category)||!['面授','直播'].includes(format)){toast('请选择课程分类和授课形式');return}
  const old=a.selectedClass===null?null:a.courses[a.selectedClass];
  if(a.courses.some(c=>c!==old&&c.name===name)){toast('课程名称已存在');return}
  const feeText=$('#course-fee').value.trim(),materialText=$('#course-material').value.trim();
  if([feeText,materialText].some(v=>v!==''&&(!Number.isFinite(Number(v))||Number(v)<0))){toast('课程费、教辅费须为大于等于0的金额');return}
  const c={...(old||{}),name,courseCategory:category,teachingFormat:format,active:old?.active??true,sessions:courseEnsureSessions().sessions.map((s,index)=>({...s,number:index+1}))};
  c.fee=feeText===''?null:Math.round(Number(feeText)*100)/100;c.materialFee=materialText===''?0:Math.round(Number(materialText)*100)/100;
  for(const [id,key,fallback] of [['course-year','year',''],['course-subject','subject','数学'],['course-grade','grade','4年级'],['course-term','term','秋季'],['course-class-type','classType','S+班']])c[key]=$('#'+id).value||old?.[key]||fallback;
  if(a.selectedClass===null)a.courses.unshift(c);else a.courses[a.selectedClass]=c;
  if(old&&old.name!==name)for(const cls of a.classes)if(cls.course===old.name)cls.course=name;
  a.courseCategory=category;a.courseSearch='';a.selectedClass=null;a.courseSessionDraft=null;nav('course');toast('课程已保存');
};
let courseSessionSequence=0;
function courseNewSessionId(){return 'course-session-'+Date.now()+'-'+(++courseSessionSequence)}
function courseEnsureSessions(){
  const source=a.selectedClass===null?null:a.courses[a.selectedClass];
  if(!a.courseSessionDraft||a.courseSessionDraft.source!==source){
    a.courseSessionDraft={source,sessions:(source?.sessions||[]).map(s=>typeof s==='string'?{id:courseNewSessionId(),name:s}:{...s,id:s.id||courseNewSessionId()}),editor:null};
  }
  return a.courseSessionDraft;
}
function courseSessionList(){
  const sessions=courseEnsureSessions().sessions;
  if(!sessions.length)return '<div class="empty" style="margin-top:14px">尚未添加讲次</div>';
  return aTable(['讲次序号','讲次名称','操作'],sessions.map((session,index)=>`<tr><td>第${index+1}讲</td><td>${esc(session.name||'未命名讲次')}</td><td><button type="button" class="btn small" onclick="courseEditSession(${index})">编辑</button> <button type="button" class="btn small danger" onclick="courseRemoveSession(${index})">删除</button></td></tr>`))+ '<p class="help">讲次序号按列表顺序自动排列，删除后自动更新。</p>';
}
addSession=function(){courseEditSession(null)};
function courseEditSession(index){
  if(state.page!=='courseForm')return;
  const draft=courseEnsureSessions(),session=index===null?null:draft.sessions[index];
  if(index!==null&&!session)return;
  draft.editor={index};
  $('#course-session-modal').innerHTML=`<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="course-session-title"><div class="modal-head"><h2 id="course-session-title">${session?'编辑讲次':'添加讲次'}</h2><button type="button" class="btn small" aria-label="关闭" onclick="courseCloseSession()">×</button></div><p>第${index===null?draft.sessions.length+1:index+1}讲 <span class="help">（按列表顺序自动编号）</span></p><div class="field"><label class="required" for="course-session-name">讲次名称</label><input class="input" id="course-session-name" value="${esc(session?.name||'')}" placeholder="请输入讲次名称" maxlength="100" required onkeydown="if(event.key==='Enter'){event.preventDefault();courseConfirmSession()}else if(event.key==='Escape'){courseCloseSession()}"></div><div class="modal-actions"><button type="button" class="btn" onclick="courseCloseSession()">取消</button><button type="button" class="btn primary" onclick="courseConfirmSession()">确认</button></div></section></div>`;
  $('#course-session-name')?.focus?.();
}
function courseCloseSession(){if(a.courseSessionDraft)a.courseSessionDraft.editor=null;$('#course-session-modal').innerHTML=''}
function courseConfirmSession(){
  const draft=a.courseSessionDraft;if(state.page!=='courseForm'||!draft?.editor||draft.editor.kind==='import')return;
  const name=$('#course-session-name').value.trim();
  if(!name){toast('请填写讲次名称');return}
  if(name.length>100){toast('讲次名称不能超过100字');return}
  const index=draft.editor.index;
  if(index===null)draft.sessions.push({id:courseNewSessionId(),name});
  else if(draft.sessions[index])draft.sessions[index]={...draft.sessions[index],name};
  courseCloseSession();$('#session-list').innerHTML=courseSessionList();
}
function courseRemoveSession(index){
  if(state.page!=='courseForm')return;
  const draft=courseEnsureSessions();if(draft.editor||!draft.sessions[index])return;
  draft.sessions.splice(index,1);$('#session-list').innerHTML=courseSessionList();
}
function courseParseSessionImport(text){
  text=String(text||'').replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n');
  if(text.length>1024*1024)return {names:[],errors:['导入内容不能超过1MB。']};
  const delimiter=text.includes('\t')?'\t':',',rows=[];
  let row=[],cell='',quoted=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(ch==='"'){
      if(quoted&&text[i+1]==='"'){cell+='"';i++}
      else if(quoted||!cell)quoted=!quoted;
      else cell+=ch;
    }else if(!quoted&&(ch===delimiter||ch==='\n')){
      row.push(cell.trim());cell='';if(ch==='\n'){rows.push(row);row=[]}
    }else cell+=ch;
  }
  if(quoted)return {names:[],errors:['文件中的双引号未闭合，请检查CSV格式。']};
  row.push(cell.trim());rows.push(row);
  const data=rows.map((cells,index)=>({cells,line:index+1})).filter(r=>r.cells.some(Boolean));
  if(!data.length)return {names:[],errors:['请粘贴讲次名称或选择文件。']};
  let nameColumn=data[0].cells.indexOf('讲次名称');
  const header=nameColumn>=0;if(header)data.shift();else nameColumn=0;
  const names=[],errors=[];
  for(const {cells,line} of data){
    let column=nameColumn;
    if(!header&&cells.length===2&&/^(?:第\s*\d+\s*讲|\d+)$/.test(cells[0]))column=1;
    else if(!header&&cells.length>1){errors.push(`第${line}行有多列，请仅保留讲次名称，或使用带“讲次名称”表头的模板。`);continue}
    const name=cells[column]||'';
    if(!name)errors.push(`第${line}行缺少讲次名称。`);
    else if(name.length>100)errors.push(`第${line}行名称超过100字。`);
    else if(name.includes('\n'))errors.push(`第${line}行名称包含换行，请每行填写一个讲次。`);
    else names.push(name);
  }
  if(data.length>500)errors.push('每次最多导入500讲，请分批导入。');
  if(!names.length&&!errors.length)errors.push('没有可导入的讲次，请填写名称。');
  return {names,errors};
}
function courseOpenSessionImport(){
  if(state.page!=='courseForm')return;
  const draft=courseEnsureSessions();draft.editor={kind:'import',revision:0,loading:false};
  const template='data:text/csv;charset=utf-8,'+encodeURIComponent('\uFEFF讲次名称\r\n有理数\r\n实数综合\r\n');
  $('#course-session-modal').innerHTML=`<div class="modal-backdrop"><section class="modal" style="max-height:90vh;overflow:auto" role="dialog" aria-modal="true" aria-labelledby="course-import-title"><div class="modal-head"><h2 id="course-import-title">批量导入讲次</h2><button type="button" class="btn small" aria-label="关闭" onclick="courseCloseSession()">×</button></div><p class="help">每行一个讲次名称，可直接粘贴Excel单列内容。支持CSV（UTF-8）、TXT、TSV文件，每次最多500讲、文件最大1MB。导入后追加到现有列表，序号自动生成。</p><div class="toolbar"><a class="btn" href="${template}" download="讲次导入模板.csv">下载CSV模板</a><label class="btn">选择文件<input type="file" accept=".csv,.txt,.tsv" hidden onchange="courseReadSessionFile(this.files[0]);this.value=''" /></label></div><div class="field"><label for="course-import-text">讲次名称</label><textarea class="textarea" id="course-import-text" rows="6" placeholder="有理数&#10;实数综合" oninput="courseSessionImportChanged()"></textarea></div><div id="course-import-preview" aria-live="polite"><p class="help">填写内容后显示导入预览。</p></div><div class="modal-actions"><button type="button" class="btn" onclick="courseCloseSession()">取消</button><button type="button" class="btn primary" id="course-import-confirm" disabled onclick="courseConfirmSessionImport()">确认导入</button></div></section></div>`;
}
function courseSessionImportChanged(){
  const editor=a.courseSessionDraft?.editor;if(editor?.kind!=='import')return;
  editor.revision++;editor.loading=false;courseSessionImportPreview();
}
function courseSessionImportPreview(){
  const draft=a.courseSessionDraft;if(draft?.editor?.kind!=='import')return;
  const result=courseParseSessionImport($('#course-import-text').value);
  $('#course-import-confirm').disabled=draft.editor.loading||result.errors.length>0;
  $('#course-import-preview').innerHTML=result.errors.length?`<div class="notice">${result.errors.slice(0,8).map(esc).join('<br>')}${result.errors.length>8?'<br>请同时检查其余行。':''}</div>`:`<p class="help">将追加 ${result.names.length} 讲，序号从第${draft.sessions.length+1}讲开始。</p>`+aTable(['讲次序号','讲次名称'],result.names.slice(0,50).map((name,index)=>`<tr><td>第${draft.sessions.length+index+1}讲</td><td>${esc(name)}</td></tr>`))+(result.names.length>50?'<p class="help">仅预览前50讲，确认后将导入全部有效内容。</p>':'');
}
async function courseReadSessionFile(file){
  const editor=a.courseSessionDraft?.editor;if(!file||editor?.kind!=='import')return;
  if(!/\.(csv|txt|tsv)$/i.test(file.name)){toast('请选择CSV、TXT或TSV文件；Excel内容也可以直接复制粘贴');return}
  if(file.size>1024*1024){toast('文件不能超过1MB');return}
  const revision=++editor.revision;editor.loading=true;$('#course-import-confirm').disabled=true;
  try{
    const text=await file.text();
    if(state.page!=='courseForm'||a.courseSessionDraft?.editor!==editor||editor.revision!==revision)return;
    $('#course-import-text').value=text;editor.loading=false;courseSessionImportPreview();
  }catch{
    if(a.courseSessionDraft?.editor!==editor||editor.revision!==revision)return;
    editor.loading=false;courseSessionImportPreview();toast('文件读取失败，请重新选择');
  }
}
function courseConfirmSessionImport(){
  const draft=a.courseSessionDraft;if(state.page!=='courseForm'||draft?.editor?.kind!=='import'||draft.editor.loading)return;
  const result=courseParseSessionImport($('#course-import-text').value);
  if(result.errors.length){courseSessionImportPreview();return}
  draft.sessions.push(...result.names.map(name=>({id:courseNewSessionId(),name})));
  courseCloseSession();$('#session-list').innerHTML=courseSessionList();toast(`已导入${result.names.length}讲，保存课程后生效`);
}
