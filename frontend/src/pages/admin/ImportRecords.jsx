import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/axios';
import EmptyState from '../../components/EmptyState';
import RangeSelector from '../../components/RangeSelector';
import { STATUS_OPTIONS } from '../../components/StatusBadge';
import Modal from '../../components/Modal';
import { useToast } from '../../context/ToastContext';

const PAGE_SIZE = 50;

export default function ImportRecords() {
  const { importId } = useParams();
  const { showToast } = useToast();
  const [importDoc, setImportDoc] = useState(null);
  const [assignedToSummary, setAssignedToSummary] = useState(null);

  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ search: '', status: '' });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);

  const [employees, setEmployees] = useState([]);
  const [showAssign, setShowAssign] = useState(false);
  const [assignTo, setAssignTo] = useState('');
  const [assigning, setAssigning] = useState(false);

  const loadImport = async () => {
    const res = await api.get(`/imports/${importId}`);
    setImportDoc(res.data.import);
    setAssignedToSummary(res.data.assignedToSummary);
  };

  const loadRecords = async () => {
    setLoading(true);
    try {
      const res = await api.get('/records', {
        params: { importBatch: importId, page, limit: PAGE_SIZE, ...filters },
      });
      setRecords(res.data.data);
      setPagination(res.data.pagination);
    } catch {
      showToast('Unable to load records.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadImport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importId]);

  useEffect(() => {
    loadRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importId, page]);

  useEffect(() => {
    api.get('/employees', { params: { limit: 100, status: 'active' } }).then((res) => setEmployees(res.data.data));
  }, []);

  const applyFilters = (e) => {
    e.preventDefault();
    setPage(1);
    loadRecords();
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
      loadRecords();
      loadImport();
    } catch (err) {
      showToast(err.response?.data?.message || 'Unable to assign records.', 'error');
    } finally {
      setAssigning(false);
    }
  };

  if (!importDoc) return <p className="text-sm text-gray-500">Loading...</p>;

  return (
    <div className="space-y-4">
      <Link to="/admin/records" className="text-sm text-brand-600 hover:underline">
        &larr; Back to Imported Files
      </Link>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">{importDoc.fileName}</h1>
          <p className="text-sm text-gray-500">
            Assigned To: <span className="font-medium text-gray-700">{assignedToSummary?.label}</span>
          </p>
        </div>
        {selected.length > 0 && (
          <button className="btn-primary" onClick={() => setShowAssign(true)}>
            Assign {selected.length} Selected
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-2">
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

        {pagination && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-gray-500">Showing rows:</span>
            <RangeSelector total={pagination.total} limit={PAGE_SIZE} page={page} onChange={setPage} />
          </div>
        )}
      </div>

      <div className="card overflow-x-auto">
        {loading ? (
          <p className="p-6 text-sm text-gray-500">Loading...</p>
        ) : records.length === 0 ? (
          <EmptyState title="No records found" description="Try adjusting your filters." />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th className="px-4 py-2">
                  <input type="checkbox" checked={selected.length === records.length} onChange={toggleSelectAll} />
                </th>
                <th className="px-4 py-2">Sr. No.</th>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Phone</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Lead Source</th>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Time</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {records.map((r, i) => {
                const ts = new Date(r.createdAt);
                const leadSource = r.leadSource || importDoc.leadSource || '-';
                return (
                  <tr key={r._id}>
                    <td className="px-4 py-2">
                      <input type="checkbox" checked={selected.includes(r._id)} onChange={() => toggleSelect(r._id)} />
                    </td>
                    <td className="px-4 py-2 text-gray-500">{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td className="px-4 py-2 font-medium">{r.customerName}</td>
                    <td className="px-4 py-2">{r.phone}</td>
                    <td className="px-4 py-2">{r.email || '-'}</td>
                    <td className="px-4 py-2">{leadSource}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{ts.toLocaleDateString()}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{ts.toLocaleTimeString()}</td>
                    <td className="px-4 py-2">
                      <Link to={`/admin/records/detail/${r._id}`} className="text-brand-600 hover:underline text-xs">
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
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