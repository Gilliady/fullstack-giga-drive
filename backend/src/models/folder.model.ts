import mongoose, { Document, Schema } from 'mongoose';

export interface IFolder extends Document {
  name: string;
  userId: mongoose.Types.ObjectId;
  parentId: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
  getFullPath(): Promise<string>;
  __v?: number;
}

const folderSchema = new Schema<IFolder>(
  {
    name: {
      type: String,
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: 'Folder',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

folderSchema.index({ userId: 1, parentId: 1, name: 1 }, { unique: true });

folderSchema.methods.getFullPath = async function(): Promise<string> {
  const paths: string[] = [this.name];
  let currentFolder = this as IFolder;

  while (currentFolder.parentId) {
    currentFolder = (await Folder.findById(currentFolder.parentId)) as IFolder;
    if (!currentFolder) break;
    paths.unshift(currentFolder.name);
  }

  return paths.join('/');
};

export const Folder = mongoose.model<IFolder>('Folder', folderSchema);
