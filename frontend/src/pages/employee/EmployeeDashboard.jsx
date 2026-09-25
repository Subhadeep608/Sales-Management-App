import { useEffect, useState } from 'react';
import api from '../../api/axios';
import IconStatCard from '../../components/IconStatCard';
import { STATUS_OPTIONS } from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';

const today = () => new Date().toISOString().slice(0, 10);

const STATUS_ICONS = {
  pending: { icon: '⏳', color: 'gray' },
  contacted: { icon: '📞', color: 'blue' },
  interested: { icon: '⭐', color: 'yellow' },
  follow_up: { icon: '🔁', color: 'purple' },
  not_interested: { icon: '❌', color: 'red' },
  converted: { icon: '🏆', color: 'green' },
};

const STATUS_LABELS = Object.fromEntries(STATUS_OPTIONS.map((o) => [o.value, o.label]));

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [files, setFiles] = useState([]);
  const [selectedFileId, setSelectedFileId] = useState('');
  const [error, setError] = useState('');

  const [workDate, setWorkDate] = useState(today());
  const [workSummary, setWorkSummary] = useState(null);

  const loadStats = async (importBatch) => {
    try {
      const res = await api.get('/dashboard/employee', { params: importBatch ? { importBatch } : {} });
      setStats(res.data.stats);
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
    api.get('/employee/records/files').then((res) => setFiles(res.data.files));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadStats(selectedFileId || undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFileId]);

  const handleDateChange = (e) => {
    const newDate = e.target.value;
    setWorkDate(newDate);
    loadWorkSummary(newDate);
  };

  if (error) return <div className="text-red-600 text-sm">{error}</div>;
  if (!stats) return <p className="text-sm text-gray-500">Loading...</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-800">Welcome, {user?.name}</h1>

      <div className="card p-5">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <h2 className="font-medium text-gray-700">My Daily Work</h2>
          <input type="date" className="input w-44" value={workDate} max={today()} onChange={handleDateChange} />
        </div>
        {!workSummary ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <IconStatCard icon="📞" color="blue" label="Contacted" value={workSummary.breakdown.contacted} />
            <IconStatCard icon="🔁" color="purple" label="Follow Up" value={workSummary.breakdown.follow_up} />
            <IconStatCard icon="🏆" color="green" label="Converted" value={workSummary.breakdown.converted} />
            <IconStatCard icon="📋" color="yellow" label="Total Connections" value={workSummary.totalWorked} />
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card p-5 lg:col-span-1">
          <h2 className="font-medium text-gray-700 mb-4">My Records</h2>
          <label className="block text-sm font-medium text-gray-700 mb-1">A Dropdown List</label>
          <select className="input" value={selectedFileId} onChange={(e) => setSelectedFileId(e.target.value)}>
            <option value="">Show All Records-file</option>
            {files.map((f) => (
              <option key={f._id} value={f._id}>
                {f.fileName}
              </option>
            ))}
          </select>
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
                value={stats.statusBreakdown[o.value]}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}