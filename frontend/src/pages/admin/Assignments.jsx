import { useEffect, useState } from 'react';
import api from '../../api/axios';
// import Pagination from '../../components/Pagination';
import EmptyState from '../../components/EmptyState';
// import { STATUS_OPTIONS } from '../../components/StatusBadge';
import { useToast } from '../../context/ToastContext';

export default function Assignments() {
  const { showToast } = useToast();
  const [employees, setEmployees] = useState([]);

  // // Top: Bulk Assign by Filter (Status + Assign to only)
  // const [filterStatus, setFilterStatus] = useState('');
  // const [filterEmployeeId, setFilterEmployeeId] = useState('');
  // const [assigningByFilter, setAssigningByFilter] = useState(false);

  // Left card: Assign File to Employee
  const [imports, setImports] = useState([]);
  const [fileEmployeeId, setFileEmployeeId] = useState('');
  const [selectedFileId, setSelectedFileId] = useState('');
  const [assigningFile, setAssigningFile] = useState(false);

  // Right card: File Assignments (with inline Edit)
  const [editingFileId, setEditingFileId] = useState(null);
  const [editEmployeeId, setEditEmployeeId] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // // Bottom: Assignment History
  // const [history, setHistory] = useState([]);
  // const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    api.get('/employees', { params: { limit: 100, status: 'active' } }).then((res) => setEmployees(res.data.data));
  }, []);

  const loadImports = async () => {
    const res = await api.get('/imports', { params: { limit: 100 } });
    setImports(res.data.data);
  };

  const loadHistory = async () => {
    const res = await api.get('/assignments', { params: { page } });
    // setHistory(res.data.data);
    setPagination(res.data.pagination);
  };

  useEffect(() => {
    loadImports();
  }, []);

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // const handleBulkAssignByFilter = async (e) => {
  //   e.preventDefault();
  //   if (!filterEmployeeId) return;
  //   setAssigningByFilter(true);
  //   try {
  //     const filter = {};
  //     if (filterStatus) filter.status = filterStatus;
  //     const res = await api.post('/assignments/bulk-by-filter', { filter, employeeId: filterEmployeeId });
  //     showToast(res.data.message);
  //     loadImports();
  //     loadHistory();
  //   } catch (err) {
  //     showToast(err.response?.data?.message || 'Unable to assign records.', 'error');
  //   } finally {
  //     setAssigningByFilter(false);
  //   }
  // };

  const handleAssignFileToEmployee = async (e) => {
    e.preventDefault();
    if (!fileEmployeeId || !selectedFileId) return;
    setAssigningFile(true);
    try {
      const res = await api.post('/assignments/bulk-by-filter', {
        filter: { importBatch: selectedFileId },
        employeeId: fileEmployeeId,
      });
      showToast(res.data.message);
      setFileEmployeeId('');
      setSelectedFileId('');
      loadImports();
      loadHistory();
    } catch (err) {
      showToast(err.response?.data?.message || 'Unable to assign file.', 'error');
    } finally {
      setAssigningFile(false);
    }
  };

  const startEdit = (file) => {
    setEditingFileId(file._id);
    setEditEmployeeId(file.assignedToSummary?.type === 'single' ? file.assignedToSummary.employeeId : '');
  };

  const handleSaveEdit = async (fileId) => {
    if (!editEmployeeId) return;
    setSavingEdit(true);
    try {
      const res = await api.post('/assignments/bulk-by-filter', {
        filter: { importBatch: fileId },
        employeeId: editEmployeeId,
      });
      showToast(res.data.message);
      setEditingFileId(null);
      setEditEmployeeId('');
      loadImports();
      loadHistory();
    } catch (err) {
      showToast(err.response?.data?.message || 'Unable to update assignment.', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-800">Assignments</h1>

      {/* <div className="card p-5">
        <h2 className="font-medium text-gray-700 mb-3">Bulk Assign by Filter</h2>
        <p className="text-sm text-gray-500 mb-4">
          Assign every record matching the status below to one employee — useful for large batches.
        </p>
        <form onSubmit={handleBulkAssignByFilter} className="flex flex-wrap gap-2 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Status</label>
            <select className="input w-40" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">Any</option>
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Assign to</label>
            <select
              className="input w-48"
              value={filterEmployeeId}
              onChange={(e) => setFilterEmployeeId(e.target.value)}
              required
            >
              <option value="">-- Select employee --</option>
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.name} ({emp.employeeId})
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn-primary" disabled={assigningByFilter}>
            {assigningByFilter ? 'Assigning...' : 'Assign Matching Records'}
          </button>
        </form>
      </div> */}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="font-medium text-gray-700 mb-3">Assign File to Employee</h2>
          <p className="text-sm text-gray-500 mb-4">
            Assign every record in one imported Excel file to a single employee.
          </p>
          <form onSubmit={handleAssignFileToEmployee} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
              <select className="input" value={fileEmployeeId} onChange={(e) => setFileEmployeeId(e.target.value)} required>
                <option value="">-- Select employee --</option>
                {employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.name} ({emp.employeeId})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">File</label>
              <select className="input" value={selectedFileId} onChange={(e) => setSelectedFileId(e.target.value)} required>
                <option value="">-- Select file --</option>
                {imports.map((imp) => (
                  <option key={imp._id} value={imp._id}>
                    {imp.fileName}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn-primary w-full" disabled={assigningFile}>
              {assigningFile ? 'Assigning...' : 'Assign to User'}
            </button>
          </form>
        </div>

        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200">
            <h2 className="font-medium text-gray-700">File Assignments</h2>
          </div>
          {imports.length === 0 ? (
            <EmptyState title="No files imported yet" />
          ) : (
            <ul className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
              {imports.map((imp) => (
                <li key={imp._id} className="px-5 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{imp.fileName}</p>
                      {editingFileId !== imp._id && (
                        <p className="text-xs text-gray-500">{imp.assignedToSummary?.label}</p>
                      )}
                    </div>
                    {editingFileId === imp._id ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          className="input w-40 text-xs"
                          value={editEmployeeId}
                          onChange={(e) => setEditEmployeeId(e.target.value)}
                        >
                          <option value="">-- Select --</option>
                          {employees.map((emp) => (
                            <option key={emp._id} value={emp._id}>
                              {emp.name} ({emp.employeeId})
                            </option>
                          ))}
                        </select>
                        <button
                          className="btn-primary px-2 py-1 text-xs"
                          disabled={savingEdit || !editEmployeeId}
                          onClick={() => handleSaveEdit(imp._id)}
                        >
                          Save
                        </button>
                        <button className="btn-secondary px-2 py-1 text-xs" onClick={() => setEditingFileId(null)}>
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button className="text-brand-600 hover:underline text-xs shrink-0" onClick={() => startEdit(imp)}>
                        Edit
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      
    </div>
  );
}