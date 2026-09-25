import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import Pagination from '../../components/Pagination';
import EmptyState from '../../components/EmptyState';
import StatusBadge, { STATUS_OPTIONS } from '../../components/StatusBadge';
import Modal from '../../components/Modal';
import { useToast } from '../../context/ToastContext';

export default function Records() {
  const { showToast } = useToast();
  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ search: '', status: '', city: '', product: '', unassigned: '' });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);

  const [employees, setEmployees] = useState([]);
  const [showAssign, setShowAssign] = useState(false);
  const [assignTo, setAssignTo] = useState('');
  const [assigning, setAssigning] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = { page, ...filters };
      if (!params.unassigned) delete params.unassigned;
      const res = await api.get('/records', { params });
      setRecords(res.data.data);
      setPagination(res.data.pagination);
    } catch {
      showToast('Unable to load records.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    api.get('/employees', { params: { limit: 100, status: 'active' } }).then((res) => setEmployees(res.data.data));
  }, []);

  const applyFilters = (e) => {
    e.preventDefault();
    setPage(1);
    load();
  };

  const toggleSelect = (id) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    if (selected.length === records.length) setSelected([]);
    else setSelected(records.map((r) => r._id));
  };

  const handleAssign = async () => {
    if (!assignTo) return;
    setAssigning(true);
    try {
      const res = await api.post('/assignments', { recordIds: selected, employeeId: assignTo });
      showToast(res.data.message);
      setShowAssign(false);
      setSelected([]);
      setAssignTo('');
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Unable to assign records.', 'error');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Records</h1>
        {selected.length > 0 && (
          <button className="btn-primary" onClick={() => setShowAssign(true)}>
            Assign {selected.length} Selected
          </button>
        )}
      </div>

      <form onSubmit={applyFilters} className="flex flex-wrap gap-2">
        <input
          className="input max-w-[220px]"
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
        <input
          className="input max-w-[140px]"
          placeholder="City"
          value={filters.city}
          onChange={(e) => setFilters({ ...filters, city: e.target.value })}
        />
        <input
          className="input max-w-[140px]"
          placeholder="Product"
          value={filters.product}
          onChange={(e) => setFilters({ ...filters, product: e.target.value })}
        />
        <label className="flex items-center gap-1.5 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={!!filters.unassigned}
            onChange={(e) => setFilters({ ...filters, unassigned: e.target.checked ? 'true' : '' })}
          />
          Unassigned only
        </label>
        <button type="submit" className="btn-secondary">
          Apply
        </button>
      </form>

      <div className="card overflow-x-auto">
        {loading ? (
          <p className="p-6 text-sm text-gray-500">Loading...</p>
        ) : records.length === 0 ? (
          <EmptyState title="No records found" description="Try adjusting your filters or import an Excel file." />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th className="px-4 py-2">
                  <input type="checkbox" checked={selected.length === records.length} onChange={toggleSelectAll} />
                </th>
                <th className="px-4 py-2">Customer</th>
                <th className="px-4 py-2">Phone</th>
                <th className="px-4 py-2">City</th>
                <th className="px-4 py-2">Product</th>
                <th className="px-4 py-2">Assigned To</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {records.map((r) => (
                <tr key={r._id}>
                  <td className="px-4 py-2">
                    <input type="checkbox" checked={selected.includes(r._id)} onChange={() => toggleSelect(r._id)} />
                  </td>
                  <td className="px-4 py-2 font-medium">{r.customerName}</td>
                  <td className="px-4 py-2">{r.phone}</td>
                  <td className="px-4 py-2">{r.city || '-'}</td>
                  <td className="px-4 py-2">{r.product || '-'}</td>
                  <td className="px-4 py-2">{r.assignedTo ? `${r.assignedTo.name} (${r.assignedTo.employeeId})` : <span className="text-gray-400">Unassigned</span>}</td>
                  <td className="px-4 py-2">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-2">
                    <Link to={`/admin/records/${r._id}`} className="text-brand-600 hover:underline text-xs">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination pagination={pagination} onPageChange={setPage} />
      </div>

      <Modal open={showAssign} onClose={() => setShowAssign(false)} title={`Assign ${selected.length} Record(s)`}>
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">Assign to employee</label>
          <select className="input" value={assignTo} onChange={(e) => setAssignTo(e.target.value)}>
            <option value="">-- Select employee --</option>
            {employees.map((emp) => (
              <option key={emp._id} value={emp._id}>
                {emp.name} ({emp.employeeId})
              </option>
            ))}
          </select>
          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-secondary" onClick={() => setShowAssign(false)}>
              Cancel
            </button>
            <button className="btn-primary" disabled={!assignTo || assigning} onClick={handleAssign}>
              {assigning ? 'Assigning...' : 'Assign'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
