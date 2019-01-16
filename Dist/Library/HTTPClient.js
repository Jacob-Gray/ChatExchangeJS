"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const https_1 = __importDefault(require("https"));
const http_1 = __importDefault(require("http"));
const url_1 = require("url");
const querystring_1 = __importDefault(require("querystring"));
class HTTPClient {
    /**
     * Base request functionality.
     * @param options Object containing options for the request. See interface for more in depth info.
     */
    static Request(options) {
        return new Promise((resolve, reject) => {
            let request;
            if (options.https) {
                request = https_1.default.request(options);
            }
            else {
                request = http_1.default.request(options);
            }
            request.on('response', response => {
                response.on('data', (data) => {
                    const parsed = {
                        original: response,
                        request: request,
                        body: data.toString(),
                    };
                    try {
                        parsed.bodyJSON = JSON.parse(parsed.body);
                    }
                    catch (e) {
                        // Body is not JSON
                    }
                    resolve(parsed);
                });
            });
            request.on('error', err => {
                reject(err);
            });
            if (options.data) {
                request.write(querystring_1.default.stringify(options.data));
            }
            request.end();
        });
    }
    /**
     * Simple wrapper to querystring.stringify(). Provides the aditional functionality of prepending a path.
     * @param args Object to stringify.
     * @param path Path to prepend to stringified args
     */
    static Args(args, path = '') {
        return `${path}?${querystring_1.default.stringify(args)}`;
    }
    /**
     * Send a GET request to the specified url, with optional querystring arguments.
     * @param url Valid url parsable by the URL module. Will error if url not valid.
     * @param data Data to send as querystring args.
     */
    static Get(url, data) {
        const parsedURL = new url_1.URL(url);
        return this.Request({
            method: 'GET',
            host: parsedURL.host,
            path: data ? this.Args(data, parsedURL.path) : parsedURL.path,
            https: parsedURL.protocol === 'https:',
        });
    }
    /**
     * Send a POST request to the specified url, with optional body data.
     * @param url Valid url parsable by the URL module. Will error if url not valid.
     * @param data Data to send as request body.
     */
    static Post(url, data) {
        const parsedURL = new url_1.URL(url);
        return this.Request({
            method: 'GET',
            host: parsedURL.host,
            path: parsedURL.path,
            https: parsedURL.protocol === 'https:',
            data: data,
        });
    }
}
exports.HTTPClient = HTTPClient;
