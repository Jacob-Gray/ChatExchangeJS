"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cheerio_1 = __importDefault(require("cheerio"));
const url_1 = require("url");
const HttpClient_1 = require("./HttpClient");
const tldts_1 = require("tldts");
/**
 * Check if a cookie is valid for a specific domain/subdomain.
 * @param url URL to pull host from.
 * @param cookie Cookie to validate with.
 */
function CheckCookieToDomain(url, cookie) {
    /*
     * If a domain was not set, then we just compare the two hostnames, as they must match according to spec.
     */
    if (!cookie.domain) {
        return url.hostname === cookie.origin;
    }
    const current = tldts_1.parse(url.hostname);
    const expected = tldts_1.parse(cookie.domain);
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
function CheckCookieToPath(url, cookie) {
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
function CheckCookieToProtocol(url, cookie) {
    return cookie.secure ? url.protocol === 'https:' : true;
}
/**
 * Ensure that a URL matches the cookie restrictions, as defined by the spec.
 * @param url Url to validate for.
 * @param cookie Cookie to validate for.
 */
function CheckCookieToUrl(url, cookie) {
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
function ParseCookie(cookieString, url) {
    let cookie = {
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
        }
        else {
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
                        value = new url_1.URL(value).pathname;
                    }
                    catch (err) {
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
                    }
                    else {
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
class Browser {
    constructor() {
        /*
         * Object holding all cookies within this browser session.
         * Responses with the Set-Cookie header will automatically add/update/remove cookies here.
         * Cookies can be manually added, as long as they fit the Browser.Cookie interface.
         */
        this.cookies = [];
    }
    /**
     * Takes a response and updates the cookies stored in this browser based upon the set-cookie header.
     * @param response Response from a HTTPClient request.
     */
    UpdateCookies(response, url) {
        if (response.original.headers['set-cookie']) {
            /**
             * What I am assuming is a bug in typescript causes property checks with a string to simply not work.
             * In typescript, the below headers['set-cookie'] could possibly be undefined, but we know it isn't so we cast to an array.
             */
            for (let cookieString of response.original.headers['set-cookie']) {
                const cookie = ParseCookie(cookieString, url);
                const expired = cookie.expires && cookie.expires.getTime() < Date.now();
                const existing = this.cookies.find(currentCookie => currentCookie.name === cookie.name
                    && currentCookie.domain === cookie.domain
                    && currentCookie.path === cookie.path);
                if (existing) {
                    const index = this.cookies.indexOf(existing);
                    if (expired) {
                        this.cookies.splice(index, 1);
                    }
                    else {
                        const updated = Object.assign({}, existing, cookie);
                        if (CheckCookieToDomain(url, updated)
                            && CheckCookieToProtocol(url, updated)) {
                            this.cookies.splice(index, 1, updated);
                        }
                    }
                }
                else if (!expired
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
    StringifyAvailableCookies(url) {
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
    HandleResponse(response, url) {
        return __awaiter(this, void 0, void 0, function* () {
            this.UpdateCookies(response, url);
            const location = response.original.headers.location;
            try {
                if (location) {
                    try {
                        return yield this.Get(location);
                    }
                    catch (error) {
                        return yield this.Get(new url_1.URL(location, url).href);
                    }
                }
            }
            catch (error) {
                console.log(`Redirect failed. Site provided invalid url in location header: ${location}.`);
            }
            return {
                location: url,
                response: response,
                source: response.body,
                find: cheerio_1.default.load(response.body),
            };
        });
    }
    /**
     * Execute a GET request within the browser, automatically updating cookies and handling redirects.
     * @param url Valid url to send GET request to.
     * @param data Data to send as querystring arguments.
     */
    Get(url, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const parsedURL = new url_1.URL(url);
            const response = yield HttpClient_1.HttpClient.Get(url, data, {
                cookie: this.StringifyAvailableCookies(parsedURL),
            });
            return this.HandleResponse(response, parsedURL);
        });
    }
    /**
     * Execute a POST request within the browser, automatically updating cookies and handling redirects.
     * @param url Valid url to send POST request to.
     * @param data Data to send as request body.
     */
    Post(url, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const parsedURL = new url_1.URL(url);
            const response = yield HttpClient_1.HttpClient.Post(url, data, {
                cookie: this.StringifyAvailableCookies(parsedURL),
            });
            return this.HandleResponse(response, parsedURL);
        });
    }
    /**
     * Quickly grab an attribute from a specific element on a provided page. Uses the browser Get method, so cookies/redirection are taken into account.
     * Should only be used if you want a simple way to grab a single attribute from a page. If you are grabbing multiple items from the same page, use Get().find instead.
     * @param url Url to send GET request to. Not necessarily the URL that will be used, if a location header is returned.
     * @param selector Selector for element on page.
     * @param attribute Attribute to fetch from element.
     */
    Fetch(url, selector, attribute) {
        return __awaiter(this, void 0, void 0, function* () {
            const page = yield this.Get(url);
            return page.find(selector).attr(attribute);
        });
    }
}
exports.Browser = Browser;
