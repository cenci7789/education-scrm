// Every suite launches an isolated browser context; no existing browser profile is used.
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const excluded=new Set(['browser-controls.cjs','browser-controls-parallel.cjs','browser-audit-summary.cjs']);
const files=fs.readdirSync(__dirname).filter(f=>f.startsWith('browser-')&&f.endsWith('.cjs')&&!excluded.has(f));
const queue=[...files],results=[],root=path.resolve(__dirname,'..');
async function worker(){for(let file;(file=queue.shift());){const start=Date.now();let output='',timedOut=false;
 const code=await new Promise(resolve=>{const child=spawn(process.execPath,[path.join(__dirname,file)],{cwd:root,windowsHide:true,stdio:['ignore','pipe','pipe']});
 child.stdout.on('data',chunk=>output+=chunk);child.stderr.on('data',chunk=>output+=chunk);child.on('error',e=>{output+=e.stack});
 const timer=setTimeout(()=>{timedOut=true;child.kill()},90000);child.on('close',code=>{clearTimeout(timer);resolve(code)})});
 results.push({file,passed:code===0&&!timedOut,timedOut,duration:Date.now()-start,output});console.log((code===0&&!timedOut?'PASS ':'FAIL ')+file);if(code!==0||timedOut)console.log(output.slice(-3000));
 fs.mkdirSync(path.join(root,'.artifact-work/audit'),{recursive:true});fs.writeFileSync(path.join(root,'.artifact-work/audit/browser-suite-results.json'),JSON.stringify({at:new Date().toISOString(),passed:results.filter(r=>r.passed).length,total:files.length,completed:results.length,results},null,2));
}}
Promise.all(Array.from({length:3},worker)).then(()=>{console.log(`${results.filter(r=>r.passed).length}/${files.length} browser suites passed`);process.exitCode=results.some(r=>!r.passed)?1:0}).catch(e=>{console.error(e);process.exitCode=1});
