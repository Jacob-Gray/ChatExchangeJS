const eventTypes = {
	1:"message",
	2:"messageEdited",
	3:"userEntered",
	4:"userLeft",
	5:"roomNameChanged",
	6:"messageStarred",
	8:"userMentioned",
	9:"messageFlagged",
	10:"messageDeleted",
	11:"fileAdded",
	12:"moderatorFlag",
	13:"userSettingsChanged",
	14:"globalNotification",
	15:"accountLevelChanged",
	16:"userNotification",
	17:"invitation",
	18:"messageReply",
	19:"messageMovedOut",
	20:"messagedMovedIn",
	21:"timeBreak",
	22:"feedTicker",
	29:"userSuspended",
	30:"userMerged",
};

function ChatEvent(info){

	for(var x in info){
		this[x] = info[x];
	}

	this.type = eventTypes[this.event_type];
}

function EventManager(room){

	this.room = room;

	this.events = {};

	this.listen = (eventName, callback) => {

		if(!this.events[eventName]) this.events[eventName] = [];

		this.events[eventName].push(callback);
	}

	this.trigger = function(eventName, data){

		if(this.events[eventName]){
			this.events[eventName].forEach(callback => callback(data));
		}
	}

	this.listener = websocket =>{

		websocket.on("message", data => {

			data = JSON.parse(data);

			var roomEvent = data["r" + this.room.id];

			if(roomEvent && roomEvent.e){
				roomEvent.e.forEach(item => {

					var e = new ChatEvent(item);

					if(e.type) this.trigger(e.type, e);
				})
			}

		})
	}
}
module.exports = EventManager;
