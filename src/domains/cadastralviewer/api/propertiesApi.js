// HTTP client for the Cadastral Viewer domain.

import { SAMPLE_PROPERTIES } from '../data/prediosSample';

// Search properties by cadastral code, address or neighborhood.
export async function fetchProperties(query) {

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
export async function fetchPropertyByCode(cadastralCode) {

  await new Promise((r) => setTimeout(r, 50));
  return SAMPLE_PROPERTIES.find((p) => p.cadastralCode === cadastralCode) || null;
}