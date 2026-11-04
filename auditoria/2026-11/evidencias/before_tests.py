import sys,json,time
sys.argv=[sys.argv[0],'http://127.0.0.1:8801','/dev/null']
exec(open(__file__.replace('before_tests','func_tests')).read().split("with sync_playwright() as pw:")[0])
with sync_playwright() as pw:
    b=pw.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    def fill(p):
        p.fill('#f-nombre',FAKE['name']); p.fill('#f-correo',FAKE['email']); p.fill('#f-msg',FAKE['msg']); p.select_option('#f-div','industrial')
    c,st=ctx(b); p=c.new_page(); p.goto(BASE+'/'); p.wait_for_timeout(800)
    rec('B-GA','ANTES: GA se carga sin consentimiento',st['gtm']==1,f"gtag.js={st['gtm']} cookies={p.evaluate('document.cookie')}"); c.close()
    c,st=ctx(b); p=c.new_page(); p.goto(BASE+'/#contacto'); fill(p)
    with c.expect_page() as pi: p.click('button[data-via=wa]')
    p.wait_for_timeout(800); rec('B-WA','ANTES: la pestaña del sitio también navega a WhatsApp',not p.url.startswith(BASE),p.url[:60]); c.close()
    c,st=ctx(b); p=c.new_page(); p.goto(BASE+'/#contacto'); fill(p); p.fill('#f-correo','a@b.co<img/src=x/onerror=window.__x=1>'); p.click('#send-web'); p.wait_for_timeout(1200)
    rec('B-XSS','ANTES: HTML del correo se inyecta en el mensaje de éxito (auto-XSS)',p.locator('.form-ok img').count()>0,f"img={p.locator('.form-ok img').count()} __x={p.evaluate('window.__x')}"); c.close()
    c,st=ctx(b); p=c.new_page(); p.goto(BASE+'/#contacto'); p.click('#send-web'); p.wait_for_timeout(200)
    rec('B-VAL','ANTES: error sin role=alert ni aria-invalid; foco no se mueve',p.get_attribute('#f-err','role') is None and p.evaluate("document.querySelectorAll('[aria-invalid]').length")==0,f"role={p.get_attribute('#f-err','role')}"); 
    rec('B-H1','ANTES: número de H1 en inicio',True,p.evaluate("document.querySelectorAll('h1').length")); c.close()
    c,st=ctx(b,device='iPhone 13',pw=pw); p=c.new_page(); p.goto(BASE+'/'); p.wait_for_timeout(300)
    vsrc=p.evaluate("[...document.querySelectorAll('video.auto-vid')].map(v=>{v.load();return v.currentSrc.split('/').pop()})")
    rec('B-VID','ANTES: videos en iPhone 13 (emulado)',True,vsrc); c.close()
    b.close()
json.dump(R,open(sys.argv[0].replace('tools/before_tests.py','func-before.json'),'w'),indent=1,ensure_ascii=False)
