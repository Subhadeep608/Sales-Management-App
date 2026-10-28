import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import IconStatCard from '../../components/IconStatCard';
import EmptyState from '../../components/EmptyState';
import Pagination from '../../components/Pagination';
import Modal from '../../components/Modal';
import ResumeLink from '../../components/ResumeLink';
import StatusBadge, { STATUS_OPTIONS } from '../../components/StatusBadge';
import { useToast } from '../../context/ToastContext';

export default function Reports() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [date, setDate] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [employees, setEmployees] = useState([]);
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = async (filters, selectedPage) => {
    setLoading(true);
    setError('');
    try {
      const params = { page: selectedPage, limit: 50 };
      if (filters.date) params.date = filters.date;
      if (filters.status) params.status = filters.status;
      if (filters.search) params.search = filters.search;
      if (filters.employeeId) params.employeeId = filters.employeeId;
      const res = await api.get('/reports/daily', { params });
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load report.');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load({}, 1);
    api.get('/employees', { params: { limit: 100 } }).then((res) => setEmployees(res.data.data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    load({ date, status, search, employeeId }, 1);
  };

  const handleClear = () => {
    setDate('');
    setStatus('');
    setSearch('');
    setEmployeeId('');
    setPage(1);
    load({}, 1);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    load({ date, status, search, employeeId }, newPage);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/records/${deleteTarget.recordId}`);
      showToast('Record deleted successfully.');
      setDeleteTarget(null);
      load({ date, status, search, employeeId }, page);
    } catch (err) {
      showToast(err.response?.data?.message || 'Unable to delete record.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const hasActiveFilters = date || status || search || employeeId;

  // Safe fallbacks so a missing or differently-shaped response can never
  // crash the page into a blank screen.
  const summary = data?.summary || {};
  const rows = data?.data || [];
  const pagination = data?.pagination || null;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-800">Reports</h1>
      <p className="text-sm text-gray-500">
        Shows every record from every file and manual entry. Filter by date, status, a search term, or a specific
        user.
      </p>

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
            className="input w-52"
            placeholder="Name, email, or phone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
          <select className="input w-48" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
            <option value="">All users</option>
            {employees.map((emp) => (
              <option key={emp._id} value={emp._id}>
                {emp.name} ({emp.employeeId})
              </option>
            ))}
          </select>
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

      {loading ? (
        <p className="text-sm text-gray-500">Loading report...</p>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <IconStatCard icon="📋" label="Total Listed Data" value={summary.totalListed ?? 0} color="blue" />
            <IconStatCard icon="⭐" label="Total Interested" value={summary.totalInterested ?? 0} color="yellow" />
            <IconStatCard icon="📵" label="Total Not Connected" value={summary.totalNotConnected ?? 0} color="orange" />
            <IconStatCard icon="🎉" label="Total Joined" value={summary.totalJoined ?? 0} color="green" />
          </div>

          <div className="card overflow-x-auto">
            {rows.length === 0 ? (
              <EmptyState title="No matching records" description="Try adjusting your filters." />
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-left">
                  <tr>
                    <th className="px-4 py-2">Sr. No.</th>
                    <th className="px-4 py-2">Name</th>
                    <th className="px-4 py-2">Phone</th>
                    <th className="px-4 py-2">Email</th>
                    <th className="px-4 py-2">Resume URL</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">User</th>
                    <th className="px-4 py-2">Lead Source</th>
                    <th className="px-4 py-2">Time</th>
                    <th className="px-4 py-2">Date</th>
                    <th className="px-4 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((r, i) => {
                    const ts = new Date(r.timestamp);
                    const serial = ((pagination?.page ?? 1) - 1) * (pagination?.limit ?? 50) + i + 1;
                    return (
                      <tr key={r.recordId}>
                        <td className="px-4 py-2">{serial}</td>
                        <td className="px-4 py-2 font-medium">{r.customerName}</td>
                        <td className="px-4 py-2">{r.phone}</td>
                        <td className="px-4 py-2">{r.email || '-'}</td>
                        <td className="px-4 py-2">
                          <ResumeLink url={r.resumeUrl} />
                        </td>
                        <td className="px-4 py-2">
                          <StatusBadge status={r.status} />
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          {r.employeeName}
                          {r.employeeCode ? ` (${r.employeeCode})` : ''}
                        </td>
                        <td className="px-4 py-2">{r.leadSource}</td>
                        <td className="px-4 py-2 whitespace-nowrap">{ts.toLocaleTimeString()}</td>
                        <td className="px-4 py-2 whitespace-nowrap">{ts.toLocaleDateString()}</td>
                        <td className="px-4 py-2 space-x-2 whitespace-nowrap">
                          <button
                            className="text-brand-600 hover:underline text-xs"
                            onClick={() => navigate(`/admin/records/detail/${r.recordId}`)}
                          >
                            View
                          </button>
                          <button className="text-red-600 hover:underline text-xs" onClick={() => setDeleteTarget(r)}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            <Pagination pagination={pagination} onPageChange={handlePageChange} />
          </div>
        </>
      ) : null}

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Record">
        <p className="text-sm text-gray-600">
          This will permanently delete <span className="font-medium">{deleteTarget?.customerName}</span> from the
          database, including their comments and activity history. This cannot be undone.
        </p>
        <div className="flex justify-end gap-2 pt-4">
          <button className="btn-secondary" onClick={() => setDeleteTarget(null)}>
            Cancel
          </button>
          <button className="btn-danger" disabled={deleting} onClick={handleDelete}>
            {deleting ? 'Deleting...' : 'OK, Delete'}
          </button>
        </div>
      </Modal>
    </div>
  );
}