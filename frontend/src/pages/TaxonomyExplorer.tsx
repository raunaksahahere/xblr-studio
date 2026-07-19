import React, { useState } from 'react';
import { Search, Folder, ChevronRight, ChevronDown, Tag, Info, BookOpen } from 'lucide-react';

interface TaxonomyNode {
  name: string;
  tag: string;
  type: string;
  balance?: 'debit' | 'credit';
  period: 'instant' | 'duration';
  description: string;
  children?: TaxonomyNode[];
}

const taxonomyTree: TaxonomyNode[] = [
  {
    name: 'Assets',
    tag: 'mca-indas:Assets',
    type: 'xbrli:monetaryItemType',
    balance: 'debit',
    period: 'instant',
    description: 'Total assets belonging to the entity, comprising non-current and current assets.',
    children: [
      {
        name: 'Non-Current Assets',
        tag: 'mca-indas:NonCurrentAssets',
        type: 'xbrli:monetaryItemType',
        balance: 'debit',
        period: 'instant',
        description: 'Assets that are not expected to be realized in, or are not intended for sale or consumption in, the entity\'s normal operating cycle.',
        children: [
          {
            name: 'Property, Plant and Equipment',
            tag: 'mca-indas:PropertyPlantAndEquipment',
            type: 'xbrli:monetaryItemType',
            balance: 'debit',
            period: 'instant',
            description: 'Tangible items held for use in production, supply, rental, or administrative purposes expected to be used for more than one period.'
          },
          {
            name: 'Financial Assets',
            tag: 'mca-indas:FinancialAssetsNonCurrent',
            type: 'xbrli:monetaryItemType',
            balance: 'debit',
            period: 'instant',
            description: 'Non-current financial assets including investments, trade receivables, loans, and other financial balances.'
          }
        ]
      },
      {
        name: 'Current Assets',
        tag: 'mca-indas:CurrentAssets',
        type: 'xbrli:monetaryItemType',
        balance: 'debit',
        period: 'instant',
        description: 'Assets expected to be realized in, or intended for sale or consumption in, the entity\'s normal operating cycle.',
        children: [
          {
            name: 'Inventories',
            tag: 'mca-indas:Inventories',
            type: 'xbrli:monetaryItemType',
            balance: 'debit',
            period: 'instant',
            description: 'Assets held for sale in the ordinary course of business, in the process of production, or in the form of materials/supplies.'
          },
          {
            name: 'Cash and Cash Equivalents',
            tag: 'mca-indas:CashAndCashEquivalents',
            type: 'xbrli:monetaryItemType',
            balance: 'debit',
            period: 'instant',
            description: 'Short-term, highly liquid investments that are readily convertible to known amounts of cash and subject to insignificant risk.'
          }
        ]
      }
    ]
  },
  {
    name: 'Equity and Liabilities',
    tag: 'mca-indas:EquityAndLiabilities',
    type: 'xbrli:monetaryItemType',
    balance: 'credit',
    period: 'instant',
    description: 'Total equity capital and liability obligations of the reporting entity.',
    children: [
      {
        name: 'Equity',
        tag: 'mca-indas:Equity',
        type: 'xbrli:monetaryItemType',
        balance: 'credit',
        period: 'instant',
        description: 'Residual interest in the assets of the entity after deducting all of its liabilities.',
        children: [
          {
            name: 'Share Capital',
            tag: 'mca-indas:ShareCapital',
            type: 'xbrli:monetaryItemType',
            balance: 'credit',
            period: 'instant',
            description: 'The capital contributed by the shareholders of the company at par value.'
          },
          {
            name: 'Other Equity',
            tag: 'mca-indas:OtherEquity',
            type: 'xbrli:monetaryItemType',
            balance: 'credit',
            period: 'instant',
            description: 'Reserves, surplus, retained earnings, share premium, and other capital balance items.'
          }
        ]
      },
      {
        name: 'Liabilities',
        tag: 'mca-indas:Liabilities',
        type: 'xbrli:monetaryItemType',
        balance: 'credit',
        period: 'instant',
        description: 'Present obligations arising from past events, settlement of which is expected to result in outflow of resources.',
        children: [
          {
            name: 'Non-Current Liabilities',
            tag: 'mca-indas:NonCurrentLiabilities',
            type: 'xbrli:monetaryItemType',
            balance: 'credit',
            period: 'instant',
            description: 'Long-term borrowings, trade payables, and provisions that fall due beyond 12 months.'
          },
          {
            name: 'Current Liabilities',
            tag: 'mca-indas:CurrentLiabilities',
            type: 'xbrli:monetaryItemType',
            balance: 'credit',
            period: 'instant',
            description: 'Short-term obligations, borrowings, trade payables, and provisions falling due within 12 months.'
          }
        ]
      }
    ]
  }
];

export default function TaxonomyExplorer() {
  const [search, setSearch] = useState('');
  const [selectedNode, setSelectedNode] = useState<TaxonomyNode | null>(taxonomyTree[0]);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    'mca-indas:Assets': true,
    'mca-indas:EquityAndLiabilities': true
  });

  const toggleExpand = (tag: string) => {
    setExpandedNodes(prev => ({ ...prev, [tag]: !prev[tag] }));
  };

  const renderTree = (nodes: TaxonomyNode[], depth = 0) => {
    return nodes.map(node => {
      const hasChildren = node.children && node.children.length > 0;
      const isExpanded = !!expandedNodes[node.tag];
      const isSelected = selectedNode?.tag === node.tag;

      // Filter logic
      if (search && !node.name.toLowerCase().includes(search.toLowerCase()) && !node.tag.toLowerCase().includes(search.toLowerCase())) {
        if (!hasChildren) return null;
        // Check if any child matches
        const childMatches = node.children?.some(c => c.name.toLowerCase().includes(search.toLowerCase()));
        if (!childMatches) return null;
      }

      return (
        <div key={node.tag} style={{ paddingLeft: `${depth * 14}px` }} className="space-y-1.5">
          <div 
            onClick={() => setSelectedNode(node)}
            className={`flex items-center space-x-2 py-1.5 px-3 rounded-lg cursor-pointer transition text-xs ${
              isSelected ? 'bg-blue-600/10 border border-blue-500/20 text-white' : 'hover:bg-slate-900 border border-transparent text-slate-300'
            }`}
          >
            {hasChildren ? (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(node.tag);
                }}
                className="p-0.5 hover:bg-slate-800 rounded"
              >
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            ) : (
              <span className="w-4 h-4 flex items-center justify-center">
                <Tag className="w-3 h-3 text-slate-500" />
              </span>
            )}
            <Folder className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-semibold truncate">{node.name}</span>
          </div>

          {hasChildren && isExpanded && (
            <div className="space-y-1.5">
              {renderTree(node.children!, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-73px)] overflow-hidden w-full max-w-7xl mx-auto p-6 space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-white flex items-center space-x-2">
          <BookOpen className="w-5 h-5 text-blue-400" />
          <span>Interactive MCA Taxonomy Explorer</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Browse Schedule III and IndAS taxonomy schemas, period attributes, and calculation relationships.
        </p>
      </div>

      {/* Main split dashboard view */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden">
        {/* Left Side: Tree browser */}
        <div className="md:col-span-2 rounded-2xl border border-slate-900 bg-slate-950/40 p-4 shadow-md backdrop-blur-sm flex flex-col overflow-hidden">
          <div className="relative mb-4">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search taxonomy tags or descriptions..."
              className="w-full bg-slate-900/60 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-xs text-slate-200 focus:outline-none focus:border-blue-500/50 transition-all placeholder-slate-600"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {renderTree(taxonomyTree)}
          </div>
        </div>

        {/* Right Side: Element Inspector Detail */}
        <div className="rounded-2xl border border-slate-900 bg-slate-950/40 p-5 shadow-md backdrop-blur-sm flex flex-col overflow-hidden">
          {selectedNode ? (
            <div className="space-y-5 h-full overflow-y-auto">
              <div className="border-b border-slate-900 pb-3">
                <span className="text-[10px] font-mono bg-blue-950 text-blue-400 border border-blue-800/80 px-2 py-0.5 rounded uppercase font-bold tracking-wide">
                  {selectedNode.type.split(':').pop()}
                </span>
                <h2 className="text-sm font-bold text-white mt-2">{selectedNode.name}</h2>
                <p className="text-xs text-slate-500 font-mono mt-1 break-all select-all">{selectedNode.tag}</p>
              </div>

              {/* Attributes grid */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-900/30 border border-slate-900 p-3.5 rounded-xl">
                <div>
                  <span className="text-slate-500 block">Balance Direction</span>
                  <span className="font-bold text-slate-200 capitalize font-mono">{selectedNode.balance || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Period Context</span>
                  <span className="font-bold text-slate-200 capitalize font-mono">{selectedNode.period}</span>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                  <Info className="w-3.5 h-3.5 text-blue-400" />
                  <span>Documentation Description</span>
                </span>
                <p className="text-xs text-slate-400 leading-relaxed bg-slate-900/10 border border-slate-900/40 p-3 rounded-lg">
                  {selectedNode.description}
                </p>
              </div>

              {/* Calculation validation block */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-300">Validation & Hypercube Rules</span>
                <div className="bg-blue-950/10 border border-blue-900/30 p-3 rounded-lg text-[10px] space-y-1 font-mono text-slate-400">
                  <p>✔ Must be a valid calculation component for total assets statement.</p>
                  <p>✔ Requires currency ISO standard mapping references.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-xs">
              Select an element from the explorer tree to view details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
