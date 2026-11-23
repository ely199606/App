/* Exámenes libres: orientación breve para las familias. Fuentes Mineduc revisadas 23-11-2026. */
(() => {
  'use strict';
  const links = Object.freeze({
    mineduc: 'https://www.mineduc.cl/',
    ayuda: 'https://www.ayudamineduc.cl/',
    menores: 'https://www.ayudamineduc.cl/ficha/examenes-libres-menores-de-18-anos-11',
    inscripcion: 'https://inscripcionexameneslibres.mineduc.cl/inscripcion-examenes-libres/examenesLibres',
    oficinas: 'https://www.ayudamineduc.cl/oficina-regional',
    proceso: 'https://epja.mineduc.cl/validacion-de-estudios/examenes-libres-menores-de-18-anos/como-me-inscribo/'
  });
  const icon = key => {
    const paths = {
      sitio: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c5 5 5 13 0 18M12 3c-5 5-5 13 0 18"/>',
      informacion: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="m8 8 1 1 2-2m2 1h3M8 13h8M8 17h6"/>',
      inscripcion: '<path d="M4 20h16M5 15h5v-5h5V5h5M4 5h5m-2-2 2 2-2 2"/>',
      contacto: '<path d="M7 3H4a1 1 0 0 0-1 1c0 9 8 17 17 17a1 1 0 0 0 1-1v-3l-5-2-2 2a13 13 0 0 1-7-7l2-2-2-5Z"/>'
    };
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[key]}</svg>`;
  };
  const external = (href, text, extra = '') => `<a class="family16-exam-link ${extra}" href="${href}" target="_blank" rel="noopener noreferrer">${text}<span aria-hidden="true">↗</span></a>`;
  function helper(profile) {
    const pose = typeof profile?.manzaninPose === 'string' ? profile.manzaninPose : 'saludo';
    const mascot = window.AppSchoolingManzanin?.render(pose, 82, true, 'saludo') || '';
    return `<button type="button" class="family16-exam-helper" data-exam-help aria-label="Manzanín: ¿Te ayudo? Ver información de exámenes libres"><span class="family16-exam-help-bubble">¿Te ayudo?</span><span class="family16-exam-mascot" aria-hidden="true">${mascot}</span></button>`;
  }
  function option(id, title, body) {
    return `<details class="family16-exam-option" name="family16-examenes" data-exam-option="${id}"><summary><span class="family16-exam-symbol">${icon(id)}</span><span class="family16-exam-option-title">${title}</span><svg class="family16-exam-chevron" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true" focusable="false"><path d="m5 7 5 5 5-5" stroke-linecap="round" stroke-linejoin="round"/></svg></summary><div class="family16-exam-body">${body}</div></details>`;
  }
  function render(profile = {}) {
    return `<section class="examenes-page family16-exam-page" aria-labelledby="examenes-title">
      <div class="family16-exam-heading"><div><h1 class="page-title" id="examenes-title">Exámenes Libres</h1><p class="family16-exam-intro">Elige una opción y revisemos el proceso paso a paso.</p></div>${helper(profile)}</div>
      <div class="family16-exam-menu" aria-label="Información sobre exámenes libres">
        ${option('sitio', 'Página oficial del Mineduc', `<p>Accede a los portales oficiales para revisar requisitos, temarios y el calendario vigente.</p><div class="family16-exam-actions">${external(links.mineduc, 'Ministerio de Educación')}${external(links.ayuda, 'Ayuda Mineduc')}</div>`)}
        ${option('informacion', 'Información de exámenes libres', `<p>Permiten certificar un curso o nivel al aprobar las evaluaciones del Mineduc. Para menores de 18 años, la solicitud la realiza su madre, padre o tutor legal y es gratuita.</p><p>El curso, los requisitos y el período dependen de cada situación. Si hubo matrícula este año o existen necesidades educativas especiales, consulta el caso con Ayuda Mineduc.</p>${external(links.menores, 'Revisar requisitos y calendario')}`)}
        ${option('inscripcion', 'Pasos para la inscripción', `<ol class="family16-exam-steps"><li><strong>Revisa el período y los requisitos.</strong><span>Confirma el curso y los documentos del estudiante y del adulto responsable.</span></li><li><strong>Presenta la solicitud.</strong><span>Haz el trámite en el portal o en Ayuda Mineduc, según corresponda. Para NEE, la inscripción es presencial.</span></li><li><strong>Revisa la autorización.</strong><span>Contacta al establecimiento examinador al menos 10 días hábiles antes para coordinar la rendición.</span></li></ol><div class="family16-exam-actions">${external(links.inscripcion, 'Ir al formulario oficial')}${external(links.menores, 'Consultar el proceso vigente')}</div><p class="family16-exam-small">La apertura de inscripciones y los cupos dependen del proceso oficial.</p>`)}
        ${option('contacto', 'Canales de contacto Mineduc', `<div class="family16-exam-phones"><a href="tel:6006002626"><span>Call center</span><strong>600 600 26 26</strong><small>Tocar para llamar</small></a><a href="tel:+56223536750"><span>Celulares o desde el extranjero</span><strong>+56 2 2353 6750</strong><small>Tocar para llamar</small></a></div><p class="family16-exam-contact-hours">Lunes a viernes, de 08:00 a 18:00 horas.</p><div class="family16-exam-actions">${external(links.ayuda, 'Abrir Ayuda Mineduc')}${external(links.oficinas, 'Buscar una oficina')}</div>`)}
      </div>
    </section>`;
  }
  // The native details group provides keyboard support; this fallback also
  // makes it exclusive on Android WebViews predating the details name feature.
  document.addEventListener('toggle', event => {
    const active = event.target;
    if (!active?.matches?.('.family16-exam-option[open]')) return;
    active.closest('.family16-exam-menu')?.querySelectorAll('.family16-exam-option[open]').forEach(other => {
      if (other !== active) other.open = false;
    });
  }, true);
  document.addEventListener('click', event => {
    const button = event.target.closest?.('[data-exam-help]');
    if (!button) return;
    const option = button.closest('.family16-exam-page')?.querySelector('[data-exam-option="informacion"]');
    if (option) option.open = true;
  });
  window.AppSchoolingExamenes = Object.freeze({ render, links });
})();
