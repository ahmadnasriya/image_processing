import type { MediaFilePublicMeta } from '../../../../../backend/docs';
import type {
    ImageConfigs,
    EditorChangeHandler,
    AppElements,
} from '../../../../docs';

const baseUrl = '/_api/v1';

class ImageEditor {
    readonly #_elements: AppElements;
    readonly #_original: MediaFilePublicMeta;
    readonly #_configs: ImageConfigs = {
        width: 0,
        height: 0,
        rotate: 0,
        flip: false,
        flop: false,
        quality: 100,
    };

    readonly #_handlers = {
        userHandler: null as EditorChangeHandler | null,
        systemHandler: () => {
            const url = this.url;
            this.#_handlers.userHandler?.(url);
        },
    };

    constructor(original: MediaFilePublicMeta, elements: AppElements) {
        this.#_original = original;
        this.#_elements = elements;

        this.#_configs.width = original.width;
        this.#_configs.height = original.height;
        this.#_configs.quality = 100;
        this.#_configs.rotate = 0;
        this.#_configs.flip = false;
        this.#_configs.flop = false;
    }

    /**
     * Retrieves the current configurations of the image editor, which are
     * a shallow copy of the internal configurations object.
     *
     * @returns {ImageConfigs} The current configurations of the image editor.
     */
    get configs(): ImageConfigs {
        return this.#_configs;
    }

    /**
     * Retrieves the original metadata of the media file.
     *
     * @returns {MediaFilePublicMeta} The original metadata object.
     */
    get original(): MediaFilePublicMeta {
        return this.#_original;
    }

    /**
     * Constructs and returns the URL for the media file with applied configurations.
     * The URL includes query parameters for size, quality, rotation, flip, and flop settings.
     *
     * @returns {string} The URL string with query parameters.
     */
    get url(): string {
        const configs = this.#_configs;
        const query: Record<string, string> = {};

        if (configs.width && configs.width !== this.#_original.width) {
            query.width = configs.width.toString();
        }

        if (configs.height && configs.height !== this.#_original.height) {
            query.height = configs.height.toString();
        }

        if (configs.quality && configs.quality !== 100) {
            query.quality = configs.quality.toString();
        }

        if (configs.rotate) {
            query.rotate = configs.rotate.toString();
        }

        if (configs.flip) {
            query.flip = 'true';
        }

        if (configs.flop) {
            query.flop = 'true';
        }

        const windowBaseUrl = `${window.location.protocol}//${window.location.host}${baseUrl}`;
        const urlStr = `${windowBaseUrl}/media/${this.#_original.id}`;
        const url = new URL(urlStr);
        url.search = new URLSearchParams(query).toString();
        return url.toString();
    }

    /**
     * Returns a boolean indicating whether the current image configurations match the original media file's properties.
     *
     * @returns {boolean} True if the current configurations match the original media file, false otherwise.
     */
    get isOriginal(): boolean {
        return (
            this.#_configs.width === this.#_original.width &&
            this.#_configs.height === this.#_original.height &&
            this.#_configs.quality === 100 &&
            this.#_configs.rotate === 0 &&
            !this.#_configs.flip &&
            !this.#_configs.flop
        );
    }

    /**
     * Registers a user-defined handler function to be called whenever
     * the image configurations change. This handler will receive the
     * updated media URL with applied configurations as its argument.
     *
     * @param {EditorChangeHandler} handler - The function to be invoked on configuration changes.
     */
    onChange(handler: EditorChangeHandler) {
        this.#_handlers.userHandler = handler;
    }

    /**
     * Resets the image configurations to their original values.
     * This includes width, height, quality, rotation, flip, and flop settings.
     * Invokes the system handler to update the image URL and notify any registered handlers.
     *
     * @returns {this} Returns the instance for method chaining.
     */

    reset(): this {
        this.#_configs.width = this.#_original.width;
        this.#_configs.height = this.#_original.height;
        this.#_configs.quality = 100;
        this.#_configs.rotate = 0;
        this.#_configs.flip = false;
        this.#_configs.flop = false;

        this.#_elements.size.width.value = this.#_original.width.toString();
        this.#_elements.size.height.value = this.#_original.height.toString();
        this.#_elements.quality.num.value = '100';
        this.#_elements.quality.slider.value = '100';

        this.#_handlers.systemHandler();
        return this;
    }

    /**
     * Sets the width configuration for the image. Validates the input to ensure it is a number.
     * Updates the image URL with the new width and invokes the system handler.
     *
     * @param {number} width - The new width value to set for the image.
     * @throws {TypeError} Throws an error if the provided width is not a number.
     * @throws {RangeError} Throws an error if the provided width is not greater than 0 or is greater than the original width.
     * @returns {this} Returns the instance for method chaining.
     */
    setWidth(width: number): this {
        if (typeof width !== 'number' || isNaN(width)) {
            throw new TypeError('Width must be a number');
        }

        if (width <= 0) {
            throw new RangeError('Width must be greater than 0');
        }

        if (width > this.#_original.width) {
            throw new RangeError(
                `Width cannot be greater than original width (${this.#_original.width})`
            );
        }

        if (width !== this.#_configs.width) {
            this.#_configs.width = width;
            this.#_handlers.systemHandler();
        }

        return this;
    }

    /**
     * Sets the height configuration for the image. Validates the input to ensure it is a number.
     * Updates the image URL with the new height and invokes the system handler.
     *
     * @param {number} height - The new height value to set for the image.
     * @throws {TypeError} Throws an error if the provided height is not a number.
     * @throws {RangeError} Throws an error if the provided height is not greater than 0 or is greater than the original height.
     * @returns {this} Returns the instance for method chaining.
     */
    setHeight(height: number): this {
        if (typeof height !== 'number' || isNaN(height)) {
            throw new TypeError('Height must be a number');
        }

        if (height <= 0) {
            throw new RangeError('Height must be greater than 0');
        }

        if (height > this.#_original.height) {
            throw new RangeError(
                `Height cannot be greater than original height (${this.#_original.height})`
            );
        }

        if (height !== this.#_configs.height) {
            this.#_configs.height = height;
            this.#_handlers.systemHandler();
        }

        return this;
    }

    /**
     * Sets the rotation angle for the image. Validates the input to ensure it is a number
     * within the acceptable range. Updates the image configuration and invokes the system handler.
     *
     * @param {number} angle - The rotation angle in degrees.
     * @throws {TypeError} Throws an error if the provided angle is not a number.
     * @throws {RangeError} Throws an error if the provided angle is not between 0 and 360.
     * @returns {this} Returns the instance for method chaining.
     */
    rotate(angle: number): this {
        if (typeof angle !== 'number' || isNaN(angle)) {
            throw new TypeError('Angle must be a number');
        }

        if (angle < 0 || angle > 360) {
            throw new RangeError('Angle must be between 0 and 360');
        }

        if (angle !== this.#_configs.rotate) {
            this.#_configs.rotate = angle;
            this.#_handlers.systemHandler();
        }

        return this;
    }

    /**
     * Sets the quality configuration for the image. Validates the input to ensure it is a number
     * within the acceptable range. Updates the image configuration and invokes the system handler.
     *
     * @param {number} quality - The quality value to set for the image.
     * @throws {TypeError} Throws an error if the provided quality is not a number.
     * @throws {RangeError} Throws an error if the provided quality is not between 0 and 100.
     * @returns {this} Returns the instance for method chaining.
     */
    setQuality(quality: number): this {
        if (typeof quality !== 'number' || isNaN(quality)) {
            throw new TypeError('Quality must be a number');
        }

        if (quality < 0 || quality > 100) {
            throw new RangeError('Quality must be between 0 and 100');
        }

        if (quality !== this.#_configs.quality) {
            this.#_configs.quality = quality;
            this.#_handlers.systemHandler();
        }

        return this;
    }

    /**
     * Toggles the flip configuration for the image. Updates the image configuration and
     * invokes the system handler.
     *
     * @returns {this} Returns the instance for method chaining.
     */
    flip(): this {
        this.#_configs.flip = !this.#_configs.flip;
        this.#_handlers.systemHandler();
        return this;
    }

    /**
     * Toggles the flop configuration for the image. Updates the image configuration and
     * invokes the system handler.
     *
     * @returns {this} Returns the instance for method chaining.
     */
    flop(): this {
        this.#_configs.flop = !this.#_configs.flop;
        this.#_handlers.systemHandler();
        return this;
    }

    /**
     * Downloads the image with applied configurations. The filename is a Base64 encoding
     * of the configuration object, followed by the original filename and extension.
     */
    download() {
        const a = document.createElement('a');
        a.href = this.url;
        a.download = `${btoa(JSON.stringify(this.#_configs))}_${this.#_original.originalName}.${this.#_original.extension}`;
        a.click();
    }
}

export default ImageEditor;
