import cheerio from 'cheerio';
import { URL } from 'url';
import { HttpClient } from './HttpClient';
import { parse } from 'tldts';

export namespace Browser {
	/*
	 * Representation of a cookie in the browser.
	 * All cookie behavior within browser is based off of the rfc6265 spec(https://tools.ietf.org/html/rfc6265).
	 */
	export interface Cookie {
		/*
		 * Name of cookie.
		 */
		name: string,
		/*
		 * Value of cookie.
		 */
		value: string,
		/*
		 * Host this cookie came from.
		 */
		origin: string,
		/*
		 * Path cookie is valid for.
		 */
		path: string,
		/*
		 * Domain cookie is valid for. Will use origin if this is not set.
		 */
		domain?: string,
		/*
		 * Date object holding the expire time of the cookie.
		 */
		expires?: Date,
		/*
		 * Specifies if cookie should only be sent over HTTPS
		 */
		secure?: boolean,
	}

	/*
	 * Representation of a page in the browser.
	 */
	export interface Page {
		/*
		 * Current url of page as URL object. Do location.href to get full location.
		 */
		location: URL,
		/*
		 * Response from latest request.
		 */
		response: HttpClient.Response,
		/*
		 * Source of the current page. (Same as response.body)
		 */
		source: string,
		/*
		 * Cheerio object. Allows jQuery like interactions with the source.
		 */
		find: CheerioStatic
	}
}

/**
 * Check if a cookie is valid for a specific domain/subdomain.
 * @param url URL to pull host from.
 * @param cookie Cookie to validate with.
 */
function CheckCookieToDomain(url: URL, cookie: Browser.Cookie): boolean {
	/*
	 * If a domain was not set, then we just compare the two hostnames, as they must match according to spec.
	 */
	if (!cookie.domain) {
		return url.hostname === cookie.origin;
	}

	const current = parse(url.hostname);
	const expected = parse(cookie.domain);

	/*
	 * Ensure that the base domains match.
	 */
	if (current.domain !== expected.domain) {
		return false;
	}

	if (expected.subdomain && current.subdomain) {
		const currentSubdomains = current.subdomain.split('.').reverse();
		const expectedSubdomains = expected.subdomain.split('.').reverse();

		return expectedSubdomains.every((subdomain, index) => subdomain === currentSubdomains[index]);
	}

	return true;
}

/**
 * Check if a cookie is valid for a specific path.
 * @param url Url to pull path from.
 * @param cookie Cookie to validate with.
 */
function CheckCookieToPath(url: URL, cookie: Browser.Cookie): boolean {
	const currentPath = url.pathname.split('/');

	return cookie.path.split('/').every((subdirectory, index) => {
		return !subdirectory.length || subdirectory === currentPath[index];
	});
}

/**
 * Check if cookie is valid for specific protocol.
 * @param url Url to pull path from.
 * @param cookie Cookie to validate with.
 */
function CheckCookieToProtocol(url: URL, cookie: Browser.Cookie): boolean {
	return cookie.secure ? url.protocol === 'https:' : true;
}

/**
 * Ensure that a URL matches the cookie restrictions, as defined by the spec.
 * @param url Url to validate for.
 * @param cookie Cookie to validate for.
 */
function CheckCookieToUrl(url: URL, cookie: Browser.Cookie): boolean {
	/*
	 * Ensure URL matches the cookie restrictions.
	 */
	if (!CheckCookieToDomain(url, cookie)) {
		return false;
	}
	/*
	 * Ensure path matches the cookie restrictions.
	 */
	if (!CheckCookieToPath(url, cookie)) {
		return false;
	}

	/*
	 * Ensure protocol matches the cookie restrictions.
	 */
	if (!CheckCookieToProtocol(url, cookie)) {
		return false;
	}

	return true;
}

/**
 * Parses a cookie string and returns a Browser.Cookie.
 * @param cookieString Cookie string from a Set-Cookie header.
 */
function ParseCookie(cookieString: string, url: URL): Browser.Cookie {
	let cookie: Browser.Cookie = {
		name: '',
		value: '',
		path: url.pathname || '/',
		origin: url.hostname,
	};

	for (let kValue of cookieString.split('; ')) {
		const split = kValue.indexOf('=');
		let key = kValue.substr(0, split);
		let value = kValue.substr(split + 1);

		if (split === -1) {
			key = kValue;
		}

		if (!cookie.name.length) {
			cookie.name = key;
			cookie.value = value;
		} else {
			/*
			 * Note we do not support the Max-Age attribute.
			 */
			switch (key.toLowerCase()) {
				case 'expires':
					cookie.expires = new Date(value);
					break;
				case 'domain':
					/*
					 * A trailing period will cause the attribute to be ignored.
					 */
					if (value[value.length - 1] !== '.') {
						/*
						 * A leading period is allowed, but ignored.
						 */
						cookie.domain = value[0] === '.' ? value.substr(1) : value;
					}
					break;
				case 'path':
					/*
					 * If path is a URL, use the url path.
					 */
					try {
						value = new URL(value).pathname;
					} catch (err) {
						/*
						 * Path is not an URL.
						 */
					}

					const dividers = value.split('/');

					/*
					 * If the first character is not /, or there is not more than one /, path is set to /.
					 */
					if (value[0] !== '/' || dividers.length === 2) {
						cookie.path = '/';
					} else {
						/*
						 * Path should be everything up to, but not including, the rightmost /.
						 */
						cookie.path = dividers.slice(0, dividers.length - 1).join('/');
					}
					break;
				case 'secure':
					cookie.secure = true;
					break;
			}
		}
	}

	return cookie;
}

/*
 * Basic browser class that allows cookie storage, handles redirection, and provides access to the HTML parser.
 */
export class Browser {
	/*
	 * Object holding all cookies within this browser session.
	 * Responses with the Set-Cookie header will automatically add/update/remove cookies here.
	 * Cookies can be manually added, as long as they fit the Browser.Cookie interface.
	 */
	public cookies: Array<Browser.Cookie> = [];

	/**
	 * Takes a response and updates the cookies stored in this browser based upon the set-cookie header.
	 * @param response Response from a HTTPClient request.
	 */
	private UpdateCookies(response: HttpClient.Response, url: URL) {
		if (response.original.headers['set-cookie']) {
			/**
			 * What I am assuming is a bug in typescript causes property checks with a string to simply not work.
			 * In typescript, the below headers['set-cookie'] could possibly be undefined, but we know it isn't so we cast to an array.
			 */
			for (let cookieString of (response.original.headers['set-cookie'] as Array<string>)) {
				const cookie = ParseCookie(cookieString, url);

				const expired = cookie.expires && cookie.expires.getTime() < Date.now();
				const existing = this.cookies.find(currentCookie => currentCookie.name === cookie.name
					&& currentCookie.domain === cookie.domain
					&& currentCookie.path === cookie.path
				);

				if (existing) {
					const index = this.cookies.indexOf(existing);

					if (expired) {
						this.cookies.splice(index, 1);
					} else {
						const updated = {
							...existing,
							...cookie
						};

						if (CheckCookieToDomain(url, updated)
							&& CheckCookieToProtocol(url, updated)) {
							this.cookies.splice(index, 1, updated);
						}
					}
				} else if (!expired
					&& CheckCookieToDomain(url, cookie)
					&& CheckCookieToProtocol(url, cookie)) {
					this.cookies.push(cookie);
				}
			}
		}
	}

	/**
	 * Takes the cookies stored for a domain and path and returns a string usable by the cookie header.
	 * @param domain Domain to get cookies for.
	 * @param path Path to get cookies for.
	 */
	private StringifyAvailableCookies(url: URL): string {
		let output = '';

		for (let cookie of this.cookies) {
			if (CheckCookieToUrl(url, cookie)) {
				output += `${output.length ? '; ' : ''}${cookie.name}=${cookie.value}`;
			}
		}

		return output;
	}

	/**
	 * Handles basic functionality for the browser. Updates cookies after a request, handles redirection, and builds the Page response.
	 * @param response Response from HTTPClient request.
	 * @param url Url from request.
	 */
	private async HandleResponse(response: HttpClient.Response, url: URL): Promise<Browser.Page> {
		this.UpdateCookies(response, url);

		const location = response.original.headers.location;

		try {
			if (location) {
				try {
					return await this.Get(location);
				} catch (error) {
					return await this.Get(new URL(location, url).href);
				}
			}
		} catch (error) {
			console.log(`Redirect failed. Site provided invalid url in location header: ${location}.`);
		}

		return {
			location: url,
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
		const parsedURL = new URL(url);
		const response = await HttpClient.Get(url, data, {
			cookie: this.StringifyAvailableCookies(parsedURL),
		});

		return this.HandleResponse(response, parsedURL);
	}

	/**
	 * Execute a POST request within the browser, automatically updating cookies and handling redirects.
	 * @param url Valid url to send POST request to.
	 * @param data Data to send as request body.
	 */
	public async Post(url: string, data?: object): Promise<Browser.Page> {
		const parsedURL = new URL(url);
		const response = await HttpClient.Post(url, data, {
			cookie: this.StringifyAvailableCookies(parsedURL),
		});

		return this.HandleResponse(response, parsedURL);
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
