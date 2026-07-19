import React from 'react';
import { History, Eye, CheckCircle2 } from 'lucide-react';

export default function VersionHistory() {
  const versions = [
    { ver: 'v1.1', date: '2026-07-19', author: 'admin@xbrlstudio.com', action: 'Taxonomy mapping approved', hash: '453c506443dbc...' },
    { ver: 'v1.0', date: '2026-07-19', author: 'admin@xbrlstudio.com', action: 'Financial extraction approved', hash: '3da9b21f4b6bf...' }
  ];

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-73px)] overflow-hidden w-full max-w-7xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center space-x-2">
          <History className="w-5 h-5 text-indigo-400" />
          <span>Filing Version Control</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Historical changes log of approved financial datasets, taxonomy mapping releases, and validation snapshots.
        </p>
      </div>

      <div className="bg-slate-900/40 border border-slate-800/80 rounded-lg p-5 flex-1 overflow-auto">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Version Timeline</h3>
        <div className="space-y-4">
          {versions.map((v) => (
            <div key={v.ver} className="flex justify-between items-center text-xs border-b border-slate-850 pb-3">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="bg-indigo-600/20 text-indigo-400 px-2 py-0.5 rounded font-bold">{v.ver}</span>
                  <h4 className="font-semibold text-white">{v.action}</h4>
                </div>
                <p className="text-slate-400">Fingerprint: <span className="font-mono text-slate-500">{v.hash}</span></p>
              </div>

              <div className="flex items-center space-x-4">
                <span className="text-[10px] text-slate-500">{v.date} by {v.author}</span>
                <button className="flex items-center space-x-1 bg-slate-850 hover:bg-slate-800 text-white px-2 py-1 rounded">
                  <Eye className="w-3.5 h-3.5" />
                  <span>Inspect</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
