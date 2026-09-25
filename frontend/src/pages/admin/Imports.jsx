import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import Pagination from '../../components/Pagination';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';
import { useToast } from '../../context/ToastContext';

export default function Imports() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [imports, setImports] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [editTarget, setEditTarget] = useState(null);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/imports', { params: { page } });
      setImports(res.data.data);
      setPagination(res.data.pagination);
    } catch {
      showToast('Unable to load imported files.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleRename = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/imports/${editTarget._id}`, { fileName: editName });
      showToast('File renamed successfully.');
      setEditTarget(null);
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Unable to rename file.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await api.delete(`/imports/${deleteTarget._id}`);
      showToast(res.data.message);
      setDeleteTarget(null);
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Unable to delete file.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-800">Records</h1>
      <p className="text-sm text-gray-500">All imported Excel files. Open one to view and manage its records.</p>

      <div className="card overflow-x-auto">
        {loading ? (
          <p className="p-6 text-sm text-gray-500">Loading...</p>
        ) : imports.length === 0 ? (
          <EmptyState title="No files imported yet" description="Go to Import Excel to upload your first file." />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th className="px-4 py-2">Sr. No.</th>
                <th className="px-4 py-2">File Name</th>
                <th className="px-4 py-2">Total Rows</th>
                <th className="px-4 py-2">Imported</th>
                <th className="px-4 py-2">Failed</th>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {imports.map((imp, i) => (
                <tr key={imp._id}>
                  <td className="px-4 py-2">{(pagination.page - 1) * pagination.limit + i + 1}</td>
                  <td className="px-4 py-2 font-medium">{imp.fileName}</td>
                  <td className="px-4 py-2">{imp.totalRows}</td>
                  <td className="px-4 py-2 text-green-700">{imp.importedCount}</td>
                  <td className="px-4 py-2 text-red-600">{imp.failedCount}</td>
                  <td className="px-4 py-2 text-xs text-gray-400">{new Date(imp.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-2 space-x-2 whitespace-nowrap">
                    <button
                      className="text-brand-600 hover:underline text-xs"
                      onClick={() => navigate(`/admin/records/import/${imp._id}`)}
                    >
                      View
                    </button>
                    <button
                      className="text-yellow-600 hover:underline text-xs"
                      onClick={() => {
                        setEditTarget(imp);
                        setEditName(imp.fileName);
                      }}
                    >
                      Edit
                    </button>
                    <button className="text-red-600 hover:underline text-xs" onClick={() => setDeleteTarget(imp)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination pagination={pagination} onPageChange={setPage} />
      </div>

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Rename Import File">
        <form onSubmit={handleRename} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">File Name</label>
            <input className="input" value={editName} onChange={(e) => setEditName(e.target.value)} required />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setEditTarget(null)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Import File">
        <p className="text-sm text-gray-600">
          This will permanently delete <span className="font-medium">{deleteTarget?.fileName}</span> and all{' '}
          {deleteTarget?.importedCount} record(s) imported from it, including their comments and activity history.
          This cannot be undone.
        </p>
        <div className="flex justify-end gap-2 pt-4">
          <button className="btn-secondary" onClick={() => setDeleteTarget(null)}>
            Cancel
          </button>
          <button className="btn-danger" disabled={deleting} onClick={handleDelete}>
            {deleting ? 'Deleting...' : 'Delete Permanently'}
          </button>
        </div>
      </Modal>
    </div>
  );
}