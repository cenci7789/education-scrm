const WxLiveRuntime={
 storageKey:'crm-wechat-livecodes-v1',
 load(storage){try{const items=JSON.parse(storage.getItem(this.storageKey)||'[]');return Array.isArray(items)?items:[]}catch{return []}},
 save(storage,items){storage.setItem(this.storageKey,JSON.stringify(items))},
 image(value){return /^data:image\/(png|jpeg|gif|webp);base64,/.test(value||'')?value:''},
 expiry(code){if(!code.expires)return Infinity;const value=new Date(code.expires+'T23:59:59').getTime();return Number.isFinite(value)?value:0},
 choose(item,tag='',now=Date.now()){if(!item||!item.active)return null;if(item.type==='tagged'&&!item.tags.includes(tag))return null;return item.codes.find(code=>code.enabled!==false&&this.image(code.image)&&this.expiry(code)>now&&Number(code.views||0)<Number(item.threshold)&&(item.type!=='tagged'||code.tag===tag))||null},
 visit(storage,id,tag='',now=Date.now()){
  const items=this.load(storage),item=items.find(x=>x.id===id),code=this.choose(item,tag,now);if(!code)return {item,code:null};
  code.views=Number(code.views||0)+1;item.events??=[];item.events.push({at:new Date(now).toISOString(),codeId:code.id,tag});this.save(storage,items);return {item,code};
 }
};
