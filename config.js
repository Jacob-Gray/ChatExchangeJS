var config = {
  "login": {
    "openid": {
      "key": "https://openid.stackexchange.com/account/login/",
      "submit": "https://openid.stackexchange.com/account/login/submit",
      "confirm": "https://openid.stackexchange.com/user"
    },
    "stackexchange": {
      "key": (host) => "http://" + host + "/users/login?returnurl=%2f%2f" + host,
      "submit": (host) => "http://" + host + "/users/authenticate",
      "confirm": (host) => "http://" + host+"/"
    }
  }
}
module.exports = config;
