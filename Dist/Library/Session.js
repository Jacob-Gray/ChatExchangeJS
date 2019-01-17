"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Cookie {
    constructor(session, value) {
        this.session = session;
        for (let key in value.split(';')) {
            if (this.name == undefined) {
                const keyValue = key.split('=');
                this.name = keyValue[0];
                this.value = keyValue[1];
            }
        }
        this.name = name;
        this.value = value;
        this.session.cookies.push(this);
    }
    Remove() {
        this.session.cookies.splice(this.session.cookies.indexOf(this), 1);
    }
}
exports.Cookie = Cookie;
class Session {
    constructor() {
        this.cookies = [];
    }
}
exports.Session = Session;
