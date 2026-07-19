import React from 'react';
import { Send, CheckCircle2, User, Clock } from 'lucide-react';

export default function ClientPortal() {
  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-73px)] overflow-hidden w-full max-w-7xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center space-x-2">
          <User className="w-5 h-5 text-indigo-400" />
          <span>Client Query Portal</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Monitor clarification requests, upload outstanding documentation, and manage external client communications.
        </p>
      </div>

      <div className="bg-slate-900/40 border border-slate-800/80 rounded-lg p-5 flex-1 overflow-auto">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Clarification Requests</h3>
        <div className="flex flex-col items-center justify-center text-center p-8 h-full">
          <Clock className="w-8 h-8 text-slate-600 mb-2" />
          <h4 className="text-xs font-bold text-white">No outstanding client queries</h4>
          <p className="text-[11px] text-slate-500 mt-0.5">Use the Review Workspace to draft queries if facts require client validation.</p>
        </div>
      </div>
    </div>
  );
}
