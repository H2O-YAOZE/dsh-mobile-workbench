(() => {
  const embedded=window.parent!==window && new URL(location.href).searchParams.get('embedded')==='1';
  if(embedded)document.documentElement.dataset.embedded='';
  window.dshNavigate=path=>{if(embedded)parent.postMessage({type:'dsh-workspace-navigation',path},location.origin);else location.href=path};
  document.addEventListener('click',e=>{if(e.defaultPrevented||e.ctrlKey||e.metaKey)return;const a=e.target.closest('a[href]');if(!a||a.target||a.hasAttribute('download'))return;const u=new URL(a.href);if(u.origin!==location.origin)return;
    if(embedded&&u.pathname==='/'&&!u.searchParams.has('dsh-view')){e.preventDefault();window.dshNavigate(u.pathname+u.search);return}
    if(embedded&&u.pathname==='/usage'){e.preventDefault();window.dshNavigate('/usage');return}
    if(embedded&&u.pathname==='/projects'&&typeof window.dshProjectRoute==='function'){e.preventDefault();u.searchParams.set('embedded','1');history.replaceState(null,'',u);window.dshProjectRoute();const route=new URL(u);route.searchParams.delete('embedded');parent.postMessage({type:'dsh-workspace-navigation',path:route.pathname+route.search,inline:true},location.origin)}
  });
})();
