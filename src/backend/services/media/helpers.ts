import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import Busboy from 'busboy';
import consts from '../../consts';
import type {
    AcceptedExts,
    AcceptedMimes,
    FileName,
    FilePath,
    OriginalFileName,
} from '../../docs';

function handleMultipart(
    req: Request,
    res: Response,
    next: NextFunction,
    contentLength: number
): void {
    const busboy = Busboy({ headers: req.headers });
    const uploads: Promise<void>[] = [];
    let fileReceived = false;

    busboy.on('file', (_, stream, info) => {
        const { filename, mimeType } = info;
        const ext = path
            .extname(filename)
            .slice(1)
            .toLowerCase() as AcceptedExts;

        // validation here...
        fileReceived = true;

        const originalName = filename.replace(
            `.${ext}`,
            ''
        ) as OriginalFileName;
        const tempName = `${originalName}-${Date.now()}` as FileName;
        const filePath = path.join(
            consts.TEMP_UPLOAD_DIR,
            tempName
        ) as FilePath;

        req.rawUpload = {
            type: 'multipart',
            fileName: tempName,
            originalName,
            extension: ext,
            tempFilePath: filePath,
            contentType: mimeType as AcceptedMimes,
            contentLength,
        };

        uploads.push(
            new Promise<void>((resolve, reject) => {
                stream
                    .pipe(fs.createWriteStream(filePath))
                    .on('finish', resolve)
                    .on('error', reject);
            })
        );
    });

    busboy.on('finish', () => {
        if (!fileReceived) {
            return res.status(400).json({ error: 'No valid file uploaded' });
        }
        Promise.all(uploads)
            .then(() => next())
            .catch((err) => next(err));
    });

    busboy.on('error', next);
    req.pipe(busboy);
}

async function handleRaw(
    req: Request,
    res: Response,
    next: NextFunction,
    contentLength: number,
    contentType: AcceptedMimes
): Promise<Response | void> {
    const fileName = req.query.fileName as OriginalFileName;
    if (!fileName) {
        return res.status(400).json({
            error: `A binary upload requires a file name (fileName) parameter in the URL query`,
        });
    }

    const ext = path.extname(fileName).slice(1).toLowerCase() as AcceptedExts;
    const extMimeData = consts.MIME_DATA.find((i) =>
        (i.extensions as unknown as string[]).includes(ext)
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

    const originalName = fileName.replace(`.${ext}`, '') as OriginalFileName;
    const tempFileName = `${originalName}-${Date.now()}` as FileName;
    const filePath = path.join(
        consts.TEMP_UPLOAD_DIR,
        `${tempFileName}.${ext}`
    ) as FilePath;

    await new Promise<void>((resolve, reject) => {
        const writeStream = fs.createWriteStream(filePath);
        writeStream.on('finish', () => {
            req.rawUpload = {
                type: 'binary',
                fileName: tempFileName,
                originalName,
                extension: ext,
                tempFilePath: filePath,
                contentLength,
                contentType,
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

export { handleMultipart, handleRaw };
