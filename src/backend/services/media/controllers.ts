import express from 'express';

import mediaManager from './mediaManager';
import consts from '../../consts';
import HTTPError from '../../utils/HTTPError';
import { handleMultipart, handleRaw } from './helpers';

import type { Request, Response, NextFunction } from 'express';
import type {
    AcceptedExts,
    AcceptedMimes,
    Endpoint,
    EndpointMethod,
    FileServeOptions,
    MediaFilePublicMeta,
} from '../../docs';

const mediaRouter = express.Router();

function parseDimension(value: string, name: string): number {
    const argErr = new HTTPError('', { status: 400, code: 'ARGUMENT_ERROR' });
    const num = parseInt(value, 10);

    if (isNaN(num)) {
        argErr.message = `The "${name}" parameter must be a valid integer, but received "${value}".`;
        throw argErr;
    }

    if (String(num) !== value) {
        argErr.message = `The "${name}" parameter must be a whole number without decimals or extra characters. Received: "${value}".`;
        throw argErr;
    }

    if (num <= 0) {
        argErr.message = `The "${name}" parameter must be a positive number, but received "${value}".`;
        throw argErr;
    }

    return num;
}

const controllers: Record<`v${number}`, Endpoint> = {
    v1: {
        media: {
            post: [
                async function preUpload(
                    req: Request,
                    res: Response,
                    next: NextFunction
                ): Promise<Response | undefined> {
                    try {
                        // Parse the content type
                        const contentType = req.headers['content-type']
                            ?.split(';')[0]
                            .trim();
                        if (!contentType) {
                            return res
                                .status(400)
                                .json({ error: `The content type is missing` });
                        }

                        if (
                            !consts.ACCEPTED_MIMES.includes(
                                contentType as AcceptedMimes
                            ) &&
                            contentType !== 'multipart/form-data'
                        ) {
                            return res.status(415).json({
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
                            handleMultipart(req, res, next, contentLength);
                        } else {
                            handleRaw(
                                req,
                                res,
                                next,
                                contentLength,
                                contentType as AcceptedMimes
                            );
                        }
                    } catch (error) {
                        res.status(500).json({
                            error:
                                error instanceof Error
                                    ? error.message
                                    : 'Something went wrong while validating the request',
                        });
                    }
                },

                async function postUpload(
                    req: Request,
                    res: Response
                ): Promise<Response | void> {
                    const rawUpload = req.rawUpload;
                    if (!rawUpload) {
                        return res
                            .status(400)
                            .json({ error: 'No file uploaded' });
                    }

                    try {
                        const data = await mediaManager.addMedia(rawUpload);
                        res.status(201).json({
                            status: 'success',
                            id: data.id,
                            url: `/_api/v1/media/${data.id}?fileName=${encodeURIComponent(data.originalName)}.${data.extension}`,
                            width: data.meta.width,
                            height: data.meta.height,
                            message:
                                'Your image was uploaded successfully and is now available at the given url',
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

        'media/:mediaId/meta': {
            get: [
                async (
                    req: Request,
                    res: Response
                ): Promise<Response | void> => {
                    const mediaId = req.params.mediaId;

                    const mediaMeta = mediaManager.getMediaMeta(mediaId);
                    if (!mediaMeta) {
                        return res.status(404).json({
                            error: `Media with id ${mediaId} does not exist`,
                        });
                    }

                    if (!mediaMeta.id) {
                        return res.status(500).json({
                            error: `Media with id ${mediaId} does not exist`,
                        });
                    }

                    const meta: MediaFilePublicMeta = {
                        id: mediaId,
                        originalName: mediaMeta.originalName,
                        extension: mediaMeta.extension,
                        width: mediaMeta.meta.width,
                        height: mediaMeta.meta.height,
                        mimeType: `image/${mediaMeta.meta.format as AcceptedExts}`,
                    };

                    res.json(meta);
                },
            ],
        },

        'media/:mediaId': {
            get: [
                async function serveMedia(
                    req: Request,
                    res: Response
                ): Promise<Response | void> {
                    const mediaId = req.params.mediaId;
                    const badReqErr = new HTTPError('Bad Request', {
                        status: 400,
                        code: 'ARGUMENT_ERROR',
                    });

                    try {
                        const mediaMeta = mediaManager.getMediaMeta(mediaId);
                        if (!mediaMeta) {
                            const err = new HTTPError(
                                `Media with id ${mediaId} does not exist`,
                                {
                                    status: 404,
                                    code: 'MEDIA_NOT_FOUND',
                                }
                            );

                            throw err;
                        }

                        const options: FileServeOptions = {};
                        const query = req.query;

                        if ('size' in query) {
                            const [widthStr, heightStr] = (
                                query.size as string
                            ).split('x');

                            if (!(widthStr && heightStr)) {
                                badReqErr.message = `Invalid size parameter: ${query.size}`;
                                throw badReqErr;
                            }

                            options.size = {
                                width: parseDimension(widthStr, 'width'),
                                height: parseDimension(heightStr, 'height'),
                            };
                        } else {
                            const qWidth = query.width as string;
                            const qHeight = query.height as string;

                            const width = query.width
                                ? parseDimension(qWidth, 'width')
                                : undefined;
                            const height = query.height
                                ? parseDimension(qHeight, 'height')
                                : undefined;

                            if (width !== undefined || height !== undefined) {
                                options.size = {};
                                if (width !== undefined)
                                    options.size.width = width;
                                if (height !== undefined)
                                    options.size.height = height;
                            }
                        }

                        if ('rotate' in query) {
                            const rotate = parseInt(query.rotate as string, 10);

                            if (isNaN(rotate)) {
                                badReqErr.message = `The "rotate" parameter must be a valid integer between 0 and 360 degrees. Received: "${query.rotate}".`;
                                throw badReqErr;
                            }

                            if (String(rotate) !== query.rotate) {
                                badReqErr.message = `The "rotate" parameter must be a whole number without decimals or extra characters. Received: "${query.rotate}".`;
                                throw badReqErr;
                            }

                            if (rotate < 0 || rotate > 360) {
                                badReqErr.message = `The "rotate" parameter must be between 0 and 360 degrees inclusive. Received: "${rotate}".`;
                                throw badReqErr;
                            }

                            options.rotate = rotate;
                        }

                        if ('quality' in query) {
                            const queryQuality = query.quality as string;
                            const quality = parseInt(queryQuality);

                            if (isNaN(quality)) {
                                badReqErr.message = `The "quality" parameter must be a valid integer between 0 and 100. Received: "${query.quality}".`;
                                throw badReqErr;
                            }

                            if (String(quality) !== queryQuality) {
                                badReqErr.message = `The "quality" parameter must be a whole number without decimals or extra characters. Received: "${query.quality}".`;
                                throw badReqErr;
                            }

                            if (quality < 1 || quality > 100) {
                                badReqErr.message = `The "quality" parameter must be between 1 and 100 inclusive. Received: "${quality}".`;
                                throw badReqErr;
                            }

                            options.quality = quality;
                        }

                        if ('flip' in query) {
                            const flip = query.flip;
                            if (flip !== 'true' && flip !== 'false') {
                                badReqErr.message = `The "flip" parameter must be either "true" (vertical flip) or "false" (no vertical flip). Received: "${flip}".`;
                                throw badReqErr;
                            }

                            options.flip = flip === 'true';
                        }

                        if ('flop' in query) {
                            const flop = query.flop;
                            if (flop !== 'true' && flop !== 'false') {
                                badReqErr.message = `The "flop" parameter must be either "true" (horizontal flip) or "false" (no horizontal flip). Received: "${flop}".`;
                                throw badReqErr;
                            }

                            options.flop = flop === 'true';
                        }

                        res.setHeader(
                            'Content-Type',
                            `image/${mediaMeta.extension}`
                        );

                        const stream = (await mediaManager.serveMedia(
                            mediaId,
                            options
                        ))!;
                        stream.pipe(res);
                    } catch (error) {
                        if (error instanceof HTTPError) {
                            return res.status(error.status).json({
                                error: error.message,
                                code: error.code,
                            });
                        }

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
