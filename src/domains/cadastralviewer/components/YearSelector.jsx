import { IMAGERY_BY_YEAR } from '../data/wmsConfig';

// Horizontal year selector for satellite imagery.
export default function YearSelector({ currentYear, onChange }) {
  return (
    <div className="vc-year-bar">
      <div className="vc-yl">Año<b>imagen</b></div>
      <div className="vc-years">
        {IMAGERY_BY_YEAR.map(({ year }) => (
          <button
            key={year}
            type="button"
            className={`vc-year ${year === currentYear ? 'active' : ''}`}
            onClick={() => onChange(year)}
          >
            {year}
          </button>
        ))}
      </div>
    </div>
  );
}