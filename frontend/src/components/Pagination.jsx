export default function Pagination({ pagination, onPageChange }) {
  if (!pagination || pagination.totalPages <= 1) return null;
  const { page, totalPages, total } = pagination;

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 text-sm">
      <span className="text-gray-500">
        Page {page} of {totalPages} ({total} total)
      </span>
      <div className="space-x-2">
        <button
          className="btn-secondary px-3 py-1"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </button>
        <button
          className="btn-secondary px-3 py-1"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
