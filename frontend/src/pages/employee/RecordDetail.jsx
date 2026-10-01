import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { STATUS_OPTIONS } from '../../components/StatusBadge';
import { useToast } from '../../context/ToastContext';

export default function EmployeeRecordDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [record, setRecord] = useState(null);
  const [activities, setActivities] = useState([]);
  const [error, setError] = useState('');

  const [infoForm, setInfoForm] = useState(null);
  const [savingInfo, setSavingInfo] = useState(false);

  const [status, setStatus] = useState('');
  const [comment, setComment] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [savingWork, setSavingWork] = useState(false);

  const load = async () => {
    try {
      const res = await api.get(`/employee/records/${id}`);
      setRecord(res.data.record);
      setInfoForm({
        customerName: res.data.record.customerName,
        phone: res.data.record.phone,
        email: res.data.record.email,
      });
      setStatus(res.data.record.status);
      setFollowUpDate(res.data.record.followUpDate ? res.data.record.followUpDate.substring(0, 10) : '');
      const act = await api.get('/activities', { params: { recordId: id } });
      setActivities(act.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load record.');
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSaveInfo = async (e) => {
    e.preventDefault();
    setSavingInfo(true);
    try {
      await api.put(`/employee/records/${id}`, infoForm);
      showToast('Record updated successfully.');
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Unable to update record.', 'error');
    } finally {
      setSavingInfo(false);
    }
  };

  const handleSaveWork = async (e) => {
    e.preventDefault();
    setSavingWork(true);
    try {
      await api.put(`/employee/records/${id}`, {
        status,
        comment: comment.trim() || undefined,
        followUpDate: followUpDate || null,
      });
      showToast('Record updated successfully.');
      setComment('');
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Unable to save changes.', 'error');
    } finally {
      setSavingWork(false);
    }
  };

  if (error) return <div className="text-red-600 text-sm">{error}</div>;
  if (!record || !infoForm) return <p className="text-sm text-gray-500">Loading...</p>;

  return (
    <div className="space-y-6 max-w-2xl">
      <button onClick={() => navigate(-1)} className="text-sm text-brand-600 hover:underline">
        &larr; Back
      </button>

      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-800">{record.customerName}</h1>
      </div>

      <form onSubmit={handleSaveInfo} className="card p-5 grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
          <input
            className="input"
            value={infoForm.customerName || ''}
            onChange={(e) => setInfoForm({ ...infoForm, customerName: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input
            className="input"
            value={infoForm.phone || ''}
            onChange={(e) => setInfoForm({ ...infoForm, phone: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            className="input"
            value={infoForm.email || ''}
            onChange={(e) => setInfoForm({ ...infoForm, email: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Lead Source</label>
          <input className="input bg-gray-50 text-gray-500" value={record.leadSource || '-'} disabled readOnly />
        </div>
        <div className="sm:col-span-2 flex justify-end">
          <button type="submit" className="btn-primary" disabled={savingInfo}>
            {savingInfo ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>

      <form onSubmit={handleSaveWork} className="card p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Add Comment</label>
          <textarea
            className="input"
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Customer requested pricing information..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Follow-up Date</label>
          <input
            type="date"
            className="input max-w-xs"
            value={followUpDate}
            onChange={(e) => setFollowUpDate(e.target.value)}
          />
        </div>
        <div className="flex justify-end">
          <button type="submit" className="btn-primary" disabled={savingWork}>
            {savingWork ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>

      <div className="card p-5">
        <h2 className="font-medium text-gray-700 mb-3">Comment History</h2>
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
                  {a.action.replace('_', ' ')}
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