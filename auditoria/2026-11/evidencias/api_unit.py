import json,urllib.request,subprocess,time,sys
P='http://127.0.0.1:8803/api/contact/'
def call(body,origin='https://www.jfsolutionsq.com',method='POST',h=None):
    data=json.dumps(body).encode() if body is not None else None
    r=urllib.request.Request(P,data=data,method=method,headers={'Content-Type':'application/json','Origin':origin,**(h or {})})
    try:
        with urllib.request.urlopen(r) as x: return x.status,json.loads(x.read())
    except urllib.error.HTTPError as e: return e.code,json.loads(e.read())
def calls(): return json.loads(urllib.request.urlopen('http://127.0.0.1:8803/__calls').read())
ok={'name':'Prueba Auditoria','email':'prueba@example.com','message':'Mensaje de prueba','turnstile_token':'PASS-TOKEN','botcheck':False,'division':'Industrial Solutions'}
R=[]
def t(id,desc,cond,ev): R.append({'id':id,'test':desc,'result':'PASA' if cond else 'FALLA','evidence':str(ev)[:300]}); print('PASA ' if cond else 'FALLA',id,desc,'|',ev)
s=call(None,method='GET'); calls(); t('API-1','GET responde 405',s[0]==405,s)
s=call(ok,origin='https://evil.example'); c=calls(); t('API-2','Origen ajeno rechazado (403) sin llamar a Cloudflare ni Web3Forms',s[0]==403 and not c,(s,len(c)))
s=call({**ok,'turnstile_token':''}); c=calls(); t('API-3','Sin token Turnstile: 400 captcha, sin reenviar',s==(400,{'success':False,'code':'captcha'}) and not c,(s,len(c)))
s=call({**ok,'turnstile_token':'FAKE'}); c=calls(); t('API-4','Token inválido: 400 captcha; Web3Forms no recibe nada',s[0]==400 and s[1]['code']=='captcha' and all('web3forms' not in x['url'] for x in c),(s,[x['url'][:40] for x in c]))
s=call({**ok,'botcheck':True}); c=calls(); t('API-5','Honeypot marcado: responde éxito pero no envía nada',s==(200,{'success':True}) and not c,(s,len(c)))
s=call({**ok,'email':'malo'}); c=calls(); t('API-6','Correo inválido: 422 sin reenviar',s[0]==422 and not c,s)
s=call({**ok,'message':'x'*9000,'name':'A\u0007B'}); c=calls(); w=[json.loads(x['body']) for x in c if 'web3forms' in x['url']]
t('API-7','Envío válido: verifica Turnstile, reenvía a Web3Forms con clave, asunto y campos; recorta a 5000 y limpia control',s==(200,{'success':True}) and w and len(w[0]['message'])==5000 and w[0]['name']=='AB' and w[0]['access_key'].startswith('8d3fd0e5') and w[0]['subject']=='New Service Request – JF Solutions' and 'turnstile_token' not in w[0] and 'botcheck' not in w[0],(s,{k:(v if k!='message' else len(v)) for k,v in (w[0] if w else {}).items() if k!='access_key'}))
s=call(ok,h={'x-test-w3f':'err'}); calls(); t('API-8','Web3Forms responde error: 502 delivery',s==(502,{'success':False,'code':'delivery'}),s)
s=call(ok,h={'x-test-w3f':'down'}); calls(); t('API-9','Web3Forms inalcanzable: 502 delivery',s[0]==502,s)
s=call(ok,h={'x-test-env':'production'}); c=calls(); t('API-10','Production sin TURNSTILE_SECRET_KEY: 503 config (falla cerrado, no usa clave de prueba)',s==(503,{'success':False,'code':'config'}) and not c,s)
s=call(ok,origin='https://jf-solutions-git-audit-remediation-2026-11-jose-forero.vercel.app'); calls(); t('API-11','Origen de vista previa de Vercel aceptado',s[0]==200,s)
json.dump(R,open(sys.argv[1],'w'),indent=1,ensure_ascii=False); print('TOTAL',len(R),'FALLAS',sum(r['result']=='FALLA' for r in R))
