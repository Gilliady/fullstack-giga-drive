import userRouter from './user.routes';
import authRouter from './auth.routes';
import { fileRoutes } from './file.routes';
import folderRouter from './folder.routes';
import { Router } from 'express';

const routes: Router = Router();
routes.use('/auth', authRouter);
routes.use('/users', userRouter);
routes.use('/files', fileRoutes);
routes.use('/folders', folderRouter);

export default routes;
