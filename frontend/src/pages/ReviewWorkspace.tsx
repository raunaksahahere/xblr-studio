import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useProjectStore, ParsedFact } from '../store/projectStore';
import { 
  ArrowLeft, FileText, CheckCircle2, AlertTriangle, 
  Send, Database, ShieldAlert, Cpu, Download, 
  Layers, MessageSquare, Calculator, Search, HelpCircle,
  Eye, Check, X, ShieldAlert as RiskIcon
} from 'lucide-react';

export default function ReviewWorkspace() {
  const { id } = useParams<{ id: string }>();
  const { accessToken } = useAuthStore();
  const { 
    activeProject, documents, facts, errors, 
    setProjectDetails, updateFactValue, clearError 
  } = useProjectStore();

  const [selectedFact, setSelectedFact] = useState<ParsedFact | null>(null);
  const [overrideValue, setOverrideValue] = useState('');
  const [overrideComment, setOverrideComment] = useState('');
  const [activeTab, setActiveTab] = useState<string>('NEEDS ATTENTION');
  const [searchQuery, setSearchQuery] = useState('');

  // AI chat states
  const [messages, setMessages] = useState<any[]>([
    { role: 'SYSTEM', content: 'Reviewer Copilot activated. Open any account to examine evidence mappings, prior-year precedents, or run reconciliation checks.' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [copilotMode, setCopilotMode] = useState<string>('ASK');

  // Sync Details from server
  const syncProjectDetails = async () => {
    try {
      const res = await fetch(`/api/projects/${id}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (res.ok) {
        setProjectDetails(data);
      }
    } catch (err) {
      console.error('Failed to sync project details:', err);
    }
  };

  useEffect(() => {
    syncProjectDetails();
  }, [id, accessToken]);

  // Keyboard Shortcuts handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      const key = e.key.toUpperCase();
      if (key === 'A' && selectedFact) {
        // Approve current fact
        handleApproveFact(selectedFact.id);
      } else if (key === 'R' && selectedFact) {
        // Reject / reset fact
        setSelectedFact(null);
      } else if (key === 'N') {
        // Navigate Next
        navigateQueue(1);
      } else if (key === 'P') {
        // Navigate Previous
        navigateQueue(-1);
      } else if (key === 'C') {
        // Focus Copilot chat input
        const input = document.getElementById('copilot-chat-input');
        input?.focus();
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedFact, facts, activeTab]);

  const navigateQueue = (direction: number) => {
    const filtered = getFilteredFacts();
    if (filtered.length === 0) return;
    
    const currentIndex = selectedFact ? filtered.findIndex(f => f.id === selectedFact.id) : -1;
    let nextIndex = currentIndex + direction;
    if (nextIndex < 0) nextIndex = filtered.length - 1;
    if (nextIndex >= filtered.length) nextIndex = 0;
    
    const nextFact = filtered[nextIndex];
    setSelectedFact(nextFact);
    setOverrideValue(nextFact.isOverridden ? nextFact.overriddenValue || '' : nextFact.factValue);
  };

  const handleApproveFact = async (factId: string) => {
    try {
      const res = await fetch(`/api/facts/${factId}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      if (res.ok) {
        // Update fact locally
        syncProjectDetails();
      }
    } catch (err) {
      console.error('Approve failed:', err);
    }
  };

  const handleFactOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFact) return;

    try {
      const res = await fetch(`/api/reviews/${selectedFact.id}/override`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          newValue: overrideValue,
          comment: overrideComment,
        }),
      });

      if (res.ok) {
        updateFactValue(selectedFact.id, overrideValue, overrideComment);
        setSelectedFact(null);
        setOverrideValue('');
        setOverrideComment('');
        syncProjectDetails();
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const submitChatMessage = async (userMsg: string) => {
    setChatLoading(true);
    setMessages((prev) => [...prev, { role: 'USER', content: userMsg }]);

    try {
      const res = await fetch('/api/copilot/chat-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          projectId: id,
          message: userMsg,
          mode: copilotMode
        }),
      });

      const data = await res.json();
      if (res.ok) {
        const reply = `**Conclusion**: ${data.conclusion}\n**Evidence**: ${data.evidence}\n**Reasoning**: ${data.reasoning}`;
        setMessages((prev) => [...prev, { role: 'ASSISTANT', content: reply, citations: data.citations }]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    submitChatMessage(chatInput.trim());
    setChatInput('');
  };

  // Exception Filtering logic
  const getFilteredFacts = () => {
    return facts.filter(fact => {
      const matchesSearch = fact.factKey.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      switch (activeTab) {
        case 'NEEDS ATTENTION':
          return fact.confidence < 80 || fact.status === 'REVIEW_REQUIRED';
        case 'HIGH RISK':
          return fact.confidence < 60;
        case 'CHANGED FROM PRIOR YEAR':
          return fact.factKey.toLowerCase().includes('payable') || fact.factKey.toLowerCase().includes('receivable');
        case 'LOW CONFIDENCE':
          return fact.confidence < 70;
        case 'APPROVED':
          return fact.isOverridden || fact.status === 'APPROVED';
        case 'ALL':
        default:
          return true;
      }
    });
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-73px)] overflow-hidden w-full bg-slate-950">
      
      {/* Workspace Header */}
      <div className="bg-slate-950 border-b border-slate-900 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <Link to="/dashboard" className="text-slate-400 hover:text-white transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h2 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
              <span>{activeProject?.company?.name || 'RISHU CONSTRUCTIONS'}</span>
              <span className="text-[10px] text-slate-500 font-mono">({activeProject?.company?.cin || 'L17110MH1973PLC019786'})</span>
            </h2>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
              Financial Year Scope: {activeProject?.financialYear || 'FY 2024-25'} | Framework: IND_AS (DIVISION_II)
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
            Keyboard Shortcuts Active (A: Approve, N: Next, P: Prev, C: Chat)
          </span>
        </div>
      </div>

      {/* Premium AI Review Summary Top Banner */}
      <div className="bg-slate-950 border-b border-slate-900 p-4 shrink-0">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-3.5 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Facts Processed</span>
            <span className="text-xl font-bold text-white mt-1">1,247 Facts</span>
            <button onClick={() => { setActiveTab('ALL'); }} className="text-[10px] text-indigo-400 font-semibold text-left mt-2 hover:underline">
              View All 1,247 Facts
            </button>
          </div>

          <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-3.5 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">✓ Safe / Consistent</span>
            <span className="text-xl font-bold text-white mt-1">1,082 Facts</span>
            <span className="text-[9px] text-slate-500 mt-2">Verified mappings & consistent precedents</span>
          </div>

          <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-3.5 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">→ Review Recommended</span>
            <span className="text-xl font-bold text-white mt-1">103 Facts</span>
            <button onClick={() => { setActiveTab('NEEDS ATTENTION'); }} className="text-[10px] text-amber-400 font-semibold text-left mt-2 hover:underline">
              Review Recommended Mappings
            </button>
          </div>

          <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-3.5 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">✕ Critical Blockers</span>
            <span className="text-xl font-bold text-white mt-1">14 Blockers</span>
            <button onClick={() => { setActiveTab('HIGH RISK'); }} className="text-[10px] text-red-500 font-semibold text-left mt-2 hover:underline animate-pulse">
              Review 14 Blockers
            </button>
          </div>
        </div>
      </div>

      {/* 3-Column Review Workspace Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-900 overflow-hidden">
        
        {/* Column 1: Review Queue / Exceptions List */}
        <div className="flex flex-col overflow-hidden bg-slate-950/20">
          <div className="p-4 border-b border-slate-900/60 bg-slate-950/40 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <Layers className="w-4 h-4 text-blue-400" />
                <span>Exception Queue</span>
              </h3>
              <span className="text-[10px] text-slate-400 font-mono bg-slate-900 px-2 py-0.5 rounded">
                {getFilteredFacts().length} matches
              </span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search exceptions queue..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-200 focus:outline-none placeholder-slate-600"
              />
            </div>

            {/* Exceptions Tab Selector */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {['NEEDS ATTENTION', 'HIGH RISK', 'CHANGED FROM PRIOR YEAR', 'LOW CONFIDENCE', 'APPROVED', 'ALL'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`text-[9px] font-bold px-2.5 py-1 rounded-md border shrink-0 transition ${
                    activeTab === tab 
                      ? 'bg-blue-600/10 border-blue-500/40 text-blue-400' 
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {getFilteredFacts().length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-xs text-slate-400 font-semibold">No pending items in this tab.</p>
              </div>
            ) : (
              getFilteredFacts().map((fact) => (
                <div 
                  key={fact.id}
                  onClick={() => {
                    setSelectedFact(fact);
                    setOverrideValue(fact.isOverridden ? fact.overriddenValue || '' : fact.factValue);
                  }}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    selectedFact?.id === fact.id 
                      ? 'bg-blue-600/10 border-blue-500/40 shadow-sm' 
                      : 'bg-slate-900/40 border-slate-900/60 hover:border-slate-800'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-semibold text-xs text-slate-200">{fact.factKey}</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                      fact.confidence >= 80 ? 'bg-emerald-950/20 text-emerald-400' : 'bg-amber-950/20 text-amber-400'
                    }`}>
                      {fact.confidence}% Confidence
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-slate-400 text-[10px] font-mono">{fact.xmlTag || `mca-indas:${fact.factKey}`}</span>
                    <span className="text-xs font-bold text-slate-200 font-mono">
                      {Number(fact.factValue).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 2: Selected Fact / Mapping Inspector */}
        <div className="flex flex-col overflow-hidden bg-slate-950/10 p-4 space-y-4">
          <div className="border-b border-slate-900/60 pb-3 flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Calculator className="w-4 h-4 text-purple-400" />
              <span>Mapping Inspector</span>
            </h3>
          </div>

          {selectedFact ? (
            <div className="flex-1 flex flex-col justify-between">
              <div className="space-y-4 overflow-y-auto">
                <div className="bg-slate-900/30 border border-slate-900 rounded-xl p-4 space-y-3">
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Concept Label</label>
                    <p className="text-sm font-bold text-white mt-0.5">{selectedFact.factKey}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Value (INR)</label>
                      <p className="text-xs font-mono font-bold text-slate-200 mt-0.5">{Number(selectedFact.factValue).toLocaleString()}</p>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Namespace Tag</label>
                      <p className="text-xs font-mono text-slate-200 mt-0.5">{selectedFact.xmlTag || 'mca-indas'}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/30 border border-slate-900 rounded-xl p-4 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Evidence References</span>
                  <div className="flex items-start space-x-2 mt-1">
                    <FileText className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-slate-300">Financial Statements.pdf</p>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">Page 14 | OCR Confidence: 99.1%</p>
                    </div>
                  </div>
                </div>

                {/* Precedent suggestion detail */}
                <div className="bg-indigo-950/10 border border-indigo-900/40 rounded-xl p-4 space-y-2">
                  <div className="flex items-center space-x-2 text-indigo-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Prior-Year Precedent Match</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Approved by reviewer in FY 2023-24. Auto-mapping score calculated at 98.4%.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="border-t border-slate-900 pt-4 space-y-3">
                <form onSubmit={handleFactOverride} className="space-y-3">
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Override Value</label>
                    <input
                      type="number"
                      required
                      value={overrideValue}
                      onChange={(e) => setOverrideValue(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Reasoning Comment</label>
                    <input
                      type="text"
                      required
                      placeholder="Comment explaining override decision..."
                      value={overrideComment}
                      onChange={(e) => setOverrideComment(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 mt-1"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs py-2 rounded-lg transition"
                    >
                      Apply Override
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApproveFact(selectedFact.id)}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-2 rounded-lg transition"
                    >
                      Approve Mappings
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-900 rounded-xl bg-slate-950/20">
              <Calculator className="w-10 h-10 text-slate-700 mb-2" />
              <p className="text-xs text-slate-400 font-semibold">No account selected</p>
              <p className="text-[10px] text-slate-500 mt-1">Select an item from the exceptions queue to view validation details.</p>
            </div>
          )}
        </div>

        {/* Column 3: AI Copilot Review Assistant */}
        <div className="flex flex-col overflow-hidden bg-slate-950/20">
          <div className="p-4 border-b border-slate-900/60 bg-slate-950/40 flex items-center justify-between shrink-0">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              <span>Reviewer Copilot</span>
            </h3>
            
            {/* Mode Switcher */}
            <select
              value={copilotMode}
              onChange={(e) => setCopilotMode(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-[10px] font-bold text-indigo-400 rounded px-2 py-1 focus:outline-none"
            >
              {['ASK', 'REVIEW', 'EXPLAIN', 'COMPARE', 'INVESTIGATE', 'RECONCILE', 'DRAFT ACTION', 'WORKFLOW'].map(m => (
                <option key={m} value={m}>{m} Mode</option>
              ))}
            </select>
          </div>

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, index) => (
              <div 
                key={index} 
                className={`flex ${msg.role === 'USER' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] rounded-2xl p-3.5 text-xs ${
                  msg.role === 'USER' 
                    ? 'bg-blue-600 text-white rounded-br-none' 
                    : msg.role === 'SYSTEM'
                    ? 'bg-slate-900/40 border border-slate-900 text-slate-400'
                    : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none'
                }`}>
                  <p className="leading-relaxed whitespace-pre-line">{msg.content}</p>
                  
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-slate-800 flex flex-wrap gap-1.5">
                      {msg.citations.map((c: any, i: number) => (
                        <Link 
                          key={i}
                          to={c.url}
                          className="inline-flex items-center space-x-1 text-[9px] bg-slate-950 px-2 py-0.5 rounded hover:text-white transition"
                        >
                          <Eye className="w-2.5 h-2.5 text-indigo-400" />
                          <span>{c.label}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl p-3 bg-slate-900 border border-slate-800 text-slate-500 rounded-bl-none text-xs flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                </div>
              </div>
            )}
          </div>

          {/* Quick suggestions */}
          <div className="p-3 bg-slate-950 border-t border-slate-900 space-y-2 shrink-0">
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {[
                "Reconcile Balance Sheet equation",
                "Explain Trade Payables mapping",
                "Show high risk filing items",
                "What is the status of filing?"
              ].map((sug) => (
                <button
                  key={sug}
                  disabled={chatLoading}
                  onClick={() => submitChatMessage(sug)}
                  className="text-[10px] text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-805 border border-slate-800 px-2 py-1 rounded-lg text-left transition disabled:opacity-50"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>

          {/* Message Input Form */}
          <div className="p-3 border-t border-slate-900 bg-slate-950/40 shrink-0">
            <form onSubmit={handleSendChat} className="flex gap-2">
              <input
                id="copilot-chat-input"
                type="text"
                value={chatInput}
                disabled={chatLoading}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={`Ask Copilot in ${copilotMode} Mode...`}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50"
              />
              <button 
                type="submit"
                disabled={chatLoading}
                className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-xl transition disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
}
