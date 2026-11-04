/* JF Solutions — consentimiento de analítica (Google Analytics 4).
   Modelo opt-in: gtag.js NO se descarga ni se ejecuta hasta que la persona acepta.
   Si rechaza, no se carga nada de Google; Vercel Web Analytics (sin cookies) sigue igual.
   La decisión se guarda en localStorage ('jf-consent' = 'granted' | 'denied') y puede cambiarse
   desde cualquier elemento con el atributo data-consent-open (enlace "Preferencias de cookies").
   Para usar en una página: <script src="/assets/consent.js" data-ga="G-XXXXXXX" defer></script> */
(function(){
  var me=document.currentScript, GA=me&&me.getAttribute('data-ga'), KEY='jf-consent', loaded=false, bar=null;
  function get(){try{return localStorage.getItem(KEY);}catch(e){return null;}}
  function set(v){try{localStorage.setItem(KEY,v);}catch(e){}}
  function en(){var r=document.documentElement;return (r.getAttribute('data-lang')||r.getAttribute('lang'))==='en';}
  function policy(){return en()?'/en/privacy/':'/privacidad/';}

  function loadGA(){
    if(loaded||!GA) return; loaded=true;
    window.dataLayer=window.dataLayer||[];
    window.gtag=function(){window.dataLayer.push(arguments);};
    window.gtag('js',new Date());
    window.gtag('config',GA);
    var s=document.createElement('script'); s.async=true;
    s.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(GA);
    document.head.appendChild(s);
  }
  function clearGA(){
    /* Al retirar el consentimiento se borran las cookies _ga* de este dominio */
    document.cookie.split(';').forEach(function(c){
      var n=c.split('=')[0].trim();
      if(/^_ga/.test(n)){
        var host=location.hostname.replace(/^www\./,'');
        ['', '; domain=.'+host, '; domain='+location.hostname].forEach(function(d){
          document.cookie=n+'=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'+d;
        });
      }
    });
  }

  function close(){if(bar){bar.remove();bar=null;}}
  function decide(v){
    var prev=get(); set(v); close();
    if(v==='granted') loadGA();
    else{ clearGA(); if(prev==='granted'&&loaded) location.reload(); }
  }
  function show(){
    if(bar) return;
    var e=en();
    bar=document.createElement('section');
    bar.className='consent'; bar.setAttribute('role','region');
    bar.setAttribute('aria-label',e?'Cookie preferences':'Preferencias de cookies');
    bar.innerHTML='<p>'+(e
      ?'We use Google Analytics to understand how this site is used. It only turns on if you accept. '
      :'Usamos Google Analytics para entender cómo se usa este sitio. Solo se activa si aceptas. ')
      +'<a href="'+policy()+'">'+(e?'Privacy policy':'Política de privacidad')+'</a></p>'
      +'<div class="consent-actions"><button type="button" data-v="denied">'+(e?'Decline':'Rechazar')+'</button>'
      +'<button type="button" data-v="granted">'+(e?'Accept':'Aceptar')+'</button></div>';
    bar.addEventListener('click',function(ev){var b=ev.target.closest('button[data-v]'); if(b) decide(b.getAttribute('data-v'));});
    document.body.appendChild(bar);
  }

  var css=document.createElement('style');
  css.textContent='.consent{position:fixed;z-index:60;left:max(12px,env(safe-area-inset-left,0px));right:max(12px,env(safe-area-inset-right,0px));'
    +'bottom:calc(12px + env(safe-area-inset-bottom,0px));max-width:640px;margin:0 auto;display:flex;flex-wrap:wrap;gap:12px 16px;align-items:center;'
    +'padding:14px 16px;border:1px solid #25407A;border-radius:12px;background:#0B1730;color:#F6F1E6;font:500 14px/1.45 Figtree,system-ui,sans-serif;'
    +'box-shadow:0 10px 30px rgba(0,0,0,.35)}'
    +'.consent p{margin:0;flex:1 1 280px}.consent a{color:#F5DFA8}'
    +'.consent-actions{display:flex;gap:8px}'
    +'.consent button{font:700 14px Figtree,system-ui,sans-serif;border-radius:999px;padding:10px 16px;min-height:44px;cursor:pointer;'
    +'border:1.5px solid #E0B45A;background:transparent;color:#F6F1E6}'
    +'.consent button[data-v="granted"]{background:#E0B45A;color:#1A1405}'
    +'.consent button:focus-visible{outline:3px solid #F5DFA8;outline-offset:2px}'
    +'@media (max-width:900px){.consent{bottom:calc(84px + env(safe-area-inset-bottom,0px))}}';
  document.head.appendChild(css);

  function init(){
    document.addEventListener('click',function(ev){
      var t=ev.target.closest('[data-consent-open]'); if(!t) return;
      ev.preventDefault(); close(); show();
      var first=bar&&bar.querySelector('button'); if(first) first.focus();
    });
    var c=get();
    if(c==='granted') loadGA();
    else if(c!=='denied' && GA) show();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
