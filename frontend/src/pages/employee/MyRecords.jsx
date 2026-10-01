import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import Pagination from '../../components/Pagination';
import EmptyState from '../../components/EmptyState';
import StatusBadge, { STATUS_OPTIONS } from '../../components/StatusBadge';

export default function MyRecords() {
  const [date, setDate] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async (filters, selectedPage) => {
    setLoading(true);
    setError('');
    try {
      const params = { page: selectedPage, limit: 50 };
      if (filters.date) params.date = filters.date;
      if (filters.status) params.status = filters.status;
      if (filters.search) params.search = filters.search;
      const res = await api.get('/employee/records/report', { params });
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load records.');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load({}, 1);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    load({ date, status, search }, 1);
  };

  const handleClear = () => {
    setDate('');
    setStatus('');
    setSearch('');
    setPage(1);
    load({}, 1);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    load({ date, status, search }, newPage);
  };

  const hasActiveFilters = date || status || search;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-800">My Assigned Records</h1>

      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input
            type="date"
            className="input w-40"
            value={date}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select className="input w-40" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
          <input
            className="input w-56"
            placeholder="Name, email, or phone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button type="submit" className="btn-primary">
          Apply
        </button>
        {hasActiveFilters && (
          <button type="button" className="btn-secondary" onClick={handleClear}>
            Clear
          </button>
        )}
      </form>

      {error && <div className="rounded-md bg-red-50 text-red-700 text-sm px-3 py-2">{error}</div>}

      <div className="card overflow-x-auto">
        {loading ? (
          <p className="p-6 text-sm text-gray-500">Loading...</p>
        ) : !data || data.data.length === 0 ? (
          <EmptyState title="No records found" description="Try adjusting your filters." />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th className="px-4 py-2">Sr. No.</th>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Phone</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Lead Source</th>
                <th className="px-4 py-2">Time</th>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.data.map((r, i) => {
                const ts = new Date(r.timestamp);
                return (
                  <tr key={r.recordId}>
                    <td className="px-4 py-2">{(data.pagination.page - 1) * data.pagination.limit + i + 1}</td>
                    <td className="px-4 py-2 font-medium">{r.customerName}</td>
                    <td className="px-4 py-2">{r.phone}</td>
                    <td className="px-4 py-2">{r.email || '-'}</td>
                    <td className="px-4 py-2">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-2">{r.leadSource}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{ts.toLocaleTimeString()}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{ts.toLocaleDateString()}</td>
                    <td className="px-4 py-2">
                      <Link to={`/employee/records/${r.recordId}`} className="text-brand-600 hover:underline text-xs">
                        Open
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {data && <Pagination pagination={data.pagination} onPageChange={handlePageChange} />}
      </div>
    </div>
  );
}