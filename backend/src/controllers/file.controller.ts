import { RequestHandler, Response } from 'express';
import { File, IFile } from '../models/file.model';
import mongoose from 'mongoose';
import { ResponseType } from '../types/response.type';
import {
  AuthenticatedFileRequest,
  IFileListResponse,
  FileParams,
  FileRenameBody,
  FileMoveBody,
  FileUploadBody,
} from '../types/file.types';
import { GCSService } from '../services/gcs.service';
import { Folder } from '../models/folder.model';
import { isAccessUrlExpired } from '../utils/date.utils';

export default class FileController {
  private static gcsService: GCSService = new GCSService('drive-no-drive');
  private static readonly BUCKET_URL =
    'https://storage.googleapis.com/drive-no-drive';

  static async validateFolderAccess(
    folderId: string,
    userId: string
  ): Promise<boolean> {
    if (!folderId || folderId === 'root') return true;
    const folder = await Folder.findOne({ _id: folderId, userId });
    return !!folder;
  }

  static validateUserAccess(
    userId: string,
    fileUserId: string,
    res: Response
  ): boolean {
    if (userId !== fileUserId) {
      res.status(403).json({
        status: 403,
        message: 'Acesso negado',
        error: 'Você não tem permissão para acessar este arquivo',
      });
      return false;
    }
    return true;
  }

  static async createFileDocument(
    file: Express.Multer.File,
    userId: string,
    folderId?: string
  ): Promise<IFile> {
    const serverName = `${userId}/${file.originalname}`;
    const accessUrl = await FileController.gcsService
      .getSignedUrl(serverName)
      .catch((err) => {
        console.error(
          `Erro ao obter URL assinada para o arquivo ${serverName}:`,
          err
        );
      });

    return new File({
      accessUrl,
      userId,
      serverName,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      uploadDate: new Date(),
      folderId: folderId && folderId !== 'root' ? folderId : null,
      __v: 0,
    });
  }

  static async filterExistingFiles(
    files: Express.Multer.File[],
    userId: string
  ): Promise<Express.Multer.File[]> {
    const existenceChecks = await Promise.all(
      files.map((file) => {
        const serverName = `${userId}/${file.originalname}`;
        return File.exists({ serverName });
      })
    );

    return files.filter((_, index) => !existenceChecks[index]);
  }

  static uploadFile: RequestHandler<
    {},
    ResponseType<undefined>,
    FileUploadBody
  > = async (req, res: Response) => {
    try {
      const authenticatedRequest = req as AuthenticatedFileRequest;

      if (!authenticatedRequest.files?.length) {
        res.status(400).json({
          status: 400,
          message: 'Nenhum arquivo enviado',
          error: 'É necessário enviar pelo menos um arquivo',
        });
        return;
      }

      const userId = authenticatedRequest.user.id;
      const { folderId } = req.body;

      if (folderId && !(await this.validateFolderAccess(folderId, userId))) {
        res.status(403).json({
          status: 403,
          message: 'Acesso negado',
          error: 'Você não tem permissão para acessar esta pasta',
        });
        return;
      }

      const files = authenticatedRequest.files;
      await Promise.all(
        files.map((file) =>
          this.gcsService.uploadFile(file.originalname, file, userId)
        )
      );

      const newFiles = await this.filterExistingFiles(files, userId);
      const filesToDb = await Promise.all(
        newFiles.map((file) => this.createFileDocument(file, userId, folderId))
      );

      if (filesToDb.length > 0) {
        await File.bulkSave(filesToDb);
      }

      res.status(201).json({
        status: 201,
        message:
          filesToDb.length !== files.length
            ? 'Alguns arquivos já existem e não foram duplicados, verifique os nomes dos arquivos e tente novamente'
            : 'Arquivos enviados com sucesso',
      });
    } catch (error) {
      res.status(500).json({
        status: 500,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  static getFiles: RequestHandler<{}, ResponseType<IFileListResponse>, {}> =
    async (req, res) => {
      try {
        const authenticatedRequest = req as unknown as AuthenticatedFileRequest;
        const userId = authenticatedRequest.user.id;
        const files = await File.find({ userId }).sort({ uploadDate: -1 });

        for (const file of files) {
          if (isAccessUrlExpired(file.accessUrl)) {
            file.accessUrl = await this.gcsService.getSignedUrl(
              file.serverName
            );
            file.__v = file.__v ? file.__v + 1 : 1;
            await file.save();
          }
        }
        res.status(200).json({
          status: 200,
          message: 'ok',
          data: {
            files,
          },
        });
      } catch (error) {
        res.status(500).json({
          status: 500,
          message: 'Erro ao obter arquivos',
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };

  static getFile: RequestHandler<
    FileParams,
    ResponseType<IFileListResponse>,
    {}
  > = async (req, res) => {
    try {
      const authenticatedRequest = req as unknown as AuthenticatedFileRequest;
      const { fileId } = req.params;
      const file = await File.findById(fileId);

      if (!file) {
        res.status(404).json({
          status: 404,
          message: 'Arquivo não encontrado',
          error: 'Nenhum arquivo encontrado com o ID fornecido',
        });
        return;
      }

      if (
        !FileController.validateUserAccess(
          authenticatedRequest.user.id,
          file.userId.toString(),
          res
        )
      )
        return;

      if (isAccessUrlExpired(file.accessUrl)) {
        file.accessUrl = await this.gcsService.getSignedUrl(file.serverName);
      }

      file.__v = file.__v ? file.__v + 1 : 1;
      await file.save();
      res.status(200).json({
        status: 200,
        message: 'Arquivo obtido com sucesso',
        data: {
          files: {
            id: file._id,
            accessUrl: file.accessUrl,
            originalName: file.originalName,
            mimeType: file.mimeType,
            size: file.size,
            uploadDate: file.uploadDate,
            folderId: file.folderId,
          } as IFile,
        },
      });
    } catch (error) {
      res.status(500).json({
        status: 500,
        message: 'Erro ao obter arquivo',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  static deleteFile: RequestHandler<FileParams, ResponseType<undefined>, {}> =
    async (req, res: Response) => {
      try {
        const authenticatedRequest = req as unknown as AuthenticatedFileRequest;
        const { fileId } = req.params;
        const file = await File.findById(fileId);

        if (!file) {
          res.status(404).json({
            status: 404,
            message: 'Arquivo não encontrado',
            error: 'Nenhum arquivo encontrado com o ID fornecido',
          });
          return;
        }

        if (
          !FileController.validateUserAccess(
            authenticatedRequest.user.id,
            file.userId.toString(),
            res
          )
        )
          return;

        await this.gcsService.deleteFile(file.serverName);
        await file.deleteOne();

        res.status(200).json({
          status: 200,
          message: 'Arquivo deletado com sucesso',
        });
      } catch (error) {
        res.status(500).json({
          status: 500,
          message: 'Erro ao deletar arquivo',
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };

  static renameFile: RequestHandler<
    FileParams,
    ResponseType<IFileListResponse>,
    FileRenameBody
  > = async (req, res: Response) => {
    try {
      const authenticatedRequest = req as unknown as AuthenticatedFileRequest;
      const { fileId } = req.params;
      let { name: newName } = req.body;

      if (!newName) {
        res.status(400).json({
          status: 400,
          message: 'Nome do arquivo não fornecido',
          error: 'É necessário fornecer um novo nome para o arquivo',
        });
        return;
      }

      const file = await File.findById(fileId);
      if (!file) {
        res.status(404).json({
          status: 404,
          message: 'Arquivo não encontrado',
          error: 'Nenhum arquivo encontrado com o ID fornecido',
        });
        return;
      }

      if (
        !FileController.validateUserAccess(
          authenticatedRequest.user.id,
          file.userId.toString(),
          res
        )
      )
        return;

      const originalExt = file.originalName.split('.').pop();
      const newNameExt = newName.split('.').pop();

      if (!newNameExt || originalExt !== newNameExt) {
        newName = `${newName}.${originalExt}`;
      }

      const existingFile = await File.findOne({
        userId: file.userId,
        folderId: file.folderId,
        originalName: newName,
        _id: { $ne: fileId },
      });

      if (existingFile) {
        res.status(409).json({
          status: 409,
          message: 'Já existe um arquivo com este nome na pasta atual',
          error: 'Nome de arquivo duplicado',
        });
        return;
      }

      const newServerName = `${file.userId}/${newName}`;
      await this.gcsService.renameFile(file.serverName, newServerName);

      file.originalName = newName;
      file.serverName = newServerName;
      const accessUrl = await this.gcsService.getSignedUrl(file.serverName);
      file.accessUrl = accessUrl;
      file.__v = file.__v ? file.__v + 1 : 1;
      await file.save();

      res.status(200).json({
        status: 200,
        message: 'Arquivo renomeado com sucesso',
        data: {
          id: file._id,
          accessUrl,
          filename: file.originalName,
          originalName: file.originalName,
          mimeType: file.mimeType,
          size: file.size,
          uploadDate: file.uploadDate,
        },
      });
    } catch (error) {
      res.status(500).json({
        status: 500,
        message: 'Erro ao renomear arquivo',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  static moveFile: RequestHandler<
    FileParams,
    ResponseType<IFileListResponse>,
    FileMoveBody
  > = async (req, res: Response) => {
    try {
      const authenticatedRequest = req as unknown as AuthenticatedFileRequest;
      const userId = authenticatedRequest.user.id;
      const { fileId } = req.params;
      const { folderId } = req.body;

      const file = await File.findById(fileId);
      if (!file) {
        res.status(404).json({
          status: 404,
          message: 'Arquivo não encontrado',
          error: 'Nenhum arquivo encontrado com o ID fornecido',
        });
        return;
      }

      if (
        !FileController.validateUserAccess(userId, file.userId.toString(), res)
      )
        return;

      if (folderId) {
        const hasAccess = await FileController.validateFolderAccess(
          folderId,
          userId
        );
        if (!hasAccess) {
          res.status(403).json({
            status: 403,
            message: 'Acesso negado',
            error: 'Você não tem permissão para acessar esta pasta',
          });
          return;
        }
      }

      const existingFile = await File.findOne({
        userId,
        folderId: folderId || null,
        originalName: file.originalName,
        _id: { $ne: fileId },
      });

      if (existingFile) {
        res.status(409).json({
          status: 409,
          message: 'Já existe um arquivo com este nome na pasta de destino',
          error: 'Nome de arquivo duplicado',
        });
        return;
      }

      file.folderId = folderId
        ? new mongoose.Types.ObjectId(folderId)
        : undefined;
      if (isAccessUrlExpired(file.accessUrl)) {
        file.accessUrl = await this.gcsService.getSignedUrl(file.serverName);
      }
      file.__v = file.__v ? file.__v + 1 : 1;
      await file.save();

      res.status(200).json({
        status: 200,
        message: 'Arquivo movido com sucesso',
        data: {
          files: {
            id: file._id,
            accessUrl: file.accessUrl,
            originalName: file.originalName,
            mimeType: file.mimeType,
            size: file.size,
            uploadDate: file.uploadDate,
            folderId: file.folderId,
          } as IFile,
        },
      });
    } catch (error) {
      res.status(500).json({
        status: 500,
        message: 'Erro ao mover arquivo',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };
}
