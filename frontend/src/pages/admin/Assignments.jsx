import { useEffect, useState } from 'react';
import api from '../../api/axios';
import EmptyState from '../../components/EmptyState';
import { useToast } from '../../context/ToastContext';

const emptyManualForm = { customerName: '', phone: '', email: '', leadSource: '', employeeId: '' };

export default function Assignments() {
  const { showToast } = useToast();
  const [employees, setEmployees] = useState([]);

  const [manualForm, setManualForm] = useState(emptyManualForm);
  const [manualError, setManualError] = useState('');
  const [savingManual, setSavingManual] = useState(false);

  const [imports, setImports] = useState([]);
  const [fileEmployeeId, setFileEmployeeId] = useState('');
  const [selectedFileId, setSelectedFileId] = useState('');
  const [assigningFile, setAssigningFile] = useState(false);

  const [editingFileId, setEditingFileId] = useState(null);
  const [editEmployeeId, setEditEmployeeId] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    api.get('/employees', { params: { limit: 100, status: 'active' } }).then((res) => setEmployees(res.data.data));
  }, []);

  const loadImports = async () => {
    const res = await api.get('/imports', { params: { limit: 100 } });
    setImports(res.data.data);
  };

  useEffect(() => {
    loadImports();
  }, []);

  const handleAddManualRecord = async (e) => {
    e.preventDefault();
    setManualError('');
    setSavingManual(true);
    try {
      const res = await api.post('/records/manual', manualForm);
      showToast(res.data.message);
      setManualForm(emptyManualForm);
      loadImports();
    } catch (err) {
      setManualError(err.response?.data?.message || 'Unable to add record.');
    } finally {
      setSavingManual(false);
    }
  };

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
    } catch (err) {
      showToast(err.response?.data?.message || 'Unable to update assignment.', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="space-y-6">

      <div className="card p-5">
        <h2 className="font-medium text-gray-800 mb-3">Add Manual Record</h2>
        <p className="text-sm text-gray-500 mb-4">
          Add a single customer record by hand and assign it directly to an employee — useful for a lead that
          didn't come from an Excel file. It will appear under "Manually Added Records" in Records and in that
          employee's My Records.
        </p>
        {manualError && <div className="mb-3 rounded-md bg-red-50 text-red-700 text-sm px-3 py-2">{manualError}</div>}
        <form onSubmit={handleAddManualRecord} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Customer Name *</label>
            <input
              className="input"
              value={manualForm.customerName}
              onChange={(e) => setManualForm({ ...manualForm, customerName: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Phone *</label>
            <input
              className="input"
              value={manualForm.phone}
              onChange={(e) => setManualForm({ ...manualForm, phone: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Email</label>
            <input
              type="email"
              className="input"
              value={manualForm.email}
              onChange={(e) => setManualForm({ ...manualForm, email: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Lead Source</label>
            <input
              className="input"
              placeholder="e.g. Referral, Walk-in"
              value={manualForm.leadSource}
              onChange={(e) => setManualForm({ ...manualForm, leadSource: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="block text-xs text-gray-500 mb-1">Assign To *</label>
            <select
              className="input"
              value={manualForm.employeeId}
              onChange={(e) => setManualForm({ ...manualForm, employeeId: e.target.value })}
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
          <div className="flex items-end sm:col-span-2 lg:col-span-1">
            <button type="submit" className="btn-primary w-full" disabled={savingManual}>
              {savingManual ? 'Adding...' : 'Add & Assign'}
            </button>
          </div>
        </form>
      </div>

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