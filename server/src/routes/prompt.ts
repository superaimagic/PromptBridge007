import Router from '@koa/router';
import * as promptController from '../controllers/promptController';
import { authMiddleware } from '../middleware/auth';

const router = new Router({ prefix: '/api/v1/prompts' });

router.post('/', authMiddleware, promptController.create);
router.put('/:id', authMiddleware, promptController.update);
router.get('/:id', authMiddleware, promptController.get);
router.get('/', authMiddleware, promptController.list);
router.post('/:id/publish', authMiddleware, promptController.publish);
router.post('/:id/archive', authMiddleware, promptController.archive);
router.delete('/:id', authMiddleware, promptController.remove);
router.get('/:id/versions', authMiddleware, promptController.getVersions);
router.get('/:id/versions/:version', authMiddleware, promptController.getVersion);

export default router;
