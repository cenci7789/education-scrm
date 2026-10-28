const fs=require('node:fs'),path=require('node:path'),{Worker}=require('node:worker_threads');
const root=path.resolve(__dirname,'..');
const files=fs.readdirSync(__dirname).filter(f=>f.endsWith('.cjs')&&!f.startsWith('browser-')&&!['run-all.cjs','run-browser-suite.cjs','prototype-runtime.cjs'].includes(f));
const results=[];
(async()=>{for(const file of files){const start=Date.now();let output='';const status=await new Promise(resolve=>{const worker=new Worker(path.join(__dirname,file),{stdout:true,stderr:true});worker.stdout.on('data',chunk=>output+=chunk);worker.stderr.on('data',chunk=>output+=chunk);worker.on('error',error=>output+=error.stack);const timer=setTimeout(()=>{output+='Timed out after 60 seconds';worker.terminate()},60000);worker.on('exit',code=>{clearTimeout(timer);resolve(code)})});results.push({file,passed:status===0,duration:Date.now()-start,output});console.log((status===0?'PASS':'FAIL')+' '+file);if(status!==0)console.log(output.slice(-5000));}
fs.mkdirSync(path.join(root,'.artifact-work','audit'),{recursive:true});
fs.writeFileSync(path.join(root,'.artifact-work','audit','suite-results.json'),JSON.stringify({at:new Date().toISOString(),passed:results.filter(r=>r.passed).length,total:results.length,results},null,2));
console.log(`${results.filter(r=>r.passed).length}/${results.length} passed`);process.exitCode=results.some(r=>!r.passed)?1:0;})().catch(error=>{console.error(error);process.exitCode=1});
