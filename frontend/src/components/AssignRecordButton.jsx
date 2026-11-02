import { useEffect, useState } from 'react';
import api from '../api/axios';
import Modal from './Modal';
import { useToast } from '../context/ToastContext';

// A button that opens a popup for assigning or reassigning ONE record.
//  - currentEmployeeId: id of the current owner (leave empty if unassigned)
//  - currentLabel: the owner's display text, e.g. "Rahul Kumar (EMP001)"
//  - onAssigned: called after a successful assignment so the page can reload
export default function AssignRecordButton({
  recordId,
  recordName,
  currentEmployeeId,
  currentLabel,
  onAssigned,
  triggerLabel,
  triggerClassName,
}) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [employeeId, setEmployeeId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const hasOwner = !!currentEmployeeId;

  // The employee list is only fetched when the popup is opened.
  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    api
      .get('/employees', { params: { limit: 100, status: 'active' } })
      .then((res) => {
        if (!cancelled) setEmployees(res.data.data);
      })
      .catch(() => {
        if (!cancelled) setError('Unable to load employees.');
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const openModal = () => {
    setEmployeeId('');
    setError('');
    setOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!employeeId) return;
    setSaving(true);
    setError('');
    try {
      const res = await api.put(`/records/${recordId}/assign`, { employeeId });
      showToast(res.data.message);
      setOpen(false);
      if (onAssigned) onAssigned();
    } catch (err) {
      const apiErrors = err.response?.data?.errors;
      setError(
        Array.isArray(apiErrors) && apiErrors.length > 0
          ? apiErrors.map((e2) => e2.message).join(' ')
          : err.response?.data?.message || 'Unable to assign record.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className={triggerClassName || 'text-yellow-600 hover:underline text-xs'}
        onClick={openModal}
      >
        {triggerLabel || (hasOwner ? 'Reassign' : 'Assign')}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={hasOwner ? 'Reassign Record' : 'Assign Record'}>
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <div className="rounded-md bg-red-50 text-red-700 text-sm px-3 py-2">{error}</div>}

          <p className="text-sm text-gray-600">
            <span className="font-medium">{recordName}</span>
            {hasOwner && (
              <>
                {' '}
                is currently assigned to <span className="font-medium">{currentLabel}</span>.
              </>
            )}
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {hasOwner ? 'Move to employee' : 'Assign to employee'}
            </label>
            <select className="input" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} required>
              <option value="">-- Select employee --</option>
              {employees
                .filter((emp) => emp._id !== currentEmployeeId)
                .map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.name} ({emp.employeeId})
                  </option>
                ))}
            </select>
          </div>

          {hasOwner && (
            <p className="text-xs text-gray-400">
              It will be removed from {currentLabel}&apos;s records and appear in the new employee&apos;s My
              Records. They will be notified.
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving || !employeeId}>
              {saving ? 'Assigning...' : hasOwner ? 'Reassign' : 'Assign'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}