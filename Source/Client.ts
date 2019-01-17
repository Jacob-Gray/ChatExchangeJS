
import { Browser } from './Library/Browser';
import usr from './user.json';

(async () => {
	const br = new Browser();

	const fkey = await br.Fetch('https://stackoverflow.com/users/login', '#login-form [name="fkey"]', 'value');

	let loginAttempt = await br.Post('https://stackoverflow.com/users/login', {
		fkey: fkey,
		...usr
	});

	if (loginAttempt.location.pathname === '/nocaptcha') {
		return console.log('Sign in failed because a recpatcha was required. Wait a bit before trying again.');
	}

	let checkSession = await br.Get('https://stackoverflow.com/users/current');

	if (checkSession.location.pathname.indexOf('/users/') === 0) {
		console.log('signed in');
		console.log(br.cookies);
	}
})();

