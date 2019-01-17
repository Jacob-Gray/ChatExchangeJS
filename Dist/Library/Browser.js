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
/**
 * Basic browser class that allows cookie storage, handles redirection, and provides access to the HTML parser.
 */
class Browser {
    constructor() {
        /**
         * Object holding all cookies within this browser session.
         * Responses with the Set-Cookie header will automatically add/update/remove cookies here.
         * Cookies can be manually added, as long as they fit the Browser.Cookie interface.
         */
        this.cookies = {};
    }
    /**
     * Takes a response and updates the cookies stored in this browser based upon the set-cookie header.
     * @param response Response from a HTTPClient request.
     */
    UpdateCookies(response) {
        if (response.original.headers['set-cookie']) {
            /**
             * What I am assuming is a bug in typescript causes property checks with a string to simply not work.
             * In typescript, the below headers['set-cookie'] could possibly be undefined, but we know it isn't so we cast to an array.
             */
            for (let cookieString of response.original.headers['set-cookie']) {
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
    ParseCookie(cookieString) {
        let cookie = {
            name: '',
            value: '',
        };
        for (let value of cookieString.split('; ')) {
            let split = value.indexOf('=');
            if (!cookie.name.length) {
                cookie.name = value.substr(0, split);
                cookie.value = value.substr(split + 1);
            }
            else if (value.substr(0, split) === 'expires') {
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
    StringifyCookies(domain, path) {
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
    HandleResponse(response, url) {
        return __awaiter(this, void 0, void 0, function* () {
            this.UpdateCookies(response);
            const location = response.original.headers.location;
            try {
                if (location) {
                    if (location.indexOf('https:') === 0 || location.indexOf('http:') === 0) {
                        return yield this.Get(location);
                    }
                    else {
                        return yield this.Get(new url_1.URL(location, url).href);
                    }
                }
            }
            catch (error) {
                console.log(`Redirect failed. Site provided invalid url in location header: ${location}.`);
            }
            return {
                location: new url_1.URL(url),
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
            const response = yield HttpClient_1.HttpClient.Get(url, data, {
                cookie: this.StringifyCookies(),
            });
            return this.HandleResponse(response, url);
        });
    }
    /**
     * Execute a POST request within the browser, automatically updating cookies and handling redirects.
     * @param url Valid url to send POST request to.
     * @param data Data to send as request body.
     */
    Post(url, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield HttpClient_1.HttpClient.Post(url, data, {
                cookie: this.StringifyCookies(),
            });
            return this.HandleResponse(response, url);
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
