const STYLES = {
  pending: 'bg-gray-100 text-gray-700',
  not_connected: 'bg-orange-100 text-orange-700',
  follow_up: 'bg-purple-100 text-purple-700',
  interested: 'bg-yellow-100 text-yellow-800',
  not_interested: 'bg-red-100 text-red-700',
  joined: 'bg-green-100 text-green-700',
};

const LABELS = {
  pending: 'Pending',
  not_connected: 'Not Connected',
  follow_up: 'Follow Up',
  interested: 'Interested',
  not_interested: 'Not Interested',
  joined: 'Joined',
};

export default function StatusBadge({ status }) {
  return (
    <span className={`badge ${STYLES[status] || 'bg-gray-100 text-gray-700'}`}>
      {LABELS[status] || status}
    </span>
  );
}

export const STATUS_OPTIONS = Object.keys(LABELS).map((value) => ({ value, label: LABELS[value] }));