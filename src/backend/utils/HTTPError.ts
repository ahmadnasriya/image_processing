class HTTPError extends Error {
    readonly #_data = {
        status: 500,
        code: 'HTTP_ERROR',
    };

    constructor(message: string, options: { status: number; code?: string }) {
        super(message);
        this.#_data.status = options.status;
        if (options.code) {
            this.#_data.code = options.code;
        }
    }

    /**
     * The error message. This is the same as the message property of the Error object,
     * but it is exposed as a getter so that it can be overridden if needed.
     * @returns {string} The error message.
     */
    get message(): string {
        return super.message;
    }

    /**
     * Sets the error message. This is the same as setting the message property of the Error object,
     * but it is exposed as a setter so that it can be overridden if needed.
     * @param {string} value - The error message to set.
     */
    set message(value: string) {
        super.message = value;
    }

    /**
     * The HTTP status code associated with this error. This is the status code
     * that will be sent to the client if this error is thrown as a result of
     * an API call.
     * @type {number}
     * @readonly
     */
    get status() {
        return this.#_data.status;
    }

    /**
     * A code that can be used to identify the type of error that occurred.
     * This can be used to display a friendly error message to the user,
     * or to determine the course of action to take when an error occurs.
     * @type {string}
     * @readonly
     */
    get code() {
        return this.#_data.code;
    }

    /**
     * The stack trace of the error. This is the same as the stack property
     * of the Error object, but it is exposed as a getter so that it can be
     * overridden if needed.
     * @type {string}
     * @readonly
     */
    get stack() {
        return super.stack;
    }
}

export default HTTPError;
