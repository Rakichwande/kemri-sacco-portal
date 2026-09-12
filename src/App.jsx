import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import AdminLoans from './pages/AdminLoans';
import AuditTrail from './pages/AuditTrail';
import Dashboard from './pages/Dashboard';
import MemberDirectory from './pages/MemberDirectory';
import DisbursementLog from './pages/DisbursementLog';
import RepaymentHistory from './pages/RepaymentHistory';
import ContributionLogs from './pages/ContributionLogs';
import StaffManagement from './pages/StaffManagement';
import FinancialReports from './pages/FinancialReports';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-4 text-center">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/admin" element={
        <ProtectedRoute>
          <AdminLoans />
        </ProtectedRoute>
      } />
      <Route path="/admin/audit-trail" element={
        <ProtectedRoute>
          <AuditTrail />
        </ProtectedRoute>
      } />
      <Route path="/admin/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      <Route path="/admin/members" element={
        <ProtectedRoute>
          <MemberDirectory />
        </ProtectedRoute>
      } />
      <Route path="/admin/disbursements" element={
        <ProtectedRoute>
          <DisbursementLog />
        </ProtectedRoute>
      } />
      <Route path="/admin/repayments" element={
        <ProtectedRoute>
          <RepaymentHistory />
        </ProtectedRoute>
      } />
      <Route path="/admin/contributions" element={
        <ProtectedRoute>
          <ContributionLogs />
        </ProtectedRoute>
      } />
      <Route path="/admin/staff" element={
        <ProtectedRoute>
          <StaffManagement />
        </ProtectedRoute>
      } />
      <Route path="/admin/reports" element={
        <ProtectedRoute>
          <FinancialReports />
        </ProtectedRoute>
      } />
      <Route path="/" element={<Navigate to="/admin/dashboard" />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;