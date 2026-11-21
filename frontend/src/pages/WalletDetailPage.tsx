import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, CheckCircle2, Plus } from 'lucide-react';
import { walletApi } from '../api/client';
import { formatDateTime, formatMoney } from '../utils/format';
import { TopUpModal } from '../components/TopUpModal';

export function WalletDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [page, setPage] = useState(0);
  const [showTopUp, setShowTopUp] = useState(false);

  const walletQuery = useQuery({
    queryKey: ['wallet', id],
    queryFn: () => walletApi.getWallet(id!),
    enabled: Boolean(id),
  });

  const txQuery = useQuery({
    queryKey: ['transactions', id, page],
    queryFn: () => walletApi.getTransactions(id!, page, 10),
    enabled: Boolean(id),
  });

  if (walletQuery.isLoading) {
    return <div className="text-sm text-slate-500">Loading wallet details...</div>;
  }

  if (walletQuery.isError || !walletQuery.data) {
    return (
      <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
        Wallet not found or failed to load.
      </div>
    );
  }

  const wallet = walletQuery.data;

  return (
    <div className="space-y-6">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900">
        <ArrowLeft className="w-4 h-4" />
        All wallets
      </Link>

      {location.state?.createdToast && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          Wallet created successfully. Add funds to start transferring.
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{wallet.owner}’s Wallet</h1>
          <p className="text-xs font-mono text-slate-500 mt-1">ID: {wallet.id}</p>
        </div>

        <div className="sm:text-right">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Available balance</p>
          <p className="text-3xl font-bold text-slate-900 mt-0.5 tabular-nums">
            {formatMoney(wallet.balance)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setShowTopUp(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700"
        >
          <Plus className="w-4 h-4" />
          Add money
        </button>
        <Link
          to={`/transfer?from=${wallet.id}`}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <ArrowUpRight className="w-4 h-4" />
          Send money
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-900">Transaction history</h2>
        </div>

        {txQuery.isLoading ? (
          <div className="p-6 text-sm text-slate-500">Loading ledger entries...</div>
        ) : !txQuery.data || txQuery.data.content.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No transactions recorded for this wallet yet.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-medium uppercase tracking-wider text-slate-500 bg-slate-50">
                    <th className="py-3 px-6">Date</th>
                    <th className="py-3 px-6">Type</th>
                    <th className="py-3 px-6">Description</th>
                    <th className="py-3 px-6 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {txQuery.data.content.map((tx) => {
                    const isCredit = tx.type === 'CREDIT';
                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/70">
                        <td className="py-3.5 px-6 text-slate-600 whitespace-nowrap">
                          {formatDateTime(tx.createdAt)}
                        </td>
                        <td className="py-3.5 px-6">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              isCredit
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {tx.type}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-slate-800">{tx.description}</td>
                        <td
                          className={`py-3.5 px-6 text-right font-medium tabular-nums whitespace-nowrap ${
                            isCredit ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {isCredit ? '+' : '-'}
                          {formatMoney(tx.amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {txQuery.data.totalPages > 1 && (
              <div className="px-6 py-3 border-t border-slate-200 flex items-center justify-between text-sm">
                <span className="text-slate-500">
                  Page {txQuery.data.page + 1} of {txQuery.data.totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                    className="px-3 py-1 rounded border border-slate-300 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    disabled={page + 1 >= txQuery.data.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1 rounded border border-slate-300 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showTopUp && (
        <TopUpModal
          walletId={wallet.id}
          ownerName={wallet.owner}
          onClose={() => setShowTopUp(false)}
        />
      )}
    </div>
  );
}