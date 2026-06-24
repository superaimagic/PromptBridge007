import { ContextManager } from '../ContextManager';

export class ConditionHandler {
  async execute(input: any, context: ContextManager): Promise<{
    conditionResult: boolean;
    trueBranch: string;
    falseBranch: string;
  }> {
    const expression = input.expression || '';
    const trueBranch = input.true_next || '';
    const falseBranch = input.false_next || '';

    // Resolve variables in expression
    const resolvedExpr = context.resolve(expression);

    // Evaluate simple expressions
    const conditionResult = this.evaluateExpression(resolvedExpr);

    return { conditionResult, trueBranch, falseBranch };
  }

  private evaluateExpression(expr: string): boolean {
    const trimmed = expr.trim();

    // Handle not_empty operator
    if (trimmed.endsWith(' not_empty')) {
      const value = trimmed.replace(' not_empty', '').trim();
      return value !== '' && value !== 'undefined' && value !== 'null';
    }

    // Handle includes operator
    const includesMatch = trimmed.match(/^(.+?)\s+includes\s+(.+)$/);
    if (includesMatch) {
      const haystack = includesMatch[1].trim();
      const needle = includesMatch[2].trim().replace(/^["']|["']$/g, '');
      return haystack.includes(needle);
    }

    // Handle comparison operators: >, <, >=, <=, ==, !=
    const operators = ['>=', '<=', '!=', '==', '>', '<'];
    for (const op of operators) {
      const idx = trimmed.indexOf(op);
      if (idx !== -1) {
        const left = trimmed.substring(0, idx).trim();
        const right = trimmed.substring(idx + op.length).trim();
        return this.compare(left, right, op);
      }
    }

    // Fallback: treat as truthy
    return trimmed !== '' && trimmed !== '0' && trimmed !== 'false' && trimmed !== 'null' && trimmed !== 'undefined';
  }

  private compare(left: string, right: string, operator: string): boolean {
    const l = this.toNumber(left);
    const r = this.toNumber(right);

    // If both are valid numbers, compare as numbers
    if (!isNaN(l) && !isNaN(r)) {
      switch (operator) {
        case '>': return l > r;
        case '<': return l < r;
        case '>=': return l >= r;
        case '<=': return l <= r;
        case '==': return l === r;
        case '!=': return l !== r;
      }
    }

    // Otherwise compare as strings
    const ls = left.replace(/^["']|["']$/g, '');
    const rs = right.replace(/^["']|["']$/g, '');
    switch (operator) {
      case '==': return ls === rs;
      case '!=': return ls !== rs;
      default: return false;
    }
  }

  private toNumber(value: string): number {
    const cleaned = value.replace(/^["']|["']$/g, '');
    return parseFloat(cleaned);
  }
}
