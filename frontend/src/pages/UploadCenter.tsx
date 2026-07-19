import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useProjectStore } from '../store/projectStore';
import { FileUp, Trash2, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface CompanyDocument {
  id: string;
  name: string;
  category: string;
  status: string;
  createdAt: string;
}

export default function UploadCenter() {
  const { accessToken } = useAuthStore();
  const { activeProjectId } = useProjectStore();
  const [documents, setDocuments] = useState<CompanyDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Balance Sheet');

  const fetchDocuments = async () => {
    if (!activeProjectId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/documents/project/${activeProjectId}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const data = await res.json();
      setDocuments(data);
    } catch (err) {
      console.error('Failed to fetch project documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !activeProjectId) return;
    const file = e.target.files[0];
    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('projectId', activeProjectId);
    formData.append('category', selectedCategory);

    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` },
        body: formData
      });
      if (res.ok) {
        fetchDocuments();
      }
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [activeProjectId, accessToken]);

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-73px)] overflow-hidden w-full max-w-7xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center space-x-2">
          <FileUp className="w-5 h-5 text-indigo-400" />
          <span>Upload Center</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Drop PDFs, Excel sheets, and Board reports into the document repository to trigger pipeline normalizations.
        </p>
      </div>

      {!activeProjectId ? (
        <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-lg p-12 text-center bg-slate-950/40">
          <AlertCircle className="w-8 h-8 text-amber-500 mb-3" />
          <h3 className="text-sm font-semibold text-white">No Project Selected</h3>
          <p className="text-xs text-slate-400 mt-1">Please pick an active project from the switcher to access the upload center.</p>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-3 gap-6 overflow-hidden">
          {/* Uploader Panel */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-lg p-5 flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Document Ingestion Settings</h3>
              
              <div className="space-y-1 text-xs">
                <label className="text-slate-400">Target Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:outline-none"
                >
                  <option value="Balance Sheet">Balance Sheet</option>
                  <option value="Profit & Loss">Profit & Loss Statement</option>
                  <option value="Cash Flow Statement">Cash Flow Statement</option>
                  <option value="Notes to Accounts">Notes to Accounts</option>
                  <option value="Trial Balance">Trial Balance</option>
                </select>
              </div>

              <div className="border border-dashed border-slate-800 hover:border-slate-700 rounded-lg p-8 text-center bg-slate-950/30 flex flex-col items-center justify-center space-y-3 cursor-pointer relative">
                <FileUp className="w-8 h-8 text-slate-500" />
                <div className="text-xs text-slate-400">
                  <span className="text-indigo-400 font-semibold">Click to upload</span> or drag and drop
                </div>
                <span className="text-[10px] text-slate-600">Supports PDF, XLSX, DOCX (Max 25MB)</span>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
            </div>

            {uploading && (
              <div className="flex items-center justify-center space-x-2 text-xs text-indigo-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Uploading and extracting OCR text...</span>
              </div>
            )}
          </div>

          {/* Repository List */}
          <div className="col-span-2 bg-slate-900/40 border border-slate-800/80 rounded-lg p-5 flex flex-col overflow-hidden">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Project File Registry</h3>

            <div className="flex-1 overflow-auto">
              {loading ? (
                <div className="text-xs text-slate-400">Querying repository...</div>
              ) : documents.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <FileText className="w-8 h-8 text-slate-600 mb-2" />
                  <h4 className="text-xs font-bold text-white">No documents uploaded yet</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Use the category selector and upload panel to ingest project files.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-850">
                  {documents.map((doc) => (
                    <div key={doc.id} className="py-3 flex justify-between items-center text-xs">
                      <div className="flex items-center space-x-3">
                        <FileText className="w-4 h-4 text-slate-400" />
                        <div>
                          <h4 className="font-semibold text-white">{doc.name}</h4>
                          <span className="text-[10px] text-slate-500 font-mono">{doc.category}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        {doc.status === 'PROCESSED' ? (
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-bold">PROCESSED</span>
                        ) : (
                          <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded font-bold">EXTRACTING</span>
                        )}
                        <span className="text-[10px] text-slate-500">{new Date(doc.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
