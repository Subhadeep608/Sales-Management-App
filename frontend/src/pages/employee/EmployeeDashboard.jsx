import { useEffect, useState } from 'react';
import api from '../../api/axios';
import IconStatCard from '../../components/IconStatCard';
import { STATUS_OPTIONS } from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';

const today = () => new Date().toISOString().slice(0, 10);

const STATUS_ICONS = {
  pending: { icon: '⏳', color: 'red' },
  not_connected: { icon: '📞', color: 'yellow' },
  follow_up: { icon: '⭐', color: 'blue' },
  interested: { icon: '🔁', color: 'gray' },
  not_interested: { icon: '❌', color: 'lightgray' },
  joined: { icon: '🏆', color: 'green' },
};

const STATUS_LABELS = Object.fromEntries(STATUS_OPTIONS.map((o) => [o.value, o.label]));

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [joinings, setJoinings] = useState([]);
  const [error, setError] = useState('');

  const [workDate, setWorkDate] = useState(today());
  const [workSummary, setWorkSummary] = useState(null);

  const loadStats = async () => {
    try {
      const res = await api.get('/dashboard/employee');
      setStats(res.data.stats);
      setJoinings(res.data.joinings || []);
    } catch {
      setError('Unable to load dashboard data.');
    }
  };

  const loadWorkSummary = async (date) => {
    try {
      const res = await api.get('/employee/records/daily-summary', { params: { date } });
      setWorkSummary(res.data);
    } catch {
      setWorkSummary(null);
    }
  };

  useEffect(() => {
    loadStats();
    loadWorkSummary(workDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDateChange = (e) => {
    const newDate = e.target.value;
    setWorkDate(newDate);
    loadWorkSummary(newDate);
  };

  if (error) return <div className="text-red-600 text-sm">{error}</div>;
  if (!stats) return <p className="text-sm text-gray-500">Loading...</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-800">Welcome, <span className="font-bold text-orange-600">{user?.name}</span></h1>
      {/* Top Report row */}
      <div className="card p-5">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          {/* <h2 className="font-medium text-gray-700">My Daily Work</h2> */}
          <input type="date" className="input w-44" value={workDate} max={today()} onChange={handleDateChange} />
        </div>
        {!workSummary ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <IconStatCard icon="📞" color="yellow" label="Interested" value={workSummary.breakdown.interested} />
            <IconStatCard icon="🔁" color="purple" label="Follow Up" value={workSummary.breakdown.follow_up} />
            <IconStatCard icon="🏆" color="green" label="Not Interested" value={workSummary.breakdown.not_interested} />
            <IconStatCard icon="📋" color="blue" label="Total Connections" value={
              (workSummary.breakdown.interested ?? 0) +
              (workSummary.breakdown.follow_up ?? 0) +
              (workSummary.breakdown.not_interested ?? 0)} />
          </div>
        )}
      </div>

      {/* Second row: My Joining + status totals for all of my records */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card p-5 lg:col-span-1">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="font-medium text-gray-700">My Joining</h2>
            <span className="text-xs text-gray-400">{joinings.length} total</span>
          </div>

          {joinings.length === 0 ? (
            <p className="text-sm text-gray-400">No joinings yet.</p>
          ) : (
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-left sticky top-0">
                  <tr>
                    <th className="px-3 py-2">Sr. No.</th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {joinings.map((j, i) => (
                    <tr key={j.recordId}>
                      <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                      <td className="px-3 py-2 font-medium">{j.customerName}</td>
                      <td
                        className="px-3 py-2 whitespace-nowrap"
                        title={new Date(j.joinedAt).toLocaleString()}
                      >
                        {new Date(j.joinedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          {STATUS_OPTIONS.map((o) => {
            const meta = STATUS_ICONS[o.value] || { icon: '•', color: 'gray' };
            return (
              <IconStatCard
                key={o.value}
                icon={meta.icon}
                color={meta.color}
                label={STATUS_LABELS[o.value]}
                value={stats.statusBreakdown?.[o.value] ?? 0}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}