export class AppError extends Error {
  public statusCode: number;
  public code: number;

  constructor(statusCode: number, message: string, code?: number) {
    super(message);
    this.statusCode = statusCode;
    this.code = code || statusCode;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message, 400);
  }
}

export class AuthError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(401, message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Permission denied') {
    super(403, message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(404, message, 404);
  }
}

export const errorHandler = async (ctx: any, next: any) => {
  try {
    await next();
  } catch (err: any) {
    if (err instanceof AppError) {
      ctx.status = err.statusCode;
      ctx.body = { code: err.code, message: err.message, data: null };
    } else {
      console.error('Unhandled error:', err);
      ctx.status = 500;
      ctx.body = { code: 500, message: 'Internal server error', data: null };
    }
  }
};
