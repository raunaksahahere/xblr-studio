import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { Briefcase, Plus, Calendar, Settings, ShieldAlert, Award } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  financialYear: string;
  accountingFramework: string;
  taxonomyVersion: string;
  status: string;
  company: {
    name: string;
  };
}

interface Company {
  id: string;
  name: string;
}

export default function Projects() {
  const { accessToken } = useAuthStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [companyId, setCompanyId] = useState('');
  const [financialYear, setFinancialYear] = useState('2024-25');
  const [framework, setFramework] = useState('IND_AS');
  const [taxonomy, setTaxonomy] = useState('MCA_IND_AS_2024');
  const [name, setName] = useState('');

  const fetchData = async () => {
    try {
      const [projRes, compRes] = await Promise.all([
        fetch('/api/projects', { headers: { 'Authorization': `Bearer ${accessToken}` } }),
        fetch('/api/companies', { headers: { 'Authorization': `Bearer ${accessToken}` } })
      ]);
      setProjects(await projRes.json());
      const compData = await compRes.json();
      setCompanies(compData);
      if (compData.length > 0) setCompanyId(compData[0].id);
    } catch (err) {
      console.error('Failed to fetch projects data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          companyId,
          financialYear,
          accountingFramework: framework,
          taxonomyVersion: taxonomy,
          name: name || `AOC-4 Filing - FY ${financialYear}`
        })
      });
      if (res.ok) {
        fetchData();
        setShowAddModal(false);
        setName('');
      }
    } catch (err) {
      console.error('Create project error:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [accessToken]);

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-73px)] overflow-hidden w-full max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center space-x-2">
            <Briefcase className="w-5 h-5 text-indigo-400" />
            <span>Filing Workspace Projects</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Setup annual AOC-4 or MGT-7 report compliance workspaces, taxonomies, and preparer workloads.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-md transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="text-slate-400 text-xs">Loading projects list...</div>
        ) : projects.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-lg p-12 text-center bg-slate-950/40">
            <Briefcase className="w-8 h-8 text-indigo-500 mb-3" />
            <h3 className="text-sm font-semibold text-white">No Active Filing Projects</h3>
            <p className="text-xs text-slate-400 mt-1">Initialize a project to map Schedule III financial states to the digital registry.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-6">
            {projects.map((p) => (
              <div key={p.id} className="bg-slate-900/40 border border-slate-800/80 rounded-lg p-5 space-y-4 hover:border-slate-700 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-sm font-bold text-white leading-snug">{p.name}</h4>
                    <span className="text-[10px] text-indigo-400 uppercase font-semibold mt-1 block">{p.company?.name || 'Unknown'}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    p.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-400' :
                    p.status === 'UNDER_REVIEW' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {p.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4 text-xs text-slate-400 border-t border-slate-800 pt-3">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-500 block">Financial Year</span>
                    <span className="text-white flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{p.financialYear}</span>
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-500 block">Framework</span>
                    <span className="text-white flex items-center space-x-1">
                      <Settings className="w-3.5 h-3.5 text-slate-400" />
                      <span>{p.accountingFramework}</span>
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-500 block">Taxonomy</span>
                    <span className="text-white flex items-center space-x-1">
                      <Award className="w-3.5 h-3.5 text-slate-400" />
                      <span>{p.taxonomyVersion}</span>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-lg max-w-md w-full p-6 space-y-6">
            <div className="flex justify-between items-start">
              <h3 className="text-sm font-bold text-white">Initialize Annual Filing Workspace</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white text-xs">Cancel</button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400">Target Company</label>
                <select
                  value={companyId} onChange={(e) => setCompanyId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-white focus:outline-none"
                >
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-400">Financial Year</label>
                  <select
                    value={financialYear} onChange={(e) => setFinancialYear(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-white focus:outline-none"
                  >
                    <option value="2024-25">2024-25</option>
                    <option value="2023-24">2023-24</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400">Framework</label>
                  <select
                    value={framework} onChange={(e) => setFramework(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-white focus:outline-none"
                  >
                    <option value="IND_AS">Ind AS</option>
                    <option value="AS">AS / Indian GAAP</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">Taxonomy Release Schema</label>
                <select
                  value={taxonomy} onChange={(e) => setTaxonomy(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-white focus:outline-none font-mono"
                >
                  <option value="MCA_IND_AS_2024">MCA IND AS Release 2024</option>
                  <option value="MCA_IND_AS_2023">MCA IND AS Release 2023</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">Filing Project Label</label>
                <input
                  type="text" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Leave blank for automatic label generation..."
                  className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-white placeholder-slate-600 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded transition-colors"
              >
                Create Filing Project
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
