const crypto = require('crypto');
const { MS_TEAM_BOTS_CHANNEL_TOKENS, MS_TEAM_BOTS_OPSGENIE_TOKEN, PORT} = require("./config");
const bufSecrets = MS_TEAM_BOTS_CHANNEL_TOKENS.split(",").map(ele => Buffer(ele, "base64"));
const OnCallAPI = 'https://api.opsgenie.com/v2/schedules/a6bec2fd-420f-4af5-a72c-89d21efe571d/on-calls';
const axios = require('axios');
const http = require('http');
const TEAM_AUTH_ERROR = '{ "type": "message", "text": "Error: message sender cannot be authenticated." }';
const TEAM_CODE_ERROR = '{ "type": "message", "text": "Error: unknown team code." }';
const TEAMMap = {
	"company": {
		api: OnCallAPI,
		key: MS_TEAM_BOTS_OPSGENIE_TOKEN,
	},
};

async function getOnCall(cfg) {
	const headers = {
		'Content-Type': 'application/json',
		'Authorization': 'GenieKey '+cfg.key,
	}
	return axios.get(cfg.api, {
		headers: headers
	})
	.then((response) => {
		return response.data.data.onCallParticipants.map(ele => ele.name).join(" and ");
	})
	.catch(error => {
		console.log(error);
	});
}

function isValidCall(auth, msgBuf) {
	return bufSecrets.some(ele => auth===("HMAC " + crypto.createHmac('sha256', ele).update(msgBuf).digest("base64")));
}

function removeNbsp(originalText) {
	return originalText.replace(/&nbsp;/g, '');
}

http.createServer(function(request, response) {
	let payload = '';
	// Process the request
	request.on('data', function (data) {
		payload += data;
	});

	// Respond to the request
	request.on('end', async function() {
		try {
			response.writeHead(200);
			if(!isValidCall(this.headers['authorization'], Buffer.from(payload, 'utf8'))) {
				const responseMsg = TEAM_AUTH_ERROR;
				console.log(responseMsg);
				console.log(payload);
				response.write(responseMsg);
				return response.end();
			}
			let receivedMsg = JSON.parse(payload);
			console.log(receivedMsg.from.name+":"+receivedMsg.text);
			let arr = receivedMsg.text.split('</at>');
			let responseMsg = TEAM_CODE_ERROR;
			if(arr.length === 2) {
				let team = arr[arr.length-1].trim().toLowerCase();
				team = removeNbsp(team);
				let teamCfg = TEAMMap[team];
				if(teamCfg === undefined) {
					responseMsg = TEAM_CODE_ERROR;
				} else {
					let users = await getOnCall(teamCfg);
					if (users.length === 0) {
						responseMsg = '{ "type": "message", "text": "Shift is not setup in OpsGenie." }';
					} else {
						responseMsg = '{ "type": "message", "text": "'+users+' is on shift." }';
					}
				}
			}
			console.log(responseMsg);
			response.write(responseMsg);
			return response.end();
		}
		catch (err) {
			console.log(err);
			response.writeHead(400);
			return response.end("Error: " + err + "\n" + err.stack);
		}
	});
}).listen(PORT);

console.log('Listening on port %s', PORT);
