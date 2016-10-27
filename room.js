function Room(client, id) {
  this.client = client;
  this.id = id;

  this.join = ()=>{
    var self = this;
    return this.client._br.async((resolve)=>{
      this.client._br.join_room(self).then(resolve)
    })
  }
}

module.exports = Room;
