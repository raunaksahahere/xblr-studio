import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { Cpu, RefreshCw, ToggleLeft, ToggleRight, Play, CheckCircle } from 'lucide-react';

export default function AutomationCenter() {
  const { accessToken } = useAuthStore();
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRecipes = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/automations', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (res.ok) {
        setRecipes(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecipes();
  }, [accessToken]);

  const toggleRecipe = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/automations/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ isEnabled: !currentStatus }),
      });
      if (res.ok) {
        setRecipes(prev => prev.map(r => r.id === id ? { ...r, isEnabled: !currentStatus } : r));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const triggerRecipe = async (id: string) => {
    try {
      const res = await fetch(`/api/automations/${id}/trigger`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        fetchRecipes();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="mx-auto max-w-5xl p-6 lg:p-8 space-y-6 w-full text-slate-100">
      <div className="flex justify-between items-end gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center space-x-2">
            <Cpu className="w-5 h-5 text-indigo-400 animate-pulse" />
            <span>AI Automation Center</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure automated parsing, duplicate detection, and notification routing engines.
          </p>
        </div>
        <button 
          onClick={fetchRecipes}
          className="inline-flex items-center gap-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs px-3.5 py-1.5 rounded-lg transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Sync Rules</span>
        </button>
      </div>

      {/* Grid of Automation Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {recipes.map((recipe) => (
          <div key={recipe.id} className="rounded-xl border border-slate-900 bg-slate-950/40 p-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex justify-between items-start gap-3">
                <h3 className="text-sm font-semibold text-slate-200">{recipe.name}</h3>
                <button 
                  onClick={() => toggleRecipe(recipe.id, recipe.isEnabled)}
                  className="text-slate-400 hover:text-white transition shrink-0"
                >
                  {recipe.isEnabled ? (
                    <ToggleRight className="w-8 h-8 text-blue-500" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-slate-700" />
                  )}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 font-mono uppercase">Trigger: {recipe.trigger} | Action: {recipe.action}</p>
            </div>

            {recipe.runs && recipe.runs.length > 0 && (
              <div className="bg-slate-950 p-2.5 rounded-lg text-[10px] space-y-1">
                <span className="font-bold text-slate-500">Last Execution:</span>
                <div className="flex justify-between text-slate-300">
                  <span className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-emerald-400" />
                    <span>Run Status: {recipe.runs[0].status}</span>
                  </span>
                  <span className="font-mono text-slate-500">{new Date(recipe.runs[0].startedAt).toLocaleTimeString()}</span>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-900">
              <button 
                onClick={() => triggerRecipe(recipe.id)}
                disabled={!recipe.isEnabled}
                className="inline-flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 disabled:opacity-30 disabled:pointer-events-none text-slate-300 text-[10px] font-semibold px-3 py-1 rounded-lg transition"
              >
                <Play className="w-3 h-3 text-emerald-400" />
                <span>Execute Dry Run</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
