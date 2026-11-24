package com.ritmocasa.appdemo;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseNetworkException;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseUser;
import org.json.JSONObject;
import java.util.Locale;
import java.util.concurrent.TimeUnit;
import com.google.android.gms.tasks.Tasks;

/** Firebase owns passwords and session tokens; only an administrator may grant schoolFamily. */
final class SchoolAccess {
    interface Listener { void onAccessChanged(); }
    private final Context context;
    private final Listener listener;
    private final Handler main = new Handler(Looper.getMainLooper());
    private FirebaseAuth auth;
    private volatile boolean authorized;
    private volatile boolean busy;
    private volatile String error = "";
    private volatile String email = "";
    private int generation;
    private boolean destroyed;
    private long verifiedAt;
    private static final String ACCESS_PREF = "school_access_v20";

    /** Only a claim previously verified by Firebase for this exact user can enable registration. */
    static boolean cachedFamilyAccess(Context context) {
        try {
            FirebaseApp.initializeApp(context.getApplicationContext());
            FirebaseUser user = FirebaseAuth.getInstance().getCurrentUser();
            return user != null && user.getUid().equals(context.getSharedPreferences(ACCESS_PREF,
                Context.MODE_PRIVATE).getString("approvedUid", ""));
        } catch (RuntimeException unavailable) { return false; }
    }

    /** Called only on the Firebase Messaging background thread, never on the main thread. */
    static boolean canReceiveNotice(Context context) {
        if (!cachedFamilyAccess(context)) return false;
        try {
            FirebaseUser user = FirebaseAuth.getInstance().getCurrentUser();
            if (user == null) return false;
            return Boolean.TRUE.equals(Tasks.await(user.getIdToken(false), 8, TimeUnit.SECONDS)
                .getClaims().get("schoolFamily"));
        } catch (Exception unavailable) { return false; }
    }

    private void clearApproval() {
        context.getSharedPreferences(ACCESS_PREF, Context.MODE_PRIVATE).edit().remove("approvedUid").apply();
        NoticeRuntime.suspend(context);
    }

    SchoolAccess(Context context, Listener listener) {
        this.context = context.getApplicationContext();
        this.listener = listener;
        try {
            FirebaseApp.initializeApp(this.context);
            auth = FirebaseAuth.getInstance();
        } catch (RuntimeException unavailable) {
            error = "El acceso del colegio todavía no está disponible. Comunícate con el colegio.";
        }
    }

    boolean authorized() { return authorized && auth != null && auth.getCurrentUser() != null; }

    synchronized JSONObject status() {
        JSONObject result = new JSONObject();
        try {
            result.put("configured", auth != null).put("authorized", authorized())
                .put("busy", busy).put("error", error).put("email", authorized() ? email : "");
        } catch (org.json.JSONException ignored) { }
        return result;
    }

    void restore() {
        if (destroyed || busy || auth == null) return;
        FirebaseUser user = auth.getCurrentUser();
        if (user == null) { authorized = false; clearApproval(); notifyChange(); return; }
        // Dialogs, dialer and file picker returns must not reset the family's current page.
        // Cold launches always start locked; a live session is rechecked after one minute.
        if (authorized && SystemClock.elapsedRealtime() - verifiedAt < 60_000L) return;
        busy = true;
        error = "";
        int operation = ++generation;
        notifyChange();
        verify(user, operation);
    }

    void signIn(String rawEmail, String password) {
        if (destroyed || busy || auth == null) return;
        String normalized = rawEmail == null ? "" : rawEmail.trim().toLowerCase(Locale.ROOT);
        if (normalized.length() > 254 || !android.util.Patterns.EMAIL_ADDRESS.matcher(normalized).matches()
                || password == null || password.isEmpty() || password.length() > 4096) {
            error = "Escribe tu correo y contraseña para ingresar.";
            notifyChange();
            return;
        }
        busy = true;
        authorized = false;
        error = "";
        int operation = ++generation;
        notifyChange();
        auth.signInWithEmailAndPassword(normalized, password).addOnCompleteListener(task -> {
            if (!current(operation)) return;
            if (!task.isSuccessful() || task.getResult() == null || task.getResult().getUser() == null) {
                fail(operation, task.getException());
                return;
            }
            verify(task.getResult().getUser(), operation);
        });
    }

    private void verify(FirebaseUser user, int operation) {
        // reload rejects a disabled/deleted account; forced refresh checks current administrator claims.
        user.reload().addOnCompleteListener(reloaded -> {
            if (!current(operation)) return;
            if (!reloaded.isSuccessful()) { fail(operation, reloaded.getException()); return; }
            user.getIdToken(true).addOnCompleteListener(token -> {
                if (!current(operation)) return;
                if (!token.isSuccessful() || token.getResult() == null) {
                    fail(operation, token.getException());
                    return;
                }
                if (!Boolean.TRUE.equals(token.getResult().getClaims().get("schoolFamily"))) {
                    auth.signOut();
                    clearApproval();
                    authorized = false;
                    busy = false;
                    error = "Este correo todavía no tiene acceso. Solicita al colegio que lo autorice.";
                    notifyChange();
                    return;
                }
                email = user.getEmail() == null ? "" : user.getEmail();
                context.getSharedPreferences(ACCESS_PREF, Context.MODE_PRIVATE).edit()
                    .putString("approvedUid", user.getUid()).apply();
                authorized = true;
                verifiedAt = SystemClock.elapsedRealtime();
                busy = false;
                error = "";
                notifyChange();
            });
        });
    }

    private boolean current(int operation) { return !destroyed && operation == generation; }

    private void fail(int operation, Exception failure) {
        if (!current(operation)) return;
        authorized = false;
        busy = false;
        clearApproval();
        if (failure instanceof FirebaseNetworkException) {
            error = "No pudimos verificar tu acceso. Revisa tu conexión e intenta nuevamente.";
        } else {
            String code = failure instanceof FirebaseAuthException
                ? ((FirebaseAuthException) failure).getErrorCode() : "";
            if ("ERROR_TOO_MANY_REQUESTS".equals(code)) {
                error = "Hubo varios intentos. Espera un momento y vuelve a ingresar.";
            } else if ("ERROR_OPERATION_NOT_ALLOWED".equals(code)) {
                error = "El colegio está preparando el acceso. Comunícate con el colegio.";
            } else {
                if (auth != null) auth.signOut();
                error = "No pudimos ingresar. Revisa tus datos o consulta al colegio por tu acceso.";
            }
        }
        notifyChange();
    }

    void signOut() {
        ++generation;
        authorized = false;
        busy = false;
        email = "";
        error = "";
        if (auth != null) auth.signOut();
        clearApproval();
        notifyChange();
    }

    void destroy() { destroyed = true; ++generation; }

    private void notifyChange() {
        main.post(() -> { if (!destroyed) listener.onAccessChanged(); });
    }
}
