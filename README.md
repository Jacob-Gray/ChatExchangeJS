# ChatExchangeJS v1.1

>The current version (1) is broken. Currently re-writing.

A Node.js wrapper for the Stack Exchange chat system, allowing the ability to interact with the chat.

This library is still missing some major features, especially when it comes to error reporting. You may run into situations where the library simply doesn't work, and the errors outputted aren't that useful. These should be fixed in the upcoming weeks.

### Features:
- Message API, allowing to send and receive messages
- Chat event listener, so you can listen for any event from the chat room

### Installation
Install from NPM:
```
npm install chatexchangejs
```

### Usage:

```javascript
var Client = require("chatexchangejs");

//Enter the bot users creds here
var user = {email:"myemail", password: "mypassword"};

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

```

A demo can be seen in `demo.js`.

To run the demo, create a `user.json` file in the project dir, and add the bot username and password to it.

Then, just run `node demo`.

Your chat bot is now running in the [ChatExchangeJS Beta room](http://chat.stackoverflow.com/rooms/133210/chatexchange-js-beta) on stackoverflow.

*Don't leave the demo file running! It's for demo purposes only, and gives anyone the ability to edit or delete your bot's messages!*


## Development

This repo contains a dockerfile that will download all the dependencies and run the demo script. On windows, run `npm run build` and `npm run up` to start it.
