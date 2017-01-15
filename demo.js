var Client = require("./ChatExchangeJS/client");

var user = require("./user.json")

//Function called when joining a room
function Room(room) {

	//Add event listener to this room
	room.on("message", msg => {

		//NOTE: The objects that an even listener returns _will_ change in the future, use with caution!

		console.log("Received message:");
		console.log(msg)

		//switch with message content
		switch (msg.content) {
			case "!help":

				//Send message to room
				room.sendMessage("I'm a happy little chatbot :D");
				break;
			case "!ping":

				//Send message to room and ping user that sent the `!ping` message
				room.sendMessage("@" + msg.user_name.replace(" ", "") + " ping!");
				break;
			case "!reply":

				//NOTE: A replacement for this is coming soon.
				//Reply to `!reply` message
				room.sendMessage(":" + msg.message_id + " replied!");
				break;
		}
	});

	//Send welcome message when user enters room
	room.on("userEntered", data => {
		room.sendMessage("@" + data.user_name.replace(" ", "") + " welcome to my chatroom!");
	});

	//Send goodbye message when user leaves
	room.on("userLeft", data => {
		room.sendMessage(data.user_name.replace(" ", "") + " left :'(");
	});
}

//This is the user session. All actions that require the user to be logged in should be done in here.
function Session(me) {

	//Join room, then run room function
	me.join(133210).then(Room);
}

//Create new client for site
var me = new Client("stackoverflow.com");

//Login to site with username and password
me.login(user.email, user.password).then(Session);
