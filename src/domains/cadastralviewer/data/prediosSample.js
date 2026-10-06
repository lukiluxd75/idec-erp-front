// Sample data used during development and as fallback when the backend is unavailable.

export const SAMPLE_PROPERTIES = [
  { cadastralCode: 'CBBA-001-234', address: 'Av. Ballivián # 345',     neighborhood: 'Cala Cala',   lat: -17.37620, lng: -66.16470, area: '412 m²',   landUse: 'Residencial',   stratum: '4', builtYear: '1998' },
  { cadastralCode: 'CBBA-002-118', address: 'Calle España # 120',      neighborhood: 'Centro',      lat: -17.39380, lng: -66.15690, area: '1.240 m²', landUse: 'Comercial',     stratum: '3', builtYear: '1975' },
  { cadastralCode: 'CBBA-003-789', address: 'Av. América # 456',       neighborhood: 'Queru Queru', lat: -17.38210, lng: -66.14730, area: '780 m²',   landUse: 'Residencial',   stratum: '5', builtYear: '2005' },
  { cadastralCode: 'CBBA-004-321', address: 'Av. Heroínas # 890',      neighborhood: 'Centro',      lat: -17.39120, lng: -66.15940, area: '2.100 m²', landUse: 'Institucional', stratum: '3', builtYear: '1992' },
  { cadastralCode: 'CBBA-005-654', address: 'Calle Jordán # 210',      neighborhood: 'Cala Cala',   lat: -17.37850, lng: -66.16180, area: '605 m²',   landUse: 'Residencial',   stratum: '4', builtYear: '2011' },
  { cadastralCode: 'CBBA-006-987', address: 'Av. Blanco Galindo km 3', neighborhood: 'Mayorazgo',   lat: -17.40260, lng: -66.18250, area: '3.400 m²', landUse: 'Industrial',    stratum: '2', builtYear: '1988' },
  { cadastralCode: 'CBBA-007-147', address: 'Calle Sucre # 555',       neighborhood: 'Centro',      lat: -17.39470, lng: -66.15820, area: '330 m²',   landUse: 'Mixto',         stratum: '3', builtYear: '2001' },
  { cadastralCode: 'CBBA-008-258', address: 'Av. Oquendo # 1234',      neighborhood: 'La Chimba',   lat: -17.38610, lng: -66.15080, area: '510 m²',   landUse: 'Residencial',   stratum: '4', builtYear: '1983' }
];

// Fields considered by the unified search, with their ranking weight.
export const SEARCH_FIELDS = [
  { key: 'cadastralCode', weight: 5, label: 'Código',    icon: '🏷️', isAddress: false },
  { key: 'address',       weight: 4, label: 'Dirección', icon: '📍', isAddress: true  },
  { key: 'neighborhood',  weight: 3, label: 'Barrio',    icon: '📍', isAddress: true  }
];