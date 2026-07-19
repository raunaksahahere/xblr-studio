import React from 'react';
import { BarChart3, Download, FileText, CheckCircle2 } from 'lucide-react';

export default function Reports() {
  const reports = [
    { title: 'Financial Extraction Report', desc: 'Detailed details of all values parsed by the Financial Intelligence Engine.' },
    { title: 'Taxonomy Mapping Report', desc: 'List of facts mapped to Ind AS concepts with confidence indicators.' },
    { title: 'Validation Run Report', desc: 'Full snapshot logs of executed business rule evaluations.' },
    { title: 'Reconciliation Audit Report', desc: 'Details on comparisons between Ledger and financial sheets.' }
  ];

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-73px)] overflow-hidden w-full max-w-7xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center space-x-2">
          <BarChart3 className="w-5 h-5 text-indigo-400" />
          <span>Filing Reports & Analytics</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Export full summary sheets, mapping lists, and compliance validation trail audits.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6 flex-1 overflow-auto">
        {reports.map((rep, idx) => (
          <div key={idx} className="bg-slate-900/40 border border-slate-800/80 rounded-lg p-5 flex flex-col justify-between hover:border-slate-700 transition-colors">
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-white flex items-center space-x-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span>{rep.title}</span>
              </h3>
              <p className="text-xs text-slate-400">{rep.desc}</p>
            </div>

            <button className="mt-4 flex items-center space-x-2 bg-slate-850 hover:bg-slate-800 text-white text-xs font-semibold px-3 py-2 rounded self-start transition-colors border border-slate-850">
              <Download className="w-3.5 h-3.5" />
              <span>Download Excel (XLSX)</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
