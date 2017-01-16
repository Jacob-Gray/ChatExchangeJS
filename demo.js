var Client = require("./ChatExchangeJS/client");

var user = require("./user.json")

//Function called when joining a room
function Room(room) {

	console.log("Joined room " + room.id + "!")

	//Add event listener to this room
	room.on("message", msg => {

		//NOTE: The objects that an even listener returns _will_ change in the future, use with caution!

		console.log("Received message:", msg.content);

		var command = msg.content.split(" ");

		console.log(command)

		switch(command.shift()){
			case "!edit":
				room.editMessage(command.shift(), command.join(" "));
				break;
			case "!delete":
				room.deleteMessage(command.join(" "));
				break;

			case "!help":

				//Send message to room
				room.sendMessage("I'm a happy little chatbot :D");
				break;
			case "!ping":

				//Send message to room and ping user that sent the `!ping` message
				room.sendMessage("@" + msg.user_name.replace(" ", "") + " ping!");
				break;
			case "!reply":

				msg.reply("here's a reply!")
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

	console.log("Logged in to " + me.host + " as " + me.user + "(ID #" + me.id + ")!")

	//Join room, then run room function
	me.join(133210).then(Room);
}

//Create new client for site
var me = new Client("stackoverflow.com");

//Login to site with username and password
me.login(user.email, user.password).then(Session);
