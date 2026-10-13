/** Reject excessive declared ZIP expansion before entering document libraries. */
export function assertZipBudget(bytes) {
  let end=-1
  for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--){
    if(bytes.readUInt32LE(i)===0x06054b50 && i+22+bytes.readUInt16LE(i+20)===bytes.length){end=i;break}
  }
  if(end<0)throw new Error('Invalid document ZIP')
  const entries=bytes.readUInt16LE(end+10),length=bytes.readUInt32LE(end+12),offset=bytes.readUInt32LE(end+16)
  if(entries>1024||offset+length>end||entries===0xffff)throw new Error('Document ZIP exceeds budget')
  let cursor=offset,total=0
  for(let i=0;i<entries;i++){
    if(cursor+46>offset+length||bytes.readUInt32LE(cursor)!==0x02014b50)throw new Error('Invalid ZIP directory')
    const flags=bytes.readUInt16LE(cursor+8),expanded=bytes.readUInt32LE(cursor+24)
    if(flags&1||expanded===0xffffffff)throw new Error('Encrypted or ZIP64 document is unsupported')
    total+=expanded;if(total>32*1024*1024)throw new Error('Document expands beyond 32 MiB')
    cursor+=46+bytes.readUInt16LE(cursor+28)+bytes.readUInt16LE(cursor+30)+bytes.readUInt16LE(cursor+32)
  }
  if(cursor!==offset+length)throw new Error('Invalid ZIP directory length')
}
