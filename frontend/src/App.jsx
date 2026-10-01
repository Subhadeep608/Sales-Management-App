import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './routes/ProtectedRoute';
import RoleRoute from './routes/RoleRoute';

import Login from './pages/Login';
import NotFound from './pages/NotFound';

import AdminLayout from './layouts/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import Employees from './pages/admin/Employees';
import ImportExcel from './pages/admin/ImportExcel';
import Imports from './pages/admin/Imports';
import ImportRecords from './pages/admin/ImportRecords';
import AdminRecordDetail from './pages/admin/RecordDetail';
import Assignments from './pages/admin/Assignments';
import Reports from './pages/admin/Reports';

import EmployeeLayout from './layouts/EmployeeLayout';
import EmployeeDashboard from './pages/employee/EmployeeDashboard';
import MyRecords from './pages/employee/MyRecords';
import EmployeeRecordDetail from './pages/employee/RecordDetail';

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/employee/dashboard'} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/login" element={<Login />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<RoleRoute role="admin" />}>
                <Route element={<AdminLayout />}>
                  <Route path="/admin/dashboard" element={<AdminDashboard />} />
                  <Route path="/admin/employees" element={<Employees />} />
                  <Route path="/admin/import" element={<ImportExcel />} />
                  <Route path="/admin/records" element={<Imports />} />
                  <Route path="/admin/records/import/:importId" element={<ImportRecords />} />
                  <Route path="/admin/records/detail/:id" element={<AdminRecordDetail />} />
                  <Route path="/admin/assignments" element={<Assignments />} />
                  <Route path="/admin/reports" element={<Reports />} />
                </Route>
              </Route>

              <Route element={<RoleRoute role="employee" />}>
                <Route element={<EmployeeLayout />}>
                  <Route path="/employee/dashboard" element={<EmployeeDashboard />} />
                  <Route path="/employee/records" element={<MyRecords />} />
                  <Route path="/employee/records/:id" element={<EmployeeRecordDetail />} />
                </Route>
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}