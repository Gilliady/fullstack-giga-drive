import mongoose, { Schema, Document } from 'mongoose';
import { IFile } from './file.model';
import { IFolder } from './folder.model';

export interface IUser extends Document {
  email: string;
  password: string;
  createdAt?: Date;
  updatedAt?: Date;
  __v?: number;
  folders?: IFolder[];
}

const UserSchema: Schema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

UserSchema.virtual('folders', {
  ref: 'Folder',
  localField: '_id',
  foreignField: 'userId',
});

UserSchema.pre('save', async function (next) {
  if (!this.isModified('email')) {
    return next();
  }

  try {
    const userExists = await mongoose
      .model('User')
      .findOne({ email: this.email });
    if (userExists) {
      throw new Error('Email já está em uso');
    }
    next();
  } catch (error) {
    next(error instanceof Error ? error : new Error('Erro ao verificar email'));
  }
});

export const User = mongoose.model<IUser>('User', UserSchema);
