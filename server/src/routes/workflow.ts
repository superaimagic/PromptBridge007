import Router from '@koa/router';
import * as workflowController from '../controllers/workflowController';
import { authMiddleware } from '../middleware/auth';

const router = new Router({ prefix: '/api/v1/workflows' });

router.post('/', authMiddleware, workflowController.create);
router.put('/:id', authMiddleware, workflowController.update);
router.get('/:id', authMiddleware, workflowController.get);
router.get('/', authMiddleware, workflowController.list);
router.post('/:id/publish', authMiddleware, workflowController.publish);
router.post('/:id/archive', authMiddleware, workflowController.archive);
router.delete('/:id', authMiddleware, workflowController.remove);
router.get('/:id/versions', authMiddleware, workflowController.getVersions);
router.post('/:id/versions', authMiddleware, workflowController.saveVersion);

export default router;
