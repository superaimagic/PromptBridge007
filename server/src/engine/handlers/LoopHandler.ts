import { ContextManager } from '../ContextManager';

export class LoopHandler {
  async execute(input: any, context: ContextManager): Promise<{ iterations: any[] }> {
    let items = input.items;
    if (items === undefined || items === null) {
      const ref = input.items_ref;
      if (ref) {
        items = context.get(ref) || context.getNodeResult(ref);
      }
    }

    if (!Array.isArray(items)) {
      items = [items];
    }

    const maxIterations = Math.min(input.max_iterations || 100, 100);
    const iterations: any[] = [];

    const count = Math.min(items.length, maxIterations);
    for (let i = 0; i < count; i++) {
      context.set('loopIndex', i);
      context.set('loopItem', items[i]);
      context.set('loopItems', items);

      // If there's a simple loop_body template, resolve it
      if (input.loop_body) {
        if (typeof input.loop_body === 'string') {
          iterations.push({
            index: i,
            result: context.resolve(input.loop_body),
          });
        } else if (typeof input.loop_body === 'object') {
          const resolved: any = {};
          for (const [key, value] of Object.entries(input.loop_body)) {
            resolved[key] = typeof value === 'string' ? context.resolve(value) : value;
          }
          iterations.push({ index: i, result: resolved });
        }
      } else {
        iterations.push({ index: i, item: items[i] });
      }
    }

    return { iterations };
  }
}
