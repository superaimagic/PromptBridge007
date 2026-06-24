import { ContextManager } from '../ContextManager';

export class CodeHandler {
  async execute(input: any, context: ContextManager): Promise<any> {
    const code = input.code || '';
    const timeout = Math.min(input.timeout || 5000, 30000);

    if (!code) {
      throw new Error('No code provided');
    }

    const contextVars = context.getAll();

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Code execution timed out'));
      }, timeout);

      try {
        // Create a sandboxed function with input and context variables
        const fn = new Function(
          'input',
          'context',
          'console',
          `"use strict";
          ${code}
          return typeof output !== 'undefined' ? output : undefined;`
        );

        const sandboxedConsole = {
          log: (...args: any[]) => {}, // Suppress logs
          error: (...args: any[]) => console.error('[CodeHandler]', ...args),
          warn: (...args: any[]) => {},
        };

        const result = fn(input, contextVars, sandboxedConsole);

        clearTimeout(timer);
        resolve({ output: result });
      } catch (err: any) {
        clearTimeout(timer);
        reject(new Error(`Code execution error: ${err.message}`));
      }
    });
  }
}
