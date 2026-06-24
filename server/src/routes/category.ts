import Router from '@koa/router';
import * as categoryController from '../controllers/categoryController';
import { authMiddleware } from '../middleware/auth';

const router = new Router({ prefix: '/api/v1/categories' });

router.get('/', authMiddleware, categoryController.list);
router.get('/tree', authMiddleware, categoryController.list); // tree=true query param
router.get('/:id', authMiddleware, categoryController.get);
router.post('/', authMiddleware, categoryController.create);
router.put('/:id', authMiddleware, categoryController.update);
router.delete('/:id', authMiddleware, categoryController.remove);

export default router;
