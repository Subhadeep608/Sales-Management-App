import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';

// How often the bell checks for new notifications. Lower it for faster alerts.
const POLL_MS = 20000;

const timeAgo = (iso) => {
  const minutes = Math.floor(Math.max(Date.now() - new Date(iso).getTime(), 0) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return new Date(iso).toLocaleDateString();
};

export default function NotificationBell() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  // Ids already seen. The first load only fills this, so notifications that were
  // already waiting don't pop a toast. After that, anything unread and unseen
  // pops one.
  const seenIds = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/notifications');
      const list = res.data.notifications || [];
      setItems(list);
      setUnread(res.data.unreadCount || 0);

      if (seenIds.current === null) {
        seenIds.current = new Set(list.map((n) => n._id));
      } else {
        const fresh = list.filter((n) => !n.read && !seenIds.current.has(n._id));
        if (fresh.length === 1) showToast('You have got a new data-record.');
        else if (fresh.length > 1) showToast(`You have got ${fresh.length} new data-records.`);
        list.forEach((n) => seenIds.current.add(n._id));
      }
    } catch {
      // A failed check is ignored; the next one retries.
    }
  }, [showToast]);

  // Check on load, then every POLL_MS while the tab is visible, and straight
  // away when the employee comes back to the tab.
  useEffect(() => {
    load();
    const timer = setInterval(() => {
      if (!document.hidden) load();
    }, POLL_MS);
    const onVisible = () => {
      if (!document.hidden) load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load]);

  // Close the popup on an outside click or Escape.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = () => {
    if (!open) load();
    setOpen(!open);
  };

  const openItem = (n) => {
    if (!n.available) return;
    setOpen(false);
    if (!n.read) {
      setItems((prev) => prev.map((x) => (x._id === n._id ? { ...x, read: true } : x)));
      setUnread((c) => Math.max(c - 1, 0));
      api.put(`/notifications/${n._id}/read`).catch(() => {});
    }
    navigate(`/employee/records/${n.recordId}`);
  };

  const markAllRead = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
    try {
      await api.put('/notifications/read-all');
    } catch {
      load();
    }
  };

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={toggle}
        className="relative p-1.5 rounded-md hover:bg-gray-100 text-lg leading-none"
        aria-label="Notifications"
        title="Notifications"
      >
        <span aria-hidden="true">🔔</span>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-semibold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-1.5rem)] bg-white border border-gray-200 rounded-lg shadow-xl z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800">Notifications</h3>
            {unread > 0 && (
              <button type="button" className="text-xs text-brand-600 hover:underline" onClick={markAllRead}>
                Mark all as read
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <p className="px-4 py-8 text-sm text-gray-400 text-center">No notifications yet.</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto divide-y divide-gray-100">
              {items.map((n) => (
                <li key={n._id}>
                  <button
                    type="button"
                    onClick={() => openItem(n)}
                    disabled={!n.available}
                    className={`w-full text-left px-4 py-3 flex gap-3 items-start ${
                      n.available ? 'hover:bg-gray-50' : 'opacity-60 cursor-not-allowed'
                    } ${!n.read ? 'bg-brand-50' : ''}`}
                  >
                    <span
                      className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${n.read ? 'bg-transparent' : 'bg-brand-600'}`}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-gray-800">{n.message}</span>
                      <span className="block text-sm text-gray-600 truncate">
                        {n.recordName || 'Record'}
                        {n.recordPhone ? ` · ${n.recordPhone}` : ''}
                      </span>
                      <span className="block text-xs text-gray-400 mt-0.5">
                        {n.available ? timeAgo(n.createdAt) : `No longer available · ${timeAgo(n.createdAt)}`}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}