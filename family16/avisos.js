/* Manzanín: bandeja de avisos. Los datos se guardan aparte de los perfiles. */
(() => {
  'use strict';
  const STORE = 'manzanin_avisos_v1';
  const MAX_ITEMS = 500;
  const categories = { general: 'Información general', evaluaciones: 'Evaluaciones', examenes: 'Exámenes libres' };
  const escape = value => String(value == null ? '' : value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  function iso(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d{1,9})?)?(?:Z|[+-]\d\d:\d\d)$/.test(value)) return null;
    const year = Number(value.slice(0, 4)), month = Number(value.slice(5, 7)), day = Number(value.slice(8, 10));
    if (month < 1 || month > 12 || day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate()) return null;
    return Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null;
  }
  const bridge = () => window.AppSchoolingNative;
  let items = [], filter = 'todos', category = 'todos', opened = '', onChange = null, initialized = false, storageFailed = false;
  let connection = { configured: false, permission: 'notDetermined', enabled: false, registration: 'inactive' };

  function safeUrl(value) {
    if (value == null || value === '') return null;
    if (typeof value !== 'string' || value.length > 2048) return null;
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && url.hostname && !url.username && !url.password && (!url.port || url.port === '443') ? url.href : null;
    } catch (_) { return null; }
  }

  function normalize(raw, local) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw) || raw.schemaVersion !== 1) return null;
    if (typeof raw.id !== 'string' || !/^[A-Za-z0-9._:-]{1,128}$/.test(raw.id)) return null;
    if (!Number.isInteger(raw.revision) || raw.revision < 1 || raw.revision > 2147483647) return null;
    if (!Object.prototype.hasOwnProperty.call(categories, raw.category)) return null;
    if (typeof raw.title !== 'string' || !raw.title.trim() || raw.title.length > 120) return null;
    if (typeof raw.body !== 'string' || !raw.body.trim() || raw.body.length > 5000) return null;
    const publishedAt = iso(raw.publishedAt);
    if (!publishedAt) return null;
    const eventAt = raw.eventAt == null ? null : iso(raw.eventAt), expiresAt = raw.expiresAt == null ? null : iso(raw.expiresAt);
    if ((raw.eventAt != null && !eventAt) || (raw.expiresAt != null && !expiresAt)) return null;
    if (expiresAt && Date.parse(expiresAt) <= Date.parse(publishedAt)) return null;
    const url = safeUrl(raw.url);
    if (raw.url != null && raw.url !== '' && !url) return null;
    return { schemaVersion: 1, id: raw.id.trim(), revision: raw.revision, category: raw.category, title: raw.title.trim(), body: raw.body.trim(), publishedAt, eventAt, expiresAt, url, readAt: local ? iso(raw.readAt) : null };
  }

  function sort() { items.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt) || a.id.localeCompare(b.id)); }
  function save() {
    try { localStorage.setItem(STORE, JSON.stringify({ version: 1, items })); storageFailed = false; }
    catch (_) { storageFailed = true; }
  }
  function notify() { if (typeof onChange === 'function') onChange(); }
  try {
    const saved = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (saved && saved.version === 1 && Array.isArray(saved.items)) {
      const unique = new Map();
      for (const raw of saved.items) {
        const item = normalize(raw, true);
        if (item && (!unique.has(item.id) || unique.get(item.id).revision < item.revision)) unique.set(item.id, item);
      }
      items = Array.from(unique.values()); sort(); items = items.slice(0, MAX_ITEMS);
    }
  } catch (_) { /* Una copia inválida no afecta los perfiles del estudiante. */ }

  function merge(raw, local) {
    const next = normalize(raw, local);
    if (!next) return false;
    const previous = items.find(item => item.id === next.id);
    if (previous) {
      if (previous.revision > next.revision) return false;
      if (previous.revision === next.revision) {
        if (!previous.readAt && next.readAt) { previous.readAt = next.readAt; return true; }
        return false;
      }
      // Una actualización del aviso vuelve a estar sin leer. Solo el estado
      // nativo de esa misma revisión puede indicar que ya fue consultada.
      items[items.indexOf(previous)] = next;
    } else items.push(next);
    return true;
  }

  function receive(payload, local) {
    let value = payload;
    try { if (typeof value === 'string') value = JSON.parse(value); }
    catch (_) { return false; }
    if (value && typeof value === 'object' && 'detail' in value && value.schemaVersion == null) value = value.detail;
    try { if (typeof value === 'string') value = JSON.parse(value); }
    catch (_) { return false; }
    const records = Array.isArray(value) ? value : value && Array.isArray(value.notices) ? value.notices : [value];
    let changed = false;
    for (const raw of records.slice(0, MAX_ITEMS)) changed = merge(raw, local === true) || changed;
    if (changed) { sort(); items = items.slice(0, MAX_ITEMS); save(); notify(); }
    return changed;
  }

  function refreshStatus() {
    let raw;
    try { raw = bridge() && typeof bridge().getNoticeStatus === 'function' ? bridge().getNoticeStatus() : null; if (typeof raw === 'string') raw = JSON.parse(raw); }
    catch (_) { raw = null; }
    connection = raw && typeof raw === 'object' ? {
      configured: raw.configured === true,
      permission: ['granted', 'denied', 'notDetermined'].includes(raw.permission) ? raw.permission : 'notDetermined',
      enabled: raw.enabled === true,
      registration: ['inactive', 'pending', 'ready', 'error'].includes(raw.registration) ? raw.registration : 'inactive'
    } : { configured: false, permission: 'notDetermined', enabled: false, registration: 'inactive' };
    return connection;
  }

  function syncNative() {
    const before = JSON.stringify(connection);
    refreshStatus();
    let changed = false;
    try { if (bridge() && typeof bridge().getNotices === 'function') changed = receive(bridge().getNotices(), true); }
    catch (_) { /* La bandeja local sigue disponible aunque falle la conexión nativa. */ }
    if (!changed && before !== JSON.stringify(connection)) notify();
  }

  const expired = item => item.expiresAt && Date.parse(item.expiresAt) <= Date.now();
  const unreadCount = () => items.filter(item => !item.readAt && !expired(item)).length;
  function markRead(id) {
    const item = items.find(entry => entry.id === id);
    if (!item || item.readAt) return false;
    item.readAt = new Date().toISOString(); save();
    try { if (bridge() && typeof bridge().markNoticeRead === 'function') bridge().markNoticeRead(id); } catch (_) {}
    notify(); return true;
  }
  function markAllRead() {
    const unread = items.filter(item => !item.readAt);
    if (!unread.length) return false;
    const at = new Date().toISOString(); unread.forEach(item => { item.readAt = at; }); save();
    try {
      if (bridge() && typeof bridge().markAllNoticesRead === 'function') bridge().markAllNoticesRead();
      else if (bridge() && typeof bridge().markNoticeRead === 'function') unread.forEach(item => bridge().markNoticeRead(item.id));
    } catch (_) {}
    notify(); return true;
  }
  function open(id) {
    if (!items.some(item => item.id === id)) return false;
    opened = id;
    if (!markRead(id)) notify();
    return true;
  }
  const date = value => new Date(value).toLocaleString('es-CL', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const bell = '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 17h14l-2-3V9a5 5 0 0 0-10 0v5l-2 3ZM10 21h4M12 2v2" stroke-linecap="round" stroke-linejoin="round"/></svg>';


  const documentIcon = '<svg viewBox="0 0 32 40" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 2h13l9 9v24a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3Z"/><path d="M20 2v10h9M10 20h8m-8 6h12m-12 6h9"/></svg>';
  const headingIcon = '<svg viewBox="0 0 64 64" fill="none" stroke-linejoin="round" aria-hidden="true"><path d="m9 22 31-15 20 5-31 16Z" fill="#1699ed" stroke="#0876ce" stroke-width="2.5"/><path d="M9 22C1 25 1 34 9 37l20 6 31-16V12L29 28Z" fill="#fff" stroke="#0876ce" stroke-width="3"/><path d="m9 37 20 6 31-16v10L29 53 9 47c-8-3-8-12 0-15" fill="#fff" stroke="#0876ce" stroke-width="3"/><path d="m9 47 20 6 31-16v9L29 62 9 56c-7-3-8-9-3-13" fill="#fff" stroke="#0876ce" stroke-width="3"/></svg>';
  const arrowIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12h16m-6-6 6 6-6 6"/></svg>';
  const chevronIcon = '<svg class="notice-settings-chevron" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m4 7 6 6 6-6"/></svg>';

  function statusCard() {
    let title = 'Conexión con la academia pendiente';
    let copy = 'Aquí podrás consultar evaluaciones, fechas de inscripción y otros avisos cuando tu academia active el servicio.';
    let action = '';
    if (connection.configured) {
      if (connection.permission === 'granted' && connection.enabled) {
        title = 'Notificaciones activadas'; copy = 'Los avisos de la academia podrán aparecer también en tu teléfono.';
      } else if (connection.permission === 'granted' && connection.registration === 'pending') {
        title = 'Conectando los avisos…'; copy = 'Estamos preparando las notificaciones de tu academia. Puedes seguir usando Manzanín.';
      } else if (connection.permission === 'notDetermined') {
        title = 'Permite que te avisemos'; copy = 'Puedes autorizar las notificaciones del teléfono y consultar tus mensajes en esta bandeja.';
        if (bridge() && typeof bridge().requestNoticePermission === 'function') action = '<button class="button" type="button" data-notice-action="permission">Permitir notificaciones</button>';
      } else if (connection.permission === 'granted' && connection.registration !== 'ready') {
        title = connection.registration === 'error' ? 'No pudimos conectar los avisos' : 'Activa los avisos de tu academia';
        copy = connection.registration === 'error' ? 'Revisa tu conexión a internet y vuelve a intentarlo. Tus mensajes guardados siguen disponibles.' : 'Elige si quieres recibir notificaciones de evaluaciones, exámenes libres y novedades en tu teléfono.';
        if (bridge() && typeof bridge().requestNoticePermission === 'function') action = `<button class="button" type="button" data-notice-action="permission">${connection.registration === 'error' ? 'Volver a intentar' : 'Activar avisos'}</button>`;
      } else {
        title = 'Avisos del teléfono desactivados'; copy = 'Puedes revisar esta bandeja y activar las notificaciones desde los ajustes de tu teléfono.';
        if (bridge() && typeof bridge().openNoticeSettings === 'function') action = '<button class="button secondary" type="button" data-notice-action="settings">Abrir ajustes</button>';
      }
    }
    return `<details class="notice-status-settings"><summary><span class="notice-settings-icon">${bell}</span>Notificaciones${chevronIcon}</summary><aside class="notice-status" aria-label="Estado de los avisos"><span class="notice-status-icon">${bell}</span><div><h2>${title}</h2><p>${copy}</p>${action}</div></aside></details>`;
  }

  function render() {
    const count = unreadCount(), item = items.find(entry => entry.id === opened);
    const warning = storageFailed ? '<p class="notice-warning" role="status">El teléfono no permitió guardar los últimos cambios. Revisa el espacio disponible antes de cerrar la aplicación.</p>' : '';
    const header = `<div class="notice-section-heading"><span class="notice-heading-icon">${headingIcon}</span><h1 class="page-title" id="notice-page-title">Información y avisos</h1></div>`;
    if (item) {
      return `<section class="notice-page" aria-labelledby="notice-page-title">${header}${warning}<button class="button secondary notice-back" type="button" data-notice-action="back">← Volver a mis avisos</button><article class="card notice-detail"><div class="notice-card-heading"><span class="notice-card-icon">${documentIcon}</span><div class="notice-card-caption"><div class="notice-item-meta"><span class="notice-category">${categories[item.category]}</span>${expired(item) ? '<span class="notice-expired">Plazo finalizado</span>' : ''}</div><h2>${escape(item.title)}</h2><p class="notice-date">Publicado el ${escape(date(item.publishedAt))}</p></div></div>${item.eventAt ? `<p class="notice-event">Fecha de la actividad: <b>${escape(date(item.eventAt))}</b></p>` : ''}<p class="notice-body">${escape(item.body)}</p>${item.url ? `<a class="button notice-link" href="${escape(item.url)}" target="_blank" rel="noopener noreferrer" data-notice-action="link" data-notice-id="${escape(item.id)}">Ver información ${arrowIcon}</a>` : ''}<p class="notice-read-state">Leído</p></article></section>`;
    }
    const list = items.filter(entry => (filter !== 'pendientes' || (!entry.readAt && !expired(entry))) && (category === 'todos' || category === entry.category));
    const empty = !items.length ? 'Todavía no tienes avisos' : filter === 'pendientes' ? 'No tienes avisos pendientes en esta categoría' : 'No hay avisos en esta categoría';
    return `<section class="notice-page" aria-labelledby="notice-page-title">${header}${warning}<div class="notice-toolbar"><div class="notice-filters" role="group" aria-label="Filtrar avisos">${[['todos', 'Todos'], ['pendientes', `Sin leer${count ? ' (' + count + ')' : ''}`]].map(([id, label]) => `<button type="button" class="button ${filter === id ? '' : 'secondary'}" data-notice-action="filter" data-notice-id="${id}" aria-pressed="${filter === id}">${label}</button>`).join('')}</div><label class="notice-select">Categoría<select class="input" data-notice-category aria-label="Categoría de avisos">${[['todos', 'Todas'], ...Object.entries(categories)].map(([id, label]) => `<option value="${id}"${category === id ? ' selected' : ''}>${label}</option>`).join('')}</select></label>${count ? '<button type="button" class="link-btn notice-all-read" data-notice-action="all-read">Marcar todos como leídos</button>' : ''}</div>${statusCard()}<div class="notice-list">${list.length ? list.map(entry => `<article class="card notice-item ${entry.readAt ? 'is-read' : 'is-unread'}"><button type="button" class="notice-open" data-notice-action="open" data-notice-id="${escape(entry.id)}"><span class="notice-card-heading"><span class="notice-card-icon">${documentIcon}</span><span class="notice-card-caption"><span class="notice-item-meta"><span class="notice-category">${categories[entry.category]}</span>${!entry.readAt && !expired(entry) ? '<span class="notice-unread-label">Sin leer</span>' : ''}${expired(entry) ? '<span class="notice-expired">Plazo finalizado</span>' : ''}</span><h2>${escape(entry.title)}</h2><p class="notice-date">${escape(date(entry.publishedAt))}</p></span></span><p class="notice-preview">${escape(entry.body.length > 180 ? entry.body.slice(0, 180) + '…' : entry.body)}</p><span class="notice-open-label">${entry.url ? 'Ver información' : 'Leer aviso'} ${arrowIcon}</span></button></article>`).join('') : `<div class="card notice-empty"><span class="notice-empty-icon">${bell}</span><h2>${empty}</h2><p>Los mensajes que recibas aparecerán aquí para que puedas volver a consultarlos.</p></div>`}</div></section>`;
  }

  function init(callback) {
    if (typeof callback === 'function') onChange = callback;
    if (!initialized) {
      initialized = true;
      document.addEventListener('appschooling:notice', event => receive(event.detail));
      document.addEventListener('appschooling:notice-open', event => { const value = event.detail; if (value && typeof value.id === 'string') open(value.id); });
      document.addEventListener('appschooling:notice-status', () => syncNative());
      document.addEventListener('visibilitychange', () => { if (!document.hidden) syncNative(); });
      document.addEventListener('click', event => {
        const target = event.target && event.target.closest && event.target.closest('[data-notice-action]');
        if (!target) return;
        const action = target.dataset.noticeAction, id = target.dataset.noticeId;
        if (action === 'link') {
          if (bridge() && typeof bridge().openNoticeLink === 'function') {
            event.preventDefault();
            try { bridge().openNoticeLink(id); } catch (_) {}
          }
        } else if (action === 'open') open(id);
        else if (action === 'back') { opened = ''; notify(); }
        else if (action === 'filter' && ['todos', 'pendientes'].includes(id)) { filter = id; opened = ''; notify(); }
        else if (action === 'all-read') markAllRead();
        else if (action === 'permission' && connection.configured) {
          try { if (bridge() && typeof bridge().requestNoticePermission === 'function') bridge().requestNoticePermission(); } catch (_) {}
          syncNative();
        } else if (action === 'settings') {
          try { if (bridge() && typeof bridge().openNoticeSettings === 'function') bridge().openNoticeSettings(); } catch (_) {}
        }
      });
      document.addEventListener('change', event => {
        const target = event.target;
        if (target && target.hasAttribute && target.hasAttribute('data-notice-category') && (target.value === 'todos' || Object.prototype.hasOwnProperty.call(categories, target.value))) { category = target.value; opened = ''; notify(); }
      });
    }
    syncNative();
  }

  window.AppSchoolingAvisos = Object.freeze({ render, unreadCount, receive: payload => receive(payload, false), init, mount: init, open, markRead, markAllRead, syncNative, status: () => ({ ...connection }) });
})();
