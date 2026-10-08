import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../api/axios';
import IconStatCard from '../../components/IconStatCard';
import { STATUS_OPTIONS } from '../../components/StatusBadge';

const STATUS_ICONS = {
  pending: { icon: '⏳', color: 'red' },
  contacted: { icon: '📞', color: 'yellow' },
  interested: { icon: '⭐', color: 'blue' },
  follow_up: { icon: '🔁', color: 'gray' },
  not_interested: { icon: '❌', color: 'lightgray' },
  converted: { icon: '🏆', color: 'green' },
};

const STATUS_LABELS = Object.fromEntries(STATUS_OPTIONS.map((o) => [o.value, o.label]));

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [performance, setPerformance] = useState([]);
  const [employeeLastLogins, setEmployeeLastLogins] = useState([]);
  const [error, setError] = useState('');

  const [imports, setImports] = useState([]);
  const [selectedFileId, setSelectedFileId] = useState('');

  const loadDashboard = async (importBatch) => {
    try {
      const res = await api.get('/dashboard/admin', { params: importBatch ? { importBatch } : {} });
      setStats(res.data.stats);
      setPerformance(res.data.performance);
      setEmployeeLastLogins(res.data.employeeLastLogins);
    } catch {
      setError('Unable to load dashboard data.');
    }
  };

  useEffect(() => {
    loadDashboard();
    api.get('/imports', { params: { limit: 200 } }).then((res) => setImports(res.data.data));
  }, []);

  useEffect(() => {
    loadDashboard(selectedFileId || undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFileId]);

  if (error) return <div className="text-red-600 text-sm">{error}</div>;
  if (!stats) return <div className="text-gray-500 text-sm">Loading dashboard...</div>;

  const chartData = performance.map((p) => ({ name: p.employeeId, Assigned: p.totalAssigned, Converted: p.converted }));

  return (
    <div className="space-y-6">

      {/* Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <IconStatCard icon="👤" label="Total Employees" value={stats.totalEmployees} color="yellow" />
        <IconStatCard icon="📄" label="Total Record Files" value={stats.totalImportFiles} color="green" />
        <IconStatCard icon="✅" label="Assigned" value={stats.assignedFiles} color="gray" />
        <IconStatCard icon="🚫" label="Unassigned" value={stats.unassignedFiles} color="lightgray" />
      </div>

      {/* Row 2 - sheet performance filter + status breakdown */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card p-5 lg:col-span-1">
          <h2 className="font-medium text-gray-700 mb-4">Sheet Performance Report</h2>
          <select className="input" value={selectedFileId} onChange={(e) => setSelectedFileId(e.target.value)}>
            <option value="">Show All Records-file</option>
            {imports.map((imp) => (
              <option key={imp._id} value={imp._id}>
                {imp.fileName}
              </option>
            ))}
          </select>
        </div>

        <div className="lg:col-span-2">
          {!selectedFileId || !stats.statusBreakdown ? (
            <div className="card p-6 h-full flex items-center justify-center text-sm text-gray-400 text-center">
              Select a file from the dropdown to view its status breakdown.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(stats.statusBreakdown).map(([status, count]) => {
                const meta = STATUS_ICONS[status] || { icon: '•', color: 'gray' };
                return (
                  <IconStatCard
                    key={status}
                    icon={meta.icon}
                    color={meta.color}
                    label={STATUS_LABELS[status] || status}
                    value={count}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Row 3 - Employee Performance chart (unchanged) + Last Login panel */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-4">
          <h2 className="font-medium text-gray-700 mb-3">Employee Performance</h2>
          {performance.length === 0 ? (
            <p className="text-sm text-gray-400">No assigned records yet.</p>
          ) : (
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <BarChart data={chartData}>
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis allowDecimals={false} fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="Assigned" fill="#a5b4fc" />
                  <Bar dataKey="Converted" fill="#4f46e5" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card p-4">
          <h2 className="font-medium text-gray-700 mb-3">Employee Last Login</h2>
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