# C.C.O. E.V. — Centro de Control Operativo y Estratégico

> Tu realidad analizada. Tus decisiones con dirección.

Aplicación privada de análisis estratégico y dirección ejecutiva, construida a partir del PRD v1 (2026-07-16). Implementa el alcance de MVP descrito en la sección 12 del PRD: bandeja de entrada con clasificación asistida, proyectos, acciones, decisiones (con comparación de 8 escenarios), economía, evidencias, un motor de análisis con recomendaciones basadas en reglas, y configuración.

El repositorio aloja tres sistemas con superficies propias: **C.C.O. E.V.** (`/inicio`), la **VINCERE Intelligence Platform** (`/vincere`) y **El Cuartel de mis Decisiones** (`/cuartel`). Comparten despliegue y acceso, no datos.

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

### Usar un dominio propio

No hay ninguna URL fija en el código, así que no se toca nada del proyecto:

1. Compra el dominio donde prefieras.
2. En Vercel → proyecto → **Settings** → **Domains** → "Add", escribe el dominio.
3. Vercel entrega los registros DNS a copiar en el panel de tu proveedor.
4. La propagación tarda de minutos a unas horas. El certificado HTTPS lo emite Vercel solo.

**Lo único que se rompe al cambiar de dominio es Google.** `GOOGLE_REDIRECT_URI` apunta al dominio anterior, y hay que actualizarla en dos sitios o el botón "Conectar con Google" falla (el resto de la app sigue funcionando):

- Variables de entorno de Vercel: `GOOGLE_REDIRECT_URI=https://tu-dominio.com/api/google/callback`
- Google Cloud Console → Credenciales → tu ID de cliente OAuth → "URIs de redirección autorizados": el mismo valor, exacto.

Todo lo demás —login, base de datos, VINCERE, las llamadas a Claude— es indiferente al dominio.

## Operar el sistema

### Cambiar la contraseña

Se cambia `APP_PASSWORD` en las variables de entorno de Vercel y se vuelve a desplegar. **Cambiarla cierra todas las sesiones abiertas de inmediato**, en todos los dispositivos: las sesiones van firmadas con la contraseña, así que al cambiarla dejan de validar. Es también la forma de expulsar a alguien que tuviera acceso.

### Si no puedes entrar

La app responde distinto según el problema, y el mensaje dice cuál es:

| Lo que ves | Qué pasa |
| :--- | :--- |
| "Contraseña incorrecta" | La contraseña no coincide. `APP_PASSWORD` sí está configurada. |
| "El servidor no tiene APP_PASSWORD configurada" | Falta la variable en Vercel. Nadie puede entrar hasta definirla. |
| "Demasiados intentos fallidos" | Bloqueo temporal por intentos seguidos. Se levanta solo en unos minutos. |
| Te pide entrar de nuevo sin motivo | La sesión venció (duran 30 días) o se cambió `APP_PASSWORD`. |

No hay recuperación de contraseña ni correo de reseteo: la contraseña es la variable de entorno, y quien controla el proyecto de Vercel puede cambiarla cuando quiera.

### Copias de seguridad

**Configuración → "Exportar todos los datos"** descarga un JSON con el sistema completo: el C.C.O. (proyectos, acciones, decisiones, movimientos, evidencias, bandeja, agenda, histórico) y VINCERE (proyectos de artistas, canciones con su letra y análisis, marca, investigaciones, stress-tests, informes y triage).

Es el único punto que baja todo de una vez. El botón "Exportar" del Informe Final, dentro de VINCERE, baja solo ese informe en Markdown para compartirlo — no sirve como respaldo.

Dónde vive la información, en orden de fiabilidad:

1. **Postgres (Neon)**, si `DATABASE_URL` está configurada. Es la fuente real y sobrevive a cambiar de equipo o de navegador.
2. **`localStorage` del navegador** (claves `cco-ev-storage` y `vincere-storage`). Sin `DATABASE_URL` es lo único que hay: borrar los datos del navegador borra el trabajo, sin vuelta atrás.
3. **El JSON exportado**, donde lo guardes.

Sin base de datos configurada, exportar cada tanto no es opcional.

### Qué cuesta usarlo

Vercel y Neon tienen plan gratuito suficiente para un usuario. Lo que se paga es Anthropic, por uso y solo cuando pulsas un botón de análisis — la app nunca llama a la IA por su cuenta.

Órdenes de magnitud con Sonnet 5: una lectura por sección o una pregunta abierta cuesta centavos; el Informe Final, el Stress-Test y el diagnóstico de Marca son más caros porque cruzan todos los motores a la vez. El gasto real se ve en [console.anthropic.com](https://console.anthropic.com) → Usage, donde también se puede fijar un límite mensual para no llevarse sorpresas.

Sin `ANTHROPIC_API_KEY` la plataforma funciona igual: los motores de IA se muestran como no configurados y todo lo demás —cargar data, editar, exportar— sigue disponible.

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
- **Secciones núcleo** (P0.3): Resumen/Career Momentum · Diagnóstico Maestro · Marca · Song Intelligence · A&R y Colaboraciones · Audiencia · Zonas de Calor · Shows y Touring · Management/Decisiones · KPIs · Monetización · Oportunidad de Negocio · Pitch y Presentación · Triage.
- **Carga manual de data** por sección (P0.6) — arquitectura lista para APIs después.
- **Modo comparación** (P0.8): proyecto propio vs. una referencia de mercado (competencia), con lectura ajustada por macro-fase. Arranca con SETTE (proyecto real) y LUNA REBEL (referencia) precargados.
- **Registro a Notion** (P0.9): botón "Registrar en Notion" — escribe de verdad si `NOTION_TOKEN` + `NOTION_DATABASE_ID` están configuradas, si no avisa sin romper.
- **Marca (`/api/vincere/marca`)**: el resto de la plataforma mide lo que el artista produce; este motor declara lo que dice ser —posicionamiento, promesa, atributos, territorio, y el antipatrón (lo que NO es)— junto con qué proyecta hoy cada punto de contacto. Su salida no es la declaración sino la **brecha**: el sistema contrasta lo declarado contra catálogo, audiencia y zonas, y devuelve dónde lo que se dice y lo que la gente recibe dejan de coincidir, con el dato que sostiene cada grieta y una puntuación de coherencia 0-100. Existe porque el análisis de canción ya juzgaba "fit de marca" sin tener ninguna marca contra la cual juzgar: ahora esa marca declarada viaja también al contexto de Song Intelligence y del Informe Final.
- **Pitch y Presentación (`/api/vincere/pitch`)**: escribe el documento con el que se presenta el artista a un tercero, en tres formatos que son documentos distintos y no el mismo texto retitulado. **DSP**: corto, con el campo literal de ≤500 caracteres para pegar en Spotify for Artists (con contador y botón de copiar) más las etiquetas de género y mood. **Disquera**: abre con una tesis de mercado —nunca con la biografía— y trae la economía de lo que se propone, reutilizando el análisis de Oportunidad si existe. **Marca**: no vende al artista sino su audiencia y el encaje, y revisa la asociación contra el antipatrón declarado en Marca. La decisión de diseño que lo separa de cualquier otro pitch: **declara el riesgo propio y el nivel de evidencia de cada dato**. En una sala donde todos llegan con números buenos, marcar cuáles son sólidos y cuál es el punto débil es lo que hace creíble al resto — y posiciona a quien presenta, no solo al artista. El prompt exige que el riesgo sea el real (uno cómodo se nota e invierte el efecto) y que vaya siempre con su defensa. Incluye además "qué no decir en esta sala", que se marca `vin-no-print` porque es nota interna y no parte del documento. **Es el primer punto donde VINCERE lee el C.C.O.**: para sello o marca cruza el destinatario con las Personas de la agenda y señala qué contactos sirven de puente, mandando solo nombre, empresa, rol, relación e influencia — los campos sensibles de esa ficha (pagos, riesgos, conversaciones pendientes) no salen.
- **Monetización (`/api/vincere/monetizacion`)**: tres preguntas que suelen confundirse en una — de dónde viene el dinero, cuánto queda del lado propio, y por dónde más podría entrar. La idea que lo gobierna: **la atención se va a donde se ven los números y el dinero suele entrar por otro lado**; el streaming es visible y se lleva la energía, pero rara vez es de donde vive un emergente. El sistema tenía los dos datos en pantallas distintas y aquí quedan juntos. Toda la aritmética vive en `src/lib/vincere/dinero.ts` y **no se le pide a la IA**: sumar, dividir y sacar porcentajes es exacto y un modelo lo falla lo justo como para arruinar una lectura de negocio; la IA recibe las cifras resueltas e interpreta. **Las monedas no se convierten** — sumar pesos con dólares usando un tipo de cambio inventado produce un número que parece correcto y no lo es, así que se agrupa por moneda, se analiza solo la principal y se avisa. Los shows entran solos desde Touring con su ingreso neto, sin doble carga. Devuelve el reparto por fuente con su concentración (sobre 70% en una fuente, avisa que el negocio depende de una pata) y **dos cifras por mil streams**: lo que paga el streaming y lo que vale esa misma audiencia contando todo — la distancia entre ambas es la lectura. "Lo tuyo" se calcula desde el Vínculo: participación sobre el promedio mensual, o la tarifa si es cliente, y se marca en ámbar como escenario si el vínculo no está confirmado. Sobre las vías sin explotar el prompt es estricto: cada una debe justificarse con la data de *este* artista o no se propone — un catálogo de opciones que le sirve a cualquiera no vale nada.
- **Vínculo** (`VincereVinculo`, panel dentro de Oportunidad): hasta aquí el sistema trataba todos los proyectos igual, pero un **cliente** al que se le cobra una tarifa y un proyecto **propio** donde se participa de los ingresos son negocios distintos. El vínculo declara cuál es —propio, sociedad, cliente, evaluando o ninguno— y separa **lo acordado de lo que se está pensando**: un porcentaje sin confirmar es hipótesis, no ingreso, y los análisis lo tratan como tal. Al cambiar de tipo, el store limpia el campo que deja de aplicar (un cliente con un porcentaje colgando haría contar dinero inexistente). Incluye las **horas semanales**, y con ellas un panel que suma la carga comprometida en *todos* los proyectos sobre una semana de referencia de 40h: eso convierte el costo de oportunidad de Oportunidad en un número — "ya hay 28 de 40 comprometidas, esto pide 12 más y no entran" — en vez de un párrafo sobre el tiempo en abstracto. El prompt de Oportunidad cambia la pregunta según el vínculo: a un cliente se le cotiza tarifa y alcance, a un socio se le calcula participación. **Triage** propone el encuadre desde el primer contacto (tipo de vínculo, cómo cobrarlo en rangos, horas estimadas) como sugerencia a confirmar, con prohibición explícita de dar cifras de mercado como hechos — una cifra inventada ahí se convierte en el punto de partida de una negociación real.
- **Oportunidad de Negocio (`/api/vincere/oportunidad`)**: la pregunta anterior a todas las demás — ¿conviene sumarse a este artista, y cómo? Los otros motores dirigen a alguien que ya está adentro; este decide si entra. Devuelve un **puntaje de 0 a 100 en múltiplos de diez** con semáforo (rojo bajo 40, amarillo hasta 69, verde de 70 arriba). Los múltiplos de diez son deliberados: un 63 finge una precisión que no existe cuando media evaluación es criterio, y un número redondo se puede discutir en una mesa. Los umbrales viven en `semaforoDe()` y no los interpreta la IA, para que el mismo puntaje dé siempre el mismo color. El prompt prohíbe dejar vacía la lista de lo que juega en contra: un análisis que solo entusiasma sirve para justificar lo que ya se quería hacer, no para decidir. Cada vía de entrada (management, 360, por proyecto, servicios, sociedad, distribución, asesoría) trae participación **en rango y con su razón**, retorno esperado con plazo, compromisos de **ambas** partes y una cláusula de revisión obligatoria — los acuerdos sin puerta de salida son cómo se termina atado años a un proyecto que dejó de moverse. Está prohibido inventar cifras de mercado como hechos: si no se saben, van a "qué falta saber". Suma dos ángulos que un análisis de este tipo suele omitir: **por qué nosotros** (el artista también elige) y **el costo de oportunidad** (para un equipo chico el cuello de botella es el tiempo).
- **A&R y Colaboraciones (`/api/vincere/ar`)**: decide con quién trabajar y con quién no. Dos ideas lo sostienen: **una colaboración con alguien cuya audiencia ya es la tuya no te da audiencia nueva** —la trampa más común del feature, dos artistas del mismo circuito hacen una canción y la escuchan las mismas personas de siempre—, y **la diferencia de tamaño decide quién gana**: muy por encima y el artista queda de invitado en su propia canción, muy por debajo y hace un favor sin retorno. Sobre eso manda una regla que no se negocia: el antipatrón de Marca pesa más que el tamaño del nombre, porque ahí es donde una oferta grande que rompe la identidad se disfraza de oportunidad. Devuelve por candidato fit de marca, solapamiento de audiencia, asimetría, qué gana y qué arriesga; más a quién perseguir primero (uno solo — elegir es el trabajo), las señales de alerta y qué perfil de colaborador falta hoy. A productores y compositores los juzga distinto: no aportan audiencia sino sonido, y se miden contra lo que a ese artista le retiene según sus propias métricas.
- **Shows y Touring (`/api/vincere/touring`)**: Zonas de Calor dice dónde escuchan; este motor decide dónde conviene tocar. Lo sostiene una sola idea: **escuchar es gratis y una entrada no**, así que la plaza de más streams puede vender cero boletos. Se registran los shows ya hechos (ciudad, sala, aforo, asistencia, ingreso y una nota de cómo estuvo la noche) y la relación asistencia/aforo —calculada en el cliente, no pedida a la IA— pasa a ser la única evidencia dura de convocatoria del sistema. Devuelve veredicto por plaza (ir / probar en chico / esperar / no), el aforo que la convocatoria real aguanta hoy, una ruta ordenada —se arranca donde hay certeza y se cierra donde hay riesgo— y las **plazas trampa**: las que la data hace ver bien y no lo están. Sin shows registrados el nivel de evidencia global no pasa de 2, porque sin conversión medida todo es estimación desde streaming. Su diagnóstico entra al Informe Final, y Zonas de Calor pasa a leerse contra la asistencia real de las ciudades donde ya se tocó.
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

## 🪖 El Cuartel de mis Decisiones (`/cuartel`)

Tercer sistema del repositorio, construido a partir de su PRD v1 (2026-08-01). Es una aplicación privada de **análisis de decisiones personales**: toma una situación de vida sin resolución obvia —una relación, algo con la familia, salud, vocación, tiempo y energía— y la convierte en rutas comparables, con una recomendación y un registro de qué pasó después.

> Ningún escenario se decide sin ver las 3 rutas completas.

No es un diario, ni un chat de desahogo, ni terapia. El centro es forzar la comparación explícita de rutas **antes** de que la inercia decida por default. El balance del producto es deliberado: ~80% análisis de decisión, ~20% registro.

Cuatro pantallas — Inicio · Escenarios · Historial (Libro Rojo) · Método — sobre el prototipo visual de la sección 18 del PRD: barra lateral fija, cabecera con el título de la pantalla, tema oscuro cálido con acento ámbar, Fraunces + Work Sans + IBM Plex Mono. El detalle de un escenario tiene dos modos: **Comparativa** pone las rutas una al lado de la otra en solo lectura —el momento en que el producto hace lo que promete— y **Una ruta** abre una sola, ancha y editable. El Instructor conversa desde un panel lateral, sin sacar de la comparación que se está mirando.

- **Separación estricta**: tabla propia (`cuartel_escenarios`), store propio, rutas de API propias. Nada de este contenido se cruza con proyectos de negocio, con VINCERE ni con el resto del C.C.O. E.V. — es un requisito del PRD, no una preferencia de implementación.
- **Las 3 rutas base** (`Cortar / Sostener / Rediseñar`) nacen con el escenario, en el propio `crearEscenario` del store. No hay techo de rutas, pero el store impide bajar de tres: volver a una decisión binaria es exactamente lo que el sistema existe para evitar.
- **Los 6 sombreros por ruta** (hechos, emoción, riesgos, beneficio real, alternativas, meta) son la estructura de análisis obligatoria. Una ruta con sombreros vacíos no llega a tener validez calculada.
- **Semáforo de 4 métricas** — patrón repetido, costo emocional, costo de oportunidad, reversibilidad — siempre las mismas, para que dos rutas de dos escenarios distintos sigan siendo comparables. Se ponen tocando cuatro puntos que ciclan gris → rojo → amarillo → verde: el gris es "sin evaluar" y cuenta como faltante, porque arrancar en amarillo daría por hecha una evaluación que nadie hizo.
- **El candado** (`src/lib/cuartel/candado.ts`): si la ruta es *Sostener* y tiene **2 de 4 métricas en rojo**, se descarta automáticamente. Vive en un archivo aparte del store y de la interfaz a propósito: la validez es una función pura de la ruta y **no existe ninguna acción que permita editarla a mano**. La ruta descartada no se borra ni se esconde — queda tachada, para que se vea qué quedó afuera y por qué.
- **El Instructor** (`/api/cuartel/instructor`): ninguna ruta obtiene validez sin al menos una pregunta de **Contraste o Confrontación respondida**. La regla se verifica en dos lugares: el prompt exige ese tipo de pregunta en la primera vuelta y la ruta de API **rechaza** la respuesta si el modelo devuelve otra cosa, para que una pregunta de consuelo no desbloquee la validez. Una pregunta hecha y no contestada tampoco cuenta. Si aparece una justificación nueva, se pone a prueba una vez más — una, no infinitas.
- **Capa legal/fiscal**, separada de los 6 sombreros: tres niveles (no aplica / recomendable / necesario antes de actuar), alcance exclusivamente personal. Identifica cuándo llamar a un abogado o contador colombiano; nunca actúa en su lugar.
- **Niveles de certeza** (hecho verificable / reportado por Eduardo / interpretación del sistema / hipótesis) pegados al dato en Riesgos y en el patrón repetido — no en una leyenda al pie. Una lectura del sistema nunca se muestra como algo confirmado.
- **Análisis con IA** (`/api/cuartel/analizar`): corre las rutas × los 6 sombreros y propone el semáforo. Solo llena campos vacíos — lo escrito por Eduardo no se pisa — y no toca ni la validez ni los turnos del Instructor: esas dos cosas no se pueden generar solas.
- **Recomendación** (`/api/cuartel/recomendar`): recibe únicamente las rutas válidas, devuelve una sola ruta con su movida concreta (ejecutable, verificable, con plazo) y el supuesto que la sostiene. Si apunta a una ruta que no está en las válidas, la respuesta se descarta. La ruta recomendada y la elegida se guardan por separado: pueden diferir, y esa diferencia es data.
- **Libro Rojo** (Historial): escenarios decididos con su resultado real y si el patrón identificado se confirmó o se refutó. El escenario no se puede cerrar sin resultado registrado — sin eso, esto sería un archivo de decisiones y no un registro que enseñe algo al siguiente. El contexto del Libro Rojo viaja a todos los prompts, que es lo que permite las preguntas de consistencia.
- **Honestidad de estado**: el indicador del encabezado dice dónde quedó la data de verdad (Guardado / Solo este dispositivo / Sin guardar). Un guardado que falló nunca se muestra como exitoso.
- **Lo que cuesta una llamada se guarda con el escenario**, no en el estado de la pantalla: la lectura general del análisis y el supuesto que sostiene la recomendación sobreviven a navegar y a recargar. Es la misma lección que la propuesta de la ingesta en VINCERE.
- **La falta de llave de IA se avisa antes de apretar**, no después, y diciendo dónde se arregla según dónde corra el despliegue (producción, preview o local) — reusa `exigirLlaveDeIA` y `useIaConfigurada`, que son infraestructura de despliegue y no datos.
- **Respaldo propio** en Configuración → "Exportar El Cuartel": archivo aparte del respaldo general, porque mezclar escenarios personales con proyectos, pagos y personas en un mismo JSON es la mezcla que el sistema evita en todo lo demás. Antes no había forma de bajarlos.
- **No aparece en la barra lateral de trabajo** (donde sí está VINCERE), solo en el panel de entrada: el contenido personal no se cruza en el contexto de trabajo.
- **Reversibilidad**: borrar un escenario o una ruta exige una confirmación explícita que dice qué se pierde.

```
src/
  app/cuartel/               Superficie propia (tema oscuro, acento ámbar, Fraunces + Work Sans + IBM Plex Mono)
  app/api/cuartel/
      state/                 GET: escenarios desde Postgres
      sync/                  POST: guarda los escenarios que cambiaron
      analizar/              Rutas × 6 sombreros + semáforo + capa legal (IA)
      instructor/            Preguntas de criterio, con la regla de secuencia verificada (IA)
      recomendar/            Recomendación sobre las rutas válidas + movida concreta (IA)
  components/cuartel/        Header, Nav, escenario, ruta, comparación, cierre
  lib/cuartel/               types, candado (regla pura), store, db, prompt, schema, ai-client
```

**Sobre el backend de datos**: el PRD (sección 18) decidió Notion vía API. Esta implementación usa el Postgres que el ecosistema ya tiene, en tablas propias del Cuartel, por dos razones — la separación de datos que exige el PRD se cumple igual (tabla, store y rutas aparte), y el mecanismo de sincronización ya está probado en VINCERE. Sin `DATABASE_URL`, todo funciona igual contra el navegador y la interfaz lo dice. Si se quiere Notion como respaldo, hace falta una integración y una base **distintas** de las de VINCERE: reutilizar `NOTION_DATABASE_ID` mezclaría vida personal con trabajo, que es justo lo que el PRD prohíbe.

## Alcance y limitaciones de este v1

- **Persistencia**: por defecto los datos viven en el `localStorage` del navegador. Si se configura `DATABASE_URL` (Neon en producción), los datos se sincronizan en Postgres y son los mismos en cualquier dispositivo — ver "Base de datos y sincronización entre dispositivos". Hay exportación manual a JSON en Configuración en ambos casos.
- **Motor de análisis**: la bandeja y el panel "Pregúntale al sistema" son heurísticas por reglas (rápidas, sin costo). El "Caso Estratégico" en Decisiones sí llama a Claude en tiempo real para el análisis profundo (DOFA, rentabilidad, escenarios, recomendación) — nunca inventa hechos fuera del contexto que le entrega la app.
- **Sin integraciones externas** (correo, calendario, WhatsApp, bancos) — está fuera de alcance de v1 según la sección 13 del PRD.
- **Un solo usuario** — no hay roles ni permisos multiusuario.

## Diseño visual

El diseño replica las capturas de pantalla compartidas (sidebar oscuro de 3 columnas, panel "Motor de análisis estratégico" a la derecha, badges de nivel de evidencia). Las pantallas de Economía, Evidencias y Configuración no tenían captura de referencia, así que se diseñaron con el mismo lenguaje visual del resto.
