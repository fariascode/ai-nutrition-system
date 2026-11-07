# Carga de pantallas bajo demanda

Las nueve pantallas se separan con `React.lazy` e importaciones explícitas. Cada ruta tiene su propio límite `Suspense`: durante la descarga muestra “Cargando pantalla…”, mientras la navegación del consultorio permanece disponible. Si la descarga o el renderizado falla, se muestra una pantalla de error con opción de recarga. Cambiar de ruta reinicia ese límite de error.

La comprobación del modo demo se separó de sus pacientes y plantillas, para que iniciar sesión no inicialice datos clínicos. La recuperación de respaldos se descarga al iniciar solo cuando hay un registro pendiente. En ese caso, los módulos siguen bloqueados hasta completar la recuperación; una descarga fallida no permite continuar con datos incompletos. Las herramientas para descargar una copia de recuperación también se cargan cuando se solicitan.

## Medición de la compilación

Comparación local con Vite 8.0.10, sin cambiar dependencias. Referencia: `f9f098c`, integración de estudios en `main`. Los tamaños son kB decimales de JavaScript; gzip se calcula por archivo con `node:zlib`. Se cuentan las dependencias estáticas transitivas una sola vez por visita, no solamente el archivo que lleva el nombre de la pantalla.

| Conjunto de JavaScript | Antes, kB | Después, kB | Antes gzip, kB | Después gzip, kB |
| --- | ---: | ---: | ---: | ---: |
| Entrada y dependencias estáticas | 806,17 | 454,83 | 221,67 | 132,45 |
| Primera visita directa al login | 806,17 | 462,53 | 221,67 | 135,50 |
| Primera visita directa al dashboard | 806,17 | 724,72 | 221,67 | 215,19 |
| Primera visita directa al portal | 806,17 | 508,56 | 221,67 | 152,35 |

El login requiere **42,6% menos JavaScript** y **38,9% menos en gzip**. El dashboard conserva más dependencias porque usa varios componentes clínicos compartidos. El mayor archivo individual pasó de 806,17 a 443,83 kB y la compilación dejó de mostrar el aviso de chunks superiores a 500 kB; no se modificó ese umbral.

El total de JavaScript producido pasó a 820,22 kB, aproximadamente 1,7% más por los límites de carga, referencias y estados añadidos. La mejora consiste en descargar cada parte cuando se necesita, no en reducir el tamaño total del proyecto. CSS, HTML, red real, caché y tiempo de ejecución no se incluyen en esos porcentajes. No se atribuye una mejora medida de tiempos ni de Core Web Vitals.

Para repetir la medición desde la raíz del repositorio:

```bash
npm run build -- --manifest
node scripts/measure-bundle.mjs
```

El script lee el manifiesto de `dist`, informa el conjunto estático inicial, la primera visita por pantalla y el total de JS. Los tamaños cambiarán conforme crezca el código. La opción `--manifest` es para medir y no se exige para una compilación normal.

## Verificación

- TypeScript, build y lint correctos; 72 pruebas automatizadas, incluidas la ausencia de inicialización clínica al entrar y la recuperación pendiente antes de montar los módulos.
- Revisión de la compilación de producción mediante `vite preview`, con un contexto de navegador aislado y datos demo.
- En el login no se descargan pantallas clínicas, plantillas demo ni herramientas de respaldo, y no se crean colecciones clínicas locales.
- Acceso a dashboard, pacientes, planes, agenda, historial, estudios, respaldos y portal publicado sin fallos de ruta. La navegación conserva los pacientes ya guardados.
- Simulación de red sin conexión al abrir un dashboard aún no descargado: el navbar permanece visible, aparece el error de carga y, tras recuperar la conexión, la recarga abre la pantalla.
- Simulación de una restauración interrumpida: al recargar se recuperan los datos anteriores y se retira el registro antes de abrir los módulos. La verificación devuelve solo indicadores de presencia y coincidencia, sin mostrar el contenido del registro.
- Pantalla de respaldos a 390 px sin desbordamiento horizontal.

La autenticación remota y los servicios externos no se modificaron ni se probaron con credenciales reales. Separar también los modales pesados es una optimización posterior posible, especialmente para el dashboard.
