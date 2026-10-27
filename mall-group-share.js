const groupShareState={current:null};
const groupShareBaseActions=mallRowActions,groupShareBasePage=mallActivityPage;
mallRowActions=function(type,index){if(type!=='group')return groupShareBaseActions(type,index);return `<div class="mall-actions"><button onclick="mallEdit('group',${index})">编辑</button><button onclick="groupShareOpen(${index})">推广</button><button onclick="mallEnd('group',${index})">结束</button></div>`};
mallActivityPage=function(type){const html=groupShareBasePage(type);return type==='group'?html+(groupShareState.current?groupShareModal():''):html};
function groupShareAllowed(){return state.page==='mallGroup'&&(typeof permissionCanVisit!=='function'||permissionCanVisit('mallGroup'))}
function groupShareOpen(index){
 if(!groupShareAllowed())return;const activity=mallState.activities.group[index];if(!activity)return;
 const snapshot=GroupShareCodec.snapshot(activity),encoded=GroupShareCodec.encode(snapshot);
 const base=new URL('group-share.html',location.href);base.search='';base.hash='';
 const original=base.href+'#data='+encoded;let short='',storageError='';
 const code=typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID().replaceAll('-','').slice(0,12):Date.now().toString(36)+Math.random().toString(36).slice(2,8);
 try{localStorage.setItem(GroupShareCodec.key(code),encoded);const url=new URL(base.href);url.searchParams.set('s',code);short=url.href}catch{storageError='浏览器存储不可用，暂不能生成本机短链接；可复制原链接。'}
 let qrImage='',qrError='';
 try{const qr=qrcode(0,'M');qr.addData(original);qr.make();qrImage=qr.createDataURL(4,16)}catch{qrError='链接内容过长或二维码生成失败，请复制原链接。'}
 groupShareState.current={name:snapshot.name,original,short,storageError,qrImage,qrError};mallRender();
}
function groupShareClose(){groupShareState.current=null;mallRender()}
function groupShareModal(){const share=groupShareState.current;return `<section class="mall-group-share"><div class="modal-backdrop"><div class="modal group-share-modal" role="dialog" aria-modal="true" aria-labelledby="group-share-title"><div class="modal-head"><h2 id="group-share-title">分享</h2><button class="btn small" aria-label="关闭分享" onclick="groupShareClose()">✕</button></div><div class="group-share-body"><div class="group-share-row"><label for="group-share-short">短链接</label><div><div class="group-share-link"><input class="input" id="group-share-short" readonly value="${esc(share.short)}" placeholder="暂不可用"><button class="btn primary" ${share.short?'':'disabled'} onclick="groupShareCopy('short')">复制</button></div><p class="help">${esc(share.storageError||'本机短链接：仅在生成链接的浏览器中可用。')}</p></div></div><div class="group-share-row"><label for="group-share-original">原链接</label><div><div class="group-share-link"><input class="input" id="group-share-original" readonly value="${esc(share.original)}"><button class="btn primary" onclick="groupShareCopy('original')">复制</button></div><p class="help"><a href="${esc(share.original)}" target="_blank" rel="noopener">打开活动预览</a></p></div></div><div class="group-share-row"><span>二维码</span><div class="group-share-qr">${share.qrImage?`<img src="${share.qrImage}" alt="${esc(share.name)}活动原链接二维码"><a class="btn" href="${share.qrImage}" download="拼团推广二维码.gif">下载</a>`:`<p class="help">${esc(share.qrError)}</p>`}</div></div><p class="group-share-note">当前为本地活动预览。向家长推广需先部署可公开访问的商城，并接入公网短链接服务。</p><p id="group-share-copy-status" class="help" role="status" aria-live="polite"></p></div></div></div></section>`}
async function groupShareCopy(kind){
 if(!groupShareAllowed()||!['short','original'].includes(kind))return false;
 const current=groupShareState.current,text=current?.[kind];if(!text)return false;
 let copied=false;
 try{if(typeof navigator!=='undefined'&&navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);copied=true}}catch{}
 if(!copied&&groupShareState.current===current){const input=document.getElementById('group-share-'+kind);try{input.focus();input.select();copied=!!document.execCommand?.('copy')}catch{}}
 if(groupShareState.current!==current)return copied;
 const status=document.getElementById('group-share-copy-status');if(status)status.textContent=copied?'已复制'+(kind==='short'?'短链接':'原链接'):'自动复制未成功，请选中链接后按 Ctrl+C 复制。';
 return copied;
}
