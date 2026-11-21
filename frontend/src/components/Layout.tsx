import { Link, Outlet } from 'react-router-dom';
import { ArrowLeftRight, Plus, Wallet } from 'lucide-react';

export function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 text-slate-900 font-semibold text-lg">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
            <span>Wallet Ledger</span>
            <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">
              INR Demo
            </span>
          </Link>

          <nav className="flex items-center gap-3">
            <Link
              to="/transfer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition"
            >
              <ArrowLeftRight className="w-4 h-4" />
              Transfer money
            </Link>
            <Link
              to="/wallets/new"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition"
            >
              <Plus className="w-4 h-4" />
              Create wallet
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}