import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight, Plus, Wallet as WalletIcon } from 'lucide-react';
import { walletApi } from '../api/client';
import { formatMoney, shortId } from '../utils/format';

export function DashboardPage() {
  const { data: wallets, isLoading, isError } = useQuery({
    queryKey: ['wallets'],
    queryFn: walletApi.getWallets,
  });

  const safeWallets = Array.isArray(wallets) ? wallets : [];
  const totalBalance = safeWallets.reduce((sum, w) => sum + Number.parseFloat(w.balance), 0);

  if (isLoading) {
    return <div className="text-slate-500 text-sm">Loading wallets...</div>;
  }

  if (isError) {
    return (
      <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
        Failed to connect to the Wallet Ledger API. Make sure Spring Boot is running on port 8080.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Total Wallets</p>
          <p className="text-2xl font-semibold text-slate-900 mt-1 tabular-nums">
            {wallets?.length ?? 0}
          </p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Total Ledger Balance
          </p>
          <p className="text-2xl font-semibold text-slate-900 mt-1 tabular-nums">
            {formatMoney(totalBalance)}
          </p>
        </div>
      </div>

      {!wallets || wallets.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <WalletIcon className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900">No wallets yet</h3>
          <p className="text-sm text-slate-500 mt-1 mb-5">
            Create your first wallet to fund balances and test atomic transfers.
          </p>
          <Link
            to="/wallets/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" />
            Create wallet
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {wallets.map((wallet) => (
            <div
              key={wallet.id}
              className="bg-white rounded-xl border border-slate-200 p-5 flex items-center justify-between hover:border-indigo-300 transition"
            >
              <div>
                <h3 className="font-semibold text-slate-900">{wallet.owner}</h3>
                <p className="text-xs font-mono text-slate-500 mt-0.5">ID: {shortId(wallet.id)}</p>
                <p className="text-xl font-semibold text-slate-900 mt-3 tabular-nums">
                  {formatMoney(wallet.balance)}
                </p>
              </div>
              <Link
                to={`/wallets/${wallet.id}`}
                className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
              >
                View wallet
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
