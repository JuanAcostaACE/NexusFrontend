# Nexus Hotel PMS · Frontend

Interfaz web del sistema de gestión hotelera multi-sede. Es una aplicación **estática** (HTML, CSS y JavaScript,
sin compilar), así que se publica directamente en **Vercel** o en cualquier hosting de archivos.

Consume la API REST del backend ([nexus-hotel-pms](https://github.com/JuanAcostaACE/nexus-hotel-pms)).

## Funciones (las mismas que el cliente de terminal)

| Área | Historias de usuario | Pantalla |
|---|---|---|
| Cliente (sin login) | HU-01 a HU-05 | Consultar disponibilidad, reservar, pagar con PSE, cancelar, descargar comprobante PDF |
| Recepción | HU-06 a HU-12 | Buscar reserva, check-in y No-Show, consumos, check-out, habitaciones en limpieza, factura |
| Administración | HU-13 a HU-17 | Sedes, usuarios y roles, inventario de habitaciones, catálogo de consumos, reportes |

## Ejecutar en local

No necesita instalación. Abre `index.html` o sirve la carpeta con cualquier servidor estático, por ejemplo:

```powershell
cd ruta\a\NexusFrontend
python -m http.server 5173
```

Luego entra a `http://localhost:5173`.

## Configurar el backend

La dirección del backend está en `js/config.js`. También se puede cambiar en el pie de página, campo **Servidor**
(se guarda en el navegador):

- Backend publicado: `https://nexus-hotel-pms-production.up.railway.app`
- Backend local: `http://localhost:8081`

El backend debe permitir el origen del frontend. En Railway, la variable `CORS_ORIGENES` debe incluir la URL de Vercel
(por ejemplo `https://nexus-frontend.vercel.app`). Para desarrollo local, `localhost` ya está permitido.

## Publicar en Vercel

1. En Vercel: *Add New → Project* → importa este repositorio.
2. *Framework Preset:* **Other**. *Build Command* y *Output Directory* vacíos.
3. *Deploy*. Al terminar, copia la URL y agrégala a `CORS_ORIGENES` en Railway.

## Estructura

```
index.html        Estructura de la página y carga de scripts
css/styles.css    Estilos (colores de la marca, tablas, estados, formularios)
js/config.js      Dirección del backend
js/api.js         Cliente HTTP: sesión, token, errores y renovación de sesión (X-Token-Renovado)
js/ui.js          Utilidades de pantalla: tablas, estados, mensajes, descarga de PDF
js/cliente.js     Pantallas del cliente (HU-01 a HU-05)
js/personal.js    Pantallas de recepción (HU-06 a HU-12) y administración (HU-13 a HU-17)
js/app.js         Enrutador, inicio de sesión y barra de navegación
```

## Seguridad

- El token de sesión se guarda en `sessionStorage`: se borra al cerrar la pestaña.
- La sesión caduca tras 15 minutos sin actividad (lo decide el backend); el frontend lo informa y pide volver a entrar.
- Las rutas de recepción y administración redirigen al inicio de sesión si no hay sesión, y cada rol ve solo su menú.
- El backend es quien aplica las reglas de acceso; el frontend solo oculta lo que no corresponde.
