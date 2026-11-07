# Manzanín

La versión 1.3 recupera el diseño de https://soft-cocada-de54ce.netlify.app/: fondo crema, tipografía Atkinson y cuatro secciones principales. Conserva la bandeja nativa **Mis avisos**, añade un Aventurero con dibujos propios y reproduce correr y bailar con más calma.

El proyecto base ZIP de la raíz se utiliza para conservar Android y Firebase. El workflow **Restaurar Manzanin y compilar APK 1.3** sustituye su interfaz por la referencia completa, verifica los hashes fijados en `ci/reference-inventory.json`, aplica los cambios y ejecuta pruebas con Chromium antes de compilar.

- Build verificado: https://github.com/ely199606/App/actions/runs/42398430831
- Java 17, Gradle 8.9, Android SDK 35 y Build Tools 35.0.0.
- Los artifacts incluyen capturas, informe de navegador, APK sin firmar y respaldo fuente. APK y respaldo se dividen en partes de 20 MiB; los metadatos explican su reconstrucción y contienen sus SHA256.
- El APK instalable se firma aparte, con la misma clave de la versión 1.2. La clave privada no está en este repositorio ni en Actions.

Los perfiles permanecen en el dispositivo. La recepción de avisos usa Firebase Cloud Messaging con activación opcional. Las pruebas en Chromium simulan el puente Android; la entrega FCM requiere comprobación en un teléfono.

El registro de apoderados, varios hijos con sus cursos y los envíos por nivel corresponden a la siguiente etapa de plataforma y base de datos. Esta versión aún no implementa esa diferenciación.
