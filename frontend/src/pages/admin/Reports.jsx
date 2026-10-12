import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import IconStatCard from '../../components/IconStatCard';
import EmptyState from '../../components/EmptyState';
import Pagination from '../../components/Pagination';
import Modal from '../../components/Modal';
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

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
        <div>
          <input
            type="date"
            className="input w-40"
            value={date}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div>
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
          <input
            className="input w-52"
            placeholder="Name, email, or phone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div>
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
            <IconStatCard icon="📋" label="Total Listed Data" value={data.summary.totalListed} color="blue" />
            <IconStatCard icon="⭐" label="Total Interested" value={data.summary.totalInterested} color="yellow" />
            <IconStatCard icon="📞" label="Total Contacted" value={data.summary.totalContacted} color="gray" />
            <IconStatCard icon="🎉" label="Total Joined" value={data.summary.totalJoined} color="green" />
          </div>

          <div className="card overflow-x-auto">
            {data.data.length === 0 ? (
              <EmptyState title="No matching records" description="Try adjusting your filters." />
            ) : (
              <table className="w-full table-fixed text-sm">
                <colgroup>
                  <col style={{ width: '45px' }} />
                  <col style={{ width: '170px' }} />
                  <col style={{ width: '110px' }} />
                  <col style={{ width: '230px' }} />
                  <col style={{ width: '135px' }} />
                  <col style={{ width: '140px' }} />
                  <col style={{ width: '120px' }} />
                  <col style={{ width: '170px' }} />
                  <col style={{ width: '130px' }} />
                </colgroup>

                <thead className="bg-gray-50 text-gray-500 text-left">
                  <tr>
                    <th className=" px-4 py-2">Sr.</th>
                    <th className=" px-4 py-2">Name</th>
                    <th className=" px-4 py-2">Phone</th>
                    <th className=" px-4 py-2">Email</th>
                    <th className=" px-4 py-2">Status</th>
                    <th className=" px-4 py-2">User</th>
                    <th className=" px-4 py-2">Lead Source</th>
                    <th className=" px-4 py-2">Date</th>
                    <th className=" px-4 py-2">Actions</th>
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
                        <td className="px-4 py-2 whitespace-nowrap">
                          {r.employeeName}
                        </td>
                        <td className="px-4 py-2">{r.leadSource}</td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <span>
                            {ts.toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                            ,
                          </span>
                          <span className="text-xs text-gray-500 ml-1">
                            {ts.toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true,
                            }).replace(' ', '')}
                          </span>
                        </td>
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
            <Pagination pagination={data.pagination} onPageChange={handlePageChange} />
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