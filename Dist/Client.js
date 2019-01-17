"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Browser_1 = require("./Library/Browser");
const user_json_1 = __importDefault(require("./user.json"));
(() => __awaiter(this, void 0, void 0, function* () {
    const br = new Browser_1.Browser();
    const fkey = yield br.Fetch('https://stackoverflow.com/users/login', '#login-form [name="fkey"]', 'value');
    let loginAttempt = yield br.Post('https://stackoverflow.com/users/login', Object.assign({ fkey: fkey }, user_json_1.default));
    if (loginAttempt.location.pathname === '/nocaptcha') {
        return console.log('Sign in failed because a recpatcha was required. Wait a bit before trying again.');
    }
    let checkSession = yield br.Get('https://stackoverflow.com/users/current');
    if (checkSession.location.pathname.indexOf('/users/') === 0) {
        console.log('signed in');
        console.log(br.cookies);
    }
}))();
