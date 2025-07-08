import { GetSignedUrlConfig, Storage } from '@google-cloud/storage';
import { Readable } from 'stream';

export class GCSService {
  private storage: Storage;
  private bucketName: string;

  constructor(bucketName: string) {
    this.storage = new Storage(
      {
        keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      }
    );
    this.bucketName = bucketName;
  }

  async uploadFile(fileName: string, multeFile: Express.Multer.File, userId: String): Promise<void> {
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(userId + "/" + fileName);

    const stream = file.createWriteStream({
      resumable: false,
      contentType: 'application/octet-stream',
    });    
    const readableStream = Readable.from(multeFile.buffer);
    readableStream.pipe(stream);
    await new Promise((resolve, reject) => {
      stream.on('error', (err) => {
        reject(err);
      });
      stream.on('finish', () => {
        resolve(fileName);
      });
    });
  }

  async deleteFile(fileName: string): Promise<void> {
    const bucket = this.storage.bucket(this.bucketName);
    await bucket.file(fileName).delete();
  }

  async getSignedUrl(fileName: string): Promise<string> {
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(fileName);
    const options: GetSignedUrlConfig = {
      version: 'v4',
      action: 'read',
      expires: Date.now() +  60 * 60 * 1000,
    };
    const [url] = await file.getSignedUrl(options);
    return url;
  }

  async renameFile(oldFileName: string, newFileName: string): Promise<void> {
    const bucket = this.storage.bucket(this.bucketName);
    const oldFile = bucket.file(oldFileName);
    const newFile = bucket.file(newFileName);

    await oldFile.rename(newFileName);

    const [exists] = await newFile.exists();
    if (!exists) {
      throw new Error(`Erro ao renomear o arquivo: ${oldFileName} para ${newFileName}`);
    }
  }
}