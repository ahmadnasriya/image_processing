import request from 'supertest';
import server from '../../../../backend/server';
import fs from 'fs';
import path from 'path';

const baseUrl = '/_api/v1';

describe('Media API', () => {
    const testImagePath = path.join(
        __dirname,
        '../../../assets',
        'cats-9317796_640.jpg'
    );

    it('should upload a file via multipart/form-data', async () => {
        const response = await request(server)
            .post(`${baseUrl}/media`)
            .attach('file', testImagePath);

        expect(response.status).toBe(201);
        expect(response.body).toBeDefined();
        expect(response.body.url).toContain(
            `/_api/v1/media/${response.body.id}?fileName=`
        );
    });

    it('should return 400 if no file is uploaded', async () => {
        const response = await request(server).post(`${baseUrl}/media`);
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('The content type is missing');
    });

    it('should upload a binary file', async () => {
        const fileData = fs.readFileSync(testImagePath);
        const response = await request(server)
            .post(`${baseUrl}/media?fileName=test.jpg`)
            .set('content-type', 'image/jpeg')
            .send(fileData);

        expect(response.status).toBe(201);
        expect(response.body).toBeDefined();
        expect(response.body.url).toContain('fileName=test.jpg');
    });

    it('should serve an uploaded media file', async () => {
        // upload first
        const upload = await request(server)
            .post(`${baseUrl}/media?fileName=test.jpg`)
            .set('content-type', 'image/jpeg')
            .send(fs.readFileSync(testImagePath));

        const mediaId = upload.body.id;

        const response = await request(server).get(
            `${baseUrl}/media/${mediaId}`
        );
        expect(response.status).toBe(200);
        expect(response.body).toBeInstanceOf(Buffer);
    });
});
