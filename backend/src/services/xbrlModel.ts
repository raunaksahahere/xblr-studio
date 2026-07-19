export interface XBRLDimension {
  axis: string;
  member: string;
}

export class XBRLContext {
  id: string;
  scheme: string;
  identifier: string;
  periodType: 'instant' | 'duration';
  startDate?: string;
  endDate?: string;
  instantDate?: string;
  dimensions: XBRLDimension[] = [];

  constructor(
    id: string,
    identifier: string,
    periodType: 'instant' | 'duration',
    dates: { start?: string; end?: string; instant?: string },
    scheme: string = 'http://www.mca.gov.in/CIN'
  ) {
    this.id = id;
    this.scheme = scheme;
    this.identifier = identifier;
    this.periodType = periodType;
    if (periodType === 'instant') {
      this.instantDate = dates.instant;
    } else {
      this.startDate = dates.start;
      this.endDate = dates.end;
    }
  }

  addDimension(axis: string, member: string) {
    // Avoid duplicate dimensions
    if (!this.dimensions.some(d => d.axis === axis)) {
      this.dimensions.push({ axis, member });
    }
  }

  // Generate deterministic unique hash to ensure duplicate contexts are merged
  getHash(): string {
    const periodStr = this.periodType === 'instant' 
      ? `I:${this.instantDate}` 
      : `D:${this.startDate}:${this.endDate}`;
    
    const dimStr = this.dimensions
      .map(d => `${d.axis}=${d.member}`)
      .sort()
      .join('|');
      
    return `${this.identifier}:${periodStr}:${dimStr}`;
  }

  serialize(): string {
    let periodXml = '';
    if (this.periodType === 'instant') {
      periodXml = `<xbrli:instant>${this.instantDate}</xbrli:instant>`;
    } else {
      periodXml = `<xbrli:startDate>${this.startDate}</xbrli:startDate>\n      <xbrli:endDate>${this.endDate}</xbrli:endDate>`;
    }

    let scenarioXml = '';
    if (this.dimensions.length > 0) {
      let dimMembers = '';
      for (const d of this.dimensions) {
        dimMembers += `        <xbrldi:explicitMember dimension="${d.axis}">${d.member}</xbrldi:explicitMember>\n`;
      }
      scenarioXml = `\n    <xbrli:scenario>\n${dimMembers}    </xbrli:scenario>`;
    }

    return `  <xbrli:context id="${this.id}">
    <xbrli:entity>
      <xbrli:identifier scheme="${this.scheme}">${this.identifier}</xbrli:identifier>
    </xbrli:entity>
    <xbrli:period>
      ${periodXml}
    </xbrli:period>${scenarioXml}
  </xbrli:context>`;
  }
}

export class XBRLUnit {
  id: string;
  measure: string;

  constructor(id: string, measure: string = 'iso4217:INR') {
    this.id = id;
    this.measure = measure;
  }

  serialize(): string {
    return `  <xbrli:unit id="${this.id}">
    <xbrli:measure>${this.measure}</xbrli:measure>
  </xbrli:unit>`;
  }
}

export class XBRLFact {
  id: string;
  elementName: string;
  value: string;
  contextRef: string;
  unitRef?: string;
  decimals: string;

  constructor(
    id: string,
    elementName: string,
    value: string,
    contextRef: string,
    decimals: string = '0',
    unitRef?: string
  ) {
    this.id = id;
    this.elementName = elementName;
    this.value = value;
    this.contextRef = contextRef;
    this.decimals = decimals;
    this.unitRef = unitRef;
  }

  serialize(): string {
    const unitAttr = this.unitRef ? ` unitRef="${this.unitRef}"` : '';
    const decAttr = this.unitRef ? ` decimals="${this.decimals}"` : '';
    
    // Auto-namespace prefix if omitted
    const finalTag = this.elementName.includes(':') ? this.elementName : `mca-indas:${this.elementName}`;
    
    return `  <${finalTag} id="${this.id}" contextRef="${this.contextRef}"${unitAttr}${decAttr}>${this.value}</${finalTag}>`;
  }
}

export class XBRLInstance {
  schemaRef: string = 'http://www.mca.gov.in/XBRL/2024/taxonomy/mca-indas/mca-indas-entry.xsd';
  contexts: Map<string, XBRLContext> = new Map();
  units: Map<string, XBRLUnit> = new Map();
  facts: XBRLFact[] = [];

  addContext(context: XBRLContext): string {
    const hash = context.getHash();
    // Re-use duplicate contexts dynamically
    for (const [id, ctx] of this.contexts.entries()) {
      if (ctx.getHash() === hash) {
        return id;
      }
    }
    this.contexts.set(context.id, context);
    return context.id;
  }

  addUnit(unit: XBRLUnit) {
    if (!this.units.has(unit.id)) {
      this.units.set(unit.id, unit);
    }
  }

  addFact(fact: XBRLFact) {
    this.facts.push(fact);
  }

  serialize(): string {
    let contextBlock = '';
    for (const ctx of this.contexts.values()) {
      contextBlock += ctx.serialize() + '\n';
    }

    let unitBlock = '';
    for (const u of this.units.values()) {
      unitBlock += u.serialize() + '\n';
    }

    let factBlock = '';
    for (const f of this.facts) {
      factBlock += f.serialize() + '\n';
    }

    return `<?xml version="1.0" encoding="utf-8"?>
<!-- Serialized by AI XBRL Studio Structured Object Model Processor -->
<xbrli:xbrl xmlns:mca-indas="http://www.mca.gov.in/XBRL/2024/taxonomy/mca-indas"
            xmlns:xbrli="http://www.xbrl.org/2003/instance"
            xmlns:link="http://www.xbrl.org/2003/linkbase"
            xmlns:xlink="http://www.w3.org/1999/xlink"
            xmlns:xbrldi="http://xbrl.org/2006/xbrldi"
            xmlns:iso4217="http://www.xbrl.org/2003/iso4217">
  
  <link:schemaRef xlink:type="simple" xlink:href="${this.schemaRef}" />

${contextBlock}
${unitBlock}
${factBlock}</xbrli:xbrl>
`;
  }
}
