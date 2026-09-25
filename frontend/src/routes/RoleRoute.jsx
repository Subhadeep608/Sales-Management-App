import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Usage: <Route element={<RoleRoute role="admin" />}>...</Route>
// Note: this only controls what renders. The backend independently
// enforces the same restriction on every API call, which is the real boundary.
export default function RoleRoute({ role }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) {
    return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/employee/dashboard'} replace />;
  }

  return <Outlet />;
}
