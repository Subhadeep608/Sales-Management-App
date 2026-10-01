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

  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

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

  const applyFilters = (e) => {
    e.preventDefault();
    setPage(1);
    loadRecords();
  };

  const startEdit = (record) => {
    setEditTarget(record);
    setEditForm({
      customerName: record.customerName,
      phone: record.phone,
      email: record.email,
      leadSource: record.leadSource,
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setSavingEdit(true);
    try {
      await api.put(`/records/${editTarget._id}`, editForm);
      showToast('Record updated successfully.');
      setEditTarget(null);
      loadRecords();
    } catch (err) {
      showToast(err.response?.data?.message || 'Unable to update record.', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/records/${deleteTarget._id}`);
      showToast('Record deleted successfully.');
      setDeleteTarget(null);
      loadRecords();
      loadImport();
    } catch (err) {
      showToast(err.response?.data?.message || 'Unable to delete record.', 'error');
    } finally {
      setDeleting(false);
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
                <th className="px-4 py-2">Sr. No.</th>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Phone</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Lead Source</th>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Time</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {records.map((r, i) => {
                const ts = new Date(r.createdAt);
                const leadSource = r.leadSource || importDoc.leadSource || '-';
                return (
                  <tr key={r._id}>
                    <td className="px-4 py-2 text-gray-500">{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td className="px-4 py-2 font-medium">{r.customerName}</td>
                    <td className="px-4 py-2">{r.phone}</td>
                    <td className="px-4 py-2">{r.email || '-'}</td>
                    <td className="px-4 py-2">{leadSource}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{ts.toLocaleDateString()}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{ts.toLocaleTimeString()}</td>
                    <td className="px-4 py-2 space-x-2 whitespace-nowrap">
                      <button className="text-brand-600 hover:underline text-xs" onClick={() => startEdit(r)}>
                        Edit
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
      </div>

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Record">
        {editForm && (
          <form onSubmit={handleSaveEdit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
              <input
                className="input"
                value={editForm.customerName || ''}
                onChange={(e) => setEditForm({ ...editForm, customerName: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                className="input"
                value={editForm.phone || ''}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                className="input"
                value={editForm.email || ''}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lead Source</label>
              <input
                className="input"
                value={editForm.leadSource || ''}
                onChange={(e) => setEditForm({ ...editForm, leadSource: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setEditTarget(null)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={savingEdit}>
                {savingEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </Modal>

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