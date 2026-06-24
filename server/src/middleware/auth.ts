import { verifyToken } from '../utils/jwt';
import { error } from '../utils/response';

export const authMiddleware = async (ctx: any, next: any) => {
  const authHeader = ctx.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return error(ctx, 401, 'Missing or invalid authorization header');
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);
  if (!decoded) {
    return error(ctx, 401, 'Invalid or expired token');
  }

  ctx.state.user = decoded;
  await next();
};

export const optionalAuth = async (ctx: any, next: any) => {
  const authHeader = ctx.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (decoded) {
      ctx.state.user = decoded;
    }
  }
  await next();
};
