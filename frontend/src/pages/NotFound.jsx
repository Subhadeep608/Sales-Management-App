import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
      <p className="text-3xl font-bold text-gray-800">404</p>
      <p className="text-gray-500 mt-2">Page not found.</p>
      <Link to="/" className="btn-primary mt-6">
        Go home
      </Link>
    </div>
  );
}
