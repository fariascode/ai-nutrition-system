# Revisión de navegación y temas

Fecha: 2 de noviembre de 2026.

## Comportamiento implementado

- Navbar fijo compartido por escritorio y móvil, con perfil arriba a la derecha.
- Perfil con nombre, correo y cierre de sesión; cierre con Escape y clic fuera, y recuperación del foco con Escape.
- Barra lateral visible inicialmente en escritorio y plegable con el botón de menú.
- Panel móvil mediante un diálogo nativo: foco contenido, Escape, cierre por fondo y selección de sección. El contenido de fondo no se desplaza mientras está abierto.
- Una sola navegación principal en móvil; se retiró la barra inferior duplicada.
- Colores semánticos para superficies, contenido, textos secundarios, acciones y estados. Los paneles que permanecen oscuros en ambos temas tienen colores propios para sus textos.

## Verificación realizada

| Área | Comprobación | Resultado |
| --- | --- | --- |
| Navbar y perfil | Desplazarse al final de la página y abrir el perfil | Navbar en la parte superior de la ventana y cierre de sesión accesible |
| Perfil | Escape | Menú cerrado y foco devuelto al botón |
| Cierre de sesión demo | Pulsar Cerrar sesión | Redirección a login y eliminación de la sesión demo; se volvió a entrar para continuar la revisión |
| Escritorio | Ocultar y mostrar barra lateral | Contenido disponible con ambos estados |
| Panel móvil | Tab, Escape y selección de Pacientes | Foco dentro del panel; cierre y recuperación del desplazamiento |
| Pantallas principales | Dashboard, pacientes, planes, agenda e historial en claro y oscuro | Sin desbordamiento horizontal en los tamaños revisados |
| Tamaños | Escritorio 1440 × 1000; móvil 320 × 740 y 390 × 844 | Navbar utilizable; panel sin scroll adicional innecesario |
| Modales | Alta de paciente, expediente 360°, expediente médico, laboratorio, nueva cita, consulta médica, SOAP y nuevo plan | Textos visibles revisados en ambos temas |
| Portal | Plan demo a 390 × 844, claro y oscuro | Sin desbordamiento horizontal; textos visibles revisados |
| Regresión | npm test | 13 pruebas aprobadas |
| Comprobaciones estáticas | npm run lint y npm run build | Correctas; permanece la advertencia de tamaño del bundle |

La comprobación de contraste inspeccionó texto visible sobre fondos sólidos y combinó fondos transparentes. Se finalizaron las animaciones finitas antes de medir para evitar lecturas durante las transiciones. Se usaron como referencia relaciones de 4.5:1 para texto normal y 3:1 para texto grande. Los gradientes, iconos y estados que no se mostraron requieren revisión visual adicional; esto no constituye una certificación completa de accesibilidad.

Los recorridos de formularios se realizaron sin guardar cambios clínicos ni enviar mensajes. No se modificó la base de datos ni su configuración.
