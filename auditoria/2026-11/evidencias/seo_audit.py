import re,glob,sys,os,html
from html.parser import HTMLParser
root=sys.argv[1]
class P(HTMLParser):
    def __init__(s):
        super().__init__(); s.title='';s.inT=False;s.meta={};s.links=[];s.h=[];s.cur=None;s.imgs=[];s.a=[];s.ids=[];s.hl=None;s.htxt=''
    def handle_starttag(s,t,a):
        a=dict(a)
        if 'id' in a: s.ids.append(a['id'])
        if t=='title': s.inT=True
        if t=='meta': 
            k=a.get('name') or a.get('property')
            if k: s.meta.setdefault(k,[]).append(a.get('content'))
        if t=='link': s.links.append(a)
        if re.fullmatch(r'h[1-6]',t): s.hl=(t,a.get('lang'));s.htxt=''
        if t=='img': s.imgs.append(a)
        if t=='a' and 'href' in a: s.a.append(a['href'])
    def handle_endtag(s,t):
        if t=='title': s.inT=False
        if s.hl and t==s.hl[0]: s.h.append((s.hl[0],s.hl[1],s.htxt.strip()[:60]));s.hl=None
    def handle_data(s,d):
        if s.inT: s.title+=d
        if s.hl: s.htxt+=d
files=sorted(glob.glob(root+'/**/*.html',recursive=True))
for f in files:
    if '/.git/' in f: continue
    p=P(); p.feed(open(f,encoding='utf-8').read())
    rel=os.path.relpath(f,root)
    canon=[l.get('href') for l in p.links if l.get('rel')=='canonical']
    hre=[(l.get('hreflang'),l.get('href')) for l in p.links if l.get('rel')=='alternate']
    h1=[x for x in p.h if x[0]=='h1']
    print('==',rel)
    print('  title:',p.title.strip())
    print('  desc:',(p.meta.get('description') or ['--'])[0][:90] if p.meta.get('description') else 'MISSING')
    print('  canonical:',canon,' hreflang:',hre)
    print('  og:',{k:v[0][:40] for k,v in p.meta.items() if k.startswith('og:')}.keys())
    print('  twitter:',[k for k in p.meta if k.startswith('twitter')])
    print('  H1:',h1)
    print('  heading seq:',''.join(x[0][1] for x in p.h))
    noalt=[i.get('src','')[:40] for i in p.imgs if i.get('alt') is None]
    print('  imgs:',len(p.imgs),' sin alt:',noalt)
    dup=set(x for x in p.ids if p.ids.count(x)>1)
    if dup: print('  IDS DUPLICADOS:',dup)
