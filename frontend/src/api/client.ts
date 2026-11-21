import axios, { type AxiosError } from 'axios';
import type {
  ApiError,
  PageResponse,
  TopUpResponse,
  Transaction,
  TransferResponse,
  Wallet,
} from '../types/wallet';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1',
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export function extractErrorMessage(err: unknown): { code?: string; message: string; isNetworkError: boolean } {
  if (axios.isAxiosError(err)) {
    const axiosErr = err as AxiosError<ApiError>;
    if (!axiosErr.response) {
      return {
        message: 'Network error or timeout. You can safely retry with the same idempotency key.',
        isNetworkError: true,
      };
    }
    return {
      code: axiosErr.response.data?.code,
      message: axiosErr.response.data?.message || 'An unexpected server error occurred.',
      isNetworkError: false,
    };
  }
  return { message: 'Unexpected error occurred.', isNetworkError: false };
}

export const walletApi = {
  getWallets: async (): Promise<Wallet[]> => {
    const { data } = await api.get<Wallet[]>('/wallets');
    return data;
  },
  getWallet: async (id: string): Promise<Wallet> => {
    const { data } = await api.get<Wallet>(`/wallets/${id}`);
    return data;
  },
  createWallet: async (owner: string): Promise<Wallet> => {
    const { data } = await api.post<Wallet>('/wallets', { owner });
    return data;
  },
  topUpWallet: async (id: string, amount: string, reference?: string): Promise<TopUpResponse> => {
    const { data } = await api.post<TopUpResponse>(`/wallets/${id}/topup`, { amount, reference });
    return data;
  },
  getTransactions: async (id: string, page = 0, size = 10): Promise<PageResponse<Transaction>> => {
    const { data } = await api.get<PageResponse<Transaction>>(`/wallets/${id}/transactions`, {
      params: { page, size },
    });
    return data;
  },
  transferFunds: async (
    payload: { fromWalletId: string; toWalletId: string; amount: string },
    idempotencyKey: string
  ): Promise<TransferResponse> => {
    const { data } = await api.post<TransferResponse>('/transfers', payload, {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
    return data;
  },
};
