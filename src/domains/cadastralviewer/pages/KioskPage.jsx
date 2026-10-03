import { useEffect, useState } from 'react';
import './KioskPage.css';
import { useTheme } from '../hooks/useTheme';
import KioskHeader from '../components/KioskHeader';
import VideoAd from '../components/VideoAd';
import HowToUse from '../components/HowToUse';
import MapOverlay from '../components/MapOverlay';
import AdManager from '../components/AdManager';

// Entry point for the /kiosk route. Owns the whole vertical layout.
export default function KioskPage() {
  const { theme, toggleTheme } = useTheme();
  const [activeSection, setActiveSection] = useState('client');
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [adMedia, setAdMedia] = useState(null);
  const [uploadError, setUploadError] = useState('');

  useEffect(() => () => {
    if (adMedia?.source) URL.revokeObjectURL(adMedia.source);
  }, [adMedia]);

  const handleAdUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('video/') && !/\.(mp4|webm|mov|m4v|ogg)$/i.test(file.name)) {
      setUploadError('Seleccione un archivo de video válido.');
      event.target.value = '';
      return;
    }
    setAdMedia({ file, source: URL.createObjectURL(file) });
    setUploadError('');
  };

  const handleClearAd = () => setAdMedia(null);

  const handleContentClick = (event) => {
    if (isMapOpen) return;
    if (event.target.closest('button')) return;
    if (event.target.closest('video')) return;
    if (event.target.closest('.vc-ad-card')) return;
    if (event.target.closest('a')) return;
    setIsMapOpen(true);
  };

  const handleCloseMap = () => {
    setIsMapOpen(false);
    setSelectedProperty(null);
  };

  return (
    <div className="vc-root">
      <div className="vc-kiosk">
        <KioskHeader
          theme={theme}
          onToggleTheme={toggleTheme}
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />

        <main className={`vc-content ${activeSection === 'ads' ? 'is-admin' : ''}`} onClick={activeSection === 'client' ? handleContentClick : undefined}>
          {activeSection === 'client' ? (
            <>
              <VideoAd source={adMedia?.source} title={adMedia?.file.name} />
              <HowToUse />
              <div className="vc-tap-hint">
                Toque cualquier parte para abrir el mapa
                <small>Datos catastrales de Cochabamba</small>
              </div>
              <div className="vc-foot">Visor Catastral · Gobierno Autónomo Municipal de Cochabamba</div>
            </>
          ) : (
            <AdManager media={adMedia} error={uploadError} onUpload={handleAdUpload} onClear={handleClearAd} />
          )}
        </main>

        <MapOverlay
          visible={isMapOpen}
          onClose={handleCloseMap}
          selectedProperty={selectedProperty}
          onSelectProperty={setSelectedProperty}
        />
      </div>
    </div>
  );
}