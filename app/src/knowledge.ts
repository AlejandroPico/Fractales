import { FRACTALS } from './catalog';

export interface KnowledgeSection {
  id: string;
  title: string;
  html: string;
}

const fractalRows = FRACTALS.map((fractal) => `
  <article class="knowledge-fractal" data-dimension="${fractal.dimension}">
    <header><span>${fractal.dimension}</span><div><h3>${fractal.name}</h3><small>${fractal.family}</small></div></header>
    <p>${fractal.description}</p>
    <dl><div><dt>Definición</dt><dd>${fractal.formula}</dd></div><div><dt>Observación</dt><dd>${fractal.notes}</dd></div></dl>
  </article>`).join('');

export const KNOWLEDGE_SECTIONS: readonly KnowledgeSection[] = [
  {
    id: 'inicio',
    title: 'Qué es un fractal',
    html: `
      <h2>Qué es un fractal</h2>
      <p>Un fractal es una estructura geométrica o dinámica cuya complejidad persiste al cambiar de escala. No todos los fractales son exactamente autosimilares, pero muchos conservan patrones, densidades o reglas de construcción cuando se amplían.</p>
      <p>En un fractal matemático la imagen no es una fotografía almacenada. Cada píxel o cada rayo se calcula a partir de una fórmula. Por eso el navegador puede revelar detalle nuevo mientras exista precisión numérica suficiente.</p>
      <div class="knowledge-grid">
        <section><h3>Autosimilitud</h3><p>Partes de la figura recuerdan al conjunto completo. Puede ser exacta, estadística o aproximada.</p></section>
        <section><h3>Iteración</h3><p>Una regla se aplica repetidamente. El comportamiento acumulado produce la geometría visible.</p></section>
        <section><h3>Dimensión fractal</h3><p>Mide cómo crece el detalle al cambiar de escala. Puede no ser un número entero.</p></section>
        <section><h3>Frontera</h3><p>En conjuntos como Mandelbrot, la frontera concentra una complejidad inagotable.</p></section>
      </div>`
  },
  {
    id: 'matematicas',
    title: 'Fundamentos matemáticos',
    html: `
      <h2>Fundamentos matemáticos</h2>
      <h3>Números complejos</h3>
      <p>Un número complejo se escribe como <em>a + bi</em>. Puede interpretarse como un punto del plano: la parte real ocupa el eje horizontal y la imaginaria el vertical.</p>
      <h3>Escape y convergencia</h3>
      <p>Los fractales escape-time clasifican cada punto según el número de iteraciones necesarias para superar un radio. Los fractales de Newton clasifican los puntos según la raíz a la que convergen.</p>
      <h3>Estimadores de distancia</h3>
      <p>En 3D no se construye necesariamente una malla. Una función estima la distancia desde cualquier punto del espacio a la superficie. El ray marching avanza por el rayo usando esa distancia como paso seguro.</p>
      <h3>Precisión numérica</h3>
      <p>Un shader convencional suele trabajar con coma flotante de 32 bits. Esta versión utiliza aritmética <em>double-single</em> en los fractales 2D principales: cada número se representa mediante dos flotantes, ampliando de forma sustancial el rango útil de zoom.</p>`
  },
  {
    id: 'render',
    title: 'Cómo funciona el motor',
    html: `
      <h2>Cómo funciona el motor</h2>
      <h3>Render 2D</h3>
      <p>El fragment shader calcula cada píxel visible. La cámara se expresa mediante centro y escala. Durante el movimiento baja temporalmente la resolución interna; al detenerse aumenta la resolución y el número de iteraciones.</p>
      <h3>Render 3D</h3>
      <p>Cada píxel lanza un rayo desde la cámara. El ray marching consulta repetidamente el estimador de distancia. Cuando la distancia es menor que el umbral de superficie, se calcula iluminación, normal, oclusión y niebla.</p>
      <h3>Navegación adaptativa</h3>
      <p>La velocidad 3D se multiplica por la distancia estimada a la superficie. En espacios abiertos el avance es rápido; cerca de una pared disminuye automáticamente para evitar atravesarla.</p>
      <h3>Refinado progresivo</h3>
      <p>El estado <strong>Navegación</strong> prioriza respuesta. <strong>Refinando</strong> aumenta resolución y profundidad matemática. <strong>Máxima definición</strong> emplea la configuración de calidad seleccionada.</p>`
  },
  {
    id: 'controles',
    title: 'Controles y ajustes',
    html: `
      <h2>Controles y ajustes</h2>
      <table class="knowledge-table"><tbody>
        <tr><th>W / S</th><td>Zoom 2D o avance y retroceso 3D.</td></tr>
        <tr><th>A / D</th><td>Desplazamiento horizontal.</td></tr>
        <tr><th>Q / E</th><td>Descenso y ascenso en 3D.</td></tr>
        <tr><th>Ratón</th><td>Orientación 3D o desplazamiento 2D al bloquear el puntero.</td></tr>
        <tr><th>Rueda</th><td>Ajusta la velocidad base.</td></tr>
        <tr><th>Shift</th><td>Aceleración temporal.</td></tr>
        <tr><th>Esc</th><td>Libera el puntero.</td></tr>
      </tbody></table>
      <h3>Ajustes visuales</h3>
      <ul>
        <li><strong>Detalle:</strong> aumenta las iteraciones 2D y la complejidad interna 3D.</li>
        <li><strong>Profundidad de rayos:</strong> número máximo de pasos del ray marching.</li>
        <li><strong>Precisión de superficie:</strong> reduce el umbral de impacto y revela microrelieve.</li>
        <li><strong>Potencia:</strong> cambia la potencia de Mandelbulb, Julia y Multibrot compatibles.</li>
        <li><strong>Paleta:</strong> desplaza la función cromática.</li>
        <li><strong>Exposición:</strong> modifica la respuesta luminosa final.</li>
      </ul>`
  },
  {
    id: 'catalogo',
    title: 'Catálogo interno',
    html: `<h2>Catálogo interno</h2><p>La biblioteca se organiza por dimensión y familia matemática. Cada entorno se calcula en tiempo real.</p><div class="knowledge-catalog">${fractalRows}</div>`
  },
  {
    id: 'glosario',
    title: 'Glosario avanzado',
    html: `
      <h2>Glosario avanzado</h2>
      <dl class="knowledge-glossary">
        <div><dt>Órbita</dt><dd>Secuencia de valores obtenida al iterar una función desde un punto inicial.</dd></div>
        <div><dt>Bailout</dt><dd>Radio o condición a partir de la cual una órbita se considera divergente.</dd></div>
        <div><dt>Coloración suave</dt><dd>Interpolación continua del tiempo de escape para evitar bandas duras.</dd></div>
        <div><dt>Orbit trap</dt><dd>Medida de la proximidad de una órbita a una figura auxiliar usada para colorear.</dd></div>
        <div><dt>Ray marching</dt><dd>Recorrido de un rayo mediante pasos calculados por un estimador de distancia.</dd></div>
        <div><dt>SDF / DE</dt><dd>Función de distancia firmada o estimador de distancia a una superficie.</dd></div>
        <div><dt>Double-single</dt><dd>Emulación de precisión extendida usando dos números de 32 bits para representar uno.</dd></div>
        <div><dt>Perturbación</dt><dd>Técnica de zoom extremo que calcula una órbita de referencia en alta precisión y aproxima puntos cercanos mediante diferencias.</dd></div>
      </dl>`
  }
] as const;
