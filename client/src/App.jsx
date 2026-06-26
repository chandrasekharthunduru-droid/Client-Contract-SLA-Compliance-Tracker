import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/layout/ProtectedRoute';
import Layout from './components/layout/Layout';

// Pages
import Login from './pages/Auth/Login';
import Dashboard from './pages/Dashboard/index';
import Contracts from './pages/Contracts/index';
import ContractDetail from './pages/Contracts/ContractDetail';
import Customers from './pages/Customers/index';
import SLAManagement from './pages/SLA/index';
import Incidents from './pages/Incidents/index';
import Alerts from './pages/Alerts/index';
import Reports from './pages/Reports/index';
import StaffManagement from './pages/Staff/index';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={
        <ProtectedRoute>
          <Layout>
            <Dashboard />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/contracts" element={
        <ProtectedRoute>
          <Layout>
            <Contracts />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/contracts/:id" element={
        <ProtectedRoute>
          <Layout>
            <ContractDetail />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/customers" element={
        <ProtectedRoute>
          <Layout>
            <Customers />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/sla" element={
        <ProtectedRoute>
          <Layout>
            <SLAManagement />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/incidents" element={
        <ProtectedRoute>
          <Layout>
            <Incidents />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/alerts" element={
        <ProtectedRoute>
          <Layout>
            <Alerts />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/reports" element={
        <ProtectedRoute>
          <Layout>
            <Reports />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/staff" element={
        <ProtectedRoute requiredRoles={['admin']}>
          <Layout>
            <StaffManagement />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              background: '#fff',
              color: '#1e293b',
              borderRadius: '12px',
              boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
              fontSize: '14px',
              fontWeight: '500',
              border: '1px solid #f1f5f9',
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}
