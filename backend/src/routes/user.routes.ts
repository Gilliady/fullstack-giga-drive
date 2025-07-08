import { Router, Request, Response, NextFunction } from 'express';
import UserController from '../controllers/user.controller';
import { UserCreateType, UserResponseType } from '../types/user.types';
import { ResponseType } from '../types/response.type';
const route: Router = Router();

route.post(
  '/',
  (
    req: Request<{}, any, UserCreateType>,
    res: Response<ResponseType<UserResponseType>>,
    next: NextFunction
  ) => {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({
        status: 400,
        message: 'Email e senha são obrigatórios para criar um usuário',
      });
      return;
    }
    next();
  },
  UserController.createUser
);

route.get('/', UserController.getUsers);

route.get('/:id', UserController.getUserById);

route.put(
  '/:id',
  (req, res, next) => {
    const { email, password, newPassword } = req.body;
    if (!email && !newPassword) {
      res
        .status(400)
        .json({
          status: 400,
          message: 'Forneça ao menos um dado que deseja atualizar',
        });
      return;
    }

    if (!password) {
      res.status(400).json({
        status: 400,
        message: 'Senha atual é obrigatória para atualizar o usuário',
      });
      return;
    }
    next();
  },
  UserController.updateUser
);

export default route;
