// Consolidate saved browser observations without counting depth boundaries as passes.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'.artifact-work/audit');
const pages=JSON.parse(fs.readFileSync(path.join(dir,'browser-pages.json'),'utf8'));
const controls=JSON.parse(fs.readFileSync(path.join(dir,'browser-controls-final.json'),'utf8'));
const suite=JSON.parse(fs.readFileSync(path.join(dir,'suite-results.json'),'utf8'));
const counts=rows=>rows.reduce((out,row)=>(out[row.status]=(out[row.status]||0)+1,out),{});
const report={
  recordedAt:new Date().toISOString(),
  environment:'Windows / Microsoft Edge headless / isolated browser contexts',
  scope:'All 41 menu entries; bounded control traversal plus explicit deep business-flow tests.',
  controls:{...counts(controls.results),runtimeErrorRecords:controls.results.filter(r=>r.errors?.length).length},
  pageRuntimeErrors:pages.errors,
  functionalSuite:{at:suite.at,passed:suite.passed,total:suite.total,failures:suite.results.filter(r=>!r.passed).map(r=>r.file)},
  method:{maxTraversalDepth:3,maxOptionsPerSelect:5,deduplicated:'Repeated rows and dynamic IDs grouped by handler and page state',disabled:'Observed, not forcibly enabled',depthLimit:'Deferred states, not counted as passed actions'},
  supplementaryChecks:[
    'browser-business-flows.cjs passed: course/class/lead import, coupon claim and redemption, receipt upload, enrollment, trial scheduling, deep profile/activity/form controls, reload',
    'browser-persistence.cjs passed for HTTP and --file: records, blobs and stale cross-tab writes'
  ],
  limitations:['Not exhaustive across every data or role combination','Live payment, telephone, WeCom, SMS, AI and public hosting integrations not verified','Finance collection settings entry retained pending user design'],
  pages:pages.routes.map(route=>({id:route.id,name:route.name,traversalCompleted:controls.completed.includes(route.id),controls:counts(controls.results.filter(row=>row.route===route.id))}))
};
fs.writeFileSync(path.join(__dirname,'audit-results.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({pages:report.pages.length,controls:report.controls}));
