import fs from 'fs';
import path from 'path';
import https from 'https';
import express from 'express';
import { json } from 'body-parser';
import fb from 'fb';
import soap from 'soap';

import { serverHost,
	serverPort,
	serverKeyPath, 
	serverCertPath, 
	serverCACertPath,
	fbAppId, 
	fbAppSecret,
	mIdWsdlUrl } from './setup';

import renderCallbackPage from './lib/render-callback-page';

const options = {
	key: fs.readFileSync(serverKeyPath),
	cert: fs.readFileSync(serverCertPath),
	ca: fs.readFileSync(serverCACertPath),
	requestCert: true,
  	rejectUnauthorized: false,
};

const app = express();

app.use(json());
app.use('/example', express.static('example'));

https.createServer(options, app).listen(serverPort, serverHost);

/* Plugin interface */

app.get('/', (req, res) => {
	res.sendFile(path.join(__dirname, 'assets', 'plugin.html'));
});

/* Facebook */

const fbRedirectUri = 'https://' + serverHost + (serverPort ? ':' + serverPort : '') + '/facebook/redirect';

app.get('/facebook', (req, res) => {
	res.redirect(fb.getLoginUrl({
		scope: 'public_profile',
		redirect_uri: fbRedirectUri,
		client_id: fbAppId,
	}));
});

app.get('/facebook/redirect', (req, res) => {
	const { code } = req.query;

	fb.api('/oauth/access_token', {
	    client_id: fbAppId,
	    client_secret: fbAppSecret,
	    redirect_uri: fbRedirectUri,
	    code: code,
	}, tokenResponse => {
		fb.setAccessToken(tokenResponse.access_token);

		fb.api('/me', profileResponse => {
			res.send(renderCallbackPage({
				type: 'FACEBOOK',
				profile: profileResponse,
			}));
		});
	});
});

/* mobile-ID */

app.get('/m-id', (req, res) => {
	res.sendFile(path.join(__dirname, 'assets', 'm-id.html'));
});

app.get('/m-id/authenticate', (req, res) => {
	const { phone } = req.query;

	let authenticateArgs = {
		IDCode: '',
		CountryCode: '',
		PhoneNo: phone,
		Language: 'EST',
		ServiceName: 'Testimine',
		MessageToDisplay: 'auth-plugin',
		SPChallenge: '',
		MessagingMode: 'asynchClientServer',
		AsyncConfiguration: '',
		ReturnCertData: true,
		ReturnRevocationData: false,
	};

	soap.createClient(mIdWsdlUrl, (clientError, client) => {
		client.MobileAuthenticate(authenticateArgs, (authenticateError, authenticateResponse) => {
			if (authenticateError || !authenticateResponse.ChallengeID) return res.sendStatus(500);

			let { 
				UserGivenname: { $value: firstName },
				UserSurname: { $value: lastName },
				ChallengeID: { $value: challengeId },
				Sesscode: { $value: sessCode },
			} = authenticateResponse;

			let statusArgs = {
				Sesscode: sessCode,
				WaitSignature: false,
			};

			var timer = setInterval(() => {
				client.GetMobileAuthenticateStatus(statusArgs, (statusError, statusResponse) => {
					let {
						Status: { $value: status }
					} = statusResponse;

					if (status == 'USER_AUTHENTICATED') {
						clearInterval(timer);

						res.send(renderCallbackPage({
							type: 'MID',
							profile: {
								name: firstName + ' ' + lastName,
							},
						}));
					}
				});
			}, 3000);
		});
	});
});
