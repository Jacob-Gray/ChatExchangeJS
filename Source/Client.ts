import { HTTPClient } from './Library/HTTPClient';

HTTPClient.Get('http://google.com').then(response => {
	console.log(response);
})