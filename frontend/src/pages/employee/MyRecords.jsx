import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import EmptyState from '../../components/EmptyState';

export default function MyRecords() {
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/employee/records/files')
      .then((res) => setFiles(res.data.files))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-800">My Assigned Records</h1>

      <div className="card overflow-x-auto">
        {loading ? (
          <p className="p-6 text-sm text-gray-500">Loading...</p>
        ) : files.length === 0 ? (
          <EmptyState title="No files assigned yet" description="Your admin hasn't assigned you any records yet." />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th className="px-4 py-2">File Name</th>
                <th className="px-4 py-2">Records Assigned to You</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {files.map((f) => (
                <tr key={f._id}>
                  <td className="px-4 py-2 font-medium">{f.fileName}</td>
                  <td className="px-4 py-2">{f.totalAssigned}</td>
                  <td className="px-4 py-2">
                    <button
                      className="text-brand-600 hover:underline text-xs"
                      onClick={() => navigate(`/employee/records/file/${f._id}`)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}