const STYLES = {
  pending: 'bg-gray-100 text-gray-700',
  contacted: 'bg-blue-100 text-blue-700',
  interested: 'bg-yellow-100 text-yellow-800',
  follow_up: 'bg-purple-100 text-purple-700',
  not_interested: 'bg-red-100 text-red-700',
  converted: 'bg-green-100 text-green-700',
};

const LABELS = {
  pending: 'Pending',
  contacted: 'Contacted',
  interested: 'Interested',
  follow_up: 'Follow Up',
  not_interested: 'Not Interested',
  converted: 'Converted',
};

export default function StatusBadge({ status }) {
  return (
    <span className={`badge ${STYLES[status] || 'bg-gray-100 text-gray-700'}`}>
      {LABELS[status] || status}
    </span>
  );
}

export const STATUS_OPTIONS = Object.keys(LABELS).map((value) => ({ value, label: LABELS[value] }));
