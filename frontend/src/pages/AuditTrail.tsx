import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { Activity, Shield, RefreshCw, Search } from 'lucide-react';

export default function AuditTrail() {
  const { accessToken } = useAuthStore();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/audits', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (res.ok) {
        setLogs(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [accessToken]);

  const filteredLogs = logs.filter(log => {
    const term = search.toLowerCase();
    return (
      log.email.toLowerCase().includes(term) ||
      log.action.toLowerCase().includes(term) ||
      (log.details && log.details.toLowerCase().includes(term))
    );
  });

  return (
    <div className="mx-auto max-w-6xl p-6 lg:p-8 space-y-6 w-full text-slate-100">
      <div className="flex justify-between items-end gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center space-x-2">
            <Shield className="w-5 h-5 text-purple-400" />
            <span>Immutable Audit Trail</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            System-wide compliance audit ledger. All actions are logged and cannot be modified.
          </p>
        </div>
        <button 
          onClick={fetchLogs}
          className="inline-flex items-center gap-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs px-3.5 py-1.5 rounded-lg transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Sync Log Ledger</span>
        </button>
      </div>

      {/* Search Filter */}
      <div className="relative">
        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
          <Search className="w-4 h-4" />
        </span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter logs by email, action, or details..."
          className="w-full bg-slate-950 border border-slate-900 rounded-xl py-2 pl-10 pr-4 text-slate-100 text-xs placeholder-slate-600 focus:outline-none focus:border-purple-500/50"
        />
      </div>

      {/* Logs Table */}
      <div className="rounded-xl border border-slate-900 bg-slate-950/40 p-5 shadow-md">
        <div className="overflow-x-auto">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="w-8 h-8 text-slate-700 mx-auto mb-2" />
              <p className="text-xs text-slate-500">No matching audit events found.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-900 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="pb-3 pl-2">User/Actor</th>
                  <th className="pb-3">Action</th>
                  <th className="pb-3">Target Details</th>
                  <th className="pb-3 pr-2 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/50">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-900/10 transition-colors">
                    <td className="py-3.5 pl-2">
                      <span className="font-semibold text-slate-200">{log.email}</span>
                      <p className="text-[9px] text-slate-500 font-mono mt-0.5">IP: {log.ipAddress || '127.0.0.1'}</p>
                    </td>
                    <td className="py-3.5 font-mono font-bold text-indigo-400">
                      {log.action}
                    </td>
                    <td className="py-3.5 text-slate-300 max-w-xs truncate font-mono text-[10px]" title={log.details}>
                      {log.details || 'none'}
                    </td>
                    <td className="py-3.5 pr-2 text-right font-mono text-slate-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
