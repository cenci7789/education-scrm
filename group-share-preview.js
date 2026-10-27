(function(){
 const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=value=>value==null||value===''||!Number.isFinite(Number(value))?'待设置':'¥'+Number(value).toFixed(2);
 const host=document.getElementById('group-share-view');
 try{
  const data=GroupShareCodec.resolve(location.href,{getItem:key=>localStorage.getItem(key)});
  host.innerHTML='<p class="muted">拼团活动预览 · 不提供在线报名或支付</p><h1>'+escape(data.name)+'</h1><p>'+escape(String(data.start).replace('T',' '))+' 至 '+escape(String(data.end).replace('T',' '))+'</p><p>拼团有效期：'+escape(data.hours)+' 小时</p><h2>拼团规则</h2>'+data.tiers.map(t=>'<span class="tier">'+escape(t.people)+'人成团 · '+(t.mode==='discount'?escape(t.value)+'折':money(t.value))+'</span>').join('')+'<h2>参与课程</h2>'+data.courses.map(c=>'<div class="course"><strong>'+escape(c.name)+'</strong><div>课程原价：'+money(c.price)+'</div></div>').join('')+'<p class="muted">此页面为生成分享链接时的活动快照，实际活动与价格以机构最终确认为准。</p>';
 }catch(error){host.innerHTML='<h1>暂时无法打开活动</h1><p>'+escape(error.message||'链接无效，请重新获取分享链接。')+'</p>'}
})();
