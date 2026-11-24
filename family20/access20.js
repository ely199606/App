(() => {
  'use strict';
  const root = document.documentElement;
  const host = document.createElement('section');
  host.id = 'school-access';
  host.setAttribute('aria-label', 'Acceso de familias');
  host.innerHTML = `<img class="access20-logo" src="icons/colegio-original.png" width="1600" height="989" alt="Colegio Virtual de Chile"><div class="access20-card"><h1>Bienvenida, familia</h1><p class="access20-intro">Ingresa con el correo autorizado por el colegio.</p><form class="access20-form" novalidate><label for="access20-email">Correo electrónico</label><input id="access20-email" name="username" type="email" inputmode="email" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" maxlength="254" required><label for="access20-password">Contraseña</label><div class="access20-password"><input id="access20-password" name="password" type="password" autocomplete="current-password" required><button class="access20-show" type="button" aria-controls="access20-password" aria-pressed="false">Mostrar</button></div><button class="access20-submit" type="submit">Ingresar</button><p class="access20-status" role="status" aria-live="polite"></p></form><p class="access20-help">Si aún no tienes acceso o necesitas ayuda con tu contraseña, comunícate con el colegio.</p><a class="access20-contact" href="https://colegiovirtualdechile.cl/" target="_blank" rel="noopener noreferrer">Contactar al colegio</a></div>`;
  document.body.appendChild(host);
  const app = document.getElementById('app');
  const form = host.querySelector('form');
  const emailInput = form.elements.username;
  const passwordInput = form.elements.password;
  const submit = host.querySelector('.access20-submit');
  const message = host.querySelector('.access20-status');
  const show = host.querySelector('.access20-show');
  let access = { authorized: false, configured: false, busy: false, email: '', error: '' };
  let pendingTimer;
  const native = () => window.AppSchoolingNative;
  const hasBridge = () => native() && typeof native().getAccessStatus === 'function';
  const escapeText = value => String(value || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function accountCard() {
    return `<div class="card access20-account"><h2>Tu acceso al colegio</h2><p class="access20-account-email">${escapeText(access.email)}</p><button type="button" class="button secondary access20-signout" data-school-signout>Cerrar sesión</button></div>`;
  }

  function lockInteractions() {
    if (!app) return;
    app.inert = !access.authorized;
    app.setAttribute('aria-hidden', access.authorized ? 'false' : 'true');
  }

  function apply(status) {
    const wasAuthorized = access.authorized;
    access = { configured: false, authorized: false, busy: false, error: '', email: '', ...(status || {}) };
    access.authorized = access.authorized === true && access.configured === true;
    root.dataset.schoolAccess = access.authorized ? 'authorized' : 'locked';
    host.hidden = access.authorized;
    lockInteractions();
    submit.disabled = access.busy || !access.configured;
    submit.textContent = access.busy ? 'Verificando…' : 'Ingresar';
    emailInput.disabled = passwordInput.disabled = !!access.busy;
    show.disabled = !!access.busy;
    form.setAttribute('aria-busy', access.busy ? 'true' : 'false');
    message.textContent = access.error || (!access.configured ? 'Abre la aplicación del colegio para ingresar con tus credenciales.' : access.busy ? 'Estamos verificando tu acceso.' : '');
    if (!access.busy) clearTimeout(pendingTimer);
    if (access.authorized) {
      passwordInput.value = '';
      passwordInput.type = 'password';
      show.textContent = 'Mostrar';
      show.setAttribute('aria-pressed', 'false');
      if (!wasAuthorized) {
        window.scrollTo(0, 0);
        document.dispatchEvent(new CustomEvent('appschooling:access-ready'));
        window.AppSchoolingAvisos?.syncNative?.();
      }
    } else if (wasAuthorized) {
      document.dispatchEvent(new CustomEvent('appschooling:access-locked'));
    }
    document.querySelectorAll('[data-school-account-host]').forEach(el => el.innerHTML = accountCard());
  }

  function sync() {
    if (!hasBridge()) { apply(null); return; }
    try { apply(JSON.parse(native().getAccessStatus())); }
    catch (_) { apply({ configured: false, error: 'No pudimos abrir el acceso. Cierra y vuelve a abrir la aplicación.' }); }
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (access.busy || !hasBridge()) return;
    const email = emailInput.value.trim();
    if (!email || !emailInput.validity.valid || !passwordInput.value) {
      message.textContent = 'Escribe tu correo y contraseña para ingresar.';
      (!email || !emailInput.validity.valid ? emailInput : passwordInput).focus();
      return;
    }
    apply({ ...access, busy: true, error: '' });
    try {
      native().signIn(email, passwordInput.value);
      passwordInput.value = '';
      pendingTimer = setTimeout(sync, 20000);
    } catch (_) {
      passwordInput.value = '';
      apply({ ...access, busy: false, error: 'No pudimos ingresar. Vuelve a intentarlo.' });
    }
  });

  show.addEventListener('click', () => {
    const visible = passwordInput.type === 'password';
    passwordInput.type = visible ? 'text' : 'password';
    show.textContent = visible ? 'Ocultar' : 'Mostrar';
    show.setAttribute('aria-pressed', String(visible));
  });
  document.addEventListener('appschooling:access-status', event => apply(event.detail));
  document.addEventListener('click', event => {
    if (!event.target.closest?.('[data-school-signout]')) return;
    event.preventDefault();
    if (!hasBridge()) return;
    // Hide immediately; native signOut invalidates all pending authentication callbacks.
    apply({ ...access, authorized: false, email: '' });
    native().signOut();
    window.scrollTo(0, 0);
  });
  window.AppSchoolingAccess = Object.freeze({
    authorized: () => access.authorized,
    accountCard,
    sync,
    back: () => { if (access.authorized) return false; document.activeElement?.blur?.(); return true; }
  });
  sync();
})();
