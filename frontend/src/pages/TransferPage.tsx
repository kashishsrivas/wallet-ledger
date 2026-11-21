import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CheckCircle2, RefreshCw } from 'lucide-react';
import { extractErrorMessage, walletApi } from '../api/client';
import { formatMoney, shortId } from '../utils/format';
import type { TransferResponse } from '../types/wallet';

const transferSchema = z
  .object({
    fromWalletId: z.string().min(1, 'Select a sender wallet'),
    toWalletId: z.string().min(1, 'Select a receiver wallet'),
    amount: z
      .string()
      .min(1, 'Amount is required')
      .regex(/^\d+(\.\d{1,4})?$/, 'Enter a positive amount with up to 4 decimal places')
      .refine((val) => Number.parseFloat(val) > 0, 'Amount must be greater than zero'),
  })
  .refine((data) => data.fromWalletId !== data.toWalletId, {
    message: 'Sender and receiver wallets must be different',
    path: ['toWalletId'],
  });

type TransferFormValues = z.infer<typeof transferSchema>;

export function TransferPage() {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => crypto.randomUUID());
  const [completedTransfer, setCompletedTransfer] = useState<TransferResponse | null>(null);
  const [errorState, setErrorState] = useState<{ message: string; isNetworkError: boolean } | null>(null);
  const [replayNotice, setReplayNotice] = useState<string | null>(null);

  const { data: wallets = [] } = useQuery({
    queryKey: ['wallets'],
    queryFn: walletApi.getWallets,
  });

  const {
    register,
    handleSubmit,
    watch,
    getValues,
    formState: { errors },
  } = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      fromWalletId: searchParams.get('from') || '',
      toWalletId: '',
      amount: '',
    },
  });

  const selectedFromId = watch('fromWalletId');
  const enteredAmount = watch('amount');
  const senderWallet = wallets.find((w) => w.id === selectedFromId);

  const exceedsBalance =
    senderWallet &&
    enteredAmount &&
    !Number.isNaN(Number.parseFloat(enteredAmount)) &&
    Number.parseFloat(enteredAmount) > Number.parseFloat(senderWallet.balance);

  const mutation = useMutation({
    mutationFn: (vals: TransferFormValues) => walletApi.transferFunds(vals, idempotencyKey),
    onSuccess: (res) => {
      setErrorState(null);
      if (completedTransfer) {
        setReplayNotice(
          `Idempotent replay confirmed: returned original transfer ${res.id} without moving funds twice.`
        );
      } else {
        setReplayNotice(null);
      }
      setCompletedTransfer(res);
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      queryClient.invalidateQueries({ queryKey: ['wallet', res.fromWalletId] });
      queryClient.invalidateQueries({ queryKey: ['wallet', res.toWalletId] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: (err) => {
      setErrorState(extractErrorMessage(err));
    },
  });

  const startNewTransfer = () => {
    setCompletedTransfer(null);
    setErrorState(null);
    setReplayNotice(null);
    setIdempotencyKey(crypto.randomUUID());
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900">
        <ArrowLeft className="w-4 h-4" />
        All wallets
      </Link>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-900">Transfer money</h1>
          <span className="text-[11px] font-mono bg-slate-100 text-slate-600 px-2 py-1 rounded" title={idempotencyKey}>
            Key: {shortId(idempotencyKey)}
          </span>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Protected by pessimistic row locks and idempotency keys.
        </p>

        {errorState && (
          <div className="mt-4 p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm space-y-2">
            <p>{errorState.message}</p>
            {errorState.isNetworkError && (
              <button
                type="button"
                onClick={() => mutation.mutate(getValues())}
                disabled={mutation.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-rose-600 text-white text-xs font-medium hover:bg-rose-700"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry transfer (same key)
              </button>
            )}
          </div>
        )}

        {completedTransfer ? (
          <div className="mt-5 p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-3">
            <div className="flex items-center gap-2 text-emerald-800 font-semibold">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Transfer Completed ({formatMoney(completedTransfer.amount)})
            </div>
            <p className="text-xs font-mono text-emerald-900 break-all">
              Transfer ID: {completedTransfer.id}
            </p>

            {replayNotice && (
              <p className="text-xs bg-white/80 text-emerald-900 p-2 rounded border border-emerald-200">
                {replayNotice}
              </p>
            )}

            <div className="flex flex-wrap gap-3 pt-1 text-xs font-medium">
              <Link
                to={`/wallets/${completedTransfer.fromWalletId}`}
                className="text-indigo-700 underline"
              >
                View sender wallet
              </Link>
              <Link
                to={`/wallets/${completedTransfer.toWalletId}`}
                className="text-indigo-700 underline"
              >
                View receiver wallet
              </Link>
            </div>

            <div className="pt-2 flex flex-wrap gap-2 border-t border-emerald-200/70">
              <button
                type="button"
                onClick={() => mutation.mutate(getValues())}
                disabled={mutation.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-800 bg-white border border-emerald-300 hover:bg-emerald-100"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Test Idempotent Retry
              </button>
              <button
                type="button"
                onClick={startNewTransfer}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Make another transfer
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit((vals) => mutation.mutate(vals))} className="mt-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">From wallet</label>
              <select
                {...register('fromWalletId')}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select sender wallet...</option>
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.owner} ({formatMoney(w.balance)})
                  </option>
                ))}
              </select>
              {errors.fromWalletId && (
                <p className="text-xs text-rose-600 mt-1">{errors.fromWalletId.message}</p>
              )}
              {senderWallet && (
                <p className="text-xs text-slate-500 mt-1 tabular-nums">
                  Available balance: <span className="font-semibold">{formatMoney(senderWallet.balance)}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">To wallet</label>
              <select
                {...register('toWalletId')}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select receiver wallet...</option>
                {wallets
                  .filter((w) => w.id !== selectedFromId)
                  .map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.owner} ({shortId(w.id)})
                    </option>
                  ))}
              </select>
              {errors.toWalletId && (
                <p className="text-xs text-rose-600 mt-1">{errors.toWalletId.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Amount (INR)</label>
              <input
                type="text"
                placeholder="100.0000"
                {...register('amount')}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {errors.amount && (
                <p className="text-xs text-rose-600 mt-1">{errors.amount.message}</p>
              )}
              {exceedsBalance && (
                <p className="flex items-center gap-1 text-xs text-amber-700 mt-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Amount exceeds available sender balance.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={mutation.isPending}
              className="w-full py-2.5 px-4 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            >
              {mutation.isPending ? 'Sending transfer...' : 'Send money'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}