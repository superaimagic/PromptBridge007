export class ContextManager {
  private variables: Record<string, any> = {};
  private nodeResults: Record<string, any> = {};

  constructor(initialInput?: any) {
    if (initialInput) {
      this.variables.input = initialInput;
      if (typeof initialInput === 'object' && initialInput !== null) {
        for (const [key, value] of Object.entries(initialInput)) {
          this.variables[key] = value;
        }
      }
    }
  }

  set(key: string, value: any): void {
    this.variables[key] = value;
  }

  get(key: string): any {
    return this.variables[key];
  }

  getAll(): Record<string, any> {
    return { ...this.variables };
  }

  setNodeResult(nodeId: string, result: any): void {
    this.nodeResults[nodeId] = result;
    this.variables[nodeId] = result;
  }

  getNodeResult(nodeId: string): any {
    return this.nodeResults[nodeId];
  }

  resolve(template: string): string {
    if (typeof template !== 'string') return String(template);

    return template.replace(/\{\{([^}]+)\}\}/g, (match, path: string) => {
      const value = this.resolvePath(path.trim());
      if (value === undefined) return match;
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value);
    });
  }

  private resolvePath(path: string): any {
    const parts = path.split('.');
    let current: any = this.variables;

    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = current[part];
    }

    return current;
  }
}
