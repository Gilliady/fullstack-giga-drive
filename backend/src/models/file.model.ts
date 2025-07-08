import mongoose, { Schema, Document } from 'mongoose';

export interface IFile extends Document {
    originalName: string;
    serverName: string;
    mimeType: string;
    size: number;
    accessUrl: string;
    userId: mongoose.Types.ObjectId;
    uploadDate: Date;
    folderId?: mongoose.Types.ObjectId;
    __v?: number;
}

const FileSchema: Schema = new Schema({
    originalName: {
        type: String,
        required: true
    },
    serverName: {
        type: String,
        required: true,
        unique: true
    },
    mimeType: {
        type: String,
        required: true
    },
    size: {
        type: Number,
        required: true
    },
    accessUrl: {
        type: String,
        required: false,
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    uploadDate: {
        type: Date,
        default: Date.now
    },
    folderId: {
        type: Schema.Types.ObjectId,
        ref: 'Folder',
        default: null
    },
},
{timestamps: true, versionKey: '__v'});

FileSchema.pre<IFile>('save', async function(next) {
    if (!this.isModified('serverName')) {
        return next();
    }

    try {
        const fileExists = await mongoose.model('File').findOne({ serverName: this.serverName });
        if (fileExists) {
            throw new Error('Nome de arquivo já está em uso');
        }
        next();
    } catch (error) {
        next(error instanceof Error ? error : new Error('Erro ao verificar nome do arquivo'));
    }
});
export const File = mongoose.model<IFile>('File', FileSchema);