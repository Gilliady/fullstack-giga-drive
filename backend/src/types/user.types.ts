import { ObjectId } from "mongoose";
import { IFile } from "../models/file.model";

export type UserResponseType = {
  id: ObjectId,
  email: string,
  createdAt?: Date,
  updatedAt?: Date,
  folders?: {
    id: ObjectId,
    name: string
  }[],
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
