# Indicaciones, historial y portal

## Indicaciones del paciente

1. Abre una consulta y captura la evaluación, los diagnósticos, el tratamiento y/o las indicaciones generales.
2. Guarda y cierra la consulta. En su vista de lectura, abre **Indicaciones del paciente**.
3. Revisa los datos profesionales y la vista previa. El nombre se requiere para imprimir y aprobar; cédula, consultorio y contacto se capturan manualmente y son opcionales.
4. Usa **Imprimir / Guardar PDF** para abrir la impresión del navegador. Los documentos de consultas sin cerrar se identifican como borradores y las consultas anuladas no se pueden imprimir desde esta vista.
5. Usa **Aprobar para el paciente** para compartir la versión guardada de las indicaciones. Puedes copiar el enlace o retirarlas del portal.

La vista previa del documento del paciente incluye identidad, diagnósticos, medicamentos, indicaciones y seguimiento. La nota clínica completa conserva su botón de impresión independiente. La aprobación guarda una copia de los datos profesionales; cambiar después el perfil no modifica esa copia.

## Historial unificado

Está disponible en **Historial Clínico** y en la sección desplegable del expediente 360°. Selecciona un paciente y filtra consultas, notas SOAP, mediciones, nutrición o laboratorio. Las tarjetas conservan el estado de borrador, cierre o anulación de cada consulta y permiten consultar su contenido.

Se muestra el último conjunto de biomarcadores guardado en la ficha; no se inventan estudios anteriores. Los pesajes vinculados a una consulta cerrada no se repiten cuando la consulta ya presenta esa misma medición. Los controles con información corporal adicional se mantienen.

## Contenido compartido

- `/portal/:planId`: muestra únicamente un plan publicado y no vacío, junto con las indicaciones aprobadas del mismo paciente y profesional.
- `/portal/patient/:patientId`: muestra las indicaciones aprobadas y el plan publicado más reciente disponible para ese paciente. Permite compartir indicaciones sin requerir un plan nutricional.
- El texto de la prescripción usa la edición guardada por el profesional, sin generar menús, opciones o sustituciones adicionales en el portal.
- Guardar cambios públicos en un plan publicado lo devuelve a borrador. Se requiere volver a publicarlo para habilitar su enlace.
- Reabrir, editar, anular o retirar una consulta invalida las indicaciones compartidas. Volver a cerrar la consulta no las aprueba automáticamente.
- El portal vuelve a consultar los datos al recuperar el foco o al recibir cambios relevantes del almacenamiento desde otra pestaña.
- Las notas internas del plan, el interrogatorio y la evaluación clínica privada no se incluyen en los datos preparados para el portal. Los diagnósticos y las indicaciones visibles son los que el profesional revisa en la vista previa de aprobación.

Todos estos flujos continúan usando almacenamiento local. Los enlaces de demostración no sincronizan datos entre navegadores o dispositivos ni sustituyen los controles de acceso de un servidor.

## Verificación

Se añadieron pruebas para documentos escapados, perfiles profesionales por usuario, conservación de versiones, orden y separación de eventos por paciente, publicación de planes, aprobación explícita, retirada tras reapertura y rechazo de vistas previas antiguas.

En navegador se verificaron la vista previa, la llamada de impresión con el documento revisado, el historial, el plan publicado exacto y la retirada del contenido compartido tras cambios. Se utilizaron datos ficticios de prueba y se retiraron después los registros creados para la comprobación. Las vistas de historial y portal se comprobaron también a 390 px de ancho sin desbordamiento horizontal.
