var EventManager = require("./events");

var config = require("./config.js");

function Room(client, id) {
  this.client = client;
  this.id = id;
  this.events = new EventManager(this);


  this.join = () => {
    var self = this;
    return this.client._br.async((resolve)=>{
      this.client._br.join_room(self).then(resolve);
		});
  }

  this.on = this.events.listen;

	this.listener = this.events.listener;

	this.sendMessage = text => this.client._br.post(config.chat.sendMessage(this.client.host, this.id), {fkey: this.client.fkey, text: text});

	this.editMessage = (id, text) => this.client._br.post(config.chat.editMessage(this.client.host, id), {fkey: this.client.fkey, text: text});

	this.deleteMessage = id => this.client._br.post(config.chat.deleteMessage(this.client.host, id), {fkey: this.client.fkey});
}

module.exports = Room;
