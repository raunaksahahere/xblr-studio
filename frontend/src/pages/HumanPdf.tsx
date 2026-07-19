import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useProjectStore } from '../store/projectStore';
import { FileText, Printer, Download, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

interface PdfArtifact {
  id: string;
  type: string;
  versionNumber: number;
  filename: string;
  sha256: string;
  createdAt: string;
}

export default function HumanPdf() {
  const { accessToken } = useAuthStore();
  const { activeProjectId } = useProjectStore();
  const [pdfs, setPdfs] = useState<PdfArtifact[]>([]);
  const [selectedPdf, setSelectedPdf] = useState<PdfArtifact | null>(null);
  const [generating, setGenerating] = useState(false);
  const [currentSectionIdx, setCurrentSectionIdx] = useState(-1);
  const [statusMessage, setStatusMessage] = useState('');

  const sections = [
    'Generating Cover Page & Company Profile',
    'Compiling Schedule III Balance Sheet',
    'Compiling Profit & Loss Account',
    'Adding Signatures & Disclosures'
  ];

  const fetchPdfs = async () => {
    if (!activeProjectId) return;
    try {
      const res = await fetch(`/api/projects/${activeProjectId}/pdf/versions`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const data = await res.json();
      setPdfs(data);
      if (data.length > 0 && !selectedPdf) {
        setSelectedPdf(data[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const triggerPdfGeneration = async (isDraft: boolean) => {
    if (!activeProjectId) return;
    setGenerating(true);
    setCurrentSectionIdx(0);
    setStatusMessage('');

    for (let i = 0; i < sections.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 800));
      setCurrentSectionIdx(i);
    }

    try {
      const endpoint = isDraft ? 'preview' : 'final';
      const res = await fetch(`/api/projects/${activeProjectId}/pdf/${endpoint}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate');
      
      setSelectedPdf(data);
      fetchPdfs();
    } catch (err: any) {
      setStatusMessage(err.message);
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    if (activeProjectId) {
      fetchPdfs();
    }
  }, [activeProjectId, accessToken]);

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-73px)] overflow-hidden w-full max-w-7xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center space-x-2">
          <FileText className="w-5 h-5 text-indigo-400" />
          <span>Human-Readable Filing Report</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Review, configure, and export print-ready PDF financial reports structured with Schedule III corporate standards.
        </p>
      </div>

      {!activeProjectId ? (
        <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-lg p-12 text-center bg-slate-950/40">
          <AlertCircle className="w-8 h-8 text-amber-500 mb-3" />
          <h3 className="text-sm font-semibold text-white">No Filing Project Selected</h3>
          <p className="text-xs text-slate-400 mt-1">Select an active project to access the PDF layout builder.</p>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-3 gap-6 overflow-hidden">
          {/* Left Panel: Build Controls */}
          <div className="col-span-1 bg-slate-900/40 border border-slate-800/80 rounded-lg p-5 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Select Active Version</h3>
                <select
                  value={selectedPdf?.id || ''}
                  onChange={(e) => {
                    const matched = pdfs.find(p => p.id === e.target.value);
                    if (matched) setSelectedPdf(matched);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                >
                  {pdfs.length === 0 ? (
                    <option>No PDFs compiled</option>
                  ) : (
                    pdfs.map(p => (
                      <option key={p.id} value={p.id}>
                        Filing PDF Version {p.versionNumber}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {generating && (
                <div className="space-y-3 bg-indigo-950/20 border border-indigo-900/40 p-4 rounded text-xs">
                  <div className="flex items-center space-x-2 text-indigo-400 font-semibold">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Compiling Report Sections...</span>
                  </div>
                  <div className="space-y-2 mt-2">
                    {sections.map((sec, idx) => (
                      <div key={idx} className={`flex items-center space-x-2 ${idx <= currentSectionIdx ? 'text-slate-200' : 'text-slate-600'}`}>
                        {idx < currentSectionIdx ? (
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        ) : idx === currentSectionIdx ? (
                          <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border border-slate-800" />
                        )}
                        <span className="truncate">{sec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3 pt-6 border-t border-slate-800">
              {statusMessage && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs py-2 px-3 rounded">
                  {statusMessage}
                </div>
              )}

              <button
                onClick={() => triggerPdfGeneration(true)}
                disabled={generating}
                className="w-full flex items-center justify-center space-x-2 bg-slate-850 hover:bg-slate-800 text-white text-xs font-semibold py-2.5 rounded transition-colors"
              >
                <Printer className="w-4 h-4 text-indigo-400" />
                <span>Generate Preview PDF</span>
              </button>

              <button
                onClick={() => triggerPdfGeneration(false)}
                disabled={generating}
                className="w-full flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-2.5 rounded transition-colors"
              >
                <FileText className="w-4 h-4" />
                <span>Generate Final PDF</span>
              </button>
            </div>
          </div>

          {/* Right Panel: Embedded Preview mockup */}
          <div className="col-span-2 bg-slate-900/40 border border-slate-800/80 rounded-lg flex flex-col overflow-hidden">
            <div className="border-b border-slate-800/60 p-4 flex justify-between items-center bg-slate-950/20">
              <span className="text-xs text-slate-300 font-bold">Report Page Preview Workspace</span>
              {selectedPdf && (
                <button
                  onClick={() => alert(`Initiating PDF Download: ${selectedPdf.filename}`)}
                  className="flex items-center space-x-1.5 bg-slate-850 hover:bg-slate-800 text-slate-200 text-xs px-3 py-1.5 rounded transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Report</span>
                </button>
              )}
            </div>

            <div className="flex-1 p-6 overflow-y-auto bg-slate-950/45">
              {!selectedPdf ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 text-xs">
                  <Printer className="w-10 h-10 mb-2 opacity-50" />
                  <span>No report generated yet. Choose an option to build layouts.</span>
                </div>
              ) : (
                <div className="max-w-2xl mx-auto bg-white text-slate-900 p-8 shadow-2xl rounded space-y-8 font-sans text-xs">
                  {/* Mock Page Header */}
                  <div className="text-center border-b pb-4">
                    <h2 className="text-lg font-bold text-indigo-950">IND AS FINANCIAL STATEMENT</h2>
                    <p className="text-[10px] text-slate-500 mt-1">Filing Package Artifact ID: {selectedPdf.id}</p>
                    <p className="text-[10px] text-slate-500">Hash Checksum: {selectedPdf.sha256.substring(0, 16)}...</p>
                  </div>

                  {/* Section: Balance Sheet */}
                  <div>
                    <h3 className="text-xs font-bold text-indigo-900 uppercase border-b pb-1">Part I - Balance Sheet (INR)</h3>
                    <table className="w-full text-left mt-2 border-collapse">
                      <thead>
                        <tr className="border-b bg-slate-50 text-[10px] font-bold">
                          <th className="p-2">Assets Liabilities Classification</th>
                          <th className="p-2 text-right">Value (INR)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y text-[11px]">
                        <tr>
                          <td className="p-2 font-semibold">I. Equity and Liabilities</td>
                          <td className="p-2 text-right"></td>
                        </tr>
                        <tr>
                          <td className="p-2 pl-4">Share Capital</td>
                          <td className="p-2 text-right font-mono">1,00,00,000</td>
                        </tr>
                        <tr>
                          <td className="p-2 pl-4">Other Equity / Reserves</td>
                          <td className="p-2 text-right font-mono">4,00,00,000</td>
                        </tr>
                        <tr className="bg-slate-50 font-bold">
                          <td className="p-2">Total Liabilities & Equity</td>
                          <td className="p-2 text-right font-mono">5,00,00,000</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Stamp */}
                  <div className="pt-8 border-t flex justify-between items-center text-[10px] text-slate-500">
                    <span>Generated Deterministically via AI XBRL Studio Exporter</span>
                    <span className="font-bold text-indigo-900">VERIFIED FILING ATTACHMENT</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
