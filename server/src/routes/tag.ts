import Router from '@koa/router';
import * as tagController from '../controllers/tagController';
import { authMiddleware } from '../middleware/auth';

const router = new Router({ prefix: '/api/v1/tags' });

router.get('/', authMiddleware, tagController.list);
router.get('/:id', authMiddleware, tagController.get);
router.post('/', authMiddleware, tagController.create);
router.put('/:id', authMiddleware, tagController.update);
router.delete('/:id', authMiddleware, tagController.remove);

export default router;
