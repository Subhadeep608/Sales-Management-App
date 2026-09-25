import { useEffect, useState } from 'react';
import api from '../../api/axios';
import IconStatCard from '../../components/IconStatCard';
import EmptyState from '../../components/EmptyState';
import { STATUS_OPTIONS } from '../../components/StatusBadge';

const today = () => new Date().toISOString().slice(0, 10);

export default function Reports() {
  const [date, setDate] = useState(today());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async (selectedDate) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/reports/daily', { params: { date: selectedDate } });
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load report.');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    load(date);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-800">Reports</h1>
      <p className="text-sm text-gray-500">
        Pick a date to see exactly what each employee worked on that day — how many records, what happened to them,
        and which sheets they came from.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input type="date" className="input w-48" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
        </div>
        <button type="submit" className="btn-primary">
          View Report
        </button>
      </form>

      {error && <div className="rounded-md bg-red-50 text-red-700 text-sm px-3 py-2">{error}</div>}

      {loading ? (
        <p className="text-sm text-gray-500">Loading report...</p>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <IconStatCard icon="📅" label="Report Date" value={data.date} color="blue" />
            <IconStatCard icon="👥" label="Employees Worked" value={data.summary.totalEmployeesWorked} color="green" />
            <IconStatCard icon="📋" label="Records Worked" value={data.summary.totalRecordsWorked} color="yellow" />
            <IconStatCard icon="🗂️" label="Total Employees" value={data.employees.length} color="gray" />
          </div>

          <div className="card overflow-x-auto">
            {data.employees.length === 0 ? (
              <EmptyState title="No employees found" />
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-left">
                  <tr>
                    <th className="px-4 py-2">Employee</th>
                    <th className="px-4 py-2">Worked</th>
                    {STATUS_OPTIONS.map((o) => (
                      <th key={o.value} className="px-4 py-2">
                        {o.label}
                      </th>
                    ))}
                    <th className="px-4 py-2">Sheets Worked</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.employees.map((emp) => (
                    <tr key={emp.employeeId} className={emp.totalRecordsWorked === 0 ? 'text-gray-400' : ''}>
                      <td className="px-4 py-2 font-medium whitespace-nowrap text-gray-800">
                        {emp.name} ({emp.employeeId})
                        {emp.status === 'inactive' && <span className="badge bg-red-100 text-red-700 ml-2">Inactive</span>}
                      </td>
                      <td className="px-4 py-2 font-semibold text-gray-800">{emp.totalRecordsWorked}</td>
                      {STATUS_OPTIONS.map((o) => (
                        <td key={o.value} className="px-4 py-2">
                          {emp.statusBreakdown[o.value]}
                        </td>
                      ))}
                      <td className="px-4 py-2">
                        {emp.sheets.length === 0 ? (
                          '-'
                        ) : (
                          <ul className="space-y-1">
                            {emp.sheets.map((s) => (
                              <li key={s.importId} className="text-xs">
                                <span className="font-medium text-gray-700">{s.fileName}</span>{' '}
                                <span className="text-gray-500">
                                  ({s.workedToday}/{s.totalAssignedToEmployee} worked)
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}