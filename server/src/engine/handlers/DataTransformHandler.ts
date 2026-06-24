import { ContextManager } from '../ContextManager';

export class DataTransformHandler {
  async execute(input: any, context: ContextManager): Promise<any> {
    const transformType = input.transform_type || 'extract';
    const source = input.source !== undefined ? input.source : context.get('lastOutput');
    const config = input.config || {};

    switch (transformType) {
      case 'map':
        return this.mapTransform(source, config);
      case 'filter':
        return this.filterTransform(source, config);
      case 'extract':
        return this.extractTransform(source, config);
      case 'merge':
        return this.mergeTransform(source, config, context);
      case 'split':
        return this.splitTransform(source, config);
      case 'json_parse':
        return this.jsonParseTransform(source);
      case 'json_stringify':
        return this.jsonStringifyTransform(source);
      default:
        return source;
    }
  }

  private mapTransform(source: any, config: any): any[] {
    const items = Array.isArray(source) ? source : [source];
    const field = config.field;
    return items.map((item: any) => {
      if (field && typeof item === 'object') return item[field];
      return item;
    });
  }

  private filterTransform(source: any, config: any): any[] {
    const items = Array.isArray(source) ? source : [source];
    const field = config.field;
    const value = config.value;
    return items.filter((item: any) => {
      if (field && typeof item === 'object') {
        return item[field] === value;
      }
      return item === value;
    });
  }

  private extractTransform(source: any, config: any): any {
    const path = config.path || '';
    if (!path || !source || typeof source !== 'object') return source;
    const parts = path.split('.');
    let current = source;
    for (const part of parts) {
      if (current === null || current === undefined) return null;
      current = current[part];
    }
    return current;
  }

  private mergeTransform(source: any, config: any, context: ContextManager): any {
    const sources = config.sources || [];
    const results: any[] = [source];
    for (const ref of sources) {
      const data = context.get(ref) || context.getNodeResult(ref);
      if (data) results.push(data);
    }
    return Object.assign({}, ...results);
  }

  private splitTransform(source: any, config: any): any[] {
    const delimiter = config.delimiter || ',';
    if (typeof source === 'string') {
      return source.split(delimiter).map((s: string) => s.trim());
    }
    if (Array.isArray(source)) return source;
    return [source];
  }

  private jsonParseTransform(source: any): any {
    if (typeof source === 'string') {
      try { return JSON.parse(source); } catch { return source; }
    }
    return source;
  }

  private jsonStringifyTransform(source: any): string {
    if (typeof source === 'object') {
      return JSON.stringify(source);
    }
    return String(source);
  }
}
