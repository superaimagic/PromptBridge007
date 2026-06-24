import { ContextManager } from '../ContextManager';
import * as modelAdapterService from '../../services/modelAdapterService';

export class AINodeHandler {
  async execute(input: any, context: ContextManager): Promise<{ content: string; usage: any; model: string }> {
    const modelConfig = input.model_config || {};
    const rawMessages = input.messages || [];

    // Resolve variables in message content
    const messages = rawMessages.map((msg: any) => ({
      role: msg.role,
      content: context.resolve(msg.content || ''),
    }));

    const config: modelAdapterService.ModelConfig = {
      provider: modelConfig.provider || 'openai',
      model: modelConfig.model || 'gpt-3.5-turbo',
      base_url: modelConfig.base_url || 'https://api.openai.com',
      api_key: modelConfig.api_key || '',
      temperature: modelConfig.temperature,
      max_tokens: modelConfig.max_tokens,
    };

    const result = await modelAdapterService.callModel(config, messages);

    return {
      content: result.content,
      usage: result.usage,
      model: result.model,
    };
  }
}
