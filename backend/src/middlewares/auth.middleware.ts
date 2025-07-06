import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';

export interface TokenPayload {
  id: string;
  email: string;
}

export const authMiddleware: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ message: 'Token não fornecido' });
    return;
  }

  const parts = authHeader.split(' ');

  if (parts.length !== 2) {
    res.status(401).json({ message: 'Token mal formatado' });
    return;
  }

  const [prefix, token] = parts;

  if (!/^Bearer$/i.test(prefix)) {
    res.status(401).json({ message: 'Token mal formatado' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret') as TokenPayload;

    (req as any).user = {
      id: decoded.id,
      email: decoded.email
    };

    next();
  } catch (err) {
    res.status(401).json({ message: 'Token inválido' });
  }
};
