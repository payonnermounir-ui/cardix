import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Layout } from '@/components/Layout';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Dashboard from '@/pages/Dashboard';
import Cards from '@/pages/Cards';
import Deposit from '@/pages/Deposit';
import Referral from '@/pages/Referral';
import Transactions from '@/pages/Transactions';
import Settings from '@/pages/Settings';
import Admin from '@/pages/Admin';
import Verification from '@/pages/Verification';
import '@/i18n';

// 👇 هذا مكون صغير لتمرير referral
function RegisterWithReferral() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const ref = params.get("ref");

  return <Register referralCode={ref} />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />

            {/* 👇 هنا التعديل */}
            <Route path="/register" element={<RegisterWithReferral />} />

            {/* Protected routes with layout */}
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/cards" element={<Cards />} />
              <Route path="/deposit" element={<Deposit />} />
              <Route path="/referral" element={<Referral />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/verification" element={<Verification />} />
              <Route path="/admin" element={<Admin />} />
            </Route>

            {/* Default redirect */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthProvider>
      </HashRouter>
    </ErrorBoundary>
  );
}
