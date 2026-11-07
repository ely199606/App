#!/usr/bin/env python3
"""Restore the reference frontend and add the existing native family inbox.

Usage: restore_frontend.py --project ANDROID_PROJECT --reference SNAPSHOT/site
The reference directory is read only. No network access or private signing keys
are needed. Original visual assets, CSS, character code and navigation survive
byte for byte. Only app.js/index.html receive the small inbox integration.
"""
import argparse
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import shutil
import tempfile
from urllib.parse import urlsplit


PROFILE_STORE = 'appschooling_manzanin09'
PACKAGE = 'com.appschooling.manzanin.piloto09'
BELL = '<path d="M5 17h14l-2-3V9a5 5 0 0 0-10 0v5l-2 3ZM10 21h4M12 2v2"/>'
HELPERS = r'''function noticeBadge(){const count=window.AppSchoolingAvisos.unreadCount();return `<span class="notice-nav-count" data-notice-count ${count?'':'hidden'} aria-label="${count} avisos sin leer">${count>99?'99+':count}</span>`}
function updateNoticeBadges(){const count=window.AppSchoolingAvisos.unreadCount();document.querySelectorAll('[data-notice-count]').forEach(el=>{el.hidden=!count;el.textContent=count>99?'99+':String(count);el.setAttribute('aria-label',count+' avisos sin leer')})}
function noticeSettingsCard(){return `<div class="card"><h3>${artIcon('avisos')} Mis avisos</h3><p>Evaluaciones, exámenes libres y novedades de tu academia.</p><button type="button" class="button small" data-action="go" data-page="avisos">Abrir mis avisos ${noticeBadge()}</button></div>`}
function syncStudyNative(){if(typeof window.AppSchoolingNative?.syncStudyReminders!=='function')return;try{const list=state.profiles.flatMap(p=>(Array.isArray(p.studyReminders)?p.studyReminders:[]).filter(r=>r&&!r.done&&Number.isFinite(r.at)&&r.at>Date.now()).map(r=>({id:p.id+'-'+r.id,title:r.title,at:r.at})));window.AppSchoolingNative.syncStudyReminders(JSON.stringify(list))}catch(_){}}
function applyStoredDailyReminders(){if(typeof window.AppSchoolingNative?.applyReminders!=='function')return;const s=state.settings||{};try{window.AppSchoolingNative.applyReminders(!!s.reminders,s.study||'10:00',s.water||'12:00',s.rest||'17:00')}catch(_){}}
'''
BOOTSTRAP = '''syncStudyNative();
window.AppSchoolingAvisos.init(()=>{if(page==='avisos')render();else updateNoticeBadges()});
document.addEventListener('appschooling:notice-open',()=>{if(page!=='avisos')changePage('avisos')});
'''
TOP_BUTTON = '''<button type="button" class="icon-btn notice-top-button" data-action="go" data-page="avisos" title="Mis avisos" aria-label="Abrir mis avisos">${artIcon('avisos')}${noticeBadge()}</button>'''
SCRIPT = re.compile(r'<script\b(?P<attrs>[^>]*)>(?P<body>[\s\S]*?)</script\s*>', re.I)


def digest(value):
    return hashlib.sha256(value if isinstance(value, bytes) else value.encode('utf-8')).hexdigest()


def files_hash(root):
    return {p.relative_to(root).as_posix(): digest(p.read_bytes()) for p in root.rglob('*') if p.is_file()}


def once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise ValueError(f'{label}: expected one known anchor, found {count}')
    return text.replace(old, new, 1)


def one_of(text, candidates, new, label):
    present = [old for old in candidates if old in text]
    if len(present) != 1:
        raise ValueError(f'{label}: expected one supported reference variant, found {len(present)}')
    return once(text, present[0], new, label)


def regex_once(text, pattern, replacement, label, flags=0):
    result, count = re.subn(pattern, replacement, text, flags=flags)
    if count != 1:
        raise ValueError(f'{label}: expected one known anchor, found {count}')
    return result


def navigation(text):
    # These functions are intentionally never rewritten. Fail closed if a future
    # frontend no longer has the reference's known compact declarations.
    result = {}
    for key, pattern in [('nav', r'^function nav\(\)\{[^\n]+\}$'), ('bottomNav', r'^const bottomNav=[^\n]+;$')]:
        match = re.search(pattern, text, re.M)
        if not match:
            raise ValueError('Original navigation declaration missing: ' + key)
        result[key] = match.group(0)
    return result


def patch_app(original):
    nav = navigation(original)
    store = re.search(r"\bconst STORE\s*=\s*(['\"])(.*?)\1", original)
    if not store or store.group(2) != PROFILE_STORE:
        raise ValueError('Reference profile storage namespace changed')
    if 'AppSchoolingAvisos' in original:
        raise ValueError('Reference already has an inbox integration; review before patching')
    text = once(original, 'const pictograms = {', 'const pictograms = {\n avisos:\'' + BELL + "',", 'bell pictogram')
    text = regex_once(text, r"\bconst BUILD\s*=\s*(['\"])[^'\"]*\1\s*;", "const BUILD='1.3';", 'internal version')
    text = once(text, 'function navButton(', HELPERS + '\nfunction navButton(', 'inbox helpers')
    text = once(text, 'const sections={', 'const sections={avisos:()=>window.AppSchoolingAvisos.render(),', 'inbox page')
    text = once(text, 'const names={', "const names={avisos:'Mis avisos',", 'inbox breadcrumb')
    text = regex_once(text, r'<button\b[^>]*\bclass="icon-btn"[^>]*\bdata-page="ajustes"[^>]*>', lambda m: TOP_BUTTON + m.group(0), 'header bell')
    text = once(text, '<div class="card"><h3>🔔 Avisos suaves</h3>', '${noticeSettingsCard()}<div class="card"><h3>🔔 Avisos suaves</h3>', 'settings inbox card')
    text = one_of(text, ['La información permanece en este dispositivo y puedes exportarla o borrarla.', 'Los perfiles y registros se guardan en este navegador; puedes exportar una copia o borrarlos.'], 'Los perfiles permanecen en este dispositivo y puedes exportarlos o borrarlos. Consulta los mensajes de la academia en Mis avisos.', 'settings profile copy')
    text = one_of(text, ['Sin cuentas, anuncios, seguimiento publicitario ni envío de datos a servidores.', 'Tus perfiles y registros se guardan en este navegador. Puedes llevarlos a otro dispositivo con una copia exportada.'], 'Los perfiles se guardan en este dispositivo. Al activar las notificaciones, Firebase registra el dispositivo para entregar avisos. Los perfiles, hábitos y notas no se envían con ese registro.', 'Firebase privacy copy')
    text = text.replace('Los recordatorios funcionan mientras esta página está abierta. Puedes recibirlos dentro de la página y, si tu navegador lo permite, como avisos del sistema.', 'En Android, los recordatorios locales se programan de forma aproximada y requieren permisos del dispositivo; con la app en navegador solo funcionan mientras está abierta. Evita usarlos como alarmas exactas.', 1)
    # Keep unknown legacy profile properties and reminders, without restoring the
    # old notes layout or introducing another primary navigation destination.
    text = once(text, "state=defaults();modal='';page='inicio';render();toast('Datos borrados del navegador.')", "state=defaults();syncStudyNative();applyStoredDailyReminders();modal='';page='inicio';render();toast('Datos borrados del navegador.')", 'erase native reminders')
    text = one_of(text, ["modal='';save();render();toast('Copia restaurada en este dispositivo.')", "modal='';save();render();toast('Copia restaurada en este navegador.')"], "modal='';save();syncStudyNative();applyStoredDailyReminders();render();toast('Copia restaurada en este dispositivo.')", 'import native reminders')
    text = once(text, 'setInterval(checkReminders,30000);render();', BOOTSTRAP + 'setInterval(checkReminders,30000);render();', 'initialize inbox once')
    # Internal comment only: do not add a version banner to the reference UI.
    text = text.replace('prototipo offline; sin servicios externos ni analítica.', 'perfiles locales; avisos de academia con Firebase al activarlos; sin analítica.', 1)
    if navigation(text) != nav:
        raise ValueError('Primary navigation changed unexpectedly')
    if store.group(0) not in text or 'topbar with-notices' in text:
        raise ValueError('Profile storage or reference header changed unexpectedly')
    return text, {key: digest(value) for key, value in nav.items()}


class StartTag(HTMLParser):
    def __init__(self, attributes):
        super().__init__(); self.attrs = {}; self.feed('<script ' + attributes + '>')

    def handle_starttag(self, tag, attrs):
        self.attrs = dict(attrs)


def basename(value):
    return Path(urlsplit(value or '').path).name


def inline_safe(text):
    return re.sub(r'</script', r'<\\/script', text, flags=re.I)


def patch_index(original, notices_js, notices_css):
    app_entries = []
    for match in SCRIPT.finditer(original):
        attrs = StartTag(match.group('attrs')).attrs
        if basename(attrs.get('src')) == 'app.js':
            app_entries.append((match, 'external'))
        elif not attrs.get('src') and (basename(attrs.get('data-source')) == 'app.js' or ("const STORE=" in match.group('body') and PROFILE_STORE in match.group('body') and 'function render()' in match.group('body'))):
            app_entries.append((match, 'inline'))
    if len(app_entries) != 1:
        raise ValueError(f'Expected one executing app entry point; found {len(app_entries)}')
    match, mode = app_entries[0]
    if mode == 'inline':
        body, nav = patch_app(match.group('body'))
        replacement = '<script data-source="avisos.js">\n' + inline_safe(notices_js) + '\n</script>\n' + '<script' + match.group('attrs') + '>' + inline_safe(body) + '</script>'
    else:
        attrs = StartTag(match.group('attrs')).attrs
        if 'defer' not in attrs or 'async' in attrs:
            raise ValueError('External reference app must use ordered deferred scripts')
        nav = None
        replacement = '<script src="avisos.js?v=13" defer></script>\n  ' + match.group(0)
    html = original[:match.start()] + replacement + original[match.end():]
    html = regex_once(html, r'</head\s*>', lambda m: '<style data-source="avisos.css">\n' + notices_css + '\n</style>\n' + m.group(0), 'last inbox stylesheet', re.I)
    return html, {'execution': mode, 'inline_navigation_sha256': nav}


def trim_notices_css(css):
    return regex_once(css, r'\s*@media\(max-width:480px\)\{\.topbar\.with-notices\{flex-wrap:wrap\}\.topbar\.with-notices \.top-actions\{margin-left:auto;max-width:100%\}\}\s*$', '\n', 'remove legacy header layout override')


def native_updates(project):
    paths = {
        'app/build.gradle': [(r'\bversionCode\s+\d+', 'versionCode 130'), (r'''\bversionName\s+['"][^'"]+['"]''', 'versionName "1.3.0"')],
        'app/src/main/java/com/ritmocasa/appdemo/MainActivity.java': [(r'AppSchoolingAndroid/[0-9.]+', 'AppSchoolingAndroid/1.3'), (r'index\.html\?build=\d+', 'index.html?build=13')],
        'settings.gradle': [(r'AppSchooling_Manzanin_1_[23]', 'AppSchooling_Manzanin_1_3')],
    }
    updates = {}
    for relative, replacements in paths.items():
        original = (project / relative).read_text()
        text = original
        for pattern, replacement in replacements:
            text = regex_once(text, pattern, replacement, relative + ': ' + pattern)
        if relative == 'app/build.gradle' and not re.search(r'''\bapplicationId\s+['"]''' + re.escape(PACKAGE) + r'''['"]''', text):
            raise ValueError('Application identity changed')
        if relative.endswith('MainActivity.java'):
            if 'https://appassets.androidplatform.net/assets/www/' not in text or re.search(r'WebStorage|deleteAllData|clearAll|clearStorage', text):
                raise ValueError('WebView storage origin/reset code changed')
        updates[relative] = (original, text)
    return updates


def restore_documentation(project):
    (project / 'ABRIR_ESTA_VERSION_PRIMERO.txt').write_text('MANZANÍN 1.3.0\n\nAbrir AppSchooling_AndroidStudio_1_3 en Android Studio.\nInterfaz recuperada de https://soft-cocada-de54ce.netlify.app/ y módulo nativo Mis avisos conservado.\nConsultar LEEME_ANDROID_STUDIO.txt. El ZIP es código fuente, no una APK instalable.\n')
    (project / 'LEEME_ANDROID_STUDIO.txt').write_text('''MANZANÍN 1.3.0 — DISEÑO RESTAURADO

Interfaz y recursos recuperados de https://soft-cocada-de54ce.netlify.app/.
Conserva fondo crema, tipografía Atkinson y las cuatro secciones principales.
Mis avisos se abre desde la campana o Configuración. El Aventurero incorpora
una secuencia propia; correr y bailar se reproducen con más calma.

Compilar con Java 17, Gradle 8.9, Android SDK 35 y Build Tools 35.0.0:
gradle --no-daemon :app:assembleRelease
Sin variables de firma, el resultado es app-release-unsigned.apk.
La clave privada está fuera del proyecto y del repositorio.
Usar la misma clave de la versión 1.2 para actualizar sin desinstalar.
Paquete: com.appschooling.manzanin.piloto09. Código de versión: 130.

Los perfiles mantienen su almacenamiento local y pueden exportarse.
Firebase registra el dispositivo solo al activar los avisos de academia.
Consultar CONTRATO_AVISOS.md para el formato FCM data-only.
El registro de apoderados, cursos por hijo, envíos por nivel y panel
administrativo requieren la siguiente etapa de plataforma y base de datos.
Esta versión no implementa todavía esa diferenciación.
''')
    (project / 'VALIDACION_Y_LIMITES.txt').write_text('''MANZANÍN 1.3 — VALIDACIÓN Y LÍMITES

El workflow restaura una referencia pública fijada por SHA256, conserva los
atlas originales y aplica cambios acotados en app.js/index.html/manzanin.js.
Antes de compilar ejecuta Chromium con capturas de Inicio, Planner, Aventurero,
juego y bandeja; comprueba navegación, datos y llegada de avisos simulados.
El informe de esa ejecución se guarda en qa/browser-report.json.
restore-report.json documenta la restauración antes del parche de movimiento.

Los avisos en Chromium usan un puente Android simulado. La entrega real FCM
debe comprobarse en un teléfono; no se afirma una prueba física completada.
El proyecto no contiene claves privadas. El APK se firma después de compilar,
con el certificado conservado de 1.2. Los manifiestos de hashes y la evidencia
del build se entregan aparte del respaldo fuente.

Registro de apoderados, perfiles remotos, niveles y panel de envíos: pendientes
de la siguiente etapa. Actualmente solo están previstos los avisos generales.
''')
    for name in ['test_notices_integration.cjs', 'notices-final-audit.json']:
        legacy = project / 'qa' / name
        if legacy.exists():
            legacy.unlink()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--project', required=True, type=Path)
    parser.add_argument('--reference', required=True, type=Path)
    args = parser.parse_args()
    project, reference = args.project.resolve(), args.reference.resolve()
    www = project / 'app/src/main/assets/www'
    if not (reference / 'index.html').is_file() or not (reference / 'app.js').is_file():
        raise ValueError('--reference must contain the complete site root and app.js')
    if www == reference or www in reference.parents or reference in www.parents:
        raise ValueError('Reference must be separate from the destination frontend')
    if any(p.is_symlink() for p in reference.rglob('*')):
        raise ValueError('Reference cannot contain symbolic links')
    notices_js = (www / 'avisos.js').read_text()
    notices_css = trim_notices_css((www / 'avisos.css').read_text())
    reference_hashes = files_hash(reference)
    app_js, nav = patch_app((reference / 'app.js').read_text())
    html, html_report = patch_index((reference / 'index.html').read_text(), notices_js, notices_css)
    updates = native_updates(project)
    # Validate all anchors before touching the destination. A temporary sibling
    # keeps an interrupted preparation from leaving a half-written frontend.
    with tempfile.TemporaryDirectory(prefix='manzanin-restore-', dir=www.parent) as temp:
        staging = Path(temp) / 'www'
        shutil.copytree(reference, staging)
        (staging / 'app.js').write_text(app_js)
        (staging / 'index.html').write_text(html)
        (staging / 'avisos.js').write_text(notices_js)
        (staging / 'avisos.css').write_text(notices_css)
        staged_hashes = files_hash(staging)
        changed = [name for name, sha in reference_hashes.items() if staged_hashes.get(name) != sha]
        if set(changed) != {'app.js', 'index.html'}:
            raise ValueError('Unexpected reference modifications: ' + ', '.join(changed))
        backup = www.with_name('www-before-restore')
        if backup.exists():
            raise ValueError('A previous restoration backup already exists')
        www.rename(backup)
        try:
            staging.rename(www)
        except BaseException:
            backup.rename(www)
            raise
        shutil.rmtree(backup)
    for relative, (original, text) in updates.items():
        if original != text:
            (project / relative).write_text(text)
    unchanged = {name: sha for name, sha in reference_hashes.items() if name not in changed}
    report = {
        'version': '1.3.0', 'version_code': 130, 'application_id': PACKAGE,
        'reference_file_count': len(reference_hashes), 'reference_sha256': reference_hashes,
        'reference_files_changed': sorted(changed), 'reference_files_byte_identical': sorted(unchanged),
        'added_files': ['avisos.css', 'avisos.js'], 'navigation_sha256': nav,
        'profile_storage_namespace': PROFILE_STORE, 'profile_storage_unchanged': True,
        'webview_storage_origin_unchanged': True, 'legacy_study_reminder_sync_retained': True,
        'notification_arrival_rerenders_only_inbox': True, 'legacy_header_layout_override_removed': True,
        'native_files_modified': [relative for relative, pair in updates.items() if pair[0] != pair[1]],
        'frontend_sha256': staged_hashes, **html_report,
    }
    report_path = project / 'restore-report.json'
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    restore_documentation(project)
    print(json.dumps({'report': str(report_path), 'version': '1.3.0', 'reference_files_unchanged': len(unchanged), 'reference_files_changed': sorted(changed), 'app_execution': html_report['execution'], 'navigation_unchanged': True}))


if __name__ == '__main__':
    main()
