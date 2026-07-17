# C.C.O. E.V. — Centro de Control Operativo y Estratégico

> Tu realidad analizada. Tus decisiones con dirección.

Aplicación privada de análisis estratégico y dirección ejecutiva, construida a partir del PRD v1 (2026-07-16). Implementa el alcance de MVP descrito en la sección 12 del PRD: bandeja de entrada con clasificación asistida, proyectos, acciones, decisiones (con comparación de 8 escenarios), economía, evidencias, un motor de análisis con recomendaciones basadas en reglas, y configuración.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- Zustand con persistencia en `localStorage` del navegador (no hay base de datos en este v1 — ver "Alcance y limitaciones")
- Clasificación de la bandeja y panel "Pregúntale al sistema": heurísticas basadas en reglas (palabras clave, relaciones proyecto/persona/riesgo), sin llamadas a un LLM
- Motor de análisis estratégico (Decisiones → "Analizar con IA"): llamada real a Claude (Sonnet 5) vía `@anthropic-ai/sdk` con salida estructurada (`output_config.format` + Zod), generando el caso estratégico completo (hechos/hipótesis, DOFA, rentabilidad, costo de oportunidad, stakeholders, 8 escenarios, recomendación con confianza) — requiere `ANTHROPIC_API_KEY`

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

### Motor de análisis estratégico (IA real)

El botón "Analizar con IA" en Decisiones llama a la API de Claude desde `src/app/api/analyze/route.ts`. Requiere `ANTHROPIC_API_KEY` (consíguela en [console.anthropic.com](https://console.anthropic.com) → Settings → API Keys, con créditos de uso comprados). Sin esta variable, el botón muestra un error claro en vez de fallar silenciosamente. Costo aproximado: 3-5 centavos de dólar por análisis con Sonnet 5.

## Desplegar en Vercel

1. Conecta el repositorio de GitHub en Vercel.
2. En "Environment Variables" define `APP_PASSWORD` con tu contraseña real, y `ANTHROPIC_API_KEY` con tu key de Anthropic.
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
    api/analyze/            Motor de análisis estratégico (llamada real a Claude)
  lib/
    types.ts                Modelo de datos (sección 11 del PRD) + StrategicCase
    seed-data.ts             Datos de ejemplo (Casa Norte, Estudio Fénix, etc.)
    store.ts                 Estado global (Zustand) + acciones CRUD
    classifier.ts             Heurística de clasificación de la bandeja
    assistant.ts               Heurística de respuesta del panel "Pregúntale al sistema"
    selectors.ts               Derivaciones: prioridad del día, insights, contexto de análisis
    strategic-case-schema.ts   Esquema Zod de la salida estructurada del motor de análisis
    analysis-prompt.ts          System prompt del motor de análisis (reglas + estructura del caso)
  proxy.ts                  Gate de autenticación (antes "middleware.ts" en Next < 16)
```

## Alcance y limitaciones de este v1

- **Persistencia**: los datos viven en el `localStorage` del navegador de Eduardo, no en un servidor. Cambiar de navegador o dispositivo no comparte los datos. Hay exportación manual a JSON en Configuración.
- **Motor de análisis**: la bandeja y el panel "Pregúntale al sistema" son heurísticas por reglas (rápidas, sin costo). El "Caso Estratégico" en Decisiones sí llama a Claude en tiempo real para el análisis profundo (DOFA, rentabilidad, escenarios, recomendación) — nunca inventa hechos fuera del contexto que le entrega la app.
- **Sin integraciones externas** (correo, calendario, WhatsApp, bancos) — está fuera de alcance de v1 según la sección 13 del PRD.
- **Un solo usuario** — no hay roles ni permisos multiusuario.

## Diseño visual

El diseño replica las capturas de pantalla compartidas (sidebar oscuro de 3 columnas, panel "Motor de análisis estratégico" a la derecha, badges de nivel de evidencia). Las pantallas de Economía, Evidencias y Configuración no tenían captura de referencia, así que se diseñaron con el mismo lenguaje visual del resto.
