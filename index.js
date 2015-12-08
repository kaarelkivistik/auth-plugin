import fs from 'fs';
import path from 'path';
import https from 'https';
import express from 'express';
import { json } from 'body-parser';
import fb from 'fb';

import { serverHost,
	serverPort,
	serverKeyPath, 
	serverCertPath, 
	serverCACertPath,
	fbAppId, 
	fbAppSecret } from './setup';

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
app.use('/client', express.static('client'));
app.use('/example', express.static('example'));

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

https.createServer(options, app).listen(serverPort, serverHost);