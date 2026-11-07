# Órdenes de estudios y seguimiento

Disponible en **modo demo local**, sin llamadas ni cambios de bases de datos. Accede desde **Estudios** en la navegación, desde la ficha 360° o desde una consulta guardada.

## Solicitar e imprimir

1. Selecciona un paciente y abre sus consultas. Guarda primero la consulta si aún no existe.
2. Pulsa **Estudios → Nueva orden de estudios**.
3. Captura fecha y motivo; selecciona o escribe los estudios de laboratorio, imagen u otra categoría. Puedes añadir varios. La preparación se escribe manualmente; el catálogo solo ofrece nombres y no recomienda estudios ni condiciones de preparación.
4. Captura el nombre y los datos profesionales que quieras incluir. Cada orden conserva una copia del paciente y del profesional al solicitarla; no inventa una cédula ni actualiza el perfil global.
5. Guarda y abre la vista previa o **Imprimir / Guardar PDF**.

El documento incluye motivo explícito, estudios, preparación, fecha, folio e identidad del profesional y paciente. Excluye el interrogatorio, evaluación privada y resultados posteriores. Los campos se escapan antes de generar HTML. Una consulta en borrador produce un documento marcado **BORRADOR**; una consulta anulada o una orden cancelada produce un documento **sin vigencia**. Al imprimir se releen el estado de la orden y la consulta.

Las solicitudes guardadas conservan su contenido. Si necesitas sustituir una solicitud, cancélala con motivo y crea una nueva.

## Estados y resultados

- **Solicitado:** orden registrada. Puedes registrar su recepción o cancelarla.
- **Recibido:** informe transcrito manualmente con fecha del estudio, fecha de recepción y centro opcional. Los resultados no se sobrescriben después de guardarlos.
- **Revisado:** requiere recepción previa, fecha válida y una nota explícita del profesional.
- **Cancelado:** requiere motivo; conserva el informe, la revisión previa y todos los eventos. Es un estado terminal.

Las fechas de recepción y revisión no pueden estar en el futuro; el estudio no puede preceder a la solicitud, ni la revisión a la recepción. Se bloquean los cambios desde una versión obsoleta de la orden. Los errores de almacenamiento se muestran sin dar por guardado el formulario.

El seguimiento no interpreta archivos, prescribe, cambia diagnósticos ni reemplaza los biomarcadores de la ficha. No adjunta PDFs ni publica resultados en el portal. Al anular una consulta, se bloquean nuevas solicitudes y nuevas recepciones/revisiones; sus órdenes se conservan y pueden cancelarse explícitamente.

Cada evento registra actor y fecha local de guardado. Este historial local no es una auditoría protegida en servidor. La pertenencia a un profesional es una comprobación de coherencia dentro de la demo, no un sistema de autorización para producción.

## Buscar y consultar el historial

La pantalla **Estudios** permite filtrar por paciente y estado, actualizar la lista y abrir el documento. El historial unificado muestra por separado solicitud, recepción, revisión y cancelación con sus fechas y enlaces a las órdenes del paciente. No genera gráficas ni cambia la serie histórica de biomarcadores.

## Respaldo

Los respaldos de formato **versión 2** incluyen la colección `studyOrders`, con solicitudes, informes, revisiones y eventos. Los archivos **versión 1** siguen siendo importables: se validan y convierten con una colección vacía de órdenes. La vista previa advierte que restaurarlos reemplaza también las órdenes existentes. El registro de recuperación de la versión anterior sigue siendo compatible.

## Verificación

Pruebas automatizadas: pertenencia a paciente/consulta/profesional, campos obligatorios, duplicados, documentos escapados, estados y fechas, conservación del informe, versiones obsoletas, anulación de consulta, fallos de almacenamiento, historial por paciente y respaldo/restauración con compatibilidad v1.

Revisión de navegador con datos ficticios aislados: solicitud desde una consulta guardada, vista previa, envío del HTML a impresión mediante una ventana simulada, recepción y revisión. El guardado de un PDF en disco depende del diálogo del navegador y no se da por comprobado por esa prueba.
