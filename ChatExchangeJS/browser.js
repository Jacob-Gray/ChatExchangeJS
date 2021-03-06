var Request = require("request"),
	{
		URL
	} = require("url"),
	cheerio = require('cheerio'),
	WebSocket = require('ws');

const session = Request.jar(),
	request = Request.defaults({
		jar: session,
		followAllRedirects: true,
	});

const https = require("https"),
	querystring = require("querystring");

var config = require("./config.js");

function Browser(client) {

	this.client = client;

	/**
	 * Creates a session for browser requests
	 * @type {request}
	 */
	this.http_request = request_lib.defaults({
		jar: true
	});

	this.loggedIn = false;

	this.openid = config.login.openid;

	this.openid.creds = {};

	this.stackexchange = {};

	this.attempting = {};

	this.async = (fn) => {
		return new Promise(fn).catch((err) => {
			console.log(err)
		})
	}

	this.request = (uri, method, data = {}, urlargs = {}) => {

		return new Promise((resolve, reject) => {

			if (method === "GET") urlargs = data;

			const postData = querystring.stringify(data),
				args = querystring.stringify(urlargs),
				options = new URL(uri + "?" + args);


			options.method = method;
			options.headers = {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Content-Length': Buffer.byteLength(postData)
			}

			const req = https.request(options, res => {

				res.setEncoding('utf8');

				let data = [];

				res.on('data', chunk => {
					data.push(chunk);
				});

				res.on('end', () => {
					let body = data.join(""),
						output;

					try {
						output = JSON.parse(body);
					} catch (e) {
						output = body;
					}

					resolve(output);
				});
			});

			req.on('error', e => {
				reject(e);
			});

			// write data to request body
			req.write(postData);
			req.end();
		});
	}

	/**
	 * New GET request
	 * @param  {string} url  URL to send the request to
	 * @param  {object} args Request arguments
	 * @return {Promise}     A JS promise object
	 */
	this.get = (url, args) => {

		args = args || false;

		return this.request("GET", url, args);
	};

	/**
	 * New POST request
	 * @param  {string} url  URL to send the request to
	 * @param  {object} args Request arguments
	 * @return {Promise}     A JS promise object
	 */
	this.post = (url, args) => {

		args = args || false;

		console.log(args)

		return this.request("POST", url, args);
	};

	/**
	 * Parse html and select an element
	 * @param  {string} html     String of HTML to select an element from
	 * @param  {string} selector jQuery style selector
	 * @return {object}          jQuery style element
	 */
	this.$ = (html, selector) => {
		var $ = _.load(html);
		return $(selector);
	}

	this.getKey = (url) => {

		var self = this;

		return this.async((resolve, reject) => {
			resolve(self.get(url).then(self.keyFromHTML));
		});
	}

	this.keyFromHTML = (res) => {
		return this.async((resolve, reject) => {
			var key = this.$(res.body, "input[name='fkey']").val();
			if (key.length) resolve(key);
			reject("Couldn't find key input at `" + res.request.uri.href + "`!")
		});
	}

	this.openid_loginWithKey = (key) => {

		var self = this;
		return this.async((resolve, reject) => {
			self.post(self.openid.submit, {
				email: this.openid.creds.email,
				password: this.openid.creds.password,
				fkey: key
			}).then((res) => {

				if (res.request.uri.href === self.openid.confirm) resolve(res);

				reject("StackExchange username/password invalid!");
			});
		});
	};

	this.openid_login = () => {

		return this.getKey(this.openid.key).then(this.openid_loginWithKey);
	}

	this.site_login = () => {

		return this.getKey(this.stackexchange.key).then(this.site_loginWithKey);
	}

	this.getWSUrl = () => {
		var self = this;

		return this.async((resolve, reject) => {
			self.post("http://" + self.chost + "/ws-auth/", {
				roomid: self.attempting.join.id,
				fkey: self.attempting.join.key
			}).then((response) => {
				resolve(JSON.parse(response.body));
			});
		});
	}

	this.getEventCount = (room_key) => {
		var self = this;

		return this.async((resolve, reject) => {
			self.post("http://" + self.chost + "/chats/" + self.attempting.join.id + "/events", {
				mode: "events",
				msgCount: 0,
				fkey: self.attempting.join.key
			}).then((response) => {

				resolve(JSON.parse(response.body));
			});
		});
	}

	this.connectToWS = (data) => {
		var self = this;

		return this.async((resolve, reject) => {
			var url = data[0].url + "?l=" + data[1].time;

			self.attempting.join.ws = new WebSocket(url, {
				origin: "http://" + self.chost
			});

			self.attempting.join.ws.on("open", () => {
				var room = self.attempting.join
				delete self.attempting.join

				room.listener(room.ws);
				resolve(room);
			})

		});


	}

	this.join_room = (room) => {
		var self = this;


		this.attempting.join = room;
		return this.async((resolve, reject) => {
			this.getKey("http://" + this.chost + "/rooms/" + room.id).then((key) => {
				room.key = key;

				Promise.all([
						self.getWSUrl(),
						self.getEventCount()
					]).then(self.connectToWS)
					.then(resolve);
			})
		})


	}

	this.fetchUserInfo = () => {
		return this.async((resolve, reject) => {

			this.get("http://chat." + this.host).then(response => {

				var key = this.$(response.body, "input[name='fkey']").val();
				var user = this.$(response.body, ".topbar-menu-links a").html();
				var id = this.$(response.body, ".topbar-menu-links a").attr("href").split("/");

				id = id[id.length - 2];

				if (key.length && user.length) {
					this.client.fkey = key;
					this.client.user = user;
					this.client.id = id;
					resolve(this.client);
				}

				reject();
			})
		});
	}

	this.site_loginWithKey = (key) => {

		this.stackexchange.fkey = key;

		var self = this;

		console.log(key)

		return this.async((resolve, reject) => {
			self.post(self.stackexchange.submit, {
				'oauth_version': '',
				'oauth_server': '',
				'openid_identifier': 'https://openid.stackexchange.com/',
				'fkey': key
			}).then((res) => {

				console.log(res.body)
				console.log(res.request.uri.href)
				console.log(self.stackexchange.confirm)

				if (res.request.uri.href === self.stackexchange.confirm) {

					self.loggedIn = true;

					self.fetchUserInfo().then(resolve).catch(() => reject("Couldn't login to " + self.host + " using OpenID!"));
				}
			});
		});
	};

	this.login = (host, email, password) => {
		this.host = host;
		this.chost = "chat." + host;

		this.openid.creds.email = email;
		this.openid.creds.password = password;

		this.stackexchange.key = config.login.stackexchange.key(host);
		this.stackexchange.submit = config.login.stackexchange.submit(host);
		this.stackexchange.confirm = config.login.stackexchange.confirm(host);

		return this.openid_login().then(this.site_login);


	}

}

class Browser2 {

	constructor(client) {
		this.client = client;
	}

	request(options) {

		return new Promise((resolve, reject) => {

			request(options, (err, res, body) => {
				if (err) reject(err);
				resolve(res);
			});
		});
	}

	cookies(host) {
		let cookies = session.getCookies(host),
			output = {};

		cookies.forEach(cookie => {
			output[cookie.key] = cookie;
		});

		return output;
	}

	async html(url) {

		let responseHTML = await this.request({
			method: "GET",
			url: url
		});

		return cheerio.load(responseHTML.body);
	}

	async getValues(url, els) {

		let $ = await this.html(url),
			output = {};

		for (let el of els) {

			el = $(`[name="${el}"]`);

			output[el.attr("name")] = el.val();
		}

		return output;
	}

	async handleAccountConfirmation(response) {

		if (response.request.uri.href.indexOf("https://openid.stackexchange.com/account/prompt") > -1) {

			console.log("NEEDS ACCOUNT CONFIRMATION")

			let data = await this.getValues(response.request.uri.href, ["fkey", "session"]);

			console.log(data)

			let openid_response = await this.request({
				method: "POST",
				url: "https://openid.stackexchange.com/account/prompt/submit",
				form: data
			});

			console.log(openid_response.request.uri.href)
		}
	}

	async openid(email, password) {

		let fkey = (await this.getValues(config.openid.key, ["fkey"])).fkey;

		let openid_response = await this.request({
			method: "POST",
			url: config.openid.submit,
			form: {
				email: email,
				password: password,
				fkey: fkey
			}
		});

		if (!this.cookies(config.openid.submit).usr) throw new Error("Was unable to login with the provided credentials, please verify them.");
	}

	async siteLogin(host) {

		let stackexchange = config.stackexchange(host),
			fkey = (await this.getValues(stackexchange.key, ["fkey"])).fkey;

		let site_response = await this.request({
			method: "POST",
			url: stackexchange.submit,
			form: {
				'oauth_version': '',
				'oauth_server': '',
				'openid_identifier': 'https://openid.stackexchange.com/',
				fkey: fkey
			}
		});

		this.handleAccountConfirmation(site_response);
	}

	async login(host, email, password) {

		let x = await this.getValues(config.openid.key, ["fkey"])

		console.log(x)

		await this.openid(email, password);
		await this.siteLogin(host);
	}
}

module.exports = Browser2