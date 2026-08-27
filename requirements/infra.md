# infra.md — Infraestructura y Deploy

Requisito no negociable: **el proyecto tiene que ser 100% gratuito para operar**, sin tarjeta de
crédito cargada en ningún servicio. Cualquier decisión de infraestructura debe respetar esto.

---

## 1. Estructura del repositorio

Un único repositorio (monorepo simple, sin herramientas como Turborepo/Nx):

```
RetroRetro/        ← repo en GitHub: RetroRetro
├── front/          ← Vite + React
│   ├── src/
│   ├── package.json
│   └── vite.config.js
├── back/           ← Express + Socket.io
│   ├── src/
│   └── package.json
├── .gitignore
├── CLAUDE.md
└── requirements/
```

Cada plataforma de deploy se configura para construir solo la subcarpeta que le corresponde
(ver secciones siguientes) — no hace falta separar en dos repos.

---

## 2. Backend en Render

- **Servicio:** Web Service, plan Free.
- **Root Directory:** `back/`
- **Build Command:** `npm install`
- **Start Command:** `npm start` (definir en `back/package.json` un script `start` que levante
  el servidor Express/Socket.io).
- **Variables de entorno necesarias (a definir exactas durante el desarrollo):**
  - `PORT` (Render la inyecta automáticamente, el servidor debe leerla de `process.env.PORT`).
  - `CORS_ORIGIN` → la URL pública del frontend deployado, para configurar el CORS de Express y
    de Socket.io correctamente (sin esto, el navegador va a bloquear la conexión del cliente).
- **No se configura base de datos** en esta etapa (no hay persistencia en el MVP).

### Límites del free tier de Render a tener en cuenta (verificado agosto 2026)

- 750 horas de instancia gratis por mes. Un servicio inactivo (dormido) no consume horas.
- El servicio se duerme tras 15 minutos sin tráfico entrante, y el primer request después de
  dormido tarda entre 30 y 60 segundos en responder (cold start).
- 100 GB de ancho de banda saliente por mes incluidos.
- 512 MB de RAM y 0.1 CPU en la instancia gratuita — de sobra para el volumen esperado (salas de
  5-10 personas, uso esporádico, no continuo).

**Implicancia de diseño para el frontend:** dado el cold start, la UI debe comunicar
explícitamente un estado de "conectando" quen el socket tarda en establecer conexión por primera
vez, en vez de dejar la pantalla en blanco o sin feedback (ver `front.md`, HU-F11). Una práctica
recomendada: que el anfitrión abra la sala unos minutos antes de la sesión real para "despertar"
el backend con anticipación.

---

## 3. Frontend en Netlify o Vercel

Cualquiera de las dos sirve igual de bien para un build estático de Vite — elegir la que resulte
más simple de conectar al repo desde la cuenta que se use.

- **Base directory / Root Directory:** `front/`
- **Build Command:** `npm run build`
- **Publish/Output directory:** `dist/` (default de Vite)
- **Variables de entorno necesarias:**
  - `VITE_BACKEND_URL` → la URL pública del backend en Render, para que el cliente de
    `socket.io-client` sepa a dónde conectarse. Debe usarse en el código como
    `import.meta.env.VITE_BACKEND_URL`, nunca hardcodeada.

---

## 4. Flujo de despliegue

1. Push a la rama principal del repo.
2. Render y Netlify/Vercel detectan el cambio automáticamente (auto-deploy conectado al repo) y
   reconstruyen cada uno su subcarpeta correspondiente.
3. No hay pipeline de CI separado en el MVP (los propios servicios de deploy hacen de CI mínimo
   al correr el build). Si más adelante se agregan tests automáticos en cada push, se puede sumar
   GitHub Actions — no es necesario para arrancar.

---

## 5. Variables de entorno — resumen para `.env.example`

**`back/.env.example`**
```
PORT=3000
CORS_ORIGIN=https://tu-frontend-en-produccion.netlify.app
```

**`front/.env.example`**
```
VITE_BACKEND_URL=https://tu-backend-en-render.onrender.com
```

Nunca commitear los `.env` reales — solo los `.env.example` como referencia. Confirmar que
`.gitignore` excluya `.env` en ambas carpetas.