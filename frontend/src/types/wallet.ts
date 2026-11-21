export interface Wallet {
    id: string;
    owner: string;
    balance: string;
    createdAt: string;
  }
  
  export interface TopUpResponse {
    walletId: string;
    balance: string;
    transactionId: string;
  }
  
  export interface TransferResponse {
    id: string;
    fromWalletId: string;
    toWalletId: string;
    amount: string;
    status: 'COMPLETED' | 'FAILED';
    createdAt: string;
  }
  
  export interface Transaction {
    id: string;
    type: 'CREDIT' | 'DEBIT';
    amount: string;
    referenceId: string;
    description: string;
    createdAt: string;
  }
  
  export interface PageResponse<T> {
    content: T[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
  }
  
  export interface ApiError {
    timestamp: string;
    status: number;
    code: string;
    message: string;
    path: string;
    details: string[];
  }