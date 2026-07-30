# C.C.O. E.V. — Centro de Control Operativo y Estratégico

> Tu realidad analizada. Tus decisiones con dirección.

Aplicación privada de análisis estratégico y dirección ejecutiva, construida a partir del PRD v1 (2026-07-16). Implementa el alcance de MVP descrito en la sección 12 del PRD: bandeja de entrada con clasificación asistida, proyectos, acciones, decisiones (con comparación de 8 escenarios), economía, evidencias, un motor de análisis con recomendaciones basadas en reglas, y configuración.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- Zustand con persistencia en `localStorage` del navegador **y**, si `DATABASE_URL` está configurada, sincronización real con Postgres (Drizzle ORM) para tener la misma información en cualquier dispositivo — ver "Base de datos y sincronización entre dispositivos"
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

**`APP_PASSWORD` es obligatoria.** No hay contraseña de respaldo: si la variable no está definida, todo intento de acceso falla y el login lo dice con esas palabras ("El servidor no tiene APP_PASSWORD configurada"). Es deliberado — este repositorio es público, así que un valor por defecto en el código equivaldría a no tener contraseña.

La sesión dura 30 días y ese vencimiento va firmado dentro de la propia cookie, no solo en su `Max-Age`: un token copiado a mano tampoco sobrevive al plazo. Cambiar `APP_PASSWORD` invalida todas las sesiones abiertas de inmediato.

### Motor de análisis estratégico (IA real)

El botón "Analizar con IA" en Decisiones llama a la API de Claude desde `src/app/api/analyze/route.ts`. Requiere `ANTHROPIC_API_KEY` (consíguela en [console.anthropic.com](https://console.anthropic.com) → Settings → API Keys, con créditos de uso comprados). Sin esta variable, el botón muestra un error claro en vez de fallar silenciosamente. Costo aproximado: 3-5 centavos de dólar por análisis con Sonnet 5.

### Base de datos y sincronización entre dispositivos

Por defecto (sin `DATABASE_URL`), la app funciona exactamente igual que antes: todo vive en el `localStorage` del navegador. Si defines `DATABASE_URL`, la app además persiste cada cambio en Postgres (vía Drizzle ORM) y, al abrir la app en cualquier dispositivo, carga los datos desde ahí — así tienes la misma información en el celular y en el PC.

**Desarrollo local** (Postgres local, opcional):

```bash
# instala Postgres localmente o usa un contenedor, luego:
DATABASE_URL=postgresql://usuario:password@localhost:5432/cco_ev npm run db:push
```

`npm run db:push` sincroniza el esquema (`src/lib/db/schema.ts`) contra la base de datos sin migraciones versionadas — adecuado para este proyecto de un solo usuario.

**Producción (Neon + Vercel):**

1. En el proyecto de Vercel, ve a la pestaña "Storage" → "Create Database" → elige "Neon Postgres".
2. Vercel provisiona la base de datos y añade la variable `DATABASE_URL` automáticamente al proyecto.
3. Corre `npm run db:push` una vez apuntando a esa misma `DATABASE_URL` (copiada desde Vercel) para crear las tablas en Neon.
4. Vuelve a desplegar en Vercel.
5. Entra a la app → Configuración → "Base de datos y sincronización" → botón "Migrar datos locales a la base de datos". Esto copia una sola vez los datos que ya tenías en el navegador hacia Neon. Desde ese momento, Neon es la fuente de información en todos tus dispositivos.

Si `DATABASE_URL` no está configurada, esta sección de Configuración simplemente indica "No configurada" y la app sigue funcionando con `localStorage` sin romperse.

## Desplegar en Vercel

1. Conecta el repositorio de GitHub en Vercel.
2. En "Environment Variables" define `APP_PASSWORD` con tu contraseña real, y `ANTHROPIC_API_KEY` con tu key de Anthropic.
3. (Opcional, para sincronizar entre dispositivos) Añade Neon Postgres desde la pestaña "Storage" — ver sección anterior.
4. Deploy.

## Estructura

```
src/
  app/
    login/                  Pantalla de acceso
    api/auth/               Verifica contraseña y setea cookie de sesión
    api/state/              GET: estado completo desde Postgres (si DATABASE_URL existe)
    api/mutate/             POST: insert/update/delete genérico contra Postgres
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
    store.ts                 Estado global (Zustand) + acciones CRUD + sincronización a Postgres
    classifier.ts             Heurística de clasificación de la bandeja
    assistant.ts               Heurística de respuesta del panel "Pregúntale al sistema"
    selectors.ts               Derivaciones: prioridad del día, insights, contexto de análisis
    strategic-case-schema.ts   Esquema Zod de la salida estructurada del motor de análisis
    analysis-prompt.ts          System prompt del motor de análisis (reglas + estructura del caso)
    db/schema.ts                 Tablas Drizzle (una por entidad, jsonb para campos anidados)
    db/client.ts                  Cliente Postgres dual: Neon serverless en prod, node-postgres en local
    db/sync.ts                     Helpers de cliente: dbMutate, fetchServerState, migrateAllToServer
  proxy.ts                  Gate de autenticación (antes "middleware.ts" en Next < 16)
```

## VINCERE Intelligence Platform (`/vincere`)

Además del C.C.O. E.V., el repositorio incluye la **VINCERE Intelligence Platform** (PRD v3.0): una plataforma de dirección estratégica musical tipo Chartmetric, pero donde cada sección corresponde a un motor del sistema VINCERE y, sobre la data, una capa de IA la interpreta con el método propio (qué significa, riesgo, oportunidad, decisión, nivel de evidencia 1-4).

Se abre desde la entrada **VINCERE** en la barra lateral, o directamente en `/vincere`. Es su propia superficie de marca (look editorial oscuro), separada del resto de la app:

- **Shell de plataforma** (P0.1): selector de proyecto + navegación lateral por motores + panel principal.
- **Las 3 capas por sección** (P0.2): data (paneles/gráficas o campos editables) + interpretación de IA con nivel de evidencia + zona de acción (preguntas abiertas, ajuste de escenarios).
- **Secciones núcleo** (P0.3): Resumen/Career Momentum · Diagnóstico Maestro · Marca · Song Intelligence · Audiencia · Zonas de Calor · Management/Decisiones · KPIs · Triage.
- **Carga manual de data** por sección (P0.6) — arquitectura lista para APIs después.
- **Modo comparación** (P0.8): proyecto propio vs. una referencia de mercado (competencia), con lectura ajustada por macro-fase. Arranca con SETTE (proyecto real) y LUNA REBEL (referencia) precargados.
- **Registro a Notion** (P0.9): botón "Registrar en Notion" — escribe de verdad si `NOTION_TOKEN` + `NOTION_DATABASE_ID` están configuradas, si no avisa sin romper.
- **Marca (`/api/vincere/marca`)**: el resto de la plataforma mide lo que el artista produce; este motor declara lo que dice ser —posicionamiento, promesa, atributos, territorio, y el antipatrón (lo que NO es)— junto con qué proyecta hoy cada punto de contacto. Su salida no es la declaración sino la **brecha**: el sistema contrasta lo declarado contra catálogo, audiencia y zonas, y devuelve dónde lo que se dice y lo que la gente recibe dejan de coincidir, con el dato que sostiene cada grieta y una puntuación de coherencia 0-100. Existe porque el análisis de canción ya juzgaba "fit de marca" sin tener ninguna marca contra la cual juzgar: ahora esa marca declarada viaja también al contexto de Song Intelligence y del Informe Final.
- **Análisis de letra por canción**: dentro de Song Intelligence se pega la letra y la IA lee la canción como obra (tema real, arco emocional, gancho, audiencia, fit de marca, potencial, qué reescribir y la decisión de gestión), cruzándola con las métricas de esa canción.
- **Análisis de audio (`src/lib/vincere/audio.ts`)**: Claude no acepta audio — solo texto, imagen y PDF — así que el archivo no se le manda: se mide con DSP escrito a mano **en el navegador** (FFT radix-2, flujo espectral, autocorrelación, matriz de auto-similitud con kernel de tablero) y a la IA viajan los números. El archivo nunca sale del equipo, no hay subida ni almacenamiento. Devuelve BPM con su fiabilidad, tonalidad, rango dinámico, curva de energía, secciones y el segundo en que entra el gancho — que cruzado con el skip rate es la lectura más directa del sistema. Dos decisiones de DSP que importan: el flujo espectral se calcula **por bandas logarítmicas y se promedia** (sumar bins linealmente hace que un charles de banda ancha ahogue al bombo y el detector marque las corcheas en vez del pulso), y sobre la autocorrelación se aplica una **preferencia log-normal centrada en 120 BPM**, que es como los detectores de ritmo reales resuelven la ambigüedad entre T y 2T. La textura describe el espectro: **no hay reconocimiento de instrumentos**, y el prompt lo prohíbe explícitamente.
- **Análisis externo por canción**: campo de «Análisis externo y notas de producción» donde se pega lo que la medición propia no alcanza — instrumentos, mood, género y artistas similares de un servicio (Cyanite, Music.ai) o del productor. Entra al prompt y al contexto etiquetado como observación externa, con instrucción de atribuirlo y de señalar las contradicciones con lo medido en vez de elegir una fuente. Al medir el audio de una canción sin análisis externo se levanta una alerta de oportunidad, **una sola vez por canción** (un recordatorio que salta siempre deja de recordar). Si las notas traen artistas similares, un botón salta a Investigación con la consulta ya escrita — la cadena completa es: la plataforma mide qué ES la canción, el servicio externo dice a qué SE PARECE, y la búsqueda web averigua qué les pasó a esos similares. La consulta se deja escrita, no se lanza sola.
- **Métrica de la letra (`src/lib/vincere/metrica.ts`)**: sílabas por verso con sinalefa y regla de acento final, esquema y tipo de rima, densidad léxica y repeticiones. Se calcula al guardar la letra, no se le pide a la IA: contar sílabas es una regla determinista y un modelo de lenguaje falla al contar y varía entre llamadas. La IA recibe el resultado y solo interpreta qué significa.
- **Plan Stress-Test** (P1.3): se carga el plan de un tercero (PDF, captura o texto) y el sistema lo somete a prueba **contra la realidad de ese artista** — no en abstracto: el mismo plan puede servirle a un consolidado y arruinar a un emergente. Devuelve los supuestos que el plan da por hecho sin decirlo, las variables ganadoras/perdedoras ordenadas por impacto, los cinco escenarios (Pierde · Break-even · Probable · Gana · Expansión), el punto de quiebre (la pieza única que si falla tumba todo) y las condiciones concretas a exigir antes de aceptar. Los planes evaluados se acumulan como registro de qué se ofreció y con qué criterio se decidió.
- **Histórico**: cada carga de data guarda una foto de los indicadores (streams, seguidores, Momentum Index, tamaño del catálogo) con fecha y origen — una por día, para que la evolución no se llene de ruido. El panel de Evolución en Resumen muestra la trayectoria por métrica con su delta, y el histórico entra en el contexto de la IA, que tiene instrucción de leer la evolución antes que el valor de hoy. Emitir un informe nuevo archiva el anterior (con lo editado a mano) en vez de destruirlo, y el informe siguiente recibe el previo para contrastar qué recomendó y qué pasos se cumplieron.
- **Informe Final**: la plataforma emite el entregable del proyecto — sinopsis central, veredicto, bloques que cruzan motores entre sí, riesgos, oportunidades y próximos pasos con responsable y plazo. Se descarga a Markdown, se imprime a PDF (hay estilos de impresión en claro) y se archiva en Notion.

- **Gestión de proyectos**: botón "+ Proyecto" en la barra superior — crear proyectos propios o referencias de mercado, renombrarlos, cambiarles la fase y eliminarlos.
- **Ingesta de data ("Cargar data")**: se suelta una captura (Spotify for Artists, Instagram, YouTube Studio, o un panel de industria tipo Chartmetric / Songstats / Soundcharts), un PDF, o se pega un CSV/texto. La IA lo lee, extrae los números y los reparte al motor que les corresponde, levantando alertas por severidad (crítica / atención / oportunidad). La propuesta se revisa bloque por bloque y solo se escribe lo aprobado; los bloques que la fuente no contiene van en `null` y nunca sobrescriben data existente.
- **Investigación (búsqueda web)**: el único motor que mira hacia afuera. Se escribe qué se quiere saber — un artista, una canción, una plaza o una pregunta de industria — y la ruta usa las herramientas de servidor `web_search_20260209` / `web_fetch_20260209` para buscar de verdad. Corre en **dos fases deliberadas**: primero investiga en prosa con las páginas en contexto (reanudando los `pause_turn` del bucle de servidor y recogiendo las URLs de cada `web_search_tool_result`), y después una segunda llamada sin herramientas estructura ese reporte contra el esquema — las citas de búsqueda y la salida tipada no conviven en la misma llamada. Cada hallazgo cita el número de la fuente que lo respalda, y **un hallazgo sin fuente tiene techo de nivel 2**, forzado en el cliente aunque el modelo declare más. Las señales de plaza se proponen para Zonas de Calor y solo entran al mapa con aprobación explícita. Los hallazgos se inyectan en el contexto de los demás motores etiquetados como externos, con instrucción de no mezclarlos con las métricas propias.

**La documentación vive dentro de la plataforma**, en la sección "Documentación" (`src/lib/vincere/manual.ts` es su fuente única), con dos documentos imprimibles:

- **Guía del Usuario** — primeros pasos, el ciclo de trabajo completo, tareas paso a paso, cadencia sugerida y qué hacer cuando algo falla.
- **Manual del Sistema** — qué es VINCERE y qué no, las tres capas, los motores activos y los pendientes, cómo funciona la capa de IA, por qué existen los niveles de evidencia, dónde vive la información y el alcance real de esta versión.

No se duplican aquí para que no se desincronicen.

La interpretación, las preguntas por sección, el triage, el análisis de letra, la ingesta, la investigación y el informe llaman a Claude (Sonnet 5) vía las rutas `src/app/api/vincere/*`, usando la misma `ANTHROPIC_API_KEY`.

**Por qué no hay Google Trends.** Google no publica una API estable de Trends; las librerías existentes son ingeniería inversa y se rompen, y las IPs de datacenter (Vercel incluida) quedan bloqueadas — funcionaría en local y fallaría en producción. El motor de Investigación cubre esa necesidad con búsqueda web citable, sin proveedor ni credencial adicional. Para métricas duras de mercado la vía es un panel de industria cargado por Ingesta; si en algún momento se quiere data estructurada de terceros, los candidatos son la Spotify Web API pública (búsqueda de artistas, popularity, seguidores, géneros, relacionados — gratis, requiere client id/secret) o Chartmetric / Songstats / Soundcharts (de pago).

**Persistencia.** Con `DATABASE_URL` configurada, VINCERE sincroniza con Postgres igual que el C.C.O.: al abrir lee `/api/vincere/state` y, si la base tiene contenido, esa versión reemplaza la copia local; desde ahí una suscripción al store detecta qué proyectos cambiaron (por identidad de referencia) y los envía a `/api/vincere/sync` con debounce. La primera conexión sube lo que ya hubiera en el navegador. El `localStorage` (clave `vincere-storage`) se conserva como caché de pintado inmediato y respaldo si la red falla; sin `DATABASE_URL` es lo único que hay y el encabezado lo indica ("Solo este dispositivo").

El proyecto se guarda como documento completo en `vincere_proyectos.doc` (jsonb) en vez de normalizado: siempre se lee y se escribe entero, y normalizar la decena de estructuras anidadas añadiría fragilidad sin ganancia. Las tablas se crean bajo demanda (`ensureVincereSchema`), así que una base ya desplegada no requiere pasos manuales.

Estructura:

```
src/
  app/
    vincere/                 Shell de la plataforma (layout + page + vincere.css)
    api/vincere/
      interpret/             Lectura VINCERE por sección (IA)
      ask/                   Preguntas abiertas por sección (IA)
      triage/                Veredicto de casos nuevos (IA)
      state/                 GET: estado de VINCERE desde Postgres
      sync/                  POST: guarda proyectos cambiados y estado
      ingest/                Lee capturas, PDF o texto y extrae la data por motor (IA)
      research/              Investigación con búsqueda web en dos fases (IA)
      stress-test/           Somete el plan de un tercero a prueba (IA)
      analyze-song/          Lectura profunda de la letra de una canción (IA)
      informe/               Informe final del proyecto, cruzando motores (IA)
      notion/                Registro a Notion (si está configurado)
  components/vincere/        Header, Nav, secciones, componentes de las 3 capas
  lib/vincere/               types, seed-data (SETTE + LUNA REBEL), store, prompt,
                             schema, context, manual (contenido de "Cómo se opera"),
                             informe-export (Markdown + descarga)
```

## Alcance y limitaciones de este v1

- **Persistencia**: por defecto los datos viven en el `localStorage` del navegador. Si se configura `DATABASE_URL` (Neon en producción), los datos se sincronizan en Postgres y son los mismos en cualquier dispositivo — ver "Base de datos y sincronización entre dispositivos". Hay exportación manual a JSON en Configuración en ambos casos.
- **Motor de análisis**: la bandeja y el panel "Pregúntale al sistema" son heurísticas por reglas (rápidas, sin costo). El "Caso Estratégico" en Decisiones sí llama a Claude en tiempo real para el análisis profundo (DOFA, rentabilidad, escenarios, recomendación) — nunca inventa hechos fuera del contexto que le entrega la app.
- **Sin integraciones externas** (correo, calendario, WhatsApp, bancos) — está fuera de alcance de v1 según la sección 13 del PRD.
- **Un solo usuario** — no hay roles ni permisos multiusuario.

## Diseño visual

El diseño replica las capturas de pantalla compartidas (sidebar oscuro de 3 columnas, panel "Motor de análisis estratégico" a la derecha, badges de nivel de evidencia). Las pantallas de Economía, Evidencias y Configuración no tenían captura de referencia, así que se diseñaron con el mismo lenguaje visual del resto.
