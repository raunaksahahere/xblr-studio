import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Cpu, CheckCircle, Loader2, FileText, ArrowRight, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

interface PipelineStage {
  stageName: string;
  status: string; // NOT_STARTED, RUNNING, COMPLETED, FAILED
  progressCurrent: number;
  progressTotal: number;
}

export default function AIProcessing() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { accessToken } = useAuthStore();
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPipeline = async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/projects/${id}/pipeline`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const data = await res.json();
      setStages(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const triggerContinue = async () => {
    // Call backend pipeline continue trigger
    await fetch(`/api/projects/${id}/pipeline/continue`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    fetchPipeline();
  };

  useEffect(() => {
    fetchPipeline();
    const interval = setInterval(fetchPipeline, 1500);
    return () => clearInterval(interval);
  }, [id]);

  // Determine overall completion percentage
  const totalSteps = stages.length || 8;
  const completedSteps = stages.filter(s => s.status === 'COMPLETED').length;
  const overallProgress = Math.round((completedSteps / totalSteps) * 100);

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-73px)] overflow-hidden w-full max-w-xl mx-auto p-6 space-y-6 justify-center">
      {/* Header card */}
      <div className="text-center space-y-2 mb-4">
        <div className="bg-blue-600/10 border border-blue-500/20 w-12 h-12 rounded-2xl flex items-center justify-center mx-auto animate-pulse">
          <Cpu className="w-6 h-6 text-blue-400" />
        </div>
        <h2 className="text-lg font-bold text-white tracking-tight">AI Ingestion & Processing Workspace</h2>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Extracting Schedule III accounts, matching taxonomy metadata, and performing balance validations.
        </p>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-900 border border-slate-800 rounded-full h-3 relative overflow-hidden">
        <div 
          className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 h-full rounded-full transition-all duration-300"
          style={{ width: `${overallProgress}%` }}
        />
      </div>
      <div className="w-full flex justify-between text-[10px] font-mono text-slate-500 px-1">
        <span>{completedSteps} OF {totalSteps} STAGES COMPLETE</span>
        <span>{overallProgress}% COMPLETE</span>
      </div>

      {/* Timeline stages list */}
      <div className="w-full space-y-3 overflow-y-auto flex-1 pr-1">
        {loading ? (
          <div className="text-center text-slate-500 text-xs py-4">Fetching pipeline indicators...</div>
        ) : (
          stages.map((stage) => {
            const isActive = stage.status === 'RUNNING';
            const isCompleted = stage.status === 'COMPLETED';
            const isFailed = stage.status === 'FAILED';

            return (
              <div 
                key={stage.stageName} 
                className={`flex items-center justify-between p-3.5 rounded-xl border transition-all duration-300 ${
                  isActive ? 'bg-slate-900/60 border-blue-500/30' :
                  isCompleted ? 'bg-slate-950/40 border-slate-900' :
                  'bg-slate-950/10 border-transparent opacity-40'
                }`}
              >
                <div className="flex items-center space-x-3.5 min-w-0">
                  <div>
                    {isCompleted ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    ) : isActive ? (
                      <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                    ) : isFailed ? (
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                    ) : (
                      <FileText className="w-4 h-4 text-slate-600" />
                    )}
                  </div>
                  <div className="truncate">
                    <p className={`text-xs font-bold ${isActive ? 'text-blue-400' : 'text-slate-200'}`}>
                      {stage.stageName.replace(/([A-Z])/g, ' $1')}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      Progress: {stage.progressCurrent} / {stage.progressTotal}
                    </p>
                  </div>
                </div>

                <div>
                  {isCompleted ? (
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-bold">READY</span>
                  ) : isActive ? (
                    <span className="text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded font-bold">PROCESSING</span>
                  ) : (
                    <span className="text-[10px] text-slate-500 bg-slate-800/40 px-2 py-0.5 rounded">QUEUED</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="flex space-x-3 pt-2">
        <button
          onClick={triggerContinue}
          className="flex-1 bg-slate-850 hover:bg-slate-800 text-slate-200 text-xs font-semibold py-2 rounded transition-colors"
        >
          Run / Resume Pipeline
        </button>
        <button
          onClick={() => navigate(`/project/${id}/review`)}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-2 rounded transition-colors flex items-center justify-center space-x-1"
        >
          <span>Open Review Workspace</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
