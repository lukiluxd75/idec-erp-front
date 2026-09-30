import { lazy } from 'react';

// This file exports route metadata, so its lazy page is not a Fast Refresh boundary.
// eslint-disable-next-line react-refresh/only-export-components
const KioskPage = lazy(() => import('./pages/KioskPage'));

/**
 * Authenticated routes for the Cadastral Viewer domain.
 *
 * Mounted outside AppShell to keep the kiosk full-screen without sidebar or header.
 */
export const cadastralViewerRoutes = [
  {
    path: '/kiosk',
    element: <KioskPage />
  }
];

export default cadastralViewerRoutes;