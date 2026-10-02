// Instructions block explaining how to use the viewer.
// UI text stays in Spanish (product language). Comments stay in English.

const STEPS = [
  { icon: '🗺️', title: '1. Abre el mapa', text: 'Toca cualquier parte de esta pantalla para abrir el visor interactivo.' },
  { icon: '🔍', title: '2. Busca lo que necesitas', text: <>Usa los botones laterales para buscar <b>calles y predios</b>, o <b>trámites</b>.</> },
  { icon: '🕓', title: '3. Cambia el año', text: 'Compara imágenes satelitales históricas disponibles entre 1964 y 2023.' },
  { icon: '📄', title: '4. Revisa la información', text: 'Toca un resultado para consultar los detalles del predio o del trámite.' }
];

export default function HowToUse() {
  return (
    <section className="vc-howto">
      <h1>¿Cómo usar <em>el programa</em>?</h1>
      <p className="vc-howto-sub">
        Consulta predios, calles y trámites del municipio desde un mismo lugar.
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