import https from 'https';
import http from 'http';
import { URL } from 'url';
import querystring from 'querystring';

export namespace HTTPClient {
	export interface RequestOptions extends https.RequestOptions {
		/**
		 * Request method to use. Currently only supports POST and GET.
		 */
		method: 'POST' | 'GET',
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
		 * POST only. Sends data to the host.
		 */
		data?: object,
		/**
		 * Indicates this is a secure server, and use https client instead of http(default).
		 */
		https?: boolean,
	}

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


export class HTTPClient {
	/**
	 * Base request functionality.
	 * @param options Object containing options for the request. See interface for more in depth info.
	 */
	static Request(options: HTTPClient.RequestOptions): Promise<HTTPClient.Response> {
		return new Promise((resolve, reject) => {
			let request: http.ClientRequest;

			if (options.https) {
				request = https.request(options);
			} else {
				request = http.request(options);
			}

			request.on('response', response => {
				response.on('data', (data: Buffer) => {
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

			if (options.data) {
				request.write(querystring.stringify(options.data));
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
	 */
	static Get(url: string, data?: object) {
		const parsedURL = new URL(url);

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
	static Post(url: string, data?: object) {
		const parsedURL = new URL(url);

		return this.Request({
			method: 'GET',
			host: parsedURL.host,
			path: parsedURL.path,
			https: parsedURL.protocol === 'https:',
			data: data,
		});
	}
}