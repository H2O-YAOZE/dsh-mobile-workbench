const metrics=['input','output','cache_read','cache_write','reasoning','total','requests','split_missing'];
export function computerView(snapshot){
  // Legacy snapshots without source attribution cannot safely be called computer-only.
  const rows=(snapshot.source_daily||[]).filter(r=>r.source!=='deepseek_cloud');
  const daily=new Map();
  for(const row of rows){
    const key=JSON.stringify([row.app,row.day]);
    if(!daily.has(key))daily.set(key,{app:row.app,day:row.day,...Object.fromEntries(metrics.map(k=>[k,0]))});
    for(const k of metrics)daily.get(key)[k]+=Number(row[k]||0);
  }
  return {...snapshot,daily:[...daily.values()],models:(snapshot.models||[]).filter(r=>r.source&&r.source!=='deepseek_cloud'),
    source_daily:rows,channels:(snapshot.channels||[]).filter(r=>r.id!=='deepseek_cloud')};
}
