"""Native school branding and Back navigation for the family-facing 1.6 app.

The supplied school PNG is copied without modifying its pixels. Android lays out
that asset with its original aspect ratio for launcher and notification artwork.
"""
import hashlib
from pathlib import Path
import shutil
import xml.etree.ElementTree as ET

LOGO_SHA256 = '8479074e42073e6c541be1d82fcadde49d4d37f499214dee8cf3caeef577d28e'


def _once(text, old, new, label):
    if text.count(old) != 1:
        raise ValueError(label + ': expected one approved source anchor')
    return text.replace(old, new, 1)


SCHOOL_BRAND_JAVA = '''package com.ritmocasa.appdemo;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.RectF;

/** Lays out the original school logo without redrawing or distorting its artwork. */
final class SchoolBrand {
    private SchoolBrand() {}

    static Bitmap largeIcon(Context context) {
        Bitmap source = BitmapFactory.decodeResource(context.getResources(), R.drawable.colegio_logo);
        final int size = 256;
        final float padding = 20f;
        Bitmap result = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(result);
        canvas.drawColor(Color.WHITE);
        if (source != null && source.getWidth() > 0 && source.getHeight() > 0) {
            float scale = Math.min((size - 2 * padding) / source.getWidth(),
                    (size - 2 * padding) / source.getHeight());
            float width = source.getWidth() * scale;
            float height = source.getHeight() * scale;
            RectF target = new RectF((size - width) / 2f, (size - height) / 2f,
                    (size + width) / 2f, (size + height) / 2f);
            Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.FILTER_BITMAP_FLAG);
            canvas.drawBitmap(source, null, target, paint);
        }
        return result;
    }
}
'''


BACK_METHODS_JAVA = '''    /** Android Back stays inside the local app, including at its home screen. */
    @Override public void onBackPressed(){
        goBackInsideApp();
    }

    private void goBackInsideApp() {
        if (web == null) return;
        // Preserve keyboard-first Back behavior while a family edits a form.
        if (Build.VERSION.SDK_INT >= 30) {
            WindowInsets insets = web.getRootWindowInsets();
            if (insets != null && insets.isVisible(WindowInsets.Type.ime())) {
                android.view.WindowInsetsController controller = web.getWindowInsetsController();
                if (controller != null) {
                    controller.hide(WindowInsets.Type.ime());
                    return;
                }
            }
        } else {
            android.graphics.Rect visible = new android.graphics.Rect();
            web.getWindowVisibleDisplayFrame(visible);
            int rootHeight = web.getRootView().getHeight();
            if (rootHeight > 0 && rootHeight - visible.bottom > rootHeight / 5) {
                android.view.inputmethod.InputMethodManager keyboard =
                    (android.view.inputmethod.InputMethodManager) getSystemService(INPUT_METHOD_SERVICE);
                if (keyboard != null && keyboard.hideSoftInputFromWindow(web.getWindowToken(), 0)) return;
            }
        }
        if (!webReady) return;
        web.evaluateJavascript("(function(){try{if(window.AppSchoolingNavigation && "
                + "typeof window.AppSchoolingNavigation.back==='function'){"
                + "return window.AppSchoolingNavigation.back();}}catch(ignored){}return true;})()", null);
    }

    /** Kept in a nested class so Android 8-12 never load API 33 window classes. */
    private static final class BackApi33 {
        static Runnable install(Activity owner, Runnable action) {
            android.window.OnBackInvokedCallback callback = action::run;
            owner.getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                    android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT, callback);
            return () -> owner.getOnBackInvokedDispatcher().unregisterOnBackInvokedCallback(callback);
        }
    }
'''


FOREGROUND_XML = '''<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <!-- 1600:989 original artwork, contained within the adaptive-icon safe zone. -->
    <item android:width="64dp" android:height="39.56dp" android:gravity="center">
        <bitmap android:src="@drawable/colegio_logo" android:gravity="fill" />
    </item>
</layer-list>
'''


def apply(project, assets):
    project, assets = Path(project), Path(assets)
    java = project / 'app/src/main/java/com/ritmocasa/appdemo'
    res = project / 'app/src/main/res'
    logo = assets / 'colegio-original.png'
    if hashlib.sha256(logo.read_bytes()).hexdigest() != LOGO_SHA256:
        raise ValueError('School logo differs from the original reviewed artwork')
    (res / 'drawable-nodpi').mkdir(parents=True, exist_ok=True)
    shutil.copyfile(logo, res / 'drawable-nodpi/colegio_logo.png')
    (java / 'SchoolBrand.java').write_text(SCHOOL_BRAND_JAVA)

    notifier = java / 'NoticeNotifier.java'
    text = notifier.read_text()
    text = _once(text, '.setSmallIcon(R.drawable.ic_stat_leaf).setContentTitle(notice.title).setContentText(notice.body)',
                 '.setSmallIcon(R.drawable.colegio_logo).setLargeIcon(SchoolBrand.largeIcon(c))\n'
                 '            .setContentTitle(notice.title).setContentText(notice.body)', 'notice branding')
    notifier.write_text(text)

    activity = java / 'MainActivity.java'
    text = activity.read_text()
    text = _once(text, '    private String pendingNoticeId;\n',
                 '    private String pendingNoticeId;\n    private Runnable unregisterBackHandler;\n', 'Back callback field')
    text = _once(text, '        setContentView(web);\n',
                 '        setContentView(web);\n'
                 '        if (Build.VERSION.SDK_INT >= 33) {\n'
                 '            unregisterBackHandler = BackApi33.install(this, this::goBackInsideApp);\n'
                 '        }\n', 'register Android Back callback')
    text = _once(text, '                    || "epja.mineduc.cl".equalsIgnoreCase(host))',
                 '                    || "epja.mineduc.cl".equalsIgnoreCase(host)\n'
                 '                    || "mineduc.cl".equalsIgnoreCase(host)\n'
                 '                    || "www.mineduc.cl".equalsIgnoreCase(host))', 'official Mineduc navigation')
    text = _once(text, '    @Override public void onBackPressed(){\n'
                 '        // Single-page app. Android Back closes the keyboard first when present.\n'
                 '        super.onBackPressed();\n    }\n', BACK_METHODS_JAVA, 'replace activity exit behavior')
    text = _once(text, '    @Override protected void onDestroy(){\n',
                 '    @Override protected void onDestroy(){\n'
                 '        if (unregisterBackHandler != null) {\n'
                 '            unregisterBackHandler.run();\n'
                 '            unregisterBackHandler = null;\n'
                 '        }\n', 'unregister Android Back callback')
    activity.write_text(text)

    manifest = project / 'app/src/main/AndroidManifest.xml'
    text = manifest.read_text()
    text = _once(text, '        android:label="AppSchooling Manzanín"',
                 '        android:label="Colegio Virtual de Chile"\n'
                 '        android:enableOnBackInvokedCallback="true"', 'school application identity and modern Back')
    text = _once(text, 'android:resource="@drawable/ic_stat_leaf"',
                 'android:resource="@drawable/colegio_logo"', 'Firebase notification icon fallback')
    manifest.write_text(text)

    (res / 'drawable/ic_foreground.xml').write_text(FOREGROUND_XML)
    colors = res / 'values/colors.xml'
    colors.write_text(_once(colors.read_text(), '<color name="icon_background">#FFF1D7</color>',
                            '<color name="icon_background">#FFFFFF</color>', 'launcher background'))
    for path in [manifest, res / 'drawable/ic_foreground.xml', colors]:
        ET.parse(path)
    if (res / 'drawable-nodpi/colegio_logo.png').read_bytes() != logo.read_bytes():
        raise ValueError('The original logo was altered during resource copying')
    return {
        'logo_original_sha256': LOGO_SHA256,
        'logo_pixels_unchanged': True,
        'notification_small_icon': 'colegio_logo',
        'notification_large_icon': 'SchoolBrand.largeIcon',
        'launcher_uses_school_logo': True,
        'android_back_stays_in_app': True,
        'android_back_api33_callback': True,
        'official_mineduc_domains_allowed': ['mineduc.cl', 'www.mineduc.cl'],
        'changed_native_files': [
            'app/src/main/AndroidManifest.xml',
            'app/src/main/java/com/ritmocasa/appdemo/MainActivity.java',
            'app/src/main/java/com/ritmocasa/appdemo/NoticeNotifier.java',
            'app/src/main/res/drawable/ic_foreground.xml',
            'app/src/main/res/values/colors.xml',
        ],
        'added_native_files': [
            'app/src/main/java/com/ritmocasa/appdemo/SchoolBrand.java',
            'app/src/main/res/drawable-nodpi/colegio_logo.png',
        ],
    }
