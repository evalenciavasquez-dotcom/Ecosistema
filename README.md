# C.C.O. E.V. — Centro de Control Operativo y Estratégico

> Tu realidad analizada. Tus decisiones con dirección.

Aplicación privada de análisis estratégico y dirección ejecutiva, construida a partir del PRD v1 (2026-07-16). Implementa el alcance de MVP descrito en la sección 12 del PRD: bandeja de entrada con clasificación asistida, proyectos, acciones, decisiones (con comparación de 8 escenarios), economía, evidencias, un motor de análisis con recomendaciones basadas en reglas, y configuración.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- Zustand con persistencia en `localStorage` del navegador (no hay base de datos en este v1 — ver "Alcance y limitaciones")
- Sin dependencias de IA externas: la clasificación de la bandeja y las recomendaciones del panel derecho son heurísticas basadas en reglas (palabras clave, relaciones proyecto/persona/riesgo), no llamadas a un LLM

## Ejecutar en local

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). La app redirige a `/login`.

### Contraseña de acceso

El sistema está protegido por una contraseña simple (acceso privado de un solo usuario, sección 15 del PRD). Se define con la variable de entorno `APP_PASSWORD`:

```bash
cp .env.example .env.local
# edita .env.local y define APP_PASSWORD
```

Si no defines `APP_PASSWORD`, se usa el valor por defecto `cco-ev-2026` — **cámbialo antes de compartir la app**.

## Desplegar en Vercel

1. Conecta el repositorio de GitHub en Vercel.
2. En "Environment Variables" define `APP_PASSWORD` con tu contraseña real.
3. Deploy — no se necesita configuración adicional (no hay base de datos externa).

## Estructura

```
src/
  app/
    login/                  Pantalla de acceso
    api/auth/               Verifica contraseña y setea cookie de sesión
    (app)/                  Shell autenticado: sidebar + contenido + panel de IA
      page.tsx              Inicio
      bandeja/               Bandeja de entrada
      proyectos/             Proyectos (lista + ficha ejecutiva)
      acciones/              Acciones
      decisiones/            Decisiones (con 8 escenarios)
      economia/              Economía
      evidencias/            Evidencias
      configuracion/         Configuración
  components/
    layout/                 Sidebar, TopBar, AIPanel
    ui/                     Badges de estado y nivel de evidencia
  lib/
    types.ts                Modelo de datos (sección 11 del PRD)
    seed-data.ts             Datos de ejemplo (Casa Norte, Estudio Fénix, etc.)
    store.ts                 Estado global (Zustand) + acciones CRUD
    classifier.ts             Heurística de clasificación de la bandeja
    assistant.ts               Heurística de respuesta del panel "Pregúntale al sistema"
    selectors.ts               Derivaciones: prioridad del día, insights, etc.
  proxy.ts                  Gate de autenticación (antes "middleware.ts" en Next < 16)
```

## Alcance y limitaciones de este v1

- **Persistencia**: los datos viven en el `localStorage` del navegador de Eduardo, no en un servidor. Cambiar de navegador o dispositivo no comparte los datos. Hay exportación manual a JSON en Configuración.
- **Motor de análisis**: es una versión base por reglas (tal como pide la sección 18 del PRD para evitar sobre-ingeniería en v1), no un LLM. Las recomendaciones y el panel "Pregúntale al sistema" derivan de los datos ya registrados (riesgos, días sin respuesta, evidencia disponible), nunca inventan información.
- **Sin integraciones externas** (correo, calendario, WhatsApp, bancos) — está fuera de alcance de v1 según la sección 13 del PRD.
- **Un solo usuario** — no hay roles ni permisos multiusuario.

## Diseño visual

El diseño replica las capturas de pantalla compartidas (sidebar oscuro de 3 columnas, panel "Motor de análisis estratégico" a la derecha, badges de nivel de evidencia). Las pantallas de Economía, Evidencias y Configuración no tenían captura de referencia, así que se diseñaron con el mismo lenguaje visual del resto.
