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
    static Args(args, path = '') {
        return `${path}?${querystring_1.default.stringify(args)}`;
    }
    static Get(url, data) {
        const parsedURL = new url_1.URL(url);
        return this.Request({
            method: 'GET',
            host: parsedURL.host,
            path: data ? this.Args(data, parsedURL.path) : parsedURL.path,
            https: parsedURL.protocol === 'https:',
        });
    }
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
