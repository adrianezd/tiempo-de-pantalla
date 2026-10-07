# Tiempo de pantalla

Límites diarios por app, registro del tiempo de uso, historial y una pantalla de pausa que bloquea las apps.

Sitio: https://adrianezd.github.io/tiempo-de-pantalla/

Una web no puede leer el uso de otras apps ni cerrarlas. Por eso:

- Los minutos exactos se apuntan desde Tiempo de uso (iPhone) o Bienestar digital (Android).
- El bloqueo usa una automatización del móvil (Atajos en iPhone, MacroDroid en Android) que abre `?app=<id>` cada vez que se abre la app. Esa página cuenta la apertura, hace una pausa y, si se ha pasado el límite o la app está en bloqueo total, no deja seguir. Los minutos que uno se concede ahí se guardan como uso estimado.

Todo se guarda en localStorage (`tiempo-pantalla-v1`), con copia descargable en JSON.
