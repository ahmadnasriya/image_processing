import fs from 'fs';
import path from 'path';
import mediaManager from '../../../../backend/services/media/mediaManager';
import type {
    FileName,
    FilePath,
    OriginalFileName,
    RawUploadMeta,
} from '../../../../backend/docs';
import consts from '../../../../backend/consts';

const tinyImg = path.join(
    __dirname,
    '../../../assets',
    'cats-9317796_640.jpg'
) as FilePath;

describe('MediaManager', () => {
    const rawData: RawUploadMeta = {
        type: 'binary',
        fileName: 'test.jpg' as FileName,
        originalName: 'test' as OriginalFileName,
        extension: 'jpg',
        tempFilePath: path.join(consts.TEMP_UPLOAD_DIR, 'test.jpg') as FilePath,
        contentLength: 123,
        contentType: 'image/jpeg',
    };

    beforeEach(() => {
        fs.copyFileSync(tinyImg, rawData.tempFilePath);
    });

    afterAll(() => {
        if (fs.existsSync(rawData.tempFilePath)) {
            fs.unlinkSync(rawData.tempFilePath);
        }
    });

    it('adds media and returns correct metadata', async () => {
        const media = await mediaManager.addMedia(rawData);
        expect(media.id).toBeDefined();
        expect(media.originalName).toBe('test');
        expect(media.extension).toBe('jpg');
        expect(fs.existsSync(media.filePath)).toBeTrue();
    });

    it('retrieves media metadata', async () => {
        const media = await mediaManager.addMedia(rawData);
        const meta = mediaManager.getMediaMeta(media.id);
        expect(meta).toBeDefined();
        expect(meta!.fileName).toBe(media.fileName);
    });

    it('serves original file without options', async () => {
        const media = await mediaManager.addMedia(rawData);
        const stream = await mediaManager.serveMedia(media.id);
        expect(stream).not.toBeNull();
        // Optionally, read stream to check it's a buffer
        const chunks: Buffer[] = [];
        if (stream) {
            for await (const chunk of stream) {
                chunks.push(chunk as Buffer);
            }
        }
        expect(Buffer.concat(chunks).length).toBeGreaterThan(0);
    });

    it('applies resize and rotate options', async () => {
        const media = await mediaManager.addMedia(rawData);
        const stream = await mediaManager.serveMedia(media.id, {
            size: { width: 1, height: 1 },
            rotate: 90,
        });
        expect(stream).not.toBeNull();
        const chunks: Buffer[] = [];
        if (stream) {
            for await (const chunk of stream) {
                chunks.push(chunk as Buffer);
            }
        }
        expect(Buffer.concat(chunks).length).toBeGreaterThan(0);
    });
});
