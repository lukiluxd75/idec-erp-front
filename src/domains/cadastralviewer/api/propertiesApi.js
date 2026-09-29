// HTTP client for the Cadastral Viewer domain.
// Uses sample data for now. When the backend is ready, swap the
// implementation inside each function without touching consumers.

import { SAMPLE_PROPERTIES } from '../data/prediosSample';

// Search properties by cadastral code, address or neighborhood.
// Endpoint will be GET /api/cadastral/properties?q=<query>
export async function fetchProperties(query) {
  // ▼ Uncomment when backend is ready:
  // const res = await fetch(`${API_BASE}/cadastral/properties?q=${encodeURIComponent(query)}`);
  // if (!res.ok) throw new Error('Failed to fetch properties');
  // return res.json();

  await new Promise((r) => setTimeout(r, 80));
  const term = query.trim().toLowerCase();
  if (!term) return [];
  return SAMPLE_PROPERTIES.filter((p) =>
    p.cadastralCode.toLowerCase().includes(term) ||
    p.address.toLowerCase().includes(term) ||
    p.neighborhood.toLowerCase().includes(term)
  );
}

// Fetch full detail for a single property.
// Endpoint will be GET /api/cadastral/properties/<cadastralCode>
export async function fetchPropertyByCode(cadastralCode) {
  // ▼ Uncomment when backend is ready:
  // const res = await fetch(`${API_BASE}/cadastral/properties/${cadastralCode}`);
  // if (!res.ok) throw new Error('Property not found');
  // return res.json();

  await new Promise((r) => setTimeout(r, 50));
  return SAMPLE_PROPERTIES.find((p) => p.cadastralCode === cadastralCode) || null;
}