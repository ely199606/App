#!/usr/bin/env python3
"""Apply the family's reference main menu to the approved 1.4 app."""
import argparse
import hashlib
import json
from pathlib import Path
import re

def sha(body):
    return hashlib.sha256(body).hexdigest()

def once(text, old, new, label):
    if text.count(old) != 1:
        raise ValueError(label + ': expected exactly one source anchor')
    return text.replace(old, new, 1)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--project', type=Path, required=True)
    parser.add_argument('--module', type=Path, required=True)
    parser.add_argument('--theme', type=Path, required=True)
    args = parser.parse_args()
    project = args.project.resolve()
    www = project / 'app/src/main/assets/www'
    before = {p.relative_to(www).as_posix(): sha(p.read_bytes()) for p in www.rglob('*') if p.is_file()}
    module, css = args.module.read_text(), args.theme.read_text()
    if 'AppSchoolingMenu' not in module or re.search(r'</script', module, re.I):
        raise ValueError('Expected a safe inline menu module')
    if 'prefers-reduced-motion' not in css or re.search(r'</style', css, re.I):
        raise ValueError('Expected the accessible reference-menu theme')
    js = (www / 'app.js').read_text()
    patched = once(js, "const BUILD='1.4';", "const BUILD='1.5';", 'app version')
    patched = once(patched, "const bottomNav=()=>`<nav class=\"mobile-nav\" aria-label=\"Navegación móvil\">${navButton('inicio','inicio','Inicio')}${navButton('planner','planner','Hábitos y planner')}${navButton('avatar','avatar','Manzanín')}${navButton('examenes','book','Exámenes')}</nav>`;", 'const bottomNav=()=>window.AppSchoolingMenu.bottomNav(page,routineTab);', 'bottom navigation')
    patched = once(patched, "function render(){document.documentElement.dataset.manzaninMotion='on';", "function render(){document.documentElement.dataset.manzaninMotion='on';document.documentElement.dataset.appPage=page;", 'render page marker')
    patched = once(patched, 'inicio:home,planner:routinePage', 'inicio:()=>window.AppSchoolingMenu.home(),recursos:()=>window.AppSchoolingMenu.resources(),planner:routinePage', 'menu routes')
    patched = once(patched, "inicio:'Inicio',planner:'Hábitos y planner'", "inicio:'Inicio',recursos:'Recursos de apoyo',planner:'Hábitos y planner'", 'route titles')
    render_lines = [line for line in patched.splitlines() if "document.getElementById('app').innerHTML=" in line]
    if len(render_lines) != 1:
        raise ValueError('Expected one application shell')
    old_line = render_lines[0]
    old_header = old_line.split('<main class="main">', 1)[1].split('<div class="page-content">', 1)[0]
    new_line = " const header=page==='inicio'?window.AppSchoolingMenu.header(noticeBadge()):`" + old_header + "`;\n"
    new_line += " document.getElementById('app').innerHTML=`<div class=\"layout menu15-app ${page==='inicio'?'menu15-home':''}\"><main class=\"main\">${header}<div class=\"page-content\">${['calma','familia','ajustes','examenes'].includes(page)?companionRibbon(p):''}${(sections[page]||sections.inicio)()}</div></main>${bottomNav()}</div>${modal?modalContent():''}`;"
    patched = once(patched, old_line, new_line, 'application shell')
    old_alias = " if(x==='habitos'||x==='enfoque'){routineTab=x==='habitos'?'habitos':'agenda';x='planner'}"
    new_alias = " if(x==='planner')routineTab='agenda';\n if(x==='habitos'||x==='enfoque'||x==='estrategias'){routineTab=x==='habitos'?'habitos':x==='estrategias'?'estrategias':'agenda';x='planner'}"
    patched = once(patched, old_alias, new_alias, 'routine navigation aliases')
    html = (www / 'index.html').read_text()
    match = re.search(r'(<script\b[^>]*data-source="app\.js"[^>]*>)([\s\S]*?)(</script\s*>)', html, re.I)
    if not match or match.group(2).strip() != js.strip():
        raise ValueError('Inline and external app entry points differ')
    html = html[:match.start(2)] + '\n' + patched.rstrip() + '\n' + html[match.end(2):]
    html = once(html, '<script data-source="app.js">', '<script data-source="menu-v15.js">\n' + module.rstrip() + '\n</script>\n<script data-source="app.js">', 'inline menu module')
    html = once(html, '</head>', '<style data-source="menu-v15.css">\n' + css.rstrip() + '\n</style>\n</head>', 'last menu theme')
    (www / 'app.js').write_text(patched)
    (www / 'index.html').write_text(html)
    (www / 'menu-v15.js').write_text(module)
    (www / 'menu-v15.css').write_text(css)
    edits = {
        'app/build.gradle': [(r'\bversionCode\s+140\b', 'versionCode 150'), (r'''\bversionName\s+['"]1\.4\.0['"]''', "versionName '1.5.0'")],
        'settings.gradle': [(r'AppSchooling_Manzanin_1_4', 'AppSchooling_Manzanin_1_5')],
        'app/src/main/java/com/ritmocasa/appdemo/MainActivity.java': [(r'AppSchoolingAndroid/1\.4', 'AppSchoolingAndroid/1.5'), (r'index\.html\?build=14\b', 'index.html?build=15')],
    }
    for relative, replacements in edits.items():
        path = project / relative
        text = path.read_text()
        for pattern, replacement in replacements:
            text, count = re.subn(pattern, replacement, text)
            if count != 1:
                raise ValueError('Unexpected native version source: ' + relative)
        path.write_text(text)
    after = {p.relative_to(www).as_posix(): sha(p.read_bytes()) for p in www.rglob('*') if p.is_file()}
    changed = sorted(name for name, value in before.items() if after.get(name) != value)
    added = sorted(set(after) - set(before))
    if changed != ['app.js', 'index.html'] or added != ['menu-v15.css', 'menu-v15.js']:
        raise ValueError('Unexpected functional or mascot asset change')
    report = {'version': '1.5.0', 'version_code': 150, 'approved_base': '1.4.0', 'theme_sha256': sha(css.encode()), 'module_sha256': sha(module.encode()), 'changed_existing_frontend': changed, 'added_frontend': added, 'unchanged_assets': len(before) - len(changed), 'mascot_frames_unchanged': True, 'notice_backend_unchanged': True, 'profile_storage_and_package_unchanged': True}
    (project / 'menu15-report.json').write_text(json.dumps(report, indent=2) + '\n')
    (project / 'ABRIR_ESTA_VERSION_PRIMERO.txt').write_text('APPSCHOOLING · COLEGIO VIRTUAL DE CHILE — 1.5.0\n\nAbrir AppSchooling_AndroidStudio_1_5 en Android Studio.\nMenú principal según referencia: encabezado rojo y verde, cuatro tarjetas celestes y barra inferior azul. Los recursos conservan acceso a Manzanín y sus juegos, estrategias, hábitos y planner.\nSe conservan los perfiles locales, avisos y firma de actualización de 1.4.\nEste ZIP es código fuente, no una APK.\n')
    docs = project / 'LEEME_ANDROID_STUDIO.txt'
    if docs.exists():
        docs.write_text(docs.read_text().replace('1.4.0', '1.5.0').replace('Código de versión: 140', 'Código de versión: 150') + '\nMENÚ 1.5: menu-v15.js y menu-v15.css, también integrados inline en index.html para uso sin conexión.\n')
    print(json.dumps(report))

if __name__ == '__main__':
    main()
