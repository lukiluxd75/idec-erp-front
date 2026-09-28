import { useMemo, useRef, useState } from 'react';
import { SAMPLE_PROPERTIES, SEARCH_FIELDS } from '../data/prediosSample';
import { highlightMatch, searchProperties } from '../utils/searchUtils';

// Unified search: cadastral code, address, and neighborhood in one input.
export default function SearchBar({ onSelectProperty }) {
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const inputRef = useRef(null);

  const results = useMemo(
    () => searchProperties(SAMPLE_PROPERTIES, query),
    [query]
  );

  const handleClear = () => {
    setQuery('');
    setShowResults(false);
    inputRef.current?.focus();
  };

  const handleSelect = (property) => {
    setQuery(property.cadastralCode);
    setShowResults(false);
    onSelectProperty(property);
  };

  return (
    <div className="vc-search-box">
      <div className="vc-input-row">
        <span className="vc-ico">🔍</span>
        <input
          ref={inputRef}
          type="text"
          autoComplete="off"
          placeholder="Código catastral, calle o barrio…"
          value={query}
          onChange={(e) => {
            const nextQuery = e.target.value;
            setQuery(nextQuery);
            setShowResults(Boolean(nextQuery.trim()));
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && results.length > 0) {
              handleSelect(results[0].property);
            }
          }}
        />
        <button
          type="button"
          className={`vc-clear ${query ? 'on' : ''}`}
          onClick={handleClear}
          aria-label="Limpiar"
        >✕</button>
      </div>

      {showResults && (
        <div className="vc-results">
          {results.length === 0 ? (
            <div className="vc-res-empty">
              <b>Sin resultados para «{query}»</b>
              Prueba con otra palabra, o con parte del código catastral.
            </div>
          ) : (
            results.map(({ property, field }) => {
              const fieldConfig = SEARCH_FIELDS.find((f) => f.key === field);
              const primary = property[field];
              const secondary = field === 'cadastralCode'
                ? `${property.address} · ${property.neighborhood}`
                : field === 'address'
                  ? `${property.cadastralCode} · ${property.neighborhood}`
                  : `${property.address} · ${property.cadastralCode}`;

              return (
                <div
                  key={property.cadastralCode}
                  className="vc-res-item"
                  onClick={() => handleSelect(property)}
                >
                  <div className={`vc-res-ico ${fieldConfig.isAddress ? 'is-dir' : ''}`}>
                    {fieldConfig.icon}
                  </div>
                  <div className="vc-res-txt">
                    <strong
                      dangerouslySetInnerHTML={{ __html: highlightMatch(primary, query) }}
                    />
                    <span>{secondary}</span>
                  </div>
                  <span className={`vc-res-tag ${fieldConfig.isAddress ? 'is-dir' : ''}`}>
                    {fieldConfig.label}
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}