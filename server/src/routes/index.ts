import Router from '@koa/router';
import authRoutes from './auth';
import promptRoutes from './prompt';
import workflowRoutes from './workflow';
import executionRoutes from './execution';
import monitorRoutes from './monitor';
import abtestRoutes from './abtest';
import roleTemplateRoutes from './roleTemplate';
import categoryRoutes from './category';
import tagRoutes from './tag';

const router = new Router();

router.use(authRoutes.routes());
router.use(promptRoutes.routes());
router.use(workflowRoutes.routes());
router.use(executionRoutes.routes());
router.use(monitorRoutes.routes());
router.use(abtestRoutes.routes());
router.use(roleTemplateRoutes.routes());
router.use(categoryRoutes.routes());
router.use(tagRoutes.routes());

export default router;
