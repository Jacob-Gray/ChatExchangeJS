import cheerio from 'cheerio';
import { URL } from 'url';
import { HTTPClient } from './HTTPClient';

export namespace Browser {
	/**
	 * Representation of a cookie in the browser.
	 */
	export interface Cookie {
		/**
		 * Name of cookie.
		 */
		name: string,
		/**
		 * Value of cookie.
		 */
		value: string,
		/**
		 * Date object holding the expire time of the cookie.
		 */
		expires?: Date
	}

	/**
	 * Representation of a page in the browser.
	 */
	export interface Page {
		/**
		 * Current url of page as URL object. Do location.href to get full location.
		 */
		location: URL,
		/**
		 * Response from latest request.
		 */
		response: HTTPClient.Response,
		/**
		 * Source of the current page. (Same as response.body)
		 */
		source: string,
		/**
		 * Cheerio object. Allows jQuery like interactions with the source.
		 */
		find: CheerioStatic
	}
}

/**
 * Basic browser class that allows cookie storage, handles redirection, and provides access to the HTML parser.
 */
export class Browser {
	/**
	 * Object holding all cookies within this browser session.
	 * Responses with the Set-Cookie header will automatically add/update/remove cookies here.
	 * Cookies can be manually added, as long as they fit the Browser.Cookie interface.
	 */
	public cookies: { [name: string]: Browser.Cookie } = {};

	/**
	 * Takes a response and updates the cookies stored in this browser based upon the set-cookie header.
	 * @param response Response from a HTTPClient request.
	 */
	private UpdateCookies(response: HTTPClient.Response) {
		if (response.original.headers['set-cookie']) {

			/**
			 * What I am assuming is a bug in typescript causes property checks with a string to simply not work.
			 * In typescript, the below headers['set-cookie'] could possibly be undefined, but we know it isn't so we cast to an array.
			 */
			for (let cookieString of (response.original.headers['set-cookie'] as Array<string>)) {
				const cookie = this.ParseCookie(cookieString);

				if (cookie.expires && cookie.expires.getTime() < Date.now()) {
					if (this.cookies[cookie.name]) {
						delete this.cookies[cookie.name];
					}

					continue;
				}

				this.cookies[cookie.name] = cookie;
			}
		}
	}

	/**
	 * Parses a cookie string and returns a Browser.Cookie.
	 * @param cookieString Cookie string from a Set-Cookie header.
	 */
	public ParseCookie(cookieString: string): Browser.Cookie {
		let cookie: Browser.Cookie = {
			name: '',
			value: '',
		};

		for (let value of cookieString.split('; ')) {
			let split = value.indexOf('=');

			if (!cookie.name.length) {
				cookie.name = value.substr(0, split);
				cookie.value = value.substr(split + 1);
			} else if (value.substr(0, split) === 'expires') {
				cookie.expires = new Date(value.substr(split + 1));
			}
		}

		return cookie;
	}

	/**
	 * Takes the cookies stored for a domain and path and returns a string usable by the cookie header.
	 * @param domain Domain to get cookies for.
	 * @param path Path to get cookies for.
	 */
	public StringifyCookies(domain?: string, path?: string): string {
		let output = '';

		for (let cookie in this.cookies) {
			output += `${output.length ? '; ' : ''}${cookie}=${this.cookies[cookie].value}`;
		}

		return output;
	}

	/**
	 * Handles basic functionality for the browser. Updates cookies after a request, handles redirection, and builds the Page response.
	 * @param response Response from HTTPClient request.
	 * @param url Url from request.
	 */
	private async HandleResponse(response: HTTPClient.Response, url: string): Promise<Browser.Page> {
		this.UpdateCookies(response);

		const location = response.original.headers.location;

		try {
			if (location) {
				if (location.indexOf('https:') === 0 || location.indexOf('http:') === 0) {
					return await this.Get(location);
				} else {
					return await this.Get(new URL(location, url).href);
				}
			}
		} catch (error) {
			console.log(`Redirect failed. Site provided invalid url in location header: ${location}.`);
		}

		return {
			location: new URL(url),
			response: response,
			source: response.body,
			find: cheerio.load(response.body),
		}
	}

	/**
	 * Execute a GET request within the browser, automatically updating cookies and handling redirects.
	 * @param url Valid url to send GET request to.
	 * @param data Data to send as querystring arguments.
	 */
	public async Get(url: string, data?: object): Promise<Browser.Page> {
		const response = await HTTPClient.Get(url, data, {
			cookie: this.StringifyCookies(),
		});

		return this.HandleResponse(response, url);
	}

	/**
	 * Execute a POST request within the browser, automatically updating cookies and handling redirects.
	 * @param url Valid url to send POST request to.
	 * @param data Data to send as request body.
	 */
	public async Post(url: string, data?: object): Promise<Browser.Page> {
		const response = await HTTPClient.Post(url, data, {
			cookie: this.StringifyCookies(),
		});

		return this.HandleResponse(response, url);
	}

	/**
	 * Quickly grab an attribute from a specific element on a provided page. Uses the browser Get method, so cookies/redirection are taken into account.
	 * Should only be used if you want a simple way to grab a single attribute from a page. If you are grabbing multiple items from the same page, use Get().find instead.
	 * @param url Url to send GET request to. Not necessarily the URL that will be used, if a location header is returned.
	 * @param selector Selector for element on page.
	 * @param attribute Attribute to fetch from element.
	 */
	public async Fetch(url: string, selector: string, attribute: string): Promise<string> {
		const page = await this.Get(url);

		return page.find(selector).attr(attribute);
	}
}
