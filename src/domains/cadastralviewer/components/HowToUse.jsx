import React from 'react';

// Instructions block explaining how to use the viewer.
const STEPS = [
  { icon: '🗺️', title: '1. Abra el mapa', text: 'Toque cualquier parte de esta pantalla para abrir el visor interactivo satelital.' },
  { icon: '🔍', title: '2. Busque lo que necesita', text: <>Use los botones laterales o escriba el <b>código catastral</b> o la <b>dirección</b> para buscar predios, calles o <b>trámites</b>.</> },
  { icon: '🕓', title: '3. Cambie el año', text: 'Deslice la barra de años para comparar imágenes satelitales históricas disponibles entre 1964 y 2023.' },
  { icon: '📄', title: '4. Revise la información', text: 'Toque un resultado o marcador para consultar los detalles del trámite o la ficha del predio (área, uso de suelo, estrato, etc.).' }
];

export default function HowToUse() {
  return (
    <section className="vc-howto">
      <h1>¿Cómo usar <em>el programa</em>?</h1>
      <p className="vc-howto-sub">
        Consulte predios, calles y trámites del municipio desde un mismo lugar en cuatro pasos.
        Solo necesita el código catastral, la dirección o el número de trámite.
      </p>

      <ol className="vc-steps">
        {STEPS.map((step, index) => (
          <li key={index} className="vc-step">
            <div className="vc-step-icon">{step.icon}</div>
            <div className="vc-step-content">
              <strong>{step.title}</strong>
              <p>{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
