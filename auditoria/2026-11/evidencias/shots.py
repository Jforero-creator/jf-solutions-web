import sys,json
sys.argv=[sys.argv[0],'http://127.0.0.1:8802','/dev/null']
exec(open(__file__.replace('shots','func_tests')).read().split("with sync_playwright() as pw:")[0])
OUT='/tmp/claude-0/-home-claude/5ac958b4-0acb-503e-a749-91c40e38773d/scratchpad/shots/'
with sync_playwright() as pw:
    b=pw.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
    for dev,tag in [('iPhone 13','iphone13'),('Pixel 7','pixel7')]:
        c,st=ctx(b,device=dev,pw=pw); p=c.new_page(); p.goto(BASE+'/',wait_until='load'); p.wait_for_timeout(900)
        p.screenshot(path=OUT+f'{tag}-1-aviso-cookies.png')
        p.click('.consent button[data-v=denied]')
        p.goto(BASE+'/#contacto'); p.wait_for_timeout(600)
        p.click('#send-web'); p.wait_for_timeout(400)
        p.locator('#f-nombre').scroll_into_view_if_needed(); p.wait_for_timeout(200); p.screenshot(path=OUT+f'{tag}-2-validacion.png')
        fill(p) if 'fill' in dir() else None
        p.fill('#f-nombre',FAKE['name']); p.fill('#f-correo',FAKE['email']); p.fill('#f-msg',FAKE['msg']); p.select_option('#f-div','industrial')
        p.locator('#ts-box').scroll_into_view_if_needed(); p.wait_for_timeout(200); p.screenshot(path=OUT+f'{tag}-3-turnstile.png')
        p.click('#send-web'); p.wait_for_selector('.form-ok'); p.wait_for_timeout(700); p.screenshot(path=OUT+f'{tag}-4-envio-ok.png')
        p.fill('#f-nombre',FAKE['name']); p.fill('#f-correo',FAKE['email']); p.fill('#f-msg',FAKE['msg']); p.select_option('#f-div','industrial')
        with c.expect_page() as pi: p.click('button[data-via=wa]')
        wa=pi.value.url; p.wait_for_timeout(600); p.screenshot(path=OUT+f'{tag}-5-whatsapp.png')
        p.goto(BASE+'/#industrial'); p.wait_for_timeout(300)
        v=p.locator('video.auto-vid').first; v.scroll_into_view_if_needed(); p.wait_for_timeout(2500)
        info=p.evaluate("(()=>{const v=document.querySelector('video.auto-vid');return {src:v.currentSrc.split('/').pop(),t:v.currentTime,paused:v.paused,w:v.videoWidth,h:v.videoHeight}})()")
        p.screenshot(path=OUT+f'{tag}-6-video.png')
        print(json.dumps({'device':dev,'whatsapp_url':wa[:70],'site_tab':p.url,'video':info}))
        c.close()
    b.close()
