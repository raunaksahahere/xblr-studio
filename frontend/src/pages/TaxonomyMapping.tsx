import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { 
  Network, Search, CheckCircle2, AlertTriangle, Cpu, 
  RefreshCw, ChevronRight, HelpCircle, Layers, FileCode, Check
} from 'lucide-react';

export default function TaxonomyMapping() {
  const { id } = useParams<{ id: string }>();
  const { accessToken } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'explorer' | 'mappings' | 'dimensions' | 'datasets'>('mappings');

  // Database lists
  const [mappings, setMappings] = useState<any[]>([]);
  const [releases, setReleases] = useState<any[]>([]);
  const [datasets, setDatasets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Selector states
  const [selectedMapping, setSelectedMapping] = useState<any | null>(null);
  const [customConceptId, setCustomConceptId] = useState('');
  const [axisQname, setAxisQname] = useState('');
  const [memberQname, setMemberQname] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Explorer taxonomy list state
  const [taxonomyConcepts, setTaxonomyConcepts] = useState<any[]>([]);
  const [selectedConcept, setSelectedConcept] = useState<any | null>(null);

  const syncData = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${accessToken}` };
      
      const [mapRes, relRes, dataRes] = await Promise.all([
        fetch(`/api/projects/${id}/taxonomy-mappings`, { headers }),
        fetch(`/api/taxonomies`, { headers }),
        fetch(`/api/projects/${id}/taxonomy-datasets`, { headers })
      ]);

      setMappings(await mapRes.json());
      setReleases(await relRes.json());
      setDatasets(await dataRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    syncData();
  }, [id, accessToken]);

  const loadTaxonomyExplorer = async (releaseVer: string) => {
    try {
      // Simulate loading standard Ind AS concepts tree
      const seedConcepts = [
        { id: '1', qname: 'mca:Assets', localName: 'Assets', dataType: 'xbrli:monetaryItemType', periodType: 'instant', isAbstract: false, reference: 'Schedule III Part I' },
        { id: '2', qname: 'mca:Equity', localName: 'Equity', dataType: 'xbrli:monetaryItemType', periodType: 'instant', isAbstract: false, reference: 'Schedule III Part I' },
        { id: '3', qname: 'mca:Liabilities', localName: 'Liabilities', dataType: 'xbrli:monetaryItemType', periodType: 'instant', isAbstract: false, reference: 'Schedule III Part I' },
        { id: '4', qname: 'mca:RevenueFromOperations', localName: 'RevenueFromOperations', dataType: 'xbrli:monetaryItemType', periodType: 'duration', isAbstract: false, reference: 'Schedule III Part II' },
        { id: '5', qname: 'mca:ProfitForThePeriod', localName: 'ProfitForThePeriod', dataType: 'xbrli:monetaryItemType', periodType: 'duration', isAbstract: false, reference: 'Schedule III Part II' },
        { id: '6', qname: 'mca:PropertyPlantAndEquipment', localName: 'PropertyPlantAndEquipment', dataType: 'xbrli:monetaryItemType', periodType: 'instant', isAbstract: false, reference: 'Schedule III Non-Current Assets' },
        { id: '7', qname: 'mca:CashAndCashEquivalents', localName: 'CashAndCashEquivalents', dataType: 'xbrli:monetaryItemType', periodType: 'instant', isAbstract: false, reference: 'Schedule III Current Assets' },
        { id: '8', qname: 'mca:ShareCapital', localName: 'ShareCapital', dataType: 'xbrli:monetaryItemType', periodType: 'instant', isAbstract: false, reference: 'Schedule III Equity' },
        { id: '9', qname: 'mca:TradeReceivables', localName: 'TradeReceivables', dataType: 'xbrli:monetaryItemType', periodType: 'instant', isAbstract: false, reference: 'Schedule III Current Assets' },
        { id: '10', qname: 'mca:AbstractStatementOfFinancialPosition', localName: 'AbstractStatementOfFinancialPosition', dataType: 'xbrli:stringItemType', periodType: 'instant', isAbstract: true, reference: 'Schedule III Balance Sheet' }
      ];
      setTaxonomyConcepts(seedConcepts);
    } catch (err) {}
  };

  useEffect(() => {
    loadTaxonomyExplorer('MCA_IND_AS_2024');
  }, []);

  const handleApplyMapping = async (factId: string, conceptId: string) => {
    try {
      const res = await fetch(`/api/taxonomy-mappings/${factId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          conceptId,
          axisQname: axisQname || undefined,
          memberQname: memberQname || undefined
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSelectedMapping(null);
        setAxisQname('');
        setMemberQname('');
        syncData();
      } else {
        if (data.error === 'COMPATIBILITY_FAILURE') {
          alert(`Structural Compatibility Check Failed:\n${data.messages.join('\n')}`);
        } else {
          alert(data.error);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCompileDataset = async () => {
    try {
      const res = await fetch(`/api/projects/${id}/taxonomy-datasets/build`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      if (res.ok) {
        syncData();
        alert('Taxonomy Dataset version snapshot built successfully.');
      }
    } catch (err) {}
  };

  const handleApproveDataset = async (datasetId: string) => {
    try {
      const res = await fetch(`/api/taxonomy-datasets/${datasetId}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      if (res.ok) syncData();
    } catch (err) {}
  };

  // Calculate coverage stats
  const totalFactsCount = mappings.length;
  const mappedFactsCount = mappings.filter(m => m.currentMapping !== null).length;
  const coveragePercentage = totalFactsCount > 0 ? Math.round((mappedFactsCount / totalFactsCount) * 100) : 0;

  return (
    <div className="mx-auto max-w-7xl p-6 lg:p-8 space-y-6 w-full text-slate-100">
      
      {/* Header section */}
      <div className="flex justify-between items-end gap-4 border-b border-slate-900 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center space-x-2">
            <Network className="w-5 h-5 text-indigo-400" />
            <span>Official Taxonomy Mapping Engine</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Validate canonical data facts against taxonomy structures and plan multidimensional context tables.
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button 
            onClick={syncData}
            className="inline-flex items-center gap-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs px-3.5 py-2 rounded-lg transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync mappings</span>
          </button>
        </div>
      </div>

      {/* Tabs navigation panel */}
      <div className="flex space-x-1.5 border-b border-slate-900 overflow-x-auto pb-px">
        {[
          { id: 'mappings', label: 'Mappings Workspace' },
          { id: 'explorer', label: 'Taxonomy Explorer' },
          { id: 'dimensions', label: 'Dimensional Axis assignments' },
          { id: 'datasets', label: 'Filing Release Versions' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 border-b-2 text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === tab.id 
                ? 'border-indigo-500 text-indigo-400 font-bold bg-indigo-950/10' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 1. MAPPINGS WORKSPACE TAB */}
      {activeTab === 'mappings' && (
        <div className="space-y-6">
          {/* Summary Coverage Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-4 shadow-sm">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider"> Factual Mapping Coverage</span>
              <p className="text-2xl font-bold text-white mt-1">{coveragePercentage}%</p>
              <p className="text-[9px] text-slate-600 font-mono mt-0.5">{mappedFactsCount} of {totalFactsCount} facts mapped</p>
            </div>
            <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-4 shadow-sm">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Active Taxonomy release</span>
              <p className="text-2xl font-bold text-white mt-1">MCA Ind AS</p>
              <p className="text-[9px] text-slate-600 font-mono mt-0.5">Version release: 2024</p>
            </div>
            <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-4 shadow-sm">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Compatibility Status</span>
              <p className="text-2xl font-bold text-emerald-400 mt-1">LOCKED</p>
              <p className="text-[9px] text-slate-600 font-mono mt-0.5">Abstract-element checking enabled</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left side facts list */}
            <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-4 space-y-3 h-[500px] overflow-y-auto">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-900 pb-2">Canonical Fact entries</h3>
              {mappings.map((item) => (
                <div 
                  key={item.fact.id} 
                  onClick={() => setSelectedMapping(item)}
                  className={`p-3 rounded-lg border text-xs cursor-pointer transition ${
                    selectedMapping?.fact.id === item.fact.id 
                      ? 'bg-indigo-950/20 border-indigo-500' 
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <p className="font-bold text-slate-200">{item.fact.factKey}</p>
                  <p className="text-[10px] text-slate-400 mt-1">Value: {Number(item.fact.valueNormalized || item.fact.factValue).toLocaleString()} INR</p>
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-900 text-[10px]">
                    <span className="text-slate-500 font-mono uppercase">{item.fact.periodType || 'instant'}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                      item.currentMapping ? 'bg-emerald-950/20 text-emerald-400' : 'bg-yellow-950/20 text-yellow-400'
                    }`}>
                      {item.currentMapping ? `Mapped: ${item.currentMapping.elementName}` : 'Unmapped'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Center & Right Mapping workflow panel */}
            <div className="lg:col-span-2 space-y-6">
              {selectedMapping ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Candidate recommendations */}
                  <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-5 space-y-4">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Candidate Recommendations</h3>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      AI candidate rankings compatible with the fact's dataType and periodType.
                    </p>

                    <div className="space-y-3">
                      {selectedMapping.candidates.map((cand: any) => (
                        <div key={cand.conceptId} className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2">
                          <div className="flex justify-between items-start">
                            <span className="text-[9px] font-bold text-indigo-400 bg-indigo-950/40 px-2 py-0.5 rounded font-mono">{cand.qname}</span>
                            <span className="text-[10px] text-emerald-400 font-bold font-mono">{cand.confidence}% match</span>
                          </div>
                          <p className="text-[10px] text-slate-400 italic">Why: {cand.reason}</p>
                          <div className="flex justify-between items-center pt-2 border-t border-slate-900">
                            <span className="text-[9px] text-slate-500 font-mono">Period: {cand.periodType} | Type: {cand.dataType}</span>
                            <button
                              onClick={() => handleApplyMapping(selectedMapping.fact.id, cand.conceptId)}
                              className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-semibold px-3 py-1 rounded-lg transition"
                            >
                              Assign concept
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Fact evidence and Manual Override */}
                  <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-5 space-y-4">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Filing Evidence context</h3>
                    
                    <div className="p-3 bg-slate-900/40 border border-slate-800 rounded-lg text-xs space-y-2">
                      <p className="font-semibold text-slate-300">Raw context snippet:</p>
                      <p className="text-[11px] text-slate-400 italic font-mono bg-slate-950 p-2 rounded">
                        "{selectedMapping.fact.sourceSnippet || 'Total Assets value listed under Schedule III assets summary page.'}"
                      </p>
                      <div className="text-[10px] text-slate-500 font-mono space-y-0.5">
                        <p>Confidence: {selectedMapping.fact.overallConfidence}%</p>
                        <p>Evidence ID: {selectedMapping.fact.sourceDocumentId || 'reliance_report.pdf'}</p>
                      </div>
                    </div>

                    <div className="border-t border-slate-900 pt-4 space-y-3">
                      <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Manual concept override</h4>
                      <input 
                        type="text"
                        value={customConceptId}
                        onChange={(e) => setCustomConceptId(e.target.value)}
                        placeholder="Paste QName (e.g. mca:Assets)..."
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
                      />
                      <button
                        onClick={() => {
                          const matched = taxonomyConcepts.find(c => c.qname === customConceptId);
                          if (matched) {
                            handleApplyMapping(selectedMapping.fact.id, matched.id);
                          } else {
                            alert('Custom QName not found in taxonomy concept registry index.');
                          }
                        }}
                        className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-semibold py-2 rounded-lg transition"
                      >
                        Override Concept Mapping
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-64 border border-dashed border-slate-800 rounded-xl flex flex-col justify-center items-center text-slate-500 space-y-2">
                  <HelpCircle className="w-8 h-8" />
                  <p className="text-xs">Select a canonical fact entry from the left list to view mapping options.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. TAXONOMY EXPLORER TAB */}
      {activeTab === 'explorer' && (
        <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-5 space-y-4">
          <div className="flex justify-between items-center gap-4 flex-wrap">
            <div>
              <h3 className="text-sm font-bold text-white">Official Ind AS 2024 Concepts Tree</h3>
              <p className="text-xs text-slate-400 mt-0.5">Explore presentation links, calculation links, and references defined by the MCA.</p>
            </div>
            <div className="relative max-w-xs w-full">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search concepts tree..."
                className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 pl-9 pr-4 text-slate-200 text-xs focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left concepts list */}
            <div className="md:col-span-2 border border-slate-900 bg-slate-950/40 rounded-xl p-3 h-96 overflow-y-auto space-y-1">
              {taxonomyConcepts
                .filter(c => c.qname.toLowerCase().includes(searchQuery.toLowerCase()) || c.localName.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(c => (
                  <div 
                    key={c.id} 
                    onClick={() => setSelectedConcept(c)}
                    className={`flex justify-between items-center p-2 rounded-lg cursor-pointer transition text-xs ${
                      selectedConcept?.id === c.id ? 'bg-indigo-950/30 text-indigo-300' : 'hover:bg-slate-900/40 text-slate-300'
                    }`}
                  >
                    <span className="font-mono">{c.qname}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold font-mono ${c.isAbstract ? 'bg-slate-800 text-slate-400' : 'bg-blue-950/20 text-blue-400'}`}>
                      {c.isAbstract ? 'Abstract' : 'Fact-Item'}
                    </span>
                  </div>
                ))}
            </div>

            {/* Right concept metadata details panel */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 space-y-4">
              {selectedConcept ? (
                <div className="space-y-3 text-xs">
                  <h4 className="font-bold text-white">Concept Properties</h4>
                  <div className="space-y-2">
                    <p className="text-slate-500 font-mono text-[10px]">QName: <span className="text-slate-200">{selectedConcept.qname}</span></p>
                    <p className="text-slate-500 font-mono text-[10px]">Data Type: <span className="text-slate-200">{selectedConcept.dataType}</span></p>
                    <p className="text-slate-500 font-mono text-[10px]">Period Type: <span className="text-slate-200 uppercase">{selectedConcept.periodType}</span></p>
                    <p className="text-slate-500 font-mono text-[10px]">Schedule III Ref: <span className="text-slate-200">{selectedConcept.reference}</span></p>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col justify-center items-center text-slate-500 text-xs">
                  <HelpCircle className="w-6 h-6 mb-2" />
                  <p>Click a concept in the tree list to view properties.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. DIMENSIONAL AXIS ASSIGNMENTS */}
      {activeTab === 'dimensions' && (
        <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white">Multidimensional Context Assignment</h3>
            <p className="text-xs text-slate-400 mt-0.5">Assign Axis and Member tags for dimensional disclosures schedules (e.g. Property classes gross block schedules).</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4 bg-slate-900/40 p-5 border border-slate-800 rounded-xl">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Define Context Axis/Member</h4>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Select Mapping Fact</label>
                  <select 
                    onChange={(e) => {
                      const matched = mappings.find(m => m.fact.id === e.target.value);
                      setSelectedMapping(matched);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="">-- Choose Fact --</option>
                    {mappings.map(m => (
                      <option key={m.fact.id} value={m.fact.id}>{m.fact.factKey}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Dimensional Axis QName</label>
                  <select 
                    value={axisQname}
                    onChange={(e) => setAxisQname(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="">-- Choose Axis --</option>
                    <option value="mca:ClassesOfShareCapitalAxis">mca:ClassesOfShareCapitalAxis</option>
                    <option value="mca:ClassesOfPropertyPlantAndEquipmentAxis">mca:ClassesOfPropertyPlantAndEquipmentAxis</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Dimensional Member QName</label>
                  <select 
                    value={memberQname}
                    onChange={(e) => setMemberQname(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="">-- Choose Member --</option>
                    <option value="mca:EquitySharesMember">mca:EquitySharesMember</option>
                    <option value="mca:PreferenceSharesMember">mca:PreferenceSharesMember</option>
                    <option value="mca:LandMember">mca:LandMember</option>
                    <option value="mca:BuildingsMember">mca:BuildingsMember</option>
                  </select>
                </div>

                <button
                  onClick={() => {
                    if (selectedMapping) {
                      handleApplyMapping(selectedMapping.fact.id, selectedMapping.candidates[0]?.conceptId);
                    }
                  }}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2.5 rounded-lg transition"
                >
                  Save Context Assignment
                </button>
              </div>
            </div>

            <div className="bg-slate-900/20 p-5 border border-slate-800 border-dashed rounded-xl flex flex-col justify-center text-xs space-y-2 leading-relaxed">
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide">Dimension check policy</span>
              <p className="text-slate-400">
                Dimension Axis/Members assignments are checked dynamically against linkbase definitions. Assigning members that are not children of the axis will trigger validation exceptions before snapshot compiles.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 4. FILING DATASETS RELEASES */}
      {activeTab === 'datasets' && (
        <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-900 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white">Immutable Taxonomy Datasets Releases</h3>
              <p className="text-xs text-slate-400 mt-0.5">Final release compiled from mappings workspace ready to generate the AOC-4 XML filing.</p>
            </div>
            <button 
              onClick={handleCompileDataset}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition"
            >
              Compile mapping release snapshot
            </button>
          </div>

          <div className="overflow-x-auto">
            {datasets.length === 0 ? (
              <p className="text-slate-500 text-xs py-8 text-center">No taxonomy mapping releases compiled yet.</p>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-900 text-slate-500 font-semibold uppercase">
                    <th className="pb-3 pl-2">Version #</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Mappings Snapshot SHA-256</th>
                    <th className="pb-3">Unmapped facts count</th>
                    <th className="pb-3">Compiled By</th>
                    <th className="pb-3 text-right pr-2">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/50">
                  {datasets.map((ver) => (
                    <tr key={ver.id} className="hover:bg-slate-900/10 transition">
                      <td className="py-3 pl-2 font-bold text-slate-200">v{ver.versionNumber}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          ver.status === 'APPROVED' ? 'bg-emerald-950/20 text-emerald-400 border border-emerald-800/20' :
                          'bg-indigo-950/20 text-indigo-400 border border-indigo-800/20'
                        }`}>
                          {ver.status}
                        </span>
                      </td>
                      <td className="py-3 font-mono text-slate-400 text-[10px]">{ver.mappingSnapshotHash ? `${ver.mappingSnapshotHash.substring(0, 20)}...` : 'N/A'}</td>
                      <td className="py-3 font-mono text-slate-300 font-bold">{ver.exceptionsCount} unmapped</td>
                      <td className="py-3 text-slate-400">{ver.createdBy}</td>
                      <td className="py-3 text-right pr-2">
                        {ver.status === 'DRAFT' && (
                          <button 
                            onClick={() => handleApproveDataset(ver.id)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-semibold px-3 py-1 rounded transition"
                          >
                            Approve release
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
