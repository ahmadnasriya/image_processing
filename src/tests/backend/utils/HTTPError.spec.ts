import HTTPError from '../../../backend/utils/HTTPError';

describe('HTTPError', () => {
    it('should create an instance with default code', () => {
        const err = new HTTPError('Something went wrong', { status: 400 });

        expect(err).toBeInstanceOf(Error);
        expect(err.message).toBe('Something went wrong');
        expect(err.status).toBe(400);
        expect(err.code).toBe('HTTP_ERROR');
        expect(err.stack).toBeDefined();
    });

    it('should set a custom code if provided', () => {
        const err = new HTTPError('Unauthorized', {
            status: 401,
            code: 'UNAUTHORIZED',
        });

        expect(err.message).toBe('Unauthorized');
        expect(err.status).toBe(401);
        expect(err.code).toBe('UNAUTHORIZED');
    });

    it('should allow changing the message via setter', () => {
        const err = new HTTPError('Initial', { status: 500 });
        err.message = 'Updated message';

        expect(err.message).toBe('Updated message');
    });

    it('should throw when trying to set readonly properties', () => {
        const err = new HTTPError('Test', { status: 502, code: 'BAD_GATEWAY' });

        expect(() => {
            // @ts-expect-error readonly
            err.status = 200;
        }).toThrow();

        expect(() => {
            // @ts-expect-error readonly
            err.code = 'OK';
        }).toThrow();
    });

    it('stack trace should exist', () => {
        const err = new HTTPError('Stack test', { status: 500 });
        expect(err.stack).toContain('HTTPError');
    });
});
