/* JF Solutions — Cloudflare Turnstile para el formulario de contacto.
   Expone window.JFTS = { token(), reset(), ready() }. La verificación real ocurre en /api/contact/.
   Clave del sitio:
   - www.jfsolutionsq.com / jfsolutionsq.com -> SITE_KEY_PROD (la entrega el propietario desde su cuenta gratuita de Cloudflare)
   - cualquier otro dominio (vistas previas, local) -> clave de PRUEBA oficial de Cloudflare (siempre pasa) */
(function(){
  var SITE_KEY_PROD='REEMPLAZAR_CON_SITE_KEY_DE_CLOUDFLARE';
  var SITE_KEY_TEST='1x00000000000000000000AA';
  var prod=/(^|\.)jfsolutionsq\.com$/.test(location.hostname);
  var key=prod?SITE_KEY_PROD:SITE_KEY_TEST;
  var tok='', wid=null, failed=false, box=null;

  function lang(){var r=document.documentElement;return (r.getAttribute('data-lang')||r.getAttribute('lang'))==='en'?'en':'es';}
  function render(){
    box=document.getElementById('ts-box'); if(!box||!window.turnstile) return;
    wid=window.turnstile.render(box,{
      sitekey:key, language:lang(), size:'flexible', theme:'light', action:'contact',
      callback:function(t){tok=t;box.removeAttribute('data-error');},
      'expired-callback':function(){tok='';},
      'error-callback':function(){tok='';box.setAttribute('data-error','1');return true;}
    });
  }
  window.jfTsReady=render;
  window.JFTS={
    token:function(){return tok;},
    failed:function(){return failed;},
    reset:function(){tok='';if(window.turnstile&&wid!==null){try{window.turnstile.reset(wid);}catch(e){}}}
  };
  var s=document.createElement('script');
  s.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=jfTsReady';
  s.async=true; s.defer=true;
  s.onerror=function(){failed=true;};
  document.head.appendChild(s);
})();
