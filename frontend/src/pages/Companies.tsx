import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { Building2, Plus, Search, MapPin, Tag, Briefcase } from 'lucide-react';

interface Company {
  id: string;
  name: string;
  cin: string;
  pan: string;
  registeredAddress: string;
  industryType: string;
  createdAt: string;
}

export default function Companies() {
  const { accessToken } = useAuthStore();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [cin, setCin] = useState('');
  const [pan, setPan] = useState('');
  const [address, setAddress] = useState('');
  const [industry, setIndustry] = useState('');

  const fetchCompanies = async () => {
    try {
      const res = await fetch('/api/companies', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const data = await res.json();
      setCompanies(data);
    } catch (err) {
      console.error('Failed to fetch companies:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name, cin, pan,
          registeredAddress: address,
          industryType: industry || 'Information Technology'
        })
      });
      if (res.ok) {
        fetchCompanies();
        setShowAddModal(false);
        setName(''); setCin(''); setPan(''); setAddress(''); setIndustry('');
      }
    } catch (err) {
      console.error('Add company error:', err);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, [accessToken]);

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-73px)] overflow-hidden w-full max-w-7xl mx-auto p-6 space-y-6">
      {/* Title */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center space-x-2">
            <Building2 className="w-5 h-5 text-indigo-400" />
            <span>Company Registry</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Browse and manage MCA company records, legal entities registry, and corporate tax profiles.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-md transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Company</span>
        </button>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="text-slate-400 text-xs">Loading company logs...</div>
        ) : companies.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-lg p-12 text-center bg-slate-950/40">
            <Building2 className="w-8 h-8 text-indigo-500 mb-3" />
            <h3 className="text-sm font-semibold text-white">No Companies Registered</h3>
            <p className="text-xs text-slate-400 mt-1">Create your first company profile to start organizing XBRL filing projects.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-6">
            {companies.map((c) => (
              <div key={c.id} className="bg-slate-900/40 border border-slate-800/80 rounded-lg p-5 space-y-4 hover:border-slate-700 transition-colors">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white leading-snug">{c.name}</h4>
                  <span className="text-[10px] text-indigo-400 font-mono tracking-wider block">{c.cin}</span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs text-slate-400 border-t border-slate-800 pt-3">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-500 block">PAN</span>
                    <span className="text-white font-mono">{c.pan || 'N/A'}</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-500 block">Industry</span>
                    <span className="text-white truncate block">{c.industryType}</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 line-clamp-2 border-t border-slate-800 pt-3">
                  {c.registeredAddress}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal dialog */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-lg max-w-md w-full p-6 space-y-6">
            <div className="flex justify-between items-start">
              <h3 className="text-sm font-bold text-white">Register New Corporate Entity</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white text-xs">Cancel</button>
            </div>

            <form onSubmit={handleAddCompany} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400">Company Name</label>
                <input
                  type="text" required value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Acme Tech Solutions Ltd"
                  className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-white placeholder-slate-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-400">CIN</label>
                  <input
                    type="text" required value={cin} onChange={(e) => setCin(e.target.value)}
                    placeholder="21-character CIN"
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-white placeholder-slate-600 focus:outline-none font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400">PAN</label>
                  <input
                    type="text" value={pan} onChange={(e) => setPan(e.target.value)}
                    placeholder="10-character PAN"
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-white placeholder-slate-600 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">Registered Office Address</label>
                <textarea
                  required value={address} onChange={(e) => setAddress(e.target.value)}
                  placeholder="Official registered address..."
                  className="w-full h-16 bg-slate-900 border border-slate-800 rounded p-2 text-white placeholder-slate-600 focus:outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded transition-colors"
              >
                Register Company
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
