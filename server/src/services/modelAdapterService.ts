export interface ModelConfig {
  provider: string;
  model: string;
  base_url: string;
  api_key: string;
  temperature?: number;
  max_tokens?: number;
}

interface ChatMessage {
  role: string;
  content: string;
}

interface ModelResponse {
  content: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
}

export const callModel = async (
  config: ModelConfig,
  messages: ChatMessage[],
  options?: { temperature?: number; max_tokens?: number }
): Promise<ModelResponse> => {
  const url = `${config.base_url.replace(/\/+$/, '')}/v1/chat/completions`;

  const body: any = {
    model: config.model,
    messages,
    temperature: options?.temperature ?? config.temperature ?? 0.7,
    max_tokens: options?.max_tokens ?? config.max_tokens,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.api_key}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI model API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  const choice = data.choices?.[0];
  if (!choice) {
    throw new Error('No response from AI model');
  }

  return {
    content: choice.message?.content || '',
    usage: data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    model: data.model || config.model,
  };
};

export async function* callModelStream(
  config: ModelConfig,
  messages: ChatMessage[],
  options?: { temperature?: number; max_tokens?: number }
): AsyncIterable<string> {
  const url = `${config.base_url.replace(/\/+$/, '')}/v1/chat/completions`;

  const body: any = {
    model: config.model,
    messages,
    temperature: options?.temperature ?? config.temperature ?? 0.7,
    max_tokens: options?.max_tokens ?? config.max_tokens,
    stream: true,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.api_key}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI model API error (${response.status}): ${errorText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body for streaming');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;
      const data = trimmed.slice(6);
      if (data === '[DONE]') return;

      try {
        const parsed = JSON.parse(data);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) {
          yield content;
        }
      } catch {
        // Skip malformed SSE data
      }
    }
  }
}

export const estimateCost = (
  model: string,
  usage: { prompt_tokens: number; completion_tokens: number }
): number => {
  const pricing: Record<string, { input: number; output: number }> = {
    'gpt-4': { input: 0.03 / 1000, output: 0.06 / 1000 },
    'gpt-4-turbo': { input: 0.01 / 1000, output: 0.03 / 1000 },
    'gpt-4o': { input: 0.005 / 1000, output: 0.015 / 1000 },
    'gpt-4o-mini': { input: 0.00015 / 1000, output: 0.0006 / 1000 },
    'gpt-3.5-turbo': { input: 0.0005 / 1000, output: 0.0015 / 1000 },
    'claude-3-opus': { input: 0.015 / 1000, output: 0.075 / 1000 },
    'claude-3-sonnet': { input: 0.003 / 1000, output: 0.015 / 1000 },
    'claude-3-haiku': { input: 0.00025 / 1000, output: 0.00125 / 1000 },
  };

  const modelKey = Object.keys(pricing).find(k => model.includes(k));
  if (!modelKey) {
    // Default estimate for unknown models
    return (usage.prompt_tokens * 0.001 + usage.completion_tokens * 0.002) / 1000;
  }

  const price = pricing[modelKey];
  return usage.prompt_tokens * price.input + usage.completion_tokens * price.output;
};
