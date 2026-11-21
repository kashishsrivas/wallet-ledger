import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { extractErrorMessage, walletApi } from '../api/client';
import { useState } from 'react';

const schema = z.object({
  owner: z.string().trim().min(1, 'Owner name is required').max(120, 'Max 120 characters'),
});

type FormValues = z.infer<typeof schema>;

export function CreateWalletPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: (vals: FormValues) => walletApi.createWallet(vals.owner),
    onSuccess: (wallet) => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      navigate(`/wallets/${wallet.id}`, { state: { createdToast: true } });
    },
    onError: (err) => {
      setServerError(extractErrorMessage(err).message);
    },
  });

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900">
        <ArrowLeft className="w-4 h-4" />
        All wallets
      </Link>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h1 className="text-xl font-semibold text-slate-900">Create a new wallet</h1>
        <p className="text-sm text-slate-500 mt-1">
          Wallets start with a ₹0.0000 balance and can be topped up immediately.
        </p>

        {serverError && (
          <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit((vals) => mutation.mutate(vals))} className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Owner name</label>
            <input
              type="text"
              placeholder="e.g., Ava Patel"
              {...register('owner')}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {errors.owner && <p className="text-xs text-rose-600 mt-1">{errors.owner.message}</p>}
          </div>

          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full py-2.5 px-4 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
          >
            {mutation.isPending ? 'Creating wallet...' : 'Create wallet'}
          </button>
        </form>
      </div>
    </div>
  );
}