import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useProjectStore } from '../store/projectStore';
import {
  ShieldAlert, Play, CheckCircle2, AlertTriangle, XCircle,
  Search, SlidersHorizontal, BookOpen, UserCheck, History, ArrowRightLeft,
  ChevronRight, RefreshCw, Send, AlertCircle, Eye, Calculator
} from 'lucide-react';

interface ValidationRun {
  id: string;
  status: string;
  criticalCount: number;
  highCount: number;
  warningCount: number;
  passCount: number;
  createdAt: string;
  triggeredBy: string;
}

interface ValidationResult {
  id: string;
  ruleCode: string;
  severity: string;
  status: string;
  title: string;
  description: string;
  expectedValue: string;
  actualValue: string;
  difference: string;
  affectedFactIds: string;
}

export default function ValidationCenter() {
  const { accessToken } = useAuthStore();
  const { activeProjectId } = useProjectStore();
  const [runs, setRuns] = useState<ValidationRun[]>([]);
  const [activeRun, setActiveRun] = useState<ValidationRun | null>(null);
  const [results, setResults] = useState<ValidationResult[]>([]);
  const [reconciliationRuns, setReconciliationRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [activeTab, setActiveTab] = useState('OVERVIEW');
  const [selectedIssue, setSelectedIssue] = useState<ValidationResult | null>(null);
  const [overrideReason, setOverrideReason] = useState('');

  const fetchRuns = async () => {
    if (!activeProjectId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${activeProjectId}/validation-runs`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const data = await res.json();
      setRuns(data);
      if (data.length > 0) {
        setActiveRun(data[0]);
        fetchResults(data[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch validation runs:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchResults = async (runId: string) => {
    try {
      const res = await fetch(`/api/validation-runs/${runId}/results`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const data = await res.json();
      setResults(data);
    } catch (err) {
      console.error('Failed to fetch run results:', err);
    }
  };

  const fetchReconciliations = async () => {
    if (!activeProjectId) return;
    try {
      const res = await fetch(`/api/projects/${activeProjectId}/reconciliations-run`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const data = await res.json();
      if (res.ok) {
        setReconciliationRuns(data);
      }
    } catch (err) {
      console.error('Failed to fetch reconciliations:', err);
    }
  };

  const handleRunValidation = async () => {
    if (!activeProjectId) return;
    setRunning(true);
    try {
      const res = await fetch(`/api/projects/${activeProjectId}/validation-runs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      const newRun = await res.json();
      setRuns(prev => [newRun, ...prev]);
      setActiveRun(newRun);
      fetchResults(newRun.id);
      
      // Also run reconciliations
      await fetch(`/api/projects/${activeProjectId}/reconcile`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      fetchReconciliations();
    } catch (err) {
      console.error('Failed to trigger validation run:', err);
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    fetchRuns();
    fetchReconciliations();
  }, [activeProjectId, accessToken]);

  const getFilteredResults = () => {
    if (activeTab === 'OVERVIEW') return results;
    if (activeTab === 'FINANCIAL') return results.filter(r => r.ruleCode.startsWith('VAL-FIN'));
    if (activeTab === 'TAXONOMY') return results.filter(r => r.ruleCode.startsWith('VAL-TAX'));
    if (activeTab === 'CONTEXTS') return results.filter(r => r.ruleCode.includes('CON'));
    return results;
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-73px)] overflow-hidden w-full max-w-7xl mx-auto p-6 space-y-6 bg-slate-950">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-indigo-400" />
            <span>Validation & Compliance Cockpit</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Execute deterministic rule validations, cross-document reconciliations, and compliance gate parameters.
          </p>
        </div>

        <button
          onClick={handleRunValidation}
          disabled={running || !activeProjectId}
          className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-semibold px-4 py-2 rounded-md transition"
        >
          {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          <span>{running ? 'Running Pipeline...' : 'Run Validation'}</span>
        </button>
      </div>

      {!activeProjectId ? (
        <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-lg p-12 text-center bg-slate-950/40">
          <AlertCircle className="w-8 h-8 text-amber-500 mb-3" />
          <h3 className="text-sm font-semibold text-white">No Active Project Selected</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md">
            Please pick a filing project from the sidebar workspace card to run calculations validations.
          </p>
        </div>
      ) : (
        <>
          {/* KPI Dashboard */}
          <div className="grid grid-cols-5 gap-4">
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-4 space-y-1">
              <span className="text-[10px] uppercase font-bold text-red-400 tracking-wider">Critical Failures</span>
              <div className="text-2xl font-extrabold text-white">{activeRun?.criticalCount || 0}</div>
            </div>
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-4 space-y-1">
              <span className="text-[10px] uppercase font-bold text-orange-400 tracking-wider">High Severity</span>
              <div className="text-2xl font-extrabold text-white">{activeRun?.highCount || 0}</div>
            </div>
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-4 space-y-1">
              <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">Warnings & Exceptions</span>
              <div className="text-2xl font-extrabold text-white">{activeRun?.warningCount || 0}</div>
            </div>
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-4 space-y-1">
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Passed Checks</span>
              <div className="text-2xl font-extrabold text-white">{activeRun?.passCount || 0}</div>
            </div>
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-4 space-y-1">
              <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">Compliance Score</span>
              <div className="text-2xl font-extrabold text-white">
                {activeRun ? Math.round((activeRun.passCount / (activeRun.criticalCount + activeRun.highCount + activeRun.warningCount + activeRun.passCount || 1)) * 100) : 0}%
              </div>
            </div>
          </div>

          {/* Sub-Navigation Tabs */}
          <div className="flex border-b border-slate-800/80">
            {['OVERVIEW', 'FINANCIAL', 'RECONCILIATION', 'TAXONOMY', 'CONTEXTS'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 border-b-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
                  activeTab === tab
                    ? 'border-indigo-500 text-white'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Table / Details */}
          <div className="flex-1 overflow-auto bg-slate-950/40 border border-slate-800/80 rounded-lg p-4">
            {activeTab === 'RECONCILIATION' ? (
              reconciliationRuns.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                  <Calculator className="w-8 h-8 text-slate-600 mb-2" />
                  <h3 className="text-sm font-semibold text-white">No reconciliation data loaded</h3>
                  <p className="text-xs text-slate-400 mt-1">Run a validation pipeline check to execute mathematical accounts rollforwards.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {reconciliationRuns.map((run) => (
                    <div key={run.id} className="border border-slate-900 bg-slate-900/10 rounded-xl p-4 space-y-3">
                      <div className="flex justify-between items-center border-b border-slate-900 pb-2">
                        <span className="text-xs font-bold text-white">Run Date: {new Date(run.createdAt).toLocaleString()}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          run.status === 'PASS' ? 'bg-emerald-950/20 text-emerald-400' : 'bg-red-950/20 text-red-400'
                        }`}>
                          STATUS: {run.status}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {run.items.map((item: any) => (
                          <div key={item.id} className="flex justify-between items-center text-xs">
                            <span className="text-slate-300 font-semibold">{item.itemName}</span>
                            <div className="flex items-center space-x-3 font-mono">
                              <span className="text-slate-400">Exp: {Number(item.expectedValue).toLocaleString()} | Act: {Number(item.actualValue).toLocaleString()}</span>
                              <span className={`font-bold ${item.status === 'PASS' ? 'text-emerald-400' : 'text-red-400'}`}>{item.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              getFilteredResults().length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
                  <h3 className="text-sm font-semibold text-white">No validation anomalies detected</h3>
                  <p className="text-xs text-slate-400 mt-1">Select a different tab or run the compliance engine pipeline checks.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-800/80">
                  {getFilteredResults().map((issue) => (
                    <div
                      key={issue.id}
                      onClick={() => setSelectedIssue(issue)}
                      className="py-3 flex justify-between items-center hover:bg-slate-900/40 cursor-pointer transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            issue.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
                            issue.severity === 'HIGH' ? 'bg-orange-500/20 text-orange-400' : 'bg-amber-500/20 text-amber-400'
                          }`}>
                            {issue.severity}
                          </span>
                          <span className="text-xs font-bold text-slate-400 font-mono">{issue.ruleCode}</span>
                          <h4 className="text-xs font-bold text-white">{issue.title}</h4>
                        </div>
                        <p className="text-xs text-slate-400">{issue.description}</p>
                      </div>

                      <div className="flex items-center space-x-4">
                        {issue.status === 'PASS' ? (
                          <span className="text-xs font-semibold text-emerald-400 flex items-center space-x-1">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>PASS</span>
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-red-400 flex items-center space-x-1">
                            <XCircle className="w-4 h-4" />
                            <span>FAIL</span>
                          </span>
                        )}
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </>
      )}

      {/* Details Modal Drawer */}
      {selectedIssue && (
        <div className="fixed inset-y-0 right-0 w-96 bg-slate-950 border-l border-slate-800 shadow-2xl p-6 flex flex-col space-y-6 z-50">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-slate-400 font-mono">{selectedIssue.ruleCode}</span>
              <h3 className="text-sm font-bold text-white mt-1">{selectedIssue.title}</h3>
            </div>
            <button
              onClick={() => { setSelectedIssue(null); setOverrideReason(''); }}
              className="text-slate-400 hover:text-white text-xs font-semibold"
            >
              Close
            </button>
          </div>

          <div className="space-y-4 text-xs text-slate-300">
            <div>
              <span className="text-slate-400 block">Description</span>
              <p className="mt-1">{selectedIssue.description}</p>
            </div>

            {selectedIssue.expectedValue && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-400 block">Expected Value</span>
                  <div className="bg-slate-900 border border-slate-800 rounded p-2 text-white font-mono mt-1">
                    {selectedIssue.expectedValue}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 block">Actual Value</span>
                  <div className="bg-slate-900 border border-slate-800 rounded p-2 text-white font-mono mt-1">
                    {selectedIssue.actualValue}
                  </div>
                </div>
              </div>
            )}

            {selectedIssue.difference && (
              <div>
                <span className="text-slate-400 block">Calculated Difference</span>
                <div className="text-red-400 font-mono mt-1">₹{parseFloat(selectedIssue.difference).toLocaleString('en-IN')}</div>
              </div>
            )}

            <div className="border-t border-slate-800 pt-4 space-y-3">
              <span className="text-slate-400 block">Reviewer Override Actions</span>
              <textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Enter justification for overriding this compliance lock..."
                className="w-full h-20 bg-slate-900 border border-slate-800 rounded p-2 text-white placeholder-slate-500 focus:outline-none"
              />
              <button
                disabled={!overrideReason}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 text-white font-semibold py-2 rounded transition-colors"
              >
                Apply Reviewer Override
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
