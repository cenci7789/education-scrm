// Delegate clicks so date fields added by page renders and dialogs behave alike.
globalThis.addEventListener?.('click',event=>{
  const input=event.target;
  if(!input?.matches?.('input[type="date"],input[type="datetime-local"],input[type="month"],input[type="week"]')||input.disabled||input.readOnly||input.matches(':disabled')||typeof input.showPicker!=='function')return;
  try{
    input.focus({preventScroll:true});
    input.showPicker();
    // Avoid opening/toggling the native icon picker a second time.
    event.preventDefault();
  }catch{
    // Keep native editing/icon behavior when the browser cannot open a picker.
  }
},true);
