import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/axios';
import Pagination from '../../components/Pagination';
import EmptyState from '../../components/EmptyState';
import StatusBadge, { STATUS_OPTIONS } from '../../components/StatusBadge';

export default function MyFileRecords() {
  const { importId } = useParams();
  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ search: '', status: '' });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const res = await api.get('/employee/records', { params: { importBatch: importId, page, ...filters } });
    setRecords(res.data.data);
    setPagination(res.data.pagination);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importId, page]);

  const applyFilters = (e) => {
    e.preventDefault();
    setPage(1);
    load();
  };

  return (
    <div className="space-y-4">
      <Link to="/employee/records" className="text-sm text-brand-600 hover:underline">
        &larr; Back to My Records
      </Link>

      <h1 className="text-xl font-semibold text-gray-800">Assigned Records</h1>

      <form onSubmit={applyFilters} className="flex flex-wrap gap-2">
        <input
          className="input max-w-[240px]"
          placeholder="Search name, phone, email"
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
        <select
          className="input max-w-[160px]"
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <button type="submit" className="btn-secondary">
          Apply
        </button>
      </form>

      <div className="card overflow-x-auto">
        {loading ? (
          <p className="p-6 text-sm text-gray-500">Loading...</p>
        ) : records.length === 0 ? (
          <EmptyState title="No records found" description="Try adjusting your filters." />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th className="px-4 py-2">Customer</th>
                <th className="px-4 py-2">Phone</th>
                <th className="px-4 py-2">City</th>
                <th className="px-4 py-2">Product</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {records.map((r) => (
                <tr key={r._id}>
                  <td className="px-4 py-2 font-medium">{r.customerName}</td>
                  <td className="px-4 py-2">{r.phone}</td>
                  <td className="px-4 py-2">{r.city || '-'}</td>
                  <td className="px-4 py-2">{r.product || '-'}</td>
                  <td className="px-4 py-2">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-2">
                    <Link to={`/employee/records/${r._id}`} className="text-brand-600 hover:underline text-xs">
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination pagination={pagination} onPageChange={setPage} />
      </div>
    </div>
  );
}