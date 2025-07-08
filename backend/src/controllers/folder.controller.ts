import { RequestHandler, Response } from 'express';
import { ResponseType } from '../types/response.type';
import { AuthenticatedFileRequest } from '../types/file.types';
import { Folder, IFolder } from '../models/folder.model';
import { File, IFile } from '../models/file.model';
import mongoose, { ObjectId } from 'mongoose';
import {
  AuthenticatedRequest,
} from '../types/auth.types';
import { FolderCreateType, FolderUpdateType } from '../types/folder.types';
import { GCSService } from '../services/gcs.service';

export default class FolderController {
  private static gcsService: GCSService = new GCSService('drive-no-drive');

  static createFolder: RequestHandler<
    {},
    ResponseType<IFolder>,
    FolderCreateType
  > = async (req, res: Response): Promise<void> => {
    try {
      const authenticatedRequest = req as unknown as AuthenticatedRequest;
      const userId = authenticatedRequest.user.id;
      const { name, parentId } = req.body;

      if (!name) {
        res.status(400).json({
          status: 400,
          message: 'Nome da pasta não fornecido',
          error: 'É necessário fornecer um nome para a pasta',
        });
        return;
      }

      if (parentId) {
        const parentFolder = await Folder.findOne({ _id: parentId, userId });
        if (!parentFolder) {
          res.status(404).json({
            status: 404,
            message: 'Pasta pai não encontrada',
            error:
              'A pasta pai especificada não existe ou você não tem acesso a ela',
          });
          return;
        }
      }

      const folder = new Folder({
        name,
        userId,
        parentId: parentId || null,
      });

      await folder.save();
      const fullPath = await folder.getFullPath();

      res.status(201).json({
        status: 201,
        message: 'Pasta criada com sucesso',
        data: {
          id: folder._id,
          name: folder.name,
          fullPath,
          parentId: folder.parentId,
          createdAt: folder.createdAt,
        },
      });
    } catch (error: any) {
      if ('code' in error && error.code === 11000) {
        res.status(409).json({
          status: 409,
          message: 'Já existe uma pasta com este nome neste local',
          error: 'Nome de pasta duplicado',
        });
        return;
      }
      res.status(500).json({
        status: 500,
        message: 'Erro ao criar pasta',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  static getFolderContents: RequestHandler<
    { folderId: string },
    ResponseType<{
      currentFolder: IFolder;
      subFolders: IFolder[];
      files: IFile[];
    }>
  > = async (req, res: Response): Promise<void> => {
    try {
      const authenticatedRequest = req as unknown as AuthenticatedFileRequest;
      const userId = authenticatedRequest.user.id;
      const { folderId } = req.params;

      let folder = null;
      if (folderId && folderId !== 'root') {
        folder = await Folder.findOne({ _id: folderId, userId });
        if (!folder) {
          res.status(404).json({
            status: 404,
            message: 'Pasta não encontrada',
            error:
              'A pasta especificada não existe ou você não tem acesso a ela',
          });
          return;
        }
      }

      const subfolders = await Folder.find({
        userId,
        parentId: folderId === 'root' ? null : folderId,
      }).sort({ name: 1 });

      const files = await File.find({
        userId,
        folderId: folderId === 'root' ? null : folderId,
      }).sort({ originalName: 1 });

      const subfoldersWithPaths = await Promise.all(
        subfolders.map(async (subfolder) => ({
          id: subfolder._id,
          name: subfolder.name,
          fullPath: await subfolder.getFullPath(),
          parentId: subfolder.parentId,
        }))
      );

      res.status(200).json({
        status: 200,
        message: 'Conteúdo da pasta obtido com sucesso',
        data: {
          currentFolder: folder
            ? {
                id: folder._id,
                name: folder.name,
                fullPath: await folder.getFullPath(),
                parentId: folder.parentId,
              }
            : null,
          subfolders: subfoldersWithPaths,
          files: files.map((file) => ({
            id: file._id,
            accessUrl: file.accessUrl,
            filename: file.originalName,
            originalName: file.originalName,
            mimeType: file.mimeType,
            size: file.size,
            uploadDate: file.uploadDate,
            folderId: file.folderId,
          })),
        },
      });
    } catch (error) {
      res.status(500).json({
        status: 500,
        message: 'Erro ao obter conteúdo da pasta',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  static renameFolder: RequestHandler<
    { folderId: string },
    ResponseType<IFolder>,
    FolderUpdateType
  > = async (req, res: Response): Promise<void> => {
    try {
      const authenticatedRequest = req as unknown as AuthenticatedFileRequest;
      const userId = authenticatedRequest.user.id;
      const { folderId } = req.params;
      const { name: newName } = req.body;

      if (!newName) {
        res.status(400).json({
          status: 400,
          message: 'Novo nome não fornecido',
          error: 'É necessário fornecer um novo nome para a pasta',
        });
        return;
      }

      const folder = await Folder.findOne({ _id: folderId, userId });
      if (!folder) {
        res.status(404).json({
          status: 404,
          message: 'Pasta não encontrada',
          error: 'A pasta especificada não existe ou você não tem acesso a ela',
        });
        return;
      }

      folder.name = newName;
      await folder.save();

      res.status(200).json({
        status: 200,
        message: 'Pasta renomeada com sucesso',
        data: {
          id: folder._id,
          userId: folder.userId,
          name: folder.name,
          fullPath: await folder.getFullPath(),
          parentId: folder.parentId,
        },
      });
    } catch (error: any) {
      if (error.code === 11000) {
        res.status(409).json({
          status: 409,
          message: 'Já existe uma pasta com este nome neste local',
          error: 'Nome de pasta duplicado',
        });
        return;
      }
      res.status(500).json({
        status: 500,
        message: 'Erro ao renomear pasta',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  static deleteFolder: RequestHandler = async (
    req,
    res: Response
  ): Promise<void> => {
    try {
      const authenticatedRequest = req as AuthenticatedFileRequest;
      const userId = authenticatedRequest.user.id;
      const { folderId } = req.params;

      const folder = await Folder.findOne({ _id: folderId, userId });
      if (!folder) {
        res.status(404).json({
          status: 404,
          message: 'Pasta não encontrada',
          error: 'A pasta especificada não existe ou você não tem acesso a ela',
        });
        return;
      }

      try {
        async function getAllSubfolderIds(parentId: string): Promise<string[]> {
          const subfolders = await Folder.find({ parentId, userId });
          const ids = [parentId];
          for (const subfolder of subfolders) {
            ids.push(
              ...(await getAllSubfolderIds(
                (subfolder._id as ObjectId).toString()
              ))
            );
          }
          return ids;
        }

        const folderIds = await getAllSubfolderIds(folderId);

        const filesToDelete = await File.find({
          userId,
          folderId: { $in: folderIds },
        });

        await Promise.all(
          filesToDelete.map((file) =>
            this.gcsService.deleteFile(file.serverName)
          )
        );

        await Folder.deleteMany({
          _id: { $in: folderIds },
          userId,
        });

        await File.deleteMany({
          userId,
          folderId: { $in: folderIds },
        });

        res.status(200).json({
          status: 200,
          message:
            'Pasta, subpastas e todo seu conteúdo foram deletados com sucesso',
        });
      } catch (innerError) {
        res.status(500).json({
          status: 500,
          message:
            'Erro ao deletar pasta. Alguns arquivos podem ter sido deletados.',
          error:
            'Por favor, tente novamente para garantir que todos os arquivos sejam removidos.',
        });
        return;
      }
    } catch (error) {
      res.status(500).json({
        status: 500,
        message: 'Erro ao deletar pasta',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };
}
