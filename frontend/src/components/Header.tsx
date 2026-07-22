import { Link, useNavigate } from "react-router-dom";

export default function Header() {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 shadow-glow">
            <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
              <path d="M4 20V11a1 1 0 011-1h11a1 1 0 011 1v9" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round"/>
              <path d="M17 14h5l4 4v2h-9v-6z" stroke="#fff" strokeWidth="2" fill="none" strokeLinejoin="round"/>
              <circle cx="10" cy="22" r="2.2" fill="#fff"/>
              <circle cx="23" cy="22" r="2.2" fill="#fff"/>
            </svg>
          </div>
          <span className="text-lg font-bold tracking-tight text-navy-900">
            Trip<span className="text-brand-600">Pilot</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <a href="#plan" className="text-sm font-medium text-slate-600 transition-colors hover:text-navy-900">
            Plan a Trip
          </a>
          <a href="#how-it-works" className="text-sm font-medium text-slate-600 transition-colors hover:text-navy-900">
            How It Works
          </a>
          <a href="#compliance" className="text-sm font-medium text-slate-600 transition-colors hover:text-navy-900">
            HOS Compliance
          </a>
        </nav>

        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 sm:flex">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-xs font-semibold text-emerald-700">All systems operational</span>
          </div>
          <button
            onClick={() => {
              navigate("/");
              setTimeout(() => document.getElementById("plan")?.scrollIntoView({ behavior: "smooth" }), 50);
            }}
            className="btn-primary !px-4 !py-2 text-xs"
          >
            Plan My Trip
          </button>
        </div>
      </div>
    </header>
  );
}
