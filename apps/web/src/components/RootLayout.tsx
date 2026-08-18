import { Link, Outlet } from "@tanstack/react-router";
import logoUrl from "../assets/logo.svg";

export function RootLayout() {
  return (
    <div className="mx-auto min-h-svh w-full max-w-6xl px-5 sm:px-8 lg:px-10">
      <header className="border-b border-ink/80">
        <nav
          className="flex min-h-[4.5rem] items-center justify-between gap-4 sm:min-h-20"
          aria-label="Primary navigation"
        >
          <Link
            aria-label="Uplody home"
            className="inline-flex size-11 items-center justify-center rounded-xl transition-transform duration-200 hover:scale-105"
            to="/"
          >
            <img
              alt=""
              className="size-10 rounded-[0.65rem]"
              height="40"
              src={logoUrl}
              width="40"
            />
            <span className="sr-only">Uplody</span>
          </Link>
          <button
            aria-label="Open navigation menu"
            className="flex size-11 cursor-pointer flex-col items-center justify-center gap-[5px] border-0 bg-transparent text-ink"
            type="button"
          >
            <span className="block h-px w-6 bg-current" />
            <span className="block h-px w-6 bg-current" />
            <span className="block h-px w-6 bg-current" />
          </button>
        </nav>
      </header>
      <main className="pb-12 sm:pb-16" id="main-content">
        <Outlet />
      </main>
    </div>
  );
}
