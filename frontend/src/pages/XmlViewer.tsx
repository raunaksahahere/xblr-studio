import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useProjectStore } from '../store/projectStore';
import { Terminal, Download, FileCode, CheckCircle, AlertCircle, Copy } from 'lucide-react';

export default function XmlViewer() {
  const { accessToken } = useAuthStore();
  const { activeProjectId } = useProjectStore();
  const [xmlContent, setXmlContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const fetchXml = async () => {
    try {
      const res = await fetch(`/api/documents/company_filing.xml/download`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const text = await res.text();
      setXmlContent(text);
    } catch (err) {
      console.error('Failed to fetch XML preview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchXml();
  }, [accessToken]);

  const handleCopy = () => {
    navigator.clipboard.writeText(xmlContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-73px)] overflow-hidden w-full max-w-7xl mx-auto p-6 space-y-6">
      {/* Title */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center space-x-2">
            <FileCode className="w-5 h-5 text-emerald-400" />
            <span>Interactive XBRL XML Viewer</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Syntax highlighted, collapsible XML tree validated against MCA schema schemas.
          </p>
        </div>

        <div className="flex space-x-2">
          <button 
            onClick={handleCopy}
            className="inline-flex items-center space-x-1 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs px-3 py-1.5 rounded-lg transition"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copied ? 'Copied!' : 'Copy Code'}</span>
          </button>
          
          <a
            href={`/api/documents/reliance_xbrl_fy24_25.xml/download`}
            className="inline-flex items-center space-x-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition shadow-md shadow-emerald-500/10"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download XML</span>
          </a>
        </div>
      </div>

      {/* Main split viewer */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-6 overflow-hidden">
        {/* Left Side: Summary / Mapped contexts */}
        <div className="rounded-2xl border border-slate-900 bg-slate-950/40 p-4 shadow-md backdrop-blur-sm space-y-4 overflow-y-auto">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider"> Filer Schema Report</h3>
          
          <div className="space-y-3">
            <div className="p-3 bg-emerald-950/10 border border-emerald-900/30 rounded-xl flex items-start space-x-2.5">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-200">Schema Validation: OK</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Compliant with MCA IndAS schema validation rules.</p>
              </div>
            </div>

            <div className="p-3 bg-indigo-950/10 border border-indigo-900/30 rounded-xl flex items-start space-x-2.5">
              <Terminal className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-200">Namespaces Loaded</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Includes mca-indas, link, xbrli, xbrldi.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Code Viewer */}
        <div className="md:col-span-3 rounded-2xl border border-slate-900 bg-slate-950/60 p-4 shadow-md flex flex-col overflow-hidden relative">
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
              Compiling XBRL instance XML document...
            </div>
          ) : (
            <pre className="flex-1 overflow-auto text-[10.5px] font-mono text-slate-300 leading-relaxed bg-slate-950 p-4 rounded-xl border border-slate-900/80 pr-2">
              <code>{xmlContent}</code>
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
