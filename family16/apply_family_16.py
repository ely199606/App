#!/usr/bin/env python3
"""Apply compact family menus, the original school branding and Android Back."""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import shutil
import sys
import urllib.request

LOGO_URL='https://colegiovirtualdechile.cl/wp-content/uploads/2021/03/logo-21-png.png'
LOGO_SHA='8479074e42073e6c541be1d82fcadde49d4d37f499214dee8cf3caeef577d28e'

def digest(body):return hashlib.sha256(body).hexdigest()
def once(text,old,new,label):
    if text.count(old)!=1:raise ValueError(label+': expected one source anchor')
    return text.replace(old,new,1)
def inline(html,name,old,new):
    pattern=r'(<script\b[^>]*data-source="'+re.escape(name)+r'"[^>]*>)([\s\S]*?)(</script\s*>)'
    m=re.search(pattern,html,re.I)
    if not m or m.group(2).strip()!=old.strip():raise ValueError('Inline and external source differ: '+name)
    if re.search(r'</script',new,re.I):raise ValueError('Unsafe script source')
    return html[:m.start(2)]+'\n'+new.rstrip()+'\n'+html[m.end(2):]

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--project',type=Path,required=True)
    parser.add_argument('--assets',type=Path,required=True)
    args=parser.parse_args();project=args.project.resolve();assets=args.assets.resolve();www=project/'app/src/main/assets/www'
    logo=assets/'colegio-original.png'
    if not logo.exists():
        with urllib.request.urlopen(LOGO_URL,timeout=45) as response:logo.write_bytes(response.read())
    if digest(logo.read_bytes())!=LOGO_SHA:raise ValueError('The original school artwork differs from the reviewed image')
    before={p.relative_to(www).as_posix():digest(p.read_bytes()) for p in www.rglob('*') if p.is_file()}
    js=(www/'app.js').read_text();patched=once(js,"const BUILD='1.5';","const BUILD='1.6';",'app version')
    a=patched.index('function render(){');b=patched.index('\n openReferenceLinks();',a)
    shell='''function render(){document.documentElement.dataset.manzaninMotion='on';document.documentElement.dataset.appPage=page;document.documentElement.dataset.familyMode='familias';const p=current();const sections={avisos:()=>window.AppSchoolingAvisos.render(),inicio:()=>window.AppSchoolingMenu.home(),planner:familyPlanner,recursos:()=>window.AppSchoolingFamily.resources(p),estrategias:()=>window.AppSchoolingFamily.strategies(p),familia:()=>window.AppSchoolingFamily.orientation(p),calma:()=>window.AppSchoolingFamily.wellbeing(p),ajustes:familySettings,examenes:()=>window.AppSchoolingExamenes.render(p)};
 const header=window.AppSchoolingMenu.header(noticeBadge(),page);
 document.getElementById('app').innerHTML=`<div class="layout menu15-app family16-app ${page==='inicio'?'menu15-home family16-home':''}"><main class="main">${header}<div class="page-content">${(sections[page]||sections.inicio)()}</div></main>${bottomNav()}</div>${modal?modalContent():''}`;'''
    patched=patched[:a]+shell+patched[b:]
    a=patched.index('function changePage(x){');b=patched.index('\nfunction resetFocus()',a)
    patched=patched[:a]+(assets/'app_patch.js').read_text().rstrip()+'\n\n'+patched[b:]
    patched=once(patched,"if(a==='closeBg')","if(a==='appBack'){goBackInsideApp();return}if(a==='closeBg')",'visible Back control')
    patched=once(patched,'profiles:[baseProfile()],activeId:',"profiles:[{...baseProfile(),name:'Mi familia',tasks:[],goals:[],habits:[]}],activeId:",'new family plan')
    patched=once(patched,'syncStudyNative();\nwindow.AppSchoolingAvisos.init(',"state.settings.reminders=false;save();applyStoredDailyReminders();\nsyncStudyNative();\nwindow.AppSchoolingAvisos.init(",'disable old daily student reminders')
    html=(www/'index.html').read_text()
    html=inline(html,'app.js',js,patched)
    for name in ['examenes.js','avisos.js']:
        old=(www/name).read_text();new=(assets/name).read_text();html=inline(html,name,old,new);(www/name).write_text(new)
    (www/'app.js').write_text(patched)
    modules=['family-resources.js','family-menu.js']
    scripts=''
    for name in modules:
        content=(assets/name).read_text()
        if re.search(r'</script',content,re.I):raise ValueError('Unsafe inline module')
        (www/name).write_text(content);scripts+='<script data-source="'+name+'">\n'+content.rstrip()+'\n</script>\n'
    html=once(html,'<script data-source="app.js">',scripts+'<script data-source="app.js">','family modules')
    styles=['examenes-family.css','avisos-family.css','family-resources.css','family-theme.css'];style=''
    for name in styles:
        content=(assets/name).read_text()
        if re.search(r'</style',content,re.I):raise ValueError('Unsafe inline style')
        (www/name).write_text(content);style+='<style data-source="'+name+'">\n'+content.rstrip()+'\n</style>\n'
    html=once(html,'</head>',style+'</head>','family visual layer');(www/'index.html').write_text(html)
    shutil.copyfile(logo,www/'icons/colegio-original.png')
    sys.dont_write_bytecode=True
    spec=importlib.util.spec_from_file_location('family16_native_patch',assets/'native_patch.py');native=importlib.util.module_from_spec(spec);spec.loader.exec_module(native)
    native_report=native.apply(project,assets)
    edits={
        'app/build.gradle':[(r'\bversionCode\s+150\b','versionCode 160'),(r'''\bversionName\s+['"]1\.5\.0['"]''',"versionName '1.6.0'")],
        'settings.gradle':[(r'AppSchooling_Manzanin_1_5','AppSchooling_Manzanin_1_6')],
        'app/src/main/java/com/ritmocasa/appdemo/MainActivity.java':[(r'AppSchoolingAndroid/1\.5','AppSchoolingAndroid/1.6'),(r'index\.html\?build=15\b','index.html?build=16')],
    }
    for relative,replacements in edits.items():
        path=project/relative;text=path.read_text()
        for pattern,replacement in replacements:
            text,count=re.subn(pattern,replacement,text)
            if count!=1:raise ValueError('Unexpected version source: '+relative)
        path.write_text(text)
    after={p.relative_to(www).as_posix():digest(p.read_bytes()) for p in www.rglob('*') if p.is_file()}
    changed=sorted(k for k,v in before.items() if after.get(k)!=v);added=sorted(set(after)-set(before))
    if changed!=['app.js','avisos.js','examenes.js','index.html'] or len(added)!=7:raise ValueError('Unexpected frontend changes: '+str(changed)+' '+str(added))
    report={'version':'1.6.0','version_code':160,'approved_base':'1.5.0','theme_file':'family-theme.css','theme_sha256':digest((assets/'family-theme.css').read_bytes()),'changed_existing_frontend':changed,'added_frontend':added,'frontend_files':len(after),'mascot_frames_unchanged':True,'profile_storage_and_package_unchanged':True,'notice_transport_and_storage_unchanged':True,'removed_visible_features':['pomodoro','games','water-tracking'],'family_planner_retained':True,'resources':['study-strategies','family-orientation'],'obsolete_daily_student_reminders_disabled':True,**native_report}
    (project/'family16-report.json').write_text(json.dumps(report,indent=2)+'\n')
    shutil.copyfile(assets/'mineduc-sources.json',project/'qa/mineduc-family16-sources.json')
    (project/'ABRIR_ESTA_VERSION_PRIMERO.txt').write_text('APPSCHOOLING · COLEGIO VIRTUAL DE CHILE — FAMILIAS 1.6.0\n\nAbrir AppSchooling_AndroidStudio_1_6 en Android Studio.\nMenús celestes, logo original del colegio en blanco mediante CSS sin deformar la imagen, exámenes y estrategias agrupados en desplegables.\nSe mantienen avisos, planner familiar, bienestar y orientaciones. Se ocultan juegos, Pomodoro y registro de agua.\nAtrás vuelve dentro de la app, sin cerrarla al regresar al inicio. Las notificaciones nuevas y el icono Android usan el logo original del colegio.\nMisma firma e identidad de actualización. Este ZIP es código fuente.\n')
    print(json.dumps(report))

if __name__=='__main__':main()
