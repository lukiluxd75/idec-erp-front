import { lazy } from 'react';

// This file exports route metadata, so its lazy page is not a Fast Refresh boundary.
// eslint-disable-next-line react-refresh/only-export-components
const KioskPage = lazy(() => import('./pages/KioskPage'));
// eslint-disable-next-line react-refresh/only-export-components
const CadastralViewerAdminPage = lazy(() => import('./pages/CadastralViewerAdminPage'));

/** Authenticated routes for the Cadastral Viewer domain. */
export const cadastralViewerRoutes = [
  {
    path: '/kiosk',
    element: <KioskPage />
  },
];

export const cadastralViewerAdminRoutes = [
  {
    path: '/cadastralviewer/admin',
    element: <CadastralViewerAdminPage />,
    wide: true,
  },
];

export default cadastralViewerRoutes;