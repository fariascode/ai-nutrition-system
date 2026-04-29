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
