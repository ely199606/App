#!/usr/bin/env python3
"""Make the approved family home larger and add its original animated helper."""
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
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--project',type=Path,required=True);p.add_argument('--theme',type=Path,required=True);args=p.parse_args()
    project=args.project.resolve();www=project/'app/src/main/assets/www';before={p.relative_to(www).as_posix():sha(p.read_bytes()) for p in www.rglob('*') if p.is_file()}
    old=(www/'app.js').read_text();js=once(old,"const BUILD='1.7';","const BUILD='1.8';",'version')
    js=once(js,'</div></main>${bottomNav()}</div>${modal?modalContent():\'\'}`;','</div>${page===\'inicio\'?homeCompanion(p):\'\'}</main>${bottomNav()}</div>${modal?modalContent():\'\'}`;','home helper placement')
    helper='''function homeCompanion(profile){
 const companion={...profile,manzaninPose:profile.manzaninPose==='lector'?'saludo':profile.manzaninPose};
 return `<section class="family18-home-companion" aria-label="Manzanín te ayuda">${window.AppSchoolingSchoolHelp.button(companion,104)}</section>`;
}
'''
    js=once(js,'function familyPlanner(){',helper+'function familyPlanner(){','home companion renderer')
    html=(www/'index.html').read_text();m=re.search(r'(<script\b[^>]*data-source="app\.js"[^>]*>)([\s\S]*?)(</script\s*>)',html,re.I)
    if not m or m.group(2).strip()!=old.strip():raise ValueError('Inline app differs from external app')
    html=html[:m.start(2)]+'\n'+js.rstrip()+'\n'+html[m.end(2):]
    css=args.theme.read_text()
    if re.search(r'</style',css,re.I):raise ValueError('Unsafe inline style')
    html=once(html,'</head>','<style data-source="home-roomy.css">\n'+css.rstrip()+'\n</style>\n</head>','last home style')
    (www/'app.js').write_text(js);(www/'index.html').write_text(html);(www/'home-roomy.css').write_text(css)
    changes={
      'app/build.gradle':[(r'\bversionCode\s+170\b','versionCode 180'),(r'''\bversionName\s+['"]1\.7\.0['"]''',"versionName '1.8.0'")],
      'settings.gradle':[(r'AppSchooling_Manzanin_1_7','AppSchooling_Manzanin_1_8')],
      'app/src/main/java/com/ritmocasa/appdemo/MainActivity.java':[(r'AppSchoolingAndroid/1\.7','AppSchoolingAndroid/1.8'),(r'index\.html\?build=17\b','index.html?build=18')],
    }
    for rel,replacements in changes.items():
      file=project/rel;s=file.read_text()
      for pattern,replacement in replacements:
        s,n=re.subn(pattern,replacement,s)
        if n!=1:raise ValueError('Unexpected version source '+rel)
      file.write_text(s)
    after={p.relative_to(www).as_posix():sha(p.read_bytes()) for p in www.rglob('*') if p.is_file()};changed=sorted(k for k,v in before.items() if after.get(k)!=v);added=sorted(set(after)-set(before))
    if changed!=['app.js','index.html'] or added!=['home-roomy.css']:raise ValueError('Unexpected functional or mascot resource change')
    report={'version':'1.8.0','version_code':180,'approved_base':'1.7.0','theme_file':'home-roomy.css','theme_sha256':sha(css.encode()),'changed_existing_frontend':changed,'added_frontend':added,'frontend_files':len(after),'mascot_frames_unchanged':True,'notice_transport_unchanged':True,'larger_home_tiles':True,'animated_home_helper':True,'existing_school_contacts_retained':True}
    (project/'family18-report.json').write_text(json.dumps(report,indent=2)+'\n')
    (project/'ABRIR_ESTA_VERSION_PRIMERO.txt').write_text('APPSCHOOLING FAMILIAS 1.8.0\n\nAbrir AppSchooling_AndroidStudio_1_8.\nInicio con tarjetas, iconos y letra más grandes; Manzanín animado bajo el panel claro, con su burbuja de ayuda y contactos oficiales. Conserva el degradado continuo, las funciones familiares, los avisos y la firma de actualización de 1.7.\n')
    print(json.dumps(report))

if __name__=='__main__':main()
