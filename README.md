<div align="center">

<img src="public/favicon.svg" alt="NutriAI" width="68" />

# NutriAI

### Consulta médica, expediente y nutrición en un mismo lugar.

Una plataforma de consultorio para medicina general con nutrición integrada.<br />
Del antecedente al seguimiento: información organizada para acompañar la atención del paciente.

![React 19](https://img.shields.io/badge/React-19-149ECA?style=flat-square&logo=react&logoColor=white)
![TypeScript 6](https://img.shields.io/badge/TypeScript-6-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tailwind CSS 4](https://img.shields.io/badge/Tailwind_CSS-4-0891B2?style=flat-square&logo=tailwindcss&logoColor=white)
![Estado: en desarrollo](https://img.shields.io/badge/Estado-En_desarrollo-245C47?style=flat-square)
![Demo local](https://img.shields.io/badge/Demo-Sin_credenciales-C8ED8F?style=flat-square&labelColor=245C47)

[Vista del proyecto](#vista-del-proyecto) · [Funcionalidades](#funcionalidades) · [Probar la demo](#probar-la-demo) · [Arquitectura](#arquitectura) · [Roadmap](#roadmap)

</div>

![Centro de mando de NutriAI en modo oscuro, con pacientes de demostración](docs/images/dashboard-dark.jpg)

<p align="center"><sub>Interfaz real con datos ficticios. Tema oscuro Carbón & Bosque.</sub></p>

> **Estado del proyecto:** prototipo funcional en desarrollo. La demostración utiliza almacenamiento local y combina funciones implementadas con simulaciones explícitas. Los planes son borradores para revisión profesional; no se atribuyen porcentajes de eficacia ni validación clínica. Los documentos guardados con versiones anteriores conservan su texto y deben revisarse antes de compartirlos.

## Vista del proyecto

NutriAI comenzó con la generación de planes nutricionales y está evolucionando hacia un **consultorio médico integral**. Su enfoque actual es conectar la consulta general, los antecedentes del paciente, sus mediciones y el seguimiento nutricional dentro de un mismo flujo.

Está pensado para un médico general que también trabaja en áreas como nutrición y necesita consultar el contexto del paciente sin saltar entre herramientas.

| Durante la consulta | En el expediente | Después de la consulta |
| --- | --- | --- |
| Motivo, padecimiento, signos vitales, exploración, evaluación y plan. | Antecedentes, alergias, medicamentos, hábitos y evolución. | Agenda, indicaciones, planes nutricionales y portal del paciente. |

<details>
<summary><strong>Ver la interfaz en modo claro</strong></summary>
<br />

![Centro de mando de NutriAI en modo claro](docs/images/dashboard-light.jpg)

</details>

## Funcionalidades

### Consulta médica general

- Registro del motivo de consulta y padecimiento actual.
- Signos vitales: presión arterial, frecuencias cardiaca y respiratoria, temperatura, saturación, peso, talla y glucosa capilar.
- Exploración física por regiones, evaluación, tratamiento y seguimiento.
- Diagnósticos estructurados por consulta, con un principal, secundarios y certeza de sospecha o confirmado.
- Tratamiento farmacológico capturado por el médico: presentación, dosis, vía, frecuencia, duración e instrucciones. Los detalles pueden completarse en borrador y se validan antes del cierre.
- Resumen de antecedentes, alergias y medicamentos visible mientras se documenta la consulta.
- Borradores, cierre e impresión de la nota.
- Documento de indicaciones con vista previa, datos del profesional y salida para impresión o PDF.
- Reapertura con motivo y anulación que conserva el contenido y las versiones anteriores.
- Contexto de glucosa diferenciado: ayuno confirmado, casual, posprandial o no especificado.

### Expediente médico integral

- Antecedentes personales y familiares, cirugías y hospitalizaciones.
- Alergias con reacción y gravedad; medicamentos con dosis, frecuencia y estado.
- Hábitos de tabaco, alcohol, ejercicio, sueño, hidratación y alimentación.
- Distinción entre **información pendiente**, **antecedente negado por el paciente** e **información registrada**.
- Seguimiento antropométrico y consulta de biomarcadores.
- Historial unificado con consultas, notas SOAP, diagnósticos, tratamientos, controles, planes y el último conjunto de resultados de laboratorio.
- Sincronización local de la ficha y el expediente conservando detalles como reacciones, dosis y antecedentes resueltos.

![Expediente médico integral de un paciente ficticio en NutriAI](docs/images/medical-record.jpg)

### Agenda y continuidad de la atención

- Citas presenciales o por videollamada, con estados y motivo de atención.
- Consulta médica vinculada con una cita y conclusión de la cita al cerrar la consulta.
- Seguimiento opcional desde la consulta: presencial, de 30 minutos, con fecha y hora elegidas por el médico.
- Comprobación de cruces de horario al crear ese seguimiento y prevención de duplicados al reintentar.
- Notas SOAP editables y borradores mediante plantillas locales.
- Recordatorios preparados para copiar o abrir en WhatsApp; el envío lo realiza el usuario.

### Nutrición integrada

- Cálculos de IMC, metabolismo basal y gasto energético estimado.
- Selección de protocolos, objetivos calóricos y distribución de macronutrientes.
- Planes con estados de borrador, publicado y archivado; revisión y edición por el profesional.
- Lista de supermercado y referencias de equivalentes SMAE —Sistema Mexicano de Alimentos Equivalentes— calculadas mediante reglas.
- Consulta de historial de planes por paciente.
- Función de servidor preparada para solicitar contenido a OpenAI fuera del modo demo.

### Portal del paciente y experiencia de uso

- Prescripción publicada mostrada exactamente como la guardó el profesional, indicaciones de consulta aprobadas y registro de mediciones.
- Portal por paciente, disponible también cuando hay indicaciones aprobadas sin un plan nutricional.
- Una consulta reabierta deja de compartir sus indicaciones hasta una nueva aprobación. Editar un plan publicado lo devuelve a borrador hasta su nueva publicación.
- Diseño adaptable a escritorio y móvil, con temas claro y oscuro.
- Navbar fijo, perfil arriba a la derecha y cierre de sesión sin desplazarse al final de la página.
- Barra lateral plegable en escritorio y menú hamburguesa en móvil.
- Panel móvil con navegación por teclado, cierre con Escape y bloqueo del desplazamiento de fondo.

## Un recorrido de consulta

```mermaid
flowchart LR
    A[Seleccionar paciente] --> B[Revisar expediente]
    B --> C[Documentar consulta]
    C --> D[Guardar borrador o cerrar]
    D --> E[Registrar seguimiento]
    D --> F[Revisar nutrición si corresponde]
    F --> G[Editar y publicar plan]
    G --> H[Consultar portal del paciente]
```

La consulta general y la nutrición comparten el contexto del paciente. El profesional decide cuándo incorporar un plan nutricional y qué indicaciones aprobar.

## Probar la demo

**Requisitos:** Node.js **24** y npm. Esta es la versión usada para desarrollo y para las pruebas con el ejecutor nativo de Node.

La demo no requiere cuentas de Supabase ni de OpenAI.

### 1. Obtener la versión presentada

La versión integrada del proyecto está disponible en `main`:

```bash
git clone https://github.com/fariascode/ai-nutrition-system.git
cd ai-nutrition-system
npm ci
```

### 2. Iniciar

```bash
npm run dev
```

Abre **[http://localhost:5173](http://localhost:5173)** y selecciona **“Entrar directamente como Especialista Demo”**. Si ese puerto está ocupado, utiliza la dirección que indique Vite en la terminal.

El modo demo se activa cuando no hay una URL de Supabase configurada, cuando la URL contiene `your-project` o cuando se establece `VITE_DEMO_MODE=true`.

### 3. Explorar

1. Abre **Pacientes 360°** y selecciona **Expediente 360°** de un paciente de ejemplo.
2. Entra en **Expediente Médico** para revisar antecedentes, alergias y hábitos.
3. Abre **Consulta Médica**, captura información y guarda un borrador o cierra la consulta.
4. Revisa **Agenda y SOAP** para explorar citas, notas y seguimiento.
5. Genera un plan desde **Planes con IA**, revísalo y publícalo; después abre **App Paciente** para consultar el portal.
6. Para compartir indicaciones de medicina general, abre una consulta cerrada → **Indicaciones del paciente** → revisa la vista previa y los datos profesionales → **Aprobar para el paciente**. Desde esa misma vista puedes imprimir o copiar el enlace del portal.

Los cambios de demostración permanecen en ese navegador. No se comparten automáticamente con otro dispositivo y se pierden si se elimina su almacenamiento local. Un enlace `localhost` tampoco es accesible desde el teléfono de otro usuario.

## Qué está implementado y qué está simulado

| Área | Comportamiento actual |
| --- | --- |
| Acceso demo | Identidad simulada guardada en el navegador; no verifica una contraseña real. |
| Pacientes y planes | Datos locales en demo. Existen servicios con llamadas a Supabase para el modo conectado. |
| Consultas, expediente integral y citas | Persistencia local. La conexión remota de estos módulos está pendiente. |
| Historial de cambios | Versiones locales de consultas, con autor, fecha y motivo de reapertura o anulación. No es una auditoría protegida contra modificaciones del navegador. |
| Guardado clínico | Ante fallos, se intenta restaurar el estado local previo; los formularios muestran el error para poder reintentar. |
| Planes en demo | Plantillas y cálculos locales; no se realizan llamadas a OpenAI. |
| Notas SOAP | Borradores mediante plantillas locales, editables por el profesional. |
| Laboratorios en texto | Extracción con expresiones regulares e interpretación basada en reglas. |
| PDF e imágenes de laboratorio | Lectura no disponible: se solicita pegar el texto o cargar TXT/CSV. Nunca se sustituyen archivos por valores inventados. |
| Ejemplos de laboratorio | Casos ficticios identificados, solo para explorar; no pueden guardarse en el expediente. Se confirma la fecha del estudio antes de guardar resultados capturados. |
| Portal | Muestra el texto exacto del plan publicado y las indicaciones aprobadas de consultas cerradas. El menú fijo de demostración fue sustituido por la prescripción revisada. Las compras y equivalencias calculadas permanecen como referencias del profesional. |
| Indicaciones | Documento con datos profesionales capturados manualmente, vista previa e impresión/PDF. La aprobación se guarda localmente; reapertura, modificación, anulación o retirada invalidan el contenido compartido. |
| WhatsApp | Construye el mensaje y abre un enlace para que el usuario lo envíe. No hay envío automático ni confirmación de entrega. |
| Producción | Pendientes la persistencia remota completa, los controles de acceso del servidor y la validación del comportamiento clínico. |

## Arquitectura

Aplicación web de una sola página, organizada por funcionalidades. Los componentes representan la interfaz; los servicios concentran lectura y escritura; los motores locales reúnen cálculos y reglas.

```mermaid
flowchart TD
    UI[Interfaz React + TypeScript] --> FEATURES[Módulos por funcionalidad]
    FEATURES --> SERVICES[Servicios de aplicación]
    SERVICES --> LOCAL[Datos demo y almacenamiento local]
    FEATURES --> ENGINES[Cálculos y reglas locales]
    SERVICES -. Servicios existentes de acceso, pacientes y planes .-> SUPABASE[Supabase]
    SUPABASE -. Función preparada: generate-nutrition-plan .-> OPENAI[OpenAI]
```

Las conexiones discontinuas representan integraciones que requieren configuración externa; no son necesarias para explorar la demo.

| Capa | Tecnología |
| --- | --- |
| Interfaz | React 19 + TypeScript 6 |
| Desarrollo y compilación | Vite 8 |
| Estilos | Tailwind CSS 4 y colores semánticos por tema |
| Navegación | React Router 7 |
| Iconos | Lucide React |
| Pruebas | Ejecutor nativo de Node.js 24 |
| Integración remota existente | Supabase JS y Edge Function escrita para Deno |
| Generación remota preparada | OpenAI, modelo `gpt-4o` configurado en la función |
| Publicación del frontend | Configuración de rutas para Vercel |

### Estructura del repositorio

```text
src/
├── components/
│   ├── layout/          # Navbar, perfil, barra lateral y rutas protegidas
│   └── ui/              # Componentes compartidos
├── context/             # Tema de la interfaz
├── features/
│   ├── appointments/    # Agenda y notas SOAP
│   ├── auth/            # Acceso y sesión
│   ├── consultations/   # Consulta general, versiones y flujo de guardado
│   ├── dashboard/       # Centro de mando
│   ├── history/         # Historial de planes
│   ├── medical-record/  # Expediente médico integral
│   ├── patients/        # Ficha, biometría y laboratorios
│   ├── plans/           # Planes nutricionales y equivalentes
│   └── portal/          # Vista del paciente
├── lib/                 # Clientes, datos demo y motores de reglas
├── types/               # Modelos de datos compartidos
└── utils/               # Utilidades
supabase/functions/      # Función de generación remota de planes
tests/                   # Pruebas de regresión con datos en memoria
docs/                    # Revisión de interfaz y capturas
```

### Configuración opcional

Para hacer explícito el modo demo, crea `.env.local` con:

```dotenv
VITE_DEMO_MODE=true
```

Para explorar el código de integración remota, toma como referencia [`.env.example`](.env.example):

| Variable | Uso |
| --- | --- |
| `VITE_DEMO_MODE` | Fuerza la demostración cuando su valor es `true`. |
| `VITE_SUPABASE_URL` | URL del proyecto Supabase para los servicios conectados existentes. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Clave pública del cliente Supabase. |
| `OPENAI_API_KEY` | Secreto de la Edge Function; **nunca** debe incluirse en variables `VITE_*` ni en el frontend. |

Configurar las variables no crea las tablas, las políticas de acceso ni despliega la función. El repositorio todavía no incluye migraciones de base de datos. El archivo `.env.local` está excluido de Git.

## Calidad y comprobaciones

```bash
npm test          # Regresión con almacenamiento en memoria
npm run lint     # ESLint
npm run build    # TypeScript + compilación de producción
npm run preview  # Vista local del resultado compilado
```

Las **42 pruebas actuales** cubren sincronización del expediente, conservación de detalles, contexto de glucosa, citas de seguimiento, recuperación ante fallos, diagnósticos y tratamientos, documentos de indicaciones, historial unificado, aprobación/publicación del contenido del portal y entradas de laboratorio sin resultados inventados ni métricas de eficacia.

La revisión de interfaz abarca las cinco pantallas principales, ocho modales, el portal y tamaños de escritorio y móvil en ambos temas. El alcance y los límites de esa comprobación están documentados en [la revisión de navegación y temas](docs/navigation-theme-review.md).

La compilación conserva una advertencia de tamaño del bundle. La división de carga por rutas es una mejora pendiente.

## Roadmap

### Base disponible

- [x] Consulta médica general y expediente integral.
- [x] Diagnósticos y tratamiento farmacológico estructurados por consulta.
- [x] Integración local entre ficha, expediente, consulta y agenda.
- [x] Planes nutricionales editables y portal de demostración.
- [x] Documento imprimible de indicaciones con datos del paciente y del profesional.
- [x] Historial unificado por paciente, con filtros por tipo de evento.
- [x] Portal consistente con las prescripciones publicadas y las indicaciones aprobadas.
- [x] Navbar persistente, perfil y navegación adaptable.
- [x] Temas claro y oscuro con colores compartidos.
- [x] Pruebas de regresión para los flujos locales principales.

### Próximas etapas

- [ ] Persistencia remota completa y sincronización entre dispositivos.
- [ ] Roles, controles de acceso y trazabilidad protegida en servidor.
- [ ] Solicitudes de estudios vinculadas con el expediente.
- [ ] Extracción real de resultados desde PDF e imágenes, con revisión del médico.
- [ ] Seguimiento longitudinal de enfermedades crónicas.
- [x] Retirar métricas heurísticas de eficacia de la interfaz y de los nuevos borradores.
- [ ] Validación de los resultados generados.
- [ ] Optimización del bundle y ampliación de pruebas de interfaz.

## Autoría y colaboración

Desarrollado por **[fariascode](https://github.com/fariascode)**.

Para proponer una mejora o reportar un problema, abre un [issue](https://github.com/fariascode/ai-nutrition-system/issues) con el módulo afectado, los pasos para reproducirlo y el resultado esperado. Usa datos ficticios en ejemplos y capturas.

**Licencia:** pendiente de definir. El repositorio todavía no incluye un archivo `LICENSE`; consulta al autor sobre las condiciones de uso.

---

<p align="center"><strong>NutriAI</strong> · Medicina general con nutrición integrada.</p>
