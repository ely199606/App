#!/usr/bin/env python3
"""Apply only the red/green visual layer to the approved, notification-ready app."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil

THEME = 'brand-red-green-v14.css'

def digest(body):
    return hashlib.sha256(body).hexdigest()

def replace_once(text, old, new, label):
    if text.count(old) != 1:
        raise ValueError(label + ': expected exactly one approved source anchor')
    return text.replace(old, new, 1)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--project', type=Path, required=True)
    parser.add_argument('--theme', type=Path, required=True)
    args = parser.parse_args()
    project = args.project.resolve(); www = project / 'app/src/main/assets/www'
    if not (www/'avisos.js').is_file() or not (www/'manzanin.js').is_file():
        raise ValueError('The approved 1.3 frontend and notifications must exist first')
    css = args.theme.read_text()
    if 'prefers-reduced-motion' not in css or '@keyframes' not in css or re.search(r'</style',css,re.I):
        raise ValueError('Expected the complete accessible background theme')
    before = {p.relative_to(www).as_posix():digest(p.read_bytes()) for p in www.rglob('*') if p.is_file()}
    js = (www/'app.js').read_text()
    patched = replace_once(js,"const BUILD='1.3';","const BUILD='1.4';",'app version')
    html = (www/'index.html').read_text()
    match = re.search(r'(<script\b[^>]*data-source="app\.js"[^>]*>)([\s\S]*?)(</script\s*>)',html,re.I)
    if not match or match.group(2).strip() != js.strip():
        raise ValueError('Inline and external app entry points differ')
    html = html[:match.start(2)]+'\n'+patched.rstrip()+'\n'+html[match.end(2):]
    html = replace_once(html,'</head>','<style data-source="'+THEME+'">\n'+css+'\n</style>\n</head>','last theme layer')
    (www/'app.js').write_text(patched); (www/'index.html').write_text(html); (www/THEME).write_text(css)
    edits = {
        'app/build.gradle': [(r'\bversionCode\s+130\b','versionCode 140'),(r'''\bversionName\s+['"]1\.3\.0['"]''',"versionName '1.4.0'")],
        'settings.gradle': [(r'AppSchooling_Manzanin_1_3','AppSchooling_Manzanin_1_4')],
        'app/src/main/java/com/ritmocasa/appdemo/MainActivity.java': [(r'AppSchoolingAndroid/1\.3','AppSchoolingAndroid/1.4'),(r'index\.html\?build=13\b','index.html?build=14')],
    }
    for relative, replacements in edits.items():
        path = project/relative; text = path.read_text()
        for pattern, replacement in replacements:
            text, count = re.subn(pattern,replacement,text)
            if count != 1: raise ValueError('Unexpected native version source: '+relative)
        path.write_text(text)
    after = {p.relative_to(www).as_posix():digest(p.read_bytes()) for p in www.rglob('*') if p.is_file()}
    changed = sorted(name for name, sha in before.items() if after.get(name) != sha)
    if changed != ['app.js','index.html']:
        raise ValueError('A functional asset was changed: '+str(changed))
    added = sorted(set(after)-set(before))
    if added != [THEME]: raise ValueError('Unexpected added assets')
    report = {'version':'1.4.0','version_code':140,'approved_base':'1.3.0','theme_sha256':digest(css.encode()),'changed_existing_frontend':changed,'added_frontend':added,'unchanged_assets':len(before)-len(changed),'mascot_frames_unchanged':True,'notice_backend_unchanged':True,'profile_storage_and_package_unchanged':True}
    (project/'brand14-report.json').write_text(json.dumps(report,indent=2)+'\n')
    (project/'ABRIR_ESTA_VERSION_PRIMERO.txt').write_text('MANZANÍN 1.4.0 — ROJO Y VERDE\n\nAbrir AppSchooling_AndroidStudio_1_4 en Android Studio.\nFondo rojo y verde con movimiento suave y superficies claras. Mis avisos, perfiles y todos los dibujos de Manzanín se conservan desde 1.3.\nMisma firma de actualización. Este ZIP es código fuente, no una APK.\n')
    docs = project/'LEEME_ANDROID_STUDIO.txt'
    if docs.exists():docs.write_text(docs.read_text().replace('1.3.0','1.4.0').replace('Código de versión: 130','Código de versión: 140')+'\nTEMA 1.4: capa visual brand-red-green-v14.css, último estilo inline del index. Respeta el movimiento reducido del sistema; no cambia el comportamiento de juegos o avisos.\n')
    print(json.dumps(report))

if __name__=='__main__':main()
