// Instructions block explaining how to use the viewer.
// UI text stays in Spanish (product language). Comments stay in English.

const STEPS = [
  { icon: '🗺️', title: '1. Abre el mapa',    text: 'Toca cualquier parte de esta pantalla y se abrirá el visor satelital.' },
  { icon: '🔍', title: '2. Busca tu predio', text: <>Escribe el <b>código catastral</b> o la <b>dirección</b> en el mismo campo.</> },
  { icon: '🕓', title: '3. Cambia el año',   text: 'Desliza la barra de años para comparar la imagen satelital histórica (1964 – 2023).' },
  { icon: '📄', title: '4. Revisa la ficha', text: 'Toca el marcador y verás área, uso de suelo, estrato y año de construcción.' }
];

export default function HowToUse() {
  return (
    <section className="vc-howto">
      <h1>¿Cómo usar <em>el programa</em>?</h1>
      <p className="vc-howto-sub">
        Consulta cualquier predio del municipio en cuatro pasos.
        Solo necesitas el código catastral o la dirección.
      </p>

      <ol className="vc-steps">
        {STEPS.map((step) => (
          <li key={step.title}>
            <div className="vc-step-ico">{step.icon}</div>
            <div className="vc-step-txt">
              <strong>{step.title}</strong>
              <span>{step.text}</span>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}