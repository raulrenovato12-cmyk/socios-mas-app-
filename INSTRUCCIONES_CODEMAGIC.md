# Socios Más — compilación del APK desde el teléfono

Este paquete ya incluye `codemagic.yaml` para compilar el proyecto Android en la nube.

## Camino recomendado

1. Crea o entra a una cuenta de GitHub desde el navegador del teléfono.
2. Crea un repositorio nuevo, por ejemplo `socios-mas-app`.
3. Sube **el contenido de esta carpeta** al repositorio. `codemagic.yaml` debe quedar en la raíz.
4. Entra a Codemagic y crea/inicia sesión en tu cuenta.
5. Pulsa **Add application**.
6. Elige **GitHub**, autoriza Codemagic y selecciona el repositorio `socios-mas-app`.
7. Codemagic leerá `codemagic.yaml`.
8. Ejecuta el workflow **Socios Mas Android APK**.
9. Cuando termine correctamente, abre **Artifacts** y descarga el archivo `.apk`.
10. En Android, permite temporalmente la instalación de aplicaciones desde el navegador/gestor de archivos que uses y abre el APK.

## Datos técnicos preparados

- App: Socios Más
- Package: `com.sociosmas.microfinanzas`
- Android Gradle Plugin: 8.5.2
- Gradle usado en Codemagic: 8.7
- compileSdk: 34
- targetSdk: 34
- minSdk: 24
- Versión: 1.0.6
- Salida esperada: `android/app/build/outputs/apk/debug/app-debug.apk`

## Importante

Este flujo genera un APK de prueba (`debug`) para instalarlo directamente en tu teléfono.
No es todavía una versión firmada para Google Play.

La app sigue conectada al backend de Socios Más en Supabase. La cartera ya migrada no está dentro del APK como una copia local; la aplicación la consulta desde la nube después de iniciar sesión.
