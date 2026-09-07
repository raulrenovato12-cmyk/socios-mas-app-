# Socios Más — App de Microfinanzas v1

Primera versión funcional sin servidor. Guarda datos en el navegador mediante `localStorage`.

## Incluye
- Clientes
- Créditos de 29 pagos
- Esquemas configurables por cada $1,000
- Separación de capital y utilidad: capital primero o proporcional
- Registro de pagos
- Renovaciones permitidas desde el pago 18
- Cálculo de saldo anterior y desembolso neto de renovación
- Gastos administrativos y operativos
- Dashboard
- Reporte consolidado
- Exportación CSV
- Diseño adaptable a teléfono

## Cómo abrir
Abre `index.html` en un navegador moderno.

Para instalar como PWA, sirve esta carpeta desde un servidor web local o hosting HTTPS.

## Importante
Esta versión es un MVP local. Antes de usarla con datos reales conviene agregar:
- Base de datos en la nube
- Inicio de sesión y roles
- Copias de seguridad
- Auditoría de cambios
- Validaciones contables adicionales
- Exportación PDF/Excel
- Cifrado y políticas de privacidad


## Usuarios iniciales

- Raúl Renovato — Administrador
- Francisco Lamas — Gerente

Cada movimiento nuevo guarda el usuario activo que lo registró. En esta versión local se puede cambiar de usuario desde la parte superior de la app.


## Acceso por PIN y permisos

Usuarios iniciales:
- Raúl Renovato — Administrador — PIN inicial 1111
- Francisco Lamas — Gerente — PIN inicial 2222

Permisos:
- Administrador: acceso completo, incluido restablecimiento de la app.
- Gerente: clientes, créditos, pagos, renovaciones, gastos y reportes; no puede restablecer la app.

Cada movimiento financiero conserva el ID del usuario que lo registró.

> Nota: estos PIN son únicamente para esta versión local de demostración. Para producción deben reemplazarse por autenticación segura con contraseñas cifradas y backend.


## Versión 4

Se agregaron:
- Respaldo completo en JSON.
- Restauración de respaldo.
- Auditoría visual de los últimos 100 movimientos.
- Cambio de PIN por Administrador.
- PWA instalable y funcionamiento sin conexión mediante Service Worker.
- Proyecto Android Studio en la carpeta `android/`.

### Android
Abra la carpeta `android/` con Android Studio, permita que sincronice Gradle y use **Build > Build APK(s)**.

El entorno donde se generó este paquete no incluye Android SDK, por lo que el APK no se pudo compilar aquí. El código Android ya está preparado como contenedor WebView de la aplicación.

### Seguridad
Los PIN locales sirven para control interno básico. Para uso de producción con datos reales se recomienda migrar autenticación y base de datos a un backend seguro.


## Versión 5 — Nube compartida

Esta versión se conecta al proyecto Supabase de Socios Más mediante la Edge Function `socios-mas-api`.

Características:
- Base de datos compartida entre teléfonos.
- Inicio de sesión con sesión temporal.
- Activación inicial de PIN: la primera vez solicita un PIN para Raúl Renovato y Francisco Lamas.
- Los PIN se almacenan cifrados en el servidor.
- Clientes, créditos, cuotas, pagos, renovaciones, gastos y movimientos se guardan en Supabase.
- Renovación habilitada desde el pago 18 completo.
- Exportación CSV y respaldo JSON.
- Cambio de PIN desde la app.
- Proyecto Android Studio actualizado a versión 1.0.5.

Importante:
- La activación inicial debe realizarse una sola vez apenas se abra la app por primera vez.
- No compartas los PIN.
- Para operación financiera crítica todavía conviene añadir transacciones atómicas del lado del servidor, recuperación de acceso y copias de seguridad automáticas.


## Versión 6 — cartera migrada visible

- Conexión directa con la base compartida de Supabase.
- Indicador visible de estado de nube.
- Botón de actualización manual.
- Sincronización automática al volver a la app.
- Resumen de cartera con corte histórico migrado 04/09/2026.
- Caja migrada, saldo contractual y capital real pendiente visibles desde el dashboard.
- Proyecto Android Studio actualizado a 1.0.6.


## Codemagic

Esta copia incluye `codemagic.yaml` para compilar `app-debug.apk` en Codemagic.
Consulta `INSTRUCCIONES_CODEMAGIC.md` para el proceso desde un teléfono.
