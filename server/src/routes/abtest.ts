import Router from '@koa/router';
import * as abtestController from '../controllers/abtestController';
import { authMiddleware } from '../middleware/auth';

const router = new Router({ prefix: '/api/v1/ab-tests' });

router.post('/', authMiddleware, abtestController.create);
router.put('/:id', authMiddleware, abtestController.update);
router.get('/:id', authMiddleware, abtestController.get);
router.get('/', authMiddleware, abtestController.list);
router.post('/:id/start', authMiddleware, abtestController.start);
router.post('/:id/stop', authMiddleware, abtestController.stop);
router.delete('/:id', authMiddleware, abtestController.remove);
router.post('/:id/results', authMiddleware, abtestController.addResult);
router.get('/:id/results', authMiddleware, abtestController.getResults);
router.get('/:id/stats', authMiddleware, abtestController.getStats);

export default router;
