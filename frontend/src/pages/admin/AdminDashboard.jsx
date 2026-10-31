import { useEffect, useRef, useState } from 'react';
import api from '../../api/axios';
import IconStatCard from '../../components/IconStatCard';
import { STATUS_OPTIONS } from '../../components/StatusBadge';

const today = () => new Date().toISOString().slice(0, 10);

const STATUS_ICONS = {
  pending: { icon: '⏳', color: 'gray' },
  not_connected: { icon: '📵', color: 'orange' },
  follow_up: { icon: '🔁', color: 'purple' },
  interested: { icon: '⭐', color: 'yellow' },
  not_interested: { icon: '❌', color: 'red' },
  joined: { icon: '🎉', color: 'green' },
};

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [workDate, setWorkDate] = useState(today());
  const requestId = useRef(0);

  // Reloads when the date changes. The request counter makes sure a slow,
  // older response can never overwrite a newer one.
  useEffect(() => {
    const id = ++requestId.current;

    api
      .get('/dashboard/admin', { params: { date: workDate } })
      .then((res) => {
        if (id !== requestId.current) return;
        setData(res.data);
        setError('');
      })
      .catch(() => {
        if (id === requestId.current) setError('Unable to load dashboard data.');
      });
  }, [workDate]);

  if (error && !data) return <div className="text-red-600 text-sm">{error}</div>;
  if (!data) return <div className="text-gray-500 text-sm">Loading dashboard...</div>;

  const worked = data.dailyWork?.breakdown || {};
  const totalConnections =
    (worked.interested ?? 0) + (worked.follow_up ?? 0) + (worked.not_interested ?? 0);
  const statusBreakdown = data.stats?.statusBreakdown || {};
  const joinings = data.joinings || [];
  const employeeLastLogins = data.employeeLastLogins || [];

  return (
    <div className="space-y-6">
      {error && <div className="rounded-md bg-red-50 text-red-700 text-sm px-3 py-2">{error}</div>}

      {/* Daily work across every employee */}
      <div className="card p-5 space-y-4">
        <input
          type="date"
          className="input"
          value={workDate}
          max={today()}
          onChange={(e) => setWorkDate(e.target.value || today())}
        />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <IconStatCard icon="⭐" color="yellow" label="Interested" value={worked.interested ?? 0} />
          <IconStatCard icon="🔁" color="purple" label="Follow Up" value={worked.follow_up ?? 0} />
          <IconStatCard icon="❌" color="red" label="Not Interested" value={worked.not_interested ?? 0} />
          <IconStatCard icon="📋" color="blue" label="Total Connections" value={totalConnections} />
        </div>
      </div>

      {/* status totals for all records */}
      <div className="grid lg:grid-cols-1 gap-6">
        <h2 className="font-medium text-orange-500"> Employee Work Summary </h2>
        <div className="grid grid-cols-3 gap-4 content-start">
          {STATUS_OPTIONS.map((o) => {
            const meta = STATUS_ICONS[o.value] || { icon: '•', color: 'gray' };
            return (
              <IconStatCard
                key={o.value}
                icon={meta.icon}
                color={meta.color}
                label={o.label}
                value={statusBreakdown[o.value] ?? 0}
              />
            );
          })}
        </div>
      </div>


      <div className='grid lg:grid-cols-2 gap-6'>
        {/* Employee joining member */}
        <div className="card p-5">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="font-medium text-orange-500">Total Joining</h2>
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
                    <th className="px-3 py-2">Employee</th>
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
                      <td className="px-3 py-2">{j.employeeName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Employee last login */}
        <div className="card p-4">
          <h2 className="font-medium text-orange-500 mb-3">Employee Last Login</h2>
          {employeeLastLogins.length === 0 ? (
            <p className="text-sm text-gray-400">No employees yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100 text-sm">
              {employeeLastLogins.map((emp) => (
                <li key={emp._id} className="py-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="font-medium">{emp.name}</span>{' '}
                    <span className="text-gray-400">({emp.employeeId})</span>
                    {emp.status === 'inactive' && <span className="badge bg-red-100 text-red-700 ml-2">Inactive</span>}
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">
                    {emp.lastLoginAt ? new Date(emp.lastLoginAt).toLocaleString() : 'Never logged in'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}