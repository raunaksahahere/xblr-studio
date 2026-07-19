import React, { useState, useEffect } from 'react';
import { BrainCircuit, Landmark, Award, ShieldCheck, History, UserCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export default function CompanyMemory() {
  const { accessToken } = useAuthStore();
  const [activeSubTab, setActiveSubTab] = useState<string>('IDENTITY');
  const [memories, setMemories] = useState<any[]>([]);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Default active company ID for Rishu Constructions or fallback
  const companyId = "c1b2f345-6789-abcd-ef01-23456789abcd"; // Default seeded company

  const fetchCompanyMemory = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/companies/${companyId}/memory`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const data = await res.json();
      if (res.ok) {
        setMemories(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchConflicts = async () => {
    try {
      const res = await fetch(`/api/companies/${companyId}/memory/conflicts`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const data = await res.json();
      if (res.ok) {
        setConflicts(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCompanyMemory();
    fetchConflicts();
  }, [companyId]);

  const resolveMemoryConflict = async (conflictId: string, resolution: 'UPDATE_MEMORY' | 'KEEP_MEMORY') => {
    try {
      const res = await fetch(`/api/memory/conflicts/${conflictId}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ resolution })
      });
      if (res.ok) {
        fetchCompanyMemory();
        fetchConflicts();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-73px)] overflow-hidden w-full max-w-7xl mx-auto p-6 space-y-6 bg-slate-950">
      
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-white flex items-center space-x-2">
          <BrainCircuit className="w-5 h-5 text-indigo-400" />
          <span>Corporate Cognitive Memory</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Historical repository of recurrent taxonomy selections, approved audit overrides, and comparative prior-year statements.
        </p>
      </div>

      {/* Sub Tabs */}
      <div className="flex border-b border-slate-950 gap-2">
        {['IDENTITY', 'FINANCIAL TRENDS', 'REVIEWER DECISIONS', 'MEMORY CONFLICTS'].map((t) => (
          <button
            key={t}
            onClick={() => setActiveSubTab(t)}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition ${
              activeSubTab === t 
                ? 'border-indigo-500 text-indigo-400 bg-indigo-950/10' 
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="flex-1 overflow-y-auto">
        {activeSubTab === 'IDENTITY' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-5 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <Landmark className="w-4 h-4 text-indigo-400" />
                <span>Legal & Auditor Information</span>
              </h3>
              
              <div className="space-y-3 divide-y divide-slate-900">
                <div className="pt-2 flex justify-between text-xs">
                  <span className="text-slate-400">Current Statutory Auditor</span>
                  <span className="font-mono text-white">S.R. Batliboi & Co. LLP</span>
                </div>
                <div className="pt-2 flex justify-between text-xs">
                  <span className="text-slate-400">Auditor Term Limits</span>
                  <span className="font-mono text-white">FY 2022-23 to FY 2026-27</span>
                </div>
                <div className="pt-2 flex justify-between text-xs">
                  <span className="text-slate-400">Authorized Share Capital</span>
                  <span className="font-mono text-white">15,00,00,000 INR</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-5 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <UserCheck className="w-4 h-4 text-indigo-400" />
                <span>Board of Directors History</span>
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-200 font-semibold">Harish Rishu</span>
                  <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded text-indigo-400">Managing Director</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-200 font-semibold">Priya Rishu</span>
                  <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded text-indigo-400">Director</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'FINANCIAL TRENDS' && (
          <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <History className="w-4 h-4 text-indigo-400" />
              <span>Prior Years Filing Records</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2.5">Financial Year</th>
                    <th>Filing Status</th>
                    <th>Revenue (INR)</th>
                    <th>Net Profit (INR)</th>
                    <th>Approved By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 text-slate-350">
                  <tr className="border-b border-slate-900">
                    <td className="py-3 font-semibold text-white">FY 2023-24</td>
                    <td><span className="px-2 py-0.5 rounded bg-emerald-950/20 text-emerald-400 text-[10px]">APPROVED</span></td>
                    <td className="font-mono">11,20,00,000</td>
                    <td className="font-mono">82,00,000</td>
                    <td>admin@xbrlstudio.com</td>
                  </tr>
                  <tr>
                    <td className="py-3 font-semibold text-white">FY 2022-23</td>
                    <td><span className="px-2 py-0.5 rounded bg-emerald-950/20 text-emerald-400 text-[10px]">APPROVED</span></td>
                    <td className="font-mono">9,80,00,000</td>
                    <td className="font-mono">68,00,000</td>
                    <td>admin@xbrlstudio.com</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeSubTab === 'REVIEWER DECISIONS' && (
          <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Approved Overrides & Mappings Precedents</span>
            </h3>
            <div className="text-[10px] bg-slate-950/60 border border-slate-850 rounded p-4 text-slate-400 font-mono text-center">
              No recent custom reviewer override decisions logged. Mappings are automatically indexed for prior-year auto-suggestions.
            </div>
          </div>
        )}

        {activeSubTab === 'MEMORY CONFLICTS' && (
          <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>Unresolved Memory Mismatches</span>
            </h3>
            
            {conflicts.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-slate-800 rounded-xl bg-slate-950/20">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-1.5" />
                <p className="text-xs text-slate-400 font-semibold">No unresolved memory conflicts found.</p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {conflicts.map(c => (
                  <div key={c.id} className="p-4 bg-slate-950/40 border border-slate-900 rounded-xl flex justify-between items-center">
                    <div>
                      <p className="text-xs font-bold text-white">{c.keyName} Conflict</p>
                      <p className="text-[10px] text-slate-500 font-mono mt-1">
                        Stored: {c.storedValue} | Detected: {c.detectedValue} (Source: {c.evidenceSource})
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => resolveMemoryConflict(c.id, 'KEEP_MEMORY')}
                        className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] text-slate-300 font-bold px-3 py-1.5 rounded-lg"
                      >
                        Keep Stored
                      </button>
                      <button
                        onClick={() => resolveMemoryConflict(c.id, 'UPDATE_MEMORY')}
                        className="bg-indigo-600 hover:bg-indigo-500 text-[10px] text-white font-bold px-3 py-1.5 rounded-lg"
                      >
                        Update Memory
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
