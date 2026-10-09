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
      {/* Per-member credit performance report — lifetime loan history,
          on-time repayment tally, savings vs outstanding. Reached via the
          "Performance" action in the Member Directory. More specific path
          than /admin/members, so React Router matches the right one. */}
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
      {/* Loan Income — per-loan breakdown of principal, expected interest,
          and repaid-to-date. Under "Loans" in the sidebar. Added
          2026-10-09 (Phase 4). */}
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
      {/* 2026-10-09: Withdrawal feature retired per board instruction.
          Route removed; withdrawals table retained as archive.
          See AdminLayout.jsx for the sidebar note. */}
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
      {/* Aging Report — how far behind each outstanding loan is. Distinct
          from /admin/reports (financial period summaries) because it's a
          point-in-time snapshot of lending health, not a periodic view. */}
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