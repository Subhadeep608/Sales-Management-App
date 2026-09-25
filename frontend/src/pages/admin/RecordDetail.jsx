import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import StatusBadge from '../../components/StatusBadge';
import { useToast } from '../../context/ToastContext';

export default function AdminRecordDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [record, setRecord] = useState(null);
  const [activities, setActivities] = useState([]);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const res = await api.get(`/records/${id}`);
    setRecord(res.data.record);
    setForm({
      customerName: res.data.record.customerName,
      phone: res.data.record.phone,
      email: res.data.record.email,
      company: res.data.record.company,
      city: res.data.record.city,
      product: res.data.record.product,
    });
    const act = await api.get('/activities', { params: { recordId: id } });
    setActivities(act.data.data);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/records/${id}`, form);
      showToast('Record updated successfully.');
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Unable to update record.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!record || !form) return <p className="text-sm text-gray-500">Loading...</p>;

  return (
    <div className="space-y-6 max-w-3xl">
      <button onClick={() => navigate(-1)} className="text-sm text-brand-600 hover:underline">
        &larr; Back
      </button>

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">{record.customerName}</h1>
        <StatusBadge status={record.status} />
      </div>

      <form onSubmit={handleSave} className="card p-5 grid sm:grid-cols-2 gap-4">
        {['customerName', 'phone', 'email', 'company', 'city', 'product'].map((field) => (
          <div key={field}>
            <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
              {field.replace(/([A-Z])/g, ' $1')}
            </label>
            <input
              className="input"
              value={form[field] || ''}
              onChange={(e) => setForm({ ...form, [field]: e.target.value })}
            />
          </div>
        ))}
        <div className="sm:col-span-2 flex justify-end">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>

      <div className="card p-5">
        <h2 className="font-medium text-gray-700 mb-3">
          Assigned To: {record.assignedTo ? `${record.assignedTo.name} (${record.assignedTo.employeeId})` : 'Unassigned'}
        </h2>
      </div>

      <div className="card p-5">
        <h2 className="font-medium text-gray-700 mb-3">Comments</h2>
        {record.comments?.length === 0 ? (
          <p className="text-sm text-gray-400">No comments yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {record.comments.map((c) => (
              <li key={c._id} className="border-l-2 border-brand-200 pl-3">
                <p>{c.text}</p>
                <p className="text-xs text-gray-400">
                  {c.addedBy?.name} · {new Date(c.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card p-5">
        <h2 className="font-medium text-gray-700 mb-3">Activity History</h2>
        {activities.length === 0 ? (
          <p className="text-sm text-gray-400">No activity yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {activities.map((a) => (
              <li key={a._id} className="flex justify-between border-b border-gray-100 pb-2">
                <span>
                  <span className="font-medium">{a.employee?.name}</span> {a.action.replace('_', ' ')}
                  {a.oldValue !== null && a.newValue !== null && (
                    <span className="text-gray-500">
                      {' '}
                      ({String(a.oldValue)} → {String(a.newValue)})
                    </span>
                  )}
                </span>
                <span className="text-xs text-gray-400">{new Date(a.createdAt).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
