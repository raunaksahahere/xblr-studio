import React from 'react';
import { Settings, Shield, ShieldCheck, Database } from 'lucide-react';

export default function Administration() {
  const rules = [
    { code: 'VAL-FIN-001', name: 'Balance Sheet Identity', desc: 'Verify Assets equals Equity + Liabilities.' },
    { code: 'VAL-ENT-001', name: 'CIN Validation', desc: 'Verify extracted corporate identification number match.' },
    { code: 'VAL-TAX-001', name: 'Abstract Mappings block', desc: 'Prevent selecting abstract elements.' },
    { code: 'VAL-TAX-002', name: 'Period Type mismatch check', desc: 'Validate instant vs duration element period roles.' }
  ];

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-73px)] overflow-hidden w-full max-w-7xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center space-x-2">
          <Shield className="w-5 h-5 text-indigo-400" />
          <span>Filing Platform Administration</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Authorized tools for managing security configuration, active rule registries, and official Ind AS schemas versions.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6 flex-1 overflow-hidden">
        {/* Rule Registry */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-lg p-5 flex flex-col overflow-hidden">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            <span>Active Rule Registry</span>
          </h3>

          <div className="flex-1 overflow-auto divide-y divide-slate-850">
            {rules.map((rule) => (
              <div key={rule.code} className="py-3 text-xs">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] bg-indigo-650/20 text-indigo-400 px-2 py-0.5 rounded font-mono font-bold">{rule.code}</span>
                  <h4 className="font-semibold text-white">{rule.name}</h4>
                </div>
                <p className="text-slate-400 mt-1">{rule.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Regulatory Knowledge Base */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-lg p-5 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Database className="w-4 h-4 text-emerald-400" />
              <span>Regulatory Knowledge Base</span>
            </h3>
            <p className="text-xs text-slate-400">
              Upload official MCA compliance booklets, Schedules guidelines, or AS/Ind AS standard references.
            </p>
            <div className="border border-dashed border-slate-800 p-8 rounded text-center bg-slate-950/30 text-xs text-slate-500">
              Drop regulatory guidance files here
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
