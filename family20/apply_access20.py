#!/usr/bin/env python3
"""Integrate native school access without embedding account credentials in the app."""
from pathlib import Path
import re
import shutil
import sys

root = Path(sys.argv[1]).resolve()
here = Path(__file__).resolve().parent
www = root / 'app/src/main/assets/www'
native = root / 'app/src/main/java/com/ritmocasa/appdemo'
shutil.copyfile(here / 'SchoolAccess.java', native / 'SchoolAccess.java')
for name in ('access20.css', 'access20.js'):
    shutil.copyfile(here / name, www / name)

gradle = root / 'app/build.gradle'
text = gradle.read_text()
if "implementation 'com.google.firebase:firebase-auth'" not in text:
    text = text.replace("implementation 'com.google.firebase:firebase-messaging'", "implementation 'com.google.firebase:firebase-messaging'\n    implementation 'com.google.firebase:firebase-auth'")
gradle.write_text(text)

activity = native / 'MainActivity.java'
text = activity.read_text()
if 'private SchoolAccess schoolAccess;' not in text:
    text = text.replace('    private WebView web;', '    private WebView web;\n    private SchoolAccess schoolAccess;')
    text = text.replace('        super.onCreate(b);', '        super.onCreate(b);\n        schoolAccess = new SchoolAccess(this, this::onSchoolAccessChanged);')
    text = text.replace('                webReady = true;', '                webReady = true;\n                onSchoolAccessChanged();')
    text = text.replace('    public final class NativeBridge {', '''    private boolean hasSchoolAccess() {
        return schoolAccess != null && schoolAccess.authorized();
    }
    private void onSchoolAccessChanged() {
        if (schoolAccess == null) return;
        dispatch("appschooling:access-status", schoolAccess.status());
        if (hasSchoolAccess() && webReady) {
            web.evaluateJavascript("if(window.AppSchoolingAvisos){window.AppSchoolingAvisos.syncNative();}", null);
            deliverPendingNotice();
        }
    }

    public final class NativeBridge {
        @JavascriptInterface public String getAccessStatus() {
            return schoolAccess == null ? "{}" : schoolAccess.status().toString();
        }
        @JavascriptInterface public void signIn(String email, String password) {
            runOnUiThread(() -> { if (schoolAccess != null) schoolAccess.signIn(email, password); });
        }
        @JavascriptInterface public void signOut() {
            runOnUiThread(() -> { if (schoolAccess != null) schoolAccess.signOut(); });
        }''')
    text = text.replace('            return NoticeStore.all(MainActivity.this).toString();', '            return hasSchoolAccess() ? NoticeStore.all(MainActivity.this).toString() : "[]";')
    # Mutations must be checked natively, not only by hiding the JavaScript interface.
    methods = ['requestNoticePermission()', 'openNoticeSettings()', 'markNoticeRead(String id)',
               'markAllNoticesRead()', 'openNoticeLink(String id)', 'syncStudyReminders(String json)',
               'applyReminders(boolean enabled, String study, String water, String rest)',
               'testReminder()', 'exportJson(String content)']
    for method in methods:
        token = '@JavascriptInterface public void ' + method + ' {'
        assert token in text, method
        text = text.replace(token, token + '\n            if (!hasSchoolAccess()) return;')
    text = text.replace('                if (fileCallback != null) fileCallback.onReceiveValue(null);',
                        '                if (!hasSchoolAccess()) { callback.onReceiveValue(null); return true; }\n                if (fileCallback != null) fileCallback.onReceiveValue(null);', 1)
    text = text.replace('        super.onResume();', '        super.onResume();\n        if (schoolAccess != null) schoolAccess.restore();')
    text = text.replace('        if (!webReady || pendingNoticeId == null) return;', '        if (!hasSchoolAccess() || !webReady || pendingNoticeId == null) return;')
    text = text.replace('            JSONObject notice = NoticeStore.find(this, id);', '            if (!hasSchoolAccess()) return;\n            JSONObject notice = NoticeStore.find(this, id);')
    text = text.replace('        if (!webReady) return;\n        web.evaluateJavascript(', '        if (!webReady) return;\n        if (!hasSchoolAccess()) {\n            web.evaluateJavascript("if(window.AppSchoolingAccess){window.AppSchoolingAccess.back();}", null);\n            return;\n        }\n        web.evaluateJavascript(')
    text = text.replace('        NoticeRuntime.detach(this);', '        if (schoolAccess != null) schoolAccess.destroy();\n        NoticeRuntime.detach(this);')
text = text.replace('        if (hasSchoolAccess() && webReady) {',
                    '        if (hasSchoolAccess()) NoticeRuntime.initialize(this);\n        if (hasSchoolAccess() && webReady) {') if 'if (hasSchoolAccess()) NoticeRuntime.initialize(this);' not in text else text
activity.write_text(text)

# The notification topic and background renderer must honor the same native account approval.
runtime = native / 'NoticeRuntime.java'
value = runtime.read_text()
if 'static void suspend(Context c)' not in value:
    value = value.replace('if (configured(c) && optedIn(c) && NoticeNotifier.permissionGranted(c)) register(c);',
        'if (configured(c) && optedIn(c) && SchoolAccess.cachedFamilyAccess(c) && NoticeNotifier.permissionGranted(c)) register(c);')
    value = value.replace('if (registering || !optedIn(c) || !NoticeNotifier.permissionGranted(c) || !configured(c)) {',
        'if (registering || !SchoolAccess.cachedFamilyAccess(c) || !optedIn(c) || !NoticeNotifier.permissionGranted(c) || !configured(c)) {')
    value = value.replace('if (!optedIn(c) || !NoticeNotifier.permissionGranted(c)) {',
        'if (!SchoolAccess.cachedFamilyAccess(c) || !optedIn(c) || !NoticeNotifier.permissionGranted(c)) {')
    value = value.replace('if (!optedIn(c) || token == null || token.isEmpty()) return;',
        'if (!SchoolAccess.cachedFamilyAccess(c) || !optedIn(c) || token == null || token.isEmpty()) return;')
    value = value.replace('if (success && (!optedIn(c) || !NoticeNotifier.permissionGranted(c))) state = "inactive";',
        'if (success && (!SchoolAccess.cachedFamilyAccess(c) || !optedIn(c) || !NoticeNotifier.permissionGranted(c))) state = "inactive";')
    marker = '    private static boolean nonEmpty(String value)'
    assert marker in value
    value = value.replace(marker, '''    static void suspend(Context c) {
        setRegistration(c, "inactive");
        try { FirebaseMessaging.getInstance().unsubscribeFromTopic(PUBLIC_TOPIC); }
        catch (RuntimeException ignored) { }
        android.app.NotificationManager manager = (android.app.NotificationManager)
            c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) manager.cancelAll();
    }

''' + marker)
runtime.write_text(value)
service = native / 'NoticeMessagingService.java'
value = service.read_text().replace('if (!NoticeRuntime.optedIn(this)) return;',
    'if (!NoticeRuntime.optedIn(this) || !SchoolAccess.canReceiveNotice(this)) return;')
service.write_text(value)

appfile = www / 'app.js'
app = appfile.read_text()
if 'data-school-account-host' not in app:
    marker = '<section class="family16-family-settings">'
    assert marker in app
    app = app.replace(marker, marker + '${window.AppSchoolingAccess?`<div data-school-account-host>${window.AppSchoolingAccess.accountCard()}</div>`:\'\'}')
    app = app.replace('function changePage(x,remember=true){', 'function changePage(x,remember=true){\n if(window.AppSchoolingAccess && !window.AppSchoolingAccess.authorized())return;')
    marker = "setInterval(checkReminders,30000);render();"
    assert marker in app
    app = app.replace(marker, '''document.addEventListener('appschooling:access-locked',()=>{
 cleanupGames();stopMelody();exerciseStop();
 focus.running=false;focus.endsAt=null;clearInterval(timerHandle);timerHandle=null;
 modal='';familyHistory.length=0;page='inicio';
 window.AppSchoolingSchoolHelp?.close(false);
});
document.addEventListener('appschooling:access-ready',()=>{
 modal='';familyHistory.length=0;page='inicio';render();
});
''' + marker)
appfile.write_text(app)

indexfile = www / 'index.html'
index = indexfile.read_text()
index = re.sub(r'<style data-source="access20.css">[\s\S]*?</style>\s*', '', index)
index = re.sub(r'<script data-source="access20.js">[\s\S]*?</script>\s*', '', index)
index = index.replace('</head>', '<style data-source="access20.css">\n' + (www/'access20.css').read_text() + '\n</style>\n</head>')
marker = '<script data-manzanin-boot-guard>'
assert marker in index
index = index.replace(marker, '<script data-source="access20.js">\n' + (www/'access20.js').read_text() + '\n</script>\n' + marker, 1)
pattern = r'(<script data-source="app.js">)[\s\S]*?(</script>)'
index, count = re.subn(pattern, lambda m:m[1]+'\n'+app+'\n'+m[2], index, count=1)
assert count == 1
indexfile.write_text(index)
print('Integrated native Firebase school access and credential-free login UI.')
