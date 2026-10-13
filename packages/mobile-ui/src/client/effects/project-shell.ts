declare global { interface Window { __dshShellInstalled?: boolean } }
export {}
(() => {
  if (!matchMedia('(max-width:767px)').matches || window !== window.top) return;
  if(window.__dshShellInstalled)return;window.__dshShellInstalled=true;
  let panel:HTMLElement,frame:HTMLIFrameElement,nav:HTMLElement,section='对话',current='/projects',previous='对话';
  const style=document.createElement('style');
  style.textContent=`@media(max-width:767px){
html[data-dsh-shell] [data-qq="footer"]:not([data-shell-nav]){display:none!important}
nav[data-shell-nav]{position:fixed!important;inset:auto 0 var(--dsh-shell-gap,0px)!important;z-index:31!important;display:flex!important;padding-bottom:env(safe-area-inset-bottom)!important}
html[data-dsh-shell] [data-mobile-nav="frame"]{box-sizing:border-box!important;padding-bottom:calc(var(--dsh-shell-footer,60px) + var(--dsh-shell-gap,0px))!important;min-height:0!important}
html[data-dsh-shell] [data-mobile-nav="home"]{bottom:calc(var(--dsh-shell-footer,60px) + var(--dsh-shell-gap,0px))!important;padding-bottom:0!important;min-height:0!important}
#dsh-shell-panel{position:fixed;inset:var(--dsh-shell-top,0px) 0 calc(var(--dsh-shell-footer,60px) + var(--dsh-shell-gap,0px));z-index:30;background:#f5f6f8}
#dsh-shell-panel iframe{width:100%;height:100%;border:0;background:#f5f6f8}
#dsh-shell-panel[hidden]{display:none}
}`;
  let layoutFrame=0;
  function scheduleLayout():void{if(layoutFrame)return;layoutFrame=requestAnimationFrame(()=>{layoutFrame=0;if(!nav)return;const viewport=window.visualViewport;const zoomed=viewport&&Math.abs(viewport.scale-1)>.01;const gap=viewport&&!zoomed?Math.max(0,innerHeight-viewport.height-viewport.offsetTop):0;const height=nav.getBoundingClientRect().height;const root=document.documentElement;for(const [key,value] of [['--dsh-shell-footer',height+'px'],['--dsh-shell-gap',gap+'px'],['--dsh-shell-top',(viewport&&!zoomed?viewport.offsetTop:0)+'px']] as const){if(root.style.getPropertyValue(key)!==value)root.style.setProperty(key,value)}})}
  window.addEventListener('resize',scheduleLayout);window.visualViewport?.addEventListener('resize',scheduleLayout);window.visualViewport?.addEventListener('scroll',scheduleLayout);
  document.head.append(style);
  function active(name:string):void{section=name;for(const b of nav.children){const yes=(b.textContent||'').trim()===name;b.toggleAttribute('data-active',yes);if(yes)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')}}
  function root(action:Record<string,unknown>):void{panel.hidden=true;window.dispatchEvent(new CustomEvent('dsh-shell-navigation',{detail:action}))}
  function show(path:string,push=true):void{const u=new URL(path,location.origin);if(u.origin!==location.origin||!['/projects','/usage'].includes(u.pathname))return;current=u.pathname+u.search;panel.hidden=false;active(u.pathname==='/usage'?'用量':'项目');if(frame.dataset.route!==current){frame.dataset.route=current;u.searchParams.set('embedded','1');frame.src=u.pathname+u.search}if(push)history.pushState({...history.state,dshShell:current},'',location.href)}
  function home(push=true):void{root({action:'home'});active('对话');if(push)history.pushState({...history.state,dshShell:'home'},'',location.href)}
  function navigate(path:string):void{const u=new URL(path,location.origin);if(u.origin!==location.origin)return;if(['/projects','/usage'].includes(u.pathname)){show(u.pathname+u.search);return}if(u.pathname!=='/')return;const sessionId=u.searchParams.get('dsh-open-session'),workspaceId=u.searchParams.get('dsh-project-workspace');if(sessionId||workspaceId){root({action:'open',sessionId,workspaceId});active('对话');history.pushState({...history.state,dshShell:'home'},'',location.href)}else if(u.searchParams.get('qq-settings')==='1'){previous=section;root({action:'settings'});active('设置')}else home()}
  function install():void{const original=document.querySelector('[data-qq="footer"]');if(!original||nav)return;nav=original.cloneNode(true) as HTMLElement;nav.setAttribute('data-shell-nav','');nav.removeAttribute('id');panel=document.createElement('section');panel.id='dsh-shell-panel';panel.hidden=true;panel.setAttribute('aria-label','项目与用量');frame=document.createElement('iframe');frame.title='DSH 工作台';panel.append(frame);document.body.append(panel,nav);document.documentElement.dataset.dshShell='';new ResizeObserver(scheduleLayout).observe(nav);scheduleLayout();
    nav.addEventListener('click',e=>{const b=(e.target as Element).closest<HTMLElement>('a,button');if(!b)return;e.preventDefault();e.stopPropagation();const name=(b.textContent||'').trim();if(name==='对话')home();else if(name==='项目')show('/projects');else if(name==='用量')show('/usage');else if(name==='设置'){previous=section;root({action:'settings'});active('设置')}});
    const view=history.state?.dshShell;if(view)show(view,false);
  }
  const observer=new MutationObserver(install);observer.observe(document.documentElement,{subtree:true,childList:true});install();
  document.addEventListener('click',e=>{if(!nav||(e.target as Element).closest('[data-shell-nav]')||e.defaultPrevented||e.ctrlKey||e.metaKey)return;const a=(e.target as Element).closest<HTMLAnchorElement>('a[href]');if(!a||a.target||a.hasAttribute('download'))return;const u=new URL(a.href);if(u.origin===location.origin&&['/projects','/usage'].includes(u.pathname)){e.preventDefault();e.stopPropagation();navigate(u.pathname+u.search)}},true);
  window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==frame?.contentWindow||e.data?.type!=='dsh-workspace-navigation')return;if(typeof e.data.path!=='string'||e.data.path.length>2000)return;if(e.data.inline)frame.dataset.route=e.data.path;navigate(e.data.path)});
  window.addEventListener('popstate',e=>{if(!nav)return;const path=e.state?.dshShell||new URL(location.href).searchParams.get('dsh-view');if(path&&path!=='home')show(path,false);else home(false)});
  window.addEventListener('dsh-settings-closed',()=>{if(section!=='设置')return;if(previous==='项目'||previous==='用量')show(current,false);else active('对话')});
})();
