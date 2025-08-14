import sharp from 'sharp';
import fs from 'fs';
import consts from './consts';
import { Brand, Prettify } from '@nasriya/atomix';
import { RequestHandler } from 'express';

export type FilePath = Brand<
    `${OriginalFileName}-${number}.${AcceptedExts}`,
    'FilePath'
>;
export type FileName = Brand<`${OriginalFileName}-${number}`, 'FileName'>;
export type OriginalFileName = Brand<
    `${string}.${AcceptedExts}`,
    'OriginalFileName'
>;

export type FileServeQuery = {
    size?: `${number}x${number}`;
    width?: number;
    height?: number;
    rotate?: number;
    quality?: number;
    flip?: boolean;
    flop?: boolean;
};

export interface FileServeOptions {
    size?: {
        width?: number;
        height?: number;
    };
    rotate?: number;
    quality?: number;
    flip?: boolean;
    flop?: boolean;
}

export interface MediaFile {
    id: string;
    fileName: FileName;
    originalName: OriginalFileName;
    extension: AcceptedExts;
    filePath: FilePath;
    meta: sharp.Metadata;
    stats: fs.Stats;
}

export type MediaFilePublicMeta = Prettify<
    Pick<MediaFile, 'id' | 'originalName' | 'extension'> & {
        width: number;
        height: number;
        mimeType: AcceptedMimes;
    }
>;

export type AcceptedMimes = (typeof consts.ACCEPTED_MIMES)[number];
export type AcceptedExts =
    (typeof consts.MIME_DATA)[number]['extensions'][number];

export type RawUploadMeta = {
    type: 'binary' | 'multipart';
    fileName: FileName;
    tempFilePath: FilePath;
    originalName: OriginalFileName;
    extension: AcceptedExts;
    contentType: AcceptedMimes;
    contentLength: number;
};

export type HTTPMethod =
    | 'GET'
    | 'POST'
    | 'PUT'
    | 'DELETE'
    | 'PATCH'
    | 'HEAD'
    | 'OPTIONS'
    | 'TRACE'
    | 'CONNECT';
export type EndpointMethod = Lowercase<HTTPMethod> | 'use';
export type EndpointData = {
    [M in EndpointMethod]?: RequestHandler[];
};
export type Endpoint = Record<string, EndpointData>;

declare global {
    namespace Express {
        interface Request {
            rawUpload: RawUploadMeta;
        }
    }
}
