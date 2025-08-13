import atomix from '@nasriya/atomix';
import uuidx from '@nasriya/uuidx';
import consts from '../../consts';
import HTTPError from '../../utils/HTTPError';

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

import readline from 'readline';
import type {
    FileName,
    FilePath,
    FileServeOptions,
    MediaFile,
    RawUploadMeta,
} from '../../docs';

const hasOwnProperty = atomix.dataTypes.record.hasOwnProperty;

class MediaManager {
    readonly #_backupPath = path.join(consts.UPLOAD_DIR, 'meta.jsonl');
    readonly #_files: Map<string, MediaFile> = new Map();
    readonly #_writeStream: fs.WriteStream;
    #_initialized = false;

    constructor() {
        const thumbPath = path.join(consts.UPLOAD_DIR, 'thumbnails');
        fs.mkdirSync(consts.FINAL_UPLOAD_DIR, { recursive: true });
        fs.mkdirSync(consts.TEMP_UPLOAD_DIR, { recursive: true });
        fs.mkdirSync(thumbPath, { recursive: true });
        this.#_writeStream = fs.createWriteStream(this.#_backupPath, {
            flags: 'a',
        });

        process.on('exit', this.#_systemHelpers.cleanup);
        process.on('SIGINT', this.#_systemHelpers.cleanup); // Ctrl+C
        process.on('SIGTERM', this.#_systemHelpers.cleanup); // Termination signal

        // Optional: handle uncaught exceptions to close stream before exit
        process.on('uncaughtException', (err) => {
            console.error('Uncaught exception:', err);
            this.#_systemHelpers.cleanup();
        });

        // Optional: handle unhandled rejections similarly
        process.on('unhandledRejection', (reason) => {
            console.error('Unhandled rejection:', reason);
            this.#_systemHelpers.cleanup();
        });
    }

    readonly #_systemHelpers = {
        initContent: async () => {
            if (!fs.existsSync(this.#_backupPath)) {
                return;
            }

            const fileStream = fs.createReadStream(this.#_backupPath);
            const rl = readline.createInterface({
                input: fileStream,
                crlfDelay: Infinity,
            });

            for await (const line of rl) {
                try {
                    const obj = JSON.parse(line);
                    const { id, ...meta } = obj;
                    this.#_files.set(id, meta);
                } catch {
                    // Ignore malformed lines or handle errors
                }
            }
        },

        cleanup: async () => {
            if (!this.#_writeStream.destroyed) {
                this.#_writeStream.end(() => process.exit());
            } else {
                process.exit();
            }
        },
    };

    readonly #_helpers = {
        createMediaReadStream: (data: MediaFile, options: FileServeOptions) => {
            const isCustom = Object.keys(options).length > 0;

            if (isCustom) {
                const signature = atomix.http.btoa(JSON.stringify(options));
                const fileName = `${data.fileName}_${signature}.${data.extension}`;
                const filePath = path.join(
                    consts.UPLOAD_DIR,
                    'thumbnails',
                    fileName
                );

                if (!fs.existsSync(filePath)) {
                    let image = sharp(data.filePath);

                    if (options!.size) {
                        image = image.resize({
                            width: options!.size.width,
                            height: options!.size.height,
                        });
                    }

                    if (options.rotate) {
                        image = image.rotate(options.rotate);
                    }

                    if (options.flip) {
                        image = image.flip();
                    }

                    if (options.flop) {
                        image = image.flop();
                    }

                    if (options.quality) {
                        const ext = path.extname(filePath).replace('.', '') as
                            | `png`
                            | `jpeg`
                            | `jpg`;
                        image = image[ext === 'png' ? 'png' : 'jpeg']({
                            quality: options.quality,
                        });
                    }

                    // Save processed file and return read stream
                    return image
                        .toFile(filePath)
                        .then(() => fs.createReadStream(filePath));
                }

                // Return a stream of the already processed file
                return fs.createReadStream(filePath);
            }

            // Return a stream of the original file
            return fs.createReadStream(data.filePath);
        },
    };

    /**
     * Adds a media file to the collection by moving it from the temporary upload directory
     * to the final upload directory, extracting its metadata and stats, and storing them.
     *
     * @param {RawUploadMeta} rawData - The raw upload data.
     *
     * @returns {Promise<MediaFile>} A promise that resolves to the media file object containing
     * the file's id, fileName, metadata, and stats.
     *
     * @throws {Error} If the file does not exist in the temporary upload directory or if
     * there is an error during the process of adding the media.
     */
    async addMedia(rawData: RawUploadMeta): Promise<MediaFile> {
        const id = uuidx.v5('nasriya.net', rawData.fileName);
        const fileName = `${id}_${rawData.originalName}` as FileName;
        const filePath = path.join(
            consts.FINAL_UPLOAD_DIR,
            `${fileName}.${rawData.extension}`
        ) as FilePath;

        try {
            const exist = fs.existsSync(path.join(rawData.tempFilePath));
            if (!exist) {
                throw new Error(
                    `Unable to find file: ${filePath} in the temp upload directory`
                );
            }

            // Attempt to move the file to the uploads directory
            await fs.promises.rename(rawData.tempFilePath, filePath);

            const [meta, stats] = await Promise.all([
                sharp(filePath).metadata(),
                fs.promises.stat(filePath),
            ]);

            const data: MediaFile = {
                id,
                fileName,
                originalName: rawData.originalName,
                filePath,
                extension: rawData.extension,
                meta,
                stats,
            };

            this.#_files.set(id, data);
            this.#_writeStream.write(`${JSON.stringify(data)}\n`);

            return data;
        } catch (error) {
            if (error instanceof Error) {
                error.message = `Unable to add media: ${error.message}`;
            }

            throw error;
        }
    }

    /**
     * Retrieves the metadata of a media file by its id from the collection.
     *
     * @param {string} mediaId The id of the media file to retrieve.
     *
     * @returns {MediaFile | undefined} The metadata of the media file if it exists, otherwise undefined.
     */
    getMediaMeta(mediaId: string): MediaFile | undefined {
        return this.#_files.get(mediaId);
    }

    /**
     * Serves a media file from the collection. The file is processed according to the given options.
     *
     * @param {string} mediaId The id of the media file to serve.
     * @param {FileServeOptions} [options] The processing options for the file.
     *
     * @returns {Promise<fs.ReadStream | null>} A promise that resolves to a read stream of the file if it exists, otherwise null.
     *
     * @throws {Error} If the file does not exist in the collection.
     * @throws {Error} If the options object is not a record.
     * @throws {Error} If the size option is not a record with a width and a height.
     * @throws {Error} If the width or height options are not positive numbers.
     * @throws {Error} If the rotate option is not a positive number between 0 and 360.
     * @throws {Error} If the quality option is not a positive number between 0 and 100.
     * @throws {Error} If the flip or flop options are not booleans.
     */
    async serveMedia(
        mediaId: string,
        options?: FileServeOptions
    ): Promise<fs.ReadStream | null> {
        try {
            const data = this.getMediaMeta(mediaId);
            if (!data) {
                return null;
            }

            const configs: FileServeOptions = {};

            if (options !== undefined) {
                const argsError = new HTTPError('', {
                    status: 400,
                    code: 'ARGUMENT_ERROR',
                });

                if (!atomix.valueIs.record(options)) {
                    argsError.message = `The options object (when provided) must be a record, but instead received: ${typeof options}`;
                    throw argsError;
                }

                if (hasOwnProperty(options, 'size')) {
                    const size = options.size;
                    if (!atomix.valueIs.record(size)) {
                        argsError.message = `The size option must be a record, but instead received: ${typeof size}`;
                        throw argsError;
                    }

                    const hasWidth = hasOwnProperty(size, 'width');
                    const hasHeight = hasOwnProperty(size, 'height');

                    if (hasWidth) {
                        const width = size.width;
                        if (!atomix.valueIs.number(width)) {
                            argsError.message = `The width option must be a number, but instead received: ${typeof width}`;
                            throw argsError;
                        }

                        if (!atomix.valueIs.positiveNumber(width)) {
                            argsError.message = `The width option must be a positive number, but instead received: ${width}`;
                            throw argsError;
                        }
                    }

                    if (hasHeight) {
                        const height = size.height;
                        if (!atomix.valueIs.number(height)) {
                            argsError.message = `The height option must be a number, but instead received: ${typeof height}`;
                            throw argsError;
                        }

                        if (!atomix.valueIs.positiveNumber(height)) {
                            argsError.message = `The height option must be a positive number, but instead received: ${height}`;
                            throw argsError;
                        }
                    }

                    const cSize: { width?: number; height?: number } = {};
                    if (size.width! < data.meta.width) {
                        cSize.width = options.size!.width;
                    }

                    if (size.height! < data.meta.height) {
                        cSize.height = options.size!.height;
                    }

                    if (Object.keys(cSize).length > 0) {
                        configs.size = cSize;
                    }
                }

                if (hasOwnProperty(options, 'rotate')) {
                    const rotate = options.rotate;
                    if (!atomix.valueIs.number(rotate)) {
                        argsError.message = `The rotate option must be a number, but instead received: ${typeof rotate}`;
                        throw argsError;
                    }

                    if (!atomix.valueIs.positiveNumber(rotate)) {
                        argsError.message = `The rotate option must be a positive number, but instead received: ${rotate}`;
                        throw argsError;
                    }

                    if (rotate > 360) {
                        argsError.message = `The rotate option must be a number between 0 and 360, but instead received: ${rotate}`;
                        throw argsError;
                    }

                    // Only apply if it changes the image
                    if (rotate !== 0 && rotate !== 360) {
                        configs.rotate = rotate;
                    }
                }

                if (hasOwnProperty(options, 'quality')) {
                    const quality = options.quality;
                    if (!atomix.valueIs.number(quality)) {
                        argsError.message = `The quality option must be a number, but instead received: ${typeof quality}`;
                        throw argsError;
                    }

                    if (!atomix.valueIs.positiveNumber(quality)) {
                        argsError.message = `The quality option must be a positive number, but instead received: ${quality}`;
                        throw argsError;
                    }

                    if (quality > 100) {
                        argsError.message = `The quality option must be a number between 0 and 100, but instead received: ${quality}`;
                        throw argsError;
                    }

                    configs.quality = quality;
                }

                if (hasOwnProperty(options, 'flip')) {
                    const flip = options.flip;
                    if (typeof flip !== 'boolean') {
                        argsError.message = `The flip option must be a boolean, but instead received: ${typeof flip}`;
                        throw argsError;
                    }

                    configs.flip = flip;
                }

                if (hasOwnProperty(options, 'flop')) {
                    const flop = options.flop;
                    if (typeof flop !== 'boolean') {
                        argsError.message = `The flop option must be a boolean, but instead received: ${typeof flop}`;
                        throw argsError;
                    }

                    configs.flop = flop;
                }
            }

            return this.#_helpers.createMediaReadStream(data, configs);
        } catch (error) {
            if (error instanceof Error) {
                error.message = `Error while serving file: ${error.message}`;
            }

            throw error;
        }
    }

    /**
     * Initializes the media manager.
     *
     * This function is called when the media manager is first accessed. It
     * initializes the media manager by loading the content from the disk.
     *
     * @returns {Promise<void>}
     * @private
     */
    async _init() {
        if (this.#_initialized) {
            return;
        }
        this.#_initialized = true;
        await this.#_systemHelpers.initContent();
    }
}

const mediaManager = new MediaManager();
await mediaManager._init();
export default mediaManager;
