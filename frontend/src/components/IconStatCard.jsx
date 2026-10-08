export default function IconStatCard({ icon, label, value, color = 'blue' }) {
  const colors = {
    blue: 'bg-blue-400 text-blue-600',
    green: 'bg-green-400 text-green-600',
    yellow: 'bg-yellow-400 text-yellow-600',
    red: 'bg-red-400 text-red-600',
    purple: 'bg-purple-400 text-purple-600',
    gray: 'bg-gray-400 text-gray-600',
    lightgray: 'bg-gray-100 text-gray-600',
  };

  return (
    <div className="card p-4 flex items-center gap-4">
      <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-lg ${colors[color] || colors.blue}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-800 uppercase tracking-wide truncate">{label}</p>
        <p className="text-xl font-semibold text-gray-600">{value}</p>
      </div>
    </div>
  );
}