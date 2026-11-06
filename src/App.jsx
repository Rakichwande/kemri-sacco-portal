import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import AcceptInvite from './pages/AcceptInvite';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import AdminLoans from './pages/AdminLoans';
import AuditTrail from './pages/AuditTrail';
import Dashboard from './pages/Dashboard';
import MemberDirectory from './pages/MemberDirectory';
import MemberPerformance from './pages/MemberPerformance';
import DisbursementLog from './pages/DisbursementLog';
import RepaymentHistory from './pages/RepaymentHistory';
import ContributionLogs from './pages/ContributionLogs';
import StaffManagement from './pages/StaffManagement';
import FinancialReports from './pages/FinancialReports';
import DataImport from './pages/DataImport';
import SystemHealth from './pages/SystemHealth';
import Settings from './pages/Settings';
import LoanAgingReport from './pages/LoanAgingReport';
import LoanIncome from './pages/LoanIncome';
import LoanEligibility from './pages/LoanEligibility';
import LoanTimeline from './pages/LoanTimeline';
import WalletWithdrawals from './pages/WalletWithdrawals'; // 2026-11-06: NEW

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
      <Route path="/accept-invite/:token" element={<AcceptInvite />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />

      <Route path="/admin" element={
        <ProtectedRoute>
          <AdminLoans />
        </ProtectedRoute>
      } />

      <Route path="/admin/eligibility" element={
        <ProtectedRoute>
          <LoanEligibility />
        </ProtectedRoute>
      } />

      {/* 2026-11-02: NEW Loan Timeline Route */}
      <Route path="/admin/loans/timeline" element={
        <ProtectedRoute>
          <LoanTimeline />
        </ProtectedRoute>
      } />

      {/* 2026-11-06: NEW Wallet Withdrawals Route */}
      <Route path="/admin/wallet-withdrawals" element={
        <ProtectedRoute>
          <WalletWithdrawals />
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
      <Route path="/admin/members/:id/performance" element={
        <ProtectedRoute>
          <MemberPerformance />
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
      <Route path="/admin/income" element={
        <ProtectedRoute>
          <LoanIncome />
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
      <Route path="/admin/aging" element={
        <ProtectedRoute>
          <LoanAgingReport />
        </ProtectedRoute>
      } />
      <Route path="/admin/data-import" element={
        <ProtectedRoute>
          <DataImport />
        </ProtectedRoute>
      } />
      <Route path="/admin/system-health" element={
        <ProtectedRoute>
          <SystemHealth />
        </ProtectedRoute>
      } />
      <Route path="/admin/settings" element={
        <ProtectedRoute>
          <Settings />
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