var loginWindow;

function setMessage(message) {
	var messageNode = document.querySelector('#message');

	messageNode.innerHTML = message;
}

function login() {
	loginWindow = window.open('/');
}

function authPluginCallback(response) {
	console.log('hooray! called back', response);

	switch(response.type) {
		case 'FACEBOOK':
			setMessage('Hello, ' + response.profile.name + '!');
			break;

		case 'MID':
			setMessage('Hello, ' + response.profile.name + '!');
			break;
	}

	loginWindow.close();
}