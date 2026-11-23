#!/usr/bin/env python3
"""Remove the loading-word flash and draw a reliably moving diffuse backdrop."""
import argparse
import hashlib
import json
from pathlib import Path
import re

def sha(b):return hashlib.sha256(b).hexdigest()
def once(s,old,new,label):
    if s.count(old)!=1:raise ValueError('Unexpected source anchor: '+label)
    return s.replace(old,new,1)

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--project',type=Path,required=True);p.add_argument('--assets',type=Path,required=True);a=p.parse_args()
    project=a.project.resolve();assets=a.assets.resolve();www=project/'app/src/main/assets/www'
    before={p.relative_to(www).as_posix():sha(p.read_bytes()) for p in www.rglob('*') if p.is_file()}
    old=(www/'app.js').read_text();js=once(old,"const BUILD='1.8';","const BUILD='1.9';",'app version')
    html=(www/'index.html').read_text();m=re.search(r'(<script\b[^>]*data-source="app\.js"[^>]*>)([\s\S]*?)(</script\s*>)',html,re.I)
    if not m or m.group(2).strip()!=old.strip():raise ValueError('Inline app differs from external app')
    html=html[:m.start(2)]+'\n'+js.rstrip()+'\n'+html[m.end(2):]
    html,n=re.subn(r'<section data-manzanin-start\b[^>]*>[\s\S]*?</section>','<section data-manzanin-start class="school-startup" aria-busy="true" aria-label="Cargando aplicación"><noscript>Activa JavaScript para abrir la aplicación.</noscript></section>',html,count=1)
    if n!=1:raise ValueError('Expected the old startup placeholder')
    html=once(html,'<title>Manzanín · Academia Homeschool</title>','<title>Colegio Virtual de Chile</title>','page title')
    html=once(html,'<h1 style="font-size:32px">Manzanín</h1>','<h1 style="font-size:32px">Colegio Virtual de Chile</h1>','startup error title')
    html=once(html,'<html lang="es">','<html lang="es" data-family-mode="familias" data-app-page="inicio">','initial family styling')
    html=once(html,'content="Manzanín: hábitos, planner, estrategias de estudio y juegos para aprender a tu ritmo, desde el navegador."','content="Información y recursos para las familias del Colegio Virtual de Chile."','family description')
    css=(assets/'motion-surface.css').read_text();module=(assets/'background-motion.js').read_text()
    if re.search(r'</style',css,re.I) or re.search(r'</script',module,re.I):raise ValueError('Unsafe inline resource')
    html=once(html,'</head>','<style data-source="motion-surface.css">\n'+css.rstrip()+'\n</style>\n</head>','last motion surface')
    html=once(html,'<body style="margin:0;background:#f5e8cc">','<body style="margin:0">\n<canvas id="school-background" aria-hidden="true"></canvas>\n<script data-source="background-motion.js">\n'+module.rstrip()+'\n</script>','early background runtime')
    (www/'app.js').write_text(js);(www/'index.html').write_text(html);(www/'motion-surface.css').write_text(css);(www/'background-motion.js').write_text(module)
    for rel,changes in {
      'app/build.gradle':[(r'\bversionCode\s+180\b','versionCode 190'),(r'''\bversionName\s+['"]1\.8\.0['"]''',"versionName '1.9.0'")],
      'settings.gradle':[(r'AppSchooling_Manzanin_1_8','AppSchooling_Manzanin_1_9')],
      'app/src/main/java/com/ritmocasa/appdemo/MainActivity.java':[(r'AppSchoolingAndroid/1\.8','AppSchoolingAndroid/1.9'),(r'index\.html\?build=18\b','index.html?build=19')],
    }.items():
      file=project/rel;s=file.read_text()
      for pattern,replacement in changes:
        s,n=re.subn(pattern,replacement,s)
        if n!=1:raise ValueError('Unexpected version source '+rel)
      file.write_text(s)
    after={p.relative_to(www).as_posix():sha(p.read_bytes()) for p in www.rglob('*') if p.is_file()};changed=sorted(k for k,v in before.items() if after.get(k)!=v);added=sorted(set(after)-set(before))
    if changed!=['app.js','index.html'] or added!=['background-motion.js','motion-surface.css']:raise ValueError('Unexpected functional or mascot resource change')
    report={'version':'1.9.0','version_code':190,'approved_base':'1.8.0','theme_file':'motion-surface.css','theme_sha256':sha(css.encode()),'background_runtime_sha256':sha(module.encode()),'changed_existing_frontend':changed,'added_frontend':added,'frontend_files':len(after),'approved_home_layout_unchanged':True,'mascot_frames_unchanged':True,'notice_transport_unchanged':True,'startup_mascot_title_removed':True,'background_rendering':'continuous animated canvas'}
    (project/'family19-report.json').write_text(json.dumps(report,indent=2)+'\n')
    (project/'ABRIR_ESTA_VERSION_PRIMERO.txt').write_text('APPSCHOOLING FAMILIAS 1.9.0\n\nAbrir AppSchooling_AndroidStudio_1_9.\nConserva el diseño aprobado de 1.8. Inicio sin el texto momentáneo Manzanín. Degradado rojo y verde dibujado y actualizado continuamente con movimiento suave, bajo el menú. Misma firma e identidad Android.\n')
    print(json.dumps(report))

if __name__=='__main__':main()
