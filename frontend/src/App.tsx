import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useProjectStore } from './store/projectStore';

// Existing Pages
import Login from './pages/Login';
import Dashboards from './pages/Dashboards';
import ReviewWorkspace from './pages/ReviewWorkspace';
import AIProcessing from './pages/AIProcessing';
import TaxonomyExplorer from './pages/TaxonomyExplorer';
import KnowledgeGraphView from './pages/KnowledgeGraphView';
import AuditTrail from './pages/AuditTrail';
import FinancialIntelligence from './pages/FinancialIntelligence';
import TaxonomyMapping from './pages/TaxonomyMapping';

// New Phase 4 connected sidebar Pages
import Companies from './pages/Companies';
import Projects from './pages/Projects';
import UploadCenter from './pages/UploadCenter';
import ValidationCenter from './pages/ValidationCenter';
import CompanyMemory from './pages/CompanyMemory';
import XmlGenerator from './pages/XmlGenerator';
import HumanPdf from './pages/HumanPdf';
import Reports from './pages/Reports';
import VersionHistory from './pages/VersionHistory';
import ClientPortal from './pages/ClientPortal';
import Administration from './pages/Administration';
import Settings from './pages/Settings';

import {
  LogOut, Bell, Database, Terminal, Shield, FolderOpen, Layers, Network,
  FileCode, Cpu, Building2, Briefcase, FileUp, ShieldAlert, BrainCircuit,
  Printer, BarChart3, History, User, Sliders
} from 'lucide-react';

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

const NavigationLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, logout } = useAuthStore();
  const { activeProjectId } = useProjectStore();

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-100 font-sans w-full">
      {/* Premium Sidebar Shell */}
      <aside className="w-64 bg-slate-950 border-r border-slate-900 flex flex-col justify-between shrink-0 h-screen overflow-y-auto">
        <div className="p-4 flex flex-col space-y-6">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-650/20 border border-indigo-500/30 w-8 h-8 rounded-lg flex items-center justify-center">
              <Database className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="leading-none">
              <span className="font-bold text-xs tracking-wider block text-white">AI XBRL STUDIO</span>
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5 block">ENTERPRISE</span>
            </div>
          </div>

          {/* Active project card indicator */}
          <div className="bg-slate-900/40 border border-slate-850 p-3 rounded-lg space-y-1.5">
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Active Project Context</span>
            <div className="text-xs font-semibold text-white truncate">
              {activeProjectId ? `Project: ${activeProjectId.slice(0, 8)}...` : 'No Active Project'}
            </div>
          </div>

          <nav className="flex flex-col space-y-0.5">
            <Link to="/dashboard" className="flex items-center space-x-2.5 px-3 py-1.5 rounded text-xs font-semibold hover:bg-slate-900/60 hover:text-white transition text-slate-400">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span>Dashboard</span>
            </Link>
            <Link to="/companies" className="flex items-center space-x-2.5 px-3 py-1.5 rounded text-xs font-semibold hover:bg-slate-900/60 hover:text-white transition text-slate-400">
              <Building2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Companies</span>
            </Link>
            <Link to="/projects" className="flex items-center space-x-2.5 px-3 py-1.5 rounded text-xs font-semibold hover:bg-slate-900/60 hover:text-white transition text-slate-400">
              <Briefcase className="w-3.5 h-3.5 text-cyan-400" />
              <span>Projects</span>
            </Link>
            <Link to="/upload-center" className="flex items-center space-x-2.5 px-3 py-1.5 rounded text-xs font-semibold hover:bg-slate-900/60 hover:text-white transition text-slate-400">
              <FileUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>Upload Center</span>
            </Link>

            {activeProjectId && (
              <>
                <Link to={`/project/${activeProjectId}/processing`} className="flex items-center space-x-2.5 px-3 py-1.5 rounded text-xs font-semibold hover:bg-slate-900/60 hover:text-white transition text-slate-400">
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                  <span>AI Processing</span>
                </Link>
                <Link to={`/project/${activeProjectId}/review`} className="flex items-center space-x-2.5 px-3 py-1.5 rounded text-xs font-semibold hover:bg-slate-900/60 hover:text-white transition text-slate-400">
                  <FileCode className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Review Workspace</span>
                </Link>
                <Link to={`/project/${activeProjectId}/financial-intelligence`} className="flex items-center space-x-2.5 px-3 py-1.5 rounded text-xs font-semibold hover:bg-slate-900/60 hover:text-white transition text-slate-400">
                  <Cpu className="w-3.5 h-3.5 text-purple-400" />
                  <span>Financial Engine</span>
                </Link>
                <Link to={`/project/${activeProjectId}/taxonomy-mapping`} className="flex items-center space-x-2.5 px-3 py-1.5 rounded text-xs font-semibold hover:bg-slate-900/60 hover:text-white transition text-slate-400">
                  <Network className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Taxonomy Mapping</span>
                </Link>
              </>
            )}

            <Link to="/validation-center" className="flex items-center space-x-2.5 px-3 py-1.5 rounded text-xs font-semibold hover:bg-slate-900/60 hover:text-white transition text-slate-400">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>Validation Center</span>
            </Link>
            <Link to="/taxonomy" className="flex items-center space-x-2.5 px-3 py-1.5 rounded text-xs font-semibold hover:bg-slate-900/60 hover:text-white transition text-slate-400">
              <FolderOpen className="w-3.5 h-3.5 text-indigo-400" />
              <span>Taxonomy Explorer</span>
            </Link>
            <Link to="/graph" className="flex items-center space-x-2.5 px-3 py-1.5 rounded text-xs font-semibold hover:bg-slate-900/60 hover:text-white transition text-slate-400">
              <Network className="w-3.5 h-3.5 text-purple-400" />
              <span>Knowledge Graph</span>
            </Link>
            <Link to="/company-memory" className="flex items-center space-x-2.5 px-3 py-1.5 rounded text-xs font-semibold hover:bg-slate-900/60 hover:text-white transition text-slate-400">
              <BrainCircuit className="w-3.5 h-3.5 text-pink-400" />
              <span>Company Memory</span>
            </Link>
            <Link to="/xml-generator" className="flex items-center space-x-2.5 px-3 py-1.5 rounded text-xs font-semibold hover:bg-slate-900/60 hover:text-white transition text-slate-400">
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              <span>XML Generator</span>
            </Link>
            <Link to="/human-pdf" className="flex items-center space-x-2.5 px-3 py-1.5 rounded text-xs font-semibold hover:bg-slate-900/60 hover:text-white transition text-slate-400">
              <Printer className="w-3.5 h-3.5 text-sky-400" />
              <span>Human PDF</span>
            </Link>
            <Link to="/reports" className="flex items-center space-x-2.5 px-3 py-1.5 rounded text-xs font-semibold hover:bg-slate-900/60 hover:text-white transition text-slate-400">
              <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
              <span>Reports</span>
            </Link>
            <Link to="/audits" className="flex items-center space-x-2.5 px-3 py-1.5 rounded text-xs font-semibold hover:bg-slate-900/60 hover:text-white transition text-slate-400">
              <Shield className="w-3.5 h-3.5 text-red-400" />
              <span>Audit Timeline</span>
            </Link>
            <Link to="/version-history" className="flex items-center space-x-2.5 px-3 py-1.5 rounded text-xs font-semibold hover:bg-slate-900/60 hover:text-white transition text-slate-400">
              <History className="w-3.5 h-3.5 text-yellow-400" />
              <span>Version History</span>
            </Link>
            <Link to="/client-portal" className="flex items-center space-x-2.5 px-3 py-1.5 rounded text-xs font-semibold hover:bg-slate-900/60 hover:text-white transition text-slate-400">
              <User className="w-3.5 h-3.5 text-orange-400" />
              <span>Client Portal</span>
            </Link>
            <Link to="/administration" className="flex items-center space-x-2.5 px-3 py-1.5 rounded text-xs font-semibold hover:bg-slate-900/60 hover:text-white transition text-slate-400">
              <Shield className="w-3.5 h-3.5 text-slate-400" />
              <span>Administration</span>
            </Link>
            <Link to="/settings" className="flex items-center space-x-2.5 px-3 py-1.5 rounded text-xs font-semibold hover:bg-slate-900/60 hover:text-white transition text-slate-400">
              <Sliders className="w-3.5 h-3.5 text-slate-400" />
              <span>Settings</span>
            </Link>
          </nav>
        </div>

        {/* User Card */}
        <div className="p-4 border-t border-slate-900 flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-200 truncate">{user?.email}</p>
            <p className="text-[9px] text-slate-500 font-mono uppercase truncate">{user?.role}</p>
          </div>
          <button
            onClick={logout}
            className="p-1.5 hover:bg-red-950/20 text-slate-400 hover:text-red-400 rounded-lg transition"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col overflow-hidden h-screen">
        <header className="h-[73px] bg-slate-950/40 border-b border-slate-900 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-6">
            <div className="text-xs text-slate-400 flex items-center space-x-1.5 border-r border-slate-800 pr-6">
              <Shield className="w-4 h-4 text-purple-400" />
              <span>Firm ID: {user?.organizationName}</span>
            </div>
            
            {activeProjectId && (
              <div className="flex items-center space-x-4 text-xs font-semibold text-slate-400">
                <Link to={`/project/${activeProjectId}/processing`} className="hover:text-white transition">OVERVIEW</Link>
                <Link to="/upload-center" className="hover:text-white transition">DOCUMENTS</Link>
                <Link to={`/project/${activeProjectId}/financial-intelligence`} className="hover:text-white transition">FINANCIALS</Link>
                <Link to={`/project/${activeProjectId}/taxonomy-mapping`} className="hover:text-white transition">TAXONOMY</Link>
                <Link to="/validation-center" className="hover:text-white transition">VALIDATION</Link>
                <Link to={`/project/${activeProjectId}/review`} className="hover:text-white transition">REVIEW</Link>
                <Link to="/xml-generator" className="hover:text-white text-indigo-400 transition">OUTPUTS</Link>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <button className="relative p-2 rounded-full hover:bg-slate-800/50 text-slate-400 hover:text-white transition">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-slate-950 flex flex-col">
          {children}
        </main>
      </div>
    </div>
  );
};

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />}
        />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <NavigationLayout>
                <Dashboards />
              </NavigationLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/companies"
          element={
            <PrivateRoute>
              <NavigationLayout>
                <Companies />
              </NavigationLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/projects"
          element={
            <PrivateRoute>
              <NavigationLayout>
                <Projects />
              </NavigationLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/upload-center"
          element={
            <PrivateRoute>
              <NavigationLayout>
                <UploadCenter />
              </NavigationLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/project/:id/review"
          element={
            <PrivateRoute>
              <NavigationLayout>
                <ReviewWorkspace />
              </NavigationLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/project/:id/financial-intelligence"
          element={
            <PrivateRoute>
              <NavigationLayout>
                <FinancialIntelligence />
              </NavigationLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/project/:id/taxonomy-mapping"
          element={
            <PrivateRoute>
              <NavigationLayout>
                <TaxonomyMapping />
              </NavigationLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/project/:id/processing"
          element={
            <PrivateRoute>
              <NavigationLayout>
                <AIProcessing />
              </NavigationLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/validation-center"
          element={
            <PrivateRoute>
              <NavigationLayout>
                <ValidationCenter />
              </NavigationLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/taxonomy"
          element={
            <PrivateRoute>
              <NavigationLayout>
                <TaxonomyExplorer />
              </NavigationLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/graph"
          element={
            <PrivateRoute>
              <NavigationLayout>
                <KnowledgeGraphView />
              </NavigationLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/company-memory"
          element={
            <PrivateRoute>
              <NavigationLayout>
                <CompanyMemory />
              </NavigationLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/xml-generator"
          element={
            <PrivateRoute>
              <NavigationLayout>
                <XmlGenerator />
              </NavigationLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/human-pdf"
          element={
            <PrivateRoute>
              <NavigationLayout>
                <HumanPdf />
              </NavigationLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <PrivateRoute>
              <NavigationLayout>
                <Reports />
              </NavigationLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/audits"
          element={
            <PrivateRoute>
              <NavigationLayout>
                <AuditTrail />
              </NavigationLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/version-history"
          element={
            <PrivateRoute>
              <NavigationLayout>
                <VersionHistory />
              </NavigationLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/client-portal"
          element={
            <PrivateRoute>
              <NavigationLayout>
                <ClientPortal />
              </NavigationLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/administration"
          element={
            <PrivateRoute>
              <NavigationLayout>
                <Administration />
              </NavigationLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <PrivateRoute>
              <NavigationLayout>
                <Settings />
              </NavigationLayout>
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
