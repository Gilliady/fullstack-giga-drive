import { RequestHandler } from 'express';
import { IUser, User } from '../models/user.model';
import * as bcrypt from 'bcryptjs';
import { UserResponseType, UserUpdateType } from '../types/user.types';
import { ObjectId } from 'mongoose';
import { ResponseType } from '../types/response.type';

export default class UserController {
  static createUser: RequestHandler<
    {},
    ResponseType<UserResponseType>,
    IUser
  > = async (req, res) => {
    try {
      const { email, password } = req.body;
      const newUser = new User({
        email: email.toLowerCase(),
        password: bcrypt.hashSync(password, 10),
      });
      await newUser.save();
      const userResponse: UserResponseType = {
        id: newUser._id as ObjectId,
        email: newUser.email,
        createdAt: newUser.createdAt,
        updatedAt: newUser.updatedAt,
      };
      res
        .status(201)
        .json({
          status: 201,
          message: 'Usuário criado com sucesso!',
          data: userResponse,
        });
    } catch (error) {
      res
        .status(400)
        .json({
          status: 400,
          message: 'Erro ao criar usuário',
          error: error instanceof Error ? error.message : String(error),
        });
    }
  };

  static getUsers: RequestHandler<{}, ResponseType<UserResponseType[]>> =
    async (req, res) => {
      try {
        const users: UserResponseType[] = (
          await User.find({}, '_id email createdAt updatedAt').limit(10).skip(0)
        ).map((user) => ({
          id: user._id as ObjectId,
          email: user.email,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        }));
        res.status(200).json({ status: 200, message: 'ok', data: users });
      } catch (error) {
        res
          .status(500)
          .json({
            status: 500,
            message: 'Erro ao obter usuários',
            error: error instanceof Error ? error.message : String(error),
          });
      }
    };

  static getUserById: RequestHandler<{id: string}, ResponseType<UserResponseType>, any> = async (req, res) => {
    try {
      const { id } = req.params;
      const user = await User.findById(id, '_id email');
      if (!user) {
        res.status(404).json({ status: 404, message: 'Usuário não encontrado' });
        return;
      }
      res.status(200).json({status: 200, message: "ok", data: {
        id: user._id as ObjectId,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      } });
    } catch (error) {
      res
        .status(500)
        .json({
          status: 500,
          message: 'Erro ao obter usuário',
          error: error instanceof Error ? error.message : String(error),
        });
    }
  };

  static updateUser: RequestHandler<{id: string}, ResponseType<UserResponseType>, UserUpdateType> = async (
    req,
    res
  ) => {
    try {
      const { id } = req.params;
      const { email, password, newPassword } = req.body;

      const user = await User.findById(id);

      if (!user) {
        res.status(404).json({ status: 400, message: 'Usuário não encontrado' });
        return;
      }
      if (bcrypt.compareSync(password, user.password)) {
        if (email && email !== user.email) {
          user.email = email;
        }
        if (newPassword) {
          if (newPassword !== password) {
            user.password = bcrypt.hashSync(newPassword, 10);
          } else {
            res
              .status(400)
              .json({
                status: 400,
                message: 'A nova senha não pode ser igual à senha antiga',
              });
            return;
          }
        }
      } else {
        res
          .status(400)
          .json({ status: 400, message: 'Senha atual fornecida está incorreta.' });
        return;
      }
      user.__v! += 1;
      await user.save();

      const userResponse: UserResponseType = {
        id: user._id as ObjectId,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      res
        .status(200)
        .json({
          status: 200,
          message: 'Usuário atualizado com sucesso',
          data: userResponse,
        });
    } catch (error) {
      res
        .status(500)
        .json({
          status: 500,
          message: 'Erro ao atualizar usuário',
          error: error instanceof Error ? error.message : String(error),
        });
    }
  };
}
