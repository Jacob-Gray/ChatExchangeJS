var EventManager = require("./events");

function Room(client, id) {
  this.client = client;
  this.id = id;
  this.events = new EventManager;


  this.join = ()=>{
    var self = this;
    return this.client._br.async((resolve)=>{
      this.client._br.join_room(self).then(resolve)
    })
  }

  this.on = this.events.register;
}

module.exports = Room;
