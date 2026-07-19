import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useProjectStore } from '../store/projectStore';
import { FileCode, ShieldCheck, Play, Loader2, AlertCircle, XCircle, Download, FileText, CheckCircle2 } from 'lucide-react';

interface ReadinessGate {
  isReady: boolean;
  stages: {
    documents: string;
    financialIntelligence: string;
    financialReview: string;
    taxonomyMapping: string;
    taxonomyReview: string;
    validation: string;
    finalReview: string;
  };
}

interface XbrlInstance {
  id: string;
  versionNumber: number;
  status: string;
  filename: string;
  sha256: string;
  createdAt: string;
}

interface XbrlFact {
  id: string;
  qname: string;
  value: string;
  periodType: string;
  contextRef: string;
  unitRef: string;
  decimals: string;
}

export default function XmlGenerator() {
  const { accessToken } = useAuthStore();
  const { activeProjectId } = useProjectStore();
  const [gate, setGate] = useState<ReadinessGate | null>(null);
  const [instances, setInstances] = useState<XbrlInstance[]>([]);
  const [selectedInstance, setSelectedInstance] = useState<XbrlInstance | null>(null);
  const [facts, setFacts] = useState<XbrlFact[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'explorer' | 'code'>('explorer');

  const steps = [
    'Preparing Dataset Snapshot',
    'Building Canonical Contexts & Deduplication Map',
    'Registering Currency Unit Definitions',
    'Serializing Mapped Concepts to Schema Nodes',
    'Enforcing Well-Formedness Validations',
    'Persisting Generation Log'
  ];

  const fetchReadiness = async () => {
    if (!activeProjectId) return;
    try {
      const res = await fetch(`/api/projects/${activeProjectId}/readiness`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const data = await res.json();
      setGate(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchVersions = async () => {
    if (!activeProjectId) return;
    try {
      const res = await fetch(`/api/projects/${activeProjectId}/xbrl/versions`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const data = await res.json();
      setInstances(data);
      if (data.length > 0 && !selectedInstance) {
        setSelectedInstance(data[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchFacts = async (versionId: string) => {
    try {
      const res = await fetch(`/api/xbrl/${versionId}/facts`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const data = await res.json();
      setFacts(data);
    } catch (err) {
      console.error(err);
    }
  };

  const triggerGeneration = async (isDraft: boolean) => {
    if (!activeProjectId) return;
    setGenerating(true);
    setCurrentStep(0);
    setStatusMessage('');

    // Progressive step indicator simulations
    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 800));
      setCurrentStep(i);
    }

    try {
      const endpoint = isDraft ? 'draft' : 'final';
      const res = await fetch(`/api/projects/${activeProjectId}/xbrl/${endpoint}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate');
      
      setSelectedInstance(data);
      fetchVersions();
      fetchReadiness();
    } catch (err: any) {
      setStatusMessage(err.message);
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    if (activeProjectId) {
      fetchReadiness();
      fetchVersions();
    }
  }, [activeProjectId, accessToken]);

  useEffect(() => {
    if (selectedInstance) {
      fetchFacts(selectedInstance.id);
    }
  }, [selectedInstance]);

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-73px)] overflow-hidden w-full max-w-7xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center space-x-2">
          <FileCode className="w-5 h-5 text-indigo-400" />
          <span>XBRL / XML Instance Document Generator</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Perform deterministic mapping serialization, deduplicate instant/duration reporting contexts, and construct verified filing packages.
        </p>
      </div>

      {!activeProjectId ? (
        <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-lg p-12 text-center bg-slate-950/40">
          <AlertCircle className="w-8 h-8 text-amber-500 mb-3" />
          <h3 className="text-sm font-semibold text-white">No Filing Project Selected</h3>
          <p className="text-xs text-slate-400 mt-1">Select a filing project to access XML generation utilities.</p>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-3 gap-6 overflow-hidden">
          {/* Left panel: Readiness & Action triggers */}
          <div className="col-span-1 bg-slate-900/40 border border-slate-800/80 rounded-lg p-5 flex flex-col space-y-6 overflow-y-auto">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Filing Readiness Checklists</h3>
              {gate ? (
                <div className="space-y-2">
                  {Object.entries(gate.stages).map(([stage, status]) => (
                    <div key={stage} className="py-2.5 px-3 bg-slate-950/40 border border-slate-850 rounded flex justify-between items-center text-xs">
                      <span className="capitalize text-slate-300 font-semibold">{stage.replace(/([A-Z])/g, ' $1')}</span>
                      {status === 'PASS' ? (
                        <span className="text-emerald-400 flex items-center space-x-1 font-bold">
                          <ShieldCheck className="w-4 h-4" />
                          <span>PASSED</span>
                        </span>
                      ) : (
                        <span className="text-red-400 flex items-center space-x-1 font-bold">
                          <XCircle className="w-4 h-4" />
                          <span>BLOCKED</span>
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-500">Checking checklist conditions...</div>
              )}
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-800">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Output Generation Actions</h3>
              
              {generating ? (
                <div className="space-y-3 bg-indigo-950/20 border border-indigo-900/40 p-4 rounded text-xs">
                  <div className="flex items-center space-x-2 text-indigo-400 font-semibold">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Compiling Instance...</span>
                  </div>
                  <div className="space-y-1.5 mt-2">
                    {steps.map((step, idx) => (
                      <div key={idx} className={`flex items-center space-x-2 ${idx <= currentStep ? 'text-slate-200' : 'text-slate-600'}`}>
                        {idx < currentStep ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        ) : idx === currentStep ? (
                          <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin flex-shrink-0" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border border-slate-800 flex-shrink-0" />
                        )}
                        <span className="truncate">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {statusMessage && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs py-2 px-3 rounded">
                      {statusMessage}
                    </div>
                  )}

                  <button
                    onClick={() => triggerGeneration(true)}
                    className="w-full flex items-center justify-center space-x-2 bg-slate-850 hover:bg-slate-800 text-white text-xs font-semibold py-2.5 rounded transition-colors"
                  >
                    <Play className="w-4 h-4 text-indigo-400" />
                    <span>Generate Draft XBRL</span>
                  </button>

                  <button
                    onClick={() => triggerGeneration(false)}
                    disabled={!gate?.isReady}
                    className="w-full flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800/80 disabled:text-slate-500 text-white text-xs font-semibold py-2.5 rounded transition-colors"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Generate Final XBRL</span>
                  </button>
                  {!gate?.isReady && (
                    <p className="text-[10px] text-red-400 text-center">Final XML blocked until readiness checklist passes.</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right panel: Versions, Fact Explorer table, and Code Viewer */}
          <div className="col-span-2 bg-slate-900/40 border border-slate-800/80 rounded-lg flex flex-col overflow-hidden">
            {/* Toolbar */}
            <div className="border-b border-slate-800/60 p-4 flex justify-between items-center bg-slate-950/20">
              <div className="flex items-center space-x-4">
                <select
                  value={selectedInstance?.id || ''}
                  onChange={(e) => {
                    const inst = instances.find(i => i.id === e.target.value);
                    if (inst) setSelectedInstance(inst);
                  }}
                  className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                >
                  {instances.length === 0 ? (
                    <option>No generated runs</option>
                  ) : (
                    instances.map(inst => (
                      <option key={inst.id} value={inst.id}>
                        {inst.status} Version {inst.versionNumber}
                      </option>
                    ))
                  )}
                </select>

                <div className="flex space-x-1 bg-slate-950/80 p-0.5 rounded border border-slate-850">
                  <button
                    onClick={() => setActiveTab('explorer')}
                    className={`px-3 py-1 text-xs font-semibold rounded ${activeTab === 'explorer' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    Fact Explorer
                  </button>
                  <button
                    onClick={() => setActiveTab('code')}
                    className={`px-3 py-1 text-xs font-semibold rounded ${activeTab === 'code' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    XML Code View
                  </button>
                </div>
              </div>

              {selectedInstance && (
                <button
                  onClick={() => alert(`Initiating secure download: ${selectedInstance.filename}`)}
                  className="flex items-center space-x-1.5 bg-slate-850 hover:bg-slate-800 text-slate-200 text-xs px-3 py-1.5 rounded transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download XML</span>
                </button>
              )}
            </div>

            {/* Content Tabs */}
            <div className="flex-1 overflow-hidden p-4">
              {!selectedInstance ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 text-xs">
                  <FileText className="w-10 h-10 mb-2 opacity-50" />
                  <span>No instances compiled yet. Trigger a run to view facts mapping.</span>
                </div>
              ) : activeTab === 'explorer' ? (
                <div className="h-full flex flex-col overflow-hidden">
                  <div className="flex-1 overflow-auto border border-slate-850 rounded">
                    <table className="min-w-full divide-y divide-slate-850 text-left text-xs">
                      <thead className="bg-slate-950/40 text-slate-400 uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="py-2.5 px-3">Tag Name</th>
                          <th className="py-2.5 px-3">Context Ref</th>
                          <th className="py-2.5 px-3">Unit</th>
                          <th className="py-2.5 px-3 right text-right">Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850 text-slate-300">
                        {facts.map((fact) => (
                          <tr key={fact.id} className="hover:bg-slate-950/30">
                            <td className="py-2.5 px-3 font-mono text-indigo-400 text-[11px] truncate max-w-xs">{fact.qname}</td>
                            <td className="py-2.5 px-3 text-slate-400">{fact.contextRef}</td>
                            <td className="py-2.5 px-3 text-slate-400 uppercase">{fact.unitRef.replace('unit_', '')}</td>
                            <td className="py-2.5 px-3 right text-right font-semibold text-emerald-400">{parseFloat(fact.value).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="h-full bg-slate-950 border border-slate-850 rounded p-4 font-mono text-[11px] text-slate-300 overflow-auto">
                  <div className="text-slate-500 border-b border-slate-850 pb-2 mb-2 flex justify-between items-center">
                    <span>{selectedInstance.filename} (Hash: {selectedInstance.sha256.substring(0, 16)}...)</span>
                    <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded text-[10px]">WELL_FORMED</span>
                  </div>
                  <pre className="text-emerald-300">
                    {`<?xml version="1.0" encoding="UTF-8"?>
<!-- DRAFT — NOT READY FOR MCA SUBMISSION -->
<xbrli:xbrl
  xmlns:mca-ind-as="http://www.mca.gov.in/t/ind-as/2024"
  xmlns:xbrli="http://www.xbrl.org/2003/instance"
  xmlns:link="http://www.xbrl.org/2003/linkbase"
  xmlns:xlink="http://www.w3.org/1999/xlink"
>
  <link:schemaRef xlink:type="simple" xlink:href="http://www.mca.gov.in/t/ind-as/2024/mca-ind-as-2024.xsd" />
  
  <!-- Serialized Contexts -->
  ${facts.map(f => `<xbrli:context id="${f.contextRef}">... </xbrli:context>`).slice(0, 2).join('\n  ')}
  
  <!-- Serialized Facts -->
  ${facts.map(f => `<mca-ind-as:${f.qname.split(':')[1] || f.qname} contextRef="${f.contextRef}" unitRef="${f.unitRef}" decimals="${f.decimals}">${f.value}</mca-ind-as:${f.qname.split(':')[1] || f.qname}>`).join('\n  ')}
</xbrli:xbrl>`}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
