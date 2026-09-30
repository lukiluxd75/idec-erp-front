import logoUrl from '../../../assets/branding/logo-gamc-cocha.png';

// Top bar with section navigation, institutional logo and theme toggle.
export default function KioskHeader({ theme, onToggleTheme, activeSection, onSectionChange }) {
  return (
    <header className="vc-topbar">
      <div className="vc-topbar-main">
        <div className="vc-topbar-left" />
        <img src={logoUrl} alt="Logo GAMC Cochabamba" className="vc-logo" />
        <div className="vc-top-actions">
          <button
            type="button"
            className="vc-icon-btn"
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Cambiar a claro' : 'Cambiar a oscuro'}
            aria-label="Cambiar tema"
          >
            <span className="vc-i-sun">☀️</span>
            <span className="vc-i-moon">🌙</span>
          </button>
        </div>
      </div>

      <nav className="vc-kiosk-tabs" aria-label="Apartados del kiosco" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeSection === 'client'}
          className={activeSection === 'client' ? 'active' : ''}
          onClick={() => onSectionChange('client')}
        >Clientes</button>
        <button
          type="button"
          role="tab"
          aria-selected={activeSection === 'ads'}
          className={activeSection === 'ads' ? 'active' : ''}
          onClick={() => onSectionChange('ads')}
        >Publicidad</button>
      </nav>
    </header>
  );
}