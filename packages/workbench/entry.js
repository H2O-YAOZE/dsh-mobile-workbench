(() => {
  function install() {
    const observer = new MutationObserver(update);
    function update() {
      if(document.querySelector('[data-qq="titlebar"]'))return;
      const host= document.querySelector('[class$="_settingsArea"]');
      if(!host || host.querySelector('[data-usage-entry]'))return;
      const link=document.createElement('a');link.href='/usage';link.dataset.usageEntry='';link.textContent='Token 用量';link.setAttribute('aria-label','查看电脑本机和 DSH 云端 Token 用量');
      const settings=host.querySelector('[data-mobile-nav="home-settings"]');
      if(settings)settings.before(link);else host.append(link);
    }
    observer.observe(document.body,{childList:true,subtree:true});update();
    window.addEventListener('pagehide',()=>observer.disconnect(),{once:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();

(() => {
  if (!matchMedia('(max-width:767px)').matches || window !== window.top) return;
  if(window.__dshShellInstalled)return;window.__dshShellInstalled=true;
  let panel, frame, nav, section='对话', current='/projects', previous='对话';
  const style=document.createElement('style');
  style.textContent=`html[data-dsh-shell] [data-qq="footer"]:not([data-shell-nav]){display:none!important}nav[data-shell-nav]{position:fixed!important;inset:auto 0 0!important;z-index:31!important;display:flex!important;padding-bottom:env(safe-area-inset-bottom)!important}#dsh-shell-panel{position:fixed;inset:0 0 calc(60px + env(safe-area-inset-bottom));z-index:30;background:#f5f6f8}#dsh-shell-panel iframe{width:100%;height:100%;border:0;background:#f5f6f8}#dsh-shell-panel[hidden]{display:none}html[data-dsh-shell] [data-mobile-nav="home"]{padding-bottom:calc(64px + env(safe-area-inset-bottom))}`;
  document.head.append(style);
  function active(name){section=name;for(const b of nav.children){const yes=b.textContent.trim()===name;b.toggleAttribute('data-active',yes);if(yes)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')}}
  function root(action){panel.hidden=true;window.dispatchEvent(new CustomEvent('dsh-shell-navigation',{detail:action}))}
  function show(path,push=true){const u=new URL(path,location.origin);if(u.origin!==location.origin||!['/projects','/usage'].includes(u.pathname))return;current=u.pathname+u.search;panel.hidden=false;active(u.pathname==='/usage'?'用量':'项目');if(frame.dataset.route!==current){frame.dataset.route=current;u.searchParams.set('embedded','1');frame.src=u.pathname+u.search}if(push)history.pushState({...history.state,dshShell:current},'',location.href)}
  function home(push=true){root({action:'home'});active('对话');if(push)history.pushState({...history.state,dshShell:'home'},'',location.href)}
  function navigate(path){const u=new URL(path,location.origin);if(u.origin!==location.origin)return;if(['/projects','/usage'].includes(u.pathname)){show(u.pathname+u.search);return}if(u.pathname!=='/')return;const sessionId=u.searchParams.get('dsh-open-session'),workspaceId=u.searchParams.get('dsh-project-workspace');if(sessionId||workspaceId){root({action:'open',sessionId,workspaceId});active('对话');history.pushState({...history.state,dshShell:'home'},'',location.href)}else if(u.searchParams.get('qq-settings')==='1'){previous=section;root({action:'settings'});active('设置')}else home()}
  function install(){const original=document.querySelector('[data-qq="footer"]');if(!original||nav)return;nav=original.cloneNode(true);nav.setAttribute('data-shell-nav','');nav.removeAttribute('id');panel=document.createElement('section');panel.id='dsh-shell-panel';panel.hidden=true;panel.setAttribute('aria-label','项目与用量');frame=document.createElement('iframe');frame.title='DSH 工作台';panel.append(frame);document.body.append(panel,nav);document.documentElement.dataset.dshShell='';
    nav.addEventListener('click',e=>{const b=e.target.closest('a,button');if(!b)return;e.preventDefault();e.stopPropagation();const name=b.textContent.trim();if(name==='对话')home();else if(name==='项目')show('/projects');else if(name==='用量')show('/usage');else if(name==='设置'){previous=section;root({action:'settings'});active('设置')}});
    const view=history.state?.dshShell;if(view)show(view,false);
  }
  const observer=new MutationObserver(install);observer.observe(document.documentElement,{subtree:true,childList:true});install();
  document.addEventListener('click',e=>{if(!nav||e.target.closest('[data-shell-nav]')||e.defaultPrevented||e.ctrlKey||e.metaKey)return;const a=e.target.closest('a[href]');if(!a||a.target||a.hasAttribute('download'))return;const u=new URL(a.href);if(u.origin===location.origin&&['/projects','/usage'].includes(u.pathname)){e.preventDefault();e.stopPropagation();navigate(u.pathname+u.search)}},true);
  window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==frame?.contentWindow||e.data?.type!=='dsh-workspace-navigation')return;if(e.data.inline)frame.dataset.route=e.data.path;navigate(e.data.path)});
  window.addEventListener('popstate',e=>{if(!nav)return;const path=e.state?.dshShell||new URL(location.href).searchParams.get('dsh-view');if(path&&path!=='home')show(path,false);else home(false)});
  window.addEventListener('dsh-settings-closed',()=>{if(section!=='设置')return;if(previous==='项目'||previous==='用量')show(current,false);else active('对话')});
})();
