var request = require("request");
var cheerio = require('cheerio');
var browser = require("./browser");
var WebSocket = require("ws");

browser.login("stackoverflow.com", "email", "password").then(() => {

  //Massive, ugly code
  browser.getKey("http://chat.stackoverflow.com/rooms/22091/teenage-programmers-chatroom").then(function(key) {

    browser.post("http://chat.stackoverflow.com/ws-auth/", {
      roomid: 22091,
      fkey: key
    }).then((res) => {
      browser.post("http://chat.stackoverflow.com/chats/22091/events", {
        mode: "events",
        msgCount: 0,
        fkey: key
      }).then((respo) => {
        var count = JSON.parse(respo.body).time;
        var WebSocket = require('ws');
        var url = JSON.parse(res.body).url + '?l=' + count

        console.log("connecting to", url)

        var ws = new WebSocket(url);

        ws.on('message', function(data, flags) {
          // flags.binary will be set if a binary data is received.
          // flags.masked will be set if the data was masked.
          console.log(data)
        });
      }).catch(function(err) {
        console.log(err);
      })


    }).catch(function(err) {
      console.log(err);
    })
  }).catch(function(err) {
    console.log(err);
  })

});
