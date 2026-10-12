import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { useStockDataProvider, useTheme } from '@/app/providers';
import { DataTimestamp } from '@/components/data-display/DataTimestamp';
import { PageSkeleton } from '@/components/feedback/PageSkeleton';
import { StockSearch } from '@/components/layout/StockSearch';
import { PROVENANCE_NOTE } from '@/domain/config';
import { formatGeneratedAt } from '@/domain/metrics/format';
import { useAsync } from '@/lib/useAsync';

const LINKS = [
  { to: '/market', label: 'Market', end: true },
  { to: '/screener', label: 'Screener', end: true },
  { to: '/watchlist', label: 'Watchlist', end: true },
  { to: '/extras', label: 'Extras', end: true },
];

export function AppShell() {
  const provider = useStockDataProvider();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const manifest = useAsync(() => provider.getManifest(), [provider]);
  const universe = useAsync(() => provider.getUniverse(), [provider]);
  const onStock = location.pathname.startsWith('/stocks');

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      event.preventDefault();
      document.getElementById('stock-search')?.focus();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="shell">
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="topbar">
        <div className="topbar-row">
          <Link className="brand" to="/market">
            <span className="brand-mark" aria-hidden="true">SR</span>
            <span>
              <span className="brand-name">Stock Research</span>
              <span className="brand-tag">US large and mega cap</span>
            </span>
          </Link>
          <button
            type="button"
            className="menu-button"
            aria-expanded={menuOpen}
            aria-controls="primary-nav"
            onClick={() => setMenuOpen((open) => !open)}
          >
            Menu
          </button>
          <nav id="primary-nav" className={menuOpen ? 'primary-nav is-open' : 'primary-nav'} aria-label="Primary">
            {LINKS.slice(0, 2).map((link) => (
              <NavLink key={link.to} to={link.to} end={link.end} className={({ isActive }) => isActive ? 'nav-link is-active' : 'nav-link'}>
                {link.label}
              </NavLink>
            ))}
            <Link to="/stocks/AAPL" className={onStock ? 'nav-link is-active' : 'nav-link'} aria-current={onStock ? 'page' : undefined}>
              Stock
            </Link>
            {LINKS.slice(2).map((link) => (
              <NavLink key={link.to} to={link.to} end={link.end} className={({ isActive }) => isActive ? 'nav-link is-active' : 'nav-link'}>
                {link.label}
              </NavLink>
            ))}
          </nav>
          <div className="topbar-tools">
            {universe.status === 'ready' && universe.data ? <StockSearch stocks={universe.data} /> : <div className="search search-pending">Search loading</div>}
            <button
              type="button"
              className="text-button"
              aria-pressed={theme === 'dark'}
              aria-label={theme === 'dark' ? 'Dark theme is on' : 'Light theme is on'}
              onClick={toggleTheme}
            >
              {theme === 'dark' ? 'Dark theme' : 'Light theme'}
            </button>
          </div>
        </div>
        <div className="freshness">
          <span className="pill">Mock snapshot</span>
          {manifest.status === 'ready' && manifest.data ? (
            <>
              <DataTimestamp asOf={manifest.data.marketDate} />
              <span className="muted">Generated {formatGeneratedAt(manifest.data.generatedAt)}</span>
            </>
          ) : (
            <span className="muted">Loading snapshot time</span>
          )}
        </div>
      </header>
      <main id="main" className="page">
        <Outlet />
      </main>
      <footer className="site-footer">
        <p>{PROVENANCE_NOTE}</p>
        <p>Peer sample sizes illustrate cohort rules and can be larger than the 36 names drawn in the screener. There is no combined buy score.</p>
      </footer>
    </div>
  );
}

export function RouteFallback() {
  return <PageSkeleton />;
}
