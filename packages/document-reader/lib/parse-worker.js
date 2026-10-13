import {parseDocument,windowLines} from './doc-read.js'
const chunks=[];let count=0
for await(const chunk of process.stdin){count+=chunk.length;if(count>8*1024*1024+2048)process.exit(2);chunks.push(chunk)}
const body=Buffer.concat(chunks);const at=body.indexOf(10)
if(at<0||at>2048)process.exit(2)
try {
  const options=JSON.parse(body.subarray(0,at).toString('utf8'))
  const text=await parseDocument(body.subarray(at+1),options.format,{sheetRowLimit:options.sheetRowLimit})
  const result=windowLines(text,options.offset,options.limit)
  process.stdout.write(JSON.stringify(result))
}catch{process.exitCode=2}
