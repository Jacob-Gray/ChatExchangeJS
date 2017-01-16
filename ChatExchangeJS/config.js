var config = {
  "login": {
    "openid": {
      "key": "https://openid.stackexchange.com/account/login/",
      "submit": "https://openid.stackexchange.com/account/login/submit",
      "confirm": "https://openid.stackexchange.com/user"
    },
    "stackexchange": {
      "key": host => "http://" + host + "/users/login?returnurl=%2f%2f" + host,
      "submit": host => "http://" + host + "/users/authenticate",
      "confirm": host => "http://" + host+"/"
    }
  },
	"chat":{
		"sendMessage": (host, room) => "http://chat." + host + "/chats/" + room + "/messages/new",
		"editMessage": (host, id) => "http://chat." + host + "/messages/" + id,
		"deleteMessage": (host, id) => "http://chat." + host + "/messages/" + id + "/delete",
	}
}
module.exports = config;
