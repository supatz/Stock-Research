import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router';
import { RouteFallback, AppShell } from '@/components/layout/AppShell';

const MarketPage = lazy(() => import('@/features/market/MarketPage'));
const ScreenerPage = lazy(() => import('@/features/screener/ScreenerPage'));
const StockPage = lazy(() => import('@/features/stock/StockPage'));
const WatchlistPage = lazy(() => import('@/features/watchlist/WatchlistPage'));
const ExtrasPage = lazy(() => import('@/features/extras/ExtrasPage'));

export const routes = [
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/market" replace /> },
      { path: 'market', element: <Suspense fallback={<RouteFallback />}><MarketPage /></Suspense> },
      { path: 'screener', element: <Suspense fallback={<RouteFallback />}><ScreenerPage /></Suspense> },
      { path: 'stocks/:ticker', element: <Suspense fallback={<RouteFallback />}><StockPage /></Suspense> },
      { path: 'watchlist', element: <Suspense fallback={<RouteFallback />}><WatchlistPage /></Suspense> },
      { path: 'extras', element: <Suspense fallback={<RouteFallback />}><ExtrasPage /></Suspense> },
      {
        path: '*',
        element: (
          <div className="empty-state">
            <h1>Page not found</h1>
            <p>That route is not part of this research site.</p>
          </div>
        ),
      },
    ],
  },
];

const router = createBrowserRouter(routes);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
