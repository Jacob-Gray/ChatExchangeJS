var config = {
	stackexchange(host) {

		return {
			"key": "https://" + host + "/users/login?returnurl=%2f%2f" + host,
			"submit": "https://" + host + "/users/authenticate",
			"confirm": "https://" + host + "/"
		}
	},
	"chat": {
		"sendMessage": (host, room) => "http://chat." + host + "/chats/" + room + "/messages/new",
		"editMessage": (host, id) => "http://chat." + host + "/messages/" + id,
		"deleteMessage": (host, id) => "http://chat." + host + "/messages/" + id + "/delete",
	}
}
module.exports = config;