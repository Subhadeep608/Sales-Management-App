import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoginReminder from '../components/LoginReminder';


const links = [
  { to: '/employee/dashboard', label: 'Dashboard' },
  { to: '/employee/records', label: 'My Records' },
  { to: '/employee/follow-ups', label: 'Follow Up' },
];

export default function EmployeeLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <LoginReminder />
      <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-4 flex items-center gap-6">
        <p className="font-bold text-orange-600">PPM <span className="text-brand-600">CRM</span></p>
        <nav className="flex gap-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `rounded-md px-3 py-1.5 text-sm font-medium ${isActive ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-50'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-4">
          <span className="text-sm text-gray-600 flex items-center gap-1.2">
            <span aria-hidden="true">👤</span>
            {user?.name}
          </span>
          <button onClick={logout} className="btn-primary px-3 py-1.5 text-xs">
            Logout
          </button>
        </div>
      </header>
      <main className="flex-1 p-4 md:p-6  w-full mx-auto">
        <Outlet />
      </main>
    </div>
  );
}
