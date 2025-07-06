import mongoose, { Schema, Document } from 'mongoose';

export interface IFile extends Document {
    originalName: string;
    serverName: string;
    mimeType: string;
    size: number;
    accessUrl: string;
    userId: mongoose.Types.ObjectId;
    uploadDate: Date;
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
        required: true
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    uploadDate: {
        type: Date,
        default: Date.now
    }
},
{timestamps: true});

export const File = mongoose.model<IFile>('File', FileSchema);