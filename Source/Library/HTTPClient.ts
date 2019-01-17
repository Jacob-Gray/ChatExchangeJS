import https from 'https';
import http from 'http';
import { URL } from 'url';
import querystring from 'querystring';

export namespace HTTPClient {
	export interface Request extends https.RequestOptions {
		/**
		 * The host this request is attempting to connect to. (ie www.stackexchange.com)
		 */
		host: string,
		/**
		 * Path we are requesting from the host. (ie /users/login)
		 * Note that this is where one would put querystring arguments. An object can easily be converted to the format by using the HTTPClient.Args(object, path?) method.
		 */
		path: string,
		/**
		 * Indicates this is a secure server, and use https client instead of http(default).
		 */
		https?: boolean,
	}

	export interface GETRequest extends Request {
		method: 'GET',
		type: 'GETRequest',
	}

	export interface POSTRequest extends Request {
		method: 'POST',
		type: 'POSTRequest',
	}

	export interface POSTRequestForm extends Request {
		method: 'POST',
		type: 'POSTRequestForm',
		/**
		 * Sends data to the host as form format.
		 */
		form: object,
	}

	export interface POSTRequestJSON extends Request {
		method: 'POST',
		type: 'POSTRequestJSON',
		/**
		 * Sends data to the host as JSON format.
		 */
		json: object,
	}

	export type RequestTypes = GETRequest
		| POSTRequest
		| POSTRequestForm
		| POSTRequestJSON;

	export interface Response {
		/**
		 * Original Node response. Containes headers and all the data node provides.
		 */
		original: http.IncomingMessage,
		/**
		 * Original Node request.
		 */
		request: http.ClientRequest,
		/**
		 * Body of response as string.
		 */
		body: string,
		/**
		 * Body of response as JSON. Only exists if the body string is valid JSON.
		 */
		bodyJSON?: object,
	}
}

/**
 * Simple wrapper for the Node HTTP(S) functionality to make it a little less painful to work with.
 */
export class HTTPClient {
	/**
	 * Base request functionality.
	 * @param options Object containing options for the request. See interface for more in depth info.
	 */
	static Request(options: HTTPClient.RequestTypes): Promise<HTTPClient.Response> {
		return new Promise((resolve, reject) => {
			let request: http.ClientRequest;

			/**
			 * If we are going to try and send data via the request body, it will be stored here
			 */
			let dataToSend;
			/**
			 * All headers here can be overridden by adding a header object to the options object.
			 */
			let defaultHeaders: { [name: string]: string } = {
				'user-agent': 'Mozilla/5.0 (compatible; github.com/Jacob-Gray/ChatExchangeJS)',
			};

			if (options.type === 'POSTRequestForm') {
				dataToSend = querystring.stringify(options.form);

				defaultHeaders['content-type'] = 'application/x-www-form-urlencoded';
			} else if (options.type === 'POSTRequestJSON') {
				dataToSend = JSON.stringify(options.json);

				defaultHeaders['content-type'] = 'application/json';
			}

			if (dataToSend) {
				defaultHeaders['content-length'] = Buffer.byteLength(dataToSend).toString();
			}

			if (options.headers) {
				options.headers = { ...defaultHeaders, ...options.headers };
			}

			if (options.https) {
				request = https.request(options);
			} else {
				request = http.request(options);
			}

			request.on('response', response => {
				let data = new Uint8Array(0);

				response.on('data', (chunk: Buffer) => {
					data = Buffer.concat([data, chunk]);
				});

				response.on('end', () => {
					const parsed: HTTPClient.Response = {
						original: response,
						request: request,
						body: data.toString(),
					};

					try {
						parsed.bodyJSON = JSON.parse(parsed.body);
					} catch (e) {
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
	static Args(args: object, path: string = ''): string {
		return `${path}?${querystring.stringify(args)}`;
	}

	/**
	 * Send a GET request to the specified url, with optional querystring arguments.
	 * @param url Valid url parsable by the URL module. Will error if url not valid.
	 * @param data Data to send as querystring args.
	 * @param headers Set headers for request.
	 */
	static Get(url: string, data?: object, headers?: {}) {
		const parsedURL = new URL(url);

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
	static Post(url: string, form?: object, headers?: {}) {
		const parsedURL = new URL(url);
		let options: HTTPClient.POSTRequest | HTTPClient.POSTRequestForm = {
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