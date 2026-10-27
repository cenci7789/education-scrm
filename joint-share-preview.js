(function(){
 const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=value=>value==null||value===''||!Number.isFinite(Number(value))?'待设置':'¥'+Number(value).toFixed(2);
 const host=document.getElementById('joint-share-view');
 try{
  const data=JointShareCodec.resolve(location.href,{getItem:key=>localStorage.getItem(key)});
  host.innerHTML='<p class="muted">联报活动预览 · 不提供在线报名或支付</p><h1>'+escape(data.name)+'</h1><p>'+escape(String(data.start).replace('T',' '))+' 至 '+escape(String(data.end).replace('T',' '))+'</p><h2>活动规则</h2>'+(data.rules.length?data.rules.map(r=>'<span class="tier">报名班级数量≥'+escape(r.quantity)+' · '+(r.mode==='discount'?'总价'+escape(r.value)+'折':'总价立减'+money(r.value))+'</span>').join(''):'<p>活动规则待重新设置，请联系机构确认。</p>')+'<p>优惠券叠加：'+(data.stackCoupon?'允许':'不允许')+'</p><p>参与用户类型：'+(data.participants.map(escape).join('、')||'待设置')+'</p><h2>参与课程</h2>'+data.courses.map(c=>'<div class="course"><strong>'+escape(c.name)+'</strong><div>课程原价：'+money(c.price)+'</div></div>').join('')+'<p class="muted">此页面为生成分享链接时的活动快照，实际活动与价格以机构最终确认为准。</p>';
 }catch(error){host.innerHTML='<h1>暂时无法打开活动</h1><p>'+escape(error.message||'链接无效，请重新获取分享链接。')+'</p>'}
})();
