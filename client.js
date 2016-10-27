var Browser = require("./browser");
var Room = require("./room");

function Client(host) {
  this.host = host;

  this._br = new Browser(this);

  this.login = (email, password) => {
    return this._br.login(this.host, email, password);
  };

  this.join = (room_id) => {

    if (this._br.loggedIn){
      return new Room(this, room_id).join();
    }
    throw new Error("Cannot join room " + room_id + "@" + this.host + ": Not logged in!");
  }
}
module.exports = Client;
