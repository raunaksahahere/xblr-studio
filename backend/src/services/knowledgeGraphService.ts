import prisma from '../config/db';

export const getGraphNeighborhood = async (companyId: string) => {
  // Let's retrieve all documents, parsed facts, and evidence links to build a real connected graph
  const project = await prisma.project.findFirst({
    where: { companyId }
  });

  if (!project) {
    return { nodes: [], edges: [] };
  }

  const documents = await prisma.companyDocument.findMany({
    where: { companyId }
  });

  const facts = await prisma.parsedFact.findMany({
    where: { projectId: project.id }
  });

  const nodes: any[] = [
    { id: companyId, label: 'Company', type: 'COMPANY' }
  ];
  const edges: any[] = [];

  // Add document nodes
  documents.forEach((doc) => {
    nodes.push({
      id: doc.id,
      label: doc.name,
      type: 'DOCUMENT',
      metadata: { fileType: doc.fileType }
    });
    edges.push({
      source: companyId,
      target: doc.id,
      relation: 'HAS_DOCUMENT'
    });
  });

  // Add fact nodes and link to documents
  facts.forEach((fact) => {
    nodes.push({
      id: fact.id,
      label: `${fact.factKey}: ${fact.factValue}`,
      type: 'FACT',
      metadata: { confidence: fact.overallConfidence }
    });

    if (fact.sourceDocumentId) {
      edges.push({
        source: fact.sourceDocumentId,
        target: fact.id,
        relation: 'SUPPORTS_FACT'
      });
    }
  });

  return { nodes, edges };
};

export const traceFactLineage = async (factId: string) => {
  const fact = await prisma.parsedFact.findUnique({
    where: { id: factId },
    include: {
      evidences: {
        include: {
          document: true
        }
      },
      mappings: true
    }
  });

  if (!fact) {
    throw new Error('Fact not found');
  }

  return {
    fact: {
      id: fact.id,
      key: fact.factKey,
      value: fact.factValue,
      confidence: fact.overallConfidence
    },
    mappings: fact.mappings.map(m => ({
      elementName: m.elementName,
      taxonomyType: m.taxonomyType,
      confidence: m.confidence
    })),
    evidences: fact.evidences.map(e => ({
      id: e.id,
      documentName: e.document.name,
      pageNumber: e.pageNumber,
      sourceSnippet: e.sourceSnippet,
      boundingBox: e.boundingBoxJson
    }))
  };
};
