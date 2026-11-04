# Pruebas funcionales del sitio JF Solutions (rama audit-remediation-2026-11). Datos de prueba ficticios.
import sys,json,base64,time
from playwright.sync_api import sync_playwright
BASE=sys.argv[1]; OUT=sys.argv[2]
PNG=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=')
FAKE={'name':'Prueba Auditoria','email':'prueba@example.com','msg':'Mensaje de prueba automatizada. No responder.'}
TS_STUB="""window.turnstile={render:function(el,o){var f=document.createElement('iframe');f.src='https://challenges.cloudflare.com/cdn-cgi/challenge-platform/fake';f.title='Cloudflare';f.style.cssText='width:300px;height:65px;border:0';el.appendChild(f);if(!window.__tsNoToken)setTimeout(function(){o.callback('PASS-TOKEN')},50);return 'w1';},reset:function(){window.__tsResets=(window.__tsResets||0)+1;}};setTimeout(function(){window.jfTsReady&&window.jfTsReady()},0);"""
R=[]
def rec(id,desc,ok,ev=''):
    _rec(id,desc,ok,ev)
def _rec(id,desc,ok,ev=''):
    R.append({'id':id,'test':desc,'result':'PASA' if ok else 'FALLA','evidence':str(ev)[:400]}); print(('PASA ' if ok else 'FALLA'),id,desc,'|',str(ev)[:200])

def ctx(b,w3f='ok',device=None,pw=None):
    c=b.new_context(**(pw.devices[device] if device else {'viewport':{'width':1366,'height':900}}))
    st={'gtm':0,'collect':0,'w3f':[],'csp':[],'popups':[]}
    def route(r):
        u=r.request.url
        if u.startswith(BASE):
            if '/api/contact' in u:
                try: st['w3f'].append(json.loads(r.request.post_data or '{}'))
                except Exception: st['w3f'].append({})
                if w3f=='slow': time.sleep(1.5)
                if w3f=='offline': return r.abort('internetdisconnected')
                return r.continue_(headers={**r.request.headers,'x-test-w3f':('ok' if w3f=='slow' else w3f)})
            if '/_vercel/insights/' in u: return r.fulfill(status=200,content_type='application/javascript',body='')
            return r.continue_()
        if 'googletagmanager.com/gtag/js' in u:
            st['gtm']+=1; return r.fulfill(status=200,content_type='application/javascript',body='document.cookie="_ga=GA1.1.test; path=/";')
        if 'challenges.cloudflare.com/turnstile/v0/api.js' in u: return r.fulfill(status=200,content_type='application/javascript',body=TS_STUB)
        if 'challenges.cloudflare.com' in u: return r.fulfill(status=200,content_type='text/html',body='<p>ts</p>')
        if 'google-analytics.com' in u: st['collect']+=1; return r.fulfill(status=204,body='')
        if 'fonts.googleapis.com' in u: return r.fulfill(status=200,content_type='text/css',body='')
        if 'images.unsplash.com' in u: return r.fulfill(status=200,content_type='image/png',body=PNG)
        if 'api.web3forms.com' in u:
            st['w3f'].append(json.loads(r.request.post_data or '{}'))
            if w3f=='ok': return r.fulfill(status=200,content_type='application/json',body='{"success":true,"message":"Email sent"}')
            if w3f=='err': return r.fulfill(status=400,content_type='application/json',body='{"success":false,"message":"Invalid access key"}')
            if w3f=='down': return r.abort('internetdisconnected')
            if w3f=='slow': time.sleep(1.5); return r.fulfill(status=200,content_type='application/json',body='{"success":true}')
        if u.startswith('https://wa.me/'): st['popups'].append(u); return r.fulfill(status=200,content_type='text/html',body='<title>wa</title>')
        return r.abort()
    c.route('**/*',route)
    c.add_init_script("document.addEventListener('securitypolicyviolation',e=>{(window.__csp=window.__csp||[]).push(e.violatedDirective+' '+e.blockedURI)});")
    c.on('page',lambda p: st['popups'].append(p.url))
    return c,st

with sync_playwright() as pw:
    b=pw.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    # --- C-02 consentimiento
    c,st=ctx(b); p=c.new_page(); p.goto(BASE+'/',wait_until='load'); p.wait_for_timeout(800)
    bar=p.locator('.consent'); rec('C02-1','Sin decisión: GA no se descarga y aparece el aviso',st['gtm']==0 and bar.count()==1 and 'G-' not in str(p.evaluate('document.cookie')),f"gtag.js={st['gtm']} aviso={bar.count()} cookies='{p.evaluate('document.cookie')}'")
    p.click('.consent button[data-v=denied]'); p.wait_for_timeout(400); p.reload(wait_until='load'); p.wait_for_timeout(600)
    rec('C02-2','Rechazar: no hay gtag.js ni cookies _ga tras recargar; el aviso no reaparece',st['gtm']==0 and '_ga' not in p.evaluate('document.cookie') and p.locator('.consent').count()==0,f"gtag.js={st['gtm']} ls={p.evaluate('localStorage.getItem(\"jf-consent\")')}")
    p.click('footer [data-consent-open] >> visible=true'); p.wait_for_timeout(300)
    rec('C02-3','El enlace "Preferencias de cookies" reabre el aviso y enfoca un botón',p.locator('.consent').count()==1 and p.evaluate('document.activeElement.closest(".consent")!==null'),'')
    p.click('.consent button[data-v=granted]'); p.wait_for_timeout(600)
    rec('C02-4','Aceptar: gtag.js se carga una vez y se crea cookie _ga',st['gtm']==1 and '_ga' in p.evaluate('document.cookie'),f"gtag.js={st['gtm']} cookies='{p.evaluate('document.cookie')}'")
    p.reload(wait_until='load'); p.wait_for_timeout(600)
    rec('C02-5','Consentimiento persistente: GA se carga al volver sin mostrar aviso',st['gtm']==2 and p.locator('.consent').count()==0,f"gtag.js={st['gtm']}")
    p.click('footer [data-consent-open] >> visible=true'); p.click('.consent button[data-v=denied]'); p.wait_for_load_state('load'); p.wait_for_timeout(800)
    rec('C02-6','Retirar consentimiento: se borran cookies _ga y GA no vuelve a cargarse',('_ga' not in p.evaluate('document.cookie')) and st['gtm']==2,f"gtag.js={st['gtm']} cookies='{p.evaluate('document.cookie')}'")
    c.close()
    # --- C-03 CSP en todas las páginas con GA aceptado
    pages=['/','/servicios/','/en/services/','/servicios/consultoria-calidad-inocuidad-alimentaria-new-jersey/','/servicios/gmp-haccp-procedimientos-acciones-correctivas/','/servicios/mejora-procesos-trazabilidad/','/en/services/food-safety-quality-consulting-new-jersey/','/en/services/gmp-haccp-procedures-corrective-actions/','/en/services/process-improvement-traceability/','/manos.html','/privacidad/','/en/privacy/','/no-existe/']
    c,st=ctx(b); p=c.new_page(); p.goto(BASE+'/'); p.evaluate("localStorage.setItem('jf-consent','granted')")
    viol={}
    errs=[]
    p.on('pageerror',lambda e: errs.append(str(e)))
    for pg in pages:
        p.goto(BASE+pg,wait_until='load'); p.wait_for_timeout(500)
        if pg=='/manos.html':
            p.click('button[data-go=next]'); p.wait_for_timeout(200)
        v=p.evaluate('window.__csp||[]')
        if v: viol[pg]=v
    rec('C03-1','CSP aplicada sin violaciones en 13 páginas (GA aceptado, fuentes, imágenes, videos, manos.html)',not viol,viol or 'sin violaciones')
    rec('C03-2','Sin errores JavaScript en las 13 páginas',not errs,errs or 'sin errores')
    c.close()
    # --- C-01/C-04 formulario inicio
    def fill(p,div=True):
        p.fill('#f-nombre',FAKE['name']); p.fill('#f-correo',FAKE['email']); p.fill('#f-msg',FAKE['msg'])
        if div and p.locator('#f-div').count(): p.select_option('#f-div','industrial')
    for path in ['/','/servicios/mejora-procesos-trazabilidad/','/en/services/']:
        c,st=ctx(b); p=c.new_page(); p.goto(BASE+path+('#contacto' if path=='/' else ''),wait_until='load'); p.evaluate("localStorage.setItem('jf-consent','denied')")
        p.click('#send-web'); p.wait_for_timeout(300)
        err=p.locator('#f-err'); inv=p.evaluate("[...document.querySelectorAll('#req-form [aria-invalid=true]')].map(e=>e.id)")
        foc=p.evaluate('document.activeElement.id')
        rec(f'C04-val{path}','Validación: campos vacíos muestran error (role=alert), marcan aria-invalid y enfocan el primero; no se envía nada',err.is_visible() and len(inv)>=3 and foc==inv[0] and len(st['w3f'])==0 and p.get_attribute('#f-err','role')=='alert',f"msg='{err.inner_text()}' invalid={inv} foco={foc} envios={len(st['w3f'])}")
        p.fill('#f-correo','no-es-correo'); fill(p); p.fill('#f-correo','correo-malo'); p.click('#send-web'); p.wait_for_timeout(200)
        rec(f'C04-mail{path}','Correo con formato inválido se rechaza',len(st['w3f'])==0 and 'f-correo' in p.evaluate("[...document.querySelectorAll('[aria-invalid=true]')].map(e=>e.id)"),p.locator('#f-err').inner_text())
        p.fill('#f-correo',FAKE['email']); p.click('#send-web'); p.wait_for_selector('.form-ok',timeout=5000)
        okt=p.inner_text('.form-ok'); pl=st['w3f'][0] if st['w3f'] else {}
        rec(f'C04-ok{path}','Envío correcto vía /api/contact (Turnstile verificado, Web3Forms simulado): éxito, formulario reiniciado, botcheck=false, token enviado y sin clave en el navegador',len(st['w3f'])==1 and ('enviada' in okt or 'sent' in okt) and pl.get('botcheck') is False and pl.get('turnstile_token')=='PASS-TOKEN' and 'access_key' not in pl and p.input_value('#f-nombre')=='',f"okt='{okt[:60]}' botcheck={pl.get('botcheck')} token={pl.get('turnstile_token')} access_key_en_navegador={'access_key' in pl}")
        c.close()
    c,st=ctx(b); c.add_init_script('window.__tsNoToken=true'); p=c.new_page(); p.goto(BASE+'/#contacto'); p.wait_for_timeout(300); fill(p); p.click('#send-web'); p.wait_for_timeout(300)
    rec('C01-ts','Sin completar Turnstile: no se envía y se pide la verificación (ES)',len(st['w3f'])==0 and 'verificación de seguridad' in p.inner_text('#f-err'),p.inner_text('#f-err'))
    c.close()
    c,st=ctx(b); p=c.new_page(); p.goto(BASE+'/#contacto'); p.wait_for_timeout(300)
    vis=p.locator('#ts-box iframe').count(); fill(p); p.click('#send-web'); p.wait_for_selector('.form-ok'); rs=p.evaluate('window.__tsResets||0')
    rec('C01-ts2','Widget Turnstile se muestra en el formulario y se reinicia tras cada envío (token de un solo uso)',vis==1 and rs>=1,f'iframes={vis} resets={rs}')
    c.close()
    # XSS en el correo mostrado
    c,st=ctx(b); p=c.new_page(); p.goto(BASE+'/#contacto'); fill(p); p.fill('#f-correo','a@b.co<img/src=x/onerror=window.__x=1>'); p.click('#send-web'); p.wait_for_timeout(1200)
    rec('C04-xss','El correo devuelto en el mensaje de éxito se muestra como texto (sin inyección HTML)',p.evaluate('window.__x')!=1 and p.locator('.form-ok img').count()==0,f"img inyectada={p.locator('.form-ok img').count()}")
    c.close()
    for mode,word in [('err','No se pudo'),('down','No se pudo'),('offline','No se pudo')]:
        c,st=ctx(b,w3f=mode); p=c.new_page(); p.goto(BASE+'/#contacto'); fill(p); p.click('#send-web'); p.wait_for_selector('.form-ok',timeout=20000)
        t=p.inner_text('.form-ok')
        rec(f'C04-{mode}',f'Fallo de envío ({ {"err":"Web3Forms responde error","down":"Web3Forms inalcanzable desde el servidor","offline":"navegador sin conexión"}[mode] }): mensaje claro y datos conservados; botón reactivado',word in t and p.input_value('#f-nombre')==FAKE['name'] and not p.is_disabled('#send-web'),t[:110])
        c.close()
    c,st=ctx(b,w3f='slow'); p=c.new_page(); p.goto(BASE+'/#contacto'); fill(p)
    p.evaluate("()=>{const b=document.getElementById('send-web');b.click();b.click();b.click();}"); p.wait_for_selector('.form-ok',timeout=10000)
    rec('C04-dup','Prevención de envíos duplicados: 3 clics rápidos = 1 envío',len(st['w3f'])==1,f"envios={len(st['w3f'])}")
    c.close()
    # EN mensajes
    c,st=ctx(b,w3f='down'); p=c.new_page(); p.goto(BASE+'/#contacto'); p.click('.lang button[data-set=en]'); p.click('#send-web'); e1=p.inner_text('#f-err'); fill(p); p.click('#send-web'); p.wait_for_selector('.form-ok'); 
    rec('C04-en','Mensajes de error en inglés al cambiar idioma',e1.startswith('Please complete') and 'Could not send' in p.inner_text('.form-ok'),e1)
    c.close()
    # WhatsApp y correo
    c,st=ctx(b); p=c.new_page(); p.goto(BASE+'/#contacto'); fill(p)
    with c.expect_page() as pi: p.click('button[data-via=wa]')
    pi.value.wait_for_load_state(); wa=pi.value.url; p.wait_for_timeout(500)
    stay=p.url.startswith(BASE)
    rec('C04-wa','WhatsApp: abre wa.me/12012506729 con el texto de la solicitud',wa.startswith('https://wa.me/12012506729?text=') and 'Prueba%20Auditoria' in wa and stay,f'popup={wa[:90]} pestaña_sitio_conservada={stay}')
    p.click('button[data-via=mail]'); p.wait_for_timeout(300)
    links=p.evaluate("[...document.querySelectorAll('.form-ok a')].map(a=>a.href)")
    ok=any(l.startswith('mailto:jforero@jfsolutions80.com') for l in links) and any('mail.google.com' in l for l in links) and any('outlook.office.com' in l for l in links)
    rec('C04-mailto','Correo: genera enlaces mailto, Gmail y Outlook con destinatario correcto',ok,[l[:60] for l in links])
    c.close()
    # --- imágenes externalizadas y 404
    c,st=ctx(b); p=c.new_page(); p.goto(BASE+'/'); p.evaluate("localStorage.setItem('jf-consent','denied')"); p.reload()
    for sel in ['img.logo','img.avatar','img.emblem']: p.locator(sel).first.scroll_into_view_if_needed(); p.wait_for_timeout(300)
    dims=p.evaluate("['img.logo','img.avatar','img.emblem'].map(s=>{const i=document.querySelector(s);return [s,i.currentSrc.split('/').pop(),i.naturalWidth]})")
    rec('C09-img','Logo, foto y emblema (antes en Base64) cargan desde /assets',all(d[2]>0 for d in dims),dims)
    h1=p.evaluate("document.querySelectorAll('h1').length"); h1v=p.evaluate("[...document.querySelectorAll('h1')].filter(h=>h.offsetParent).length")
    rec('C06-h1','Inicio: un único H1 visible por idioma (h1 totales=2, ES y EN)',h1==2 and h1v==1,f'h1 total={h1} visibles={h1v}')
    p.goto(BASE+'/#industrial'); p.wait_for_timeout(300)
    rec('C06-layer','Subpágina de división (#industrial) sigue visible con su título',p.locator('#industrial .layer-title').is_visible(),p.locator('#industrial .layer-title').inner_text())
    r=p.goto(BASE+'/ruta-inexistente/')
    rec('C08-404','Ruta inexistente devuelve 404 con página propia y enlace al inicio',r.status==404 and p.locator('a[href="/"]').count()>0 and 'JF Solutions' in p.title(),f"status={r.status} title={p.title()}")
    p.goto(BASE+'/'); p.keyboard.press('Tab'); fe=p.evaluate("document.activeElement.className")
    rec('C10-skip','Primer Tab enfoca "Saltar al contenido"',fe=='skip',fe)
    c.close()
    # --- móviles (emulación Chromium)
    for dev in ['iPhone 13','Pixel 7']:
        c,st=ctx(b,device=dev,pw=pw); p=c.new_page(); p.goto(BASE+'/#contacto',wait_until='load'); p.wait_for_timeout(500)
        ow=p.evaluate('document.documentElement.scrollWidth>window.innerWidth')
        cons=p.locator('.consent').bounding_box(); mbar=p.locator('.mbar').bounding_box()
        overlap= cons and mbar and cons['y']+cons['height']>mbar['y']
        p.click('.consent button[data-v=denied]')
        fill(p); p.click('#send-web'); p.wait_for_selector('.form-ok',timeout=5000)
        vsrc=p.evaluate("[...document.querySelectorAll('video.auto-vid')].map(v=>{v.load();return v.currentSrc.split('/').pop()})")
        rec(f'C04-{dev}',f'{dev} (emulado): sin scroll horizontal, aviso no tapa la barra inferior, formulario envía, videos usan versión 720p',not ow and not overlap and len(st['w3f'])==1 and all('720' in x for x in vsrc),f'overflow={ow} solape={overlap} videos={vsrc}')
        c.close()
    c,st=ctx(b); p=c.new_page(); p.goto(BASE+'/'); p.wait_for_timeout(300)
    vsrc=p.evaluate("[...document.querySelectorAll('video.auto-vid')].map(v=>v.currentSrc.split('/').pop()||v.querySelector('source:last-child').src.split('/').pop())")
    rec('C09-vid-desk','Escritorio: videos siguen usando la versión 1080p original',all('720' not in x for x in vsrc),vsrc); c.close()
    b.close()
json.dump(R,open(OUT,'w'),indent=1,ensure_ascii=False)
print('TOTAL',len(R),'FALLAS',sum(r['result']=='FALLA' for r in R))
