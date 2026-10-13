from pathlib import Path

import sys,json,imaplib,email,email.policy,email.header,email.utils,re,time,hashlib,base64,os

import mail_config as send_mail



def decoded(value):

 try:return ''.join(v.decode(c or 'utf-8',errors='replace') if isinstance(v,bytes) else v for v,c in email.header.decode_header(str(value)))

 except:return str(value)

def utf7(s):

 def repl(m):

  if not m[1]:return '&'

  try:return base64.b64decode(m[1].replace(',','/')+'='*((-len(m[1]))%4)).decode('utf-16-be')

  except:return m[0]

 return re.sub(r'&([^-]*)-',repl,s)

def parse(raw):

 # Minimal IMAP S-expression parser for BODYSTRUCTURE, never eval.

 i=0

 def item():

  nonlocal i

  while i<len(raw) and raw[i:i+1] in [b' ',b'\r',b'\n']:i+=1

  if raw[i:i+1]==b'(':

   i+=1;result=[]

   while True:

    while raw[i:i+1] in [b' ',b'\r',b'\n']:i+=1

    if raw[i:i+1]==b')':i+=1;return result

    if i>=len(raw):raise ValueError('unterminated list')

    result.append(item())

  if raw[i:i+1]==b'"':

   i+=1;out=bytearray()

   while i<len(raw):

    b=raw[i];i+=1

    if b==34:return out.decode('utf-8',errors='replace')

    if b==92 and i<len(raw):b=raw[i];i+=1

    out.append(b)

   raise ValueError('unterminated string')

  if raw[i:i+1]==b'{':

   m=re.match(rb'\{(\d+)\}\r\n',raw[i:])

   if not m:raise ValueError('invalid literal')

   i+=len(m[0]);size=int(m[1]);value=raw[i:i+size];i+=size;return value.decode('utf-8',errors='replace')

  m=re.match(rb'[^ ()\r\n]+',raw[i:])

  if not m:raise ValueError('invalid atom')

  i+=len(m[0]);v=m[0].decode('ascii',errors='replace');return None if v.upper()=='NIL' else int(v) if v.isdigit() else v

 return item()

def params(v):return {str(v[i]).upper():v[i+1] for i in range(0,len(v)-1,2)} if isinstance(v,list) else {}

def attachments(tree,prefix=''):

 if not isinstance(tree,list) or not tree:return []

 if isinstance(tree[0],list):

  rows=[]

  for i,node in enumerate(tree):

   if not isinstance(node,list):break

   rows+=attachments(node,str(i+1) if not prefix else prefix+'.'+str(i+1))

  return rows

 mime=str(tree[0]).lower()+'/'+str(tree[1]).lower();pr=params(tree[2] if len(tree)>2 else None);disp=next((v for v in tree[7:] if isinstance(v,list) and len(v)>1 and str(v[0]).upper() in ['ATTACHMENT','INLINE']),None);dp=params(disp[1] if disp else None);name=dp.get('FILENAME') or pr.get('NAME')

 for source,key in [(dp,'FILENAME*'),(pr,'NAME*')]:

  if not name and source.get(key):

   from urllib.parse import unquote

   name=unquote(str(source[key]).split("'",2)[-1])

 if not name:return []

 return [{'filename':decoded(name),'part':prefix or '1','mime':mime,'encoding':str(tree[5]).upper(),'encodedBytes':tree[6] if isinstance(tree[6],int) else 0}]

def recover(box,token,uid):

 assert box.select(token,readonly=True)[0]=='OK';valid=box.response('UIDVALIDITY')[1][0].decode();typ,items=box.uid('FETCH',uid,'(UID BODYSTRUCTURE)');assert typ=='OK';raw=b''

 for item in items:raw+=item[0]+b'\r\n'+item[1] if isinstance(item,tuple) else item if isinstance(item,bytes) else b''

 at=re.search(rb'BODYSTRUCTURE ',raw);parts=attachments(parse(raw[at.end():]));typ,headers=box.uid('FETCH',uid,'(BODY.PEEK[HEADER.FIELDS (SUBJECT DATE MESSAGE-ID)])');assert typ=='OK';msg=email.message_from_bytes(next(v[1] for v in headers if isinstance(v,tuple)),policy=email.policy.default)

 try:when=int(email.utils.parsedate_to_datetime(str(msg.get('Date',''))).timestamp()*1000)

 except:when=0

 return valid,parts,msg,when

def connect():

 cfg=send_mail.load_config();assert cfg['SMTP_USER'].endswith('@163.com'),'Configured account is not 163';assert cfg['SMTP_USER']==cfg.get('MAIL_TO'),'Configured sender differs from requested personal mailbox'

 box=imaplib.IMAP4_SSL('imap.163.com',993,timeout=30);box.login(cfg['SMTP_USER'],cfg['SMTP_PASS']);imaplib.Commands.setdefault('ID',('AUTH',));box._simple_command('ID','("name" "DSH Project Workspace" "version" "1.0" "vendor" "DSH Mobile Workbench")');return box

if __name__=='__main__':

 box=connect();records=[];folders=[];errors=[];scanned=0;limit=20000;tokens={}

 try:

  typ,data=box.list();assert typ=='OK'

  for entry in data:

   if not entry:continue

   m=re.match(rb'\((.*?)\)\s+(?:"(?:[^"\\]|\\.)*"|NIL)\s+(.+)$',entry)

   if not m or b'\\Noselect' in m[1]:continue

   token=m[2].decode('ascii',errors='replace');display='收件箱' if token.strip('"').upper()=='INBOX' else utf7(token.strip('"'));tokens[display]=token;typ,_=box.select(token,readonly=True)

   if typ!='OK':errors.append({'folder':display,'error':'无法只读打开'});continue

   validity=box.response('UIDVALIDITY')[1];validity=validity[0].decode() if validity and validity[0] else ''

   typ,values=box.uid('SEARCH',None,'ALL');uids=values[0].split() if typ=='OK' and values and values[0] else [];count=len(uids);chosen=uids[-max(0,limit-scanned):] if limit>scanned else [];folders.append({'name':display,'messages':count,'scanned':len(chosen)});print(json.dumps({'folder':display,'messages':count}),file=sys.stderr,flush=True)

   for offset in range(0,len(chosen),50):

    typ,items=box.uid('FETCH',b','.join(chosen[offset:offset+50]),'(UID BODYSTRUCTURE BODY.PEEK[HEADER.FIELDS (SUBJECT DATE MESSAGE-ID)])');scanned+=len(chosen[offset:offset+50])

    if typ!='OK':errors.append({'folder':display,'error':'部分邮件元信息读取失败'});continue

    for item in items:

     if not isinstance(item,tuple):continue

     head,headers=item;uid=re.search(rb'UID (\d+)',head);body=re.search(rb'BODYSTRUCTURE ',head)

     if not uid or not body:continue

     try:parts=attachments(parse(head[body.end():]))

     except:errors.append({'folder':display,'uid':uid[1].decode(),'error':'附件结构未能识别'});continue

     msg=email.message_from_bytes(headers,policy=email.policy.default);subject=str(msg.get('Subject','无标题邮件'));messageid=str(msg.get('Message-ID',''))

     try:when=int(email.utils.parsedate_to_datetime(str(msg.get('Date',''))).timestamp()*1000)

     except:when=0

     for part in parts:

      if len(records)>=5000:continue

      key='|'.join([token,validity,uid[1].decode(),part['part']]);records.append({'id':hashlib.sha256(key.encode()).hexdigest()[:32],'folder':display,'folderToken':token,'uid':uid[1].decode(),'uidValidity':validity,'subject':subject,'messageId':messageid,'date':when,**part})

  remaining=[]

  for error in errors:

   if not error.get('uid'):remaining.append(error);continue

   try:

    token=tokens[error['folder']];valid,parts,msg,when=recover(box,token,error['uid'])

    for part in parts:

     if len(records)>=5000:continue

     key='|'.join([token,valid,error['uid'],part['part']]);records.append({'id':hashlib.sha256(key.encode()).hexdigest()[:32],'folder':error['folder'],'folderToken':token,'uid':error['uid'],'uidValidity':valid,'subject':str(msg.get('Subject','无标题邮件')),'messageId':str(msg.get('Message-ID','')),'date':when,**part})

   except:remaining.append(error)

  errors=remaining

 finally:box.logout()

 result={'schema':1,'indexedAt':int(time.time()*1000),'mailbox':'163 个人邮箱','folders':folders,'messagesScanned':scanned,'files':records,'errors':errors,'complete':not errors and len(records)<5000 and scanned==sum(f['messages'] for f in folders)}

 destination=Path(sys.argv[1]) if len(sys.argv)>1 else Path('/tmp/dsh-mail-index.json');temporary=destination.with_suffix('.new');temporary.write_text(json.dumps(result,ensure_ascii=False));os.chmod(temporary,0o600);os.replace(temporary,destination);print(json.dumps({'messagesScanned':scanned,'attachments':len(records),'folders':folders,'errors':len(errors),'complete':result['complete']}))

