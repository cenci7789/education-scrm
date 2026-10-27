const enrollmentManualChannels=Object.freeze(['现金','POS刷卡']);
function enrollmentCheckout(){
  const draft=a.enrollment;
  if(!draft.checkout)draft.checkout={mode:'手动录入',receipts:[{channel:'现金',amount:''}],note:'',couponOpen:false};
  return draft.checkout;
}
function enrollmentAmountCents(value){
  const cents=Math.round(Number(value)*100);
  return /^\d+(\.\d{1,2})?$/.test(String(value).trim())&&Number.isSafeInteger(cents)?cents:null;
}
function enrollmentQuote(){
  const items=[];
  for(const item of enrollmentSelectedClasses()){
    const price=enrollmentClassPrice(item);if(!price)return {error:'请检查所属课程的费用和讲次配置'};
    items.push({...item,price,discount:{type:'不优惠',value:''},discountCents:0,dueCents:price.totalCents});
  }
  return {items,originalCents:items.reduce((sum,x)=>sum+x.price.totalCents,0),discountCents:items.reduce((sum,x)=>sum+x.discountCents,0),dueCents:items.reduce((sum,x)=>sum+x.dueCents,0)};
}
function enrollmentRefreshQuote(){
  const quote=enrollmentQuote(),error=$('#checkout-error');
  if(error){error.textContent=quote.error||'';error.hidden=!quote.error}
  $('#checkout-original').textContent=enrollmentMoney(enrollmentTotal())+'元';
  $('#checkout-due').textContent=quote.error?'—':enrollmentMoney(quote.dueCents)+'元';
  $('#checkout-discount').textContent=quote.error?'—':enrollmentMoney(quote.discountCents)+'元';
  enrollmentSelectedClasses().forEach((item,index)=>{
    const row=$('#checkout-item-due-'+index);
    if(row)row.textContent=quote.error?'—':enrollmentMoney(quote.items[index].dueCents);
  });
}
function enrollmentReceiptId(index,key){return 'pay-'+key+(index?'-'+index:'')}
function enrollmentCaptureCheckout(){
  const checkout=enrollmentCheckout();
  if(checkout.mode==='手动录入'){
    checkout.receipts.forEach((receipt,index)=>{
      const channel=$('#'+enrollmentReceiptId(index,'channel')),amount=$('#'+enrollmentReceiptId(index,'amount'));
      if(channel)receipt.channel=channel.value;
      if(amount)receipt.amount=amount.value;
    });
  }
  const note=$('#pay-note');
  if(note)checkout.note=note.value;
}
function enrollmentChangePayMode(mode){
  enrollmentCaptureCheckout();enrollmentCheckout().mode=mode;academicRender();
}
function enrollmentAddReceipt(){enrollmentCaptureCheckout();enrollmentCheckout().receipts.push({channel:'现金',amount:''});academicRender()}
function enrollmentRemoveReceipt(index){
  enrollmentCaptureCheckout();const checkout=enrollmentCheckout();
  if(checkout.receipts.length>1){
    (checkout.receipts[index].proofs||[]).forEach(proof=>URL.revokeObjectURL(proof.url));
    checkout.receipts.splice(index,1);
  }
  academicRender();
}
function enrollmentAddProofs(index,files){
  const receipt=enrollmentCheckout().receipts[index];if(!receipt)return;
  enrollmentCaptureCheckout();
  receipt.proofs=receipt.proofs||[];
  const errors=[];
  for(const file of Array.from(files)){
    if(!/\.(png|jpe?g|webp|gif|pdf|docx?|xlsx?)$/i.test(file.name)){errors.push('请上传图片、PDF、Word 或 Excel 文件');continue}
    if(!file.size||file.size>20*1024*1024){errors.push('凭证须为非空文件，且每份不超过20 MB');continue}
    if(receipt.proofs.length>=10){errors.push('每笔收款最多上传10份凭证');break}
    receipt.proofs.push({fileName:file.name,size:file.size,type:file.type,url:URL.createObjectURL(file),image:/\.(png|jpe?g|webp|gif)$/i.test(file.name)&&file.type.startsWith('image/')});
  }
  academicRender();
  if(errors.length)toast([...new Set(errors)].join('；'));
}
function enrollmentRemoveProof(receiptIndex,proofIndex){
  enrollmentCaptureCheckout();
  const proofs=enrollmentCheckout().receipts[receiptIndex].proofs||[];
  const removed=proofs.splice(proofIndex,1)[0];if(removed)URL.revokeObjectURL(removed.url);
  academicRender();
}
function enrollmentDisposeProofs(keep=[]){
  for(const receipt of a.enrollment?.checkout?.receipts||[]){
    for(const proof of receipt.proofs||[])if(!keep.includes(proof.url))URL.revokeObjectURL(proof.url);
    receipt.proofs=[];
  }
}
function enrollmentProofLink(proof){
  if(!proof.url?.startsWith('blob:'))return '';
  return `<a class="checkout-proof-link" href="${esc(proof.url)}" download="${esc(proof.fileName)}">${proof.image?`<img src="${esc(proof.url)}" alt="${esc(proof.fileName)}">`:''}<span>↧ ${esc(proof.fileName)}</span></a>`;
}
function enrollmentOrderProofsHTML(order){
  const receipts=(order.receipts||[]).filter(receipt=>receipt.proofs?.length);
  if(!receipts.length)return '';
  return `<details class="checkout-order-proofs"><summary>收款凭证（${receipts.reduce((count,receipt)=>count+receipt.proofs.length,0)}）</summary>${receipts.map(receipt=>`<p class="help">${esc(receipt.channel)} · ¥${enrollmentMoney(receipt.amountCents)}</p>${receipt.proofs.map(enrollmentProofLink).join('')}`).join('')}</details>`;
}
function enrollmentToggleCoupon(){enrollmentCaptureCheckout();const checkout=enrollmentCheckout();checkout.couponOpen=!checkout.couponOpen;academicRender()}
function enrollmentPaymentBack(){enrollmentCaptureCheckout();a.enrollStep=2;academicRender()}
function enrollmentReceiptFields(){
  const checkout=enrollmentCheckout();
  if(checkout.mode!=='手动录入')return '<p class="checkout-payment-notice">商城支付尚未接入支付服务，提交后仅生成待付款订单。</p>';
  return `<div class="checkout-field"><label class="required">实收金额</label><div class="checkout-receipts">${checkout.receipts.map((receipt,index)=>`<div class="checkout-receipt-group"><div class="checkout-receipt">
    ${enrollmentSelect(enrollmentReceiptId(index,'channel'),enrollmentManualChannels,receipt.channel,'选择收款渠道')}
    <input class="input" id="${enrollmentReceiptId(index,'amount')}" type="number" min="0" step="0.01" value="${esc(receipt.amount)}" placeholder="请输入金额" aria-label="第${index+1}笔实收金额" oninput="enrollmentCheckout().receipts[${index}].amount=this.value">
    <button class="btn small" onclick="document.getElementById('pay-proof-${index}').click()">＋ 上传凭证（必填）</button><input id="pay-proof-${index}" type="file" accept=".png,.jpg,.jpeg,.webp,.gif,.pdf,.doc,.docx,.xls,.xlsx" multiple hidden onchange="enrollmentAddProofs(${index},this.files)">
    ${index===0?'<button class="checkout-link" onclick="enrollmentAddReceipt()">＋ 添加收款</button>':`<button class="btn small" onclick="enrollmentRemoveReceipt(${index})">移除收款</button>`}</div>
    <div class="checkout-proofs">${(receipt.proofs||[]).map((proof,proofIndex)=>`<div class="checkout-proof">${enrollmentProofLink(proof)}<button class="checkout-link" aria-label="移除凭证${esc(proof.fileName)}" onclick="enrollmentRemoveProof(${index},${proofIndex})">移除</button></div>`).join('')}</div></div>`).join('')}<p class="help">每笔手动收款须上传凭证。支持图片、PDF、Word、Excel，每份不超过20 MB。凭证随业务记录保存在本机浏览器中。</p></div></div>`;
}
enrollPayment=function(){
  const d=a.enrollment.data,checkout=enrollmentCheckout(),quote=enrollmentQuote(),operator=leadCurrentOperator();
  return `<div class="enrollment-checkout"><section><h2 class="section-title">订单确认</h2><p class="checkout-student">${esc(d.name)}　${esc(d.phone)}</p>`+
    aTable(['购买项目','原价金额（元）','应收金额（元）'],enrollmentSelectedClasses().map((item,index)=>{
      const price=enrollmentClassPrice(item);
      return `<tr><td><strong>${esc(item.class?.name||'班级已移除')}</strong></td><td>${price?enrollmentMoney(price.totalCents):'—'}</td><td id="checkout-item-due-${index}">${quote.error?'—':enrollmentMoney(quote.items[index].dueCents)}</td></tr>`;
    }))+`<p class="checkout-error" id="checkout-error" role="status" ${quote.error?'':'hidden'}>${esc(quote.error||'')}</p></section>
    <section><h2 class="section-title">费用结算</h2><div class="checkout-field"><label>原价合计</label><span id="checkout-original">${enrollmentMoney(enrollmentTotal())}元</span></div>
    <div class="checkout-field"><label>优惠券</label><div><button class="checkout-link" onclick="enrollmentToggleCoupon()">＋ 选择优惠券</button>${checkout.couponOpen?'<p class="help">学员优惠券核验服务待接入，暂无法选择优惠券。</p>':''}</div></div>
    <div class="checkout-field"><label>优惠合计</label><span id="checkout-discount">${quote.error?'—':enrollmentMoney(quote.discountCents)+'元'}</span></div>
    <div class="checkout-field"><label>应收金额</label><strong id="checkout-due">${quote.error?'—':enrollmentMoney(quote.dueCents)+'元'}</strong></div></section>
    <section><h2 class="section-title">收款</h2><div class="checkout-field"><label class="required">支付方式</label><div class="lead-radio">${['手动录入','商城支付'].map(mode=>`<label><input type="radio" name="checkout-mode" value="${mode}" ${checkout.mode===mode?'checked':''} onclick="enrollmentChangePayMode(this.value)"> ${mode}</label>`).join('')}</div></div>${enrollmentReceiptFields()}</section>
    <section><h2 class="section-title">其他信息</h2>
    <div class="checkout-field"><label class="required">经办人</label><strong>${esc(leadIdentityLabel(operator))}</strong></div>
    <div class="checkout-field"><label for="pay-note">备注</label><textarea class="textarea" id="pay-note" maxlength="50" placeholder="请输入50字以内备注内容（非必填）" oninput="enrollmentCheckout().note=this.value">${esc(checkout.note)}</textarea></div></section>
    <div class="form-actions checkout-actions"><button class="btn" onclick="enrollmentPaymentBack()">上一步</button><button class="btn primary" onclick="finishEnroll()">立即报名</button></div></div>`;
};
function enrollmentValidateCheckout(){
  enrollmentCaptureCheckout();
  const checkout=enrollmentCheckout(),quote=enrollmentQuote();
  if(quote.error){toast(quote.error);return null}
  if(checkout.note.length>50){toast('备注不能超过50字');return null}
  if(!['手动录入','商城支付'].includes(checkout.mode)){toast('请选择支付方式');return null}
  let receipts=[];
  if(checkout.mode==='手动录入'){
    for(const receipt of checkout.receipts){
      const amountCents=enrollmentAmountCents(receipt.amount);
      if(!enrollmentManualChannels.includes(receipt.channel)||amountCents===null){toast('请填写每笔收款的渠道和有效金额');return null}
      if(!receipt.proofs?.length){toast('请为每笔手动收款上传凭证');return null}
      receipts.push({channel:receipt.channel,amountCents,proofs:receipt.proofs.map(proof=>({...proof}))});
    }
  }
  const paidCents=receipts.reduce((sum,x)=>sum+x.amountCents,0);
  if(paidCents>quote.dueCents){toast('实收合计不能超过应收金额');return null}
  return {...quote,receipts,paidCents,mode:checkout.mode,note:checkout.note,operator:leadCurrentOperator()};
}
globalThis.addEventListener?.('pagehide',()=>enrollmentDisposeProofs());
