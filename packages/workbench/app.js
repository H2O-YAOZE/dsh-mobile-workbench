'use strict';
import {computerView} from './usage-view.js';
const $=id=>document.getElementById(id), names={codex:'Codex',claude:'Claude Code / DeepSeek 本机',workbuddy:'WorkBuddy',dsh:'DSH 云端'};
const sourceNames={codex:'Codex 本机',claude_other:'Claude Code 本机',deepseek_local:'DeepSeek 本机（含本地 DSH）',deepseek_cloud:'DSH 云端',workbuddy:'WorkBuddy 本机'};
const purposeNames={reply:'主对话',attempt:'未形成回复的尝试',title:'标题生成',search:'辅助搜索'};
let current=null,stream=null,scope=new URLSearchParams(location.search).get('scope')==='cloud'?'cloud':'computer',view=null;
const number=n=>Number(n||0), sum=rows=>rows.reduce((n,r)=>n+number(r.total),0);
const exact=n=>number(n).toLocaleString('zh-CN');
const compact=n=>n>=1e8?(n/1e8).toFixed(2)+' 亿':n>=1e4?(n/1e4).toFixed(2)+' 万':exact(n);
const label=(tag,text,cls)=>{const n=document.createElement(tag);n.textContent=text;if(cls)n.className=cls;return n;};
/* trend-core:start —— 用量趋势核心，自检脚本按此标记抽取，改动时保留两个标记 */
function createTrendCore(){
  const colors={total:['--tc-total','#3478f6'],codex:['--tc-codex','#ed7816'],deepseek:['--tc-deepseek','#009da4'],workbuddy:['--tc-workbuddy','#8656d9'],other:['--tc-other','#657482'],grid:['--tc-grid','#edf0f4'],axis:['--tc-axis','#737b89']};
  const varcss=key=>'var('+colors[key][0]+','+colors[key][1]+')';
  const paint=(key,prop)=>prop+'="'+colors[key][1]+'"';
  const num=value=>Number(value||0);
  const exact=value=>num(value).toLocaleString('zh-CN');
  const compact=value=>{const n=num(value);return n>=1e8?(n/1e8).toFixed(2)+' 亿':n>=1e4?(n/1e4).toFixed(2)+' 万':exact(n);};
  const axisLabel=value=>{const n=num(value);if(n<1e4)return exact(n);if(n<1e8){const x=n/1e4;return (x>=100?Math.round(x):Number(x.toFixed(1)))+' 万';}const y=n/1e8;return (y>=10?Math.round(y):Number(y.toFixed(1)))+' 亿';};
  const group=app=>app==='codex'?'codex':app==='workbuddy'?'workbuddy':app==='claude'||app==='dsh'?'deepseek':'other';
  const shift=(day,days)=>{const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);};
  const span=(from,to)=>{const out=[];let day=from;while(day<=to){out.push(day);day=shift(day,1);}return out;};
  const niceMax=max=>{if(!(max>0))return 1;const exp=Math.pow(10,Math.floor(Math.log10(max))),base=max/exp;return (base<=1?1:base<=2?2:base<=2.5?2.5:base<=5?5:10)*exp;};
  const esc=value=>String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  function daily(envelope){
    const rows=new Map();
    const add=(day,app,total)=>{if(!day)return;if(!rows.has(day))rows.set(day,{day,codex:0,deepseek:0,workbuddy:0,other:0,total:0});const row=rows.get(day),value=num(total);row[group(app)]+=value;row.total+=value;};
    for(const row of (envelope&&envelope.source_daily)||[])if(row.source!=='deepseek_cloud')add(row.day,row.app,row.total);
    for(const row of (envelope&&envelope.dsh_cloud&&envelope.dsh_cloud.daily)||[])add(row.day,row.app||'dsh',row.total);
    return [...rows.values()].sort((a,b)=>a.day.localeCompare(b.day));
  }
  function points(envelope,range){
    const rows=daily(envelope);
    const marks=[envelope&&envelope.today,envelope&&envelope.dsh_cloud&&envelope.dsh_cloud.today,rows.length?rows[rows.length-1].day:''].filter(Boolean).sort();
    const today=marks.length?marks[marks.length-1]:'';
    if(!today)return {today:'',range,weekly:false,labels:[],points:[],grandTotal:0};
    const index=new Map(rows.map(row=>[row.day,row]));
    const start=range==='all'?(rows.length?rows[0].day:today):shift(today,-(Number(range)-1));
    const days=span(start,today),weekly=days.length>60,buckets=[];
    if(weekly){for(let end=days.length-1;end>=0;end-=7)buckets.push(days.slice(Math.max(0,end-6),end+1));buckets.reverse();}
    else for(const day of days)buckets.push([day]);
    const keys=['total','codex','deepseek','workbuddy','other'];
    const labels=[],values=Object.fromEntries(keys.map(key=>[key,[]]));
    for(const bucket of buckets){
      const sums=Object.fromEntries(keys.map(key=>[key,0]));
      for(const day of bucket){const row=index.get(day);if(!row)continue;for(const key of keys)sums[key]+=row[key];}
      const last=bucket[bucket.length-1];
      labels.push({day:last,from:bucket[0],to:last,days:bucket.length,text:last.slice(5),tip:bucket.length>1?bucket[0]+' 至 '+last+'（'+bucket.length+' 天）':last});
      for(const key of keys)values[key].push(sums[key]);
    }
    const named=[['total','总量'],['codex','Codex'],['deepseek','DeepSeek'],['workbuddy','WorkBuddy'],['other','其他']];
    const list=named.filter(([id])=>id!=='other'||values.other.some(value=>value>0)).map(([id,name])=>({id,name,color:id,values:values[id],total:values[id].reduce((a,b)=>a+b,0)}));
    return {today,range,weekly,labels,points:list,grandTotal:list.find(line=>line.id==='total').total};
  }
  function svg(model,mode){
    const series=model.points.filter(line=>mode==='total'?line.id==='total':line.id!=='total');
    const n=model.labels.length;
    const W=340,H=184,left=48,right=14,top=14,bottom=28,plotW=W-left-right,plotH=H-top-bottom;
    if(!n||!series.length)return '';
    const ceiling=niceMax(Math.max(1,...series.flatMap(line=>line.values)));
    const x=i=>n<=1?left+plotW/2:left+plotW*i/(n-1);
    const y=value=>top+plotH-Math.min(1,num(value)/ceiling)*plotH;
    const out=[];
    out.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+esc(mode==='total'?'Token 总量折线图':'分应用 Token 折线图')+'">');
    for(const tick of [0,ceiling/2,ceiling]){
      const ty=y(tick);
      out.push('<line x1="'+left+'" y1="'+ty.toFixed(1)+'" x2="'+(W-right)+'" y2="'+ty.toFixed(1)+'" stroke-width="1" '+(tick?'stroke-dasharray="3 5" ':'')+paint('grid','stroke')+'/>');
      out.push('<text x="'+(left-8)+'" y="'+(ty+3.5).toFixed(1)+'" text-anchor="end" font-size="11" '+paint('axis','fill')+'>'+esc(axisLabel(tick))+'</text>');
    }
    for(const line of series){
      if(n>1)out.push('<polyline points="'+model.labels.map((_,i)=>x(i).toFixed(1)+','+y(line.values[i]).toFixed(1)).join(' ')+'" fill="none" stroke-width="1.2" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round" '+paint(line.color,'stroke')+'/>');
      out.push('<circle cx="'+x(n-1).toFixed(1)+'" cy="'+y(line.values[n-1]).toFixed(1)+'" r="'+(n>1?2:3)+'" '+paint(line.color,'fill')+'/>');
    }
    const ticks=n<=5?model.labels.map((_,i)=>i):[...new Set([0,Math.round((n-1)/4),Math.round((n-1)/2),Math.round((n-1)*3/4),n-1])];
    for(const i of ticks)out.push('<text x="'+x(i).toFixed(1)+'" y="'+(H-9)+'" text-anchor="'+(n===1?'middle':i===0?'start':i===n-1?'end':'middle')+'" font-size="11" '+paint('axis','fill')+'>'+esc(model.labels[i].text)+'</text>');
    const band=n>1?plotW/(n-1):plotW;
    model.labels.forEach((point,i)=>{
      const tip=[point.tip];
      for(const line of model.points)tip.push(line.name+'：'+exact(line.values[i])+' Token');
      out.push('<rect x="'+(x(i)-band/2).toFixed(1)+'" y="'+top+'" width="'+band.toFixed(1)+'" height="'+plotH+'" fill="transparent"><title>'+esc(tip.join('\n'))+'</title></rect>');
    });
    out.push('</svg>');
    return out.join('');
  }
  return {daily,points,svg,color:key=>varcss(key),compact,exact,axisLabel,niceMax,group};
}
/* trend-core:end */
const trendCore=createTrendCore();
let trendRange=(()=>{try{const saved=localStorage.getItem('usage.trend.range');return ['7','30','all'].includes(saved)?saved:'7';}catch{return '7';}})();
const metrics=['input','output','cache_read','cache_write','reasoning','total','requests','split_missing'];
function totals(rows){return Object.fromEntries(metrics.map(key=>[key,rows.reduce((n,r)=>n+number(r[key]),0)]));}
function grouped(rows,key){const groups=new Map();for(const row of rows){if(!groups.has(row[key]))groups.set(row[key],[]);groups.get(row[key]).push(row);}return [...groups].map(([name,rows])=>({name,...totals(rows)})).sort((a,b)=>b.total-a.total||a.name.localeCompare(b.name));}
function metricGrid(values){
  const grid=label('dl','', 'metric-grid');
  for(const [key,title] of [['input','输入'],['output','输出'],['cache_read','缓存读取'],['cache_write','缓存写入'],['reasoning','推理']]){
    const cell=label('div','');cell.append(label('dt',title),label('dd',exact(values[key])));grid.append(cell);
  }
  return grid;
}
function clientDetail(snapshot,app,days,body){
  const within=r=>r.app===app.id&&r.day<=snapshot.today&&(days==='all'||r.day>=prior(snapshot.today,Number(days)-1));
  const rows=snapshot.daily.filter(within),values=totals(rows);body.replaceChildren();
  const total=label('p','', 'detail-total');total.append(label('span','所选期间合计'),label('strong',exact(values.total)+' Token'));body.append(total);
  if(!rows.length&&!(app.id==='dsh'&&snapshot.tasks?.length)){body.append(label('p','这段期间没有可读记录。','client-note'));return;}
  body.append(metricGrid(values),label('p','缓存和推理是明细，不再叠加到总量。分项为日志中已报告的数值，未报告的部分无法拆分。','client-note'));
  if(values.split_missing)body.append(label('p',exact(values.split_missing)+' 条记录只有总量，缺少输入／输出拆分。','client-note'));
  body.append(label('h3','全部模型'));
  for(const model of grouped(snapshot.models.filter(within),'model')){
    const item=label('details','', 'model-detail'),summary=label('summary',''),line=label('div','', 'detail-line');
    line.append(label('span',model.name),label('strong',exact(model.total)+' Token'));summary.append(line);item.append(summary,metricGrid(model));
    item.append(label('p','计量条数：'+exact(model.requests)+(model.split_missing?'；其中 '+exact(model.split_missing)+' 条缺少输入／输出拆分':''),'client-note'));body.append(item);
  }
  const sources=grouped((snapshot.source_daily||[]).filter(within),'source');
  if(sources.length){body.append(label('h3','来源构成'));for(const source of sources){const line=label('div','', 'detail-line');line.append(label('span',sourceNames[source.name]||source.name),label('span',exact(source.total)+' Token'));body.append(line);}}
  const daily=label('details','', 'daily-detail');daily.append(label('summary','每日用量 · '+rows.length+' 天'));
  for(const row of [...rows].sort((a,b)=>b.day.localeCompare(a.day))){const line=label('div','', 'detail-line');line.append(label('span',row.day),label('span',exact(row.total)+' Token'));daily.append(line);}
  body.append(daily);
  if(app.id==='dsh'){
    const purposes=grouped(snapshot.models.filter(within),'purpose');
    if(purposes.length){body.append(label('h3','调用用途'));for(const purpose of purposes){const line=label('div','', 'detail-line');line.append(label('span',purposeNames[purpose.name]||'未分类'),label('span',exact(purpose.total)+' Token'));body.append(line);}}
    body.append(label('h3','按任务查看'));
    let shown=0;
    for(const task of snapshot.tasks||[]){
      const taskRows=(task.rows||[]).filter(r=>r.day<=snapshot.today&&(days==='all'||r.day>=prior(snapshot.today,Number(days)-1)));
      if(!taskRows.length&&!(task.unmetered>0))continue;
      if(++shown>100)break;
      const item=label('details','', 'model-detail'),summary=label('summary',''),line=label('div','', 'detail-line');
      line.append(label('span','任务 '+String(task.id).slice(0,8)),label('strong',taskRows.length?exact(sum(taskRows))+' Token':'用量未报告'));
      summary.append(line);item.append(summary,label('p','会话 ID：'+task.id,'client-note'));
      if(taskRows.length)item.append(metricGrid(totals(taskRows)));
      for(const model of grouped(taskRows,'model')){const row=label('div','', 'detail-line');row.append(label('span',model.name),label('span',exact(model.total)+' Token'));item.append(row);}
      if(task.unmetered)item.append(label('p','此会话另有 '+exact(task.unmetered)+' 次尝试未报告 Token，用量未知。','client-note'));
      body.append(item);
    }
    body.append(label('p','任务对应 DSH 会话；列表最多显示最近 100 项，总量包含全部已读取会话。未报告用量的次数按会话全历史记录。','client-note'));
  }
}
function prior(day,days){const d=new Date(day+'T12:00:00+08:00');d.setUTCDate(d.getUTCDate()-days);return d.toISOString().slice(0,10);}
function time(value){return value?new Date(value).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}):'—';}
function renderTrend(envelope){
  const model=trendCore.points(envelope,trendRange);
  for(const button of document.querySelectorAll('.range-tabs button'))button.setAttribute('aria-pressed',String(button.dataset.range===trendRange));
  $('trend-range-note').textContent=(model.weekly?'按周汇总 · ':'')+(model.today?'截至 '+model.today:'');
  const total=model.points.find(line=>line.id==='total'),hostTotal=$('chart-total'),hostSplit=$('chart-split'),legend=$('chart-legend');
  if(!model.labels.length||!total){hostTotal.replaceChildren(label('p','暂无用量记录','chart-empty'));hostSplit.replaceChildren();legend.replaceChildren();$('trend-total-sum').textContent='—';$('trend-total-sum').removeAttribute('title');return;}
  $('trend-period-label').textContent=({'7':'近 7 天 Token','30':'近 30 天 Token',all:'累计 Token'})[trendRange];$('trend-total-sum').textContent=compact(total.total);$('trend-total-sum').title=exact(total.total)+' Token';
  hostTotal.innerHTML=trendCore.svg(model,'total');
  hostSplit.innerHTML=trendCore.svg(model,'split');
  legend.replaceChildren();
  for(const line of model.points.filter(item=>item.id!=='total')){
    const item=label('span',''),dot=label('i','');
    dot.dataset.series=line.color;
    item.append(dot,label('span',line.name));
    legend.append(item);
  }
}
for(const button of document.querySelectorAll('.range-tabs button'))button.addEventListener('click',()=>{trendRange=button.dataset.range;try{localStorage.setItem('usage.trend.range',trendRange);}catch{}if(current)renderTrend(current);});
function render(envelope,force=false){
  if(!envelope)return;
  if(!force&&current?.snapshot_id===envelope.snapshot_id)return;
  current=envelope;
  renderTrend(envelope);
  const cloud=scope==='cloud', snapshot=cloud?envelope.dsh_cloud:computerView(envelope);
  view=snapshot;
  for(const id of ['computer','cloud']){$('tab-'+id).setAttribute('aria-selected',String(scope===id));$('tab-'+id).tabIndex=scope===id?0:-1;}
  $('scope-panel').setAttribute('aria-labelledby','tab-'+scope);
  $('scope-title').textContent=cloud?'DSH 云端用量':'电脑本机用量';
  $('scope-note').textContent=cloud?'手机或电脑发起、在 DSH 云端执行的任务均记在这里；电脑关机后也独立记录。'+(snapshot?.unmetered?' 另有 '+exact(snapshot.unmetered)+' 次尝试未报告 Token，用量未知。':''):'打开 Codex 后自动采集并上传；仅计电脑本机，已排除 DSH 云端记录。';
  $('captured-label').textContent=cloud?'最近一次已报告用量':'电脑采集时间';
  $('received-label').textContent=cloud?'云端历史核对时间':'云端接收时间';
  $('empty').hidden=cloud?!!snapshot:envelope.desktop_available!==false;
  $('empty').textContent=cloud?'正在准备 DSH 云端计量。':'还没有收到电脑快照；DSH 云端用量可独立查看。';
  $('content').hidden=!$('empty').hidden;
  if(!snapshot)return;
  $('captured').textContent=time(snapshot.captured_at);$('received').textContent=time(snapshot.received_at);
  if(cloud)$('received').textContent=time(snapshot.scanned_at);
  $('day-label').textContent=(cloud?'云端今日 · ':'采集当日 · ')+snapshot.today;
  const range=days=>snapshot.daily.filter(r=>r.day>=prior(snapshot.today,days-1)&&r.day<=snapshot.today);
  for(const [id,total] of [['today-total',sum(range(1))],['seven-total',sum(range(7))],['month-total',sum(range(30))],['all-total',sum(snapshot.daily)]]){$(id).textContent=compact(total);$(id).title=exact(total)+' Token';}
  const previous=new Map([...$('clients').querySelectorAll('.client')].map(card=>[card.dataset.app,{open:card.open,days:card.querySelector('select')?.value||'30'}]));
  $('clients').replaceChildren();
  for(const app of snapshot.apps.filter(a=>names[a.id])){
    const card=label('details','', 'client'),summary=label('summary',''),head=label('div','', 'client-head'),rows=range(30).filter(r=>r.app===app.id);
    card.dataset.app=app.id;card.open=previous.get(app.id)?.open||false;
    head.append(label('span',names[app.id],'client-name'),label('strong',app.status==='connected'?compact(sum(rows)):'未接入','client-total'));summary.append(head);
    const models=new Map();snapshot.models.filter(r=>r.app===app.id&&r.day>=prior(snapshot.today,29)&&r.day<=snapshot.today).forEach(r=>models.set(r.model,(models.get(r.model)||0)+number(r.total)));
    for(const [model,total] of [...models].filter(([,n])=>n>0).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,2)){
      const line=label('div','', 'client-model');line.append(label('span',model),label('span',compact(total)+' Token'));line.title=exact(total)+' Token';summary.append(line);
    }
    if(app.failed||app.warnings)summary.append(label('div','部分记录读取失败或已跳过，显示可用数据。','client-note'));
    if(app.status!=='connected')summary.append(label('div','采集时没有可用记录，不按零用量推断。','client-note'));
    summary.append(label('span','展开用量详情','detail-hint'));card.append(summary);
    const panel=label('div','', 'client-detail'),control=label('label','', 'period-label'),select=document.createElement('select'),body=label('div','');
    select.setAttribute('aria-label',names[app.id]+' 详情统计期间');
    for(const [value,title] of [['1','采集当日'],['7','近 7 天'],['30','近 30 天'],['all','全部记录']]){const option=label('option',title);option.value=value;select.append(option);}
    select.value=previous.get(app.id)?.days||'30';control.append(label('span','统计期间'),select);panel.append(control,body);card.append(panel);
    const show=()=>clientDetail(view,app,select.value,body);select.addEventListener('change',show);
    card.addEventListener('toggle',()=>{if(card.open&&!body.childNodes.length)show();});if(card.open)show();
    $('clients').append(card);
  }
  $('coverage').textContent=snapshot.coverage?'可读记录：'+snapshot.coverage.from+' 至 '+snapshot.coverage.to:'暂无可读记录';
  $('sources').replaceChildren();
  for(const ch of snapshot.channels||[]){const state=ch.status==='stale'?'当时连接失败，电脑使用了旧缓存':ch.status==='unavailable'?'当时未获取到数据':ch.status==='partial'?'部分记录读取失败':'采集时可用';$('sources').append(label('p',ch.name+'：'+state+(ch.updated?'；来源更新时间 '+time(ch.updated):'')));}
  if(cloud){
    const days=snapshot.daily.map(r=>r.day).sort();$('coverage').textContent=days.length?'可读记录：'+days[0]+' 至 '+days.at(-1):'尚无已报告的用量记录';
    $('sources').append(label('p',snapshot.status==='loading'?'正在逐个核对历史；期间显示已读取的记录。':snapshot.status==='partial'?'历史读取不完整，显示已确认记录。':'云端原生事件独立记录；历史核对完成。'));
    $('sources').append(label('p','读取 '+exact(snapshot.files)+' 个会话文件；失败 '+exact(snapshot.failures)+' 个；无效或超限记录 '+exact(snapshot.invalid)+' 条。'));
    $('sources').append(label('p','辅助调用事件 '+exact(snapshot.auxiliary)+' 条；未提供 Token 字段的标题／搜索等调用无法纳入用量。'));
    $('sources').append(label('p','流式和最终消息对同一次尝试仅计一次；已报告的重试分别计入，子会话不重复计算继承历史。'));
  }
}
for(const id of ['computer','cloud'])$('tab-'+id).addEventListener('click',()=>{scope=id;render(current,true);});
document.querySelector('.scope-tabs').addEventListener('keydown',event=>{
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
  event.preventDefault();scope=event.key==='Home'?'computer':event.key==='End'?'cloud':scope==='computer'?'cloud':'computer';
  render(current,true);$('tab-'+scope).focus();
});
try{render(JSON.parse($('snapshot').textContent));}catch{$('empty').textContent='快照暂时不可读，保留云端记录等待恢复。';}
function connect(){
  if(stream)return;
  stream=new EventSource('/usage/events?last='+encodeURIComponent(current?.snapshot_id||''));
  stream.onopen=()=>{$('connection').textContent='已连接 · 用量自动推送';};
  stream.addEventListener('snapshot',event=>{try{render(JSON.parse(event.data));}catch{}});
  stream.onerror=()=>{$('connection').textContent='连接暂不可用 · 保留当前快照';};
}
function close(){stream?.close();stream=null;}
document.addEventListener('visibilitychange',()=>{if(document.hidden)close();else connect();});
window.addEventListener('pagehide',close);window.addEventListener('pageshow',()=>{if(!document.hidden)connect();});
if(!document.hidden)connect();
