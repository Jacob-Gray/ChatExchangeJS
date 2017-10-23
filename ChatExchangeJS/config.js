var config = {
	stackexchange(host) {

		return {
			"key": "https://" + host + "/users/login?returnurl=%2f%2f" + host,
			"submit": "https://" + host + "/users/login",
			"confirm": "https://" + host + "/"
		}
	},
	openid: {
		key: "https://openid.stackexchange.com/account/login/",
		submit: "https://openid.stackexchange.com/account/login/submit",
		confirm: "https://openid.stackexchange.com/user",
	},
	chat: {
		sendMessage: (host, room) => "http://chat." + host + "/chats/" + room + "/messages/new",
		editMessage: (host, id) => "http://chat." + host + "/messages/" + id,
		deleteMessage: (host, id) => "http://chat." + host + "/messages/" + id + "/delete",
	}
}
module.exports = config;