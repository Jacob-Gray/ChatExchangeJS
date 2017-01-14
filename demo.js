var Client = require("./client");

function myLittleRoom(room) {

console.log("Joined room #"+room.id);

  room.ws.on("message", function(data){
    console.log(data)
  })

  // room.on("message", (msg) => {
  // Event system, not completed yet
  // });
}

function Session(me) {

	console.log("Signed in")

  me.join(22091).then(myLittleRoom)

}

var me = new Client("stackoverflow.com");

me.login("tpccyborg@gmail.com", "Batmanrocks1").then(Session);
