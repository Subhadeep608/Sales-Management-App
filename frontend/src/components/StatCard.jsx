export default function StatCard({ label, value, accent = 'brand' }) {
  const accents = {
    brand: 'text-brand-600 bg-brand-50',
    green: 'text-green-600 bg-green-50',
    yellow: 'text-yellow-600 bg-yellow-50',
    red: 'text-red-600 bg-red-50',
    gray: 'text-gray-600 bg-gray-100',
  };

  return (
    <div className="card p-4">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${accents[accent]?.split(' ')[0] || ''}`}>{value}</p>
    </div>
  );
}
