/* JF Solutions — hCaptcha del plan gratuito de Web3Forms para el formulario de contacto.
   Web3Forms verifica el campo 'h-captcha-response' en su servidor siempre que hCaptcha esté
   ACTIVADO en el panel de Web3Forms (app.web3forms.com → formulario → Settings → Block Spam: hCaptcha).
   Sin esa activación el widget se muestra pero Web3Forms no lo exige.
   Clave de sitio: la gratuita publicada por Web3Forms para su plan Free.
   Expone window.JFCAP = { token(), reset(), failed() }. */
(function(){
  var SITE_KEY='50b2fe65-b00b-4b9e-ad62-3ba471098be2';
  var tok='', wid=null, failed=false;
  function lang(){var r=document.documentElement;return (r.getAttribute('data-lang')||r.getAttribute('lang'))==='en'?'en':'es';}
  window.jfCapReady=function(){
    var box=document.getElementById('cap-box'); if(!box||!window.hcaptcha) return;
    wid=window.hcaptcha.render(box,{
      sitekey:SITE_KEY, hl:lang(), theme:'light',
      callback:function(t){tok=t;},
      'expired-callback':function(){tok='';},
      'error-callback':function(){tok='';}
    });
  };
  window.JFCAP={
    token:function(){return tok;},
    failed:function(){return failed;},
    reset:function(){tok='';if(window.hcaptcha&&wid!==null){try{window.hcaptcha.reset(wid);}catch(e){}}}
  };
  var s=document.createElement('script');
  s.src='https://js.hcaptcha.com/1/api.js?render=explicit&onload=jfCapReady&recaptchacompat=off';
  s.async=true; s.defer=true;
  s.onerror=function(){failed=true;};
  document.head.appendChild(s);
})();
