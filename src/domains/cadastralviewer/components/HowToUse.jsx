// Instructions block explaining how to use the viewer.

const STEPS = [
  { icon: '🗺️', title: '1. Abra el mapa',    text: 'Toque cualquier parte de esta pantalla y se abrirá el visor satelital.' },
  { icon: '🔍', title: '2. Busque su predio', text: <>Escriba el <b>código catastral</b> o la <b>dirección</b> en el mismo campo.</> },
  { icon: '🕓', title: '3. Cambie el año',   text: 'Deslice la barra de años para comparar la imagen satelital histórica (1964 – 2023).' },
  { icon: '📄', title: '4. Revise la ficha', text: 'Toque el marcador y verá el área, el uso de suelo, el estrato y el año de construcción.' }
];

export default function HowToUse() {
  return (
    <section className="vc-howto">
      <h1>¿Cómo usar <em>el programa</em>?</h1>
      <p className="vc-howto-sub">
        Consulte cualquier predio del municipio en cuatro pasos.
        Solo necesita el código catastral o la dirección.
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