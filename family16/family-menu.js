/* APPSCHOOLING_FAMILY_V16 — navegación local del Colegio Virtual de Chile. */
(() => {
  'use strict';
  const svg = (content, cls = '', viewBox = '0 0 100 100') => `<svg xmlns="http://www.w3.org/2000/svg" class="menu15-icon ${cls}" viewBox="${viewBox}" aria-hidden="true" focusable="false">${content}</svg>`;
  const icons = {
    examenes: svg('<rect x="17" y="9" width="63" height="78" rx="12" fill="none" stroke="currentColor" stroke-width="5.5"/><path d="m29 30 4 4 8-9m-12 24 4 4 8-9m-12 24 4 4 8-9M51 30h17M51 49h17M51 68h9" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="78" cy="78" r="21" fill="#0879d8" stroke="#e4f2ff" stroke-width="5"/><path d="m69 78 6 6 12-14" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>'),
    avisos: svg('<path d="m33 35 36-26 18 61-45-8Z" fill="#f8fcff" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/><path d="m32 36-14 5a15 15 0 0 0 9 29l14-7Z" fill="currentColor"/><path d="m25 68 10 20c3 6 12 2 9-4L36 65" fill="currentColor"/><path d="m86 20 6-8m0 24 10-4m-7 19 10 3" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>', '', '0 0 110 100'),
    familia: svg('<circle cx="50" cy="23" r="14" fill="#008fe5"/><circle cx="18" cy="32" r="10" fill="#00a5ed"/><circle cx="82" cy="32" r="10" fill="#00a5ed"/><path d="M1 70V60c0-10 7-18 17-18 7 0 12 3 15 7-7 7-10 15-10 26H7a6 6 0 0 1-6-5Zm98 0V60c0-10-7-18-17-18-7 0-12 3-15 7 7 7 10 15 10 26h16a6 6 0 0 0 6-5Z" fill="#00a5ed"/><path d="M25 84V65a25 25 0 0 1 50 0v19c-12 10-38 10-50 0Z" fill="#0077d5"/><path d="M50 78 39 67c-10-10 3-21 11-12 8-9 21 2 11 12Z" fill="#fff"/>'),
    recursos: svg('<path d="M14 33 58 9 92 17 49 43Z" fill="#00adf4" stroke="#0089df" stroke-width="3" stroke-linejoin="round"/><path d="M14 33c-13 5-13 21 0 26l34 9 44-25V18L49 43Z" fill="#fff" stroke="#0082dc" stroke-width="4" stroke-linejoin="round"/><path d="m14 59 34 9 44-25v15L49 83 14 74c-13-5-13-20 0-25" fill="#fff" stroke="#0082dc" stroke-width="4" stroke-linejoin="round"/><path d="m14 75 35 9 43-25v11L49 95 14 87c-8-3-11-8-11-13" fill="#fff" stroke="#0082dc" stroke-width="4" stroke-linejoin="round"/><path d="m63 69 10-6 2 27-8-4-5 10Z" fill="#00a5ef"/><path d="m49 44 43-25" stroke="#0077d5" stroke-width="4" stroke-linecap="round"/>'),
    inicio: svg('<path d="m14 46 36-33 36 33a4 4 0 0 1-3 7h-6v31H59V63H41v21H23V53h-6a4 4 0 0 1-3-7Z" fill="currentColor" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>'),
    planner: svg('<rect x="19" y="24" width="62" height="61" rx="8" fill="none" stroke="currentColor" stroke-width="6"/><path d="M20 41h60M34 14v20m32-20v20" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>'),
    habitos: svg('<path d="M50 87V51M50 62C27 65 13 45 12 20c22-2 42 11 38 42Zm0 0c-4-31 14-44 38-42-1 25-15 45-38 42Z" fill="none" stroke="currentColor" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>'),
    ajustes: svg('<circle cx="50" cy="28" r="14" fill="none" stroke="currentColor" stroke-width="6"/><path d="M22 84v-7a28 28 0 0 1 56 0v7Z" fill="none" stroke="currentColor" stroke-width="6" stroke-linejoin="round"/>'),
    avatar: svg('<path d="M50 30C29 13 9 30 13 53c4 26 21 38 37 30 16 8 33-4 37-30 4-23-16-40-37-23Z" fill="none" stroke="currentColor" stroke-width="5"/><path d="M50 30c0-10 6-20 15-22M53 20c12 3 22-2 24-12-12-3-21 1-24 12Z" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><circle cx="35" cy="51" r="3" fill="currentColor"/><circle cx="65" cy="51" r="3" fill="currentColor"/><path d="M37 67q13 13 26 0" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>'),
    estrategias: svg('<path d="M50 28C35 16 20 21 10 22v56c17-4 29 0 40 8 11-8 23-12 40-8V22c-10-1-25-6-40 6Z" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/><path d="M50 28v58M23 39h14M23 51h14m26-12h14M63 51h14" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>')
  };
  const bell = svg('<path d="M50 82c7 0 10-3 11-7H39c1 4 4 7 11 7Zm-27-15h54L69 55V37c0-12-7-20-19-20s-19 8-19 20v18Z" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="M46 17v-4a4 4 0 0 1 8 0v4" fill="none" stroke="currentColor" stroke-width="4"/>', 'menu15-bell-icon');
  function header(badgeHTML = '', page = 'inicio') {
    return `<header class="menu15-header family16-header ${page==='inicio'?'':'family16-header-small'}">${page==='inicio'?'':`<button type="button" class="family16-back" data-action="appBack" aria-label="Volver"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m14 5-7 7 7 7"/></svg></button>`}<button type="button" class="menu15-bell" data-action="go" data-page="avisos" aria-label="Abrir información y avisos" title="Información y avisos">${bell}${badgeHTML}</button><img class="family16-school-logo" src="icons/colegio-original.png" width="1600" height="989" alt="Colegio Virtual de Chile"></header>`;
  }
  function home() {
    return `<section class="menu15-grid" aria-label="Menú principal de AppSchooling">${[
      ['examenes', 'Exámenes<br>Libres', 'Exámenes Libres'],
      ['avisos', 'Información<br>y avisos', 'Información y avisos'],
      ['calma', 'Bienestar<br>familiar', 'Bienestar familiar'],
      ['recursos', 'Recursos<br>de apoyo', 'Recursos de apoyo']
    ].map(([page, label, accessible]) => `<button type="button" class="menu15-tile" data-action="go" data-page="${page}" aria-label="${accessible}">${icons[page === 'calma' ? 'familia' : page]}<span class="menu15-tile-label">${label}</span></button>`).join('')}</section>`;
  }
  function bottomNav(page, routineTab) {
    const active = ['estrategias','familia'].includes(page)?'recursos':['examenes','avisos','calma'].includes(page)?'inicio':page;
    return `<nav class="mobile-nav menu15-nav" aria-label="Navegación principal">${[
      ['inicio', 'Inicio'], ['planner', 'Planner familiar'], ['recursos', 'Recursos de apoyo'], ['ajustes', 'Mi familia y configuración']
    ].map(([key, label]) => `<button type="button" class="menu15-nav-button${active === key ? ' is-active' : ''}" data-action="go" data-page="${key}" aria-label="${label}" title="${label}"${active === key ? ' aria-current="page"' : ''}>${icons[key]}<span class="menu15-sr-only">${label}</span></button>`).join('')}</nav>`;
  }
  function resources() { return window.AppSchoolingFamily.resources(); }
  window.AppSchoolingMenu = Object.freeze({ header, home, bottomNav, resources });
})();
