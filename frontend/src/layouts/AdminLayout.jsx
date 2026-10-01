import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const links = [
  { to: '/admin/dashboard', label: 'Dashboard' },
  { to: '/admin/employees', label: 'Employees' },
  { to: '/admin/import', label: 'Import Excel' },
  { to: '/admin/records', label: 'Records' },
  { to: '/admin/assignments', label: 'Assignments' },
  { to: '/admin/reports', label: 'Reports' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Sidebar - fixed, never scrolls */}
      <aside className="w-60 bg-white border-r border-gray-200 hidden md:flex md:flex-col shrink-0 h-screen">
        <div className="px-5 py-5 border-b border-gray-200 shrink-0">
          <p className="font-bold text-brand-700">Sales & Marketing</p>
          <p className="text-xs text-gray-400">Admin Panel</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `block rounded-md px-3 py-2 text-sm font-medium ${
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-50'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Right side: fixed header + scrollable content below it */}
      <div className="flex-1 flex flex-col min-w-0 h-screen">
        <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 flex items-center justify-between shrink-0">
          <p className="text-sm text-gray-500 md:hidden font-semibold text-brand-700">Sales & Marketing</p>
          <div className="ml-auto flex items-center gap-4">
            <span className="text-sm text-orange-600 font-bold">
              {/* {user?.name} <span className="text-gray-400">({user?.employeeId})</span> */}
              PPM <span className="text-gray-400"> (Admin)</span>
            </span>
            <button onClick={logout} className="btn-secondary px-3 py-1.5 text-xs">
              Logout
            </button>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}