import type { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DashboardPage } from './pages/DashboardPage';
import { CreateWalletPage } from './pages/CreateWalletPage';
import { TransferPage } from './pages/TransferPage';
import { WalletDetailPage } from './pages/WalletDetailPage';
import { LoginPage } from './pages/LoginPage';

const queryClient = new QueryClient();

function RequireAuth({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const qc = useQueryClient();

  const handleLogout = () => {
    qc.clear();
    logout();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 font-bold text-slate-900 text-lg">
            <span>Wallet Ledger</span>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              INR
            </span>
          </Link>

          <div className="flex items-center gap-3">
            {user && (
              <span className="text-sm text-slate-600 hidden sm:inline">
                {user.name}
              </span>
            )}
            <Link
              to="/transfer"
              className="px-3.5 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50"
            >
              Transfer money
            </Link>
            <Link
              to="/wallets/new"
              className="px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
            >
              + Create wallet
            </Link>
            <button
              onClick={handleLogout}
              className="px-3 py-2 rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <RequireAuth>
                  <Layout>
                    <DashboardPage />
                  </Layout>
                </RequireAuth>
              }
            />
            <Route
              path="/wallets/new"
              element={
                <RequireAuth>
                  <Layout>
                    <CreateWalletPage />
                  </Layout>
                </RequireAuth>
              }
            />
            <Route
              path="/transfer"
              element={
                <RequireAuth>
                  <Layout>
                    <TransferPage />
                  </Layout>
                </RequireAuth>
              }
            />
            <Route
              path="/wallets/:id"
              element={
                <RequireAuth>
                  <Layout>
                    <WalletDetailPage />
                  </Layout>
                </RequireAuth>
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;