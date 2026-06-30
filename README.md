# GroundDesing Pro — Prototipo de motor de cálculo de puesta a tierra

## Qué es esto

Prototipo funcional (un único `index.html` autocontenido, sin build step) de un
software de ingeniería para diseño de sistemas de puesta a tierra eléctrica,
desarrollado iterativamente en Claude.ai.

Incluye cálculo real (no simulado) de:

- Resistividad del suelo — método de Wenner e interpretación de N capas (kernel
  recursivo de Wait, 1954), con datos de campo (earth tester / telurómetro).
- Resistividad del suelo — método de Schlumberger, comparado contra Wenner.
- Curvas patrón tipo Orellana-Mooney (ajuste automático de la curva más cercana).
- Aditivo químico gel para mejoramiento de tierras (modelo de cilindros
  concéntricos, Dwight/Sunde).
- Resistencia de la malla de puesta a tierra (ecuación de Sverak, IEEE Std
  80-2013 Cl. 14.2).
- Tensiones de paso y de contacto, admisibles y reales (IEEE Std 80-2013 Cl. 16,
  modelo de Dalziel).
- Dimensionamiento térmico de conductor (ecuación de Onderdonk, IEEE Std
  80-2013 Cl. 11), con selección manual de calibre y bloqueo de calibres
  subdimensionados.
- Lista de materiales y costos (acumulativo: reacciona a cambios de geometría,
  gel y calibre de conductor).
- Memoria técnica consolidada con estado de cumplimiento global.

Todos los módulos de cálculo están interconectados: la resistividad medida en
Wenner alimenta el diseño de malla, que alimenta tensiones, que considera el
conductor realmente seleccionado, etc. Editar cualquier parámetro aguas arriba
recalcula todo lo que depende de él.

También incluye pantallas de **maqueta** (sin backend real, claramente
marcadas en la UI): dashboard, gestión de proyectos, login/registro, gestión
de usuarios y roles, y planes de suscripción.

## Estado del proyecto

Este es un prototipo de validación de concepto, no un producto terminado.
Los algoritmos de ingeniería están verificados numéricamente (ver comentarios
de trazabilidad en el código, con cláusula normativa exacta de cada ecuación),
pero el código vive todo en un único archivo HTML de ~3300 líneas, sin tests
automatizados, sin TypeScript, sin linter, y sin separación de módulos.

## Por qué se migra a Claude Code

El archivo único ya superó el tamaño cómodo para seguir iterando con
edición de texto plano. Claude Code permite:

- Git real (commits, diff, revertir cambios con seguridad)
- Separar el código en módulos (motores de cálculo / componentes UI / estilos)
- Tests unitarios para los motores de cálculo
- Linter / TypeScript para atrapar errores antes de ejecutar
- Servidor de desarrollo con recarga en vivo

## Instrucciones para continuar en Claude Code

1. Abre esta carpeta en tu terminal y ejecuta `claude` (o ábrela desde la
   extensión de VS Code / la app de escritorio).

2. Como primer mensaje, dale este contexto:

   > "Tengo un prototipo de software de ingeniería en index.html (cálculo de
   > sistemas de puesta a tierra: Wenner, Schlumberger, malla, tensiones,
   > conductor, materiales). Léelo completo primero. Quiero que lo
   > reestructures en módulos separados (un archivo JS por motor de cálculo,
   > componentes de UI aparte, CSS aparte), conservando EXACTAMENTE la misma
   > lógica de cálculo — no cambies ninguna fórmula ni constante todavía.
   > Antes de mover nada, muéstrame la estructura de carpetas que propones."

3. Una vez migrada la estructura, pide que agregue tests unitarios para los
   motores de cálculo usando los valores de ejemplo ya presentes en el código
   (lecturas Wenner/Schlumberger de muestra, geometría de malla de muestra)
   como casos de referencia — esos valores ya fueron verificados.

4. Haz que trabaje con commits frecuentes y descriptivos para poder revertir
   con seguridad si algo se rompe.

## Normas de referencia implementadas (con cálculo real)

- IEEE Std 80-2013 — "IEEE Guide for Safety in AC Substation Grounding"
- IEEE Std 81-2012 — "IEEE Guide for Measuring Earth Resistivity, Ground
  Impedance, and Earth Surface Potentials of a Grounding System"

Otras normas (IEC 60364, NFPA 70, SEC/RIC, RETIE, REBT, NBR 5419) aparecen
solo como catálogo de referencia visual en la pestaña "Normas de Referencia",
sin cálculos reales detrás — están explícitamente marcadas como "no
implementado" en la interfaz.

## Advertencia

Este software es un prototipo de validación técnica, no reemplaza una memoria
de cálculo firmada por un ingeniero eléctrico competente. Los resultados
deben validarse profesionalmente antes de cualquier uso en construcción real.
