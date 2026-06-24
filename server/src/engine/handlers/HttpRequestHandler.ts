import { ContextManager } from '../ContextManager';

export class HttpRequestHandler {
  async execute(input: any, context: ContextManager): Promise<any> {
    const url = context.resolve(input.url || '');
    const method = (input.method || 'GET').toUpperCase();
    const headers: Record<string, string> = input.headers || {};
    const body = input.body ? context.resolve(typeof input.body === 'string' ? input.body : JSON.stringify(input.body)) : undefined;

    const fetchOptions: any = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    if (['POST', 'PUT', 'PATCH'].includes(method) && body) {
      fetchOptions.body = body;
    }

    try {
      const response = await fetch(url, fetchOptions);

      let data: any;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        return {
          success: false,
          status: response.status,
          error: `HTTP ${response.status}`,
          data,
        };
      }

      return {
        success: true,
        status: response.status,
        data,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message,
      };
    }
  }
}
