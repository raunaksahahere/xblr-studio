import React, { useState, useEffect } from 'react';
import { Network, Database, Tag, ShieldAlert, Cpu, Eye, Search } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

interface GraphNode {
  id: string;
  label: string;
  type: string;
  x: number;
  y: number;
  metadata?: any;
}

interface GraphLink {
  source: string;
  target: string;
  relation: string;
}

export default function KnowledgeGraphView() {
  const { accessToken } = useAuthStore();
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const companyId = "c1b2f345-6789-abcd-ef01-23456789abcd"; // Default seeded company

  const fetchGraphData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/graph/neighborhood?companyId=${companyId}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const data = await res.json();
      if (res.ok) {
        // Lay out nodes in a beautiful circle/radial layout
        const center = { x: 250, y: 200 };
        const radius = 150;
        const mappedNodes = data.nodes.map((node: any, idx: number) => {
          if (node.type === 'COMPANY') {
            return { ...node, x: center.x, y: center.y };
          }
          const angle = (idx / (data.nodes.length - 1)) * 2 * Math.PI;
          return {
            ...node,
            x: center.x + radius * Math.cos(angle),
            y: center.y + radius * Math.sin(angle)
          };
        });

        setNodes(mappedNodes);
        setLinks(data.edges);
        if (mappedNodes.length > 0) {
          setSelectedNode(mappedNodes[0]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraphData();
  }, [companyId]);

  const filteredNodes = nodes.filter(n => 
    n.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-73px)] overflow-hidden w-full max-w-7xl mx-auto p-6 space-y-6 bg-slate-950">
      
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-white flex items-center space-x-2">
          <Network className="w-5 h-5 text-indigo-400" />
          <span>Interactive Entity Knowledge Graph</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Explore relational graphs mapping company parameters, audit files, and extracted financial facts.
        </p>
      </div>

      {/* Main Graph & Info Panel */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden">
        
        {/* SVG Node Canvas */}
        <div className="md:col-span-2 rounded-2xl border border-slate-900 bg-slate-950/40 p-4 shadow-md backdrop-blur-sm flex items-center justify-center relative overflow-hidden">
          {loading ? (
            <div className="text-xs text-slate-500 font-mono">Loading active graph neighborhood...</div>
          ) : (
            <svg className="w-full h-full min-h-[400px]" viewBox="0 0 500 400">
              {/* Draw Links */}
              {links.map((link, idx) => {
                const srcNode = nodes.find(n => n.id === link.source);
                const tgtNode = nodes.find(n => n.id === link.target);
                if (!srcNode || !tgtNode) return null;

                return (
                  <g key={idx} className="opacity-40">
                    <line 
                      x1={srcNode.x} 
                      y1={srcNode.y} 
                      x2={tgtNode.x} 
                      y2={tgtNode.y} 
                      stroke="rgba(99, 102, 241, 0.4)" 
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                    />
                    <text 
                      x={(srcNode.x + tgtNode.x) / 2} 
                      y={(srcNode.y + tgtNode.y) / 2 - 5}
                      fill="#6b7280"
                      fontSize={7}
                      textAnchor="middle"
                      className="font-mono"
                    >
                      {link.relation}
                    </text>
                  </g>
                );
              })}

              {/* Draw Nodes */}
              {filteredNodes.map((node) => {
                const isSelected = selectedNode?.id === node.id;
                
                let color = '#3b82f6'; // COMPANY
                if (node.type === 'DOCUMENT') color = '#a855f7';
                if (node.type === 'FACT') color = '#10b981';

                return (
                  <g 
                    key={node.id}
                    onClick={() => setSelectedNode(node)}
                    className="cursor-pointer group"
                  >
                    <circle 
                      cx={node.x} 
                      cy={node.y} 
                      r={isSelected ? 10 : 7} 
                      fill={color}
                      className="transition-all duration-300 group-hover:scale-125"
                    />
                    <text 
                      x={node.x} 
                      y={node.y - 12}
                      fill="#94a3b8"
                      fontSize={8}
                      textAnchor="middle"
                      className="font-semibold select-none pointer-events-none"
                    >
                      {node.label.length > 20 ? `${node.label.slice(0, 17)}...` : node.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}
        </div>

        {/* Right Info Inspector Panel */}
        <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-5 flex flex-col justify-between overflow-hidden">
          <div className="space-y-4 overflow-y-auto">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Database className="w-4 h-4 text-indigo-400" />
              <span>Node Inspector</span>
            </h3>

            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search graph nodes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-900 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none"
              />
            </div>

            {selectedNode ? (
              <div className="space-y-3.5 border-t border-slate-900 pt-4">
                <div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Node Type</span>
                  <p className="text-xs font-mono text-indigo-400 mt-0.5">{selectedNode.type}</p>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Label</span>
                  <p className="text-xs font-semibold text-white mt-0.5">{selectedNode.label}</p>
                </div>
                {selectedNode.metadata && (
                  <div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Metadata Properties</span>
                    <pre className="text-[10px] font-mono text-slate-400 mt-1 bg-slate-950 p-2.5 rounded-lg border border-slate-900/60 overflow-x-auto">
                      {JSON.stringify(selectedNode.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500">Select any node on the graph canvas to inspect its parameters.</p>
            )}
          </div>

          {selectedNode && (
            <div className="border-t border-slate-900 pt-4">
              <button 
                onClick={() => alert(`Tracing paths connected to: ${selectedNode.label}`)}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2 rounded-xl transition flex items-center justify-center space-x-1.5"
              >
                <Eye className="w-4 h-4" />
                <span>Trace Connections Path</span>
              </button>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
