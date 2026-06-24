import Router from '@koa/router';
import * as authController from '../controllers/authController';
import { validate } from '../middleware/validator';
import { authMiddleware } from '../middleware/auth';
import { z } from 'zod';

const router = new Router({ prefix: '/api/v1/auth' });

router.post('/register', validate({
  body: z.object({
    username: z.string().min(3).max(50),
    email: z.string().email(),
    password: z.string().min(6).max(100),
    nickname: z.string().optional(),
  }),
}), authController.register);

router.post('/login', validate({
  body: z.object({
    username: z.string(),
    password: z.string(),
  }),
}), authController.login);

router.post('/refresh', validate({
  body: z.object({
    refreshToken: z.string(),
  }),
}), authController.refreshToken);

router.get('/me', authMiddleware, authController.me);
router.put('/me', authMiddleware, authController.updateProfile);
router.put('/me/password', authMiddleware, validate({
  body: z.object({
    oldPassword: z.string(),
    newPassword: z.string().min(6),
  }),
}), authController.changePassword);

export default router;
