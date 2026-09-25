import { useEffect, useState } from 'react';
import api from '../../api/axios';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import EmptyState from '../../components/EmptyState';
import { useToast } from '../../context/ToastContext';

const emptyForm = { employeeId: '', name: '', email: '', password: '' };

export default function Employees() {
  const { showToast } = useToast();
  const [employees, setEmployees] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [editEmployee, setEditEmployee] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '' });

  const [resetTarget, setResetTarget] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/employees', { params: { page, search, status } });
      setEmployees(res.data.data);
      setPagination(res.data.pagination);
    } catch {
      showToast('Unable to load employees.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    load();
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      await api.post('/employees', form);
      showToast('Employee created successfully.');
      setShowCreate(false);
      setForm(emptyForm);
      load();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Unable to create employee.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/employees/${editEmployee._id}`, editForm);
      showToast('Employee updated successfully.');
      setEditEmployee(null);
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Unable to update employee.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (employee) => {
    const nextStatus = employee.status === 'active' ? 'inactive' : 'active';
    try {
      await api.put(`/employees/${employee._id}/status`, { status: nextStatus });
      showToast(`Employee ${nextStatus === 'active' ? 'activated' : 'deactivated'} successfully.`);
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Unable to update status.', 'error');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/employees/${resetTarget._id}/reset-password`, { newPassword });
      showToast('Password reset successfully.');
      setResetTarget(null);
      setNewPassword('');
    } catch (err) {
      showToast(err.response?.data?.message || 'Unable to reset password.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Employees</h1>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          + Add Employee
        </button>
      </div>

      <form onSubmit={handleSearch} className="flex flex-wrap gap-2">
        <input
          className="input max-w-xs"
          placeholder="Search name, ID, or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="input max-w-[160px]" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button type="submit" className="btn-secondary">
          Search
        </button>
      </form>

      <div className="card overflow-x-auto">
        {loading ? (
          <p className="p-6 text-sm text-gray-500">Loading...</p>
        ) : employees.length === 0 ? (
          <EmptyState title="No employees found" description="Try adjusting your search or add a new employee." />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th className="px-4 py-2">Employee ID</th>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {employees.map((emp) => (
                <tr key={emp._id}>
                  <td className="px-4 py-2 font-medium">{emp.employeeId}</td>
                  <td className="px-4 py-2">{emp.name}</td>
                  <td className="px-4 py-2">{emp.email}</td>
                  <td className="px-4 py-2">
                    <span className={`badge ${emp.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {emp.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 space-x-2 whitespace-nowrap">
                    <button
                      className="text-brand-600 hover:underline text-xs"
                      onClick={() => {
                        setEditEmployee(emp);
                        setEditForm({ name: emp.name, email: emp.email });
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="text-yellow-600 hover:underline text-xs"
                      onClick={() => setResetTarget(emp)}
                    >
                      Reset Password
                    </button>
                    <button
                      className={`text-xs hover:underline ${emp.status === 'active' ? 'text-red-600' : 'text-green-600'}`}
                      onClick={() => toggleStatus(emp)}
                    >
                      {emp.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination pagination={pagination} onPageChange={setPage} />
      </div>

      {/* Create Employee Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add Employee">
        {formError && <div className="mb-3 rounded-md bg-red-50 text-red-700 text-sm px-3 py-2">{formError}</div>}
        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
            <input
              className="input"
              value={form.employeeId}
              onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
              placeholder="EMP001"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              className="input"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              className="input"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Min 8 chars, upper/lower/number/symbol"
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Create Employee'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Employee Modal */}
      <Modal open={!!editEmployee} onClose={() => setEditEmployee(null)} title="Edit Employee">
        <form onSubmit={handleUpdate} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              className="input"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              className="input"
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setEditEmployee(null)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal open={!!resetTarget} onClose={() => setResetTarget(null)} title={`Reset Password - ${resetTarget?.employeeId || ''}`}>
        <form onSubmit={handleResetPassword} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input
              type="password"
              className="input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 8 chars, upper/lower/number/symbol"
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setResetTarget(null)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Reset Password'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
