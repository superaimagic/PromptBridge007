import { ContextManager } from '../ContextManager';

export class PromptNodeHandler {
  async execute(input: any, context: ContextManager): Promise<{ content: string }> {
    const template = input.content || input.template || '';
    const resolvedContent = context.resolve(template);
    return { content: resolvedContent };
  }
}
