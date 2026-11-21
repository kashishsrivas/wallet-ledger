import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { CreateWalletPage } from './pages/CreateWalletPage';
import { WalletDetailPage } from './pages/WalletDetailPage';
import { TransferPage } from './pages/TransferPage';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/wallets/new" element={<CreateWalletPage />} />
            <Route path="/wallets/:id" element={<WalletDetailPage />} />
            <Route path="/transfer" element={<TransferPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}