// Renders "0-50", "50-100", "100-150"... as a dropdown instead of Prev/Next.
// Assumes a fixed page size (limit) — pass the same limit used in the API call.
export default function RangeSelector({ total, limit, page, onChange }) {
    if (!total || total <= limit) return null;

    const ranges = [];
    for (let start = 0; start < total; start += limit) {
        const end = Math.min(start + limit, total);
        ranges.push({ pageNum: start / limit + 1, label: `${start}-${end}` });
    }

    return (
        <select className="input max-w-[160px]" value={page} onChange={(e) => onChange(Number(e.target.value))}>
            {ranges.map((r) => (
                <option key={r.pageNum} value={r.pageNum}>
                    {r.label}
                </option>
            ))}
        </select>
    );
}