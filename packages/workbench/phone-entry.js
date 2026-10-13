(()=>{
 if(!navigator.userAgent.includes('DSH/1.5'))return;
 let queued=false;
 const update=()=>{queued=false;const sheet=document.querySelector('[data-mobile-nav="info-sheet"]');if(!sheet||sheet.querySelector('[data-phone-control-entry]'))return;
  const link=document.createElement('a');link.dataset.phoneControlEntry='';link.textContent='手机操控';link.style.cssText='display:block;flex:none;margin:8px 14px;padding:12px;border:1px solid #9ab4d1;border-radius:4px;background:#eaf2fb;color:#132443;text-align:center;text-decoration:none;font-size:15px';
  link.href='/phone-control/native';link.addEventListener('click',event=>{event.preventDefault();let id;try{id=JSON.parse(localStorage.getItem('dsh.sessions.current')||'null')?.sessionId;}catch{}
   if(typeof id!=='string'||!/^[-A-Za-z0-9:_~]{1,256}$/.test(id)){alert('请先打开一条已保存的对话，再开启手机操控。');return;}
   location.assign('/phone-control/native?sessionId='+encodeURIComponent(id));
  });sheet.append(link);
 };
 const schedule=()=>{if(!queued){queued=true;requestAnimationFrame(update);}};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});update();},{once:true});else{new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});update();}
})();
