import { ObjectId } from "mongoose";

export type UserResponseType = {
  id: ObjectId,
  email: string,
  createdAt?: Date,
  updatedAt?: Date,
}

export type UserUpdateType = {
  password: string,
  email?: string,
  newPassword?: string
}

export type UserCreateType = {
  email: string,
  password: string
}
