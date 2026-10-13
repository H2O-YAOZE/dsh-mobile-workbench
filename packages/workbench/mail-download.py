from pathlib import Path
import sys,json,base64,quopri,re
sys.path.insert(0,str(Path(__file__).resolve().parent));from importlib.util import spec_from_file_location,module_from_spec
spec=spec_from_file_location('mail_index',Path(__file__).with_name('mail-index.py'));module=module_from_spec(spec);spec.loader.exec_module(module)
try:
 assert re.fullmatch(r'[a-f0-9]{32}',sys.argv[2]);catalog=json.loads(Path(sys.argv[1]).read_text());record=next(v for v in catalog['files'] if v['id']==sys.argv[2]);assert record['encodedBytes']<=35*1024*1024;assert re.fullmatch(r'\d+(?:\.\d+)*',record['part']);assert record['uid'].isdigit()
 box=module.connect()
 try:
  typ,_=box.select(record['folderToken'],readonly=True);assert typ=='OK';validity=box.response('UIDVALIDITY')[1];validity=validity[0].decode() if validity and validity[0] else '';assert validity==record['uidValidity']
  typ,items=box.uid('FETCH',record['uid'],'(BODY.PEEK['+record['part']+'])');assert typ=='OK';body=next(v[1] for v in items if isinstance(v,tuple));assert len(body)<=35*1024*1024
  content=base64.b64decode(body) if record['encoding']=='BASE64' else quopri.decodestring(body) if record['encoding']=='QUOTED-PRINTABLE' else body;assert len(content)<=25*1024*1024
 finally:box.logout()
 sys.stdout.buffer.write(content)
except Exception:
 print('邮箱附件暂不可用，请刷新目录或稍后重试',file=sys.stderr);sys.exit(1)
