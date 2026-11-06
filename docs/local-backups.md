# Respaldos locales

Abre **Perfil → Respaldos locales** o `/backups`. Esta función está disponible en modo demo y opera sobre los datos de ese navegador. No consulta ni modifica bases de datos.

## Exportar

“Descargar respaldo JSON” prepara un archivo de formato `nutriai-local-backup`, versión 2, con fecha UTC y estas ocho colecciones:

- Pacientes: ficha, biomarcadores y mediciones.
- Planes nutricionales: contenido original, edición y estado de publicación.
- Citas y notas SOAP.
- Consultas médicas, diagnósticos, tratamientos y versiones anteriores.
- Expedientes médicos.
- Perfiles profesionales.
- Indicaciones aprobadas y sus referencias de versión.
- Órdenes de estudios, resultados recibidos, revisiones y eventos.

El respaldo contiene todos los datos clínicos locales, aunque correspondan a más de un profesional. No exporta la sesión, tokens, contraseñas, configuración de Supabase, tema ni casillas marcadas de compras. Los ejemplos demo aún no inicializados se materializan para incluir los datos que muestran los módulos.

El JSON **no está cifrado**. Guárdalo en un lugar privado y revisa que la descarga haya terminado. El navegador solo permite solicitar la descarga; la aplicación no puede comprobar que el archivo llegó al disco.

## Revisar e importar

1. Elige el archivo JSON, de hasta 20 MB. La aplicación valida formato, versión, las ocho colecciones, tipos de campos y objetos anidados, fechas e identificadores duplicados. Los campos incompatibles o datos incompletos bloquean la importación. Los archivos v1 se aceptan y convierten con 0 órdenes de estudios; restaurarlos reemplaza también las órdenes actuales. Revisa la vista previa.
2. Revisa fecha y cantidades. Seleccionar un archivo no modifica el almacenamiento. Las referencias a pacientes eliminados se conservan y se muestran como advertencias; no se inventan fichas ni se borran los registros huérfanos.
3. Guarda tus formularios y cierra otras pestañas del proyecto.
4. Descarga la copia previa obligatoria, confirma que se guardó y pulsa “Reemplazar datos y restaurar respaldo”. Si los datos cambiaron desde esa copia, el proceso se bloquea y exige una nueva copia.
5. Pulsa “Abrir datos restaurados” para recargar los módulos.

La restauración **reemplaza** las ocho colecciones completas; no mezcla registros. Una colección vacía vacía ese módulo. Se conservan la sesión y las preferencias del navegador. Los estados de publicación, aprobación y seguimiento de estudios también se restauran; utiliza solo archivos de confianza. La validación estructural no certifica la procedencia ni la veracidad clínica del contenido.

Para deshacer una restauración completada, importa el archivo `nutriai-antes-de-restaurar-…json` siguiendo el mismo proceso.

## Fallos e interrupciones

Antes de escribir se guarda un registro local de recuperación con los valores originales. Si no cabe ese registro, no comienza el reemplazo. Si falla una escritura, se intenta restituir exactamente cada valor anterior, incluso claves que no existían.

Si también falla esa reversión, el registro se conserva y la app recarga. Al iniciar, intenta recuperar los originales antes de abrir los módulos. Si no puede, muestra una pantalla para reintentar o descargar los datos anteriores. No elimina automáticamente un registro de recuperación ilegible.

`localStorage` no ofrece transacciones entre varias claves. Este mecanismo permite recuperación, pero requiere espacio adicional y no sustituye el archivo descargado. Si se borra todo el almacenamiento del navegador, se pierde también el registro local. Web Locks serializa las restauraciones y recuperaciones entre pestañas compatibles; otras pantallas no participan de ese bloqueo, por lo que deben cerrarse para restaurar.

## Verificación

Las pruebas automatizadas cubren exportación, validación sin escrituras, documentos anidados y versiones, restauración de las ocho colecciones, compatibilidad con archivos y registros de recuperación anteriores, respaldo vacío, cambios posteriores a la copia previa, falta de espacio, reversión, recuperación al siguiente inicio y rechazo de claves ajenas.

La revisión de navegador usa un contexto aislado con datos ficticios: acceso desde el perfil, exportación del JSON, vista previa sin cambios, confirmación obligatoria y restauración completa. Se comprueba el diseño móvil de 390 px sin desbordamiento horizontal. Las descargas de esa prueba se interceptan para verificar el archivo generado; no se afirma haber comprobado su guardado en disco.
