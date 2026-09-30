import { SEARCH_FIELDS } from '../data/prediosSample';

// Escapes HTML entities to prevent XSS when injecting user query into results.
export function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

// Wraps the matched substring in <em>...</em> for visual highlighting.
export function highlightMatch(text, query) {
  if (!query) return escapeHtml(text);
  const i = text.toLowerCase().indexOf(query.toLowerCase());
  if (i < 0) return escapeHtml(text);
  return (
    escapeHtml(text.slice(0, i)) +
    '<em>' + escapeHtml(text.slice(i, i + query.length)) + '</em>' +
    escapeHtml(text.slice(i + query.length))
  );
}

// Scores a property against a search term.
// Exact match > starts-with > contains. The highest weighted field wins.
export function scoreProperty(property, term) {
  let best = { score: 0, field: null };
  for (const field of SEARCH_FIELDS) {
    const value = String(property[field.key] || '').toLowerCase();
    let score = 0;
    if (value === term)                score = 100 * field.weight;
    else if (value.startsWith(term))   score = 60  * field.weight;
    else if (value.includes(term))     score = 25  * field.weight;
    if (score > best.score) best = { score, field: field.key };
  }
  return best;
}

// Filters and ranks properties by relevance. Returns up to `limit` results.
export function searchProperties(properties, query, limit = 30) {
  const term = query.trim().toLowerCase();
  if (!term) return [];
  return properties
    .map((p) => ({ property: p, ...scoreProperty(p, term) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}