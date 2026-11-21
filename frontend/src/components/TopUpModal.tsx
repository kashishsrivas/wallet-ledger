import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { extractErrorMessage, walletApi } from '../api/client';
import { useState } from 'react';

const topUpSchema = z.object({
  amount: z
    .string()
    .min(1, 'Amount is required')
    .regex(/^\d+(\.\d{1,4})?$/, 'Enter a positive number with up to 4 decimal places')
    .refine((val) => parseFloat(val) > 0, 'Amount must be greater than zero'),
  reference: z.string().max(255).optional(),
});

type TopUpFormValues = z.infer<typeof topUpSchema>;

interface TopUpModalProps {
  walletId: string;
  ownerName: string;
  onClose: () => void;
}

export function TopUpModal({ walletId, ownerName, onClose }: TopUpModalProps) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TopUpFormValues>({
    resolver: zodResolver(topUpSchema),
    defaultValues: { amount: '500.0000', reference: 'Demo wallet funding' },
  });

  const mutation = useMutation({
    mutationFn: (values: TopUpFormValues) =>
      walletApi.topUpWallet(walletId, values.amount, values.reference),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet', walletId] });
      queryClient.invalidateQueries({ queryKey: ['transactions', walletId] });
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      onClose();
    },
    onError: (err) => {
      setServerError(extractErrorMessage(err).message);
    },
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Add money to {ownerName}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {serverError && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit((vals) => mutation.mutate(vals))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Amount (INR)</label>
            <input
              type="text"
              placeholder="100.0000"
              {...register('amount')}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {errors.amount && <p className="text-xs text-rose-600 mt-1">{errors.amount.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Reference / Description (optional)
            </label>
            <input
              type="text"
              placeholder="e.g., Initial deposit"
              {...register('reference')}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {mutation.isPending ? 'Adding...' : 'Confirm Top-up'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}