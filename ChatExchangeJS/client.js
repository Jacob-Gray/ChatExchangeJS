const Browser = require("./browser"),
	Request = require("request"),
	Room = require("./room");

class Client {

	constructor(host) {
		this.host = host;

		/**
		 * Store cookies separately for each client
		 */
		this.jar = Request.jar();

		this._br = new Browser(this);
	}


	login(email, password) {
		return this._br.login(this.host, email, password);
	};

	join(room_id) {

		if (this._br.loggedIn) {
			return new Room(this, room_id).join();
		}

		throw new Error("Cannot join room " + room_id + "@" + this.host + ": Not logged in!");
	}
}
module.exports = Client;