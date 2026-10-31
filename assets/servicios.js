/* Páginas de servicio de JF Solutions: idioma recordado y formulario de contacto.
   El formulario usa el mismo canal que la página de inicio (Web3Forms -> correo de JF Solutions),
   con WhatsApp y correo como alternativas. */
(function(){
  var lang=document.documentElement.getAttribute('lang')==='en'?'en':'es';
  try{localStorage.setItem('jf-lang',lang);}catch(e){}
  document.querySelectorAll('.lang a[hreflang]').forEach(function(a){
    a.addEventListener('click',function(){try{localStorage.setItem('jf-lang',a.getAttribute('hreflang'));}catch(e){}});
  });
  var y=document.getElementById('year'); if(y) y.textContent=new Date().getFullYear();

  var form=document.getElementById('req-form'); if(!form) return;
  var en=lang==='en';
  var WA='12012506729', MAIL='jforero@jfsolutions80.com', W3F_KEY='8d3fd0e5-b687-434f-816b-74fb0331bb81';
  var service=form.getAttribute('data-service'), page=location.origin+location.pathname;
  var via='web';
  form.querySelectorAll('[data-via]').forEach(function(b){b.addEventListener('click',function(){via=b.getAttribute('data-via');});});
  function v(id){return document.getElementById(id).value.trim();}
  function esc(s){return s.replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}

  form.addEventListener('submit',function(e){
    e.preventDefault();
    var miss=[];
    if(!v('f-nombre')) miss.push(en?'name':'nombre');
    if(!/^\S+@\S+\.\S+$/.test(v('f-correo'))) miss.push(en?'a valid email':'un correo válido');
    if(!v('f-msg')) miss.push(en?'your case':'tu caso');
    var err=document.getElementById('f-err');
    if(miss.length){err.hidden=false;err.textContent=(en?'Please complete: ':'Falta completar: ')+miss.join(', ')+'.';return;}
    err.hidden=true;
    var idioma=form.querySelector('input[name="f-idioma"]:checked').value;
    var lines=[(en?'Name: ':'Nombre: ')+v('f-nombre'),
      (en?'Email: ':'Correo: ')+v('f-correo'),
      v('f-tel')?(en?'Phone: ':'Teléfono: ')+v('f-tel'):null,
      v('f-empresa')?(en?'Company: ':'Empresa: ')+v('f-empresa'):null,
      (en?'Division: ':'División: ')+'Industrial Solutions',
      (en?'Service: ':'Servicio: ')+service,
      (en?'Reply language: ':'Idioma de respuesta: ')+idioma,
      (en?'Page: ':'Página: ')+page,
      '',v('f-msg')].filter(function(x){return x!==null;});
    var box=document.createElement('div');box.className='form-ok';box.setAttribute('role','status');
    function show(){
      var old=document.querySelector('#form-box .form-ok'); if(old) old.remove();
      document.getElementById('form-box').appendChild(box);
      box.scrollIntoView({behavior:'smooth',block:'center'});
    }
    if(via==='web'){
      var btn=document.getElementById('send-web'), label=btn.textContent;
      btn.disabled=true; btn.textContent=en?'Sending…':'Enviando…';
      var payload={access_key:W3F_KEY,subject:'New Service Request – JF Solutions',from_name:'JF Solutions – Sitio web',
        botcheck:document.getElementById('f-bot').checked,
        name:v('f-nombre'),email:v('f-correo'),phone:v('f-tel'),company:v('f-empresa'),
        division:'Industrial Solutions',service:service,reply_language:idioma,page:page,message:v('f-msg')};
      fetch('https://api.web3forms.com/submit',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(payload)})
        .then(function(r){return r.json().catch(function(){return {success:false};});})
        .then(function(res){
          if(!(res&&res.success)) throw new Error('fail');
          box.innerHTML='<b>'+(en?'Request sent':'Solicitud enviada')+'</b><p>'
            +(en?'Thank you. I received your request and will reply within one to two business days at ':'Gracias. Recibí tu solicitud y te responderé en uno a dos días hábiles a ')+esc(payload.email)+'.</p>';
          form.reset();
        })
        .catch(function(){
          box.style.borderColor='var(--hold)';
          box.innerHTML='<b style="color:var(--hold)">'+(en?'Could not send':'No se pudo enviar')+'</b><p>'
            +(en?'Check your connection and try again, or use the WhatsApp or email buttons.':'Revisa tu conexión e inténtalo de nuevo, o usa los botones de WhatsApp o correo.')+'</p>';
        })
        .then(function(){btn.disabled=false;btn.textContent=label;show();});
      return;
    }
    var txt=(en?'Proposal request – JF Solutions':'Solicitud de propuesta – JF Solutions')+'\n'+lines.join('\n');
    if(via==='wa'){
      var wurl='https://wa.me/'+WA+'?text='+encodeURIComponent(txt);
      var w=window.open(wurl,'_blank','noopener'); if(!w) location.href=wurl;
      box.innerHTML='<b>'+(en?'Your message is ready':'Tu mensaje está listo')+'</b><p>'
        +(en?'WhatsApp opened with your request. Tap send so it reaches me.':'Se abrió WhatsApp con tu solicitud. Toca enviar para que me llegue.')+'</p>';
    }else{
      var mailto='mailto:'+MAIL+'?subject='+encodeURIComponent('New Service Request – JF Solutions')+'&body='+encodeURIComponent(lines.join('\r\n'));
      var a=document.createElement('a');a.href=mailto;a.style.display='none';document.body.appendChild(a);a.click();a.remove();
      box.innerHTML='<b>'+(en?'Your email is ready':'Tu correo está listo')+'</b><p>'
        +(en?'If your email app did not open, write to ':'Si tu aplicación de correo no se abrió, escribe a ')
        +'<a href="'+mailto+'">'+MAIL+'</a>.</p>';
    }
    show();
  });
})();
