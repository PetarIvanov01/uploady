import { Link, Outlet } from "@tanstack/react-router";

export function RootLayout() {
  return (
    <>
      <header className="border-b border-slate-200">
        <nav className="mx-auto flex max-w-5xl gap-6 px-6 py-4">
          <Link to="/" activeProps={{ className: "font-semibold" }}>
            Home
          </Link>
          <Link to="/about" activeProps={{ className: "font-semibold" }}>
            About
          </Link>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-12">
        <Outlet />
      </main>
    </>
  );
}
