import express from 'express';
import Busboy from 'busboy';

import fs from 'fs';
import path from 'path';

import mediaManager from './mediaManager';
import consts from '../../consts';
import HTTPError from '../../utils/HTTPError';

import type { Request, Response, NextFunction } from 'express';
import type {
    AcceptedExts,
    AcceptedMimes,
    Endpoint,
    EndpointMethod,
    FileName,
    FilePath,
    FileServeOptions,
    OriginalFileName,
} from '../../docs';

const mediaRouter = express.Router();

const controllers: Record<`v${number}`, Endpoint> = {
    v1: {
        media: {
            post: [
                async function preUpload(
                    req: Request,
                    res: Response,
                    next: NextFunction
                ) {
                    try {
                        // Parse the content type
                        const contentType = req.headers['content-type']
                            ?.split(';')[0]
                            .trim();
                        if (!contentType) {
                            return res
                                .status(400)
                                .json({ error: 'No content type' });
                        }

                        if (
                            !consts.ACCEPTED_MIMES.includes(
                                contentType as AcceptedMimes
                            ) &&
                            contentType !== 'multipart/form-data'
                        ) {
                            return res.status(400).json({
                                error: `Mime type ${contentType} is not accepted. Accepted types: ${consts.ACCEPTED_MIMES.join(', ')}`,
                            });
                        }

                        const contentLengthStr = req.headers['content-length'];
                        if (!contentLengthStr) {
                            return res
                                .status(400)
                                .json({ error: 'No content length' });
                        }

                        const contentLength = parseInt(contentLengthStr);
                        // Only allow up to 5MB
                        if (contentLength > 5 * 1024 * 1024) {
                            return res.status(400).json({
                                error: 'File is too large. Please an image smaller than 5MB',
                            });
                        }

                        if (contentType === 'multipart/form-data') {
                            await new Promise<void>((resolve, reject) => {
                                const busboy = Busboy({ headers: req.headers });

                                busboy.on('file', (name, file, info) => {
                                    const { filename, mimeType } = info;
                                    const ext = path
                                        .extname(filename)
                                        .toLowerCase()
                                        .replace('.', '') as AcceptedExts;

                                    const extMimeData = consts.MIME_DATA.find(
                                        (i) =>
                                            (
                                                i.extensions as unknown as string[]
                                            ).includes(ext)
                                    );
                                    if (!extMimeData) {
                                        return res.status(400).json({
                                            error: `File extension ${ext} is not allowed. Allowed extensions: ${consts.ACCEPTED_EXTS.join(', ')}`,
                                        });
                                    }

                                    if (extMimeData.type !== mimeType) {
                                        return res.status(400).json({
                                            error: `Mime type ${contentType} does not match the file extension ${ext}`,
                                        });
                                    }

                                    const originalName = filename.replace(
                                        `.${ext}`,
                                        ''
                                    ) as OriginalFileName;
                                    const tempFileName =
                                        `${originalName}-${Date.now()}` as FileName;
                                    const filePath = path.join(
                                        consts.TEMP_UPLOAD_DIR,
                                        `${tempFileName}.${ext}`
                                    ) as FilePath;

                                    file.pipe(fs.createWriteStream(filePath))
                                        .on('finish', () => {
                                            req.rawUpload = {
                                                type: 'multipart',
                                                fileName: tempFileName,
                                                originalName,
                                                extension: ext,
                                                tempFilePath: filePath,
                                                contentType: mimeType,
                                                contentLength: contentLength,
                                            };
                                        })
                                        .on('error', reject);
                                });

                                busboy.on('finish', resolve);
                                busboy.on('error', reject);

                                req.pipe(busboy);
                            });

                            next();
                        } else {
                            const fileName = req.query
                                .fileName as OriginalFileName;
                            if (!fileName) {
                                return res.status(400).json({
                                    error: `A binary upload requires a file name (fileName) parameter in the URL query`,
                                });
                            }

                            const ext = path
                                .extname(fileName)
                                .toLowerCase()
                                .replace('.', '') as AcceptedExts;
                            const extMimeData = consts.MIME_DATA.find((i) =>
                                (i.extensions as unknown as string[]).includes(
                                    ext
                                )
                            );
                            if (!extMimeData) {
                                return res.status(400).json({
                                    error: `File extension ${ext} is not allowed. Allowed extensions: ${consts.ACCEPTED_EXTS.join(', ')}`,
                                });
                            }

                            if (extMimeData.type !== contentType) {
                                return res.status(400).json({
                                    error: `Mime type ${contentType} does not match the file extension ${ext}`,
                                });
                            }

                            const originalName = fileName.replace(
                                `.${ext}`,
                                ''
                            ) as OriginalFileName;
                            const tempFileName =
                                `${originalName}-${Date.now()}` as FileName;
                            const filePath = path.join(
                                consts.TEMP_UPLOAD_DIR,
                                `${tempFileName}.${ext}`
                            ) as FilePath;

                            await new Promise<void>((resolve, reject) => {
                                const writeStream =
                                    fs.createWriteStream(filePath);
                                writeStream.on('finish', () => {
                                    req.rawUpload = {
                                        type: 'binary',
                                        fileName: tempFileName,
                                        originalName,
                                        extension: ext,
                                        tempFilePath: filePath,
                                        contentLength: contentLength,
                                        contentType: contentType,
                                    };
                                    resolve();
                                });

                                writeStream.on('error', (err) => {
                                    fs.unlink(filePath, () => reject(err));
                                });

                                req.on('error', reject);

                                req.pipe(writeStream);
                            });

                            next();
                        }
                    } catch (error) {
                        console.error(error);
                        res.status(500).json({
                            error:
                                error instanceof Error
                                    ? error.message
                                    : 'Something went wrong while validating the request',
                        });
                    }
                },

                async function postUpload(req: Request, res: Response) {
                    const rawUpload = req.rawUpload;
                    if (!rawUpload) {
                        return res
                            .status(400)
                            .json({ error: 'No file uploaded' });
                    }

                    try {
                        const data = await mediaManager.addMedia(rawUpload);
                        res.status(201).json({
                            message:
                                'Your image was uploaded successfully and is now available at the given url',
                            url: `/_api/v1/media/${data.id}?fileName=${encodeURIComponent(data.originalName)}`,
                        });
                    } catch (error) {
                        console.trace(error);

                        res.status(500).json({
                            error:
                                error instanceof Error
                                    ? error.message
                                    : 'Something went wrong while validating the request',
                        });
                    }
                },
            ],
        },

        'media/:mediaId': {
            get: [
                async function serveMedia(req: Request, res: Response) {
                    const mediaId = req.params.mediaId;

                    try {
                        const mediaMeta = mediaManager.getMediaMeta(mediaId);
                        if (!mediaMeta) {
                            return res.status(404).json({
                                error: `Media with id ${mediaId} does not exist`,
                            });
                        }

                        const options: FileServeOptions = {};
                        const query = req.query;

                        if ('size' in query) {
                            const [width_, height_] = (
                                query.size as string
                            ).split('x');
                            if (!(width_ && height_)) {
                                return res.status(400).json({
                                    error: `Invalid size parameter: ${query.size}`,
                                });
                            }

                            const width = parseInt(width_);
                            if (isNaN(width)) {
                                return res.status(400).json({
                                    error: `Invalid width parameter: ${width_}`,
                                });
                            }

                            const height = parseInt(height_);
                            if (isNaN(height)) {
                                return res.status(400).json({
                                    error: `Invalid height parameter: ${height_}`,
                                });
                            }

                            options.size = { width, height };
                        }

                        if ('rotate' in query) {
                            const rotate = parseInt(query.rotate as string);
                            if (isNaN(rotate)) {
                                return res.status(400).json({
                                    error: `Invalid rotate parameter: ${query.rotate}`,
                                });
                            }

                            options.rotate = rotate;
                        }

                        if ('quality' in query) {
                            const quality = parseInt(query.quality as string);
                            if (isNaN(quality)) {
                                return res.status(400).json({
                                    error: `Invalid quality parameter: ${query.quality}`,
                                });
                            }

                            options.quality = quality;
                        }

                        if ('flip' in query) {
                            const flip = query.flip;
                            if (flip !== 'true' && flip !== 'false') {
                                return res.status(400).json({
                                    error: `Invalid flip parameter: ${query.flip}`,
                                });
                            }

                            options.flip = query.flip === 'true';
                        }

                        if ('flop' in query) {
                            const flop = query.flop;
                            if (flop !== 'true' && flop !== 'false') {
                                return res.status(400).json({
                                    error: `Invalid flop parameter: ${query.flop}`,
                                });
                            }

                            options.flop = flop === 'true';
                        }

                        const stream = (await mediaManager.serveMedia(
                            mediaId,
                            options
                        ))!;
                        stream.pipe(res);
                    } catch (error) {
                        if (error instanceof HTTPError) {
                            return res
                                .status(error.status)
                                .json({ error: error.message });
                        }

                        console.error(error);
                        res.status(500).json({
                            error:
                                error instanceof Error
                                    ? error.message
                                    : 'Something went wrong while serving the file',
                        });
                    }
                },
            ],
        },
    },
};

for (const version in controllers) {
    const baseUrl = `/_api/${version}`;

    for (const endpoint in controllers[version as keyof typeof controllers]) {
        const EndpointData =
            controllers[version as keyof typeof controllers][endpoint];
        const url = `${baseUrl}/${endpoint}`;

        for (const method in EndpointData) {
            const handlers = EndpointData[method as keyof typeof EndpointData]!;
            mediaRouter[method as EndpointMethod](url, ...handlers);
        }
    }
}

export default mediaRouter;
