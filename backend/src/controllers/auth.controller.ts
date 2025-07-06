import { Request, RequestHandler, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model';
import { ResponseType } from '../types/response.type';
import { TokenPayload } from '../middlewares/auth.middleware';

export class AuthController {
  static login: RequestHandler<
    {},
    ResponseType<{ token: string }>,
    TokenPayload
  > = async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ message: 'Email e senha são obrigatórios' });
        return;
      }

      const user = await User.findOne({ email });

      if (!user) {
        res.status(401).json({ message: 'Usuário não encontrado' });
        return;
      }

      const isValidPassword = await bcrypt.compare(password, user.password);

      if (!isValidPassword) {
        res.status(401).json({ message: 'Senha inválida' });
        return;
      }

      const token = jwt.sign(
        {
          id: user._id,
          email: user.email,
        },
        process.env.JWT_SECRET || 'default_secret',
        { expiresIn: '1d' }
      );

      res.json({
        user: {
          id: user._id,
          email: user.email,
        },
        token,
      });
    } catch (error) {
      console.error('Erro no login:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  };
}
