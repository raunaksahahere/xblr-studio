import React from 'react';
import { Sliders, User, Bell, Cpu, ShieldAlert } from 'lucide-react';

export default function Settings() {
  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-73px)] overflow-hidden w-full max-w-7xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center space-x-2">
          <Sliders className="w-5 h-5 text-indigo-400" />
          <span>Filing Platform Settings</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Adjust profile preferences, security flags, automated validation rules tolerances, and AI models parameters.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6 flex-1 overflow-auto">
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-lg p-5 space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
            <User className="w-4 h-4 text-indigo-400" />
            <span>Profile & Organization</span>
          </h3>
          <p className="text-xs text-slate-400">Manage CA membership IDs and firm authorization tokens.</p>
        </div>

        <div className="bg-slate-900/40 border border-slate-800/80 rounded-lg p-5 space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
            <Bell className="w-4 h-4 text-amber-400" />
            <span>Notifications</span>
          </h3>
          <p className="text-xs text-slate-400">Select alerts for compliance errors, overrides requests, or client uploads.</p>
        </div>

        <div className="bg-slate-900/40 border border-slate-800/80 rounded-lg p-5 space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-emerald-400" />
            <span>AI Copilot & Extraction</span>
          </h3>
          <p className="text-xs text-slate-400">Configure LLM providers keys and evidence matching tolerances.</p>
        </div>

        <div className="bg-slate-900/40 border border-slate-800/80 rounded-lg p-5 space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-red-400" />
            <span>Validation Tolerances</span>
          </h3>
          <p className="text-xs text-slate-400">Set maximum rounding difference bounds (e.g. ₹100 or ₹1000) for cross-statement checks.</p>
        </div>
      </div>
    </div>
  );
}
