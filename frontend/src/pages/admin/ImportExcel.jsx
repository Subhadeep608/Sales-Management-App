import { useState } from 'react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const FIELD_LABELS = {
  customerName: 'Customer Name *',
  phone: 'Phone *',
  email: 'Email',
  company: 'Company',
  city: 'City',
  product: 'Product',
};

export default function ImportExcel() {
  const { showToast } = useToast();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null); // { headers, appFields, suggestedMapping, sampleRows, rows, totalRows, fileName }
  const [mapping, setMapping] = useState({});
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setError('');
    setResult(null);
    setLoadingPreview(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/imports/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPreview(res.data);
      setMapping(res.data.suggestedMapping || {});
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid Excel format.');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    setError('');
    try {
      const res = await api.post('/imports/confirm', {
        fileName: preview.fileName,
        columnMapping: mapping,
        rows: preview.rows,
      });
      setResult(res.data);
      showToast(res.data.message);
      setPreview(null);
      setFile(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Some rows could not be imported.');
    } finally {
      setImporting(false);
    }
  };

  const requiredMissing = ['customerName', 'phone'].filter((f) => !mapping[f]);

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-xl font-semibold text-gray-800">Import Excel</h1>
      <p className="text-sm text-gray-500">
        Upload an Excel file, map its columns to application fields, then import. Employees will only ever
        see the imported records in this application — never the Excel file itself.
      </p>

      {error && <div className="rounded-md bg-red-50 text-red-700 text-sm px-3 py-2">{error}</div>}

      {result && (
        <div className="card p-4 bg-green-50 border-green-200 text-sm text-green-800">
          {result.message} ({result.import.failedCount} row(s) failed)
        </div>
      )}

      {!preview && (
        <form onSubmit={handleUpload} className="card p-6 space-y-4">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => setFile(e.target.files[0])}
            className="block w-full text-sm"
          />
          <button type="submit" className="btn-primary" disabled={!file || loadingPreview}>
            {loadingPreview ? 'Reading file...' : 'Upload & Preview'}
          </button>
        </form>
      )}

      {preview && (
        <div className="space-y-6">
          <div className="card p-4">
            <h2 className="font-medium text-gray-700 mb-3">
              Column Mapping — {preview.fileName} ({preview.totalRows} rows)
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {preview.appFields.map((field) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{FIELD_LABELS[field]}</label>
                  <select
                    className="input"
                    value={mapping[field] || ''}
                    onChange={(e) => setMapping({ ...mapping, [field]: e.target.value })}
                  >
                    <option value="">-- Not mapped --</option>
                    {preview.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            {requiredMissing.length > 0 && (
              <p className="text-sm text-red-600 mt-3">
                Required column missing: {requiredMissing.map((f) => FIELD_LABELS[f]).join(', ')}
              </p>
            )}
          </div>

          <div className="card p-4 overflow-x-auto">
            <h2 className="font-medium text-gray-700 mb-3">Preview (first {preview.sampleRows.length} rows)</h2>
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  {preview.headers.map((h) => (
                    <th key={h} className="px-2 py-1 text-left whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {preview.sampleRows.map((row, i) => (
                  <tr key={i}>
                    {preview.headers.map((h) => (
                      <td key={h} className="px-2 py-1 whitespace-nowrap">
                        {String(row[h])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => setPreview(null)}>
              Cancel
            </button>
            <button
              className="btn-primary"
              disabled={requiredMissing.length > 0 || importing}
              onClick={handleImport}
            >
              {importing ? 'Importing...' : `Import ${preview.totalRows} Rows`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
