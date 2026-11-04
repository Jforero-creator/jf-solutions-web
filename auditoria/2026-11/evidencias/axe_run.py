import sys,json
from playwright.sync_api import sync_playwright
base=sys.argv[1]; out=sys.argv[2]
pages=['/','/servicios/','/en/services/','/servicios/consultoria-calidad-inocuidad-alimentaria-new-jersey/','/en/services/gmp-haccp-procedures-corrective-actions/','/manos.html']+sys.argv[3:]
axe=open('/tmp/claude-0/-home-claude/5ac958b4-0acb-503e-a749-91c40e38773d/scratchpad/tools/node_modules/axe-core/axe.min.js').read()
res={}
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    for vp in [('mobile',{'width':390,'height':844}),('desktop',{'width':1366,'height':900})]:
        for lang in ['es','en']:
          for pg in pages:
            c=b.new_context(viewport=vp[1]); page=c.new_page()
            page.route('**/*',lambda r: r.abort() if not r.request.url.startswith(base) else r.continue_())
            page.goto(base+pg,wait_until='load'); page.wait_for_timeout(800)
            if lang=='en':
                page.evaluate("""()=>{var b=document.querySelector('.lang button[data-set=en]'); if(b) b.click(); var m=document.querySelector('[data-lang=en]'); if(m&&m.tagName==='BUTTON') m.click();}""")
            page.add_script_tag(content=axe)
            r=page.evaluate("async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice']}});return r.violations.map(v=>({id:v.id,impact:v.impact,n:v.nodes.length,help:v.help,t:v.nodes.slice(0,3).map(x=>x.target.join(' ')+' :: '+(x.failureSummary||'').slice(0,160))}))}")
            res[f'{vp[0]}|{lang}|{pg}']=r; c.close()
    b.close()
json.dump(res,open(out,'w'),indent=1,ensure_ascii=False)
agg={}
for k,v in res.items():
    for x in v: agg.setdefault((x['id'],x['impact'],x['help']),set()).add(k.split('|')[2])
for k,v in sorted(agg.items()): print(k,sorted(v))
