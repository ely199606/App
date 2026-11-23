/* Canales oficiales del colegio, desde la burbuja de Manzanín. */
(() => {
 'use strict';
 let overlay=null,origin=null;
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function button(profile={},size=76){
  const character=window.AppSchoolingManzanin.render(profile.manzaninPose||'saludo',size,true,'saludo');
  return `<button type="button" class="family17-school-help" data-school-help aria-label="Manzanín: ¿Te ayudo? Contactar al colegio" aria-haspopup="dialog"><span class="family17-speech">¿Te ayudo?</span><span class="family17-help-mascot" aria-hidden="true">${character}</span></button>`;
 }
 function close(restoreFocus=true){if(!overlay)return false;overlay.remove();overlay=null;if(restoreFocus&&origin?.isConnected)origin.focus();origin=null;return true;}
 function open(trigger){
  if(overlay)return;origin=trigger||document.activeElement;
  overlay=document.createElement('div');overlay.className='family17-contact-overlay';
  overlay.innerHTML=`<section class="family17-contact-dialog" role="dialog" aria-modal="true" aria-labelledby="school-contact-title" tabindex="-1"><button type="button" class="family17-contact-close" data-school-close aria-label="Cerrar ayuda">×</button><h2 id="school-contact-title">¿En qué te ayudamos?</h2><p>Estos son los canales oficiales del colegio.</p><a class="family17-contact-link" href="https://colegiovirtualdechile.cl/" target="_blank" rel="noopener noreferrer"><strong>Ir a la web del colegio</strong><span>colegiovirtualdechile.cl</span></a><a class="family17-contact-link" href="tel:6006560060"><strong>Llamar al colegio</strong><span>600 656 0060</span></a></section>`;
  document.body.append(overlay);overlay.querySelector('[role="dialog"]').focus();
 }
 document.addEventListener('click',ev=>{const trigger=ev.target.closest?.('[data-school-help]');if(trigger){open(trigger);return;}if(overlay&&(ev.target===overlay||ev.target.closest?.('[data-school-close]')))close();});
 document.addEventListener('keydown',ev=>{
  if(!overlay)return;
  if(ev.key==='Escape'){ev.preventDefault();close();return;}
  if(ev.key==='Tab'){const nodes=[...overlay.querySelectorAll('button,a[href]')],first=nodes[0],last=nodes.at(-1);if(ev.shiftKey&&(document.activeElement===first||document.activeElement===overlay.querySelector('[role="dialog"]'))){ev.preventDefault();last.focus();}else if(!ev.shiftKey&&document.activeElement===last){ev.preventDefault();first.focus();}}
 });
 window.AppSchoolingSchoolHelp=Object.freeze({button,open,close,isOpen:()=>!!overlay});
})();
