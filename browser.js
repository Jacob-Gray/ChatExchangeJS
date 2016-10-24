var request_lib = require("request"),
  _ = require('cheerio');

var config = require("./config.js");

function Browser() {

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

  /**
   * Create a new HTTP request
   * @param  {string} method HTTP request method
   * @param  {string} url    URL to send request to
   * @param  {object} args   Request arguments
   * @return {Promise}       JS Promise Object
   */
  this.request = (method, url, args) => {
    return new Promise((resolve, reject) => {

      var options = {
        method: method,
        url: url,
        followAllRedirects: true,
      };

      if (args) options.form = args;

      this.http_request(options, (error, response) => {

        if (error) reject(error);

        resolve(response);

      });
    }).catch(() => {
      throw new Error("Request failed to " + url)
    });;
  };

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

    return new Promise((resolve, reject) => {
      resolve(self.get(url).then(self.keyFromHTML));
    });
  }

  this.keyFromHTML = (res) => {
    return new Promise((resolve, reject) => {
      var key = this.$(res.body, "input[name='fkey']").val();

      if (key.length) resolve(key);
      reject("Couldn't find key!")
    });
  }

  this.openid_loginWithKey = (key) => {
    var self = this;
    return new Promise((resolve, reject) => {
      self.post(self.openid.submit, {
        email: this.openid.creds.email,
        password: this.openid.creds.password,
        fkey: key
      }).then((res) => {
        if (res.request.uri.href === self.openid.confirm) resolve(res);
        reject("Username/Password invalid!");
      });
    }).catch((err) => {
      throw new Error(err);
    });
  };

  this.openid_login = () => {

    return this.getKey(this.openid.key).then(this.openid_loginWithKey);
  }

  this.site_login = () => {

    return this.getKey(this.stackexchange.key).then(this.site_loginWithKey);
  }

  this.site_loginWithKey = (key) => {

    this.stackexchange.fkey = key;
    var self = this;
    return new Promise((resolve, reject) => {
      self.post(self.stackexchange.submit, {
        'oauth_version': '',
        'oauth_server': '',
        'openid_identifier': 'https://openid.stackexchange.com/',
        fkey: key
      }).then((res) => {
        if (res.request.uri.href === self.stackexchange.confirm) {
          self.loggedIn = true;
          resolve(res);
        }
        reject("Username/Password invalid!");
      });
    }).catch((err) => {
      throw new Error(err);
    });
  };

  this.login = (host, email, password) => {

    this.openid.creds.email = email;
    this.openid.creds.password = password;

    this.stackexchange.key = config.login.stackexchange.key(host);
    this.stackexchange.submit = config.login.stackexchange.submit(host);
    this.stackexchange.confirm = config.login.stackexchange.confirm(host);

    return this.openid_login().then(this.site_login);


  }

}

module.exports = new Browser
