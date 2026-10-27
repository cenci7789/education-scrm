const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
module.exports=function(){const root=path.resolve(__dirname,'..'),nodes=new Map(),storage=new Map(),clicks=[],copies=[];
 const node=key=>{if(!nodes.has(key))nodes.set(key,{value:'',innerHTML:'',textContent:'',style:{},classList:{add(){},remove(){},toggle(){}},querySelector(){return null},querySelectorAll(){return []},setAttribute(){},focus(){},select(){},scrollIntoView(){},click(){clicks.push(this)},remove(){}});return nodes.get(key)};
 class Reader{readAsDataURL(file){this.result=file.data||'data:'+file.type+';base64,YQ==';queueMicrotask(()=>this.onload?.())}}
 const ctx=vm.createContext({document:{querySelector:node,querySelectorAll:()=>[],getElementById:id=>node('#'+id),createElement:tag=>({...node('element-'+tag)}),body:{appendChild(){}},execCommand:()=>false},setTimeout(){},setInterval(){},clearInterval(){},URL,URLSearchParams,btoa,atob,Blob,FileReader:Reader,confirm:()=>true,crypto:require('node:crypto').webcrypto,navigator:{clipboard:{async writeText(value){copies.push(value)}}},location:{href:'http://localhost/index.html'},localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)}});
 const run=source=>vm.runInContext(source,ctx),json=source=>JSON.parse(run('JSON.stringify('+source+')'));
 for(const script of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script(?: src="([^"]+)")?>([\s\S]*?)<\/script>/g))run(script[1]?fs.readFileSync(path.join(root,script[1]),'utf8'):script[2]);
 function handlers(html=node('#view').innerHTML){for(const m of html.matchAll(/\bon(?:click|change|input)="([^"]*)"/g))new vm.Script('(function(){'+m[1].replaceAll('&quot;','"').replaceAll('&#39;',"'").replaceAll('&amp;','&')+'})')}
 return {root,nodes,node,storage,ctx,run,json,handlers,clicks,copies};
};
