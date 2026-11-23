#!/usr/bin/env python3
"""Refine the continuous background, school help, and optional study timer."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import xml.etree.ElementTree as ET

def digest(b):return hashlib.sha256(b).hexdigest()
def once(s,a,b,label):
    if s.count(a)!=1:raise ValueError('Unexpected source anchor: '+label)
    return s.replace(a,b,1)
def inline(html,name,old,new):
    m=re.search(r'(<script\b[^>]*data-source="'+re.escape(name)+r'"[^>]*>)([\s\S]*?)(</script\s*>)',html,re.I)
    if not m or m.group(2).strip()!=old.strip():raise ValueError('Inline source mismatch: '+name)
    return html[:m.start(2)]+'\n'+new.rstrip()+'\n'+html[m.end(2):]

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--project',type=Path,required=True);p.add_argument('--theme',type=Path,required=True);a=p.parse_args()
    root=a.project.resolve();www=root/'app/src/main/assets/www';assets=a.theme.parent
    before={f.relative_to(www).as_posix():digest(f.read_bytes()) for f in www.rglob('*') if f.is_file()}
    html=(www/'index.html').read_text();old=(www/'app.js').read_text();js=once(old,"const BUILD='1.6';","const BUILD='1.7';",'version')
    js=once(js,'function goBackInsideApp(){','function goBackInsideApp(){\n if(window.AppSchoolingSchoolHelp?.isOpen()){window.AppSchoolingSchoolHelp.close();return true;}', 'close contact dialog first')
    js=once(js,'function changePage(x,remember=true){','function changePage(x,remember=true){\n window.AppSchoolingSchoolHelp?.close(false);', 'close contact dialog on navigation')
    js=once(js,'estrategias:()=>window.AppSchoolingFamily.strategies(p),','estrategias:()=>window.AppSchoolingFamily.strategies(p)+familyStudyTimer(),','optional timer route')
    add='''let familyPomodoroOpen=false;
document.addEventListener('toggle',ev=>{if(ev.target.matches?.('[data-family-pomodoro]')&&ev.target.isConnected)familyPomodoroOpen=ev.target.open;},true);
function familyStudyTimer(){return `<details class="family17-pomodoro" name="family16-study-groups" data-family-pomodoro ${familyPomodoroOpen?'open':''}><summary>Método Pomodoro</summary><div class="family17-pomodoro-content"><p>Si a tu hijo/a le sirve trabajar por tramos, pueden acordar un tiempo breve de concentración y después una pausa. Ajusten los minutos según lo que necesite.</p>${focusPage()}</div></details>`;}
'''
    js=once(js,'function familyPlanner(){',add+'function familyPlanner(){','optional timer renderer')
    html=inline(html,'app.js',old,js);(www/'app.js').write_text(js)
    old=(www/'family-resources.js').read_text();start=old.index('  function helper(');end=old.index('  function strategy(',start)
    new=old[:start]+'''  function helper(profile={},title='',helpText='') {
    return `<div class="family16-heading"><h1 class="page-title">${escape(title)}</h1>${window.AppSchoolingSchoolHelp.button(profile,76)}</div>`;
  }
'''+old[end:]
    html=inline(html,'family-resources.js',old,new);(www/'family-resources.js').write_text(new)
    old=(www/'examenes.js').read_text();start=old.index('  function helper(');end=old.index('  function option(',start)
    new=old[:start]+"  function helper(profile) { return window.AppSchoolingSchoolHelp.button(profile,82); }\n"+old[end:]
    html=inline(html,'examenes.js',old,new);(www/'examenes.js').write_text(new)
    old=(www/'avisos.js').read_text()
    target='`<div class="card notice-empty"><span class="notice-empty-icon">${bell}</span><h2>${empty}</h2><p>Los mensajes que recibas aparecerán aquí para que puedas volver a consultarlos.</p></div>`'
    new=once(old,target,'(!items.length ? window.AppSchoolingNoticeEmpty.render() : '+target+')','empty inbox companion')
    html=inline(html,'avisos.js',old,new);(www/'avisos.js').write_text(new)
    empty_module=(assets/'notice-empty.js').read_text();(www/'notice-empty.js').write_text(empty_module)
    html=once(html,'<script data-source="app.js">','<script data-source="notice-empty.js">\n'+empty_module.rstrip()+'\n</script>\n<script data-source="app.js">','empty inbox module')
    module=(assets/'school-help.js').read_text();css=a.theme.read_text()
    if re.search(r'</script',module,re.I) or re.search(r'</style',css,re.I):raise ValueError('Unsafe inline content')
    html=once(html,'<script data-source="app.js">','<script data-source="school-help.js">\n'+module.rstrip()+'\n</script>\n<script data-source="app.js">','school help module')
    html=once(html,'</head>','<style data-source="family-motion.css">\n'+css.rstrip()+'\n</style>\n</head>','final motion layer')
    (www/'school-help.js').write_text(module);(www/'family-motion.css').write_text(css);(www/'index.html').write_text(html)
    for rel,changes in {
      'app/build.gradle':[(r'\bversionCode\s+160\b','versionCode 170'),(r'''\bversionName\s+['"]1\.6\.0['"]''',"versionName '1.7.0'")],
      'settings.gradle':[(r'AppSchooling_Manzanin_1_6','AppSchooling_Manzanin_1_7')],
      'app/src/main/java/com/ritmocasa/appdemo/MainActivity.java':[(r'AppSchoolingAndroid/1\.6','AppSchoolingAndroid/1.7'),(r'index\.html\?build=16\b','index.html?build=17')]
    }.items():
      file=root/rel;text=file.read_text()
      for pattern,replacement in changes:
        text,n=re.subn(pattern,replacement,text)
        if n!=1:raise ValueError('Unexpected version source '+rel)
      file.write_text(text)
    file=root/'app/src/main/java/com/ritmocasa/appdemo/MainActivity.java';text=file.read_text()
    text=once(text,'                    || "www.mineduc.cl".equalsIgnoreCase(host))','                    || "www.mineduc.cl".equalsIgnoreCase(host)\n                    || "colegiovirtualdechile.cl".equalsIgnoreCase(host)\n                    || "www.colegiovirtualdechile.cl".equalsIgnoreCase(host))','official school website')
    text=once(text,'                || "tel:+56223536750".equals(uri.toString()))','                || "tel:+56223536750".equals(uri.toString())\n                || "tel:6006560060".equals(uri.toString()))','school phone dialer')
    file.write_text(text)
    foreground=root/'app/src/main/res/drawable/ic_foreground.xml';shutil.copyfile(assets/'launcher-foreground.xml',foreground);ET.parse(foreground)
    after={f.relative_to(www).as_posix():digest(f.read_bytes()) for f in www.rglob('*') if f.is_file()}
    changed=sorted(k for k,v in before.items() if after.get(k)!=v);added=sorted(set(after)-set(before))
    if changed!=['app.js','avisos.js','examenes.js','family-resources.js','index.html'] or added!=['family-motion.css','notice-empty.js','school-help.js']:raise ValueError('Unexpected resource modifications')
    report={'version':'1.7.0','version_code':170,'approved_base':'1.6.0','theme_file':'family-motion.css','theme_sha256':digest(css.encode()),'changed_existing_frontend':changed,'added_frontend':added,'frontend_files':len(after),'mascot_frames_unchanged':True,'notice_transport_unchanged':True,'continuous_gradient':True,'light_home_panel':True,'school_help_contacts':['https://colegiovirtualdechile.cl/','tel:6006560060'],'launcher_symbol_only':True,'launcher_border':'blue','pomodoro':'optional collapsed study strategy'}
    (root/'family17-report.json').write_text(json.dumps(report,indent=2)+'\n')
    (root/'ABRIR_ESTA_VERSION_PRIMERO.txt').write_text('APPSCHOOLING FAMILIAS 1.7.0\n\nAbrir AppSchooling_AndroidStudio_1_7.\nPanel claro para las tarjetas; un solo degradado continuo con movimiento visible y suave. Ayuda de Manzanín con web y teléfono oficiales del colegio. Método Pomodoro opcional y desplegable dentro de Estrategias. Icono con símbolo del colegio y borde azul. Misma firma e identidad Android.\n')
    print(json.dumps(report))

if __name__=='__main__':main()
