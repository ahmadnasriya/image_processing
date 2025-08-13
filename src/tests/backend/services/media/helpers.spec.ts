import {
    handleMultipart,
    handleRaw,
} from '../../../../backend/services/media/helpers';
import fs from 'fs';
import { Busboy } from 'busboy';
import { PassThrough } from 'stream';
import { Request, Response } from 'express';

describe('Upload Handlers', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: jasmine.Spy;

    beforeEach(() => {
        req = {
            headers: {},
            query: {},
            pipe: jasmine.createSpy('pipe'),
            on: jasmine.createSpy('on').and.callFake(function (
                event: string,
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                callback: unknown
            ): Request {
                if (event === 'error') {
                    // do nothing
                }

                return {} as Request;
            }),
        };

        res = {
            status: jasmine.createSpy('status').and.returnValue({
                json: jasmine.createSpy('json'),
            }),
        };

        next = jasmine.createSpy('next');

        spyOn(fs, 'createWriteStream').and.callFake(() => {
            const stream = new PassThrough();
            setTimeout(() => stream.emit('finish'), 0);
            return stream as unknown as fs.WriteStream;
        });
    });

    it('handleRaw sets req.rawUpload and calls next on valid input', async () => {
        req.query!.fileName = 'test.jpg';
        req.headers!['content-type'] = 'image/jpeg';
        req.pipe = jasmine.createSpy('pipe').and.callFake((stream) => {
            // simulate data flow
            setTimeout(() => stream.emit('finish'), 0);
        });

        const contentLength = 123;
        const contentType = 'image/jpeg';

        await handleRaw(
            req as Request,
            res as Response,
            next,
            contentLength,
            contentType
        );

        expect(req.rawUpload).toBeDefined();
        expect(req.rawUpload!.originalName).toBe('test');
        expect(next).toHaveBeenCalled();
    });

    it('handleRaw responds 400 if fileName missing', async () => {
        const contentLength = 123;
        const contentType = 'image/jpeg';

        await handleRaw(
            req as Request,
            res as Response,
            next,
            contentLength,
            contentType
        );

        expect(res.status).toHaveBeenCalledWith(400);
        expect((res.status as jasmine.Spy)().json).toHaveBeenCalledWith(
            jasmine.objectContaining({
                error: jasmine.any(String),
            })
        );
        expect(next).not.toHaveBeenCalled();
    });

    it('handleMultipart sets req.rawUpload and calls next', (done) => {
        req.headers!['content-type'] =
            'multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW';

        const stream = new PassThrough();
        stream.end('file content');

        (req.pipe as jasmine.Spy).and.callFake((busboy: Busboy) => {
            // simulate Busboy file event
            busboy.emit('file', 'file', stream, {
                filename: 'test.jpg',
                mimeType: 'image/jpeg',
            });
            busboy.emit('finish');
        });

        const contentLength = 123;
        handleMultipart(req as Request, res as Response, next, contentLength);

        setTimeout(() => {
            expect(req.rawUpload).toBeDefined();
            expect(next).toHaveBeenCalled();
            done();
        }, 10);
    });

    it('handleMultipart responds 400 if no file received', (done) => {
        req.headers!['content-type'] =
            'multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW';

        (req.pipe as jasmine.Spy).and.callFake((busboy: Busboy) => {
            busboy.emit('finish');
        });

        const contentLength = 123;
        handleMultipart(req as Request, res as Response, next, contentLength);

        setTimeout(() => {
            expect(res.status).toHaveBeenCalledWith(400);
            expect((res.status as jasmine.Spy)().json).toHaveBeenCalledWith({
                error: 'No valid file uploaded',
            });
            done();
        }, 10);
    });

    it('handleRaw sets req.rawUpload and calls next on valid binary input', async () => {
        const contentType = (req.headers!['content-type'] = 'image/jpeg');
        const contentLength = 123;
        req.headers!['content-length'] = `${contentLength}`;
        req.query!.fileName = 'test.jpg';

        await handleRaw(
            req as Request,
            res as Response,
            next,
            contentLength,
            contentType
        );

        expect(req.rawUpload).toBeDefined();
        expect(req.rawUpload!.originalName).toBe('test');
        expect(next).toHaveBeenCalled();
    });
});
