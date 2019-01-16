"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const HTTPClient_1 = require("./Library/HTTPClient");
HTTPClient_1.HTTPClient.Get('http://google.com').then(response => {
    console.log(response);
});
