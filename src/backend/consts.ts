import path from 'path';

/**
 * Upload directory
 * @constant
 */
const UPLOAD_DIR = path.resolve(__dirname, '../media');

/**
 * Temp upload directory
 * @constant
 */
const TEMP_UPLOAD_DIR = path.join(UPLOAD_DIR, 'temp');

/**
 * Thumbnail directory
 * @constant
 */
const THUMBNAIL_DIR = path.join(UPLOAD_DIR, 'thumbnails');

/**
 * Final upload directory
 * @constant
 */
const FINAL_UPLOAD_DIR = path.resolve(UPLOAD_DIR, 'uploads');

/**
 * Accepted mimetypes
 * @constant
 */
const ACCEPTED_MIMES = ['image/png', 'image/jpeg', 'image/jpg'] as const;

/**
 * Accepted extensions
 * @constant
 */
const ACCEPTED_EXTS = ['png', 'jpeg', 'jpg'] as const;

/**
 * Accepted mimetypes with extensions
 * @constant
 */
const MIME_DATA = [
    {
        type: 'image/png',
        extensions: ['png'],
    },
    {
        type: 'image/jpeg',
        extensions: ['jpeg', 'jpg'],
    },
    {
        type: 'image/jpg',
        extensions: ['jpg'],
    },
] as const;

const consts = {
    UPLOAD_DIR,
    TEMP_UPLOAD_DIR,
    FINAL_UPLOAD_DIR,
    ACCEPTED_MIMES,
    ACCEPTED_EXTS,
    MIME_DATA,
    THUMBNAIL_DIR,
};

export default consts;
