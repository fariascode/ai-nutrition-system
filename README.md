# NutriAI — Sistema de Planes Nutricionales

Sistema web para nutriólogos que genera planes nutricionales personalizados con inteligencia artificial.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 19 + Vite + TypeScript |
| Estilos | Tailwind CSS v4 |
| Base de datos | Supabase (PostgreSQL) |
| Autenticación | Supabase Auth |
| IA | OpenAI GPT-4o (vía Edge Functions) |
| Deploy | Vercel |

## Funcionalidades

- Registro y gestión de pacientes
- Generación de planes nutricionales con IA
- Validación y edición manual por el doctor
- Historial de planes por paciente

## Desarrollo local

### Requisitos

- Node.js 20+
- Cuenta en Supabase
- Cuenta en OpenAI (para la generación de planes)

### Instalación

```bash
# Instalar dependencias
npm install

# Copiar variables de entorno
cp .env.example .env.local

# Editar .env.local con tus credenciales de Supabase
# VITE_SUPABASE_URL=...
# VITE_SUPABASE_PUBLISHABLE_KEY=...

# Iniciar servidor de desarrollo
npm run dev
```

La app estará disponible en `http://localhost:5173`.

## Estructura del proyecto

```
src/
├── features/        # Módulos por dominio (auth, patients, plans, history)
├── components/      # Componentes reutilizables (ui/, layout/)
├── lib/             # Clientes externos (supabase, openai)
├── hooks/           # Custom hooks globales
├── types/           # Tipos TypeScript compartidos
└── utils/           # Funciones utilitarias puras
```

## Variables de entorno

| Variable | Descripción |
|---|---|
| `VITE_SUPABASE_URL` | URL del proyecto en Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Publishable key de Supabase (antes "anon key") |

> La clave de OpenAI se configura en las Edge Functions de Supabase, nunca en el frontend.

## Scripts

```bash
npm run dev      # Servidor de desarrollo
npm run build    # Build de producción
npm run preview  # Preview del build
npm run lint     # Linter
```

## Consulta médica y expediente local

Desde **Pacientes → Expediente 360°** se puede abrir el expediente médico integral o registrar una consulta general. La consulta muestra un resumen de antecedentes, alergias y medicamentos; permite guardar borradores, cerrar, reabrir con motivo y anular conservando versiones anteriores.

- Los nuevos expedientes distinguen información pendiente de antecedentes negados por el paciente. Los valores guardados anteriormente se conservan y deben verificarse durante la consulta.
- La glucosa registra el contexto de medición. Solo el ayuno confirmado actualiza el campo de glucosa en ayuno de la ficha local.
- Al cerrar una consulta ligada a una cita, esta queda concluida. Agendar seguimiento es opcional y requiere fecha y hora; se verifica que no se cruce con otra cita del médico. El seguimiento creado desde la consulta es presencial y dura 30 minutos; otros ajustes se hacen desde la agenda.
- En demostración se sincronizan expediente, ficha y mediciones. Si falla un paso del guardado, se intenta restaurar el estado local previo y se mantienen los cambios del formulario para reintentar.
- Estos módulos siguen usando el almacenamiento del navegador. La persistencia remota, los permisos de servidor y la sincronización entre dispositivos quedan pendientes. El historial local no constituye una auditoría protegida contra modificaciones del navegador.

### Pruebas

Las pruebas usan el ejecutor nativo de **Node.js 24** y almacenamiento en memoria; no necesitan servicios externos ni credenciales.

```bash
npm test
npm run lint
npm run build
```
