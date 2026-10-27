// One-time reset explicitly requested on 2026-10-25. The generation lives in
// the same committed snapshot as business data, so later user entries survive.
const cleanStartGeneration='user-empty-start-2026-10-25';
const cleanStartRoles=JSON.parse(JSON.stringify(permissionState.roles));
function cleanStartIdentity(){
  shortcutUser='管理员';
  Object.assign(leadDemoOperator,{name:'管理员',account:'admin'});
}
function cleanStartReset(){
  for(const key of businessAcademicKeys)a[key]=[];
  Object.assign(a,{selectedStudent:null,selectedClass:null,enrollment:null,modal:null,enrollStep:1});
  state.campuses=[];state.staff=[];state.organization={name:'',province:'',city:''};state.importHistory=[];
  // Keep system dictionaries, but discard the sample institution's custom labels.
  for(const rows of Object.values(state.config))for(const row of rows)row[2]=row[0];
  leadState.leads=[];leadState.selected=null;leadState.modal=null;
  studentCommunicationSummaries.clear();
  trialState.requests=[];trialState.sequence=0;trialState.draft=null;trialState.successId=null;
  permissionState.roles=JSON.parse(JSON.stringify(cleanStartRoles));permissionState.logs=[];
  permissionState.selected=permissionState.roles[0]?.id;permissionState.working=new Set(permissionState.roles[0]?.grants||[]);
  permissionState.identity='admin';permissionState.dirty=false;permissionState.modal=null;
  Object.assign(mallState,{shelved:[],hiddenShelved:[],selected:[],picked:[],activities:{group:[],joint:[],coupon:[],invite:[]},draft:{},picker:false,published:false});
  mallShelfState.offered={};
  mfState.forms=[];mfState.draft=null;mfState.activeId=null;mfState.previewDone=false;
  wxLive.items=[];wxLive.draft=null;wxLive.editing=null;wxLive.modal=null;
  mallState.decor={title:'',subtitle:'',color:'#3979ed',modules:[],blocks:{}};
  decorPublished=null;decorDirty=false;decorSelected='page';decorPreviewMode='draft';
  const exact=new Set(['crm-marketing-forms-v1','crm-wechat-livecodes-v1',decorStorageKey,'crm-form-visitor']);
  const prefixes=['crm-form-answer:','crm-group-share:','crm-joint-share:','crm.teaching.default-term.v1.','crm.attendance.default-campus.v1.','crm.schedule.preferences.v1.'];
  for(let i=localStorage.length-1;i>=0;i--){const key=localStorage.key(i);if(exact.has(key)||prefixes.some(prefix=>key.startsWith(prefix)))localStorage.removeItem(key)}
  // Empty values prevent the older seed loaders from recreating sample content.
  localStorage.setItem('crm-marketing-forms-v1','[]');
  WxLiveRuntime.save(localStorage,[]);
  localStorage.setItem(decorStorageKey,JSON.stringify({draft:mallState.decor,published:null}));
  for(const url of businessStorage.blobs.keys())URL.revokeObjectURL(url);
  businessStorage.blobs.clear();
  state.page='quickRegister';state.mode='list';
}
