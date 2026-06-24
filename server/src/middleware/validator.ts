import { z, ZodSchema } from 'zod';
import { ValidationError } from './errorHandler';

interface ValidationSchema {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

export const validate = (schema: ValidationSchema) => {
  return async (ctx: any, next: any) => {
    try {
      if (schema.body) {
        ctx.request.body = schema.body.parse(ctx.request.body);
      }
      if (schema.query) {
        ctx.query = schema.query.parse(ctx.query);
      }
      if (schema.params) {
        ctx.params = schema.params.parse(ctx.params);
      }
      await next();
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        const messages = err.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join('; ');
        throw new ValidationError(messages);
      }
      throw err;
    }
  };
};
