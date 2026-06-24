import Router from '@koa/router';
import * as executionController from '../controllers/executionController';
import { authMiddleware } from '../middleware/auth';

const router = new Router({ prefix: '/api/v1/executions' });

router.post('/', authMiddleware, executionController.create);
router.get('/:id', authMiddleware, executionController.get);
router.get('/', authMiddleware, executionController.list);
router.post('/:id/cancel', authMiddleware, executionController.cancel);
router.get('/:id/nodes', authMiddleware, executionController.getNodeExecutions);

export default router;
