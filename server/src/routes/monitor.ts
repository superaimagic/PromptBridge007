import Router from '@koa/router';
import * as monitorController from '../controllers/monitorController';
import { authMiddleware } from '../middleware/auth';

const router = new Router({ prefix: '/api/v1/monitor' });

router.get('/overview', authMiddleware, monitorController.overview);
router.get('/executions', authMiddleware, monitorController.getExecutionMetrics);
router.get('/nodes', authMiddleware, monitorController.getNodeMetrics);
router.post('/metrics', authMiddleware, monitorController.recordMetric);
router.get('/metrics', authMiddleware, monitorController.getMetrics);

export default router;
