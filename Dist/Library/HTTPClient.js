"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const https_1 = __importDefault(require("https"));
const http_1 = __importDefault(require("http"));
const url_1 = require("url");
const querystring_1 = __importDefault(require("querystring"));
/**
 * Simple wrapper for the Node HTTP(S) functionality to make it a little less painful to work with.
 */
class HttpClient {
    /**
     * Base request functionality.
     * @param options Object containing options for the request. See interface for more in depth info.
     */
    static Request(options) {
        return new Promise((resolve, reject) => {
            let request;
            /**
             * If we are going to try and send data via the request body, it will be stored here
             */
            let dataToSend;
            /**
             * All headers here can be overridden by adding a header object to the options object.
             */
            let defaultHeaders = {
                'user-agent': 'Mozilla/5.0 (compatible; github.com/Jacob-Gray/ChatExchangeJS)',
            };
            if (options.type === 'POSTRequestForm') {
                dataToSend = querystring_1.default.stringify(options.form);
                defaultHeaders['content-type'] = 'application/x-www-form-urlencoded';
            }
            else if (options.type === 'POSTRequestJSON') {
                dataToSend = JSON.stringify(options.json);
                defaultHeaders['content-type'] = 'application/json';
            }
            if (dataToSend) {
                defaultHeaders['content-length'] = Buffer.byteLength(dataToSend).toString();
            }
            if (options.headers) {
                options.headers = Object.assign({}, defaultHeaders, options.headers);
            }
            if (options.https) {
                request = https_1.default.request(options);
            }
            else {
                request = http_1.default.request(options);
            }
            request.on('response', response => {
                let data = new Uint8Array(0);
                response.on('data', (chunk) => {
                    data = Buffer.concat([data, chunk]);
                });
                response.on('end', () => {
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
            if (dataToSend) {
                request.write(dataToSend);
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
     * @param headers Set headers for request.
     */
    static Get(url, data, headers) {
        const parsedURL = new url_1.URL(url);
        return this.Request({
            type: 'GETRequest',
            method: 'GET',
            host: parsedURL.host,
            path: data ? this.Args(data, parsedURL.pathname) : parsedURL.pathname,
            https: parsedURL.protocol === 'https:',
            headers: headers || {},
        });
    }
    /**
     * Send a POST request to the specified url, with optional body data. Note the default is form data, while Request supports both form and JSON.
     * @param url Valid url parsable by the URL module. Will error if url not valid.
     * @param form Data to send as request body.
     * @param headers Set headers for request.
     */
    static Post(url, form, headers) {
        const parsedURL = new url_1.URL(url);
        let options = {
            type: 'POSTRequest',
            method: 'POST',
            host: parsedURL.host,
            path: parsedURL.pathname,
            https: parsedURL.protocol === 'https:',
            headers: headers || {},
        };
        if (form) {
            options = Object.assign(options, {
                type: 'POSTRequestForm',
                form: form,
            });
        }
        return this.Request(options);
    }
}
exports.HttpClient = HttpClient;
