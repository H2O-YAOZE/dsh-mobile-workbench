from pathlib import Path
import sys,json,subprocess,zipfile,io,re,xml.etree.ElementTree as ET,shutil,tempfile,os
if sys.platform=='linux':
 import resource
 resource.setrlimit(resource.RLIMIT_AS,(192*1024*1024,192*1024*1024))
 resource.setrlimit(resource.RLIMIT_CPU,(12,12))
sys.stdout.reconfigure(encoding='utf-8')
index=Path(sys.argv[1]);entry=next(v for v in json.loads(index.read_text(encoding='utf-8'))['files'] if v['id']==sys.argv[2]);ext=Path(entry['filename']).suffix.lower()
if entry.get('encodedBytes',0)>3*1024*1024:raise ValueError('附件超过内容摘录上限，请下载查看')
if ext not in ['.md','.txt','.csv','.html','.htm','.docx','.pptx','.pdf']:raise ValueError('这个格式请下载后查看内容')
data=subprocess.check_output([sys.executable,str(Path(__file__).with_name('mail-download.py')),str(index),entry['id']],timeout=70)
if len(data)>2*1024*1024:raise ValueError('附件超过2 MB摘录上限')
if ext in ['.docx','.pptx']:
 text=[]
 with zipfile.ZipFile(io.BytesIO(data)) as z:
  if len(z.infolist())>5000:raise ValueError('文档结构过大，请下载查看')
  parsed=0;total=0
  for info in z.infolist():
   if (info.filename=='word/document.xml' or re.fullmatch(r'ppt/slides/slide\d+\.xml',info.filename)):
    if info.file_size>2*1024*1024:continue
    parsed+=1;total+=info.file_size
    if parsed>40 or total>4*1024*1024:break
    text.append(' '.join(e.text or '' for e in ET.fromstring(z.read(info)).iter() if e.tag.endswith('}t')))
    if sum(map(len,text))>8000:break
 text='\n'.join(text)
elif ext=='.pdf':
 if not shutil.which('pdftotext'):raise ValueError('PDF 内容请下载查看')
 with tempfile.TemporaryDirectory(prefix='dsh-mail-') as d:
  os.chmod(d,0o700);f=Path(d)/'file.pdf';f.write_bytes(data);os.chmod(f,0o600)
  text=subprocess.check_output(['pdftotext','-f','1','-l','2',str(f),'-'],timeout=10).decode('utf-8','replace')
else:
 try:text=data.decode('utf-8-sig')
 except UnicodeDecodeError:text=data.decode('gb18030','replace')
 if ext in ['.html','.htm']:text=re.sub(r'<[^>]+>',' ',re.sub(r'<(script|style)[^>]*>.*?</\1>','',text,flags=re.S|re.I))
text=re.sub(r'-----BEGIN [^-]*PRIVATE KEY-----.*?-----END [^-]*PRIVATE KEY-----','[私钥隐藏]',text,flags=re.S)
text=re.sub(r'(?:sk-|Bearer\s+)[A-Za-z0-9_.-]{16,}','[凭据隐藏]',text)
text=re.sub(r'(?im)^.*(?:password|api[_-]?key|secret|access[_-]?token)\s*[:=].*$','[凭据隐藏]',text)
lines=[re.sub(r'\s+',' ',s).strip() for s in text.splitlines() if s.strip()]
print(json.dumps({'excerpt':'\n'.join(lines)[:2000],'basis':'从附件正文提取的前部内容，非全文总结','truncated':len('\n'.join(lines))>2000},ensure_ascii=False))
