import userRouter from './user.routes';
import { Router } from 'express';

const routes: Router = Router();

routes.use('/api/v1/user', userRouter);

export default routes;
