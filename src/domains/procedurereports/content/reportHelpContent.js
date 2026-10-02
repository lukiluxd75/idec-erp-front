/**
 * Textos de ayuda (UI en español) para interpretar el reporte gerencial.
 * Una sola fuente para la guía general y los hints por sección.
 */

export const REPORT_GUIDE_SECTIONS = [
  {
    id: 'filters',
    title: 'Filtros',
    summary:
      'Acota el universo de trámites y funcionarios. El reporte solo cuenta salidas y pendientes que cumplan comuna, fechas y tipos seleccionados.',
  },
  {
    id: 'executive',
    title: 'Cuadro ejecutivo',
    summary:
      'Síntesis automática del período: volumen, variación respecto al mes anterior equivalente, SLA promedio y alertas de backlog envejecido.',
  },
  {
    id: 'kpis',
    title: 'Indicadores (KPI)',
    summary:
      'Números clave del período y de la bandeja actual. Úsalos para comparar ritmo, carga y tamaño del equipo filtrado.',
  },
  {
    id: 'sla',
    helpId: 'slaStrip',
    title: 'SLA y variación',
    summary:
      'Días entre ingreso a bandeja y salida (solo trámites despachados en el período). La variación compara con un rango anterior de igual duración.',
  },
  {
    id: 'groups',
    helpId: 'procedureGroups',
    title: 'Certificaciones vs RC',
    summary:
      'Agrupa tipos de trámite en familias gerenciales para ver si el esfuerzo del mes fue en certificaciones o registros catastrales.',
  },
  {
    id: 'backlogAging',
    title: 'Antigüedad del backlog',
    summary:
      'Pendientes de hoy clasificados por días desde el ingreso. Barras altas en tramos largos indican riesgo de demora.',
  },
  {
    id: 'districts',
    helpId: 'districtComparison',
    title: 'Comparativa por comuna',
    summary:
      'Suma despachos, trámites y pendientes por comuna cuando el filtro incluye más de un área.',
  },
  {
    id: 'ranking',
    title: 'Ranking y ritmo diario',
    summary:
      'Quién despachó más en el período y cómo se repartió el trabajo día a día entre funcionarios activos.',
  },
  {
    id: 'detail',
    helpId: 'estimateByPerson',
    title: 'Tablas de detalle',
    summary:
      'Matrices, pendientes y calendarios por persona para auditoría operativa; las filas resaltadas marcan outliers.',
  },
]

export const REPORT_HELP = {
  filters: {
    title: 'Cómo usar los filtros',
    body: 'El reporte lee la base catastral de cartografía. Cada cambio de filtro vuelve a calcular todo el tablero.',
    bullets: [
      'Desde / Hasta: solo cuentan salidas de bandeja con fecha de salida dentro del rango (días hábiles y fines de semana incluidos si hubo actividad).',
      'Comuna: limita a funcionarios activos de esa comuna. «Todas las comunas» habilita la comparativa territorial.',
      'Tipos de trámite: restringe certificaciones y registros catastrales. «Todos los tipos» no aplica filtro por tipo.',
    ],
  },
  executive: {
    title: 'Cuadro ejecutivo',
    body: 'Resume en lenguaje gerencial lo más relevante del período filtrado.',
    bullets: [
      'La primera línea destaca volumen o variación frente al período anterior (misma cantidad de días).',
      'Las viñetas siguientes mencionan SLA promedio, backlog envejecido (>30 días) y mix Certificaciones / RC cuando aplica.',
      'El banner amarillo debajo detalla quién concentra los pendientes si hay outliers en bandeja.',
    ],
  },
  kpis: {
    title: 'Indicadores principales',
    body: 'Cada tarjeta responde una pregunta distinta; no confundir «salidas» con «trámites distintos».',
    bullets: [
      'Salidas de bandeja: movimientos de salida registrados (un trámite puede salir más de una vez si reingresa).',
      'Trámites distintos: cantidad única de trámites despachados en el período.',
      'Equipo / día hábil: total de salidas en días laborables (lun–vie) ÷ cantidad de esos días con datos en el calendario del equipo.',
      'SLA prom. (días): promedio de días entre ingreso y salida de las salidas del período (requiere fecha de ingreso).',
      'Pendientes actuales: trámites sin fecha de salida hoy, del filtro de comuna/tipo (no dependen del rango de fechas).',
      'Funcionarios: personas activas en cartografía que entraron en el filtro de comuna.',
    ],
  },
  slaStrip: {
    title: 'SLA y comparación con el período anterior',
    body: 'Complementa los KPI con el detalle del SLA y la tendencia de volumen.',
    bullets: [
      'SLA promedio: incluye mínimo, máximo y tamaño de muestra (n = salidas con fechas válidas).',
      'Variación en verde/rojo: diferencia absoluta y porcentual vs el período inmediatamente anterior de igual longitud.',
      'Si no hay salidas en el período anterior, el porcentual puede no mostrarse.',
    ],
  },
  procedureGroups: {
    title: 'Mix Certificaciones / Registros catastrales',
    body: 'Suma despachos del período por familia de trámite.',
    bullets: [
      'El porcentaje indica qué parte del volumen total del período corresponde a esa familia.',
      'Sirve para explicar picos de carga (por ejemplo, muchos RC de actualización vs certificaciones Ley 247).',
    ],
  },
  backlog: {
    title: 'Mensaje de backlog',
    body: 'Describe la bandeja pendiente al momento de generar el reporte.',
    bullets: [
      'Outliers: funcionarios con pendientes muy altos respecto al resto (regla automática del sistema).',
      'No sustituye la antigüedad del backlog: un pendiente reciente y uno viejo cuentan igual aquí; use el gráfico de antigüedad para priorizar.',
    ],
  },
  backlogAging: {
    title: 'Antigüedad del backlog',
    body: 'Solo trámites pendientes hoy, medidos desde su fecha de ingreso a bandeja.',
    bullets: [
      '0–7 días: ingresos recientes; 8–15 y 16–30: seguimiento normal; 31–60 y más de 60: priorizar revisión gerencial.',
      'Las barras muestran conteo por tramo; el total puede ser menor que «Pendientes actuales» si algunos no tienen fecha de ingreso.',
    ],
  },
  districtComparison: {
    title: 'Comparativa por comuna',
    body: 'Agrega el ranking de funcionarios por comuna de pertenencia.',
    bullets: [
      'Salidas y trámites: producción en el período filtrado. Pendientes: bandeja actual de esos funcionarios.',
      'Compare comunas con similar cantidad de funcionarios para evitar conclusiones sesgadas.',
    ],
  },
  slaByType: {
    title: 'SLA por tipo de trámite',
    body: 'Promedio de días ingreso → salida en el período, desglosado por tipo.',
    bullets: [
      'Tipos con pocos casos pueden tener promedios inestables; mire también la columna Salidas.',
      'Un SLA alto no implica error: algunos trámites tienen plazos legales o técnicos distintos.',
    ],
  },
  slaByStaff: {
    title: 'SLA por funcionario',
    body: 'Solo incluye funcionarios con al menos 3 salidas en el período (mínimo estadístico).',
    bullets: [
      'Compare dentro del mismo tipo de trabajo; mezclar comunas distintas puede distorsionar.',
      'Use junto con el ranking de despachos: alto volumen con SLA bajo suele ser buena productividad.',
    ],
  },
  criticalPending: {
    title: 'Pendientes críticos',
    body: 'Los 25 trámites pendientes más antiguos (menor fecha de ingreso).',
    bullets: [
      'Columna Días: antigüedad desde el ingreso hasta hoy.',
      'Filas resaltadas: 60 días o más en bandeja; conviene gestión prioritaria.',
    ],
  },
  ranking: {
    title: 'Ranking de despachos',
    body: 'Funcionarios ordenados por cantidad de salidas en el período.',
    bullets: [
      'Un despacho = una salida de bandeja registrada en el rango de fechas.',
      'Quien no aparece o tiene barra cero no registró salidas en el período (puede tener pendientes igualmente).',
    ],
  },
  dailyChart: {
    title: 'Ritmo del equipo por día',
    body: 'Barras apiladas por día; cada color es un funcionario.',
    bullets: [
      'La línea de referencia es el promedio de salidas en días hábiles del equipo.',
      'Caídas en días puntuales pueden ser feriados, capacitación o carga en otras unidades (no lo distingue el reporte).',
    ],
  },
  byType: {
    title: 'Trámites por tipo',
    body: 'Distribución del volumen de salidas en el período.',
    bullets: [
      'La torta usa la misma paleta de colores que los chips de filtro.',
      'Compare con el mix Certificaciones/RC para validar que no falte ningún tipo relevante en el filtro.',
    ],
  },
  typeStaffMatrix: {
    title: 'Despachos por tipo y funcionario',
    body: 'Matriz quién trabajó qué tipo de trámite en el período.',
    bullets: [
      'Celdas vacías: ese funcionario no despachó ese tipo en el rango.',
      'Útil para balancear especialización y detectar cuellos de botella por tipo.',
    ],
  },
  estimateByPerson: {
    title: 'Estimado por persona',
    body: 'Ritmo de despacho normalizado por días con actividad y por calendario hábil.',
    bullets: [
      'Por día que despachó: despachos ÷ días con al menos una salida (ritmo real cuando trabajó).',
      'Sobre N hábiles: despachos ÷ días laborables del calendario del período (incluye días sin actividad).',
      'Borde verde: alto desempeño vs el líder; ámbar: muchos pendientes; rojo: cero despachos en el período.',
    ],
  },
  pendingTable: {
    title: 'Tabla de pendientes',
    body: 'Instantánea de bandeja al generar el reporte (no filtrada por fechas del período).',
    bullets: [
      'Ordene mentalmente por pendientes altos para alinear con el mensaje de backlog.',
      'Resaltado ámbar: funcionario con pendientes elevados según reglas del reporte.',
    ],
  },
  dailyDetail: {
    title: 'Detalle día por persona',
    body: 'Calendario de salidas por funcionario en dos quincenas del mes del filtro.',
    bullets: [
      'Cada celda muestra cantidad de despachos ese día; vacío = sin salidas.',
      'Solo aparecen funcionarios con al menos un despacho en el período.',
    ],
  },
  colorsLegend: {
    title: 'Colores por funcionario',
    body: 'Paleta consistente en ranking, gráfico diario y torta cuando aplica.',
    bullets: [
      'Facilita seguir a la misma persona entre gráficos sin releer nombres.',
    ],
  },
}
