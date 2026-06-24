import Router from '@koa/router';
import * as roleTemplateController from '../controllers/roleTemplateController';
import { authMiddleware } from '../middleware/auth';

const router = new Router({ prefix: '/api/v1/role-templates' });

router.post('/', authMiddleware, roleTemplateController.create);
router.put('/:id', authMiddleware, roleTemplateController.update);
router.delete('/:id', authMiddleware, roleTemplateController.remove);
router.get('/', authMiddleware, roleTemplateController.list);
router.get('/:id', authMiddleware, roleTemplateController.get);
router.post('/:id/use', authMiddleware, roleTemplateController.useTemplate);

export default router;
