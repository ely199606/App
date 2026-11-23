/* Recursos para familias: contenido agrupado a partir de las estrategias ya incluidas. */
(() => {
  'use strict';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon = (name, cls='') => `<svg class="family16-icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${({book:'<path d="M12 5C8 3 5 3 2 4v15c4-1 7-.5 10 2 3-2.5 6-3 10-2V4c-3-1-6-1-10 1Z"/><path d="M12 5v16M5 8h4m6 0h4M5 12h4m6 0h4"/>',map:'<rect x="8" y="2" width="8" height="5" rx="1"/><rect x="2" y="17" width="7" height="5" rx="1"/><rect x="15" y="17" width="7" height="5" rx="1"/><path d="M12 7v5M5.5 17v-5h13v5"/>',question:'<path d="M3 4h18v13H8l-5 4V4Z"/><path d="M10 8a2 2 0 1 1 3 2c-1 .6-1 1-1 2M12 14h.01"/>',start:'<path d="M5 20V4l15 8-15 8Z"/>',planner:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 2v6m10-6v6M3 10h18M7 14h3m4 0h3M7 18h3"/>',family:'<circle cx="12" cy="6" r="3"/><circle cx="4" cy="8" r="2"/><circle cx="20" cy="8" r="2"/><path d="M6 22v-5a6 6 0 0 1 12 0v5M1 19v-5a3 3 0 0 1 4-3m18 8v-5a3 3 0 0 0-4-3"/>',heart:'<path d="M12 21C6 17 2 13 2 8a5 5 0 0 1 10-1 5 5 0 0 1 10 1c0 5-4 9-10 13Z"/>',music:'<path d="M9 18V5l11-3v13M9 8l11-3"/><ellipse cx="6" cy="18" rx="3" ry="3"/><ellipse cx="17" cy="15" rx="3" ry="3"/>',message:'<path d="M3 3h18v14H8l-5 4V3Z"/><path d="M7 7h10M7 11h7"/>',chevron:'<path d="m8 5 7 7-7 7"/>'})[name]||'<path d="m8 5 7 7-7 7"/>'}</svg>`;
  const strategyGroups = [
    {id:'comprender',title:'Comprender un texto',icon:'book',summary:'Leer, subrayar y aclarar palabras.',items:[
      {id:'subrayado',title:'Subrayar lo importante',steps:['Lean un párrafo completo antes de marcar. Pregunta: «¿De qué trata?».','Pídele que marque solo las palabras o frases principales.','Invítale a explicar lo subrayado con sus palabras y a ajustar las marcas.'],example:'Si casi todo quedó marcado, busquen juntos qué idea no puede faltar.'},
      {id:'diccionario',title:'Buscar palabras en el diccionario',steps:['Pídele que señale una palabra que no entiende y lea la oración completa.','Busquen sus significados y elijan el que encaje en esa oración.','Vuelvan a leer el texto y creen una oración propia con la palabra.'],example:'«Banco» puede ser un asiento o una institución: el contexto ayuda a elegir.'},
      {id:'formatos',title:'Probar otra forma de explicar',steps:['Pregunta qué sabe del tema y revisen una imagen relacionada.','Ofrece una explicación breve con un dibujo, un objeto o un ejemplo.','Pídele que muestre la idea de otra manera y cuente qué le ayudó.']}
    ]},
    {id:'conectar',title:'Conectar y recordar ideas',icon:'map',summary:'Mapas, pistas y formas de representar.',items:[
      {id:'organizador',title:'Hacer un mapa de ideas',steps:['Escriban el tema en el centro de una hoja.','Pídele que añada ideas importantes y agrupe sus detalles alrededor.','Invítale a explicar por qué puso juntas esas ideas.']},
      {id:'mapa-conceptual',title:'Crear un mapa conceptual',steps:['Elijan entre tres y cinco conceptos; coloquen el más general arriba.','Unan los conceptos con flechas y palabras como «necesita» o «es parte de».','Lean cada unión como una oración y comprueben que tenga sentido.'],example:'«Las plantas → necesitan → agua». La palabra de enlace explica la relación.'},
      {id:'mnemotecnia',title:'Inventar una pista para recordar',steps:['Elijan una lista corta y comprueben que entiende cada elemento.','Usen letras, sílabas, una frase o una imagen para crear una pista.','Pídele que recuerde la lista sin mirarla; después comparen y corrijan.'],example:'«So-Li-Ga» puede ayudar a recordar sólido, líquido y gas, junto con un ejemplo de cada uno.'},
      {id:'representar',title:'Representar lo aprendido',steps:['Pídele que elija una idea y la explique con sus palabras.','Ofrece opciones: dibujo con explicación, resumen breve, cómic, maqueta o afiche.','Revisen juntos si su creación incluye lo importante y es correcta.']}
    ]},
    {id:'revisar',title:'Revisar cómo está aprendiendo',icon:'question',summary:'Preguntas y ajustes durante la tarea.',items:[
      {id:'preguntas',title:'Hacer preguntas antes y después',steps:['Antes: «¿Qué sabes de este tema? ¿Qué quieres aprender?».','Durante: «¿Estás entendiendo? ¿Qué podrías probar o preguntar?».','Después: «¿Qué aprendiste? ¿Cómo lo aprendiste? ¿Por qué es importante?».','Para revisar la dificultad: «¿Qué fue lo más difícil? ¿Cómo lo superaste o qué ayuda necesitas?».']},
      {id:'plan-monitoreo',title:'Preparar, revisar y ajustar el plan',steps:['Acuerden qué hará, qué necesita y cuál será el primer paso.','Durante la tarea, pregúntale si el plan le está sirviendo.','Al terminar, conversen sobre qué repetiría y qué cambiaría.']},
      {id:'voz-alta',title:'Mostrar cómo piensas al resolver',steps:['Elige un ejemplo corto, parecido a su tarea.','Explica en voz alta por dónde empiezas, qué dudas tienes y cómo corriges.','Invítale a intentar otro ejemplo contando sus decisiones.']}
    ]},
    {id:'comenzar',title:'Comenzar con confianza',icon:'start',summary:'Metas pequeñas y ayuda que se retira.',items:[
      {id:'andamiaje',title:'Primero juntos, después con más autonomía',steps:['Muestra un ejemplo breve y hagan otro en conjunto.','Pídele que intente uno similar; ofrece una pista si la necesita.','Retira la ayuda poco a poco y pregunta cómo lo resolvió.']},
      {id:'meta-hoy',title:'Elegir una meta pequeña',steps:['Pregúntale qué quiere aprender o mejorar hoy.','Ayúdale a escribir una acción concreta y posible.','Al cerrar, revisen el avance y elijan un siguiente paso.']},
      {id:'retos-progresivos',title:'Dividir una tarea difícil',steps:['Identifiquen qué parte le cuesta y comiencen con un paso alcanzable.','Propón un ejemplo un poco más complejo cuando el anterior resulte claro.','Reconoce la estrategia o el esfuerzo concreto que le permitió avanzar.']},
      {id:'elegir-expresion',title:'Ofrecer una elección para mostrar lo que sabe',steps:['Aclaren qué aprendizaje necesita demostrar.','Ofrece dos formas posibles: explicarlo, escribirlo, dibujarlo o construirlo.','Pídele que explique su trabajo y revise si respondió a la consigna.']}
    ]},
    {id:'organizar',title:'Organizarse para aprender',icon:'planner',summary:'Materiales, pasos y revisión del día.',items:[
      {id:'plan-tiempo-recursos',title:'Preparar materiales y tiempo',steps:['Revisen qué actividad hará y qué materiales necesita.','Elijan un lugar de estudio y anoten un orden breve en el planner.','Dejen espacio para ajustar el plan según cómo vaya el día.']},
      {id:'preguntas-estudio',title:'Revisar qué le ayuda a estudiar',steps:['Pregunta cuándo y dónde le resulta más fácil comenzar.','Elijan un cambio pequeño: materiales a mano, menos distracciones o una consigna por vez.','Después comparen si ese cambio ayudó y decidan si mantenerlo.']},
      {id:'sesion-bloques',title:'Separar una actividad en partes',steps:['Dividan la tarea en dos o tres pasos visibles.','Acuerden qué hará primero y cuándo revisarán cómo va.','Entre partes, comprueben si necesita continuar, cambiar de actividad o descansar.']}
    ]}
  ];
  const orientationGroups = [
    {id:'preparar-clase',title:'Preparar la clase en casa',icon:'planner',summary:'Espacio, materiales y conexión.',steps:['Busquen un lugar iluminado y ventilado. Revisen e impriman la guía si la clase la requiere.','Comprueben carga del dispositivo, internet, cámara y audio; dejen cuaderno y lápiz a mano.','Entren al curso con anticipación suficiente para resolver algún problema de conexión.']},
    {id:'acompanar',title:'Acompañar sin hacer la tarea',icon:'family',summary:'Escuchar, dar una pista y dejar intentar.',steps:['Pregunta: «¿Qué parte entiendes y dónde necesitas ayuda?». Escucha su explicación.','Ofrece una pista o muestra un ejemplo diferente, dejando que resuelva su actividad.','Reconoce lo que hizo por sí mismo/a y revisen juntos si necesita otra explicación.']},
    {id:'pausas-emociones',title:'Acompañar emociones y pausas',icon:'heart',summary:'Bajar el ritmo y acordar cómo seguir.',steps:['Nombra lo que observas sin etiquetar: «Veo que esto está costando». Pregunta cómo se siente.','Acorden una pausa si la necesita y una actividad sencilla para descansar.','Cuando estén disponibles, elijan un paso pequeño para retomar o ajusten el plan del día.']},
    {id:'profesora',title:'Conversar con la profesora o profesor',icon:'message',summary:'Preparar una consulta clara.',steps:['Anoten qué actividad generó la duda y qué parte necesita aclaración.','Describan qué intentó su hijo/a y qué ocurrió, incluyendo un ejemplo si es útil.','Usen el canal acordado con el colegio y registren el siguiente paso en el planner.']}
  ];
  function helper(profile={},title='',helpText='Elige una opción. La información se abrirá solo cuando la necesites.') {
    const pose=typeof profile.manzaninPose==='string'?profile.manzaninPose:'saludo';
    const character=window.AppSchoolingManzanin?.render(pose,76,true,'saludo')||'';
    return `<div class="family16-heading"><h1 class="page-title">${escape(title)}</h1><aside class="family16-helper" aria-label="Ayuda de Manzanín"><span class="family16-helper-character" aria-hidden="true">${character}</span><details class="family16-help"><summary>¿Te ayudo?</summary><p>${escape(helpText)}</p></details></aside></div>`;
  }
  function strategy(item) {
    return `<details class="family16-strategy" name="family16-strategies-in-group" data-family-strategy="${item.id}"><summary><span>${escape(item.title)}</span><span class="family16-chevron" aria-hidden="true">${icon('chevron')}</span></summary><div class="family16-details-body"><ol>${item.steps.map(step=>`<li>${escape(step)}</li>`).join('')}</ol>${item.example?`<p class="family16-example"><b>Por ejemplo:</b> ${escape(item.example)}</p>`:''}</div></details>`;
  }
  function group(item,scope,body) {
    return `<details class="family16-group" name="family16-${scope}" data-family-group="${item.id}"><summary><span class="family16-group-icon">${icon(item.icon)}</span><span class="family16-summary-copy"><strong>${escape(item.title)}</strong><small>${escape(item.summary)}</small></span><span class="family16-chevron" aria-hidden="true">${icon('chevron')}</span></summary><div class="family16-group-body">${body}</div></details>`;
  }
  function strategies(profile={}) {
    return `<section class="family16-page family16-strategies">${helper(profile,'Estrategias para acompañar a mi hijo/a','Abre un grupo y luego elige una estrategia. Prueben una sola idea a la vez.')}<p class="page-sub family16-intro">Elige lo que necesita hoy y abre una propuesta.</p><div class="family16-accordion" data-family-accordion>${strategyGroups.map(item=>group(item,'study-groups',item.items.map(strategy).join(''))).join('')}</div></section>`;
  }
  function orientation(profile={}) {
    return `<section class="family16-page family16-orientation">${helper(profile,'Orientaciones para la familia','Abre el tema que necesitas. Cada propuesta tiene tres pasos breves.')}<p class="page-sub family16-intro">Ideas para acompañar el aprendizaje en casa.</p><div class="family16-accordion" data-family-accordion>${orientationGroups.map(item=>group(item,'orientation',`<ol class="family16-tip-steps">${item.steps.map(step=>`<li>${escape(step)}</li>`).join('')}</ol>`)).join('')}</div></section>`;
  }
  function wellbeing(profile={}) {
    const music=window.AppSchoolingCalmMusic?.render(profile)||'<p>Elige un momento tranquilo para descansar en familia.</p>';
    return `<section class="family16-page family16-wellbeing">${helper(profile,'Bienestar familiar','Pueden elegir una pausa, conversar o escuchar una melodía. Sin necesidad de registrar nada.')}<p class="page-sub family16-intro">Un momento para escucharse y descansar.</p><div class="family16-accordion" data-family-accordion>${group({id:'pausa',title:'Hacer una pausa juntos',icon:'heart',summary:'Descansar antes de continuar.'},'wellbeing','<ol class="family16-tip-steps"><li>Pregunten cómo se sienten y qué necesitan en este momento.</li><li>Elijan una pausa cómoda: mirar afuera, estirarse suavemente o descansar en silencio.</li><li>Después, acuerden si quieren retomar, cambiar la actividad o ajustar el plan.</li></ol>')}${group({id:'escuchar',title:'Conversar sobre lo que pasó',icon:'message',summary:'Dar espacio para contar y escuchar.'},'wellbeing','<ol class="family16-tip-steps"><li>Busca un momento tranquilo y pregunta: «¿Qué fue agradable o difícil hoy?».</li><li>Escucha sin apresurar una solución. Pueden hablar, escribir o dibujar.</li><li>Pregunta qué ayuda le gustaría recibir y acuerden una acción posible.</li></ol>')}${group({id:'musica',title:'Melodías tranquilas',icon:'music',summary:'Escuchar y detener cuando quieran.'},'wellbeing',`<div class="family16-music">${music}</div>`)}</div></section>`;
  }
  function resources(profile={}) {
    return `<section class="family16-page family16-resources">${helper(profile,'Recursos de apoyo','Elige estrategias de estudio u orientaciones para acompañar a tu hijo/a.')}<p class="page-sub family16-intro">Propuestas para acompañar a tu hijo/a en casa.</p><div class="family16-resource-links">${[['estrategias','book','Estrategias de estudio','Pasos breves, agrupados según lo que necesita.'],['familia','family','Orientaciones para la familia','Preparar las clases, acompañar y comunicarse.']].map(([route,art,title,description])=>`<button class="family16-resource-link" type="button" data-action="go" data-page="${route}"><span class="family16-group-icon">${icon(art)}</span><span class="family16-summary-copy"><strong>${title}</strong><small>${description}</small></span><span class="family16-chevron" aria-hidden="true">${icon('chevron')}</span></button>`).join('')}</div></section>`;
  }
  // Native grouping works on current WebViews. This capture listener also keeps
  // older Android WebViews compact without adding listeners on every render.
  document.addEventListener('toggle',event=>{
    const item=event.target;
    if(!(item instanceof HTMLElement)||item.tagName!=='DETAILS'||!item.open)return;
    const groupName=item.getAttribute('name');
    if(!groupName||!groupName.startsWith('family16-'))return;
    const parent=item.parentElement;
    if(!parent)return;
    for(const sibling of parent.children)if(sibling!==item&&sibling.tagName==='DETAILS'&&sibling.getAttribute('name')===groupName)sibling.open=false;
  },true);
  window.AppSchoolingFamily=Object.freeze({strategies,orientation,wellbeing,resources,helper});
})();
