import Koa from 'koa';
import cors from '@koa/cors';
import bodyParser from 'koa-bodyparser';
import { errorHandler } from './middleware/errorHandler';
import router from './routes';

const app = new Koa();

app.use(errorHandler);
app.use(cors());
app.use(bodyParser());
app.use(router.routes());
app.use(router.allowedMethods());

export default app;
