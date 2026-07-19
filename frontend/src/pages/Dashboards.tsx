import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useProjectStore } from '../store/projectStore';
import { 
  Building2, Plus, ArrowRight, Shield, CheckCircle, 
  AlertTriangle, Key, Activity, Layers, Download, Database,
  Upload, FileText, ListChecks, TrendingUp, ArrowUpRight, HelpCircle
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

export default function Dashboards() {
  const { user, accessToken } = useAuthStore();
  const { setActiveProjectId } = useProjectStore();
  const navigate = useNavigate();

  // State arrays
  const [companies, setCompanies] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [apiKeys, setApiKeys] = useState<any[]>([]);

  // Wizard state
  const [showWizardModal, setShowWizardModal] = useState(false);
  const [wizardStep, setWizardStep] = useState(1); // Steps 1 to 5

  // Form states
  const [cin, setCin] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  
  // Step 2 & 3 states
  const [financialYear, setFinancialYear] = useState('2024-2025');
  const [reportingStandard, setReportingStandard] = useState('IND_AS'); // IND_AS, AS, UNKNOWN
  const [scheduleIiiDivision, setScheduleIiiDivision] = useState('DIVISION_II'); // DIVISION_I, DIVISION_II, DIVISION_III, UNKNOWN
  const [taxonomyVersion, setTaxonomyVersion] = useState('2024');

  // Step 4 states
  const [hasPreviousYear, setHasPreviousYear] = useState('UPLOAD_LATER'); // YES, NO, UPLOAD_LATER

  // Api key state
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKeySecret, setCreatedKeySecret] = useState<string | null>(null);

  // Status/Error triggers
  const [loading, setLoading] = useState(false);
  const [errMessage, setErrMessage] = useState<string | null>(null);

  const mockMonthlyData = [
    { month: 'Jan', filings: 18, credits: 24 },
    { month: 'Feb', filings: 22, credits: 28 },
    { month: 'Mar', filings: 31, credits: 38 },
    { month: 'Apr', filings: 27, credits: 32 },
    { month: 'May', filings: 35, credits: 42 },
    { month: 'Jun', filings: 44, credits: 51 },
    { month: 'Jul', filings: 42, credits: 48 }
  ];

  const mockWeeklyData = [
    { week: 'W1', accuracy: 92.1 },
    { week: 'W2', accuracy: 93.4 },
    { week: 'W3', accuracy: 94.2 },
    { week: 'W4', accuracy: 95.1 },
    { week: 'W5', accuracy: 95.8 },
    { week: 'W6', accuracy: 96.4 }
  ];

  // Fetch initial dashboard metrics
  const fetchDashboardData = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${accessToken}` };
      
      const compRes = await fetch('/api/companies', { headers });
      const compData = await compRes.json();
      setCompanies(Array.isArray(compData) ? compData : []);

      const projRes = await fetch('/api/projects', { headers });
      const projData = await projRes.json();
      setProjects(Array.isArray(projData) ? projData : []);

      if (user?.role === 'ADMIN' || user?.role === 'REVIEWER') {
        const auditRes = await fetch('/api/audits', { headers });
        const auditData = await auditRes.json();
        setAuditLogs(Array.isArray(auditData) ? auditData : []);
      }

      if (user?.role === 'ADMIN') {
        const keyRes = await fetch('/api/apikeys', { headers });
        const keyData = await keyRes.json();
        setApiKeys(Array.isArray(keyData) ? keyData : []);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [accessToken, user?.role]);

  const handleCreateCompany = async () => {
    if (!cin || !companyName) {
      setErrMessage('Company CIN and Name are required.');
      return null;
    }
    
    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          cin,
          name: companyName,
          registeredAddress: companyAddress,
          email: companyEmail,
          phone: companyPhone,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to register company');

      fetchDashboardData();
      return data.id;
    } catch (err: any) {
      setErrMessage(err.message);
      return null;
    }
  };

  const handleCreateProject = async (companyIdToUse: string) => {
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          companyId: companyIdToUse,
          financialYear,
          reportingStandard,
          scheduleIiiDivision,
          taxonomyVersion,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create filing project');

      // Reset Wizard
      setShowWizardModal(false);
      setWizardStep(1);
      setCin('');
      setCompanyName('');
      setCompanyAddress('');
      setCompanyEmail('');
      setSelectedCompanyId('');
      fetchDashboardData();

      // Redirect to reviews
      setActiveProjectId(data.id);
      navigate(`/project/${data.id}/review`);
    } catch (err: any) {
      setErrMessage(err.message);
    }
  };

  const handleWizardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrMessage(null);

    let finalCompanyId = selectedCompanyId;

    if (!finalCompanyId) {
      // Check if CIN already added
      const matchingComp = companies.find(c => c.cin.toUpperCase() === cin.toUpperCase());
      if (matchingComp) {
        finalCompanyId = matchingComp.id;
      } else {
        const createdId = await handleCreateCompany();
        if (!createdId) {
          setLoading(false);
          return;
        }
        finalCompanyId = createdId;
      }
    }

    await handleCreateProject(finalCompanyId);
    setLoading(false);
  };

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName) return;
    try {
      const res = await fetch('/api/apikeys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ name: newKeyName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setCreatedKeySecret(data.plainKey);
      setNewKeyName('');
      fetchDashboardData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const totalDocs = projects.reduce((acc, p) => acc + (p.documents?.length || 0), 0);
  const pendingReviews = projects.filter(p => p.status === 'IN_PROGRESS' || p.status === 'IN_REVIEW').length;
  const totalExports = projects.filter(p => p.status === 'COMPLETED').length;

  const todayCount = projects.reduce((acc, p) => {
    const todayDocs = p.documents?.filter((d: any) => {
      return new Date(d.createdAt).toDateString() === new Date().toDateString();
    }) || [];
    return acc + todayDocs.length;
  }, 0);

  const metricCards = [
    { label: 'Companies', value: companies.length, delta: '+3 this month', icon: Building2, tone: 'primary' },
    { label: 'Documents processed', value: totalDocs, delta: '+24 this week', icon: FileText, tone: 'accent' },
    { label: 'Pending reviews', value: pendingReviews, delta: '4 urgent', icon: ListChecks, tone: 'warning' },
    { label: 'Exports', value: totalExports, delta: '+12 this week', icon: Download, tone: 'success' },
    { label: 'Credits remaining', value: 342, delta: 'of 500 monthly', icon: Key, tone: 'primary' },
    { label: 'Today\'s uploads', value: todayCount, delta: '3 processing', icon: Upload, tone: 'accent' }
  ];

  return (
    <div className="mx-auto max-w-7xl p-6 lg:p-8 space-y-6 w-full">
      {/* Welcome Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Overview</h1>
          <p className="mt-1 text-sm text-slate-400">
            Your workspace at a glance — <span className="text-blue-400 font-semibold">96.4%</span> average mapping accuracy this cycle.
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => {
              setWizardStep(1);
              setSelectedCompanyId('');
              setShowWizardModal(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-3.5 py-2 text-sm font-semibold text-white hover:from-blue-500 hover:to-indigo-500 transition shadow-md shadow-blue-500/10"
          >
            <Plus className="w-4 h-4" />
            <span>New Filing</span>
          </button>
        </div>
      </div>

      {/* 6 Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {metricCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-xl border border-slate-900 bg-slate-950/40 p-4 shadow-md backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">{card.label}</span>
                <Icon className="h-4 w-4 text-blue-400" />
              </div>
              <div className="mt-2 text-2xl font-bold text-white">{card.value}</div>
              <div className="mt-1 text-[10px] font-mono text-slate-500">{card.delta}</div>
            </div>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Monthly Usage Chart */}
        <div className="rounded-xl border border-slate-900 bg-slate-950/40 p-5 lg:col-span-2 shadow-md backdrop-blur-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Monthly usage</h3>
              <p className="text-xs text-slate-400">Filings prepared and credits consumed</p>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>+18.2% vs prior</span>
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockMonthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="month" stroke="#6b7280" fontSize={11} axisLine={false} tickLine={false} />
                <YAxis stroke="#6b7280" fontSize={11} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#020617', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '12px' }} />
                <Bar dataKey="filings" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                <Bar dataKey="credits" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Processing Accuracy Chart */}
        <div className="rounded-xl border border-slate-900 bg-slate-950/40 p-5 shadow-md backdrop-blur-sm">
          <div>
            <h3 className="text-sm font-semibold text-white">Processing accuracy</h3>
            <p className="text-xs text-slate-400">Weekly mapping precision</p>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">96.4%</span>
            <span className="text-xs text-emerald-400 inline-flex items-center gap-0.5">
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>+4.3%</span>
            </span>
          </div>
          <div className="h-44 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockWeeklyData}>
                <defs>
                  <linearGradient id="accuracyGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="week" stroke="#6b7280" fontSize={11} axisLine={false} tickLine={false} />
                <YAxis domain={[90, 100]} hide />
                <Tooltip contentStyle={{ background: '#020617', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '12px' }} />
                <Area type="monotone" dataKey="accuracy" stroke="#3b82f6" strokeWidth={2} fill="url(#accuracyGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Active Filing Projects Table */}
      <div className="rounded-xl border border-slate-900 bg-slate-950/40 p-5 shadow-md backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <Layers className="w-5 h-5 text-blue-400" />
            <span>Active Filing Projects</span>
          </h2>
        </div>

        <div className="overflow-x-auto">
          {projects.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl">
              <Layers className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No active filing projects created yet.</p>
              <button 
                onClick={() => {
                  setWizardStep(1);
                  setSelectedCompanyId('');
                  setShowWizardModal(true);
                }} 
                className="mt-3 text-xs text-blue-400 underline font-semibold"
              >
                Create your first project
              </button>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800/80 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="pb-3 pl-2">Company (CIN)</th>
                  <th className="pb-3">Financial Year</th>
                  <th className="pb-3">Stage</th>
                  <th className="pb-3">Uploaded Docs</th>
                  <th className="pb-3 pr-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {projects.map((project) => (
                  <tr key={project.id} className="hover:bg-slate-900/35 transition-colors group">
                    <td className="py-3 pl-2">
                      <div className="font-semibold text-slate-200">{project.company?.name}</div>
                      <div className="text-[10px] font-mono text-slate-500">{project.company?.cin}</div>
                    </td>
                    <td className="py-3 font-mono text-slate-300">{project.financialYear}</td>
                    <td className="py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        project.status === 'COMPLETED' ? 'bg-emerald-950/20 text-emerald-400 border-emerald-800/40' :
                        project.status === 'IN_REVIEW' ? 'bg-purple-950/20 text-purple-400 border-purple-800/40' :
                        project.status === 'FAILED' ? 'bg-red-950/20 text-red-400 border-red-800/40' :
                        'bg-blue-950/20 text-blue-400 border-blue-800/40'
                      }`}>
                        {project.currentStage.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 font-mono text-slate-400">
                      {project.documents?.length || 0} files
                    </td>
                    <td className="py-3 pr-2 text-right">
                      <button 
                        onClick={() => {
                          setActiveProjectId(project.id);
                          navigate(`/project/${project.id}/review`);
                        }}
                        className="inline-flex items-center space-x-1 bg-blue-600/10 border border-blue-500/20 hover:bg-blue-600 text-blue-400 hover:text-white transition-all text-[11px] px-2.5 py-1 rounded-lg group-hover:scale-105"
                      >
                        <span>Review</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Security Logs & API Keys */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {(user?.role === 'ADMIN' || user?.role === 'REVIEWER') && (
          <div className="glass-panel rounded-2xl p-5 flex flex-col border border-slate-900 bg-slate-950/40 shadow-md">
            <div className="flex items-center justify-between border-b border-slate-900 pb-3 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Recent activity</h3>
                <p className="text-xs text-slate-400">Live from your organization</p>
              </div>
              <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                <Activity className="h-3.5 w-3.5 text-purple-400" />
                <span>auto-updating</span>
              </span>
            </div>
            
            <div className="flex-1 overflow-y-auto max-h-60 space-y-3">
              {auditLogs.length === 0 ? (
                <p className="text-slate-500 text-xs text-center py-8">No recent security activities logged.</p>
              ) : (
                auditLogs.slice(0, 8).map((log) => (
                  <div key={log.id} className="flex justify-between items-start text-xs border-b border-slate-900/50 pb-2">
                    <div>
                      <span className="font-semibold text-slate-200">{log.email}</span>
                      <span className="text-slate-400 mx-1">—</span>
                      <span className="text-slate-300 font-mono">{log.action}</span>
                      {log.details && (
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">{log.details}</p>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {user?.role === 'ADMIN' && (
          <div className="glass-panel rounded-2xl p-5 border border-slate-900 bg-slate-950/40 shadow-md">
            <div className="flex items-center justify-between border-b border-slate-900 pb-3 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Developer API Access</h3>
                <p className="text-xs text-slate-400">Manage credentials for external pipelines</p>
              </div>
              <Key className="w-5 h-5 text-indigo-400" />
            </div>

            <form onSubmit={handleCreateApiKey} className="flex gap-2 mb-4">
              <input
                type="text"
                required
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="e.g. Jenkins filing pipeline"
                className="flex-1 bg-slate-900/50 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none"
              />
              <button 
                type="submit"
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition"
              >
                Create Key
              </button>
            </form>

            {createdKeySecret && (
              <div className="bg-blue-950/20 border border-blue-900/50 p-3 rounded-lg text-xs space-y-1 mb-4">
                <span className="font-bold text-blue-400">Copy this secret key (won't be shown again):</span>
                <p className="font-mono text-slate-300 select-all bg-slate-950 p-1.5 rounded border border-slate-800 break-all">
                  {createdKeySecret}
                </p>
              </div>
            )}

            <div className="space-y-2 overflow-y-auto max-h-40">
              {apiKeys.length === 0 ? (
                <p className="text-slate-500 text-xs text-center py-6">No API credentials generated yet.</p>
              ) : (
                apiKeys.map((key) => (
                  <div key={key.id} className="flex justify-between items-center text-xs border-b border-slate-900/50 pb-2">
                    <div>
                      <p className="font-semibold text-slate-200">{key.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">Prefix: {key.keyPrefix}...</p>
                    </div>
                    <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                      {key.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* 5-Step Create Filing Wizard Modal */}
      {showWizardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="mb-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Step {wizardStep} of 5</span>
                <span className="text-xs text-slate-500 font-semibold">{Math.round((wizardStep / 5) * 100)}% Complete</span>
              </div>
              <div className="w-full bg-slate-900 h-1.5 rounded-full mt-2 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-300" style={{ width: `${(wizardStep / 5) * 100}%` }}></div>
              </div>
            </div>

            {errMessage && (
              <div className="bg-red-950/20 border border-red-900/50 text-red-400 text-xs p-3 rounded-lg mb-4 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errMessage}</span>
              </div>
            )}

            <form onSubmit={handleWizardSubmit} className="space-y-4 flex-1 overflow-y-auto pr-1">
              
              {/* STEP 1: Select or Register Company */}
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-white mb-1">Select Corporate Identity</h3>
                    <p className="text-xs text-slate-400 mb-3">Identify company entity by CIN or register a new one.</p>
                    
                    <select
                      value={selectedCompanyId}
                      onChange={(e) => {
                        setSelectedCompanyId(e.target.value);
                        if (e.target.value) {
                          const comp = companies.find(c => c.id === e.target.value);
                          setCin(comp.cin);
                          setCompanyName(comp.name);
                        } else {
                          setCin('');
                          setCompanyName('');
                        }
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                    >
                      <option value="">-- Register a new company via CIN --</option>
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.cin})
                        </option>
                      ))}
                    </select>
                  </div>

                  {!selectedCompanyId && (
                    <div className="border border-slate-900 bg-slate-950/40 p-4 rounded-xl space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">CIN (Corporate Identification Number)</label>
                        <input
                          type="text"
                          required
                          value={cin}
                          onChange={(e) => setCin(e.target.value)}
                          placeholder="e.g. L17110MH1973PLC019786"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Company Legal Name</label>
                        <input
                          type="text"
                          required
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          placeholder="e.g. Reliance Industries Limited"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Email</label>
                          <input
                            type="email"
                            value={companyEmail}
                            onChange={(e) => setCompanyEmail(e.target.value)}
                            placeholder="relations@company.com"
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Phone</label>
                          <input
                            type="text"
                            value={companyPhone}
                            onChange={(e) => setCompanyPhone(e.target.value)}
                            placeholder="022-XXXXXXX"
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Registered Address</label>
                        <input
                          type="text"
                          value={companyAddress}
                          onChange={(e) => setCompanyAddress(e.target.value)}
                          placeholder="3rd Floor Nariman Point..."
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: Select Financial Year */}
              {wizardStep === 2 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-white mb-1">Filing Year Scope</h3>
                  <p className="text-xs text-slate-400 mb-3">Define the reporting period for this filing.</p>
                  
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Financial Year</label>
                    <select
                      value={financialYear}
                      onChange={(e) => setFinancialYear(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                    >
                      <option value="2024-2025">FY 2024-25 (Current Cycle)</option>
                      <option value="2023-2024">FY 2023-24 (Prior Audit)</option>
                      <option value="2022-2023">FY 2022-23 (Historical Reference)</option>
                    </select>
                  </div>

                  <div className="bg-blue-950/20 border border-blue-900/40 p-4 rounded-xl flex items-start space-x-3 text-xs text-slate-300">
                    <Shield className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-slate-200">Regulatory Timeline Isolation</p>
                      <p className="text-[11px] text-slate-400 mt-1">AI XBRL Studio partitions uploaded documents, extracted balances, and notes disclosures strictly within the bounds of the chosen FY.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: Filing Configurations */}
              {wizardStep === 3 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-white mb-1">Filing Compliance Configurations</h3>
                  <p className="text-xs text-slate-400 mb-3 font-semibold">Select the exact accounting and regulatory frameworks.</p>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Reporting Standard</label>
                      <select
                        value={reportingStandard}
                        onChange={(e) => setReportingStandard(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
                      >
                        <option value="IND_AS">Ind AS (Indian Accounting Standard)</option>
                        <option value="AS">AS (Companies Accounting Standard)</option>
                        <option value="UNKNOWN">Unknown / Needs Review</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Schedule III Division</label>
                      <select
                        value={scheduleIiiDivision}
                        onChange={(e) => setScheduleIiiDivision(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
                      >
                        <option value="DIVISION_I">Division I (Non-Ind AS)</option>
                        <option value="DIVISION_II">Division II (Ind AS)</option>
                        <option value="DIVISION_III">Division III (NBFC Ind AS)</option>
                        <option value="UNKNOWN">Unknown / Needs Review</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">MCA Taxonomy Registry</label>
                    <select
                      value={taxonomyVersion}
                      onChange={(e) => setTaxonomyVersion(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
                    >
                      <option value="2024">MCA Taxonomy 2024 (Latest Update)</option>
                      <option value="2023">MCA Taxonomy 2023</option>
                    </select>
                  </div>
                </div>
              )}

              {/* STEP 4: Previous Year comparison */}
              {wizardStep === 4 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-white mb-1">Previous Year Comparison</h3>
                  <p className="text-xs text-slate-400 mb-3">Would you like to import historical XBRL filings to map prior-year balances?</p>

                  <div className="space-y-3">
                    <label className="flex items-center space-x-3 p-3 rounded-xl border border-slate-800 bg-slate-950/40 hover:border-slate-700 cursor-pointer transition">
                      <input 
                        type="radio" 
                        name="prev_year" 
                        value="YES"
                        checked={hasPreviousYear === 'YES'} 
                        onChange={() => setHasPreviousYear('YES')}
                        className="text-blue-500" 
                      />
                      <div>
                        <p className="text-xs font-semibold text-slate-200">Yes, compare with prior filings</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Enables automatic mapping calculations comparison from prior year.</p>
                      </div>
                    </label>

                    <label className="flex items-center space-x-3 p-3 rounded-xl border border-slate-800 bg-slate-950/40 hover:border-slate-700 cursor-pointer transition">
                      <input 
                        type="radio" 
                        name="prev_year" 
                        value="UPLOAD_LATER" 
                        checked={hasPreviousYear === 'UPLOAD_LATER'} 
                        onChange={() => setHasPreviousYear('UPLOAD_LATER')}
                        className="text-blue-500" 
                      />
                      <div>
                        <p className="text-xs font-semibold text-slate-200">Upload historical filings later</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Create filing workspace now, link historical XML instances later.</p>
                      </div>
                    </label>

                    <label className="flex items-center space-x-3 p-3 rounded-xl border border-slate-800 bg-slate-950/40 hover:border-slate-700 cursor-pointer transition">
                      <input 
                        type="radio" 
                        name="prev_year" 
                        value="NO" 
                        checked={hasPreviousYear === 'NO'} 
                        onChange={() => setHasPreviousYear('NO')}
                        className="text-blue-500" 
                      />
                      <div>
                        <p className="text-xs font-semibold text-slate-200">No, start a clean slate filing</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Filing has no preceding comparable year records.</p>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* STEP 5: Final Review & Create */}
              {wizardStep === 5 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-white mb-1">Confirm Configuration</h3>
                  <p className="text-xs text-slate-400 mb-3">Review filing project details before initializing workspace.</p>

                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-2.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Legal Company Name:</span>
                      <span className="font-semibold text-slate-200">{companyName || 'New Company'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">CIN Identity:</span>
                      <span className="font-mono font-semibold text-slate-200">{cin}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Financial Cycle:</span>
                      <span className="font-semibold text-slate-200">FY {financialYear}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Accounting Standard:</span>
                      <span className="font-semibold text-slate-200">{reportingStandard}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Taxonomy Target:</span>
                      <span className="font-semibold text-slate-200">MCA IndAS Taxonomy {taxonomyVersion}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Previous-Year References:</span>
                      <span className="font-semibold text-slate-200">{hasPreviousYear.replace('_', ' ')}</span>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    By initializing, a secure multi-tenant workspace isolation container will be created. The system will configure suggested regulatory checklists based on frameworks.
                  </p>
                </div>
              )}

              {/* Actions Footer */}
              <div className="flex justify-between pt-4 border-t border-slate-900">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    if (wizardStep === 1) {
                      setShowWizardModal(false);
                    } else {
                      setWizardStep(prev => prev - 1);
                    }
                  }}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 text-xs font-semibold px-4 py-2 rounded-lg transition"
                >
                  {wizardStep === 1 ? 'Cancel' : 'Back'}
                </button>
                
                {wizardStep < 5 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (wizardStep === 1 && !selectedCompanyId && (!cin || !companyName)) {
                        setErrMessage('CIN and Legal name are mandatory to continue.');
                        return;
                      }
                      setErrMessage(null);
                      setWizardStep(prev => prev + 1);
                    }}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition flex items-center gap-1"
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold px-5 py-2 rounded-lg transition shadow-md shadow-blue-500/10"
                  >
                    {loading ? 'Initializing Project...' : 'Create Filing Project'}
                  </button>
                )
                }
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
