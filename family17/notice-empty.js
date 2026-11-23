/* Estado vacío real: no crea mensajes ni cambia su lectura. */
(() => {
 'use strict';
 window.AppSchoolingNoticeEmpty=Object.freeze({render:()=>`<div class="card notice-empty family17-empty"><div class="family17-empty-speech">Todavía no tienen avisos</div><div class="family17-empty-mascot" aria-hidden="true">${window.AppSchoolingManzanin.render('saludo',130,true,'saludo')}</div><p>Los mensajes que reciban aparecerán aquí para que puedan consultarlos.</p></div>`});
})();
