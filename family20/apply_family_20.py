#!/usr/bin/env python3
"""Build access and safe sizing on the approved 1.9 source without private credentials."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys


def digest(path): return hashlib.sha256(path.read_bytes()).hexdigest()
def replace_once(text, old, new, label):
    if new in text and old not in text: return text
    if text.count(old) != 1: raise ValueError('Unexpected source anchor: ' + label)
    return text.replace(old, new, 1)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--project', type=Path, required=True)
    parser.add_argument('--assets', type=Path, required=True)
    args = parser.parse_args()
    project, assets = args.project.resolve(), args.assets.resolve()
    www = project / 'app/src/main/assets/www'
    before = {p.relative_to(www).as_posix():digest(p) for p in www.rglob('*') if p.is_file()}
    subprocess.run([sys.executable, str(assets/'apply_fit20.py'), str(project)], check=True)
    subprocess.run([sys.executable, str(assets/'apply_access20.py'), str(project)], check=True)
    native = project/'app/src/main/java/com/ritmocasa/appdemo/MainActivity.java'
    text = native.read_text()
    old_viewport = "        web = new WebView(this);\n        setContentView(web);\n        if (Build.VERSION.SDK_INT >= 33) {\n            unregisterBackHandler = BackApi33.install(this, this::goBackInsideApp);\n        }\n        // Preserve the 1.1 APK's system-bar clearance on Android 15 and earlier devices.\n        web.setOnApplyWindowInsetsListener((view, insets) -> {\n            if (Build.VERSION.SDK_INT >= 30) {\n                android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.systemBars());\n                view.setPadding(bars.left, bars.top, bars.right, bars.bottom);\n            } else {\n                view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),\n                    insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());\n            }\n            return insets;\n        });\n        web.requestApplyInsets();\n"
    new_viewport = '        web = new WebView(this);\n        // Insets belong to a native parent, never to WebView padding: the web\n        // viewport must be the visible rectangle used by fixed CSS navigation.\n        FrameLayout safeRoot = new FrameLayout(this);\n        safeRoot.setBackgroundColor(0xfff7f8f3);\n        safeRoot.addView(web, new FrameLayout.LayoutParams(\n            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));\n        setContentView(safeRoot);\n        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);\n        if (Build.VERSION.SDK_INT >= 30) {\n            getWindow().setDecorFitsSystemWindows(false);\n        } else {\n            safeRoot.setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE\n                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN\n                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);\n        }\n        if (Build.VERSION.SDK_INT >= 33) {\n            unregisterBackHandler = BackApi33.install(this, this::goBackInsideApp);\n        }\n        safeRoot.setOnApplyWindowInsetsListener((view, insets) -> {\n            final int left, top, right, bottom;\n            if (Build.VERSION.SDK_INT >= 30) {\n                android.graphics.Insets bars = insets.getInsets(\n                    WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());\n                android.graphics.Insets keyboard = insets.getInsets(WindowInsets.Type.ime());\n                left = bars.left;\n                top = bars.top;\n                right = bars.right;\n                bottom = Math.max(bars.bottom, keyboard.bottom);\n            } else {\n                left = insets.getSystemWindowInsetLeft();\n                top = insets.getSystemWindowInsetTop();\n                right = insets.getSystemWindowInsetRight();\n                bottom = insets.getSystemWindowInsetBottom();\n            }\n            FrameLayout.LayoutParams bounds = (FrameLayout.LayoutParams) web.getLayoutParams();\n            if (bounds.leftMargin != left || bounds.topMargin != top\n                    || bounds.rightMargin != right || bounds.bottomMargin != bottom) {\n                bounds.setMargins(left, top, right, bottom);\n                web.setLayoutParams(bounds);\n            }\n            // The child is physically inside this safe rectangle. Consuming here\n            // prevents a second inset/padding from reducing the same area twice.\n            return Build.VERSION.SDK_INT >= 30 ? WindowInsets.CONSUMED\n                : insets.consumeSystemWindowInsets();\n        });\n        safeRoot.requestApplyInsets();\n'
    text = replace_once(text, old_viewport, new_viewport, 'native safe viewport')
    if 'import android.widget.FrameLayout;' not in text:
        text = replace_once(text, 'import android.view.WindowInsets;', 'import android.view.WindowInsets;\nimport android.view.View;\nimport android.view.ViewGroup;\nimport android.view.WindowManager;\nimport android.widget.FrameLayout;', 'native viewport imports')
    if 'cfg.setUseWideViewPort(true);' not in text:
        text = replace_once(text, '        cfg.setDomStorageEnabled(true);', '        cfg.setDomStorageEnabled(true);\n        cfg.setUseWideViewPort(true);\n        cfg.setLoadWithOverviewMode(false);\n        cfg.setTextZoom(100);', 'viewport and text zoom')
    text = text.replace('AppSchoolingAndroid/1.9','AppSchoolingAndroid/2.0').replace('index.html?build=19','index.html?build=20')
    native.write_text(text)
    for relative, replacements in {
      'app/build.gradle':[(r'\bversionCode\s+190\b','versionCode 200'),(r"\bversionName\s+['\"]1\.9\.0['\"]","versionName '2.0.0'")],
      'settings.gradle':[(r'AppSchooling_Manzanin_1_9','AppSchooling_Manzanin_2_0')]
    }.items():
        f=project/relative;s=f.read_text()
        for pattern,replacement in replacements:
            s=re.sub(pattern,replacement,s)
        f.write_text(s)
    app_path=www/'app.js';app=app_path.read_text().replace("const BUILD='1.9';", "const BUILD='2.0';")
    app_path.write_text(app)
    html=www/'index.html';index=html.read_text()
    index,n=re.subn(r'(<script data-source="app.js">)[\s\S]*?(</script>)',lambda m:m[1]+'\n'+app+'\n'+m[2],index,count=1)
    if n!=1:raise ValueError('Expected exactly one inline app.js')
    html.write_text(index)
    gradle=(project/'app/build.gradle').read_text()
    if not re.search(r'\bversionCode\s+200\b',gradle) or "versionName '2.0.0'" not in gradle:raise ValueError('Version bump did not apply')
    if 'firebase-auth' not in gradle:raise ValueError('Native Firebase authentication dependency missing')
    after={p.relative_to(www).as_posix():digest(p) for p in www.rglob('*') if p.is_file()}
    changed=sorted(k for k,v in before.items() if after.get(k)!=v)
    allowed={'app.js','index.html','access20.js','access20.css','fit20.css'}
    if set(changed)-allowed:raise ValueError('Unexpected existing resource changes')
    # Keep all of the reviewed character frames, sounds and original school artwork intact.
    if any(k.lower().endswith(('.png','.webp','.ttf','.mp3','.wav','.ogg')) for k in changed):raise ValueError('A reviewed media asset changed')
    report={'version':'2.0.0','version_code':200,'approved_base':'1.9.0','theme_file':'fit20.css','theme_sha256':digest(www/'fit20.css'),'changed_existing_frontend':changed,'added_frontend':sorted(set(after)-set(before)),'frontend_files':len(after),'native_auth':'FirebaseAuth; fresh schoolFamily administrator claim required','password_in_apk':False,'viewport':'Native parent consumes system, cutout and IME insets; WebView margins reduce actual viewport','mascot_frames_unchanged':True,'background_renderer_unchanged':True,'backend_access_account_setup_required':True}
    (project/'family20-report.json').write_text(json.dumps(report,indent=2)+'\n')
    (project/'ABRIR_ESTA_VERSION_PRIMERO.txt').write_text('APPSCHOOLING FAMILIAS 2.0.0\n\nAbrir AppSchooling_AndroidStudio_2_0.\nAcceso por correo y contraseña mediante Firebase. Cada cuenta necesita autorización schoolFamily del colegio. La APK no contiene contraseñas. Menú adaptado a la altura disponible y controles por encima de la navegación del celular. Misma firma y datos locales.\n')
    print(json.dumps(report))

if __name__=='__main__':main()
