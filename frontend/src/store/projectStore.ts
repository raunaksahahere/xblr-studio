import { create } from 'zustand';

export interface ProjectDocument {
  id: string;
  name: string;
  fileType: string;
  fileSize: number;
  status: 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'FAILED';
  uploadedById: string;
  createdAt: string;
  updatedAt: string;
  documentClass?: string;
  periodScope?: string;
}

export interface ParsedFact {
  id: string;
  factKey: string;
  factValue: string;
  unit: string;
  period: string;
  confidence: number;
  xmlTag: string;
  isOverridden: boolean;
  overriddenValue?: string;
  status?: string;
  mappings: Array<{
    id: string;
    elementId: string;
    elementName: string;
    taxonomyType: string;
    confidence: number;
  }>;
}

export interface ValidationError {
  id: string;
  errorCode: string;
  message: string;
  severity: 'ERROR' | 'WARNING' | 'INFO';
  isCleared: boolean;
}

export interface ProjectState {
  activeProjectId: string | null;
  activeProject: any | null;
  documents: ProjectDocument[];
  facts: ParsedFact[];
  errors: ValidationError[];
  setActiveProjectId: (id: string | null) => void;
  setProjectDetails: (details: any) => void;
  updateDocumentStatus: (documentId: string, status: ProjectDocument['status'], progress?: number, stage?: string) => void;
  updateFactValue: (factId: string, newValue: string, comment?: string) => void;
  clearError: (errorId: string) => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  activeProjectId: null,
  activeProject: null,
  documents: [],
  facts: [],
  errors: [],
  setActiveProjectId: (activeProjectId) => set({ activeProjectId }),
  setProjectDetails: (activeProject) => {
    if (!activeProject) {
      set({ activeProject: null, documents: [], facts: [], errors: [] });
      return;
    }

    const documents = activeProject.documents || [];
    const errors = activeProject.validationErrors || [];

    // Extract facts from financial statements
    const facts: ParsedFact[] = [];
    if (activeProject.financialStatements) {
      activeProject.financialStatements.forEach((fs: any) => {
        if (fs.parsedFacts) {
          fs.parsedFacts.forEach((fact: any) => {
            facts.push(fact);
          });
        }
      });
    }

    set({ activeProject, documents, facts, errors });
  },
  updateDocumentStatus: (documentId, status, _progress, _stage) => {
    const { documents } = get();
    const updatedDocs = documents.map((doc) =>
      doc.id === documentId ? { ...doc, status } : doc
    );
    set({ documents: updatedDocs });
  },
  updateFactValue: (factId, newValue, _comment) => {
    const { facts } = get();
    const updatedFacts = facts.map((fact) =>
      fact.id === factId
        ? { ...fact, isOverridden: true, overriddenValue: newValue }
        : fact
    );
    set({ facts: updatedFacts });
  },
  clearError: (errorId) => {
    const { errors } = get();
    const updatedErrors = errors.map((err) =>
      err.id === errorId ? { ...err, isCleared: true } : err
    );
    set({ errors: updatedErrors });
  },
}));
