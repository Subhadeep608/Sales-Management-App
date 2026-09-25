export default function EmptyState({ title = 'Nothing here yet', description }) {
  return (
    <div className="text-center py-12 text-gray-500">
      <p className="font-medium">{title}</p>
      {description && <p className="text-sm mt-1">{description}</p>}
    </div>
  );
}
