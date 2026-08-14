import { Link, Outlet } from "@tanstack/react-router";

export function RootLayout() {
  return (
    <div className="app-shell">
      <header className="site-header">
        <nav className="site-nav" aria-label="Primary navigation">
          <Link className="site-nav__brand" to="/">
            Vault
          </Link>
          <div className="site-nav__links"></div>
        </nav>
      </header>
      <main id="main-content">
        <Outlet />
      </main>
    </div>
  );
}
