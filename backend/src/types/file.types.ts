import { Request } from 'express';
import { Types } from 'mongoose';
import { IFile } from '../models/file.model';

export interface AuthenticatedFileRequest extends Request {
  user: {
    id: string;
    email: string;
  };
  files?: Express.Multer.File[];
  folderPath?: string;
}

export type IFileListResponse = {
  files: IFile[] | IFile;
};

export interface FileParams {
  fileId: string;
}

export interface FileRenameBody {
  name: string;
}

export interface FileMoveBody {
  folderId?: string | null;
}

export interface FileUploadBody {
  folderId?: string;
}