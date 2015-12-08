export default function renderCallbackPage(response) {
	return `
		<!doctype html>
		<html>
			<head>
				<title>auth-plugin callback</title>
			</head>
			<body>
				<script>
					var response = ${JSON.stringify(response)};

					if(window.opener && typeof window.opener.authPluginCallback === 'function')
						window.opener.authPluginCallback(response);
				</script>
			</body>
		</html>
    `
}