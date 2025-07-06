import userRouter from './user.routes';
import authRouter from './auth.routes';
import { Router } from 'express';

const routes: Router = Router();
routes.use('/auth', authRouter);
routes.use('/user', userRouter);

export default routes;
