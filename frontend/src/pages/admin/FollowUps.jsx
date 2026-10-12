import { useEffect, useState } from 'react';
import api from '../../api/axios';
import Pagination from '../../components/Pagination';
import EmptyState from '../../components/EmptyState';
import StatusBadge from '../../components/StatusBadge';

export default function AdminFollowUps() {
    const [date, setDate] = useState('');
    const [employeeId, setEmployeeId] = useState('');
    const [employees, setEmployees] = useState([]);
    const [page, setPage] = useState(1);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = async (filters, selectedPage) => {
        setLoading(true);
        setError('');
        try {
            const params = { page: selectedPage, limit: 50 };
            if (filters.date) params.date = filters.date;
            if (filters.employeeId) params.employeeId = filters.employeeId;
            const res = await api.get('/reports/follow-ups', { params });
            setData(res.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Unable to load follow-ups.');
            setData(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load({}, 1);
        api.get('/employees', { params: { limit: 100 } }).then((res) => setEmployees(res.data.data));
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        setPage(1);
        load({ date, employeeId }, 1);
    };

    const handleClear = () => {
        setDate('');
        setEmployeeId('');
        setPage(1);
        load({}, 1);
    };

    const handlePageChange = (newPage) => {
        setPage(newPage);
        load({ date, employeeId }, newPage);
    };

    const isOverdue = (followUpDate) => new Date(followUpDate) < new Date(new Date().toDateString());
    const hasActiveFilters = date || employeeId;

    return (
        <div className="space-y-4">
            <h1 className="text-xl font-semibold text-gray-800">Follow Up</h1>
            <p className="text-sm text-gray-500">Every record, across all employees, that has a follow-up date set.</p>

            <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input type="date" className="input w-44" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
                    <select className="input w-48" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
                        <option value="">All users</option>
                        {employees.map((emp) => (
                            <option key={emp._id} value={emp._id}>
                                {emp.name} ({emp.employeeId})
                            </option>
                        ))}
                    </select>
                </div>
                <button type="submit" className="btn-primary">
                    Apply
                </button>
                {hasActiveFilters && (
                    <button type="button" className="btn-secondary" onClick={handleClear}>
                        Clear
                    </button>
                )}
            </form>

            {error && <div className="rounded-md bg-red-50 text-red-700 text-sm px-3 py-2">{error}</div>}

            <div className="card overflow-x-auto">
                {loading ? (
                    <p className="p-6 text-sm text-gray-500">Loading...</p>
                ) : !data || data.data.length === 0 ? (
                    <EmptyState title="No follow-ups found" description="Try adjusting your filters." />
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-500 text-left">
                            <tr>
                                <th className="px-4 py-2">Sr. No.</th>
                                <th className="px-4 py-2">Name</th>
                                <th className="px-4 py-2">Phone</th>
                                <th className="px-4 py-2">User</th>
                                <th className="px-4 py-2">Status</th>
                                <th className="px-4 py-2">Follow-up Date</th>
                                <th className="px-4 py-2"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {data.data.map((r, i) => (
                                <tr key={r._id}>
                                    <td className="px-4 py-2">{(data.pagination.page - 1) * data.pagination.limit + i + 1}</td>
                                    <td className="px-4 py-2 font-medium">{r.customerName}</td>
                                    <td className="px-4 py-2">{r.phone}</td>
                                    <td className="px-4 py-2">
                                        {r.assignedTo ? `${r.assignedTo.name} (${r.assignedTo.employeeId})` : <span className="text-gray-400">Unassigned</span>}
                                    </td>
                                    <td className="px-4 py-2">
                                        <StatusBadge status={r.status} />
                                    </td>
                                    <td className="px-4 py-2">
                                        <span className={isOverdue(r.followUpDate) ? 'text-red-600 font-medium' : ''}>
                                            {new Date(r.followUpDate).toLocaleDateString()}
                                        </span>
                                        {isOverdue(r.followUpDate) && <span className="ml-2 badge bg-red-100 text-red-700">Overdue</span>}
                                    </td>
                                    <td className="px-4 py-2">
                                        <a href={`/admin/records/detail/${r._id}`} className="text-brand-600 hover:underline text-xs">
                                            View
                                        </a>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                {data && <Pagination pagination={data.pagination} onPageChange={handlePageChange} />}
            </div>
        </div>
    );
}